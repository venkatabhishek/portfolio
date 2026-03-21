# RFC: Portfolio App Architecture

## Status
Draft

## Context

A modern investor has assets distributed across various banks and brokers. This app centralizes financial management tasks: viewing balances, transactions, and account management.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Google OAuth + Email) |
| Plaid | Plaid Link + API |
| State | React Query |
| Styling | Tailwind + shadcn/ui |
| Hosting | Vercel |

## Data Model

```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String?
  image         String?
  connections   PlaidConnection[]
  settings      UserSettings?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model PlaidConnection {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken     String   // Encrypted
  itemId          String   @unique
  institutionId   String
  institutionName String
  cursor          String?
  lastSynced      DateTime?
  status          ConnectionStatus @default(ACTIVE)
  createdAt       DateTime @default(now())
  accounts        Account[]
  transactions    Transaction[]

  @@index([userId])
}

model Account {
  id               String   @id @default(cuid())
  connectionId     String
  connection       PlaidConnection @relation(fields: [connectionId], references: [id], onDelete: Cascade)
  plaidAccountId   String   @unique
  name             String
  subtype          String
  mask             String?
  currentBalance   Decimal?
  availableBalance Decimal?
  currency         String   @default("USD")
  lastUpdated      DateTime @default(now())
  transactions     Transaction[]

  @@index([connectionId])
}

model Transaction {
  id                  String   @id @default(cuid())
  accountId           String
  account             Account  @relation(fields: [accountId], references: [id], onDelete: Cascade)
  connectionId        String
  connection          PlaidConnection @relation(fields: [connectionId], references: [id], onDelete: Cascade)
  plaidTransactionId  String   @unique
  amount              Decimal
  date                DateTime
  name                String?
  merchantName        String?
  category            String[]
  pending             Boolean  @default(false)
  createdAt           DateTime @default(now())

  @@index([accountId])
  @@index([connectionId])
  @@index([date])
}

model UserSettings {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  refreshInterval Int      @default(3600)
  currency        String   @default("USD")
  theme           String   @default("system")

  @@index([userId])
}

enum ConnectionStatus {
  ACTIVE
  ERROR
  DISCONNECTED
}
```

## API Design

### Authentication
- Handled by Supabase Auth (no custom API routes needed)
- Middleware protects all /api routes except auth callbacks

### Plaid Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/plaid/link-token` | Create Plaid Link token |
| POST | `/api/plaid/exchange` | Exchange public token |
| DELETE | `/api/plaid/connections/[id]` | Disconnect account |

*Note: Webhook endpoint deferred to Phase 5*

### Account Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/accounts` | Get all user's accounts |
| POST | `/api/accounts/[id]/refresh` | Force refresh from Plaid |

### Transaction Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/transactions` | Paginated transactions with filtering |
| GET | `/api/transactions/summary` | Aggregated stats |

**Query Parameters for `GET /api/transactions`:**

| Param | Type | Description |
|-------|------|-------------|
| `from` | ISO date | Start of date range (default: 3 months ago) |
| `to` | ISO date | End of date range (default: now) |
| `accountId` | string | Filter by specific account |
| `sortBy` | `date`, `amount`, `merchant` | Sort field (default: `date`) |
| `order` | `asc`, `desc` | Sort order (default: `desc`) |
| `limit` | number | Page size (default: 50, max: 100) |
| `cursor` | string | Pagination cursor |

### User Settings Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/user/settings` | Get user settings |
| PATCH | `/api/user/settings` | Update user settings |

## Caching Strategy

- **Account balances**: cached in DB, refreshed on manual refresh
- **Transactions**: stored locally, synced incrementally with cursor
- **Cache invalidation**: manual refresh only (no webhooks for MVP)
- **Settings**: stored in DB, read on each request

## Transaction Retention & Filtering

### Retention Policy
- **12-month rolling window**: Transactions older than 12 months are auto-deleted
- Implemented via a cleanup job (cron or on-demand)
- Keeps database size manageable for Supabase free tier

### UI Filtering Options
Users can filter transactions by:
- **Preset ranges**: 1 week, 1 month, 3 months, 6 months, 12 months
- **Custom date range**: Date picker for arbitrary start/end dates
- **Account filter**: Show transactions for specific account only

### Sorting Options
- Date (default: newest first)
- Amount (highest/lowest)
- Merchant name (A-Z/Z-A)

### Storage Estimate
With 5 connected accounts × ~100 transactions/month:
- ~6,000 new rows per year per user
- ~3MB per year per user (estimated)
- 100 users ≈ 300MB/year for transactions

