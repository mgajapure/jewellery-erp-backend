import { PrismaClient } from '@prisma/client';
import { PGlite } from '@electric-sql/pglite';
import { PrismaPGlite } from 'pglite-prisma-adapter';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

function months(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d;
}

async function getPrisma(): Promise<PrismaClient> {
  if (process.env.DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter } as never);
  }
  const dbPath = path.resolve(process.cwd(), '.pglite-dev-db');
  const pglite = new PGlite(dbPath);
  const adapter = new PrismaPGlite(pglite);
  return new PrismaClient({ adapter } as never);
}

async function main() {
  const prisma = await getPrisma();

  const existing = await prisma.tenant.findUnique({ where: { code: 'MLJ001' } });
  if (existing) {
    console.log('Seed data already exists — skipping.');
    await prisma.$disconnect();
    return;
  }

  // ── Tenant ───────────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Mahalaxmi Jewellers',
      code: 'MLJ001',
      gstin: '27AABCM1234A1Z5',
      phone: '02024567890',
      email: 'info@mahalaxmijewellers.com',
      address: 'Shop No. 12, Laxmi Road',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411030',
      isActive: true,
      settings: { currency: 'INR', locale: 'en-IN', goldRateSource: 'MCX' },
    },
  });
  console.log('✓ Tenant:', tenant.name);

  // ── Branch ───────────────────────────────────────────────────────────────
  const branch = await prisma.branch.create({
    data: {
      tenantId: tenant.id,
      name: 'Main Branch – Pune',
      code: 'PUN-MAIN',
      gstin: '27AABCM1234A1Z5',
      phone: '02024567891',
      address: 'Shop No. 12, Laxmi Road, Pune',
      city: 'Pune',
      isActive: true,
    },
  });
  console.log('✓ Branch:', branch.name);

  // ── Users ────────────────────────────────────────────────────────────────
  const owner = await prisma.user.create({
    data: { tenantId: tenant.id, name: 'Rajesh Patil', mobile: '9876543210', role: 'OWNER', branchId: branch.id },
  });
  const manager = await prisma.user.create({
    data: { tenantId: tenant.id, name: 'Priya Sharma', mobile: '9876543211', role: 'MANAGER', branchId: branch.id },
  });
  const staff = await prisma.user.create({
    data: { tenantId: tenant.id, name: 'Amit Desai', mobile: '9876543212', role: 'STAFF', branchId: branch.id },
  });
  console.log('✓ Users: Owner, Manager, Staff');

  // ── Customers ────────────────────────────────────────────────────────────
  const [c1, c2, c3, c4, c5] = await Promise.all([
    prisma.customer.create({
      data: {
        tenantId: tenant.id, customerId: 'CUST-MLJ-0001',
        name: 'Suresh Kumar', mobile: '9765432100', email: 'suresh@example.com',
        dateOfBirth: new Date('1975-04-12'), gender: 'Male',
        address: '45, Shivaji Nagar', city: 'Pune', state: 'Maharashtra', pincode: '411005',
        aadhaarNumber: '1234-5678-9012', panNumber: 'ABCPK1234D',
        kycStatus: 'VERIFIED', kycVerifiedAt: new Date(), kycVerifiedBy: owner.id,
        totalGoldPledged: 26,
      },
    }),
    prisma.customer.create({
      data: {
        tenantId: tenant.id, customerId: 'CUST-MLJ-0002',
        name: 'Meena Patil', mobile: '9765432101', email: 'meena@example.com',
        dateOfBirth: new Date('1982-09-23'), gender: 'Female',
        address: '12, Kothrud', city: 'Pune', state: 'Maharashtra', pincode: '411038',
        aadhaarNumber: '2345-6789-0123', panNumber: 'BCDPL5678E',
        kycStatus: 'VERIFIED', kycVerifiedAt: new Date(), kycVerifiedBy: owner.id,
        totalGoldPledged: 45,
      },
    }),
    prisma.customer.create({
      data: {
        tenantId: tenant.id, customerId: 'CUST-MLJ-0003',
        name: 'Ramesh Joshi', mobile: '9765432102', gender: 'Male',
        address: '8, Deccan Gymkhana', city: 'Pune', state: 'Maharashtra', pincode: '411004',
        aadhaarNumber: '3456-7890-1234',
        kycStatus: 'VERIFIED', kycVerifiedAt: new Date(), kycVerifiedBy: manager.id,
        totalGoldPledged: 20,
      },
    }),
    prisma.customer.create({
      data: {
        tenantId: tenant.id, customerId: 'CUST-MLJ-0004',
        name: 'Sunita Devi', mobile: '9765432103', gender: 'Female',
        address: '33, Hadapsar', city: 'Pune', state: 'Maharashtra', pincode: '411028',
        aadhaarNumber: '4567-8901-2345',
        kycStatus: 'VERIFIED', kycVerifiedAt: new Date(), kycVerifiedBy: manager.id,
        totalGoldPledged: 0,
      },
    }),
    prisma.customer.create({
      data: {
        tenantId: tenant.id, customerId: 'CUST-MLJ-0005',
        name: 'Vikram Singh', mobile: '9765432104', gender: 'Male',
        address: '21, Viman Nagar', city: 'Pune', state: 'Maharashtra', pincode: '411014',
        kycStatus: 'PENDING', totalGoldPledged: 0,
      },
    }),
  ]);
  console.log('✓ Customers: 5 created');

  // ── Interest Configs ──────────────────────────────────────────────────────
  await Promise.all([
    prisma.interestConfig.create({
      data: {
        tenantId: tenant.id, interestType: 'SIMPLE',
        ratePerMonth: 1.5, penaltyRate: 0.5, thresholdDays: 15,
        effectiveFrom: new Date('2025-01-01'), createdBy: owner.id,
      },
    }),
    prisma.interestConfig.create({
      data: {
        tenantId: tenant.id, interestType: 'KATMITI',
        ratePerMonth: 2.0, penaltyRate: 0.5, thresholdDays: 15,
        effectiveFrom: new Date('2025-01-01'), createdBy: owner.id,
      },
    }),
  ]);
  console.log('✓ Interest configs: Simple 1.5%/month, Katmiti 2%/month');

  // ── Gold Rates ────────────────────────────────────────────────────────────
  await prisma.goldRate.createMany({
    data: [
      { tenantId: tenant.id, metalType: 'GOLD',   purity: '22K', ratePerGram: 6850, source: 'MCX', fetchedAt: new Date() },
      { tenantId: tenant.id, metalType: 'GOLD',   purity: '18K', ratePerGram: 5607, source: 'MCX', fetchedAt: new Date() },
      { tenantId: tenant.id, metalType: 'GOLD',   purity: '14K', ratePerGram: 4339, source: 'MCX', fetchedAt: new Date() },
      { tenantId: tenant.id, metalType: 'SILVER', purity: '925', ratePerGram: 85,   source: 'MCX', fetchedAt: new Date() },
    ],
  });
  console.log('✓ Gold rates: 22K ₹6850/g, 18K ₹5607/g, Silver ₹85/g');

  // ── Vault Hierarchy ───────────────────────────────────────────────────────
  const vault = await prisma.vault.create({
    data: { tenantId: tenant.id, branchId: branch.id, name: 'Main Vault', location: 'Ground Floor – Behind Counter' },
  });
  const safe = await prisma.vaultSafe.create({
    data: { tenantId: tenant.id, vaultId: vault.id, name: 'Safe A' },
  });
  const tray = await prisma.vaultTray.create({
    data: { tenantId: tenant.id, safeId: safe.id, name: 'Tray 1' },
  });
  await prisma.vaultSlot.createMany({
    data: Array.from({ length: 20 }, (_, i) => ({
      tenantId: tenant.id,
      trayId: tray.id,
      slotNumber: `S${String(i + 1).padStart(2, '0')}`,
      status: 'AVAILABLE' as const,
    })),
  });
  const slots = await prisma.vaultSlot.findMany({ where: { trayId: tray.id }, orderBy: { slotNumber: 'asc' } });
  console.log('✓ Vault: Main Vault → Safe A → Tray 1 → 20 slots');

  // ── Inventory Categories & Items ──────────────────────────────────────────
  const [catNecklace, catRings, catBangles, catEarrings, catSilver] = await Promise.all([
    prisma.inventoryCategory.create({ data: { tenantId: tenant.id, name: 'Necklaces',    hsnCode: '7113', metalType: 'GOLD',   gstRate: 3 } }),
    prisma.inventoryCategory.create({ data: { tenantId: tenant.id, name: 'Rings',        hsnCode: '7113', metalType: 'GOLD',   gstRate: 3 } }),
    prisma.inventoryCategory.create({ data: { tenantId: tenant.id, name: 'Bangles',      hsnCode: '7113', metalType: 'GOLD',   gstRate: 3 } }),
    prisma.inventoryCategory.create({ data: { tenantId: tenant.id, name: 'Earrings',     hsnCode: '7113', metalType: 'GOLD',   gstRate: 3 } }),
    prisma.inventoryCategory.create({ data: { tenantId: tenant.id, name: 'Silver Items', hsnCode: '7114', metalType: 'SILVER', gstRate: 3 } }),
  ]);

  await Promise.all([
    prisma.inventoryItem.create({
      data: {
        tenantId: tenant.id, branchId: branch.id, categoryId: catNecklace.id,
        sku: 'GN-22K-001', name: 'Lakshmi Gold Necklace', metalType: 'GOLD', purity: '22K',
        grossWeight: 32.5, netWeight: 30.2, stoneWeight: 2.3,
        makingCharges: 4500, wastage: 2.5,
        huId: 'HUID-NL001', bisNumber: 'BIS-22K-2025-001',
        currentValue: 206870, purchaseCost: 195000, quantity: 1, reorderLevel: 1,
        createdBy: owner.id,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        tenantId: tenant.id, branchId: branch.id, categoryId: catRings.id,
        sku: 'GR-22K-001', name: 'Classic Gold Ring', metalType: 'GOLD', purity: '22K',
        grossWeight: 6.8, netWeight: 6.5, stoneWeight: 0.3,
        makingCharges: 800, wastage: 2.0,
        huId: 'HUID-RG001', bisNumber: 'BIS-22K-2025-002',
        currentValue: 45523, purchaseCost: 42000, quantity: 3, reorderLevel: 2,
        createdBy: owner.id,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        tenantId: tenant.id, branchId: branch.id, categoryId: catBangles.id,
        sku: 'GB-22K-001', name: 'Plain Gold Bangles (Pair)', metalType: 'GOLD', purity: '22K',
        grossWeight: 22.0, netWeight: 22.0, stoneWeight: 0,
        makingCharges: 2200, wastage: 1.5,
        huId: 'HUID-BG001', bisNumber: 'BIS-22K-2025-003',
        currentValue: 150700, purchaseCost: 140000, quantity: 2, reorderLevel: 1,
        createdBy: owner.id,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        tenantId: tenant.id, branchId: branch.id, categoryId: catEarrings.id,
        sku: 'GE-18K-001', name: 'Diamond Drop Earrings', metalType: 'GOLD', purity: '18K',
        grossWeight: 5.4, netWeight: 4.8, stoneWeight: 0.6,
        makingCharges: 1200, wastage: 2.0,
        huId: 'HUID-ER001', bisNumber: 'BIS-18K-2025-001',
        currentValue: 28953, purchaseCost: 26000, quantity: 1, reorderLevel: 1,
        createdBy: owner.id,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        tenantId: tenant.id, branchId: branch.id, categoryId: catSilver.id,
        sku: 'SB-925-001', name: 'Silver Bracelet 925', metalType: 'SILVER', purity: '925',
        grossWeight: 18.5, netWeight: 18.5, stoneWeight: 0,
        makingCharges: 300, wastage: 1.0,
        currentValue: 1743, purchaseCost: 1500, quantity: 5, reorderLevel: 3,
        createdBy: owner.id,
      },
    }),
  ]);
  console.log('✓ Inventory: 5 categories, 5 items');

  // ── Girvi Records ─────────────────────────────────────────────────────────

  // GRV-0001: ACTIVE — Suresh Kumar, Gold Necklace
  const g1 = await prisma.girvi.create({
    data: {
      tenantId: tenant.id, girviNumber: 'GRV/2025-26/0001',
      customerId: c1.id, branchId: branch.id, status: 'ACTIVE',
      goldRateAtCreation: 6850, principalAmount: 122280, ltv: 75,
      interestRate: 1.5, interestType: 'SIMPLE', tenureMonths: 6,
      startDate: months(-3), dueDate: months(3),
      totalGrossWeight: 28, totalNetWeight: 26, totalFineWeight: 23.816, totalValuation: 163040,
      kfsGenerated: true, kfsAcknowledgedAt: months(-3), disbursedAt: months(-3),
      createdBy: owner.id,
      items: {
        create: {
          tenantId: tenant.id, itemName: 'Gold Necklace', metalType: 'GOLD', purity: '22K',
          grossWeight: 28, netWeight: 26, fineWeight: 23.816, stoneWeight: 2,
          valuation: 163040, photoUrls: [], description: 'Traditional gold necklace with stone setting',
        },
      },
    },
  });
  await prisma.vaultSlot.update({ where: { id: slots[0].id }, data: { status: 'OCCUPIED' } });
  await prisma.vaultAssignment.create({
    data: { tenantId: tenant.id, girviId: g1.id, slotId: slots[0].id, assignedBy: owner.id },
  });
  await prisma.girviPayment.create({
    data: {
      tenantId: tenant.id, girviId: g1.id, paymentDate: months(-1),
      principalPaid: 0, interestPaid: 3668.4, penaltyPaid: 0, totalPaid: 3668.4,
      paymentMode: 'CASH', receiptNumber: 'RCP/2025-26/0001', recordedBy: staff.id,
      notes: 'Interest payment for 2 months',
    },
  });

  // GRV-0002: PARTIAL_PAID — Meena Patil, Gold Bangles
  const g2 = await prisma.girvi.create({
    data: {
      tenantId: tenant.id, girviNumber: 'GRV/2025-26/0002',
      customerId: c2.id, branchId: branch.id, status: 'PARTIAL_PAID',
      goldRateAtCreation: 6820, principalAmount: 211768, ltv: 75,
      interestRate: 1.5, interestType: 'SIMPLE', tenureMonths: 6,
      startDate: months(-5), dueDate: months(1),
      totalGrossWeight: 45, totalNetWeight: 45, totalFineWeight: 41.22, totalValuation: 281120,
      kfsGenerated: true, kfsAcknowledgedAt: months(-5), disbursedAt: months(-5),
      createdBy: owner.id,
      items: {
        create: {
          tenantId: tenant.id, itemName: 'Gold Bangles Set (4 pcs)', metalType: 'GOLD', purity: '22K',
          grossWeight: 45, netWeight: 45, fineWeight: 41.22, stoneWeight: 0,
          valuation: 281120, photoUrls: [], description: 'Plain gold bangles set',
        },
      },
    },
  });
  await prisma.vaultSlot.update({ where: { id: slots[1].id }, data: { status: 'OCCUPIED' } });
  await prisma.vaultAssignment.create({
    data: { tenantId: tenant.id, girviId: g2.id, slotId: slots[1].id, assignedBy: manager.id },
  });
  await prisma.girviPayment.create({
    data: {
      tenantId: tenant.id, girviId: g2.id, paymentDate: months(-2),
      principalPaid: 50000, interestPaid: 15882.6, penaltyPaid: 0, totalPaid: 65882.6,
      paymentMode: 'UPI', receiptNumber: 'RCP/2025-26/0002', recordedBy: staff.id,
      notes: 'Partial principal + 5 months interest',
    },
  });

  // GRV-0003: OVERDUE — Ramesh Joshi, Gold Chain
  const g3 = await prisma.girvi.create({
    data: {
      tenantId: tenant.id, girviNumber: 'GRV/2025-26/0003',
      customerId: c3.id, branchId: branch.id, status: 'OVERDUE',
      goldRateAtCreation: 6700, principalAmount: 94119, ltv: 75,
      interestRate: 1.5, interestType: 'SIMPLE', tenureMonths: 6,
      startDate: months(-8), dueDate: months(-2),
      totalGrossWeight: 20, totalNetWeight: 20, totalFineWeight: 18.32, totalValuation: 122744,
      kfsGenerated: true, kfsAcknowledgedAt: months(-8), disbursedAt: months(-8),
      notes: 'Customer not reachable since due date. Auction notice sent.',
      createdBy: manager.id,
      items: {
        create: {
          tenantId: tenant.id, itemName: 'Gold Chain', metalType: 'GOLD', purity: '22K',
          grossWeight: 20, netWeight: 20, fineWeight: 18.32, stoneWeight: 0,
          valuation: 122744, photoUrls: [], description: 'Plain gold chain 22K',
        },
      },
    },
  });
  await prisma.vaultSlot.update({ where: { id: slots[2].id }, data: { status: 'OCCUPIED' } });
  await prisma.vaultAssignment.create({
    data: { tenantId: tenant.id, girviId: g3.id, slotId: slots[2].id, assignedBy: manager.id },
  });

  // GRV-0004: REDEEMED — Sunita Devi, Gold Earrings
  const g4 = await prisma.girvi.create({
    data: {
      tenantId: tenant.id, girviNumber: 'GRV/2025-26/0004',
      customerId: c4.id, branchId: branch.id, status: 'REDEEMED',
      goldRateAtCreation: 6750, principalAmount: 37575, ltv: 75,
      interestRate: 1.5, interestType: 'SIMPLE', tenureMonths: 3,
      startDate: months(-6), dueDate: months(-3), closedDate: months(-1),
      totalGrossWeight: 8, totalNetWeight: 8, totalFineWeight: 7.328, totalValuation: 49464,
      kfsGenerated: true, kfsAcknowledgedAt: months(-6), disbursedAt: months(-6),
      createdBy: staff.id,
      items: {
        create: {
          tenantId: tenant.id, itemName: 'Gold Earrings', metalType: 'GOLD', purity: '22K',
          grossWeight: 8, netWeight: 8, fineWeight: 7.328, stoneWeight: 0,
          valuation: 49464, photoUrls: [], description: 'Gold drop earrings 22K', status: 'RELEASED',
        },
      },
    },
  });
  await prisma.vaultAssignment.create({
    data: {
      tenantId: tenant.id, girviId: g4.id, slotId: slots[3].id,
      assignedBy: staff.id, releasedAt: months(-1), releasedBy: owner.id,
    },
  });
  await prisma.girviPayment.create({
    data: {
      tenantId: tenant.id, girviId: g4.id, paymentDate: months(-1),
      principalPaid: 37575, interestPaid: 3381.75, penaltyPaid: 0, totalPaid: 40956.75,
      paymentMode: 'CASH', receiptNumber: 'RCP/2025-26/0003', recordedBy: owner.id,
      notes: 'Full redemption – principal + 6 months interest',
    },
  });
  console.log('✓ Girvise: Active ×2, Partial Paid ×1, Overdue ×1, Redeemed ×1');

  // ── Expense Categories & Expenses ─────────────────────────────────────────
  const [expRent, expElec, , expMkt] = await Promise.all([
    prisma.expenseCategory.create({ data: { tenantId: tenant.id, name: 'Shop Rent' } }),
    prisma.expenseCategory.create({ data: { tenantId: tenant.id, name: 'Electricity' } }),
    prisma.expenseCategory.create({ data: { tenantId: tenant.id, name: 'Staff Salary' } }),
    prisma.expenseCategory.create({ data: { tenantId: tenant.id, name: 'Marketing' } }),
  ]);
  await Promise.all([
    prisma.expense.create({
      data: {
        tenantId: tenant.id, categoryId: expRent.id, branchId: branch.id,
        title: 'Monthly Shop Rent – June 2026', amount: 35000,
        paymentMode: 'BANK_TRANSFER', expenseDate: new Date('2026-06-01'),
        status: 'APPROVED', submittedBy: manager.id, approvedBy: owner.id, approvedAt: new Date('2026-06-01'),
        isRecurring: true, recurringDay: 1, notes: 'Rent for Shop No. 12, Laxmi Road',
      },
    }),
    prisma.expense.create({
      data: {
        tenantId: tenant.id, categoryId: expElec.id, branchId: branch.id,
        title: 'Electricity Bill – May 2026', amount: 4800,
        paymentMode: 'UPI', expenseDate: new Date('2026-06-05'),
        status: 'PAID', submittedBy: staff.id, approvedBy: manager.id, approvedAt: new Date('2026-06-05'),
      },
    }),
    prisma.expense.create({
      data: {
        tenantId: tenant.id, categoryId: expMkt.id, branchId: branch.id,
        title: 'Diwali Campaign – Sakal Newspaper Ad', amount: 12000,
        paymentMode: 'CHEQUE', expenseDate: new Date('2026-06-20'),
        status: 'PENDING', submittedBy: manager.id,
        notes: 'Full page ad for Diwali collection launch',
      },
    }),
  ]);
  console.log('✓ Expenses: Rent (Approved), Electricity (Paid), Marketing (Pending)');

  // ── Vendor ────────────────────────────────────────────────────────────────
  await prisma.vendor.create({
    data: {
      tenantId: tenant.id, name: 'Rajhans Gold Suppliers',
      contactName: 'Dilip Mehta', mobile: '9822334455', email: 'dilip@rajhansgold.com',
      gstin: '27AABCR5678B1Z3', address: 'Zaveri Bazaar, Mumbai',
      bankAccount: '1234567890', bankIfsc: 'HDFC0001234',
    },
  });
  console.log('✓ Vendor: Rajhans Gold Suppliers');

  // ── Karigar ───────────────────────────────────────────────────────────────
  await prisma.karigar.create({
    data: {
      tenantId: tenant.id, name: 'Mohan Soni', mobile: '9833221100',
      specialization: 'Gold Jewellery Making',
      ratePerGram: 180, ratePerPiece: 500,
      aadhaarNumber: '5678-9012-3456', address: 'Kasba Peth, Pune',
    },
  });
  console.log('✓ Karigar: Mohan Soni');

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n✅ Database seeded successfully!\n');
  console.log('Login credentials (mobile → OTP flow):');
  console.log('  OWNER   : Rajesh Patil   | 9876543210');
  console.log('  MANAGER : Priya Sharma   | 9876543211');
  console.log('  STAFF   : Amit Desai     | 9876543212');
  console.log('\nGirvi numbers to test:');
  console.log('  Active        : GRV/2025-26/0001  (Suresh Kumar  – Gold Necklace)');
  console.log('  Partial Paid  : GRV/2025-26/0002  (Meena Patil   – Gold Bangles)');
  console.log('  Overdue       : GRV/2025-26/0003  (Ramesh Joshi  – Gold Chain)');
  console.log('  Redeemed      : GRV/2025-26/0004  (Sunita Devi   – Gold Earrings)');
  console.log('\nSwagger: http://localhost:3000/api/docs');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
