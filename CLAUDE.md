# Backend — Jewellery ERP & Girvi Management

Working instructions for Claude building this NestJS backend.

---

## Stack

- **Framework:** NestJS 11+ (TypeScript strict mode)
- **ORM:** Prisma (single client singleton)
- **DB:** PostgreSQL 16+ with RLS
- **Cache:** Redis (OTP, sessions, dashboard cache, rate limiting)
- **Queue:** BullMQ (notifications, reports, exports, backups, imports)
- **Storage:** AWS S3 (tenant/module/entity/file path structure)
- **Auth:** Firebase Auth OTP → JWT (24h) + Refresh Token (30d) + device binding
- **SMS:** Msg91 / Twilio behind abstraction layer
- **Payments:** Razorpay / PhonePe
- **Gold Rates:** MCX API

---

## Folder Structure

```
src/
├── auth/
├── customers/
├── girvi/
├── interest/
├── vault/
├── compliance/
├── staff/
├── inventory/
├── purchase/
├── sales/
├── savings/
├── dashboard/
├── reports/
├── notifications/
├── audit/
├── files/
├── search/
├── sync/
├── jobs/
├── events/
├── settings/
├── common/
├── config/
└── database/
```

Every module follows this internal structure:

```
module/
├── controllers/
├── services/
├── repositories/
├── dto/
├── entities/
├── validators/
├── events/
├── commands/
├── queries/
└── handlers/
```

---

## Rules — Always Follow

**Architecture:**
- Controller → Service → Repository only. Never Controller → Repository directly.
- Never cross-call repositories between modules — use services.
- All DB access through Prisma transactions for any financial operation.
- Every module event-emits (NestJS EventEmitter) for cross-module side effects.

**Data:**
- Every business table has `tenant_id`. Every query filters by it — no exceptions.
- All tables have `created_at`, `updated_at`, `deleted_at`, `deleted_by` (soft delete only).
- Never expose Prisma entities from controllers — always map to DTOs.
- Validate all inputs with `class-validator` on DTOs.

**Security:**
- All endpoints behind `JwtGuard` + `PermissionGuard` + `TenantGuard` except `/auth/*`.
- Passwords/PINs: Argon2. OTPs: stored in Redis with 5-min TTL.
- Audit log every create, update, delete, approve, reject, export, login.

**APIs:**
- All routes prefixed `/api/v1/`
- Success: `{ success: true, data: {} }`
- Error: `{ success: false, error: { code: "MODULE_001", message: "", details: [] } }`

**Tests:**
- Unit tests (Jest) for every service. Coverage ≥ 80% enforced in CI.
- Integration tests for every module's critical flows.

**Workflow per module:**
1. Prisma schema + migration first
2. DTO → Service → Repository → Controller
3. Unit tests alongside
4. Swagger annotations on every endpoint

---

## Core Domain Events (emit these, don't call modules directly)

```
CustomerCreated | GirviCreated | PaymentRecorded | GirviRedeemed
InterestCalculated | VaultAssigned | KFSGenerated | SaleCompleted
PurchaseApproved | SchemeMatured
```

---

## Mandatory Shared Modules (import, don't re-implement)

`AuthModule` `AuditModule` `NotificationModule` `FileModule`
`ConfigModule` `CacheModule` `QueueModule`

---

## Build Order — Sprint Sequence

Build strictly in this order. Each sprint depends on all previous.

### Sprint 0 — Foundation
- AWS infra (VPC, ECS, RDS, S3, Redis) via Terraform/CDK
- CI/CD: GitHub Actions → ECR → ECS
- NestJS scaffold with all shared modules wired
- Prisma schema for core tables + RLS policies
- Feature flag framework (LaunchDarkly)

### Sprint 1 — Auth & Device Management (M-01)
- Firebase OTP → JWT + refresh token flow
- Device fingerprint registration + owner approval workflow
- RBAC: 5 roles, 14 permissions, guards
- `JwtGuard`, `PermissionGuard`, `DeviceGuard`, `TenantGuard`
- **AC:** OTP < 5s, 5 wrong PINs → OTP re-auth, unapproved device blocked

### Sprint 2 — Customer KYC (M-02)
- Customer profile CRUD + mobile uniqueness per tenant
- Digital customer ID + QR generation
- Document vault (S3 upload, AES-256 at rest, audit log)
- Customer search by mobile/name/QR
- **AC:** PAN mandatory > ₹50K loan, QR lookup < 1s, docs encrypted at rest

