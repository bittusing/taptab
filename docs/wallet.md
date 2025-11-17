# Wallet System Documentation

## Overview

The Wallet System manages affiliate commissions and withdrawals. It tracks earnings from completed sales, handles withdrawal requests, and maintains a transaction history for each affiliate user.

## Key Features

- **Commission Tracking**: Automatically calculates commission from completed sales
- **Withdrawal Management**: Affiliates can request withdrawals, admins can approve/reject
- **Transaction History**: Complete audit trail of all wallet transactions
- **Balance Management**: Real-time available balance calculation
- **Status-based Calculation**: Only completed sales (both verification and payment) count towards available balance

## Wallet Model Structure

### WalletTransaction Schema

```javascript
{
  user: ObjectId,              // Reference to User (Affiliate)
  sale: ObjectId,              // Optional: Reference to TapTagSale
  type: String,                // 'credit' or 'debit'
  amount: Number,              // Transaction amount (min: 0)
  status: String,              // 'pending', 'completed', 'cancelled'
  description: String,         // Transaction description
  notes: String,              // Additional notes
  balanceSnapshot: Number,     // Balance at time of transaction
  meta: Object,               // Additional metadata
  createdBy: ObjectId,         // User who created the transaction
  approvedBy: ObjectId,       // Admin who approved (if completed)
  approvedAt: Date,            // Approval timestamp
  createdAt: Date,            // Auto-generated
  updatedAt: Date             // Auto-generated
}
```

## Business Logic

### Commission Calculation Rules

1. **Completed Sales**: Only sales with both `varificationStatus: 'completed'` AND `paymentStatus: 'completed'` are counted
2. **Pending Sales**: Sales with either verification or payment status as pending are tracked separately
3. **Available Balance**: `Total Completed Commission - Total Completed Withdrawals`
4. **Withdrawal Validation**: Users cannot withdraw more than their available balance

### Sale Status Impact

| Verification Status | Payment Status | Counts in Available Balance | Status |
|---------------------|----------------|------------------------------|--------|
| completed | completed | ✅ Yes | Completed Sale |
| completed | pending | ❌ No | Pending Sale |
| pending | completed | ❌ No | Pending Sale |
| pending | pending | ❌ No | Pending Sale |

## API Endpoints

### Base URL
All wallet endpoints are prefixed with `/api/v1/wallet`

---

### 1. Get My Wallet Details

**Endpoint**: `GET /api/v1/wallet/me`

**Authentication**: Required (Affiliate, Support Admin, Admin, Super Admin)

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "completedSales": {
        "totalCommission": 4000,
        "totalSalesAmount": 30000,
        "totalCost": 20000,
        "totalOwnerCommission": 6000,
        "cardsActivated": 15
      },
      "pendingSales": {
        "pendingCommission": 500,
        "pendingSalesAmount": 5000,
        "pendingCards": 2
      },
      "totalWithdrawn": 1000,
      "pendingWithdrawals": 500,
      "availableBalance": 3000
    },
    "transactions": [
      {
        "_id": "transaction_id",
        "user": "user_id",
        "sale": "sale_id",
        "type": "debit",
        "amount": 1000,
        "status": "completed",
        "description": "Withdrawal request",
        "notes": "",
        "balanceSnapshot": 2000,
        "createdBy": "user_id",
        "approvedBy": "admin_id",
        "approvedAt": "2024-01-15T10:30:00Z",
        "createdAt": "2024-01-15T10:00:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "page": 1,
    "limit": 20
  }
}
```

**Example Request**:
```bash
curl -X GET "http://localhost:3000/api/v1/wallet/me?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 2. Request Withdrawal

**Endpoint**: `POST /api/v1/wallet/withdraw`

**Authentication**: Required (Affiliate, Support Admin, Admin, Super Admin)

**Request Body**:
```json
{
  "amount": 2000,
  "notes": "Monthly payout request"
}
```

