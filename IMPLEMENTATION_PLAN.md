# Implementation Guide: Refund & Dispute System

This document serves as the "prompt" and technical specification for implementing the requested Smart Contract functions in TaniTrust.

## 1. Database Schema (`prisma/schema.prisma`)

We need to tracking Orders and Disputes off-chain to display them in the UI without querying the blockchain for every historical event.

```prisma
model Order {
  sui_object_id String   @id @db.VarChar(66)
  product_id    String   @db.VarChar(66)
  buyer         String   @db.VarChar(66)
  farmer        String   @db.VarChar(66)
  quantity      BigInt
  total_price   BigInt
  deadline      BigInt   // Timestamp ms
  status        Int      // 0: Escrowed, 1: Completed, 2: Refunded, 3: Disputed
  
  // Relations
  product       Product  @relation(fields: [product_id], references: [sui_object_id])
  dispute       Dispute? 

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Dispute {
  sui_object_id     String   @id @db.VarChar(66)
  order_id          String   @unique @db.VarChar(66)
  buyer             String   @db.VarChar(66)
  farmer            String   @db.VarChar(66)
  
  // State
  farmer_percentage Int      @default(0)
  buyer_percentage  Int      @default(0)
  votes_for         Int      @default(0)
  votes_against     Int      @default(0)
  status            Int      // 0: Pending, 1: Resolved

  // Relations
  order             Order    @relation(fields: [order_id], references: [sui_object_id])
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

## 2. Frontend Hooks

We will create two main specialized hooks.

### A. `useRefundActions.ts` (Automatic Refund)
**Function:** `process_expired_order`

**Inputs:**
- `orderObjectId`: string
- `clockObjectId`: string (Usually `0x6`)

**Logic:**
1. Check if `Date.now() > order.deadline`.
2. Call `process_expired_order` move function.
3. On success, call API to update Order status to `REFUNDED` in DB.

```typescript
// Prompt logic for generating the hook:
const tx = new Transaction();
tx.moveCall({
  target: `${PACKAGE_ID}::marketplace::process_expired_order`,
  arguments: [
    tx.object(orderObjectId),
    tx.object('0x6') // Clock
  ]
});
```

### B. `useDisputeActions.ts` (Dispute Resolution)
**Functions:**

1.  **`createDispute`**
    *   **Move Call:** `create_dispute(order_obj)`
    *   **Post-Action:** Create `Dispute` record in DB linked to Order.

2.  **`proposeCompensation`**
    *   **Move Call:** `propose_compensation(dispute_obj, farmer_pct, buyer_pct)`
    *   **Post-Action:** Update `Dispute` record in DB with new percentages.

3.  **`acceptCompensation`**
    *   **Move Call:** `accept_compensation(dispute_obj, order_obj)`
    *   **Post-Action:** Update `Dispute` status to `RESOLVED` and Order status to `RESOLVED/REFUNDED` in DB.

4.  **`voteOnDispute`** (DAO Voting)
    *   **Move Call:** `vote_on_dispute(dispute_obj, vote_bool)`
    *   **Post-Action:** Increment local vote count (optimistic) and sync.

## 3. Backend API Endpoints

### `POST /api/orders/refund`
- **Trigger:** Called after `process_expired_order` success on frontend.
- **Action:** Updates `Order` status in DB to indicate it was refunded.

### `POST /api/disputes/create`
- **Trigger:** Called after `create_dispute` success.
- **Action:** Creates a new `Dispute` row in Prisma.

### `POST /api/disputes/update`
- **Trigger:** Called after `propose_compensation` or `vote_on_dispute`.
- **Action:** Updates the dispute state (percentages or vote counts).

### `POST /api/disputes/resolve`
- **Trigger:** Called after `accept_compensation`.
- **Action:** Closes the Dispute and updates final Order status.

## 4. UI Components Guide

1.  **`OrderCard.tsx`**:
    *   Add "Request Refund" button.
    *   **Condition:** Show only if `status === ESCROWED` AND `now > deadline`.

2.  **`DisputePanel.tsx`**:
    *   Show current split proposal (Farmer % vs Buyer %).
    *   If current user is involved (Buyer/Farmer), show inputs to propose new split.
    *   Show "Accept & Resolve" button if proposal is valid.
    *   Show "Vote" buttons for DAO members (if applicable).
