# TapTag Sale System Documentation

## Overview

The TapTag Sale system tracks sales made by Affiliate partners when they sell TapTag cards to clients. Each sale record contains information about the tag sold, the affiliate who made the sale, the owner who activated the tag, payment details, commission calculations, and verification status.

## Model Structure

### TapTagSale Schema

```javascript
{
  tag: ObjectId (ref: 'TapTag'),              // Required - The QR code/tag that was sold
  SalesPerson: ObjectId (ref: 'User'),        // Optional - Affiliate who made the sale
  owner: ObjectId (ref: 'TapTagUser'),        // Required - Owner who activated the tag
  saleDate: Date,                              // Required - Date of sale
  saleType: String,                            // Enum: 'online', 'offline', 'not-confirmed'
  salesPersonRole: String,                     // Enum: 'Affiliate', 'Support Admin', 'Admin', 'Super Admin'
  
  // Financial Fields
  totalSaleAmount: Number,                     // Card selling price (default: 0)
  commisionAmountOfSalesPerson: Number,       // Affiliate commission (default: 0)
  commisionAmountOfOwner: Number,             // Owner commission (default: 0)
  castAmountOfProductAndServices: Number,     // Total cost (printing, shipping, etc.) (default: 0)
  
  // Status Fields
  paymentStatus: String,                      // Enum: 'pending', 'completed', 'cancelled'
  varificationStatus: String,                 // Enum: 'pending', 'completed', 'cancelled'
  
  // Additional Fields
  message: Array,                             // Array of message objects for sale notes
  paymentImageOrScreenShot: String,           // Payment proof image URL
  
  // Audit Fields
  createdBy: ObjectId (ref: 'User'),         // Required
  updatedBy: ObjectId (ref: 'User'),         // Optional
  deletedBy: ObjectId (ref: 'User'),         // Optional
  createdAt: Date,                            // Required
  updatedAt: Date,                            // Optional
  deletedAt: Date,                            // Optional
}
```

### Field Descriptions

#### Core Fields
- **tag**: Reference to the TapTag that was sold
- **SalesPerson**: Reference to the Affiliate (User with role 'Affiliate') who made the sale
- **owner**: Reference to the TapTagUser who activated the tag
- **saleDate**: Date when the sale was made
- **saleType**: 
  - `online`: Sale made through online platform
  - `offline`: Sale made in person
  - `not-confirmed`: Sale not yet confirmed (default)

#### Financial Fields
- **totalSaleAmount**: The price at which the card was sold to the client
- **commisionAmountOfSalesPerson**: Commission earned by the Affiliate (calculated based on commissionPercentage)
- **commisionAmountOfOwner**: Commission/share given to the owner
- **castAmountOfProductAndServices**: Total cost including printing, shipping, packaging, etc.

#### Status Fields
- **paymentStatus**: 
  - `pending`: Payment not received
  - `completed`: Payment received
  - `cancelled`: Sale cancelled
- **varificationStatus**: 
  - `pending`: Sale not verified
  - `completed`: Sale verified
  - `cancelled`: Sale cancelled

#### Additional Fields
- **message**: Array of message objects containing notes about the sale, payment, and verification
- **paymentImageOrScreenShot**: URL to payment proof image/screenshot

## API Endpoints

### Base Path
All endpoints are under `/api/v1`

### Authentication
All endpoints require authentication. Roles allowed:
- Super Admin
- Admin
- Support Admin
- Affiliate

---

## 1. Get Sale List

**Endpoint:** `POST /api/v1/qr/saleList`

**Method:** POST

**Auth Required:** Yes (Super Admin, Admin, Support Admin, Affiliate)

**Description:** Get paginated list of sales with filtering options.

### Query Parameters (in body)

```json
{
  "page": 1,                    // Optional, default: 1
  "limit": 10,                  // Optional, default: 10
  "salesPersonRole": "Affiliate", // Optional - Filter by sales person role
  "salesPersonId": "user_id",   // Optional - Filter by specific affiliate
  "ownerId": "owner_id",        // Optional - Filter by owner
  "tagId": "tag_id",            // Optional - Filter by tag
  "paymentStatus": "pending",   // Optional - Filter by payment status
  "varificationStatus": "pending", // Optional - Filter by verification status
  "search": "search_term"       // Optional - Search in SalesPerson, owner, tag
}
```

### Response

