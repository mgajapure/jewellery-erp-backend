# Jewellery ERP — Complete API Documentation

> For frontend / mobile integration. Every endpoint, every field, every permission.

---

## Table of Contents

1. [Global Configuration](#global-configuration)
2. [Authentication & Headers](#authentication--headers)
3. [Response Format](#response-format)
4. [Error Format](#error-format)
5. [Permission Reference](#permission-reference)
6. [Modules](#modules)
   - [Auth](#1-auth)
   - [Customers](#2-customers)
   - [Girvi (Gold Loans)](#3-girvi-gold-loans)
   - [Interest](#4-interest)
   - [Vault](#5-vault)
   - [Compliance](#6-compliance)
   - [Inventory](#7-inventory)
   - [Sales](#8-sales)
   - [Purchase & Vendors](#9-purchase--vendors)
   - [Karigar](#10-karigar)
   - [Savings Schemes](#11-savings-schemes)
   - [Repairs](#12-repairs)
   - [Custom Orders](#13-custom-orders)
   - [Diamond & Gemstones](#14-diamond--gemstones)
   - [Expenses](#15-expenses)
   - [Gold Rates](#16-gold-rates)
   - [Barcode](#17-barcode)
   - [Branches](#18-branches)
   - [Staff](#19-staff)
   - [Dashboard](#20-dashboard)
   - [Reports](#21-reports)
   - [Notifications](#22-notifications)
   - [WhatsApp Bot](#23-whatsapp-bot)
   - [GST Filing](#24-gst-filing)
   - [Payroll](#25-payroll)
   - [Old Gold](#26-old-gold)
   - [Loyalty](#27-loyalty)
   - [Franchise](#28-franchise)
   - [Helpdesk](#29-helpdesk)
   - [Data Import / Export](#30-data-import--export)
   - [Sync (Offline)](#31-sync-offline)
   - [Search](#32-search)
   - [Settings](#33-settings)
   - [Health Check](#34-health-check)

---

## Global Configuration

| Property | Value |
|---|---|
| Base URL (local dev) | `http://localhost:3000` |
| API Prefix | `/api/v1` |
| Swagger UI | `http://localhost:3000/api/docs` |
| Content-Type | `application/json` |
| Authentication | Bearer JWT (except `/auth/*` and `/whatsapp/webhook`) |

**All routes are under `/api/v1/`.**  
Example: `POST /api/v1/auth/otp/send`

---

## Authentication & Headers

Every protected endpoint requires:

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

Tokens are obtained from `/api/v1/auth/otp/verify` or `/api/v1/auth/pin/verify`.

| Token | Lifespan | Usage |
|---|---|---|
| `accessToken` | 24 hours | `Authorization: Bearer <token>` |
| `refreshToken` | 30 days | POST `/auth/token/refresh` |

---

## Response Format

**Success:**
```json
{
  "success": true,
  "data": { }
}
```

**Paginated Success:**
```json
{
  "success": true,
  "data": {
    "items": [ ],
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

---

## Error Format

```json
{
  "success": false,
  "error": {
    "code": "MODULE_001",
    "message": "Human-readable message",
    "details": [ ]
  }
}
```

**Common HTTP status codes:**

| Code | Meaning |
|---|---|
| 200 | Success |
| 201 | Created |
| 400 | Validation error / bad request |
| 401 | Unauthenticated — missing or expired token |
| 403 | Forbidden — insufficient permissions |
| 404 | Resource not found |
| 409 | Conflict (duplicate, already exists) |
| 422 | Business rule violation |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## Permission Reference

Each endpoint is guarded by a specific permission. The logged-in user's role determines which permissions they have.

| Permission | Description |
|---|---|
| `DEVICE_APPROVE` | Approve or reject device registrations |
| `CUSTOMER_CREATE` | Create new customers |
| `CUSTOMER_VIEW` | View customer profiles |
| `CUSTOMER_UPDATE` | Edit customer details and KYC |
| `GIRVI_CREATE` | Create new gold loans |
| `GIRVI_VIEW` | View loans and interest |
| `GIRVI_UPDATE` | Record payments, renewals, KFS |
| `GIRVI_CLOSE` | Redeem / close loans |
| `INVENTORY_VIEW` | View inventory items |
| `INVENTORY_MANAGE` | Add / edit / adjust inventory |
| `SALES_CREATE` | Create sales invoices |
| `SALES_VIEW` | View sales records |
| `EXPENSE_SUBMIT` | Submit expense requests |
| `EXPENSE_VIEW` | View expense records |
| `EXPENSE_APPROVE` | Approve or reject expenses |
| `REPAIR_MANAGE` | Create and update repair tickets |
| `REPAIR_VIEW` | View repair tickets |
| `KARIGAR_MANAGE` | Manage karigar and job cards |
| `KARIGAR_VIEW` | View karigar and job cards |
| `CUSTOM_ORDER_MANAGE` | Create and manage custom orders |
| `CUSTOM_ORDER_VIEW` | View custom orders |
| `REPORTS_VIEW` | View reports and dashboards |
| `REPORTS_EXPORT` | Export reports (GSTR etc.) |
| `STAFF_MANAGE` | Manage staff accounts |
| `SETTINGS_MANAGE` | Update tenant profile and config |
| `NOTIFICATION_SEND` | Send SMS / push / WhatsApp messages |

---

## Modules

---

### 1. Auth

**Base path:** `/api/v1/auth`  
Public endpoints (no token required): `otp/send`, `otp/verify`, `token/refresh`, `pin/verify`

---

#### POST `/auth/otp/send`
Send OTP to a mobile number.

**Request body:**
```json
{
  "mobile": "9876543210",
  "tenantId": "tenant-uuid",
  "deviceFingerprint": "unique-device-id",
  "deviceName": "Redmi Note 12",
  "platform": "android"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `mobile` | string | Yes | 10-digit Indian mobile |
| `tenantId` | string | Yes | UUID of the shop/tenant |
| `deviceFingerprint` | string | Yes | Unique ID for this device |
| `deviceName` | string | No | Human-friendly device name |
| `platform` | string | No | `android` \| `ios` \| `web` |

**Response:**
```json
{
  "success": true,
  "data": { "message": "OTP sent successfully" }
}
```

---

#### POST `/auth/otp/verify`
Verify OTP and receive JWT tokens.

**Request body:**
```json
{
  "mobile": "9876543210",
  "tenantId": "tenant-uuid",
  "otp": "123456",
  "deviceFingerprint": "unique-device-id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "user": {
      "id": "user-uuid",
      "name": "Ramesh Kumar",
      "role": "MANAGER",
      "tenantId": "tenant-uuid"
    },
    "deviceStatus": "APPROVED"
  }
}
```

> If `deviceStatus` is `PENDING`, the user must wait for owner approval before accessing the app.

---

#### POST `/auth/token/refresh`
Refresh access token using refresh token.

**Request body:**
```json
{
  "refreshToken": "eyJ..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

---

#### POST `/auth/pin/set`
Set or update a 4–6 digit PIN. Requires valid JWT.

**Request body:**
```json
{
  "pin": "1234"
}
```

---

#### POST `/auth/pin/verify`
Login with PIN (faster than OTP for returning users).

**Request body:**
```json
{
  "pin": "1234",
  "deviceFingerprint": "unique-device-id"
}
```

**Response:** Same as `otp/verify`.

---

#### POST `/auth/logout`
Logout from the current device — deletes the session and invalidates the refresh token.  
**Auth:** JWT required

**Request body:**
```json
{
  "refreshToken": "eyJ..."
}
```

**Response:**
```json
{
  "success": true,
  "data": null
}
```

> After logout, discard both `accessToken` and `refreshToken` on the client. The access token stays valid until its 24h expiry (stateless JWT) — use short expiry + client-side discard pattern.

---

#### POST `/auth/logout/all`
Logout from **all devices** — deletes every active session for this user.  
**Auth:** JWT required

No request body needed.

**Response:**
```json
{
  "success": true,
  "data": null
}
```

---

#### GET `/auth/devices/pending`
List devices awaiting owner approval.  
**Permission:** `DEVICE_APPROVE`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "device-uuid",
      "deviceName": "Redmi Note 12",
      "platform": "android",
      "user": { "name": "Ramesh", "mobile": "9876543210" },
      "createdAt": "2026-06-01T10:00:00Z"
    }
  ]
}
```

---

#### POST `/auth/logout`
Logout from the current device — deletes the session and invalidates the refresh token.  
**Auth:** JWT required

**Request body:**
```json
{
  "refreshToken": "eyJ..."
}
```

**Response:**
```json
{
  "success": true,
  "data": null
}
```

> After logout, discard both `accessToken` and `refreshToken` on the client. The access token remains valid until its 24h expiry (stateless JWT), so do not rely on it being instantly blocked — use short expiry + logout-on-client pattern.

---

#### POST `/auth/logout/all`
Logout from **all devices** — deletes every session for this user.  
**Auth:** JWT required

No request body needed.

**Response:**
```json
{
  "success": true,
  "data": null
}
```

---

#### PATCH `/auth/devices/approve`
Approve or reject a device.  
**Permission:** `DEVICE_APPROVE`

**Request body:**
```json
{
  "deviceId": "device-uuid"
}
```

---

### 2. Customers

**Base path:** `/api/v1/customers`  
All endpoints require JWT.

---

#### POST `/customers`
Create a new customer.  
**Permission:** `CUSTOMER_CREATE`

**Request body:**
```json
{
  "name": "Priya Sharma",
  "mobile": "9876543210",
  "alternateMobile": "9123456789",
  "email": "priya@example.com",
  "dateOfBirth": "1990-05-15",
  "gender": "FEMALE",
  "address": "123 MG Road",
  "city": "Pune",
  "state": "Maharashtra",
  "pincode": "411001",
  "aadhaarNumber": "1234-5678-9012",
  "panNumber": "ABCDE1234F"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | Yes | Full name |
| `mobile` | string | Yes | Must be unique per tenant |
| `alternateMobile` | string | No | |
| `email` | string | No | |
| `dateOfBirth` | string | No | ISO date `YYYY-MM-DD` |
| `gender` | string | No | `MALE` \| `FEMALE` \| `OTHER` |
| `address` | string | No | |
| `city` | string | No | |
| `state` | string | No | |
| `pincode` | string | No | |
| `aadhaarNumber` | string | No | **Mandatory** for loans > ₹50,000 |
| `panNumber` | string | No | **Mandatory** for loans > ₹50,000 |

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "cust-uuid",
    "customerId": "MLJ-C-00042",
    "name": "Priya Sharma",
    "mobile": "9876543210",
    "qrCode": "data:image/png;base64,...",
    "kycStatus": "PENDING",
    "createdAt": "2026-06-01T10:00:00Z"
  }
}
```

---

#### GET `/customers`
List customers with optional filters.  
**Permission:** `CUSTOMER_VIEW`

**Query params:**

| Param | Type | Notes |
|---|---|---|
| `search` | string | Search by name or mobile |
| `mobile` | string | Exact mobile match |
| `kycStatus` | string | `PENDING` \| `VERIFIED` \| `REJECTED` |
| `page` | number | Default: 1 |
| `limit` | number | Default: 20 |

---

#### GET `/customers/qr/:qrCode`
Find a customer by QR code scan.  
**Permission:** `CUSTOMER_VIEW`

---

#### GET `/customers/:id`
Get full customer profile.  
**Permission:** `CUSTOMER_VIEW`

---

#### PATCH `/customers/:id`
Update customer details.  
**Permission:** `CUSTOMER_UPDATE`

Request body: any subset of the `CreateCustomerDto` fields (all optional).

---

#### PATCH `/customers/:id/kyc/:status`
Update KYC verification status.  
**Permission:** `CUSTOMER_UPDATE`

`:status` must be `VERIFIED` or `REJECTED`.

---

#### DELETE `/customers/:id`
Soft-delete a customer.  
**Permission:** `CUSTOMER_UPDATE`

---

### 3. Girvi (Gold Loans)

**Base path:** `/api/v1/girvi`  
All endpoints require JWT.

---

#### POST `/girvi`
Create a new gold loan.  
**Permission:** `GIRVI_CREATE`

**Request body:**
```json
{
  "customerId": "cust-uuid",
  "branchId": "branch-uuid",
  "interestType": "SIMPLE",
  "interestRate": 1.5,
  "tenureMonths": 12,
  "notes": "First time customer",
  "items": [
    {
      "itemName": "Gold Bangles",
      "metalType": "GOLD",
      "purity": "22K",
      "grossWeight": 25.5,
      "netWeight": 23.0,
      "stoneWeight": 2.5,
      "description": "2 bangles, hallmarked",
      "photoUrls": ["https://s3.../photo1.jpg"]
    }
  ]
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `customerId` | string | Yes | |
| `branchId` | string | No | Defaults to main branch |
| `interestType` | string | Yes | `SIMPLE` \| `KATMITI` |
| `interestRate` | number | Yes | Monthly % rate |
| `tenureMonths` | number | Yes | Max 12 (RBI 2026) |
| `notes` | string | No | |
| `items` | array | Yes | At least one item |
| `items[].itemName` | string | Yes | |
| `items[].metalType` | string | Yes | `GOLD` \| `SILVER` |
| `items[].purity` | string | Yes | `22K`, `18K`, `14K`, `925`, `999` |
| `items[].grossWeight` | number | Yes | In grams |
| `items[].netWeight` | number | Yes | In grams (gross minus stone) |
| `items[].stoneWeight` | number | No | In grams |
| `items[].description` | string | No | |
| `items[].photoUrls` | string[] | No | S3 signed URLs |

**Response includes:**
- `girviNumber` — e.g., `MLJ-G-2026-00123`
- `principalAmount` — calculated from LTV and fine gold value
- `mcxRateLocked` — rate per gram at time of creation (immutable)
- `ltvPercent` — LTV tier applied
- `status` — `CREATED`

---

#### GET `/girvi`
List girvis with filters.  
**Permission:** `GIRVI_VIEW`

**Query params:**

| Param | Type | Notes |
|---|---|---|
| `status` | string | `CREATED` \| `ACTIVE` \| `PARTIAL_PAID` \| `OVERDUE` \| `REDEEMED` \| `AUCTIONED` |
| `customerId` | string | |
| `search` | string | Search by girvi number or customer name |
| `page` | number | |
| `limit` | number | |

---

#### GET `/girvi/overdue`
List all overdue girvis.  
**Permission:** `GIRVI_VIEW`

---

#### GET `/girvi/:id`
Get full girvi details including items and payment history.  
**Permission:** `GIRVI_VIEW`

---

#### GET `/girvi/:id/interest`
Get interest breakdown (accrued, paid, pending).  
**Permission:** `GIRVI_VIEW`

---

#### POST `/girvi/:id/kfs/generate`
Generate KFS (Key Fact Statement) PDF in English + Marathi.  
**Permission:** `GIRVI_UPDATE`

**Response:**
```json
{
  "success": true,
  "data": { "kfsId": "kfs-uuid", "status": "GENERATED" }
}
```

---

#### GET `/girvi/:id/kfs/download`
Get signed S3 URL to download KFS PDF.  
**Permission:** `GIRVI_VIEW`

---

#### POST `/girvi/kfs/acknowledge`
Customer acknowledges KFS. Required before disbursement.  
**Permission:** `GIRVI_UPDATE`

**Request body:**
```json
{
  "girviId": "girvi-uuid",
  "acknowledgment": "Customer has acknowledged the KFS document"
}
```

---

#### PATCH `/girvi/:id/disburse`
Mark loan as disbursed (unlocks after KFS acknowledgment).  
**Permission:** `GIRVI_UPDATE`

> This endpoint is **blocked** until KFS is acknowledged.

---

#### POST `/girvi/:id/payment`
Record a payment (partial or full).  
**Permission:** `GIRVI_UPDATE`

**Request body:**
```json
{
  "principalPaid": 5000.00,
  "interestPaid": 750.00,
  "penaltyPaid": 0.00,
  "paymentMode": "CASH",
  "notes": "Part payment"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `principalPaid` | number | Yes | Can be 0 |
| `interestPaid` | number | Yes | Can be 0 |
| `penaltyPaid` | number | Yes | Can be 0 |
| `paymentMode` | string | Yes | `CASH` \| `UPI` \| `CARD` \| `CHEQUE` \| `NEFT` |
| `notes` | string | No | |

---

#### GET `/girvi/payments/:paymentId/receipt`
Get signed S3 URL for payment receipt PDF.  
**Permission:** `GIRVI_VIEW`

---

#### PATCH `/girvi/:id/redeem`
Redeem (close) a girvi. Vault auto-releases the slot.  
**Permission:** `GIRVI_CLOSE`

---

#### PATCH `/girvi/:id/renew`
Renew girvi at current MCX rate.  
**Permission:** `GIRVI_UPDATE`

---

#### GET `/girvi/:id/valuation-certificate`
Generate RBI 2026 compliant tamper-proof valuation certificate PDF.  
**Permission:** `GIRVI_VIEW`

---

### 4. Interest

> Interest is calculated automatically by the system. Configuration is managed under [Settings](#33-settings).

**Interest types:**
- `SIMPLE`: `Principal × Rate × Days / 365`
- `KATMITI`: Compound — partial payment resets principal base. Days 1–15 billed as full month.

Interest configuration fields (via `PUT /settings/interest`):
- `defaultInterestRate` — monthly %
- `defaultInterestType` — `SIMPLE` | `KATMITI`
- `overdueInterestRate` — penalty rate
- `billingThresholdDays` — default 15 (days 1–15 = full month)

---

### 5. Vault

**Base path:** `/api/v1/vault`  
All endpoints require JWT.

Vault hierarchy: **Vault → Safe → Tray → Slot**

Slot assignment is **mandatory** before Girvi finalisation. Redemption auto-releases the slot.

---

#### POST `/vault/vaults`
Create a vault.  
**Permission:** `SETTINGS_MANAGE`

**Request body:**
```json
{
  "name": "Main Vault",
  "location": "Ground floor, back room",
  "branchId": "branch-uuid"
}
```

---

#### GET `/vault/vaults`
List all vaults with full hierarchy (safes → trays → slots).  
**Permission:** `GIRVI_VIEW`

---

#### GET `/vault/vaults/:id`
Get a single vault with its complete safe/tray/slot tree.  
**Permission:** `GIRVI_VIEW`

---

#### POST `/vault/safes`
Add a safe inside a vault.  
**Permission:** `SETTINGS_MANAGE`

**Request body:**
```json
{
  "vaultId": "vault-uuid",
  "name": "Safe A"
}
```

---

#### POST `/vault/trays`
Add a tray inside a safe.  
**Permission:** `SETTINGS_MANAGE`

**Request body:**
```json
{
  "safeId": "safe-uuid",
  "name": "Tray 1"
}
```

---

#### POST `/vault/slots`
Bulk create slots in a tray.  
**Permission:** `SETTINGS_MANAGE`

**Request body:**
```json
{
  "trayId": "tray-uuid",
  "count": 10,
  "prefix": "S"
}
```

Creates slots numbered `S1`, `S2` … `S10` (or `1`–`10` if no prefix).

**Response:**
```json
{
  "success": true,
  "data": { "created": 10 }
}
```

---

#### GET `/vault/slots?trayId=:trayId`
List all slots in a tray with current occupancy status.  
**Permission:** `GIRVI_VIEW`

**Query params:**

| Param | Type | Required |
|---|---|---|
| `trayId` | string | Yes |

---

#### GET `/vault/slots/available`
Find available (unoccupied) slots across the vault.  
**Permission:** `GIRVI_VIEW`

**Query params:**

| Param | Type | Notes |
|---|---|---|
| `vaultId` | string | Optional — filter by vault |

---

#### GET `/vault/occupancy`
Vault occupancy summary.  
**Permission:** `GIRVI_VIEW`

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 200,
    "occupied": 142,
    "available": 58,
    "occupancyPercent": 71.0
  }
}
```

---

#### POST `/vault/assign`
Assign an available slot to a girvi.  
**Permission:** `GIRVI_UPDATE`

**Request body:**
```json
{
  "girviId": "girvi-uuid",
  "slotId": "slot-uuid"
}
```

> Returns `409 Conflict` if slot is already occupied.

---

#### POST `/vault/release/:girviId`
Release the vault slot assigned to a girvi (called automatically on redemption).  
**Permission:** `GIRVI_UPDATE`

---

#### GET `/vault/assignment/:girviId`
Get the current active vault assignment for a girvi.  
**Permission:** `GIRVI_VIEW`

**Response includes:** slot number, tray name, safe name, vault name.

---

#### GET `/vault/search?girviId=:girviId`
Search vault by girvi ID — returns location + customer details.  
**Permission:** `GIRVI_VIEW`

**Query params:**

| Param | Type | Required |
|---|---|---|
| `girviId` | string | Yes |

---

### 6. Compliance

**Base path:** `/api/v1/compliance`  
All endpoints require JWT + `REPORTS_VIEW` (except Section 25 notice which needs `GIRVI_UPDATE`).

Maharashtra statutory forms — all PDF exports.

---

#### GET `/compliance/form6`
Form 6 — Daily Cash Book.

**Query params:**

| Param | Type | Required | Notes |
|---|---|---|---|
| `date` | string | Yes | `YYYY-MM-DD` |

---

#### GET `/compliance/form9`
Form 9 — Debtor Ledger for a customer.

**Query params:**

| Param | Type | Required |
|---|---|---|
| `customerId` | string | Yes |

---

#### GET `/compliance/form11`
Form 11 — Repayment Receipt.

**Query params:**

| Param | Type | Required |
|---|---|---|
| `paymentId` | string | Yes |

---

#### GET `/compliance/form12`
Form 12 — Receipt to Debtor (KFS receipt).

**Query params:**

| Param | Type | Required |
|---|---|---|
| `girviId` | string | Yes |

---

#### GET `/compliance/form13`
Form 13 — Annual Capital Account.

**Query params:**

| Param | Type | Required |
|---|---|---|
| `year` | number | Yes | e.g., `2026` |

---

#### POST `/compliance/section25/notice`
Generate Section 25(1) auction notice (14-day notice PDF).  
**Permission:** `GIRVI_UPDATE`

**Request body:**
```json
{
  "girviId": "girvi-uuid"
}
```

---

#### GET `/compliance/section25/statement`
Section 25(1) Statement for a date range.

**Query params:**

| Param | Type | Required |
|---|---|---|
| `from` | string | Yes | `YYYY-MM-DD` |
| `to` | string | Yes | `YYYY-MM-DD` |

---

### 7. Inventory

**Base path:** `/api/v1/inventory`  
All endpoints require JWT.

---

#### POST `/inventory/categories`
Create item category.  
**Permission:** `INVENTORY_MANAGE`

**Request body:**
```json
{
  "name": "Gold Bangles",
  "hsnCode": "7113",
  "metalType": "GOLD",
  "gstRate": 3
}
```

---

#### GET `/inventory/categories`
List all categories.  
**Permission:** `INVENTORY_VIEW`

---

#### POST `/inventory`
Add inventory item.  
**Permission:** `INVENTORY_MANAGE`

**Request body:**
```json
{
  "categoryId": "cat-uuid",
  "branchId": "branch-uuid",
  "name": "Gold Ring 22K",
  "metalType": "GOLD",
  "purity": "22K",
  "grossWeight": 5.5,
  "netWeight": 5.2,
  "stoneWeight": 0.3,
  "makingCharges": 500,
  "wastage": 2.5,
  "huId": "HUID123456",
  "bisNumber": "BIS789",
  "photoUrls": ["https://s3.../photo.jpg"],
  "purchaseCost": 28000,
  "quantity": 1,
  "reorderLevel": 1,
  "notes": "Hallmarked 22K gold ring"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `categoryId` | string | Yes | |
| `branchId` | string | No | |
| `name` | string | Yes | |
| `metalType` | string | Yes | `GOLD` \| `SILVER` \| `DIAMOND` \| `GEMSTONE` |
| `purity` | string | Yes | `22K`, `18K`, `14K`, `925`, `999` |
| `grossWeight` | number | Yes | Grams |
| `netWeight` | number | Yes | Grams |
| `stoneWeight` | number | No | Grams |
| `makingCharges` | number | No | ₹ |
| `wastage` | number | No | % |
| `huId` | string | No | BIS HUID for hallmark |
| `bisNumber` | string | No | |
| `photoUrls` | string[] | No | |
| `purchaseCost` | number | No | ₹ |
| `quantity` | number | No | Default 1 |
| `reorderLevel` | number | No | Alert threshold |
| `notes` | string | No | |

---

#### GET `/inventory`
List inventory with filters.  
**Permission:** `INVENTORY_VIEW`

**Query params:**

| Param | Type | Notes |
|---|---|---|
| `search` | string | Search by name or SKU |
| `metalType` | string | `GOLD` \| `SILVER` \| `DIAMOND` \| `GEMSTONE` |
| `categoryId` | string | |
| `purity` | string | `22K`, `18K`, etc. |
| `lowStock` | boolean | `true` to show below reorder level |
| `page` | number | |
| `limit` | number | |

---

#### GET `/inventory/low-stock`
Get all items below reorder level.  
**Permission:** `INVENTORY_VIEW`

---

#### GET `/inventory/sku/:sku`
Lookup item by SKU (barcode scan).  
**Permission:** `INVENTORY_VIEW`

---

#### GET `/inventory/:id`
Get item with full adjustment history.  
**Permission:** `INVENTORY_VIEW`

---

#### PATCH `/inventory/:id`
Update item details.  
**Permission:** `INVENTORY_MANAGE`

---

#### POST `/inventory/:id/adjust-stock`
Adjust stock quantity with reason.  
**Permission:** `INVENTORY_MANAGE`

**Request body:**
```json
{
  "quantityChange": -1,
  "reason": "Damaged item removed"
}
```

> `quantityChange` can be negative. Creates an audit log entry.

---

#### POST `/inventory/revalue`
Revalue all items at current metal rate.  
**Permission:** `INVENTORY_MANAGE`

**Request body:**
```json
{
  "goldRatePerGram": 7200
}
```

---

#### DELETE `/inventory/:id`
Soft-delete an inventory item.  
**Permission:** `INVENTORY_MANAGE`

---

### 8. Sales

**Base path:** `/api/v1/sales`  
All endpoints require JWT.

---

#### POST `/sales`
Create a sale (billing).  
**Permission:** `SALES_CREATE`

**Request body:**
```json
{
  "customerId": "cust-uuid",
  "branchId": "branch-uuid",
  "items": [
    {
      "inventoryItemId": "item-uuid",
      "quantity": 1,
      "unitPrice": 28000,
      "makingCharges": 500,
      "stoneCharges": 200,
      "wastageAmount": 100
    }
  ],
  "discountAmount": 500,
  "paymentMode": "UPI",
  "notes": "Festival sale"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `customerId` | string | No | Walk-in sale allowed |
| `branchId` | string | No | |
| `items` | array | Yes | At least one item |
| `items[].inventoryItemId` | string | Yes | |
| `items[].quantity` | number | Yes | |
| `items[].unitPrice` | number | Yes | ₹ |
| `items[].makingCharges` | number | No | ₹ |
| `items[].stoneCharges` | number | No | ₹ |
| `items[].wastageAmount` | number | No | ₹ |
| `discountAmount` | number | No | ₹ |
| `paymentMode` | string | Yes | `CASH` \| `UPI` \| `CARD` \| `CHEQUE` \| `NEFT` |
| `notes` | string | No | |

**Response includes:**
- `invoiceNumber` — e.g., `MLJ-INV-2026-00456`
- `totalAmount` — with GST breakdown (3% gold, 18% diamond)
- `gstAmount`
- `receiptUrl` — signed S3 URL for PDF receipt

---

#### GET `/sales`
List sales.  
**Permission:** `SALES_VIEW`

**Query params:**

| Param | Type | Notes |
|---|---|---|
| `customerId` | string | |
| `from` | string | `YYYY-MM-DD` |
| `to` | string | `YYYY-MM-DD` |
| `search` | string | Invoice number or customer name |
| `page` | number | |
| `limit` | number | |

---

#### GET `/sales/:id`
Get sale with full item breakdown and GST.  
**Permission:** `SALES_VIEW`

---

#### GET `/sales/gstr1`
Export GSTR-1 data (all B2C and B2B invoices).  
**Permission:** `REPORTS_EXPORT`

**Query params:**

| Param | Type | Required |
|---|---|---|
| `year` | number | Yes |
| `month` | number | Yes | 1–12 |

---

#### GET `/sales/gstr3b`
Export GSTR-3B summary data.  
**Permission:** `REPORTS_EXPORT`

**Query params:** same as `/sales/gstr1`

---

### 9. Purchase & Vendors

**Base path:** `/api/v1/purchase`  
All endpoints require JWT.

---

#### POST `/purchase/vendors`
Create vendor master.  
**Permission:** `INVENTORY_MANAGE`

**Request body:**
```json
{
  "name": "Rajesh Bullion",
  "contactName": "Rajesh Shah",
  "mobile": "9876543210",
  "email": "rajesh@bullion.com",
  "gstin": "27ABCDE1234F1Z5",
  "address": "Zaveri Bazaar, Mumbai",
  "bankAccount": "1234567890",
  "bankIfsc": "HDFC0001234"
}
```

---

#### GET `/purchase/vendors`
List vendors.  
**Permission:** `INVENTORY_VIEW`

---

#### GET `/purchase/vendors/:id`
Get vendor with payment history.  
**Permission:** `INVENTORY_VIEW`

---

#### POST `/purchase/orders`
Create Purchase Order.  
**Permission:** `INVENTORY_MANAGE`

**Request body:**
```json
{
  "vendorId": "vendor-uuid",
  "branchId": "branch-uuid",
  "items": [
    {
      "description": "22K Gold Bars",
      "metalType": "GOLD",
      "purity": "22K",
      "estimatedWeight": 100,
      "quantity": 2,
      "unitPrice": 720000
    }
  ],
  "expectedDate": "2026-07-15",
  "notes": "For Diwali stock"
}
```

---

#### GET `/purchase/orders`
List purchase orders.  
**Permission:** `INVENTORY_VIEW`

**Query params:**

| Param | Type | Notes |
|---|---|---|
| `vendorId` | string | |
| `status` | string | `DRAFT` \| `APPROVED` \| `SENT` \| `RECEIVED` \| `CANCELLED` |
| `page` | number | |
| `limit` | number | |

---

#### GET `/purchase/orders/:id`
Get PO with all GRNs.  
**Permission:** `INVENTORY_VIEW`

---

#### PATCH `/purchase/orders/:id/approve`
Approve PO (moves to APPROVED status).  
**Permission:** `INVENTORY_MANAGE`

---

#### POST `/purchase/grn`
Create Goods Receipt Note (actual vs. PO).  
**Permission:** `INVENTORY_MANAGE`

**Request body:**
```json
{
  "purchaseOrderId": "po-uuid",
  "items": [
    {
      "description": "22K Gold Bars",
      "metalType": "GOLD",
      "purity": "22K",
      "grossWeight": 99.5,
      "netWeight": 99.2,
      "quantity": 2,
      "unitPrice": 720000
    }
  ],
  "notes": "Minor weight variance"
}
```

---

#### GET `/purchase/orders/:poId/grn`
List all GRNs for a PO.  
**Permission:** `INVENTORY_VIEW`

---

### 10. Karigar

**Base path:** `/api/v1/karigar`  
All endpoints require JWT.

---

#### POST `/karigar`
Register a karigar (craftsman).  
**Permission:** `KARIGAR_MANAGE`

**Request body:**
```json
{
  "name": "Suresh Soni",
  "mobile": "9876543210",
  "specialization": "Filigree work",
  "ratePerGram": 150,
  "ratePerPiece": null,
  "aadhaarNumber": "1234-5678-9012",
  "address": "Sitabuldi, Nagpur"
}
```

---

#### GET `/karigar`
List karigars.  
**Permission:** `KARIGAR_VIEW`

**Query params:** `search`, `page`, `limit`

---

#### GET `/karigar/:id`
Get karigar details.  
**Permission:** `KARIGAR_VIEW`

---

#### GET `/karigar/:id/ledger`
Get karigar payment ledger and outstanding balance.  
**Permission:** `KARIGAR_VIEW`

---

#### POST `/karigar/jobs`
Create a job card.  
**Permission:** `KARIGAR_MANAGE`

**Request body:**
```json
{
  "karigarId": "karigar-uuid",
  "customOrderId": "order-uuid",
  "description": "Gold filigree necklace",
  "designPhotoUrls": ["https://s3.../design.jpg"],
  "metalType": "GOLD",
  "purity": "22K",
  "expectedDate": "2026-07-30",
  "notes": "Customer sample attached"
}
```

---

#### GET `/karigar/jobs/list`
List job cards.  
**Permission:** `KARIGAR_VIEW`

**Query params:** `karigarId`, `status` (`OPEN` \| `IN_PROGRESS` \| `COMPLETED`), `page`, `limit`

---

#### GET `/karigar/jobs/:id`
Get job card details.  
**Permission:** `KARIGAR_VIEW`

---

#### POST `/karigar/jobs/:id/issue-material`
Issue raw material to karigar.  
**Permission:** `KARIGAR_MANAGE`

**Request body:**
```json
{
  "metalType": "GOLD",
  "purity": "22K",
  "grossWeight": 10.0,
  "netWeight": 9.8,
  "notes": "22K gold for necklace"
}
```

---

#### POST `/karigar/jobs/:id/receive-material`
Receive finished item from karigar.  
**Permission:** `KARIGAR_MANAGE`

**Request body:**
```json
{
  "metalType": "GOLD",
  "purity": "22K",
  "grossWeight": 9.2,
  "netWeight": 9.0,
  "notes": "Slight wastage noted"
}
```

> Wastage % auto-calculated: `(issued - received) / issued × 100`

---

#### PUT `/karigar/jobs/:id/complete`
Mark job as complete and set making charge.  
**Permission:** `KARIGAR_MANAGE`

**Request body:**
```json
{
  "makingCharge": 1500
}
```

---

#### POST `/karigar/jobs/:id/payments`
Record payment to karigar.  
**Permission:** `KARIGAR_MANAGE`

**Request body:**
```json
{
  "amount": 1500,
  "paymentMode": "CASH",
  "notes": "Final payment"
}
```

---

### 11. Savings Schemes

**Base path:** `/api/v1/savings`  
All endpoints require JWT.

---

#### POST `/savings`
Enroll customer in a savings/chit scheme.  
**Permission:** `SALES_CREATE`

**Request body:**
```json
{
  "customerId": "cust-uuid",
  "schemeName": "Gold Savings 12-Month",
  "amount": 5000,
  "tenure": 12
}
```

---

#### GET `/savings`
List schemes.  
**Permission:** `SALES_VIEW`

**Query params:** `customerId`, `status`, `page`, `limit`

---

#### GET `/savings/defaulters`
List schemes with missed monthly collections.  
**Permission:** `SALES_VIEW`

---

#### GET `/savings/:id`
Get scheme with collection history.  
**Permission:** `SALES_VIEW`

---

#### GET `/savings/:id/statement`
Get scheme statement.  
**Permission:** `SALES_VIEW`

---

#### POST `/savings/:id/collections`
Record a monthly collection.  
**Permission:** `SALES_CREATE`

**Request body:**
```json
{
  "amount": 5000,
  "paymentMode": "CASH"
}
```

---

### 12. Repairs

**Base path:** `/api/v1/repairs`  
All endpoints require JWT.

---

#### POST `/repairs`
Create repair ticket.  
**Permission:** `REPAIR_MANAGE`

**Request body:**
```json
{
  "customerId": "cust-uuid",
  "itemDescription": "Gold chain with broken clasp",
  "itemPhotoUrls": ["https://s3.../photo.jpg"],
  "damageDescription": "Clasp broken, needs replacement",
  "estimatedCost": 300,
  "promisedDate": "2026-07-05",
  "notes": "Customer waiting"
}
```

---

#### GET `/repairs`
List repairs.  
**Permission:** `REPAIR_VIEW`

**Query params:** `customerId`, `status`, `search`, `page`, `limit`

**Status values:** `RECEIVED` \| `DIAGNOSED` \| `IN_PROGRESS` \| `READY` \| `DELIVERED`

---

#### GET `/repairs/analytics`
Repair analytics (count by status, avg turnaround).  
**Permission:** `REPAIR_VIEW`

---

#### GET `/repairs/:id`
Get repair ticket.  
**Permission:** `REPAIR_VIEW`

---

#### PUT `/repairs/:id/status`
Update repair status (triggers auto-SMS to customer).  
**Permission:** `REPAIR_MANAGE`

**Request body:**
```json
{
  "status": "READY",
  "finalCost": 350,
  "deliverySignatureUrl": null,
  "notes": "Clasp replaced, polished"
}
```

---

### 13. Custom Orders

**Base path:** `/api/v1/custom-orders`  
All endpoints require JWT.

---

#### POST `/custom-orders`
Create a custom jewellery order.  
**Permission:** `CUSTOM_ORDER_MANAGE`

**Request body:**
```json
{
  "customerId": "cust-uuid",
  "description": "Custom gold necklace with peacock design",
  "designPhotoUrls": ["https://s3.../design.jpg"],
  "metalType": "GOLD",
  "purity": "22K",
  "estimatedWeight": 15.0,
  "makingCharges": 3000,
  "estimatedAmount": 112000,
  "promisedDate": "2026-08-15",
  "notes": "For wedding"
}
```

---

#### GET `/custom-orders`
List custom orders.  
**Permission:** `CUSTOM_ORDER_VIEW`

**Query params:** `customerId`, `status`, `page`, `limit`

---

#### GET `/custom-orders/delayed`
List orders past their promised date.  
**Permission:** `CUSTOM_ORDER_VIEW`

---

#### GET `/custom-orders/:id`
Get order details.  
**Permission:** `CUSTOM_ORDER_VIEW`

---

#### GET `/custom-orders/:id/profit`
Get profit report for this order.  
**Permission:** `CUSTOM_ORDER_VIEW`

---

#### PUT `/custom-orders/:id`
Update order status or final amount.  
**Permission:** `CUSTOM_ORDER_MANAGE`

**Request body:**
```json
{
  "status": "COMPLETED",
  "finalAmount": 115000,
  "notes": "Extra polishing done"
}
```

---

#### POST `/custom-orders/:id/payments`
Record a milestone payment.  
**Permission:** `CUSTOM_ORDER_MANAGE`

**Request body:**
```json
{
  "milestone": "ADVANCE",
  "amount": 30000,
  "paymentMode": "UPI"
}
```

| `milestone` | Meaning |
|---|---|
| `ADVANCE` | Initial deposit |
| `MIDWAY` | Mid-production payment |
| `FINAL` | Balance on delivery |

---

### 14. Diamond & Gemstones

**Base path:** `/api/v1/diamond`  
All endpoints require JWT.

---

#### POST `/diamond/certificates`
Register a diamond GIA certificate.  
**Permission:** `INVENTORY_MANAGE`

**Request body:**
```json
{
  "inventoryItemId": "item-uuid",
  "certNumber": "GIA-2025-12345678",
  "lab": "GIA",
  "shape": "ROUND",
  "caratWeight": 0.75,
  "color": "F",
  "clarity": "VS1",
  "cut": "EXCELLENT",
  "polish": "EXCELLENT",
  "symmetry": "EXCELLENT",
  "fluorescence": "NONE",
  "rapPrice": 8500,
  "certUrl": "https://s3.../cert.pdf",
  "expiresAt": "2028-06-01"
}
```

---

#### GET `/diamond/certificates`
List certificates.  
**Permission:** `INVENTORY_VIEW`

**Query params:** `inventoryItemId`, `lab`, `color`, `clarity`, `page`, `limit`

---

#### GET `/diamond/certificates/lookup/:certNumber`
Lookup by certificate number.  
**Permission:** `INVENTORY_VIEW`

---

#### GET `/diamond/certificates/:id/valuation`
Get Rapaport valuation (price/ct × weight).  
**Permission:** `INVENTORY_VIEW`

---

### 15. Expenses

**Base path:** `/api/v1/expenses`  
All endpoints require JWT.

---

#### POST `/expenses/categories`
Create expense category.  
**Permission:** `EXPENSE_APPROVE`

**Request body:**
```json
{
  "name": "Electricity"
}
```

---

#### GET `/expenses/categories`
List categories.  
**Permission:** `EXPENSE_VIEW`

---

#### POST `/expenses`
Submit an expense.  
**Permission:** `EXPENSE_SUBMIT`

**Request body:**
```json
{
  "categoryId": "cat-uuid",
  "title": "June Electricity Bill",
  "amount": 4500,
  "paymentMode": "NEFT",
  "expenseDate": "2026-06-28",
  "billUrl": "https://s3.../bill.pdf",
  "notes": "MSEDCL June 2026",
  "isRecurring": true,
  "recurringDay": 28
}
```

---

#### GET `/expenses`
List expenses.  
**Permission:** `EXPENSE_VIEW`

**Query params:** `categoryId`, `status` (`PENDING` \| `APPROVED` \| `REJECTED`), `fromDate`, `toDate`, `page`, `limit`

---

#### GET `/expenses/summary`
Expense summary grouped by category.  
**Permission:** `EXPENSE_VIEW`

**Query params:** `fromDate`, `toDate`

---

#### GET `/expenses/:id`
Get expense by ID.  
**Permission:** `EXPENSE_VIEW`

---

#### PUT `/expenses/:id/approve`
Approve an expense.  
**Permission:** `EXPENSE_APPROVE`

---

#### PUT `/expenses/:id/reject`
Reject an expense.  
**Permission:** `EXPENSE_APPROVE`

**Request body:**
```json
{
  "rejectedReason": "Duplicate submission"
}
```

---

### 16. Gold Rates

**Base path:** `/api/v1/gold-rates`  
All endpoints require JWT.

---

#### GET `/gold-rates/current`
Get current metal rate (cached 5 min from MCX).  
**Permission:** `INVENTORY_VIEW`

**Query params:**

| Param | Type | Notes |
|---|---|---|
| `metalType` | string | `GOLD` \| `SILVER` |
| `purity` | string | `22K`, `18K`, `14K`, `925`, `999` |

**Response:**
```json
{
  "success": true,
  "data": {
    "metalType": "GOLD",
    "purity": "22K",
    "ratePerGram": 7250.50,
    "ratePerTenGrams": 72505.00,
    "source": "MCX",
    "asOf": "2026-06-28T10:00:00Z"
  }
}
```

---

#### GET `/gold-rates/history`
Rate history for charting.  
**Permission:** `INVENTORY_VIEW`

**Query params:** `metalType`, `purity`, `days` (default 30)

---

#### POST `/gold-rates/manual`
Override rate manually (when MCX is unavailable).  
**Permission:** `SETTINGS_MANAGE`

**Request body:**
```json
{
  "metalType": "GOLD",
  "purity": "22K",
  "ratePerGram": 7200
}
```

---

#### POST `/gold-rates/check-thresholds`
Check if current rate has breached alert thresholds.  
**Permission:** `INVENTORY_VIEW`

**Request body:**
```json
{
  "thresholds": [
    { "metalType": "GOLD", "purity": "22K", "threshold": 7000 }
  ]
}
```

---

### 17. Barcode

**Base path:** `/api/v1/barcode`  
All endpoints require JWT.

---

#### POST `/barcode/generate`
Generate barcode or QR code for an item.  
**Permission:** `INVENTORY_MANAGE`

**Request body:**
```json
{
  "inventoryItemId": "item-uuid",
  "barcodeType": "QR",
  "copies": 3
}
```

| `barcodeType` | Notes |
|---|---|
| `CODE128` | Standard barcode |
| `QR` | QR code (recommended for mobile scan) |

**Response:**
```json
{
  "success": true,
  "data": {
    "sku": "MLJ-SKU-00123",
    "barcodeUrl": "https://s3.../barcode.png",
    "printedAt": "2026-06-28T10:00:00Z"
  }
}
```

---

#### GET `/barcode/lookup/:sku`
Look up item by SKU from barcode scan.  
**Permission:** `INVENTORY_VIEW`

---

#### GET `/barcode/history`
Barcode print history.  
**Permission:** `INVENTORY_VIEW`

**Query params:** `inventoryItemId`, `page`, `limit`

---

### 18. Branches

**Base path:** `/api/v1/branches`  
All endpoints require JWT.

---

#### POST `/branches`
Create a branch.  
**Permission:** `SETTINGS_MANAGE`

**Request body:**
```json
{
  "name": "Nagpur Branch",
  "code": "NGP",
  "gstin": "27ABCDE1234F2Z6",
  "phone": "0712-2222222",
  "address": "Sitabuldi, Nagpur",
  "city": "Nagpur"
}
```

---

#### GET `/branches`
List branches.  
**Permission:** `INVENTORY_VIEW`

---

#### GET `/branches/consolidated-pl`
Consolidated Profit & Loss across all branches.  
**Permission:** `REPORTS_VIEW`

**Query params:** `fromDate`, `toDate`

---

#### GET `/branches/:id`
Get branch details.  
**Permission:** `INVENTORY_VIEW`

---

#### PUT `/branches/:id`
Update branch.  
**Permission:** `SETTINGS_MANAGE`

---

#### DELETE `/branches/:id`
Deactivate branch (soft delete).  
**Permission:** `SETTINGS_MANAGE`

---

#### POST `/branches/transfer`
Transfer inventory between branches.  
**Permission:** `INVENTORY_MANAGE`

**Request body:**
```json
{
  "inventoryItemId": "item-uuid",
  "fromBranchId": "branch-a-uuid",
  "toBranchId": "branch-b-uuid",
  "notes": "Festive season transfer"
}
```

---

### 19. Staff

**Base path:** `/api/v1/staff`  
All endpoints require JWT.

---

#### POST `/staff`
Create staff account.  
**Permission:** `STAFF_MANAGE`

**Request body:**
```json
{
  "name": "Ramesh Kumar",
  "mobile": "9876543210",
  "role": "MANAGER",
  "branchId": "branch-uuid"
}
```

| `role` | Permissions |
|---|---|
| `OWNER` | All permissions |
| `MANAGER` | Most permissions except owner-only |
| `ACCOUNTANT` | Finance, reports |
| `STAFF` | Basic operations |
| `VIEWER` | Read only |

---

#### GET `/staff`
List staff.  
**Permission:** `STAFF_MANAGE`

**Query params:** `role`, `branchId`, `search`, `page`, `limit`

---

#### GET `/staff/devices/pending`
List pending device approvals across all staff.  
**Permission:** `DEVICE_APPROVE`

---

#### GET `/staff/:id`
Get staff with registered devices.  
**Permission:** `STAFF_MANAGE`

---

#### PUT `/staff/:id`
Update staff.  
**Permission:** `STAFF_MANAGE`

---

#### DELETE `/staff/:id`
Deactivate staff account.  
**Permission:** `STAFF_MANAGE`

---

#### PUT `/staff/devices/:deviceId/approve`
Approve a device registration.  
**Permission:** `DEVICE_APPROVE`

---

### 20. Dashboard

**Base path:** `/api/v1/dashboard`  
All endpoints require JWT. Responses are cached.

---

#### GET `/dashboard/summary`
All KPIs in one call (cached 2 minutes).  
**Permission:** `REPORTS_VIEW`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalActiveLoans": 142,
    "totalLoanAmount": 8500000,
    "overdueLoans": 12,
    "todaySales": 125000,
    "todayCollections": 45000,
    "lowStockItems": 3,
    "pendingRepairs": 8,
    "goldRatePerGram": 7250
  }
}
```

---

#### GET `/dashboard/sales-trend`
Daily sales trend for last 30 days (cached 5 minutes).  
**Permission:** `REPORTS_VIEW`

---

#### GET `/dashboard/girvi-portfolio`
Loan portfolio breakdown by status.  
**Permission:** `GIRVI_VIEW`

---

#### GET `/dashboard/top-karigars`
Top 10 karigars by jobs completed and charges.  
**Permission:** `KARIGAR_VIEW`

---

### 21. Reports

**Base path:** `/api/v1/reports`  
All endpoints require JWT + `REPORTS_VIEW`.

---

#### GET `/reports/girvi`
Girvi portfolio report.

**Query params:** `fromDate`, `toDate`

---

#### GET `/reports/sales`
Sales report for a period.

**Query params:** `fromDate`, `toDate`

---

#### GET `/reports/karigar`
Karigar performance report.

**Query params:** `fromDate`, `toDate`

---

#### GET `/reports/stock-valuation`
Current stock valuation by metal type.

---

#### GET `/reports/gstr1`
GSTR-1 data export.  
**Permission:** `REPORTS_EXPORT`

**Query params:** `year`, `month`

---

### 22. Notifications

**Base path:** `/api/v1/notifications`  
All endpoints require JWT.

---

#### POST `/notifications/send`
Send a single notification.  
**Permission:** `NOTIFICATION_SEND`

**Request body:**
```json
{
  "recipient": "9876543210",
  "message": "Your gold loan MLJ-G-00123 payment is due.",
  "channel": "SMS"
}
```

| `channel` | Notes |
|---|---|
| `SMS` | Via Msg91 / Twilio |
| `WHATSAPP` | Via WhatsApp Business API |
| `EMAIL` | Email (if configured) |
| `PUSH` | Firebase push notification |

---

#### POST `/notifications/send-bulk`
Send bulk SMS (DND compliant).  
**Permission:** `NOTIFICATION_SEND`

**Request body:**
```json
{
  "recipients": ["9876543210", "9123456789"],
  "message": "Diwali offer: 0% making charges today!",
  "channel": "SMS"
}
```

---

#### GET `/notifications/history`
Notification delivery history.  
**Permission:** `REPORTS_VIEW`

**Query params:** `page`, `limit`

---

### 23. WhatsApp Bot

**Base path:** `/api/v1/whatsapp`

---

#### POST `/whatsapp/send`
Send a WhatsApp message.  
**Permission:** `NOTIFICATION_SEND`

**Request body:**
```json
{
  "recipient": "9876543210",
  "message": "Your receipt is ready.",
  "template": "RECEIPT_READY"
}
```

---

#### POST `/whatsapp/girvi-balance/:customerId`
Send girvi balance summary on WhatsApp.  
**Permission:** `NOTIFICATION_SEND`

---

#### POST `/whatsapp/webhook`
WhatsApp Business API incoming webhook.  
**Auth:** Public (validated by WhatsApp signature)

**Request body:** WhatsApp webhook payload (as received from Meta)

---

#### GET `/whatsapp/messages`
WhatsApp message log.  
**Permission:** `NOTIFICATION_SEND`

**Query params:** `status`, `recipient`, `page`, `limit`

---

### 24. GST Filing

**Base path:** `/api/v1/gst-filing`  
All endpoints require JWT + `STAFF_MANAGE`.

---

#### POST `/gst-filing/returns`
Generate GSTR-1 or GSTR-3B return.

**Request body:**
```json
{
  "returnType": "GSTR1",
  "month": 6,
  "year": 2026
}
```

| `returnType` | Notes |
|---|---|
| `GSTR1` | Outward supplies |
| `GSTR3B` | Summary return with ITC |

---

#### GET `/gst-filing/returns`
List GST returns.

**Query params:** `returnType`, `month`, `year`, `status` (`DRAFT` \| `FILED`), `page`, `limit`

---

#### GET `/gst-filing/itc-summary`
Input Tax Credit summary.

**Query params:** `month`, `year`

---

#### GET `/gst-filing/returns/:id`
Get return with full JSON data (ready for portal upload).

---

#### PATCH `/gst-filing/returns/:id/file`
Mark return as filed.

**Request body:**
```json
{
  "referenceNumber": "ARN-AA12345"
}
```

---

### 25. Payroll

**Base path:** `/api/v1/payroll`  
All endpoints require JWT + `STAFF_MANAGE`.

---

#### POST `/payroll`
Generate payroll for a staff member.

**Request body:**
```json
{
  "staffId": "staff-uuid",
  "month": 6,
  "year": 2026,
  "basicSalary": 25000,
  "hra": 5000,
  "da": 2500,
  "otherAllowances": 1000,
  "workingDays": 26,
  "presentDays": 24,
  "otherDeductions": 0
}
```

**Response includes:**
- `grossSalary` — basic + HRA + DA + allowances
- `pfDeduction` — 12% of basic
- `esiDeduction` — 0.75% of gross (if applicable)
- `tdsDeduction`
- `netPayable`
- Payslip PDF URL

---

#### GET `/payroll`
List payroll records.

**Query params:** `month`, `year`, `staffId`, `status`, `page`, `limit`

---

#### GET `/payroll/summary`
Monthly payroll summary (total cost, deductions).

**Query params:** `month`, `year`

---

#### GET `/payroll/:id`
Get payroll record with payslip URL.

---

#### PATCH `/payroll/:id/approve`
Approve payroll.

**Request body:**
```json
{
  "notes": "Approved after verification"
}
```

---

#### PATCH `/payroll/:id/paid`
Mark payroll as paid (bank transfer done).

---

### 26. Old Gold

**Base path:** `/api/v1/old-gold`  
All endpoints require JWT.

---

#### POST `/old-gold/purchases`
Record old gold purchase from customer.  
**Permission:** `INVENTORY_MANAGE`

**Request body:**
```json
{
  "customerId": "cust-uuid",
  "vendorName": null,
  "grossWeight": 15.5,
  "ratePerGram": 6800,
  "notes": "Old bangles, estimated 18K"
}
```

---

#### GET `/old-gold/purchases`
List purchases.  
**Permission:** `INVENTORY_VIEW`

**Query params:** `status`, `customerId`, `page`, `limit`

---

#### GET `/old-gold/purchases/report`
Old gold purchase report.  
**Permission:** `INVENTORY_VIEW`

---

#### GET `/old-gold/purchases/:id`
Get single purchase.  
**Permission:** `INVENTORY_VIEW`

---

#### PATCH `/old-gold/purchases/:id/purity-test`
Record purity test result.  
**Permission:** `INVENTORY_MANAGE`

**Request body:**
```json
{
  "testedPurity": "18K",
  "meltingLoss": 0.5
}
```

---

#### PATCH `/old-gold/purchases/:id/melt`
Mark item as melted.  
**Permission:** `INVENTORY_MANAGE`

---

#### PATCH `/old-gold/purchases/:id/settle`
Settle with refiner.  
**Permission:** `INVENTORY_MANAGE`

**Request body:**
```json
{
  "refinerId": "vendor-uuid",
  "settlementNotes": "Paid via NEFT"
}
```

---

#### PATCH `/old-gold/purchases/:id/return`
Return item to customer.  
**Permission:** `INVENTORY_MANAGE`

---

### 27. Loyalty

**Base path:** `/api/v1/loyalty`  
All endpoints require JWT.

---

#### GET `/loyalty/accounts`
List loyalty accounts.  
**Permission:** `INVENTORY_VIEW`

**Query params:** `tier` (`BRONZE` \| `SILVER` \| `GOLD` \| `PLATINUM`), `page`, `limit`

---

#### GET `/loyalty/tiers`
Tier distribution report.  
**Permission:** `INVENTORY_VIEW`

---

#### GET `/loyalty/accounts/:customerId`
Get customer's loyalty account with last 20 transactions.  
**Permission:** `INVENTORY_VIEW`

---

#### GET `/loyalty/accounts/:customerId/transactions`
Full transaction history.  
**Permission:** `INVENTORY_VIEW`

---

#### POST `/loyalty/accounts/:customerId/points`
Manually adjust points.  
**Permission:** `INVENTORY_MANAGE`

**Request body:**
```json
{
  "type": "BONUS",
  "points": 100,
  "description": "Diwali bonus points",
  "referenceId": null,
  "referenceType": null
}
```

| `type` | Meaning |
|---|---|
| `EARN` | Points awarded on purchase |
| `REDEEM` | Points used |
| `EXPIRE` | Points expired |
| `BONUS` | Manual bonus |
| `ADJUSTMENT` | Correction |

---

### 28. Franchise

**Base path:** `/api/v1/franchise`  
All endpoints require JWT + `STAFF_MANAGE`.

---

#### POST `/franchise/franchisees`
Register a new franchisee.

**Request body:**
```json
{
  "franchiseeName": "Pune Gold Palace",
  "territory": "Pune West",
  "contactPerson": "Anil Mehta",
  "contactMobile": "9876543210",
  "royaltyRate": 2.5,
  "agreementStart": "2026-04-01",
  "agreementEnd": "2031-03-31",
  "notes": "5-year agreement"
}
```

---

#### GET `/franchise/franchisees`
List franchisees.

**Query params:** `status`, `page`, `limit`

---

#### GET `/franchise/dashboard`
Franchise overview — counts, total royalties.

---

#### GET `/franchise/franchisees/:id`
Get franchisee with royalty history.

---

#### PATCH `/franchise/franchisees/:id`
Update franchisee details.

---

#### PATCH `/franchise/franchisees/:id/suspend`
Suspend a franchisee.

---

#### POST `/franchise/franchisees/:id/royalties`
Calculate monthly royalty.

**Request body:**
```json
{
  "month": 6,
  "year": 2026,
  "grossSales": 500000
}
```

---

#### PATCH `/franchise/royalties/:royaltyId/paid`
Mark royalty as paid.

---

### 29. Helpdesk

**Base path:** `/api/v1/helpdesk`  
All endpoints require JWT.

---

#### POST `/helpdesk/tickets`
Create a support ticket.  
**Permission:** `INVENTORY_VIEW`

**Request body:**
```json
{
  "subject": "POS not responding",
  "description": "The billing screen freezes on large invoices.",
  "priority": "HIGH"
}
```

| `priority` | Values |
|---|---|
| | `LOW` \| `MEDIUM` \| `HIGH` \| `CRITICAL` |

---

#### GET `/helpdesk/tickets`
List tickets.  
**Permission:** `STAFF_MANAGE`

**Query params:** `status`, `priority`, `assignedTo`, `page`, `limit`

---

#### GET `/helpdesk/tickets/analytics`
Ticket analytics (by status, SLA breaches, CSAT).  
**Permission:** `STAFF_MANAGE`

---

#### GET `/helpdesk/tickets/:id`
Get ticket with full comment thread.  
**Permission:** `INVENTORY_VIEW`

---

#### PATCH `/helpdesk/tickets/:id`
Update ticket.  
**Permission:** `STAFF_MANAGE`

---

#### POST `/helpdesk/tickets/:id/comments`
Add a comment.  
**Permission:** `INVENTORY_VIEW`

**Request body:**
```json
{
  "comment": "Reproduced the issue. Will fix in next update.",
  "isInternal": true
}
```

---

#### PATCH `/helpdesk/tickets/:id/escalate`
Escalate ticket.  
**Permission:** `STAFF_MANAGE`

**Request body:**
```json
{
  "reason": "SLA breached, customer is frustrated",
  "escalateTo": "staff-uuid"
}
```

---

#### PATCH `/helpdesk/tickets/:id/resolve`
Resolve ticket.  
**Permission:** `STAFF_MANAGE`

**Request body:**
```json
{
  "resolution": "Fixed in app version 2.1.4",
  "csatScore": 5
}
```

---

#### PATCH `/helpdesk/tickets/:id/close`
Close a resolved ticket.  
**Permission:** `STAFF_MANAGE`

---

### 30. Data Import / Export

**Base path:** `/api/v1/data-import`  
All endpoints require JWT + `STAFF_MANAGE`.

---

#### GET `/data-import/modules`
List supported import modules.

---

#### POST `/data-import/jobs`
Create and queue a CSV import job.

**Request body:**
```json
{
  "module": "customers",
  "fileUrl": "https://s3.../import.csv",
  "fileName": "customers_june_2026.csv"
}
```

---

#### GET `/data-import/jobs`
List import jobs.

**Query params:** `status`, `module`, `page`, `limit`

---

#### GET `/data-import/jobs/:id`
Get import job with per-row errors.

---

#### POST `/data-import/jobs/:id/retry`
Retry a failed import job.

---

#### GET `/data-import/export`
Export module data as CSV.

**Query params:** `module` (e.g., `customers`, `inventory`, `girvi`)

---

### 31. Sync (Offline)

**Base path:** `/api/v1/sync`  
All endpoints require JWT.

---

#### POST `/sync/push`
Push a queued offline operation.  
**Permission:** `INVENTORY_VIEW`

**Request body:**
```json
{
  "operation": "CREATE_PAYMENT",
  "payload": { },
  "deviceId": "device-uuid"
}
```

---

#### GET `/sync/queue`
View pending sync queue.  
**Permission:** `STAFF_MANAGE`

**Query params:** `status`, `page`, `limit`

---

#### GET `/sync/status`
Sync summary (pending count, last sync time).  
**Permission:** `INVENTORY_VIEW`

---

### 32. Search

**Base path:** `/api/v1/search`  
All endpoints require JWT + `INVENTORY_VIEW`.

---

#### GET `/search/global`
Global search across customers, girvi, inventory, sales.

**Query params:**

| Param | Type | Notes |
|---|---|---|
| `q` | string | Search term |
| `limit` | number | Default 10 |

---

#### GET `/search/customers`
Search customers by name, mobile, or customer ID.

**Query params:** `q`

---

#### GET `/search/qr`
Lookup any entity by QR code scan.

**Query params:** `code`

---

### 33. Settings

**Base path:** `/api/v1/settings`  
All endpoints require JWT + `SETTINGS_MANAGE`.

---

#### GET `/settings/profile`
Get tenant (shop) profile.

---

#### PUT `/settings/profile`
Update tenant profile.

**Request body:**
```json
{
  "name": "Mahalaxmi Jewellers",
  "gstin": "27ABCDE1234F1Z5",
  "phone": "0712-2222222",
  "email": "info@mlj.com",
  "address": "Main Road, Nagpur",
  "city": "Nagpur",
  "state": "Maharashtra",
  "pincode": "440001",
  "logoUrl": "https://s3.../logo.png"
}
```

---

#### GET `/settings`
Get all key-value settings.

---

#### PUT `/settings`
Update settings.

**Request body:**
```json
{
  "settings": {
    "cashDisbursalAdvisoryLimit": 20000,
    "goldInsuranceAlertDays": 30,
    "pledgeCapGrams": 1000
  }
}
```

---

#### GET `/settings/interest`
Get interest configuration.

**Response:**
```json
{
  "success": true,
  "data": {
    "defaultInterestRate": 1.5,
    "defaultInterestType": "SIMPLE",
    "overdueInterestRate": 2.0,
    "billingThresholdDays": 15
  }
}
```

---

#### PUT `/settings/interest`
Update interest configuration.

**Request body:**
```json
{
  "defaultInterestRate": 1.5,
  "defaultInterestType": "SIMPLE",
  "overdueInterestRate": 2.0,
  "billingThresholdDays": 15
}
```

---

### 34. Health Check

#### GET `/`
Server health check (no auth required).

**Response:**
```json
{
  "success": true,
  "data": "Jewellery ERP API is running"
}
```

---

## Pagination

All list endpoints that accept `page` and `limit` return:

```json
{
  "success": true,
  "data": {
    "items": [ ],
    "total": 250,
    "page": 1,
    "limit": 20,
    "totalPages": 13
  }
}
```

Default: `page=1`, `limit=20`. Maximum `limit=100`.

---

## File Uploads

Files (photos, bills, certificates) are uploaded to S3 first, then the URL is passed in the API request. The backend returns **signed URLs** for downloads (valid 15 minutes).

**Upload flow:**
1. Call file upload endpoint (to be documented separately) → receive S3 URL
2. Pass S3 URL in the relevant API field (e.g., `photoUrls`, `billUrl`, `certUrl`)

---

## RBI 2026 Business Rules (enforced at API level)

| Rule | Enforcement |
|---|---|
| Loan ≤ ₹2.5L → LTV max 85% | Hard block on `POST /girvi` |
| Loan ₹2.5L–5L → LTV max 80% | Hard block on `POST /girvi` |
| Loan > ₹5L → LTV max 75% | Hard block on `POST /girvi` |
| Max tenure 12 months | Hard block on `POST /girvi` |
| 1 kg gold per borrower cap | Warning at 900g, block at 1000g |
| Cash disbursal > ₹20,000 | Advisory flag in response |
| KFS acknowledgment before disbursal | `PATCH /girvi/:id/disburse` blocked until KFS signed |
| PAN + Aadhaar mandatory > ₹50,000 | `POST /girvi` returns 422 if missing |
