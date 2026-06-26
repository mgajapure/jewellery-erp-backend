import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import dayjs from 'dayjs';

export interface InterestBreakdown {
  principal: number;
  days: number;
  rate: number;
  interest: number;
  penalty: number;
  total: number;
  type: string;
}

@Injectable()
export class InterestService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Simple interest: P × R × D / (365 × 100)
   */
  calculateSimple(principal: number, ratePerMonth: number, days: number): number {
    const dailyRate = ratePerMonth / 30;
    return parseFloat(((principal * dailyRate * days) / 100).toFixed(2));
  }

  /**
   * Katmiti: each partial payment resets the principal base going forward.
   * The interest period stops at the payment date for the paid portion.
   */
  calculateKatmiti(
    principal: number,
    ratePerMonth: number,
    days: number,
    partialPayments: { date: Date; amount: number }[] = [],
  ): number {
    let totalInterest = 0;
    let currentPrincipal = principal;
    let lastDate = dayjs().subtract(days, 'day');

    const sorted = [...partialPayments].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    for (const payment of sorted) {
      const paymentDate = dayjs(payment.date);
      const daysInPeriod = paymentDate.diff(lastDate, 'day');
      if (daysInPeriod > 0) {
        const effectiveDays = this.applyThreshold(daysInPeriod);
        totalInterest += this.calculateSimple(currentPrincipal, ratePerMonth, effectiveDays);
      }
      currentPrincipal -= payment.amount;
      if (currentPrincipal < 0) currentPrincipal = 0;
      lastDate = paymentDate;
    }

    // Remaining principal for remaining days
    const remainingDays = dayjs().diff(lastDate, 'day');
    if (remainingDays > 0 && currentPrincipal > 0) {
      const effectiveDays = this.applyThreshold(remainingDays);
      totalInterest += this.calculateSimple(currentPrincipal, ratePerMonth, effectiveDays);
    }

    return parseFloat(totalInterest.toFixed(2));
  }

  /**
   * Threshold billing: days 1–15 in a month are billed as a full month.
   */
  applyThreshold(days: number, thresholdDays = 15): number {
    const fullMonths = Math.floor(days / 30);
    const remainder = days % 30;
    const billedRemainder = remainder > 0 && remainder <= thresholdDays ? 30 : remainder;
    return fullMonths * 30 + billedRemainder;
  }

  async getActiveConfig(tenantId: string) {
    return this.prisma.interestConfig.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async calculateForGirvi(girviId: string, tenantId: string): Promise<InterestBreakdown> {
    const girvi = await this.prisma.girvi.findFirstOrThrow({
      where: { id: girviId, tenantId },
      include: { payments: { orderBy: { paymentDate: 'asc' } } },
    });

    const config = await this.getActiveConfig(tenantId);
    const ratePerMonth = config ? Number(config.ratePerMonth) : Number(girvi.interestRate);
    const penaltyRate = config ? Number(config.penaltyRate) : 0;
    const thresholdDays = config ? config.thresholdDays : 15;

    const startDate = dayjs(girvi.startDate);
    const today = dayjs();
    const totalDays = today.diff(startDate, 'day');
    const dueDate = dayjs(girvi.dueDate);
    const isOverdue = today.isAfter(dueDate);

    const principal = Number(girvi.principalAmount);
    let interest = 0;
    let penalty = 0;

    if (girvi.interestType === 'KATMITI') {
      const partialPayments = girvi.payments.map((p) => ({
        date: p.paymentDate,
        amount: Number(p.principalPaid),
      }));
      interest = this.calculateKatmiti(principal, ratePerMonth, totalDays, partialPayments);
    } else if (girvi.interestType === 'SIMPLE') {
      const effectiveDays = this.applyThreshold(totalDays, thresholdDays);
      interest = this.calculateSimple(principal, ratePerMonth, effectiveDays);
    } else {
      // DAILY
      interest = this.calculateSimple(principal, ratePerMonth, totalDays);
    }

    if (isOverdue) {
      const overdueDays = today.diff(dueDate, 'day');
      penalty = this.calculateSimple(principal, penaltyRate, overdueDays);
    }

    const paidInterest = girvi.payments.reduce((s, p) => s + Number(p.interestPaid), 0);
    const outstanding = Math.max(0, interest - paidInterest);

    return {
      principal,
      days: totalDays,
      rate: ratePerMonth,
      interest: outstanding,
      penalty,
      total: outstanding + penalty,
      type: girvi.interestType,
    };
  }
}