```json
{
  "error": false,
  "message": "Sale list fetched successfully!",
  "data": {
    "items": [
      {
        "_id": "sale_id",
        "tag": {
          "_id": "tag_id",
          "tagId": "uuid",
          "shortCode": "abc123",
          "shortUrl": "https://...",
          "qrUrl": "https://...",
          "status": "activated"
        },
        "SalesPerson": {
          "_id": "affiliate_id",
          "name": "Rajesh Kumar",
          "email": "rajesh@example.com",
          "phone": "9876543210",
          "role": "Affiliate"
        },
        "owner": {
          "_id": "owner_id",
          "fullName": "John Doe",
          "phone": "9876543211",
          "email": "john@example.com",
          "vehicle": {
            "number": "UP32AB1234",
            "type": "car"
          }
        },
        "saleDate": "2024-01-15T10:30:00.000Z",
        "saleType": "offline",
        "salesPersonRole": "Affiliate",
        "totalSaleAmount": 500,
        "commisionAmountOfSalesPerson": 50,
        "commisionAmountOfOwner": 25,
        "castAmountOfProductAndServices": 100,
        "paymentStatus": "completed",
        "varificationStatus": "completed",
        "message": [
          {
            "message": "Tag activated successfully..."
          }
        ],
        "paymentImageOrScreenShot": "https://...",
        "createdBy": "user_id",
        "updatedBy": "user_id",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T11:00:00.000Z"
      }
    ],
    "total": 100,
    "page": 1,
    "pages": 10
  }
}
```

### Example Request

```bash
curl -X POST http://localhost:4000/api/v1/qr/saleList \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "page": 1,
    "limit": 10,
    "paymentStatus": "completed",
    "salesPersonRole": "Affiliate"
  }'
```

---

## 2. Create Sale

**Endpoint:** `POST /api/v1/qr/saleCreate`

**Method:** POST

**Auth Required:** Yes (Super Admin, Admin, Support Admin, Affiliate)

**Description:** Create a new sale record manually.

### Request Body

```json
{
  "tagId": "tag_object_id",                    // Required
  "salesPersonId": "affiliate_user_id",        // Required
  "ownerId": "tap_tag_user_id",                // Required
  "saleDate": "2024-01-15T10:30:00.000Z",      // Required (ISO date string)
  "saleType": "offline",                       // Optional: "online", "offline", "not-confirmed"
  "totalSaleAmount": 500,                      // Optional (default: null)
  "commisionAmountOfSalesPerson": 50,         // Optional (default: null)
  "commisionAmountOfOwner": 25,                // Optional (default: null)
  "castAmountOfProductAndServices": 100,        // Optional (default: null)
  "paymentStatus": "pending",                  // Required: "pending", "completed", "cancelled"
  "varificationStatus": "pending",             // Required: "pending", "completed", "cancelled"
  "message": [                                 // Optional
    {
      "message": "Sale notes here"
    }
  ],
  "paymentImageOrScreenShot": "https://...",  // Optional
  "createdBy": "user_id",                      // Required
  "updatedBy": "user_id",                      // Optional
  "deletedBy": null,                           // Optional
  "deletedAt": null,                           // Optional
  "createdAt": "2024-01-15T10:30:00.000Z",    // Required (ISO date string)
  "updatedAt": "2024-01-15T10:30:00.000Z"      // Optional (ISO date string)
}
```

### Response

```json
{
  "error": false,
  "message": "Sale created successfully!",
  "data": {
    "_id": "sale_id",
    "tag": "tag_object_id",
    "SalesPerson": "affiliate_user_id",
    "owner": "owner_id",
    "saleDate": "2024-01-15T10:30:00.000Z",
    "saleType": "offline",
    "salesPersonRole": "Affiliate",
    "totalSaleAmount": 500,
    "commisionAmountOfSalesPerson": 50,
    "commisionAmountOfOwner": 25,
    "castAmountOfProductAndServices": 100,
    "paymentStatus": "pending",
    "varificationStatus": "pending",
    "message": [...],
    "paymentImageOrScreenShot": null,
    "createdBy": "user_id",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Example Request

```bash
curl -X POST http://localhost:4000/api/v1/qr/saleCreate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "tagId": "67890abcdef1234567890123",
    "salesPersonId": "67890abcdef1234567890124",
    "ownerId": "67890abcdef1234567890125",
    "saleDate": "2024-01-15T10:30:00.000Z",
    "saleType": "offline",
    "totalSaleAmount": 500,
    "commisionAmountOfSalesPerson": 50,
    "commisionAmountOfOwner": 25,
    "castAmountOfProductAndServices": 100,
    "paymentStatus": "pending",
    "varificationStatus": "pending",
    "message": [{"message": "Initial sale record"}],
    "createdBy": "67890abcdef1234567890126",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }'