### Sprint 3 — Girvi Lifecycle (M-03)
- Girvi creation with multi-item support + immutable MCX rate lock
- Fine gold calculation: gross → net → fine → value
- LTV enforcement (tiered, hard-block)
- State machine: created → active → partial-paid → overdue → redeemed/auctioned
- Partial payment, renewal, redemption (vault auto-release), auction (14-day notice)
- Daily background job: due/overdue categorization
- **AC:** Creation E2E < 120s, photo mandatory at redemption, auction notice enforced

### Sprint 4 — Interest Engine (M-04)
- Simple interest: `Principal × Rate × Days / 365`
- Katmiti compound interest: partial payment resets principal base
- Threshold billing: days 1–15 billed as full month
- Daily accrual, overdue penalty (configurable), rate changes affect future only
- Server-driven config for all interest parameters
- **AC:** Katmiti matches 10/10 reference values, no retroactive rate changes

### Sprint 5 — Vault Management (M-05)
- 4-level hierarchy: Vault → Safe → Tray → Slot
- Slot assignment mandatory before Girvi finalization
- Double-assignment prevention (DB constraint + service check)
- Auto-release on redemption/auction
- Search by Girvi ID / customer / asset serial
- **AC:** Search < 1s, Girvi blocked without vault assignment

### Sprint 6 — Receipt & KFS (M-06)
- KFS auto-generation in English + Marathi (PDF)
- KFS acknowledgment gate: disbursement API blocked until KFS confirmed
- PDF receipt generation for WhatsApp sharing (S3 → signed URL)

### Sprint 7 — Maharashtra Compliance (M-07)
- Auto-generate 6 statutory forms from transaction log:
  Form 6 (Cash Book daily), Form 9 (Debtor Ledger), Form 11 (Repayment Receipt),
  Form 12 (Receipt to Debtor), Form 13 (Capital Account annual), Section 25(1) statement
- PDF export matching government templates exactly
- **AC:** All forms < 5s, Form 12 field-by-field match, Form 6 daily auto-generate

### Sprint 8 — RBI 2026 Compliance (M-08)
- Tiered LTV: ≤ ₹2.5L = 85%, ₹2.5–5L = 80%, > ₹5L = 75% (hard block + owner override log)
- Gold return 7-day timer (working days), alerts on day 5 and 7
- 1kg pledge cap per borrower: warning at 900g, hard block at 1000g
- Gold insurance tracker with expiry alerts
- Silver collateral (ornaments 10kg, coins 500g) separate workflow
- Cash disbursal > ₹20,000 advisory flag
- Tamper-proof valuation certificate generation
- Bullet loan: 12-month tenure cap
- **AC:** All rules enforced at API level, LTV blocks at correct tiers

---

### Sprint 9 — Inventory (M-09)
- Gold (22K/18K/14K), silver (925/999), diamond (4C + GIA cert), gemstones
- Hallmark record (BIS number, HUID, date)
- Real-time valuation by live metal rate
- Stock adjustment with reason + audit trail
- Low stock alerts, reorder levels
- Barcode/QR lookup
- **AC:** Stock adjustment creates audit entry, barcode lookup < 1s

### Sprint 10 — Sales & Billing (M-10)
- Sales with barcode scan / manual item selection
- HSN auto-population from category
- GST: 3% gold, 18% diamond — auto-calculated
- Making charges, wastage, stone charges as line items
- Multi-payment: cash, card, UPI, cheque
- Sale return / exchange with credit note (reverses inventory)
- GSTR-1 and GSTR-3B data export
- E-way bill integration for high-value sales
- **AC:** GST rates correct, return reverses stock, GSTR-1 valid format

### Sprint 11 — Karigar Manufacturing (M-11)
- Job card with design photo upload
- Raw material issue to Karigar (weight tracking)
- Partial + final receive with wastage calculation
- Making charges per gram / per piece from rate card
- Karigar payment ledger and outstanding report
- **AC:** 10g issued, 9.2g received → wastage = 8%

### Sprint 12 — Purchase Orders (M-12)
- Vendor master CRUD
- PO create → approve → send workflow
- Goods Receipt Note (actual weight/purity vs PO)
- Three-way match: PO = GRN = Invoice
- Purchase return to vendor (inventory update)
- Vendor payment tracking and ageing report

---

### Sprints 13–18 — Retail ERP Modules