## Data Flow

### Transaction Storage Strategy

```
┌─────────────────────────────────────────────────────────┐
│  Database (Supabase)                                   │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Transactions Table                                 │  │
│  │ - All fetched transactions stored permanently       │  │
│  │ - Deduplicated by plaidTransactionId               │  │
│  │ - UI reads from HERE, not directly from Plaid     │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                         ↑
                         │ Cursor tracks last sync point
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Plaid API                                             │
│  - Called only during refresh                          │
│  - Returns deltas since cursor                         │
└─────────────────────────────────────────────────────────┘
```

### Initial Connection Flow
1. User clicks "Connect Account"
2. Frontend calls `POST /api/plaid/link-token`
3. Plaid Link modal opens
4. User selects institution + authenticates
5. Frontend receives publicToken + metadata
6. Frontend calls `POST /api/plaid/exchange`
7. Backend stores access token, creates connection
8. Backend triggers initial sync (accounts + transactions)
9. User sees their connected accounts

### Data Refresh Flow (Manual - No Webhooks)
1. User clicks "Refresh" (or loads page)
2. Frontend calls `POST /api/accounts/[id]/refresh`
3. Backend calls Plaid `transactionsSync()` with stored cursor
4. Plaid returns only deltas (new/modified transactions)
5. Backend upserts transactions into database
6. Backend updates account balances
7. Response includes updated data
8. UI re-fetches from database

**Note:** Data is only updated when user manually refreshes. This keeps infrastructure simple and within free tier limits.

## Project Structure

```
app/
├── (dashboard)/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── accounts/
│   ├── transactions/
│   └── settings/
├── login/page.tsx
├── api/
│   ├── plaid/
│   ├── accounts/
│   ├── transactions/
│   └── user/settings/
└── middleware.ts

components/
├── plaid/
├── dashboard/
└── ui/

lib/
├── db.ts
├── plaid.ts
├── plaid-server.ts
├── auth.ts
└── supabase.ts
```

## Authentication Flow (Simplified)

1. User visits protected route
2. Middleware checks Supabase session cookie
3. If not authenticated → redirect to `/login`
4. User clicks "Sign in with Google"
5. Supabase handles OAuth redirect (built-in)
6. User authenticates with Google
7. Supabase creates session cookie
8. User redirected to dashboard

## Authentication Flow

1. Supabase Auth handles all authentication
2. Middleware checks session on protected routes
3. User ID extracted from session for API calls
4. Row Level Security (RLS) on Supabase tables ensures data isolation

## Implementation Phases

### Phase 1: Foundation
- [x] Set up Supabase project
- [x] Push schema to Supabase
- [x] Configure Google OAuth provider
- [x] Configure Email/Password provider
- [x] Create auth middleware (`middleware.ts`)
- [x] Create login page (`app/login/page.tsx`)
- [x] Update sidebar for auth (sign out button)

### Phase 2: Plaid Integration
- [x] Implement link-token endpoint (`/api/plaid/link-token`)
- [x] Implement exchange endpoint (`/api/plaid/exchange`)
- [x] Add Plaid Link UI component (`components/plaid/PlaidLink.tsx`)
- [x] Create accounts page with connect/disconnect
- [x] Create `/api/accounts` endpoint with user session
- [x] Create `/api/accounts/[id]/refresh` endpoint
- [x] Create `/api/plaid/connections/[id]` delete endpoint

### Phase 3: Data & Sync
- [x] Implement transaction sync with cursor (in exchange and refresh endpoints)
- [x] Build transactions page with sorting/filtering
- [x] Add refresh functionality
- [ ] Add 60-second cooldown to refresh
- [ ] Add 12-month retention policy / cleanup job

### Phase 4: Dashboard & Settings
- [ ] Enhance dashboard with aggregated data
- [ ] Build settings page
- [ ] Add user preferences

### Phase 5: Polish (Future)
- [ ] Webhook-driven updates (for real-time data)
- [ ] Notifications
- [ ] Trade execution (as per scalability requirement)

### Phase 1 Files

| File | Purpose |
|------|---------|
| `middleware.ts` | Protects routes, redirects unauthenticated users |
| `app/login/page.tsx` | Simple login page with Google OAuth button |
| `lib/supabase.ts` | Supabase client setup |
| `components/Sidebar.tsx` | Updated with user info + sign out |

### Supabase Dashboard Checklist

- [x] Create Supabase project
- [x] Push schema
- [x] Enable Google OAuth provider
- [x] Enable Email/Password provider
- [x] Add Site URL: `http://localhost:3000`
- [x] Add Redirect URLs: `http://localhost:3000/auth/callback` and `https://ieknhtogxcinzoluuojh.supabase.co/auth/v1/callback`