```

---

## Automatic Sale Creation

When a tag is activated, a sale record is automatically created in the background if:
- The user activating the tag has role `Affiliate`, OR
- The tag is assigned to an Affiliate (`tag.assignedTo`)

### Automatic Sale Creation Logic

Located in: `server/api/taptag/taptag.service.js` → `confirmActivation()`

**Flow:**
1. Tag activation is confirmed
2. System checks if user is Affiliate or tag is assigned to Affiliate
3. If yes, creates sale record with:
   - `tag`: Activated tag ID
   - `SalesPerson`: Affiliate user ID
   - `owner`: TapTagUser who activated
   - `saleType`: `'not-confirmed'`
   - `paymentStatus`: `'pending'`
   - `varificationStatus`: `'pending'`
   - All amounts set to `0` (to be updated later)
   - Auto-generated message with activation details

**Note:** This happens in background (non-blocking) using `.catch()` to handle errors silently.

---

## Business Logic

### Commission Calculation

The commission structure works as follows:

1. **totalSaleAmount**: Price at which card was sold to client
2. **castAmountOfProductAndServices**: Total cost (printing, shipping, packaging, etc.)
3. **commisionAmountOfSalesPerson**: Affiliate's commission (calculated based on `commissionPercentage` from User model)
4. **commisionAmountOfOwner**: Owner's share/commission

### Example Calculation

```
Card Selling Price: ₹500 (totalSaleAmount)
Cost: ₹100 (castAmountOfProductAndServices)
Affiliate Commission Rate: 10% (from User.commissionPercentage)

Affiliate Commission: ₹500 × 10% = ₹50 (commisionAmountOfSalesPerson)
Owner Commission: ₹25 (commisionAmountOfOwner) - set manually
Net Profit: ₹500 - ₹100 - ₹50 - ₹25 = ₹325
```

### Status Workflow

1. **Sale Created** → `paymentStatus: 'pending'`, `varificationStatus: 'pending'`
2. **Payment Received** → `paymentStatus: 'completed'`
3. **Sale Verified** → `varificationStatus: 'completed'`
4. **If Cancelled** → Both statuses set to `'cancelled'`

---

## Integration with Affiliate System

### Affiliate Stats API

The sale data is used in the Affiliate List API (`GET /api/v1/user/affiliate-list-with-stats`) to calculate:

- **Cards Activated**: Count of sales where `SalesPerson = affiliate._id`
- **Total Sales Amount**: Sum of `totalSaleAmount`
- **Total Commission Earned**: Sum of `commisionAmountOfSalesPerson`
- **Total Cost**: Sum of `castAmountOfProductAndServices`
- **Total Owner Commission**: Sum of `commisionAmountOfOwner`

---

## Error Handling

### Common Errors

1. **Missing Required Fields**
   ```json
   {
     "error": true,
     "message": "tagId is required",
     "data": {}
   }
   ```

2. **Invalid ObjectId**
   ```json
   {
     "error": true,
     "message": "Invalid tagId format",
     "data": {}
   }
   ```

3. **Unauthorized Access**
   ```json
   {
     "error": true,
     "message": "You are not authorized to access this resource",
     "data": {}
   }
   ```

---

## Best Practices

1. **Sale Creation**: Use automatic sale creation during tag activation when possible
2. **Commission Calculation**: Always calculate commission based on `commissionPercentage` from User model
3. **Status Updates**: Update `paymentStatus` and `varificationStatus` separately as they are independent
4. **Message Array**: Use message array to track sale history, payment notes, and verification notes
5. **Payment Proof**: Always upload `paymentImageOrScreenShot` when `paymentStatus` is `'completed'`

---

## Related APIs

- **Tag Activation**: `POST /api/v1/activate-tag/confirm` - Automatically creates sale
- **Affiliate List with Stats**: `GET /api/v1/user/affiliate-list-with-stats` - Uses sale data for stats
- **Assign Tags to Affiliate**: `POST /api/v1/admin/tags/assign-affiliate` - Links tags to affiliates

---

## Notes

- Sales are created automatically when tags are activated by Affiliates
- All financial amounts are stored as Numbers (not strings)
- The `message` array can contain multiple messages for tracking sale history
- `deletedAt` field is used for soft deletes (if implemented)
- `salesPersonRole` is automatically set based on the user's role who creates the sale

