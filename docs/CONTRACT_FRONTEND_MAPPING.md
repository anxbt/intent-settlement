# Smart Contract to Frontend Mapping

## Overview

This document provides a comprehensive mapping of every function in the `IntentEscrow.sol` smart contract to its corresponding frontend implementation. This is critical for debugging real money transactions.

---

## Contract Address Configuration

```typescript
// frontend/src/lib/contract.ts
export const INTENT_ESCROW_ADDRESS = import.meta.env.VITE_INTENT_ESCROW_ADDRESS;
export const CONTRACT_CHAIN_ID = 8453; // Base Mainnet
```

Set via environment variable:
```bash
VITE_INTENT_ESCROW_ADDRESS=0x...your_deployed_address
```

---

## State Machine

```
CREATED (0) → LOCKED (1) → FULFILLED (2)
                    ↓
               FAILED (3) → REFUNDED (4)
```

### Frontend Enum
```typescript
// frontend/src/hooks/useIntentContract.ts
export enum IntentState {
  CREATED = 0,
  LOCKED = 1,
  FULFILLED = 2,
  FAILED = 3,
  REFUNDED = 4,
}
```

---

## Function Mappings

### 1. `createIntent(address receiver, address token, uint256 amount, uint256 expiry)`

**Contract Location:** `src/IntentEscrow.sol:L45-L65`

**Purpose:** Creates a new payment intent (receiver initiates)

**Frontend Hook:** `useCreateIntent()` in [useIntentContract.ts](../frontend/src/hooks/useIntentContract.ts)

**Frontend Page:** [CreateIntent.tsx](../frontend/src/pages/CreateIntent.tsx)

**Flow:**
```
User fills form → handleSubmit() → createIntent() → Contract emits IntentCreated
                                        ↓
                  [Intent ID logged with all parameters]
```

**Frontend Code:**
```typescript
const { createIntent, isPending, isConfirming, error } = useCreateIntent();

// Usage
const intentId = await createIntent(
  receiver,  // address - who receives the funds
  token,     // address - ERC20 token (e.g., USDC on Base)
  amount,    // bigint - amount in smallest unit (6 decimals for USDC)
  expiry     // bigint - Unix timestamp when intent expires
);
```

**Logged Events:**
- `[CreateIntent] createIntent:initiated` - When user clicks submit
- `[CreateIntent] createIntent:txSent` - Transaction hash available
- `[CreateIntent] createIntent:confirmed` - Transaction mined
- `[CreateIntent] createIntent:success` - Intent ID extracted from logs
- `[CreateIntent] createIntent:error` - Any errors

**Contract Access Control:** Anyone can create intents

---

### 2. `lockFunds(uint256 intentId)`

**Contract Location:** `src/IntentEscrow.sol:L67-L95`

**Purpose:** Payer commits funds to an intent (requires prior ERC20 approval)

**Frontend Hook:** `useLockFunds()` in [useIntentContract.ts](../frontend/src/hooks/useIntentContract.ts)

**Frontend Page:** [PayIntent.tsx](../frontend/src/pages/PayIntent.tsx)

**Flow:**
```
1. Payer selects source token
2. If cross-chain: LI.FI routes funds to Base first
3. ERC20 approval (if needed)
4. lockFunds() called
5. Contract emits FundsLocked
```

**Frontend Code:**
```typescript
const { lockFunds, isPending, isConfirming, error } = useLockFunds();

// Usage (handles approval automatically)
const txHash = await lockFunds(
  intentId,  // bigint - the intent to lock funds for
  payer      // address - who is paying (becomes intent.payer)
);
```

**Pre-requisites:**
- Intent must be in `CREATED` state
- Token allowance must be >= intent.amount (hook handles this)
- Intent must not be expired

**Logged Events:**
- `[LockFunds] lockFunds:initiated` - Parameters and current state
- `[LockFunds] checkingAllowance` - Current vs required allowance
- `[LockFunds] approvalNeeded` / `approvalSkipped` - Allowance status
- `[LockFunds] approval:txSent` - Approval tx hash
- `[LockFunds] approval:confirmed` - Approval mined
- `[LockFunds] lock:txSent` - Lock tx hash
- `[LockFunds] lock:confirmed` - Lock mined
- `[LockFunds] lockFunds:error` - Any errors

**Contract Events Emitted:** `FundsLocked(uint256 intentId, address payer)`

---

### 3. `fulfillIntent(uint256 intentId)`

**Contract Location:** `src/IntentEscrow.sol:L97-L115`

**Purpose:** Receiver confirms they received payment, funds released

**Frontend Hook:** `useFulfillIntent()` in [useIntentContract.ts](../frontend/src/hooks/useIntentContract.ts)

**Frontend Page:** [IntentStatus.tsx](../frontend/src/pages/IntentStatus.tsx)

