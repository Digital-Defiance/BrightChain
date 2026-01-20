# BrightChain Auth + Energy System Implementation Plan

## Goal
Build minimal auth system with energy accounts following DigitalBurnbag patterns

## What We Need

### 1. User Model (Member-based)
- Use existing Member from brightchain-lib
- Store in MemberDocument
- Link to EnergyAccount

### 2. Auth Flow
- Register: Create Member + EnergyAccount with trial credits
- Login: JWT with Member ID
- Profile: Get Member + EnergyAccount data

### 3. API Endpoints
```
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/profile
GET  /api/energy/balance
GET  /api/energy/transactions
```

### 4. Frontend Pages
```
/register  - Create account
/login     - Sign in
/dashboard - View energy balance, profile
```

## Implementation Steps

### Step 1: Auth Service (30 min)
- Implement JWT signing/verification
- Use ecies-lib Member for identity
- Store Member in memory (SimpleStore)

### Step 2: User Controller (30 min)
- Register endpoint (create Member + Energy Account)
- Login endpoint (verify + return JWT)
- Profile endpoint (get Member + Energy data)

### Step 3: Energy Controller (30 min)
- Balance endpoint
- Transaction history endpoint
- Link to existing EnergyAccount/Ledger

### Step 4: Frontend Auth (1 hour)
- Register form
- Login form
- Dashboard with energy display
- Use existing brightchain-react

### Step 5: Integration (30 min)
- Wire up API routes
- Test end-to-end
- Document usage

## Total Time: ~3 hours

## Files to Create/Update

### API (brightchain-api)
```
src/services/
  auth.service.ts          # NEW - Auth with Member
  energy.service.ts        # NEW - Energy operations

src/controllers/api/
  auth.ts                  # NEW - Auth endpoints
  energy.ts                # NEW - Energy endpoints
  user.ts                  # UPDATE - Use new auth

src/middlewares/
  authenticateToken.ts     # UPDATE - Verify JWT

src/routers/
  api.ts                   # UPDATE - Add routes
```

### Frontend (brightchain-react)
```
src/app/pages/
  Register.tsx             # NEW
  Login.tsx                # NEW
  Dashboard.tsx            # NEW

src/app/services/
  auth.service.ts          # NEW
  energy.service.ts        # NEW

src/app/contexts/
  AuthContext.tsx          # NEW
```

## Next Action

Ready to implement? I'll build:
1. Auth service with Member + JWT
2. Energy service with account access
3. API controllers
4. Basic React pages

Say "go" and I'll start building!