### Auth Flow

```
1. User visits protected route
2. Middleware checks Supabase session cookie
3. If not authenticated → redirect to /login
4. User clicks "Sign in with Google"
5. Supabase handles OAuth redirect
6. User authenticates with Google
7. Supabase creates session cookie
8. User redirected to dashboard
```

## Supabase Setup & CLI Commands

### Prerequisites
```bash
# Install Supabase CLI (already installed via npm -g)
npm install -g supabase

# Login to Supabase
supabase login

# Link local project to Supabase project
supabase link --project-ref <your-project-ref>
```

### Initialize Supabase in Project
```bash
# Generate Supabase config files
supabase init

# This creates:
# - supabase/config.toml
# - supabase/migrations/ folder
```

### Create Initial Migration
```bash
# Create a new migration file
supabase migration new initial_schema
```

### Apply Schema to Local/Remote Database

```bash
# Push schema to linked project (creates/updates tables)
supabase db push

# Or apply pending migrations
supabase db reset  # Drops and recreates all tables

# Check migration status
supabase migration list
```

### Generate Supabase Types
```bash
# Generate TypeScript types from database schema
supabase gen types typescript --project-id <your-project-ref> > lib/database.types.ts
```

### Start Local Supabase (Optional)
```bash
# Start local Supabase instance (uses Docker)
supabase start

# Stop when done
supabase stop
```

### Quick Reference

| Command | Purpose |
|---------|---------|
| `supabase link --project-ref <ref>` | Connect to remote project |
| `supabase db push` | Push schema changes |
| `supabase db reset` | Reset local database |
| `supabase migration new <name>` | Create new migration |
| `supabase gen types typescript` | Generate types |
| `supabase status` | Check local/remote status |

---

## Environment & Deployment

### Plaid Environments

| Environment | Use Case | Access |
|-------------|----------|--------|
| `sandbox` | Local development, automated tests | Anyone (fake banks) |
| `development` | Test with real credentials | Requires Plaid developer access |
| `production` | Live users | Requires Plaid approval |

### Deployment Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│  Local Development                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ - Plaid Sandbox (fake institutions)                 │   │
│  │ - Local Supabase or dev project                    │   │
│  │ - npm run dev → http://localhost:3000              │   │
│  │ - Full app testing with fake data                   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Staging (Your Real Bank Testing)                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ - Plaid Development (real credentials)             │   │
│  │ - Separate Supabase project                         │   │
│  │ - Deploy on Vercel (preview or staging branch)     │   │
│  │ - URL: staging-portfolio.vercel.app                │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Environment Variables

```env
# .env.local (local development)
PLAID_ENV=sandbox
PLAID_CLIENT_ID=xxx
PLAID_SECRET=xxx

# Staging on Vercel (or .env.staging)
PLAID_ENV=development
PLAID_CLIENT_ID=xxx
PLAID_SECRET=xxx
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

## Testing with Plaid Sandbox

### Sandbox User Flow
1. Open app locally (`http://localhost:3000`)
2. Sign up / sign in via Supabase Auth
3. Click "Connect Account" → Plaid Link opens
4. Select a sandbox test institution (Chase, Bank of America, etc.)
5. Enter sandbox test credentials:
   - Username: `user_good`
   - Password: `pass_good`
6. Plaid returns success (fake accounts connected)
7. App fetches fake accounts + transactions
8. Data appears in dashboard

### Sandbox Test Credentials

| Username | Behavior |
|----------|----------|
| `user_good` | Successful login |
| `user_insufficient` | Login fails |
| `user_expired` | Credentials expired |
| `user_disputed` | Account in dispute |

### What's NOT Real in Sandbox
- No actual bank connections
- No real money
- Fake transactions only
- Realistic merchant names and amounts

## Notes from Design Review

### Why Manual Refresh (No Webhooks)?
- Simpler infrastructure - no public webhook endpoint needed
- Less frequent DB writes - better for Supabase free tier
- Easier to debug and test
- MVP can always add webhooks in Phase 5

### Free Tier Considerations
- 500MB storage: 12-month retention keeps this manageable
- Transactions are the main storage consumer
- ~3MB/year/user estimate; 100 users ≈ 300MB/year
- Refresh cooldown prevents excessive API calls

### Future Scaling Path
1. Add webhooks for real-time updates
2. Implement background sync jobs
3. Add more institutions/connection types
4. Support trade execution (write operations)
