# Intexa ArCa

Financial management platform for cash flow control, transaction tracking, projections, and reporting — built for Latin American businesses with SIIGO accounting integration.

---

## Features

- **Dashboard** — real-time KPIs: current balance, monthly income/expenses, net flow, cash flow chart, full expense distribution by category (all categories, palette colors for top 5 then extended colors), and liquidity alerts.
- **Movements** — paginated transaction list with search, type/status filters, CSV export, and color-coded category badges.
- **Cash Flow** — day/week/month navigator showing ingresos and egresos per period, projected 30-day balance, and liquidity alerts.
- **Projections** — forward-looking financial scenarios and simulations.
- **Reports** — exportable financial summaries.
- **Settings** — user management, base currency preference (COP, USD, EUR, CLP, MXN), automatic exchange rate toggle, and activity audit log.
- **SIIGO integration** — connect and sync transactions directly from SIIGO accounting software.
- **Auth** — email/password login and Microsoft OAuth (Azure AD).

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 8 |
| Styling | Tailwind CSS 4, Lucide icons |
| Charts | Recharts |
| Animation | Motion (Framer Motion) |
| Backend | Go, Chi router |
| Storage | In-memory (dev) / PostgreSQL (prod) |

## Project Structure

```
intexa-arca/        # Frontend (this repo)
intexa-arca-api/    # Go REST API
```

## Getting Started

### Frontend

**Prerequisites:** Node.js 18+

```bash
npm install
npm run dev          # http://localhost:3000
```

Copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL` if your API runs on a different port (default proxies to `http://localhost:8080`).

### API

**Prerequisites:** Go 1.21+

```bash
cd ../intexa-arca-api
go run ./cmd/server
```

Without `DATABASE_URL` set, the server starts in **dev mode** with an in-memory store pre-seeded with 12 months of realistic transaction data.

Default credentials: `admin@arca.local` / `admin`

### Production

Set the following environment variables on the API:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | Server port (default `8080`) |
| `ALLOWED_ORIGINS` | Comma-separated allowed CORS origins |
| `JWT_SECRET` | Secret for signing tokens |

Set on the frontend:

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | API base URL (or configure `public/config.js` at runtime) |

```bash
npm run build        # outputs to dist/
```

## API Reference

Full collection: `intexa-arca-api/intexa-arca-api.postman_collection.json`

Base path: `/api/v1`

| Method | Path | Description |
|---|---|---|
| POST | `/auth/login` | Email/password login |
| GET | `/auth/microsoft` | Microsoft OAuth redirect |
| GET | `/dashboard` | Dashboard summary |
| GET | `/transactions` | List transactions (paginated) |
| POST | `/transactions` | Create transaction |
| GET | `/cashflow` | Cash flow summary |
| GET | `/projections` | Projections summary |
| POST | `/projections/simulate` | Run simulation |
| GET | `/reports` | Reports summary |
| GET | `/reports/export` | Export report |
| GET | `/categories` | List categories |
| POST | `/siigo/connect` | Connect SIIGO account |
| POST | `/siigo/sync` | Sync transactions from SIIGO |
