# Jewellery ERP & Girvi Management — Backend Development Plan

**Document:** Iteration Plan v3.0 (Backend Scope)
**Framework:** NestJS 11+ / TypeScript
**Database:** PostgreSQL 16+ with Prisma ORM
**Cache:** Redis | **Queue:** BullMQ | **Storage:** S3-Compatible
**Auth:** JWT + Refresh Token + Device Binding
**Product Owner:** Mayur Gajapure | **Date:** June 2026

---

## Project Overview

Backend for a production-grade Jewellery ERP and Girvi (gold loan) Management Platform.
48 sprints across 24 months, 42 modules, delivered in 5 milestone tiers.

**Tiers:**
| Tier | Price | Unlocked At |
|---|---|---|
| Starter | ₹499/month | Month 4 (Beta) |
| Professional | ₹999/month | Month 6 |
| Business | ₹1,999/month | Month 9 |
| Pro | ₹3,499/month | Month 11 |
| Enterprise | ₹6,999/month | Month 12 |

---

## Architecture Principles

- **AP-001** Modular Monolith First — migrate to microservices only when scale demands it
- **AP-002** Domain Driven Design (DDD) — module boundaries follow business domains
- **AP-003** CQRS Ready Architecture — separate read/write paths from day one
- **AP-004** Event-Driven Internal Communication — modules communicate via events
- **AP-005** Repository Pattern — all DB access through repository layer
- **AP-006** Database First Consistency — schema migrations precede API development
- **AP-007** Offline First Support — sync engine handles conflict resolution

---

## Development Philosophy

1. **Database First** — schema and migrations before any API code
2. **Backend Before Frontend** — APIs fully tested before Flutter consumes them
3. **Core Business Before Reports** — transactional logic before analytics
4. **Security By Default** — RLS, RBAC, encryption applied from Sprint 0
5. **Offline Support From Day One** — every write operation supports sync queue

---

## Backend Tech Stack

| Concern | Technology |
|---|---|
| Framework | NestJS 11+ (TypeScript) |
| ORM | Prisma ORM |
| Database | PostgreSQL 16+ |
| Cache | Redis |
| Queue | BullMQ |
| Storage | AWS S3 / compatible |
| Auth | Firebase Auth (OTP) + JWT |
| SMS | Msg91 / Twilio (abstraction layer) |
| Payments | Razorpay / PhonePe (POC Sprint 0) |
| Rate API | MCX (gold/silver live rates) |
| CI/CD | GitHub Actions → ECR → ECS |
| Infra | AWS (VPC, ECS, RDS, S3, Redis) |
| Monitoring | Datadog / New Relic |

---

## Master Dependency Graph

```
Infrastructure (S0)
    └── Database Schema (S0)
            └── Authentication / RBAC (S1)
                    └── Customer / KYC (S2)
                            └── Girvi Lifecycle (S3)
                                    ├── Interest Engine (S4)
                                    ├── Vault Management (S5)
                                    ├── Receipt / KFS (S6)
                                    ├── Maharashtra Compliance (S7)
                                    └── RBI 2026 Compliance (S8)
                                            └── Inventory (S9)
                                                    ├── Sales & Billing (S10)
                                                    ├── Karigar Mfg (S11)
                                                    └── Purchase Orders (S12)
                                                            └── [Milestone 3-5 Modules]
```

---

## Milestone 1 — Core Girvi Platform (Sprints 0–8 | Months 0–4)

**Goal:** Production-ready Girvi gold loan system. Shop can register, onboard customers via Aadhaar OCR, create Girvi contracts with LTV enforcement, assign vault locations, print receipts, and generate all Maharashtra compliance forms.
**Beta Target:** 50 shops in Pune/Nashik.

---

### Sprint 0 — Project Foundation | Week 0

**Goal:** Dev environment, CI/CD pipeline, and project scaffolding.

**Backend Tasks:**
| Task | Owner | Effort |
|---|---|---|
| S0-T1: AWS infra setup (VPC, ECS, RDS, S3, Redis) | DevOps | 3 days |
| S0-T2: CI/CD pipeline (GitHub Actions, ECR, ECS deploy) | DevOps | 2 days |
| S0-T3: NestJS project scaffold with TypeScript, modular architecture | Backend Lead | 2 days |
| S0-T6: Database schema design (core tables, indexes, RLS policies) | Backend Lead | 2 days |
| S0-T7: Module registry and feature flag framework | Backend Lead | 1 day |

**Exit Criteria:** Automated build passes. Dev environment deploys to staging with one command. Database migrations run successfully.

**Deliverables:** Running staging environment, database migration scripts.

---

### Sprint 1 — Authentication & Device Management (M-01) | Weeks 1–2

**Goal:** Secure multi-factor authentication with device binding and RBAC.

**Backend Tasks:**
| Task | Points |
|---|---|
| S1-T1: Mobile OTP auth (Firebase Auth, 5-min expiry, rate limiting) | 8 |
| S1-T2: Device registration with hardware fingerprint binding | 13 |
| S1-T3: Owner-only device approval workflow | 8 |
| S1-T7: RBAC permission framework (14 permissions, 5 roles) | 13 |
| S1-T9: Unit tests — OTP flow, device binding, RBAC matrix | 8 |
| S1-T10: Integration tests — end-to-end login with device approval | 5 |