**Flow:**
```
Receiver clicks "Fulfill" → fulfillIntent() → Funds transferred to receiver
                                    ↓
                    Contract emits IntentFulfilled
```

**Frontend Code:**
```typescript
const { fulfillIntent, isPending, isConfirming, error } = useFulfillIntent();

// Usage
const txHash = await fulfillIntent(
  intentId  // bigint - the intent to fulfill
);
```

**Access Control:** Only `intent.receiver` can call

**Pre-requisites:**
- Intent must be in `LOCKED` state
- Caller must be `intent.receiver`

**Logged Events:**
- `[FulfillIntent] fulfillIntent:initiated` - Intent ID and caller
- `[FulfillIntent] fulfillIntent:txSent` - Transaction hash
- `[FulfillIntent] fulfillIntent:confirmed` - Transaction mined
- `[FulfillIntent] fulfillIntent:error` - Any errors

**Contract Events Emitted:** `IntentFulfilled(uint256 intentId)`

---

### 4. `markFailed(uint256 intentId)`

**Contract Location:** `src/IntentEscrow.sol:L117-L130`

**Purpose:** Mark intent as failed after expiry (anyone can call)

**Frontend Hook:** `useMarkFailed()` in [useIntentContract.ts](../frontend/src/hooks/useIntentContract.ts)

**Frontend Page:** [IntentStatus.tsx](../frontend/src/pages/IntentStatus.tsx)

**Flow:**
```
Time passes, intent expires → Anyone clicks "Mark Failed" → markFailed()
                                                                  ↓
                                         Contract emits IntentFailed
```

**Frontend Code:**
```typescript
const { markFailed, isPending, isConfirming, error } = useMarkFailed();

// Usage
const txHash = await markFailed(
  intentId  // bigint - the intent to mark as failed
);
```

**Access Control:** Anyone can call (after expiry)

**Pre-requisites:**
- Intent must be in `LOCKED` state
- Current time must be > `intent.expiry`

**Logged Events:**
- `[MarkFailed] markFailed:initiated` - Intent ID and expiry status
- `[MarkFailed] markFailed:txSent` - Transaction hash
- `[MarkFailed] markFailed:confirmed` - Transaction mined
- `[MarkFailed] markFailed:error` - Any errors

**Contract Events Emitted:** `IntentFailed(uint256 intentId)`

---

### 5. `reclaimFunds(uint256 intentId)`

**Contract Location:** `src/IntentEscrow.sol:L132-L147`

**Purpose:** Payer reclaims funds after intent fails

**Frontend Hook:** `useReclaimFunds()` in [useIntentContract.ts](../frontend/src/hooks/useIntentContract.ts)

**Frontend Page:** [IntentStatus.tsx](../frontend/src/pages/IntentStatus.tsx)

**Flow:**
```
Intent is FAILED → Payer clicks "Reclaim" → reclaimFunds() → Funds return to payer
                                                    ↓
                                    Contract emits FundsReclaimed
```

**Frontend Code:**
```typescript
const { reclaimFunds, isPending, isConfirming, error } = useReclaimFunds();

// Usage
const txHash = await reclaimFunds(
  intentId  // bigint - the intent to reclaim funds from
);
```

**Access Control:** Only `intent.payer` can call

**Pre-requisites:**
- Intent must be in `FAILED` state
- Caller must be `intent.payer`

**Logged Events:**
- `[ReclaimFunds] reclaimFunds:initiated` - Intent ID and caller
- `[ReclaimFunds] reclaimFunds:txSent` - Transaction hash
- `[ReclaimFunds] reclaimFunds:confirmed` - Transaction mined
- `[ReclaimFunds] reclaimFunds:error` - Any errors

**Contract Events Emitted:** `FundsReclaimed(uint256 intentId, address payer, uint256 amount)`

---

## View Functions

### `intents(uint256 intentId)` → Intent struct

**Contract Location:** `src/IntentEscrow.sol:L23` (public mapping)

**Frontend Hook:** `useIntent(intentId)` in [useIntentContract.ts](../frontend/src/hooks/useIntentContract.ts)

**Returns:**
```typescript
interface Intent {
  receiver: string;      // Who receives funds on fulfillment
  payer: string;         // Who locked the funds (0x0 if not locked)
  token: string;         // ERC20 token address
  amount: bigint;        // Amount in token's smallest unit
  expiry: bigint;        // Unix timestamp
  state: IntentState;    // 0-4 enum value
}
```

**Used in Pages:**
- [PayIntent.tsx](../frontend/src/pages/PayIntent.tsx) - Display intent details before payment
- [IntentStatus.tsx](../frontend/src/pages/IntentStatus.tsx) - Display current state and actions

**Logged Events:**
- `[Intent] useIntent:fetched` - Full intent data on successful fetch
- `[Intent] useIntent:error` - Fetch errors

---

### `nextIntentId()` → uint256

**Contract Location:** `src/IntentEscrow.sol:L26` (public variable)