**Validation**:
- `amount`: Required, must be positive number
- `notes`: Optional string

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "transaction_id",
    "user": "user_id",
    "type": "debit",
    "amount": 2000,
    "status": "pending",
    "description": "Withdrawal request",
    "notes": "Monthly payout request",
    "balanceSnapshot": 1000,
    "createdBy": "user_id",
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

**Error Responses**:
- `400`: "Withdrawal amount must be greater than zero"
- `400`: "Insufficient wallet balance"

**Example Request**:
```bash
curl -X POST "http://localhost:3000/api/v1/wallet/withdraw" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2000,
    "notes": "Monthly payout request"
  }'
```

---

### 3. Get User Wallet (Admin)

**Endpoint**: `GET /api/v1/wallet/:userId`

**Authentication**: Required (Support Admin, Admin, Super Admin)

**URL Parameters**:
- `userId`: User ID of the affiliate

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response**: Same structure as "Get My Wallet Details"

**Example Request**:
```bash
curl -X GET "http://localhost:3000/api/v1/wallet/507f1f77bcf86cd799439011?page=1&limit=20" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

### 4. Update Transaction Status (Admin)

**Endpoint**: `PATCH /api/v1/wallet/transaction/:transactionId`

**Authentication**: Required (Support Admin, Admin, Super Admin)

**URL Parameters**:
- `transactionId`: Transaction ID to update

**Request Body**:
```json
{
  "status": "completed",
  "notes": "Payment processed successfully"
}
```

**Validation**:
- `status`: Required, must be one of: 'pending', 'completed', 'cancelled'
- `notes`: Optional string

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "transaction_id",
    "user": "user_id",
    "type": "debit",
    "amount": 2000,
    "status": "completed",
    "description": "Withdrawal request",
    "notes": "Payment processed successfully",
    "balanceSnapshot": 1000,
    "createdBy": "user_id",
    "approvedBy": "admin_id",
    "approvedAt": "2024-01-15T11:00:00Z",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T11:00:00Z"
  }
}
```

**Note**: When status is set to 'completed', `approvedBy` and `approvedAt` are automatically set.

**Example Request**:
```bash
curl -X PATCH "http://localhost:3000/api/v1/wallet/transaction/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "notes": "Payment processed successfully"
  }'
```

---

### 5. Create Manual Credit (Admin)

**Endpoint**: `POST /api/v1/wallet/manual-credit`

**Authentication**: Required (Support Admin, Admin, Super Admin)

**Request Body**:
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "amount": 500,
  "description": "Bonus payment",
  "notes": "Special bonus for excellent performance",
  "saleId": "507f1f77bcf86cd799439012"
}
```

**Validation**:
- `userId`: Required, valid user ID
- `amount`: Required, must be positive number
- `description`: Optional string
- `notes`: Optional string
- `saleId`: Optional, valid sale ID

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "transaction_id",
    "user": "user_id",
    "sale": "sale_id",
    "type": "credit",
    "amount": 500,
    "status": "completed",
    "description": "Bonus payment",
    "notes": "Special bonus for excellent performance",
    "balanceSnapshot": 500,
    "createdBy": "admin_id",
    "approvedBy": "admin_id",
    "approvedAt": "2024-01-15T12:00:00Z",
    "createdAt": "2024-01-15T12:00:00Z",
    "updatedAt": "2024-01-15T12:00:00Z"
  }
}
```

**Note**: Manual credits are automatically set to 'completed' status.

**Example Request**:
```bash
curl -X POST "http://localhost:3000/api/v1/wallet/manual-credit" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "507f1f77bcf86cd799439011",
    "amount": 500,
    "description": "Bonus payment",
    "notes": "Special bonus for excellent performance"
  }'
```

---

## Summary Fields Explanation

### Completed Sales Summary
- `totalCommission`: Sum of all commission amounts from completed sales
- `totalSalesAmount`: Sum of all sale amounts from completed sales
- `totalCost`: Sum of all product/service costs from completed sales
- `totalOwnerCommission`: Sum of all owner commissions from completed sales
- `cardsActivated`: Count of completed sales (activated cards)