**Exit Criteria:** Login E2E < 10 seconds. OTP expires at 5 min. Unapproved device blocked. All RBAC roles tested.

**Acceptance Criteria:**
- AC-001: OTP delivered in < 5s
- AC-002: Device approval request sent to Owner
- AC-003: 5 wrong PINs trigger OTP re-auth
- AC-004: Biometric fallback to PIN works

---

### Sprint 2 — Customer Identity & KYC Engine (M-02) | Weeks 3–4

**Goal:** Customer profile management with Aadhaar OCR, QR generation, and document vault.

**Backend Tasks:**
| Task | Points |
|---|---|
| S2-T1: Customer profile creation API (name, mobile, address, photo) | 8 |
| S2-T4: Digital Customer ID generation and QR code | 8 |
| S2-T6: Customer search (mobile, name prefix, QR scan) | 8 |
| S2-T7: Document vault (upload, encrypt, view, audit log) | 13 |
| S2-T9: Mobile uniqueness validation per tenant | 5 |
| S2-T10: Unit + Integration tests for customer flows | 8 |

**Exit Criteria:** Customer created via Aadhaar OCR in < 30 seconds. QR scan retrieves profile in < 1 second. PAN enforced for loans > ₹50,000.

**Acceptance Criteria:**
- AC-005: Aadhaar OCR populates name, DOB, address in < 3s
- AC-006: QR scan returns profile in < 1s
- AC-007: PAN field mandatory at > ₹50K loan
- AC-008: Document upload encrypted at rest

---

### Sprint 3 — Girvi Evaluation & Valuation Engine (M-03) | Weeks 5–6

**Goal:** Complete Girvi lifecycle — creation, partial payment, renewal, redemption, and auction.

**Backend Tasks:**
| Task | Points |
|---|---|
| S3-T1: Girvi creation API (item details, weight, purity, valuation, LTV) | 13 |
| S3-T2: Fine gold calculation pipeline (gross → net → fine → value) | 13 |
| S3-T3: MCX rate integration with immutable rate lock at creation | 8 |
| S3-T4: Multi-item Girvi support (multiple items per contract) | 8 |
| S3-T6: Partial payment recording with balance recalculation | 13 |
| S3-T7: Girvi renewal (extend tenure, revalue at current MCX) | 8 |
| S3-T8: Girvi redemption (photo verification, vault release) | 13 |
| S3-T9: Due/overdue tracking (daily background job, categorization) | 8 |
| S3-T10: Girvi auction workflow (14-day notice, proceeds logging) | 13 |
| S3-T12: Unit + Integration tests for all Girvi flows | 13 |

**Exit Criteria:** Girvi creation E2E < 120 seconds. Interest calculations match hand-calculated reference values.

**Acceptance Criteria:**
- AC-009: Girvi creation < 120s
- AC-010: LTV enforcement blocks above cap
- AC-011: Photo verification mandatory at redemption
- AC-012: Auction 14-day notice enforced

---

### Sprint 4 — Interest & Regional Math Engine (M-04) | Weeks 7–8

**Goal:** Interest calculation engine — Simple, Katmiti, threshold billing, and overdue penalties.

**Backend Tasks:**
| Task | Points |
|---|---|
| S4-T1: Simple interest (Principal × Rate × Days / 365) | 8 |
| S4-T2: Katmiti compound interest (partial payment resets principal base) | 13 |
| S4-T3: Minimum threshold billing (days 1–15 = full month) | 8 |
| S4-T4: Daily interest calculation | 5 |
| S4-T5: Overdue penalty (configurable rate, daily accrual) | 8 |
| S4-T6: Interest recalculation on rate change (future only, no retroactive) | 8 |
| S4-T7: Server-driven configuration for interest parameters | 8 |
| S4-T9: 10 test scenarios for Katmiti accuracy validation | 8 |
| S4-T10: Boundary tests for threshold billing (day 14 vs day 16) | 5 |

**Exit Criteria:** Katmiti results match all 10 hand-calculated reference scenarios. Rate changes only affect future accrual.

**Acceptance Criteria:**
- AC-013: Katmiti matches 10/10 reference values
- AC-014: Threshold billing correct at boundaries
- AC-015: Rate change doesn't alter historical records

---

### Sprint 5 — Vault & Locker Tracking (M-05) | Weeks 9–10

**Goal:** 4-level vault coordinate system with assignment, search, occupancy tracking, and auto-release.

**Backend Tasks:**
| Task | Points |
|---|---|
| S5-T1: Vault slot master (Vault → Safe → Tray → Slot hierarchy) | 8 |
| S5-T2: Vault location assignment (mandatory before Girvi finalization) | 8 |
| S5-T3: Vault search (< 1s by Girvi ID, customer, serial asset ID) | 8 |
| S5-T4: Auto slot release on redemption/auction | 5 |
| S5-T5: Double-assignment prevention | 5 |
| S5-T9: Integration tests for vault + Girvi lifecycle | 8 |

