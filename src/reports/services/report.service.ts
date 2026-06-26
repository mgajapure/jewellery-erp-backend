import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import dayjs from 'dayjs';

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  async getGirviReport(tenantId: string, fromDate: string, toDate: string) {
    const dateFilter = { gte: new Date(fromDate), lte: new Date(toDate) };

    const [created, redeemed, auctioned, interestAgg] = await this.prisma.$transaction([
      this.prisma.girvi.count({ where: { tenantId, deletedAt: null, createdAt: dateFilter } }),
      this.prisma.girvi.count({ where: { tenantId, deletedAt: null, status: 'REDEEMED' as never, updatedAt: dateFilter } }),
      this.prisma.girvi.count({ where: { tenantId, deletedAt: null, status: 'AUCTIONED' as never, updatedAt: dateFilter } }),
      this.prisma.interestLedger.aggregate({
        where: { tenantId, calculatedAt: dateFilter },
        _sum: { interest: true, penalty: true },
      }),
    ]);

    const portfolio = await this.prisma.girvi.aggregate({
      where: { tenantId, deletedAt: null, status: { in: ['ACTIVE', 'PARTIAL_PAID', 'OVERDUE'] as never[] } },
      _sum: { principalAmount: true },
      _count: true,
    });

    return {
      period: { fromDate, toDate },
      newGirvis: created,
      redeemed,
      auctioned,
      totalInterestEarned: Number(interestAgg._sum?.interest ?? 0) + Number(interestAgg._sum?.penalty ?? 0),
      activePortfolio: {
        count: portfolio._count,
        principal: Number(portfolio._sum?.principalAmount ?? 0),
      },
    };
  }

  async getSalesReport(tenantId: string, fromDate: string, toDate: string) {
    const dateFilter = { gte: new Date(fromDate), lte: new Date(toDate) };

    const [salesAgg, byPaymentMode] = await this.prisma.$transaction([
      this.prisma.sale.aggregate({
        where: { tenantId, deletedAt: null, createdAt: dateFilter },
        _sum: { totalAmount: true, cgst: true, sgst: true },
        _count: true,
      }),
      this.prisma.salePayment.groupBy({
        by: ['mode'],
        where: { sale: { tenantId, deletedAt: null, createdAt: dateFilter } },
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } },
      }),
    ]);

    const itemsByMetal = await this.prisma.saleItem.findMany({
      where: { sale: { tenantId, deletedAt: null, createdAt: dateFilter } },
      include: { inventoryItem: { select: { metalType: true } } },
    });

    const metalBreakdown: Record<string, { count: number; revenue: number }> = {};
    for (const item of itemsByMetal) {
      const metal = item.inventoryItem.metalType;
      if (!metalBreakdown[metal]) metalBreakdown[metal] = { count: 0, revenue: 0 };
      metalBreakdown[metal].count++;
      metalBreakdown[metal].revenue += Number(item.totalAmount);
    }

    return {
      period: { fromDate, toDate },
      totalSales: salesAgg._count,
      totalRevenue: Number(salesAgg._sum?.totalAmount ?? 0),
      totalCgst: Number(salesAgg._sum?.cgst ?? 0),
      totalSgst: Number(salesAgg._sum?.sgst ?? 0),
      byMetalType: Object.entries(metalBreakdown).map(([metal, v]) => ({ metalType: metal, ...v })),
      byPaymentMode: byPaymentMode.map(p => ({ mode: p.mode, count: p._count, amount: Number(p._sum?.amount ?? 0) })),
    };
  }

  async getKarigarReport(tenantId: string, fromDate: string, toDate: string) {
    const dateFilter = { gte: new Date(fromDate), lte: new Date(toDate) };

    const jobs = await this.prisma.jobCard.findMany({
      where: { tenantId, deletedAt: null, createdAt: dateFilter },
      include: { karigar: { select: { name: true } } },
    });

    const byKarigar: Record<string, any> = {};
    for (const job of jobs) {
      const key = job.karigarId;
      if (!byKarigar[key]) {
        byKarigar[key] = { karigarId: key, karigarName: job.karigar.name, totalJobs: 0, completedJobs: 0, totalMakingCharges: 0, totalIssuedWeight: 0, totalReceivedWeight: 0, wastageList: [] };
      }
      byKarigar[key].totalJobs++;
      if (job.status === 'COMPLETED') {
        byKarigar[key].completedJobs++;
        byKarigar[key].totalMakingCharges += Number(job.makingCharge ?? 0);
      }
      byKarigar[key].totalIssuedWeight += Number(job.issuedWeight);
      byKarigar[key].totalReceivedWeight += Number(job.receivedWeight);
      byKarigar[key].wastageList.push(Number(job.wastagePercent ?? 0));
    }

    const result = Object.values(byKarigar).map(k => ({
      karigarId: k.karigarId, karigarName: k.karigarName,
      totalJobs: k.totalJobs, completedJobs: k.completedJobs,
      totalMakingCharges: k.totalMakingCharges,
      totalIssuedWeight: k.totalIssuedWeight, totalReceivedWeight: k.totalReceivedWeight,
      avgWastage: k.wastageList.length ? parseFloat((k.wastageList.reduce((s: number, w: number) => s + w, 0) / k.wastageList.length).toFixed(2)) : 0,
    }));

    return { period: { fromDate, toDate }, byKarigar: result };
  }

  async getStockValuationReport(tenantId: string) {
    const items = await this.prisma.inventoryItem.findMany({
      where: { tenantId, deletedAt: null },
      select: { metalType: true, purity: true, quantity: true, netWeight: true, currentValue: true, makingCharges: true, category: { select: { name: true } } },
    });

    const summary: Record<string, { metalType: string; totalItems: number; totalWeight: number; totalValue: number }> = {};
    for (const item of items) {
      if (!summary[item.metalType]) summary[item.metalType] = { metalType: item.metalType, totalItems: 0, totalWeight: 0, totalValue: 0 };
      summary[item.metalType].totalItems += item.quantity;
      summary[item.metalType].totalWeight += Number(item.netWeight ?? 0);
      summary[item.metalType].totalValue += Number(item.currentValue ?? 0);
    }

    const totalValue = Object.values(summary).reduce((s, m) => s + m.totalValue, 0);
    return { generatedAt: new Date().toISOString(), byMetalType: Object.values(summary), totalStockValue: totalValue };
  }

  async getGstr1Data(tenantId: string, year: number, month: number) {
    const from = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).toDate();
    const to = dayjs(from).endOf('month').toDate();

    const sales = await this.prisma.sale.findMany({
      where: { tenantId, deletedAt: null, createdAt: { gte: from, lte: to } },
      include: { items: true, customer: { select: { name: true, mobile: true } } },
    });

    const hsnSummary: Record<string, any> = {};
    for (const sale of sales) {
      for (const item of sale.items) {
        const hsn = item.hsnCode ?? '7113';
        if (!hsnSummary[hsn]) hsnSummary[hsn] = { hsnCode: hsn, totalTaxableValue: 0, totalCgst: 0, totalSgst: 0 };
        hsnSummary[hsn].totalTaxableValue += Number(item.totalAmount) - Number(item.gstAmount);
        hsnSummary[hsn].totalCgst += Number(item.gstAmount) / 2;
        hsnSummary[hsn].totalSgst += Number(item.gstAmount) / 2;
      }
    }

    return {
      period: { year, month },
      invoices: sales.map(s => ({
        billNumber: s.billNumber,
        date: s.saleDate,
        customerName: s.customer?.name,
        taxableValue: Number(s.subTotal),
        cgst: Number(s.cgst),
        sgst: Number(s.sgst),
        total: Number(s.totalAmount),
      })),
      hsnSummary: Object.values(hsnSummary),
    };
  }
}