### Pending Sales Summary
- `pendingCommission`: Sum of commission amounts from pending sales
- `pendingSalesAmount`: Sum of sale amounts from pending sales
- `pendingCards`: Count of pending sales

### Withdrawal Summary
- `totalWithdrawn`: Sum of all completed withdrawal transactions
- `pendingWithdrawals`: Sum of all pending withdrawal requests

### Available Balance
- Calculated as: `Completed Commission - Total Withdrawn`
- Cannot be negative (minimum: 0)
- Used to validate withdrawal requests

## Transaction Types

### Credit Transactions
- **Automatic**: Created when a sale is marked as completed (future enhancement)
- **Manual**: Created by admin using manual credit endpoint
- **Status**: Usually 'completed' immediately

### Debit Transactions
- **Withdrawal Requests**: Created by affiliates
- **Status**: Starts as 'pending', updated by admin to 'completed' or 'cancelled'

## Workflow Examples

### Example 1: Affiliate Withdrawal Flow

1. **Affiliate checks balance**:
   ```
   GET /api/v1/wallet/me
   Response: availableBalance = 4000
   ```

2. **Affiliate requests withdrawal**:
   ```
   POST /api/v1/wallet/withdraw
   Body: { "amount": 2000, "notes": "Monthly payout" }
   Response: Transaction created with status 'pending'
   ```

3. **Admin reviews and approves**:
   ```
   PATCH /api/v1/wallet/transaction/:transactionId
   Body: { "status": "completed", "notes": "Payment processed" }
   Response: Transaction updated, approvedBy and approvedAt set
   ```

4. **Affiliate checks updated balance**:
   ```
   GET /api/v1/wallet/me
   Response: availableBalance = 2000, totalWithdrawn = 2000
   ```

### Example 2: Monthly Commission Calculation

**Scenario**: Affiliate has:
- 10 completed sales: Total commission = ₹30,000
- 5 pending sales: Pending commission = ₹5,000
- Previous withdrawals: ₹10,000

**Wallet Summary**:
```json
{
  "completedSales": {
    "totalCommission": 30000,
    "cardsActivated": 10
  },
  "pendingSales": {
    "pendingCommission": 5000,
    "pendingCards": 5
  },
  "totalWithdrawn": 10000,
  "availableBalance": 20000
}
```

**Available for withdrawal**: ₹20,000

## Error Handling

### Common Errors

| Status Code | Error Message | Description |
|-------------|---------------|-------------|
| 400 | "Withdrawal amount must be greater than zero" | Invalid withdrawal amount |
| 400 | "Insufficient wallet balance" | Requested amount exceeds available balance |
| 400 | "Invalid status value" | Transaction status is not valid |
| 404 | "Transaction not found" | Transaction ID doesn't exist |
| 404 | "User not found" | User ID doesn't exist |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | User doesn't have required role |

## Integration with TapTagSale

The wallet system integrates with the `TapTagSale` model:

- **Sales Person**: Links to `SalesPerson` field in TapTagSale
- **Commission Source**: Uses `commisionAmountOfSalesPerson` from completed sales
- **Status Filter**: Only counts sales where both `varificationStatus` and `paymentStatus` are 'completed'

## Future Enhancements

1. **Automatic Credit**: Automatically create credit transactions when sales are marked as completed
2. **Scheduled Payouts**: Automatic monthly/weekly payout processing
3. **Payment Gateway Integration**: Direct bank transfer or UPI integration
4. **Commission Tiers**: Different commission rates based on sales volume
5. **Notifications**: Email/SMS notifications for transaction status changes

## Notes

- All amounts are stored as numbers (not strings)
- Balance calculations are done in real-time using aggregation pipelines
- Transaction history is paginated for performance
- All transactions maintain an audit trail with `createdBy`, `approvedBy`, and timestamps
- The system prevents negative balances by validating withdrawal amounts