**Exit Criteria:** Vault location retrieved in < 1 second. Double-assignment prevented. Girvi cannot finalize without vault assignment.

**Acceptance Criteria:**
- AC-016: Location search < 1s
- AC-017: Double-assignment blocked
- AC-018: Slot auto-releases on redemption
- AC-019: Girvi creation blocked without vault

---

### Sprint 6 — Bluetooth Thermal Receipting (M-06) | Weeks 11–12

**Goal:** Pauti receipt printing and Key Fact Statement (KFS) generation with WhatsApp PDF fallback.

**Backend Tasks:**
| Task | Points |
|---|---|
| S6-T3: Key Fact Statement (KFS) auto-generation (English/Marathi) | 13 |
| S6-T5: KFS blocks disbursement until acknowledged | 5 |
| S6-T7: PDF receipt generation for WhatsApp sharing | 8 |

**Exit Criteria:** KFS blocks disbursement without acknowledgment.

**Acceptance Criteria:**
- AC-020: Receipt prints on all 3 printer models
- AC-021: KFS blocks disbursement without ack
- AC-022: Print queue survives offline/reconnect

---

### Sprint 7 — Maharashtra Compliance Engine (M-07) | Weeks 13–14

**Goal:** Auto-generate all Maharashtra statutory forms matching government templates.

**Backend Tasks:**
| Task | Points |
|---|---|
| S7-T1: Form No. 6 (Cash Book) auto-generation from transaction log | 13 |
| S7-T2: Form No. 9 (Debtor Ledger) auto-compiled per customer | 8 |
| S7-T3: Form No. 11 (Repayment Receipt) generated on each payment | 5 |
| S7-T4: Form No. 12 (Receipt to Debtor) at Girvi creation | 8 |
| S7-T5: Form No. 13 (Capital Account) annual auto-export | 8 |
| S7-T6: Section 25(1) annual debtor statement | 8 |
| S7-T7: PDF templates matching Maharashtra government format | 13 |

**Exit Criteria:** All 6 forms generate in < 5 seconds. Form 12 matches government template field-by-field. Exportable as PDF.

**Acceptance Criteria:**
- AC-023: Form 12 field-by-field match with government template
- AC-024: All forms generated in < 5s
- AC-025: Form 6 daily auto-generation

---

### Sprint 8 — RBI 2025/2026 Compliance (M-08) | Weeks 15–16

**Goal:** All RBI 2026 compliance features — tiered LTV, 7-day timer, pledge cap, insurance tracker, silver collateral.

**Backend Tasks:**
| Task | Points |
|---|---|
| S8-T1: Tiered LTV enforcement (≤ ₹2.5L = 85%, ₹2.5–5L = 80%, > ₹5L = 75%) | 13 |
| S8-T2: LTV hard-block with Owner override + reason logging | 8 |
| S8-T3: Gold return 7-day timer (working days, alerts day 5/7) | 8 |
| S8-T4: 1kg pledge cap per borrower (warning 900g, block 1000g) | 8 |
| S8-T5: Gold insurance tracker (policy, provider, expiry alerts) | 8 |
| S8-T6: Silver collateral support (ornaments 10kg, coins 500g) | 8 |
| S8-T7: Cash disbursal flagging (> ₹20,000 advisory) | 5 |
| S8-T8: Valuation certificate generation (tamper-proof) | 8 |
| S8-T9: Bullet loan 12-month tenure cap | 5 |
| S8-T11: Boundary tests for all RBI enforcement rules | 13 |

**Exit Criteria:** All RBI rules enforced at API level. LTV blocks correctly at all 3 tiers. 7-day timer alerts at correct intervals.

**Acceptance Criteria:**
- AC-026: LTV block at 1001g
- AC-027: 7-day alert on day 5 and day 7
- AC-028: KFS mandatory before disbursement
- AC-029: Silver workflow separate from gold

> **Milestone 1 Complete — Month 4 | Tier Unlocked: Starter (₹499/month)**

---

## Milestone 2 — Operational Platform (Sprints 9–12 | Months 5–6)

**Goal:** Transform the Girvi-only platform into a complete jewellery shop management system.

---

### Sprint 9 — Inventory Management (M-09) | Month 5 W1–2 | 88 Points

**Goal:** Multi-metal inventory with karat tracking and hallmark verification.

**Backend Tasks:**
| Task | Points |
|---|---|
| S9-T1: Inventory DB schema (items, categories, subcategories, SKUs) | 8 |
| S9-T2: Gold inventory with karat purity tracking (22K, 18K, 14K) | 13 |
| S9-T3: Silver inventory with purity (925, 999) | 8 |
| S9-T4: Diamond/gemstone inventory (4C attributes, GIA cert) | 8 |
| S9-T5: Hallmark record linking (BIS number, HUID, date) | 5 |
| S9-T6: Real-time valuation by current metal rate | 8 |
| S9-T8: Stock adjustment with reason audit trail | 8 |
| S9-T11: Unit + integration tests for inventory | 8 |

