import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { PrismaService } from '../../database/prisma.service';
import dayjs from 'dayjs';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async getDashboardSummary(tenantId: string) {
    const cacheKey = `dashboard:summary:${tenantId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const today = dayjs().startOf('day').toDate();
    const monthStart = dayjs().startOf('month').toDate();

    const [
      totalGirvis, activeGirvis, overdueGirvis,
      todaySales, monthSales,
      openRepairs, pendingExpenses,
      openJobCards, lowStockCount,
    ] = await this.prisma.$transaction([
      this.prisma.girvi.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.girvi.count({ where: { tenantId, deletedAt: null, status: 'ACTIVE' as never } }),
      this.prisma.girvi.count({ where: { tenantId, deletedAt: null, status: 'OVERDUE' as never } }),
      this.prisma.sale.aggregate({
        where: { tenantId, deletedAt: null, createdAt: { gte: today } },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      this.prisma.sale.aggregate({
        where: { tenantId, deletedAt: null, createdAt: { gte: monthStart } },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      this.prisma.repair.count({ where: { tenantId, deletedAt: null, status: { notIn: ['DELIVERED', 'CANCELLED'] as never[] } } }),
      this.prisma.expense.count({ where: { tenantId, deletedAt: null, status: 'PENDING' as never } }),
      this.prisma.jobCard.count({ where: { tenantId, deletedAt: null, status: { not: 'COMPLETED' as never } } }),
      this.prisma.inventoryItem.count({ where: { tenantId, deletedAt: null } }),
    ]);

    const summary = {
      girvi: { total: totalGirvis, active: activeGirvis, overdue: overdueGirvis },
      sales: {
        today: { amount: Number(todaySales._sum.totalAmount ?? 0), count: todaySales._count.id },
        month: { amount: Number(monthSales._sum.totalAmount ?? 0), count: monthSales._count.id },
      },
      repairs: { open: openRepairs },
      expenses: { pendingApproval: pendingExpenses },
      karigar: { openJobCards },
      inventory: { totalItems: lowStockCount },
      generatedAt: new Date().toISOString(),
    };

    await this.redis.setex(cacheKey, 120, JSON.stringify(summary));
    return summary;
  }

  async getSalesTrend(tenantId: string, days: number = 30) {
    const cacheKey = `dashboard:sales-trend:${tenantId}:${days}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const fromDate = dayjs().subtract(days, 'day').startOf('day').toDate();
    const sales = await this.prisma.sale.findMany({
      where: { tenantId, deletedAt: null, createdAt: { gte: fromDate } },
      select: { createdAt: true, totalAmount: true },
      orderBy: { createdAt: 'asc' },
    });

    const byDay: Record<string, { date: string; amount: number; count: number }> = {};
    for (const sale of sales) {
      const day = dayjs(sale.createdAt).format('YYYY-MM-DD');
      if (!byDay[day]) byDay[day] = { date: day, amount: 0, count: 0 };
      byDay[day].amount += Number(sale.totalAmount);
      byDay[day].count += 1;
    }

    const trend = Object.values(byDay);
    await this.redis.setex(cacheKey, 300, JSON.stringify(trend));
    return trend;
  }

  async getGirviPortfolioBreakdown(tenantId: string) {
    const cacheKey = `dashboard:girvi-portfolio:${tenantId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const [byStatus, portfolioValue] = await this.prisma.$transaction([
      this.prisma.girvi.groupBy({
        by: ['status'],
        where: { tenantId, deletedAt: null },
        _count: true,
        _sum: { principalAmount: true },
        orderBy: { _count: { status: 'desc' } },
      }),
      this.prisma.girvi.aggregate({
        where: { tenantId, deletedAt: null, status: { in: ['ACTIVE', 'PARTIAL_PAID', 'OVERDUE'] as never[] } },
        _sum: { principalAmount: true },
      }),
    ]);

    const result = {
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count, principalValue: Number(s._sum?.principalAmount ?? 0) })),
      activePortfolioValue: Number(portfolioValue._sum?.principalAmount ?? 0),
    };
    await this.redis.setex(cacheKey, 300, JSON.stringify(result));
    return result;
  }

  async getTopKarigars(tenantId: string) {
    const jobs = await this.prisma.jobCard.groupBy({
      by: ['karigarId'],
      where: { tenantId, deletedAt: null, status: 'COMPLETED' as never },
      _count: true,
      _sum: { makingCharge: true },
      orderBy: { _sum: { makingCharge: 'desc' } },
      take: 10,
    });

    const karigarIds = jobs.map(j => j.karigarId);
    const karigars = await this.prisma.karigar.findMany({ where: { id: { in: karigarIds } }, select: { id: true, name: true } });
    const karigarMap = new Map(karigars.map(k => [k.id, k.name]));

    return jobs.map(j => ({ karigarId: j.karigarId, name: karigarMap.get(j.karigarId) ?? 'Unknown', completedJobs: j._count, totalMakingCharges: Number(j._sum.makingCharge ?? 0) }));
  }
}
