#!/usr/bin/env python3
"""
Load islams_shop_seed.sql into Aurora PostgreSQL through the RDS Data API.

Runs every statement inside ONE Data API transaction, so session settings
(search_path, setseed) carry across statements, and it's all-or-nothing.

Usage (in AWS CloudShell, same region as the cluster):
  python3 load_seed.py --cluster-arn <CLUSTER_ARN> --secret-arn <SECRET_ARN>
Optional:
  --database postgres   --file ecommerce_seed.sql   --dry-run
"""
import argparse
import re
import sys


def split_statements(sql: str):
    # Drop full-line comments, then split on ';' at end of a line.
    lines = [l for l in sql.splitlines() if not l.strip().startswith("--")]
    body = "\n".join(lines)
    parts = re.split(r";\s*(?:\n|$)", body)
    return [p.strip() for p in parts if p.strip()]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cluster-arn")
    ap.add_argument("--secret-arn")
    ap.add_argument("--database", default="postgres")
    ap.add_argument("--file", default="islams_shop_seed.sql")
    ap.add_argument("--region", default="eu-central-1")
    ap.add_argument("--dry-run", action="store_true", help="print statements, don't run")
    args = ap.parse_args()

    with open(args.file, encoding="utf-8") as f:
        statements = split_statements(f.read())

    if args.dry_run:
        for s in statements:
            print(s + ";\n")
        return

    if not args.cluster_arn or not args.secret_arn:
        sys.exit("--cluster-arn and --secret-arn are required")

    import boto3
    client = boto3.client("rds-data", region_name=args.region)
    common = dict(resourceArn=args.cluster_arn, secretArn=args.secret_arn, database=args.database)

    tx = client.begin_transaction(**common)["transactionId"]
    try:
        for i, stmt in enumerate(statements, 1):
            res = client.execute_statement(**common, sql=stmt, transactionId=tx,
                                           formatRecordsAs="JSON")
            first_line = stmt.splitlines()[0][:70]
            print(f"[{i}/{len(statements)}] ok  {first_line}")
            if "formattedRecords" in res and stmt.upper().startswith("SELECT 'CUSTOMERS'"):
                print(res["formattedRecords"])
        client.commit_transaction(resourceArn=args.cluster_arn, secretArn=args.secret_arn,
                                  transactionId=tx)
        print("\nCommitted. Seed data loaded.")
    except Exception as e:
        client.rollback_transaction(resourceArn=args.cluster_arn, secretArn=args.secret_arn,
                                    transactionId=tx)
        sys.exit(f"\nFAILED on statement {i}, rolled back:\n{stmt[:300]}\n\n{e}")


if __name__ == "__main__":
    main()