**Acceptance Criteria:**
- AC-030: 22K gold item valued at correct rate
- AC-031: Stock adjustment creates audit entry
- AC-032: Barcode scan finds item in < 1s

---

### Sprint 10 — Sales & Billing (M-10) | Month 5 W3–4 | 96 Points

**Goal:** Sales and billing with GST compliance and invoice generation.

**Backend Tasks:**
| Task | Points |
|---|---|
| S10-T1: Sales DB schema (bills, line items, payments, returns) | 8 |
| S10-T3: HSN code auto-population from category | 5 |
| S10-T4: GST auto-calculation (3% gold, 18% diamond) | 8 |
| S10-T5: Making charges, wastage, stone charges line items | 8 |
| S10-T7: Multi-payment mode (cash, card, UPI, cheque) | 8 |
| S10-T8: Sale return / exchange workflow with credit note | 8 |
| S10-T9: GST return data export (GSTR-1, GSTR-3B) | 8 |
| S10-T11: E-way bill integration for high-value sales | 5 |
| S10-T12: Integration tests for complete sale-to-invoice flow | 8 |

**Acceptance Criteria:**
- AC-033: GST on gold = 3%, diamond = 18%
- AC-034: Return reverses stock
- AC-035: GSTR-1 export valid format

---

### Sprint 11 — Karigar Manufacturing Management (M-11) | Month 6 W1–2 | 78 Points

**Goal:** Karigar module for jewellery manufacturing workflow management.

**Backend Tasks:**
| Task | Points |
|---|---|
| S11-T1: Karigar DB schema (job cards, artisans, raw materials) | 8 |
| S11-T4: Raw material issue to Karigar with weight tracking | 8 |
| S11-T5: Partial / final receive with wastage calculation | 8 |
| S11-T6: Making charges calculation per gram / per piece | 8 |
| S11-T8: Karigar payment tracking and outstanding report | 8 |
| S11-T10: End-to-end manufacturing workflow tests | 13 |

**Acceptance Criteria:**
- AC-036: Issue 10g raw gold, receive 9.2g, wastage = 8%
- AC-037: Making charges computed from rate card
- AC-038: Payment reduces outstanding

---

### Sprint 12 — Purchase Orders (M-12) | Month 6 W3–4 | 71 Points

**Goal:** Purchase order module with vendor management and goods receipt.

**Backend Tasks:**
| Task | Points |
|---|---|
| S12-T1: Vendor DB schema (vendors, contacts, bank details) | 5 |
| S12-T4: PO approval workflow (create → approve → send) | 8 |
| S12-T5: Goods Receipt Note (GRN) with actual weight/purity | 8 |
| S12-T6: Purchase invoice matching (PO vs GRN vs Invoice) | 8 |
| S12-T8: Purchase return to vendor | 5 |
| S12-T10: Integration tests for PO-to-payment flow | 8 |

**Acceptance Criteria:**
- AC-039: Three-way match (PO = GRN = Invoice)
- AC-040: Payment reduces vendor balance
- AC-041: Return updates inventory

> **Milestone 2 Complete — Month 6 | Tier Unlocked: Professional (₹999/month)**

---

## Milestone 3 — Full Retail ERP (Sprints 13–18 | Months 7–9)

---

### Sprint 13 — Repair Management (M-13) | Month 7 W1–2 | 63 Points

**Backend Tasks:**
| Task | Points |
|---|---|
| S13-T1: Repair DB schema (tickets, items, estimates, history) | 5 |
| S13-T3: Repair estimate with labour + material charges | 8 |
| S13-T6: Automatic customer SMS on status change | 8 |
| S13-T9: Repair analytics (turnaround time, volume, revenue) | 5 |
| S13-T10: End-to-end repair workflow tests | 8 |

**Acceptance Criteria:**
- AC-042: Estimate sent to customer before work starts
- AC-043: Status SMS delivered within 60s
- AC-044: Delivery sign-off captured

---

### Sprint 14 — Custom Orders (M-14) | Month 7 W3–4 | 71 Points

**Backend Tasks:**
| Task | Points |
|---|---|
| S14-T1: Custom order DB schema (orders, designs, milestones, payments) | 8 |
| S14-T4: Milestone payment schedule (advance, mid, final) | 8 |
| S14-T5: Material estimation (gold weight, stones, making charges) | 8 |
| S14-T7: Delivery commitment date with delay alerts | 5 |
| S14-T8: Custom order profitability report | 5 |
| S14-T9: Customer notification on milestone completion | 5 |
| S14-T10: End-to-end custom order tests | 13 |

**Acceptance Criteria:**
- AC-045: Advance payment blocks order start
- AC-046: Design approval required before Karigar
- AC-047: Delay alert fires 2 days before deadline

---

### Sprint 15 — Diamond & Gemstone Management (M-15) | Month 8 W1–2 | 68 Points

