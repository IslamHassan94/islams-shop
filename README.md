# Islam's Shop: fitness-wear demo store

A full-stack e-commerce site for **test-automation and AI-agent practice**. Next.js (frontend + API) talks to **AWS Aurora PostgreSQL through the RDS Data API**, so the database stays private and the site can run on a free host (Vercel).

```
 Browser ──HTTPS──▶ Vercel (Next.js pages + /api routes) ──RDS Data API (HTTPS + IAM)──▶ Aurora PostgreSQL (private)
                                                                                         ▲
                     Claude + MCP server (dev time) ─────────────────────────────────────┘
```

**Features:** home, shop with filters/search/sort/pagination, product pages with colour/size, cart (localStorage) with server-side pricing, coupons, guest or logged-in checkout, **fake card payments that write real orders/payments/stock changes to the DB**, order confirmation, login/register (bcrypt + JWT cookie), account order history, `/qa` page with test data, and a JSON API. Every interactive element has a `data-testid`.

---

## 1. Run locally (Postgres in Docker)

```bash
npm install
docker run -d --name shop-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres
npm run db:seed:local                      # needs psql installed (brew install libpq)
cp .env.example .env.local                 # then set DB_DRIVER=pg and SESSION_SECRET
npm run dev                                # http://localhost:3000
```

## 2. Load the data into Aurora (once)

Your cluster needs: **Aurora PostgreSQL Serverless v2**, **RDS Data API enabled**, master password **managed in Secrets Manager** (the "full configuration" setup).

In **AWS CloudShell** (region eu-central-1), upload `db/islams_shop_seed.sql` and `db/load_seed.py`, then:

```bash
python3 load_seed.py --cluster-arn "<CLUSTER_ARN>" --secret-arn "<SECRET_ARN>"
```

Both ARNs are on the cluster's **Configuration** tab (ARN, and "Master credentials ARN"). Re-run any time to reset all data.

## 3. Create an IAM user for the website

IAM → Users → **Create user** `islams-shop-app` (no console access) → **Attach policies directly → Create policy → JSON**:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["rds-data:ExecuteStatement", "rds-data:BeginTransaction",
                 "rds-data:CommitTransaction", "rds-data:RollbackTransaction"],
      "Resource": "<CLUSTER_ARN>"
    },
    {
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "<SECRET_ARN>"
    }
  ]
}
```

Then the user → **Security credentials → Create access key** → "Application running outside AWS". Copy the key ID and secret (you'll only see the secret once).

## 4. Deploy to Vercel (free)

1. Push this folder to a GitHub repo (keep `.env.local` out; it's in `.gitignore`).
2. [vercel.com](https://vercel.com) → sign in with GitHub → **Add New → Project** → import the repo.
3. **Environment Variables** (Vercel reserves `AWS_*` names, so the app uses `APP_AWS_*`):

| Name | Value |
|---|---|
| `DB_DRIVER` | `dataapi` |
| `APP_AWS_REGION` | `eu-central-1` |
| `APP_AWS_ACCESS_KEY_ID` | from step 3 |
| `APP_AWS_SECRET_ACCESS_KEY` | from step 3 |
| `DB_CLUSTER_ARN` | cluster ARN |
| `DB_SECRET_ARN` | secret ARN |
| `DB_NAME` | `postgres` |
| `SESSION_SECRET` | output of `openssl rand -base64 32` |

4. **Deploy**, then open `https://<your-app>.vercel.app/api/health` → `{"status":"ok","db":"up"}`.

> **Cold starts:** with min capacity 0 ACU, Aurora pauses after idle time. The first request then takes ~15 s while it resumes (the app retries automatically). That's the price of near-zero cost.

## 5. Testing

```bash
npx playwright install chromium        # once
BASE_URL=http://localhost:3000 npm run test:e2e
BASE_URL=https://<your-app>.vercel.app npm run test:e2e      # against production
```

17 example tests in `tests/e2e/` (catalog, checkout, auth, API). All test data is documented on **`/qa`**:

- **Cards** (any future expiry, any CVC): `4242 4242 4242 4242` succeeds · `4000 0000 0000 0002` declined · `4000 0000 0000 9995` insufficient funds · `4000 0000 0000 0069` expired · `4000 0000 0000 0119` processing error
- **Accounts** (password `Test@1234`): `demo@`, `blocked.user@`, `vip.big.spender@`, `new.no.orders@`, `pending.verify@` … `@islamsshop.test`
- **Coupons:** `WELCOME10`, `SAVE20` (min €100), `EXPIRED50`, `FUTURE15`, `USEDUP5`, `DISABLED25`

### API

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | DB connectivity |
| GET | `/api/products?category=&gender=women\|men&q=&sort=featured\|newest\|price-asc\|price-desc\|rating&sale=1&page=&pageSize=` | paginated |
| GET | `/api/products/{slug}` | includes reviews; inactive → 404 |
| GET | `/api/categories` | |
| POST | `/api/cart/quote` | `{items:[{productId,size,color,quantity}], couponCode}` → server prices, stock errors |
| POST | `/api/orders` | 201 success · 402 payment failed · 409 stock/cart · 422 validation |
| GET | `/api/orders` | logged-in user's orders (401 otherwise) |
| GET | `/api/orders/{number}?t={accessToken}` | owner or token holder only |
| POST | `/api/auth/register` · `/login` · `/logout` | JWT in httpOnly cookie |
| GET | `/api/auth/me` | |

### Ideas for AI-agent practice
- Point the **AWS Postgres MCP server** (read-only) at the same cluster and ask Claude: *"find a customer with a cancelled order and write a Playwright test that logs in as them"*.
- Build an agent that reads `/qa` + the API table above and generates test cases.
- Have an agent place orders through the UI, then verify `shop.orders` / `shop.payments` / `shop.inventory` via MCP.

## Security & cost notes
- The site uses the master DB user via its secret. For extra practice, create a dedicated DB user with only the grants the app needs and store its credentials in a separate secret.
- Never commit access keys. Rotate the key if it leaks; Vercel's env vars are the only place it should live.
- A public site can wake the database (bots, crawlers). Keep your AWS Budget alert on, and **stop/delete the cluster** when you aren't practising.
- Card numbers are never stored, only brand + last 4.

## Project layout
```
app/                 pages (App Router) + app/api/* route handlers + app/img/* (generated product art)
components/          UI (Header, ProductCard, CheckoutForm, cart context…)
lib/db.ts            Data API + pg drivers behind one query()/transaction() API
lib/catalog.ts       product queries          lib/checkout.ts  pricing, coupons, fake payments, orders
lib/auth.ts          sessions, login/register lib/art.ts       SVG product images
db/                  seed SQL + Data API loader
tests/e2e/           Playwright tests
```
