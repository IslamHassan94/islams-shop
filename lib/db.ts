/**
 * Database access layer with two interchangeable drivers:
 *
 *  - "dataapi": AWS Aurora PostgreSQL through the RDS Data API (HTTPS + IAM).
 *               Used in production (Vercel). The DB stays private: no open port.
 *  - "pg":      plain node-postgres connection, for local development / CI.
 *
 * All SQL in the app uses named parameters (:name). The pg driver rewrites them to $1, $2...
 * Always schema-qualify tables (shop.products) - Data API calls don't share session state.
 */
import {
  RDSDataClient,
  ExecuteStatementCommand,
  BeginTransactionCommand,
  CommitTransactionCommand,
  RollbackTransactionCommand,
  type SqlParameter,
} from "@aws-sdk/client-rds-data";
import type { Pool, PoolClient } from "pg";

export type Param = string | number | boolean | null | undefined;
export type Params = Record<string, Param>;
export type Row = Record<string, unknown>;

export interface Db {
  query<T = Row>(sql: string, params?: Params): Promise<T[]>;
}

const DRIVER = (process.env.DB_DRIVER ?? "dataapi").toLowerCase();

// Matches :name but not ::type casts.
const NAMED = /(?<![:\w]):([A-Za-z_]\w*)/g;

function usedParams(sql: string, params: Params): Params {
  const out: Params = {};
  for (const m of sql.matchAll(NAMED)) {
    const k = m[1];
    if (!(k in params)) throw new Error(`Missing SQL parameter :${k}`);
    out[k] = params[k];
  }
  return out;
}

// ---------------------------------------------------------------- pg driver
const g = globalThis as unknown as { __pgPool?: Pool };

async function pgPool(): Promise<Pool> {
  if (!g.__pgPool) {
    const pg = await import("pg");
    // Return timestamps and numerics as strings, like the Data API does.
    pg.types.setTypeParser(1184, (v: string) => v);
    pg.types.setTypeParser(1114, (v: string) => v);
    g.__pgPool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  }
  return g.__pgPool;
}

function toPositional(sql: string, params: Params) {
  const names: string[] = [];
  const text = sql.replace(NAMED, (_, name: string) => {
    let idx = names.indexOf(name);
    if (idx === -1) {
      names.push(name);
      idx = names.length - 1;
    }
    return `$${idx + 1}`;
  });
  return { text, values: names.map((n) => params[n] ?? null) };
}

async function pgQuery<T>(client: Pool | PoolClient, sql: string, params: Params = {}): Promise<T[]> {
  usedParams(sql, params);
  const { text, values } = toPositional(sql, params);
  const res = await client.query(text, values);
  return res.rows as T[];
}

// ----------------------------------------------------------- Data API driver
let rdsClient: RDSDataClient | undefined;

function dataApi() {
  if (!rdsClient) {
    const accessKeyId = process.env.APP_AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.APP_AWS_SECRET_ACCESS_KEY;
    rdsClient = new RDSDataClient({
      region: process.env.APP_AWS_REGION ?? "eu-central-1",
      credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
    });
  }
  return rdsClient;
}

function target() {
  const resourceArn = process.env.DB_CLUSTER_ARN;
  const secretArn = process.env.DB_SECRET_ARN;
  if (!resourceArn || !secretArn) throw new Error("DB_CLUSTER_ARN and DB_SECRET_ARN must be set");
  return { resourceArn, secretArn, database: process.env.DB_NAME ?? "postgres" };
}

function toSqlParams(params: Params): SqlParameter[] {
  return Object.entries(params).map(([name, v]) => {
    if (v === null || v === undefined) return { name, value: { isNull: true } };
    if (typeof v === "boolean") return { name, value: { booleanValue: v } };
    if (typeof v === "number")
      return Number.isInteger(v) ? { name, value: { longValue: v } } : { name, value: { doubleValue: v } };
    return { name, value: { stringValue: v } };
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Aurora Serverless v2 at 0 ACU auto-pauses; the first call while it resumes fails. Retry ~30s. */
async function withResumeRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const err = e as { name?: string; message?: string };
      const resuming =
        err.name === "DatabaseResumingException" || /resum|is not yet available/i.test(err.message ?? "");
      if (!resuming || attempt >= 15) throw e;
      await sleep(2000);
    }
  }
}

async function dataApiQuery<T>(sql: string, params: Params = {}, transactionId?: string): Promise<T[]> {
  const res = await withResumeRetry(() =>
    dataApi().send(
      new ExecuteStatementCommand({
        ...target(),
        sql,
        parameters: toSqlParams(usedParams(sql, params)),
        transactionId,
        formatRecordsAs: "JSON",
      }),
    ),
  );
  return res.formattedRecords ? (JSON.parse(res.formattedRecords) as T[]) : [];
}

// ------------------------------------------------------------------ public API
export const db: Db = {
  async query<T = Row>(sql: string, params: Params = {}) {
    if (DRIVER === "pg") return pgQuery<T>(await pgPool(), sql, params);
    return dataApiQuery<T>(sql, params);
  },
};

/** Run fn inside one transaction. Throwing inside fn rolls everything back. */
export async function transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
  if (DRIVER === "pg") {
    const client = await (await pgPool()).connect();
    try {
      await client.query("BEGIN");
      const result = await fn({ query: (sql, params) => pgQuery(client, sql, params) });
      await client.query("COMMIT");
      return result;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  const { resourceArn, secretArn, database } = target();
  const { transactionId } = await withResumeRetry(() =>
    dataApi().send(new BeginTransactionCommand({ resourceArn, secretArn, database })),
  );
  try {
    const result = await fn({ query: (sql, params) => dataApiQuery(sql, params, transactionId) });
    await dataApi().send(new CommitTransactionCommand({ resourceArn, secretArn, transactionId }));
    return result;
  } catch (e) {
    await dataApi()
      .send(new RollbackTransactionCommand({ resourceArn, secretArn, transactionId }))
      .catch(() => undefined);
    throw e;
  }
}