**Backend Tasks:**
| Task | Points |
|---|---|
| S15-T1: Diamond extended schema (4C: cut, color, clarity, carat) | 8 |
| S15-T3: Diamond valuation by Rapaport rate integration | 13 |
| S15-T4: Gemstone tracking (type, origin, treatment, certification) | 8 |
| S15-T5: Stone setting tracking in jewellery pieces | 5 |
| S15-T6: Diamond/gemstone purchase cost tracking | 5 |
| S15-T7: Inventory valuation with diamond appreciation | 8 |
| S15-T9: Certificate expiry alerts | 5 |
| S15-T10: Diamond management tests | 5 |

**Acceptance Criteria:**
- AC-048: GIA cert upload and QR scan links to item
- AC-049: Rapaport valuation within 5% of manual
- AC-050: Search by color D–F returns correct results

---

### Sprint 16 — Expense Management (M-16) | Month 8 W3–4 | 58 Points

**Backend Tasks:**
| Task | Points |
|---|---|
| S16-T1: Expense DB schema (categories, entries, approvals, attachments) | 5 |
| S16-T4: Expense approval workflow (staff → manager → owner) | 8 |
| S16-T5: Recurring expense auto-generation (monthly rent, etc.) | 5 |
| S16-T8: Petty cash register | 5 |
| S16-T9: Expense export for accounting software | 5 |
| S16-T10: Expense module tests | 8 |

**Acceptance Criteria:**
- AC-051: Receipt photo attached to expense
- AC-052: Staff expense requires manager approval
- AC-053: Recurring expense auto-creates on 1st of month

---

### Sprint 17 — Barcode & Label Printing (M-17) | Month 9 W1–2 | 53 Points

**Backend Tasks:**
| Task | Points |
|---|---|
| S17-T1: Barcode generation (Code-128, QR codes) per SKU | 5 |
| S17-T6: Label reprint with audit trail | 5 |
| S17-T8: Barcode lookup in inventory, sales, Girvi | 5 |
| S17-T9: Barcode and printing tests | 5 |

**Acceptance Criteria:**
- AC-054: Barcode scan finds item in < 1s
- AC-055: Label print completes in < 3s
- AC-056: Batch print of 50 items succeeds

---

### Sprint 18 — Multi-Shop Management (M-18) | Month 9 W3–4 | 76 Points

**Backend Tasks:**
| Task | Points |
|---|---|
| S18-T1: Branch DB schema (branches, managers, permissions) | 8 |
| S18-T3: Role-based branch access (staff sees own branch only) | 13 |
| S18-T4: Inter-branch stock transfer with GRN | 8 |
| S18-T6: Consolidated sales and Girvi reports | 8 |
| S18-T7: Branch-wise P&L statement | 8 |
| S18-T10: Multi-shop security and isolation tests | 8 |

**Acceptance Criteria:**
- AC-057: Staff cannot see other branch data
- AC-058: Transfer reduces source, increases destination
- AC-059: Owner dashboard shows all branches

> **Milestone 3 Complete — Month 9 | Tier Unlocked: Business (₹1,999/month)**

---

## Milestone 4 — Advanced Features (Sprints 19–22 | Months 10–11)

---

### Sprint 19 — Analytics Dashboard (M-19) | Month 10 W1–2 | 81 Points

**Backend Tasks:**
| Task | Points |
|---|---|
| S19-T1: Analytics data pipeline (ETL from transactional DB) | 13 |
| S19-T3: Girvi portfolio analytics (active loans, interest earned, defaults) | 8 |
| S19-T4: Inventory turnover and ageing analysis | 8 |
| S19-T5: Customer analytics (new vs repeat, top customers, churn) | 8 |
| S19-T7: Cash flow analysis (inflows, outflows, net position) | 5 |
| S19-T8: Metal rate trend overlay on inventory valuation | 5 |
| S19-T9: Scheduled report generation (daily, weekly, monthly) | 8 |
| S19-T10: Analytics API performance tests (< 2s response) | 5 |

**Acceptance Criteria:**
- AC-060: P&L matches ledger within 0.1%
- AC-061: Drill-down from monthly to daily
- AC-062: Scheduled email report delivers on time

---

### Sprint 20 — Rate Alerts (M-20) | Month 10 W3–4 | 51 Points

**Backend Tasks:**
| Task | Points |
|---|---|
| S20-T1: Rate alert DB schema (alerts, thresholds, history) | 5 |
| S20-T2: Gold/silver rate fetch from external API (per gram, 22K/24K) | 8 |
| S20-T4: Push notification for rate threshold breach | 5 |
| S20-T5: SMS rate alert for non-app users | 5 |
| S20-T7: Rate-based inventory revaluation trigger | 5 |
| S20-T8: Rate alert scheduling (market open hours only) | 3 |
| S20-T9: Rate alert tests | 5 |

**Acceptance Criteria:**
- AC-063: Alert fires when gold crosses threshold
- AC-064: Rate history shows 90-day chart
- AC-065: SMS delivers within 5 min

---

### Sprint 21 — SMS Gateway Integration (M-21) | Month 11 W1–2 | 63 Points