**Frontend Hook:** `useNextIntentId()` in [useIntentContract.ts](../frontend/src/hooks/useIntentContract.ts)

**Purpose:** Get the next intent ID that will be assigned (useful for pre-calculating)

**Used in Pages:**
- [CreateIntent.tsx](../frontend/src/pages/CreateIntent.tsx) - Show what ID the new intent will have

---

## Cross-Chain Integration (LI.FI)

**Frontend Hook:** `useLiFi()` in [useLiFi.ts](../frontend/src/hooks/useLiFi.ts)

**Purpose:** Bridge tokens from other chains to Base before locking

**Supported Source Chains:**
- Base (8453) - USDC, ETH
- Optimism (10) - USDC, ETH

**Flow:**
```
1. User selects source token (e.g., USDC on Optimism)
2. fetchRoutes() gets bridge routes from LI.FI API
3. executeRoute() bridges funds to Base
4. lockFunds() locks the bridged funds
```

**Logged Events:**
- `[LiFi] fetchRoutes:request` - Route request parameters
- `[LiFi] fetchRoutes:response` - Available routes
- `[LiFi] executeRoute:start` - Beginning execution
- `[LiFi] executeRoute:step` - Each step in multi-step route
- `[LiFi] executeRoute:txSent` - Bridge transaction hash
- `[LiFi] executeRoute:confirmed` - Bridge completed
- `[LiFi] executeRoute:error` - Any errors

---

## Event Subscriptions

The contract emits these events that can be watched:

| Event | Parameters | When Emitted |
|-------|------------|--------------|
| `IntentCreated` | `intentId, receiver, token, amount, expiry` | New intent created |
| `FundsLocked` | `intentId, payer` | Payer locks funds |
| `IntentFulfilled` | `intentId` | Receiver confirms payment |
| `IntentFailed` | `intentId` | Intent marked failed after expiry |
| `FundsReclaimed` | `intentId, payer, amount` | Payer reclaims from failed intent |

**Frontend Watching:** Each hook watches for its respective event to confirm state changes.

---

## Debugging Guide

### Console Log Colors
- 🟦 **Blue** (`#3b82f6`) - General info
- 🟩 **Green** (`#22c55e`) - Success
- 🟥 **Red** (`#ef4444`) - Errors
- 🟨 **Yellow** (`#eab308`) - Warnings
- 🟪 **Purple** (`#8b5cf6`) - Events
- 🔵 **Cyan** (`#06b6d4`) - Transactions
- 🟣 **Violet** (`#9f7aea`) - Page-level logs

### Log Prefixes
- `[CreateIntent]` - Create intent hook
- `[LockFunds]` - Lock funds hook
- `[FulfillIntent]` - Fulfill hook
- `[MarkFailed]` - Mark failed hook
- `[ReclaimFunds]` - Reclaim hook
- `[Intent]` - Intent read hook
- `[LiFi]` - Bridge operations
- `[CreateIntent]` - Create intent page
- `[PayIntent]` - Pay intent page
- `[IntentStatus]` - Status page

### Debugging Steps

1. **Open Browser DevTools** → Console tab
2. **Filter by prefix** to focus on specific operations
3. **Check timestamps** to trace flow
4. **Look for error logs** (red color) for failures
5. **Check transaction hashes** on BaseScan for on-chain status

### Common Issues

| Symptom | Log to Check | Likely Cause |
|---------|--------------|--------------|
| Lock fails | `checkingAllowance` | Insufficient token approval |
| Fulfill fails | `fulfillIntent:initiated` | Not the receiver |
| Reclaim fails | `reclaimFunds:initiated` | Not FAILED state or not payer |
| Bridge fails | `executeRoute:error` | Insufficient balance or slippage |

---

## File Structure Reference

```
frontend/src/
├── hooks/
│   ├── useIntentContract.ts   # All contract interactions with logging
│   └── useLiFi.ts             # LI.FI bridge integration with logging
├── pages/
│   ├── CreateIntent.tsx       # Receiver creates intent
│   ├── PayIntent.tsx          # Payer locks funds
│   └── IntentStatus.tsx       # View status & actions
└── lib/
    └── contract.ts            # Contract address & ABI
```

---

## Security Considerations

1. **Private Keys:** Never logged, handled by wallet provider
2. **Transaction Hashes:** Logged for debugging
3. **Addresses:** Logged for verification
4. **Amounts:** Logged in both raw and formatted form
5. **Errors:** Full error details logged for debugging

---

## Testing Checklist

Before deploying with real money:

- [ ] Test create intent on Base testnet
- [ ] Test lock funds from same chain
- [ ] Test lock funds from different chain (LI.FI bridge)
- [ ] Test fulfill as receiver
- [ ] Test mark failed after expiry
- [ ] Test reclaim as payer
- [ ] Verify all console logs appear correctly
- [ ] Check transaction confirmations on block explorer