| Sprint | Module | Key Backend Work |
|---|---|---|
| 13 | Repairs (M-13) | Ticket schema, estimate, auto-SMS on status change, analytics |
| 14 | Custom Orders (M-14) | Milestone payments, material estimation, delay alerts, profit report |
| 15 | Diamond/Gem (M-15) | 4C schema, Rapaport valuation, certificate expiry alerts |
| 16 | Expenses (M-16) | Approval workflow, recurring auto-generation, petty cash, export |
| 17 | Barcode (M-17) | Code-128/QR generation per SKU, reprint audit trail |
| 18 | Multi-Shop (M-18) | Branch schema, RLS per branch, inter-branch GRN transfers, consolidated P&L |

---

### Sprints 19–22 — Advanced Features

| Sprint | Module | Key Backend Work |
|---|---|---|
| 19 | Analytics (M-19) | ETL pipeline, scheduled reports, all analytics APIs < 2s |
| 20 | Rate Alerts (M-20) | MCX rate fetch, threshold breach → push + SMS, market-hours-only scheduling |
| 21 | SMS Gateway (M-21) | Provider-agnostic abstraction, bulk SMS, DND compliance, failover |
| 22 | Customer Portal (M-22) | Online payments (UPI/card), OWASP audit, portal security |

---

### Sprints 23–24 — Enterprise

| Sprint | Module | Key Backend Work |
|---|---|---|
| 23 | BIS Hallmark + Payroll (M-23/24) | HUID schema, payroll calc (base+HRA+DA−PF−ESI−TDS), payslip PDF, PF/ESI/TDS reports |
| 24 | Advanced Reports + DR (M-25/26) | Report engine, scheduled email, PITR backup (15-min), cross-region replication, DR runbook |

---

### Sprints 25–48 — Enhancement Phase (2 sprints per module)

| Module | Backend Focus |
|---|---|
| M-27 Help Desk | Ticket schema, SLA timer, auto-escalation on breach, CSAT |
| M-28 Gold Rate | Live feed, historical chart, rate prediction ML, arbitrage alerts |
| M-29 Scheme/Chit | Enrollment, monthly collection, maturity + bonus calculation, defaulter tracking |
| M-30 Old Gold | Purchase API, purity test, melting loss, refiner settlement, HUID removal |
| M-31 GST Filing | GSTR-1 auto-population, GSTR-3B auto-fill, ITC matching, JSON export for portal |
| M-32 Notifications | Push/in-app/email engine, preference center, digest mode, quiet hours |
| M-33 Document Vault | Encryption, access log, expiry alerts, eSign integration |
| M-34 Data Import/Export | CSV/Excel import with validation, export scheduler, data masking |
| M-35 API & Webhooks | API key + OAuth 2.0, webhook retry + exponential backoff, rate limiting, Swagger/SDK |
| M-36 White-label | Brand theming config, custom domain support |
| M-37 Franchise | Royalty auto-calculation, franchisor dashboard, territory management |
| M-38 Loyalty | Points rules, tier system, referral tracking, birthday bonus |
| M-39 Marketplace | Catalog API, order management, inventory sync |
| M-40 WhatsApp Bot | WhatsApp Business API, Girvi balance query, UPI payment link, loan renewal |
| M-41 AI Insights | Demand forecasting, default risk ML, churn prediction, anomaly detection |
| M-42 Hardware | Weighing scale (RS-232/USB), biometric attendance, GPS fence |

---

## Performance Targets

| API | Target |
|---|---|
| Standard APIs | < 500ms p95 |
| Search / lookup | < 1s |
| Dashboard / analytics | < 2s |
| Compliance forms | < 5s |
| Custom reports | < 5s |
| Girvi creation E2E | < 120s |
| Backup window | < 4h |
| RPO | < 15min |
| RTO | < 4h |

---

## Definition of Done (every sprint)

- [ ] Prisma migration applied and rollback verified on staging DB copy
- [ ] Unit test coverage ≥ 80% (Jest, enforced in CI)
- [ ] Integration tests green
- [ ] ESLint zero errors/warnings
- [ ] Swagger annotations on all new endpoints
- [ ] All acceptance criteria met
- [ ] Zero critical/high defects; ≤ 3 medium
- [ ] Deployed to staging and smoke-tested
- [ ] Audit logging verified for all write operations
- [ ] Tenant isolation verified (no cross-tenant data leak)