**Backend Tasks:**
| Task | Points |
|---|---|
| S21-T1: SMS gateway abstraction layer (provider-agnostic) | 8 |
| S21-T2: SMS template management (Girvi receipt, reminder, marketing) | 8 |
| S21-T3: Template variable substitution ({name}, {amount}, {date}) | 5 |
| S21-T4: Bulk SMS to customer segments (all, Girvi, purchases) | 8 |
| S21-T5: Scheduled SMS (festivals, birthdays, reminders) | 5 |
| S21-T6: Delivery tracking and failure retry | 5 |
| S21-T8: SMS opt-out / DND compliance | 5 |
| S21-T10: SMS gateway failover (primary → secondary provider) | 5 |
| S21-T11: SMS integration tests | 5 |

**Acceptance Criteria:**
- AC-066: Template renders all variables correctly
- AC-067: Bulk SMS to 1,000 customers completes in 10 min
- AC-068: Failover triggers within 60s of primary failure

---

### Sprint 22 — Customer Web Portal (M-22) | Month 11 W3–4 | 86 Points

**Backend Tasks:**
| Task | Points |
|---|---|
| S22-T5: Online interest payment (UPI, card, netbanking) | 13 |
| S22-T6: Online partial/full principal repayment | 8 |
| S22-T9: Loan renewal request from portal | 8 |
| S22-T10: Push notification settings for portal users | 5 |
| S22-T11: Portal security audit (OWASP Top 10) | 8 |
| S22-T12: Portal end-to-end tests | 5 |

**Acceptance Criteria:**
- AC-069: Payment reflects in ERP within 60s
- AC-070: PDF receipt downloads correctly
- AC-071: Portal passes security audit with 0 critical findings

> **Milestone 4 Complete — Month 11 | Tier Unlocked: Pro (₹3,499/month)**

---

## Milestone 5 — Enterprise Intelligence (Sprints 23–24 | Month 12)

---

### Sprint 23 — BIS Hallmarking + Payroll (M-23, M-24) | Month 12 W1–2 | 91 Points

**Backend Tasks:**
| Task | Points |
|---|---|
| S23-T1: BIS hallmark DB schema (HUID, article type, purity, date) | 5 |
| S23-T5: Hallmark expiry alerts (6-month advance notice) | 5 |
| S23-T6: Payroll DB schema (salary, attendance, deductions, advances) | 8 |
| S23-T8: Salary calculation (base + HRA + DA - PF - ESI - TDS) | 13 |
| S23-T10: Salary advance and loan tracking | 5 |
| S23-T11: Monthly payroll processing and bank export | 5 |
| S23-T12: Payroll compliance reports (PF, ESI, TDS) | 8 |
| S23-T13: BIS + Payroll integration tests | 8 |

**Acceptance Criteria:**
- AC-072: HUID scan links to inventory item
- AC-073: Payslip matches manual calculation
- AC-074: PF report matches salary register

---

### Sprint 24 — Advanced Reports + Backup & DR (M-25, M-26) | Month 12 W3–4 | 81 Points

**Backend Tasks:**
| Task | Points |
|---|---|
| S24-T1: Report engine DB schema (templates, parameters, schedules) | 5 |
| S24-T5: Scheduled report email with attachment | 5 |
| S24-T6: Report sharing (link-based with expiry) | 5 |
| S24-T7: Automated daily backup (full DB + file storage) | 8 |
| S24-T8: Point-in-time recovery (15-minute granularity) | 8 |
| S24-T9: Cross-region backup replication | 8 |
| S24-T10: DR runbook and quarterly DR drill | 5 |
| S24-T11: Backup integrity verification (automated restore test) | 5 |
| S24-T12: RTO/RPO monitoring dashboard | 3 |
| S24-T13: Reports + Backup integration tests | 5 |

**Acceptance Criteria:**
- AC-075: Custom report with 10 fields generates in < 5s
- AC-076: PITR restores to exact 15-min boundary
- AC-077: DR drill documented with lessons learned

> **Milestone 5 Complete — Month 12 | Tier Unlocked: Enterprise (₹6,999/month)**

---

## Enhancement Phase — Sprints 25–48 (Months 13–24)

Each module follows a **2-sprint cycle**: Sprint A (core) → Sprint B (integration, testing, polish).

| Sprints | Month | Module | Backend Focus |
|---|---|---|---|
| S25–26 | 13 | M-27 Help Desk | Ticket schema, SLA timer, escalation rules, CSAT |
| S27–28 | 14 | M-28 Gold Rate | Live rate feed, rate lock for Girvi, rate prediction ML |
| S29–30 | 15 | M-29 Scheme/Chit | Scheme schema, enrollment, monthly collection, maturity calculation |
| S31–32 | 16 | M-30 Old Gold | Old gold purchase API, purity test, melting loss, refiner settlement |
| S33–34 | 17 | M-31 GST Filing | GSTR-1 auto-population, GSTR-3B auto-fill, ITC matching, JSON export |
| S35–36 | 18 | M-32 Notifications | Push/in-app/email engine, preference center, quiet hours |
| S37–38 | 19 | M-33 Document Vault | Secure storage, encryption, expiry alerts, eSign integration |
| S39–40 | 20 | M-34 Data Import/Export | Excel/CSV import with validation, export scheduler, data masking |
| S41–42 | 21 | M-35 API & Webhooks | API key management, OAuth 2.0, webhook retry, rate limiting, Swagger |
| S43 | 22 | M-36 White-label | Brand theming, custom domain support |
| S44 | 22 | M-37 Franchise | Franchisor dashboard, royalty calculation, territory management |
| S45 | 23 | M-38 Loyalty | Points earning rules, tier system, reward catalog, referral tracking |
| S46 | 23 | M-39 Marketplace | Online catalog API, order management, inventory sync |
| S47 | 24 | M-40 WhatsApp Bot | WhatsApp Business API, conversational bot for Girvi queries and payments |
| S48 | 24 | M-41 AI Insights | Demand forecasting, default risk prediction, anomaly detection |
| S48 | 24 | M-42 Hardware | Weighing scale (RS-232/USB), biometric device, GPS fence |

