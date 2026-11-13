import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "./db";

export const SESSION_COOKIE = "is_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type Session = { customerId: number; email: string; firstName: string };

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET must be set (16+ chars)");
  return new TextEncoder().encode(s);
}

export async function createSessionCookie(session: Session) {
  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      customerId: Number(payload.customerId),
      email: String(payload.email),
      firstName: String(payload.firstName),
    };
  } catch {
    return null;
  }
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message);
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateRegistration(input: Record<string, unknown>) {
  const errors: Record<string, string> = {};
  const email = String(input.email ?? "").trim().toLowerCase();
  const password = String(input.password ?? "");
  const firstName = String(input.firstName ?? "").trim();
  const lastName = String(input.lastName ?? "").trim();
  if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address";
  if (password.length < 8) errors.password = "Password must be at least 8 characters";
  else if (!/[A-Za-z]/.test(password) || !/\d/.test(password))
    errors.password = "Password must contain letters and numbers";
  if (!firstName) errors.firstName = "First name is required";
  if (!lastName) errors.lastName = "Last name is required";
  if (firstName.length > 100 || lastName.length > 100) errors.firstName = "Name is too long";
  return { errors, value: { email, password, firstName, lastName } };
}

export async function registerCustomer(v: { email: string; password: string; firstName: string; lastName: string }) {
  const existing = await db.query(`SELECT id FROM shop.customers WHERE lower(email) = :email`, { email: v.email });
  if (existing.length) throw new AuthError("An account with this email already exists", 409, "EMAIL_TAKEN");
  const hash = await bcrypt.hash(v.password, 10);
  const rows = await db.query<{ id: number }>(
    `INSERT INTO shop.customers (email, password_hash, first_name, last_name, status, last_login_at)
     VALUES (:email, :hash, :first, :last, 'ACTIVE', now()) RETURNING id`,
    { email: v.email, hash, first: v.firstName, last: v.lastName },
  );
  return { customerId: rows[0].id, email: v.email, firstName: v.firstName } satisfies Session;
}

export async function authenticate(emailRaw: string, password: string): Promise<Session> {
  const email = emailRaw.trim().toLowerCase();
  const rows = await db.query<{ id: number; email: string; first_name: string; password_hash: string | null; status: string }>(
    `SELECT id, email, first_name, password_hash, status::text AS status FROM shop.customers WHERE lower(email) = :email`,
    { email },
  );
  const c = rows[0];
  // Same message for unknown email and wrong password (don't leak which emails exist).
  if (!c || !c.password_hash || !(await bcrypt.compare(password, c.password_hash)))
    throw new AuthError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  if (c.status === "BLOCKED") throw new AuthError("This account has been blocked. Please contact support.", 403, "ACCOUNT_BLOCKED");
  if (c.status === "INACTIVE") throw new AuthError("This account is inactive. Please contact support.", 403, "ACCOUNT_INACTIVE");
  await db.query(`UPDATE shop.customers SET last_login_at = now() WHERE id = :id`, { id: c.id });
  return { customerId: c.id, email: c.email, firstName: c.first_name };
}

export async function getCustomer(id: number) {
  const rows = await db.query<{
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    status: string;
    is_vip: boolean;
    member_since: string;
  }>(
    `SELECT id, email, first_name, last_name, phone, status::text AS status, is_vip,
            to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS member_since
     FROM shop.customers WHERE id = :id`,
    { id },
  );
  return rows[0] ?? null;
}

export async function getDefaultAddress(customerId: number) {
  const rows = await db.query<{ street: string; city: string; postal_code: string; country_code: string }>(
    `SELECT street, city, postal_code, country_code FROM shop.addresses
     WHERE customer_id = :id AND type = 'SHIPPING' ORDER BY is_default DESC, id LIMIT 1`,
    { id: customerId },
  );
  return rows[0] ?? null;
}
