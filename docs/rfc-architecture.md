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
| POST | `/api/transactions/cleanup` | Delete transactions older than 12 months |

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
- [x] Add 60-second cooldown to refresh
- [x] Add 12-month retention policy / cleanup job

### Phase 4: Dashboard & Settings
- [x] Enhance dashboard with aggregated data
- [x] Build settings page
- [x] Add user preferences
- [x] Add skeleton loading states
- [x] Improve empty states with guided onboarding

### Phase 5: Resilience (Future)
- [ ] Retry with exponential backoff for Plaid calls
- [ ] Circuit breaker per connection
- [ ] Connection health status display
- [ ] Graceful degradation (cached data on failure)
- [ ] User-friendly error messages for all Plaid error codes

### Phase 6: Polish (Future)
- [ ] Webhook-driven updates (for real-time data)
- [ ] Notifications
- [ ] Trade execution (as per scalability requirement)

### Phase 3 Files

| File | Purpose |
|------|---------|
| `app/api/accounts/[id]/refresh/route.ts` | Refresh endpoint with 60s cooldown |
| `app/api/transactions/cleanup/route.ts` | Cleanup endpoint for 12-month retention |
| `supabase/migrations/20260321000000_add_refresh_cooldown.sql` | Adds cooldown column |

### Phase 4 Files

| File | Purpose |
|------|---------|
| `app/api/user/settings/route.ts` | GET/PATCH user settings |
| `app/api/transactions/recent/route.ts` | Recent transactions for dashboard |
| `app/(dashboard)/settings/page.tsx` | Full settings page with preferences |
| `app/(dashboard)/page.tsx` | Enhanced dashboard with trends |
| `components/ui/skeleton.tsx` | Loading skeleton components |

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

---

## Resilience Patterns for External API Failures

### Overview

External APIs (Plaid, Supabase) can fail due to:
- Transient network issues
- Rate limiting
- Planned maintenance
- Bank-side credential changes
- Institution outages

The app must handle these gracefully without breaking user experience.

### Plaid Error Categories

| Category | Errors | Behavior |
|----------|--------|----------|
| **User Action Required** | `ITEM_LOGIN_REQUIRED`, `ITEM_LOCKED` | Prompt user to reconnect |
| **Item Not Found** | `ITEM_NOT_FOUND` | Mark as disconnected |
| **Rate Limited** | `RATE_LIMIT_EXCEEDED` | Exponential backoff, show message |
| **Temporary** | `INTERNAL_SERVER_ERROR`, `PLANNED_MAINTENANCE` | Retry later, show cached data |
| **Institution Issue** | Various institution errors | Log, notify if persistent |

### Resilience Patterns to Implement

#### 1. Retry with Exponential Backoff

For transient errors (429, 5xx), retry with increasing delays:

```
Attempt 1: immediate
Attempt 2: 1 second delay
Attempt 3: 2 seconds delay
Attempt 4: 4 seconds delay
Max attempts: 3-5
```

**Applies to:** All Plaid API calls

#### 2. Circuit Breaker Pattern

When an endpoint fails repeatedly, stop calling it for a cooldown period:

```
Closed (normal) → Open (failing) → Half-Open (testing)
                ↓
    After N failures (e.g., 5)
    For T duration (e.g., 60s)
```

**Applies to:** `/transactions/sync`, `/accounts/get`

#### 3. Graceful Degradation

When Plaid is unavailable:
- Show cached balance data with "Last updated X ago" indicator
- Show cached transactions
- Disable refresh button with tooltip explaining status
- Never show blank screens

#### 4. Connection Health Status

Track and display connection status per institution:

| Status | Meaning | User Action |
|--------|---------|--------------|
| `ACTIVE` | Working normally | None |
| `ERROR` | Requires attention | Prompt to reconnect |
| `DISCONNECTED` | No longer valid | Remove from UI |

#### 5. Timeout Handling

Set reasonable timeouts to prevent hanging:
- Plaid API calls: 30 second timeout
- On timeout: return cached data, log error

### User-Facing Behavior

#### When Refresh Fails

1. Check error type
2. If transient (rate limit, timeout): show "Temporarily unavailable, try again in X seconds"
3. If user action needed: show "Your bank requires re-authentication" with reconnect button
4. If institution issue: show "Bank connection issue" with retry button
5. Always display last successful data with timestamp

#### Connection Status UI

```
┌─────────────────────────────────────────┐
│ Chase Bank                      [Active] │
│ ••••4521  Checking                    ✓ │
│ Last synced: 5 minutes ago    [Refresh] │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Bank of America              [Error ⚠] │
│ ••••7890  Savings                      │
│ Requires re-authentication    [Reconnect]│
└─────────────────────────────────────────┘
```

### Implementation Checklist

- [ ] Add retry wrapper with exponential backoff for Plaid calls
- [ ] Add circuit breaker per connection
- [ ] Update connection status when errors occur
- [ ] Add "last_synced" display on accounts page
- [ ] Disable refresh button during cooldown/errors
- [ ] Add user-friendly error messages based on Plaid error codes
- [ ] Add Sentry/logging for Plaid errors (without PII)

### Testing Strategy

#### Plaid Sandbox Error Simulation

Use Plaid Sandbox's error injection:
- `user_insufficient` → simulate credential issues
- `user_expired` → simulate expired credentials
- Create test items in various error states

#### Manual Testing Checklist

| Scenario | Expected Behavior |
|----------|------------------|
| Refresh during Plaid outage | Show cached data, retry message |
| `ITEM_LOGIN_REQUIRED` | Show reconnect prompt |
| Rate limited | Show cooldown message |
| Bank disconnects access | Update status, prompt user |
| Slow response (>30s) | Timeout, show cached data |

### Logging & Monitoring (Phase 5+)

Track these metrics:
- Refresh success/failure rate per institution
- Average time to reconnect
- Error code frequency
- User-initiated reconnect rate

---

## Testing Strategy

### Test Environments

| Environment | Use Case |
|-------------|----------|
| **Plaid Sandbox** | Development, integration tests |
| **Plaid Development** | Real bank testing (limited to 100 items) |
| **Plaid Production** | Live users |

### Testing Types

#### Unit Tests
- Error code mapping to user messages
- Retry logic behavior
- Date range filtering logic

#### Integration Tests (Plaid Sandbox)
- Full link flow
- Refresh cycle
- Multiple institutions

#### Manual QA
- Error state handling
- Reconnection flows
- Edge cases with sandbox credentials

### Plaid Sandbox Test Credentials

| Username | Behavior |
|----------|----------|
| `user_good` | Successful login |
| `user_insufficient` | Insufficient credentials error |
| `user_expired` | Expired credentials |
| `user_disputed` | Account in dispute |