### Key Enhancement Module Acceptance Criteria

- **AC-078:** Help Desk SLA breach auto-escalates
- **AC-084:** GSTR-1 JSON imports to GST portal without error
- **AC-085:** ITC matches purchase register
- **AC-087:** API key authenticates successfully
- **AC-088:** Webhook delivers within 30s of event
- **AC-089:** Retry delivers after transient failure
- **AC-090:** Royalty auto-calculates on monthly revenue
- **AC-093:** WhatsApp bot answers balance query in < 5s
- **AC-094:** Demand forecast within 15% of actual
- **AC-095:** Weighing scale reads auto-populate in Girvi form

---

## Backend Team Structure

| Role | Count | Backend Responsibilities |
|---|---|---|
| Backend Lead | 1 | NestJS architecture, DB schema, code review, compliance & payment features |
| Backend Mid | 2 | API development, business logic, third-party integrations, reporting queries |
| DevOps Lead | 1 | CI/CD, AWS infra, monitoring, backup/DR, security hardening |
| Security Lead | 1 | Security audit, penetration testing, compliance review, encryption |

### Team Scaling
| Phase | Duration | Backend Team |
|---|---|---|
| Sprint 0 (Foundation) | 2 weeks | Backend Lead + DevOps |
| Milestone 1 (S1–S8) | 4 months | Backend Lead + Backend Mid ×2 |
| Milestone 2–5 (S9–S24) | 8 months | Backend Lead + Backend Mid ×2 + Security Lead |
| Enhancement (S25–S48) | 12 months | Stable team, execution focus |

---

## Definition of Done — Backend Checklist

Every sprint must satisfy all of the following before being marked complete:

### Code Quality
- [ ] **DOD-01** Code committed to `develop` branch — no uncommitted code
- [ ] **DOD-02** Code review approved by at least 1 senior developer — no critical comments open
- [ ] **DOD-03** Unit test coverage ≥ 80% (enforced in CI via Jest)
- [ ] **DOD-04** Integration tests pass (Postman/newman all green)
- [ ] **DOD-05** ESLint / TSLint passes with zero errors or warnings
- [ ] **DOD-06** Swagger/OpenAPI annotations current — all endpoint changes documented

### Functional
- [ ] **DOD-07** All acceptance criteria met and signed off by BA
- [ ] **DOD-08** Zero critical/high defects open; max 3 medium defects
- [ ] **DOD-09** Offline functionality verified — data syncs correctly on reconnection
- [ ] **DOD-10** Feature flag configured in LaunchDarkly (default OFF, toggle verified in QA)
- [ ] **DOD-11** Performance benchmarks met — API response < 500ms, screen load < 2s

### Deployment & Operations
- [ ] **DOD-13** GitHub Actions CI green (build, test, lint, security scan)
- [ ] **DOD-14** Database migration tested on staging copy of production DB; rollback verified
- [ ] **DOD-15** Feature tested on staging environment mirroring production
- [ ] **DOD-16** Datadog/New Relic dashboards updated; error rate alerts active
- [ ] **DOD-17** Rollback runbook documented with steps, estimated time, and verification check

### Documentation
- [ ] **DOD-18** Jira story updated with technical approach and decision log
- [ ] **DOD-20** Release notes drafted (feature description, bug fixes, known issues)

---

## Performance Targets

| Metric | Target |
|---|---|
| API Response Time | < 500ms (p95) |
| Girvi Creation E2E | < 120 seconds |
| Vault Search | < 1 second |
| QR Scan → Profile | < 1 second |
| Compliance Forms | < 5 seconds each |
| Analytics Queries | < 2 seconds |
| Custom Reports | < 5 seconds |
| SMS Delivery | < 30 seconds |
| Webhook Delivery | < 30 seconds of event |
| Backup Window | < 4 hours |
| RTO (Disaster Recovery) | < 4 hours |
| RPO (Point-in-Time) | < 15 minutes |

---

## Security Requirements

- Row-Level Security (RLS) on all multi-tenant tables — enforced at DB level
- All API endpoints require valid JWT — no unauthenticated access except `/auth`
- Device fingerprint binding on all session tokens
- Documents encrypted at rest (S3 SSE-AES256)
- Audit log on all create/update/delete operations
- OWASP Top 10 review before Customer Portal (Sprint 22) launch
- Penetration testing before each major milestone release
- Multi-shop data isolation tested every sprint (AC-057 pattern)
- Cash disbursals > ₹20,000 flagged per RBI advisory

