import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { paginate, buildPaginatedResult } from '../../common/utils/pagination';
import { AdjustPointsDto, LoyaltyQueryDto } from '../dto/loyalty.dto';

// Tier thresholds (lifetime points)
const TIER_THRESHOLDS: Record<string, number> = { BRONZE: 0, SILVER: 5000, GOLD: 25000, PLATINUM: 100000 };

// Points earned per ₹ spent (purchase/sale)
const POINTS_PER_RUPEE = 1; // 1 point per ₹100 spent

function getTier(lifetimePoints: number): string {
  if (lifetimePoints >= TIER_THRESHOLDS.PLATINUM) return 'PLATINUM';
  if (lifetimePoints >= TIER_THRESHOLDS.GOLD) return 'GOLD';
  if (lifetimePoints >= TIER_THRESHOLDS.SILVER) return 'SILVER';
  return 'BRONZE';
}

@Injectable()
export class LoyaltyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getOrCreateAccount(tenantId: string, customerId: string) {
    const existing = await this.prisma.loyaltyAccount.findUnique({ where: { customerId } });
    if (existing) return existing;

    return this.prisma.loyaltyAccount.create({
      data: { tenantId, customerId },
    });
  }

  async getAccount(tenantId: string, customerId: string) {
    const account = await this.prisma.loyaltyAccount.findFirst({
      where: { tenantId, customerId },
      include: { transactions: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (!account) throw new NotFoundException('Loyalty account not found');
    return account;
  }

  // Called by sale completion — earn points
  async earnPointsOnSale(tenantId: string, customerId: string, saleAmount: number, saleId: string) {
    const points = Math.floor(saleAmount / 100) * POINTS_PER_RUPEE;
    if (points === 0) return null;
    return this.adjustPoints(tenantId, customerId, {
      type: 'EARN',
      points,
      description: `Earned on sale ₹${saleAmount.toFixed(2)}`,
      referenceId: saleId,
      referenceType: 'Sale',
    });
  }

  async adjustPoints(tenantId: string, customerId: string, dto: AdjustPointsDto) {
    let account = await this.prisma.loyaltyAccount.findFirst({ where: { tenantId, customerId } });
    if (!account) account = await this.getOrCreateAccount(tenantId, customerId);

    const isDebit = ['REDEEM', 'EXPIRE'].includes(dto.type);
    const pointsDelta = isDebit ? -dto.points : dto.points;

    if (isDebit && account.points < dto.points) {
      throw new BadRequestException(`Insufficient loyalty points. Available: ${account.points}, Requested: ${dto.points}`);
    }

    const newPoints = account.points + pointsDelta;
    const newLifetime = dto.type === 'EARN' || dto.type === 'BONUS' ? account.lifetimePoints + dto.points : account.lifetimePoints;
    const newTier = getTier(newLifetime) as never;
    const tierChanged = newTier !== account.tier;

    const [transaction, updatedAccount] = await this.prisma.$transaction([
      this.prisma.loyaltyTransaction.create({
        data: { tenantId, accountId: account.id, type: dto.type as never, points: pointsDelta, description: dto.description, referenceId: dto.referenceId, referenceType: dto.referenceType },
      }),
      this.prisma.loyaltyAccount.update({
        where: { id: account.id },
        data: { points: newPoints, lifetimePoints: newLifetime, tier: newTier },
      }),
    ]);

    if (tierChanged) {
      this.eventEmitter.emit('loyalty.tier.upgraded', { tenantId, customerId, fromTier: account.tier, toTier: newTier });
    }

    return { transaction, account: updatedAccount };
  }

  async getTransactionHistory(tenantId: string, customerId: string, query: LoyaltyQueryDto) {
    const account = await this.prisma.loyaltyAccount.findFirst({ where: { tenantId, customerId } });
    if (!account) return { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };

    const { skip, take } = paginate(query);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.loyaltyTransaction.findMany({ where: { accountId: account.id, tenantId }, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.loyaltyTransaction.count({ where: { accountId: account.id, tenantId } }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  async findAllAccounts(tenantId: string, query: LoyaltyQueryDto) {
    const where: any = {
      tenantId,
      ...(query.tier && { tier: query.tier as never }),
    };
    const { skip, take } = paginate(query);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.loyaltyAccount.findMany({
        where, skip, take,
        orderBy: { lifetimePoints: 'desc' },
        include: { customer: { select: { id: true, name: true, mobile: true, customerId: true } } },
      }),
      this.prisma.loyaltyAccount.count({ where }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  async getTierReport(tenantId: string) {
    return this.prisma.loyaltyAccount.groupBy({
      by: ['tier'],
      where: { tenantId },
      _count: true,
      _sum: { points: true, lifetimePoints: true },
      orderBy: { _count: { tier: 'desc' } },
    });
  }

  // Expire points older than 1 year — runs daily at midnight
  @Cron('0 0 * * *')
  async expireOldPoints() {
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const expiring = await this.prisma.loyaltyTransaction.findMany({
      where: { type: 'EARN', expiresAt: { lt: new Date(), gt: oneYearAgo }, createdAt: { lt: oneYearAgo } },
      select: { id: true, tenantId: true, accountId: true, points: true },
    });

    for (const tx of expiring) {
      const account = await this.prisma.loyaltyAccount.findUnique({ where: { id: tx.accountId } });
      if (!account || account.points <= 0) continue;
      const pointsToExpire = Math.min(Math.abs(tx.points), account.points);
      await this.prisma.$transaction([
        this.prisma.loyaltyTransaction.create({ data: { tenantId: tx.tenantId, accountId: tx.accountId, type: 'EXPIRE', points: -pointsToExpire, description: 'Points expired (1 year old)' } }),
        this.prisma.loyaltyAccount.update({ where: { id: tx.accountId }, data: { points: { decrement: pointsToExpire } } }),
      ]);
    }
  }
}