---

## Risk Register (Backend-Relevant)

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R01 | RBI regulation changes mid-development | High | Med | Legal advisor on retainer; sprint buffer for compliance changes |
| R03 | Offline sync conflict resolution failures | High | Med | Version-vector clocks; automated conflict tests every sprint |
| R04 | Payment gateway integration delays | Med | High | Early POC in Sprint 0; multiple provider accounts pre-configured |
| R07 | Performance at 10K+ Girvi records | Med | Med | Query optimization, pagination, DB indexing, read replicas, cache |
| R10 | Multi-shop data isolation breach | High | Low | RLS + automated isolation tests; patch within 24h |
| R12 | GST rate changes (3% → 5%) | Med | Med | Configurable GST rates via admin; hot-fix within 48h |
| R14 | Cloud infrastructure cost overrun | Med | Med | Budget alerts, reserved instances, weekly cost review |

---

## Module Completion Tracker

| # | Module | Sprint | Tier | Status |
|---|---|---|---|---|
| M-01 | Authentication | S1 | Starter | Planned |
| M-02 | Customer KYC | S2 | Starter | Planned |
| M-03 | Girvi Lifecycle | S3 | Starter | Planned |
| M-04 | Interest Calculation | S4 | Starter | Planned |
| M-05 | Vault Management | S5 | Starter | Planned |
| M-06 | Receipt Printing | S6 | Starter | Planned |
| M-07 | Compliance Forms | S7 | Starter | Planned |
| M-08 | RBI Compliance | S8 | Starter | Planned |
| M-09 | Inventory | S9 | Professional | Planned |
| M-10 | Sales & Billing | S10 | Professional | Planned |
| M-11 | Karigar Mfg | S11 | Professional | Planned |
| M-12 | Purchase Orders | S12 | Professional | Planned |
| M-13 | Repairs | S13 | Business | Planned |
| M-14 | Custom Orders | S14 | Business | Planned |
| M-15 | Diamond/Gemstone | S15 | Business | Planned |
| M-16 | Expenses | S16 | Business | Planned |
| M-17 | Barcode Labels | S17 | Business | Planned |
| M-18 | Multi-Shop | S18 | Business | Planned |
| M-19 | Analytics Dashboard | S19 | Pro | Planned |
| M-20 | Rate Alerts | S20 | Pro | Planned |
| M-21 | SMS Gateway | S21 | Pro | Planned |
| M-22 | Customer Portal | S22 | Pro | Planned |
| M-23 | BIS Hallmark | S23 | Enterprise | Planned |
| M-24 | Payroll | S23 | Enterprise | Planned |
| M-25 | Advanced Reports | S24 | Enterprise | Planned |
| M-26 | Backup & DR | S24 | Enterprise | Planned |
| M-27 | Help Desk | S25–26 | Enterprise | Planned |
| M-28 | Gold Rate Integration | S27–28 | Pro | Planned |
| M-29 | Scheme/Chit | S29–30 | Business | Planned |
| M-30 | Old Gold Purchase | S31–32 | Professional | Planned |
| M-31 | GST Filing | S33–34 | Business | Planned |
| M-32 | Notifications | S35–36 | Starter | Planned |
| M-33 | Document Vault | S37–38 | Enterprise | Planned |
| M-34 | Data Import/Export | S39–40 | Professional | Planned |
| M-35 | API & Webhooks | S41–42 | Enterprise | Planned |
| M-36 | White-label | S43 | Enterprise | Planned |
| M-37 | Franchise | S44 | Enterprise | Planned |
| M-38 | Loyalty Program | S45 | Business | Planned |
| M-39 | Marketplace | S46 | Enterprise | Planned |
| M-40 | WhatsApp Bot | S47 | Business | Planned |
| M-41 | AI Insights | S48 | Enterprise | Planned |
| M-42 | Hardware Integration | S48 | Enterprise | Planned |

---

## Milestone Summary

| Milestone | Month | Sprints | Modules | Story Points | Tier |
|---|---|---|---|---|---|
| M1: Core Girvi | 1–4 | S0–S8 | 8 (M-01 to M-08) | 763 | Starter |
| M2: Operational | 5–6 | S9–S12 | 4 (M-09 to M-12) | 333 | Professional |
| M3: Retail ERP | 7–9 | S13–S18 | 6 (M-13 to M-18) | 385 | Business |
| M4: Advanced | 10–11 | S19–S22 | 4 (M-19 to M-22) | 281 | Pro |
| M5: Enterprise | 12 | S23–S24 | 4 (M-23 to M-26) | 172 | Enterprise |
| Enhancement | 13–24 | S25–S48 | 16 (M-27 to M-42) | ~1,200 | All Tiers |
| **Total** | **24 months** | **48 sprints** | **42 modules** | **~3,134** | **5 Tiers** |

---

*Document: Iteration Plan v3.0 | Last Updated: June 2026 | Owner: Project Manager*
*Living document — updated at end of every sprint retrospective.*
