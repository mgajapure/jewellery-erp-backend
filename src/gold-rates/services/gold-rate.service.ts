import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { PrismaService } from '../../database/prisma.service';

const GOLD_RATE_CACHE_KEY = 'gold:rate:live';
const RATE_CACHE_TTL = 300; // 5 minutes

@Injectable()
export class GoldRateService {
  private readonly logger = new Logger(GoldRateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async getCurrentRate(metalType: string = 'GOLD', purity: string = '24K') {
    const cacheKey = `${GOLD_RATE_CACHE_KEY}:${metalType}:${purity}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const rate = await this.prisma.goldRate.findFirst({
      where: { metalType: metalType as never, purity },
      orderBy: { fetchedAt: 'desc' },
    });
    if (rate) {
      await this.redis.setex(cacheKey, RATE_CACHE_TTL, JSON.stringify(rate));
    }
    return rate;
  }

  async getRateHistory(metalType: string, purity: string, days: number = 7) {
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.prisma.goldRate.findMany({
      where: { metalType: metalType as never, purity, fetchedAt: { gte: fromDate } },
      orderBy: { fetchedAt: 'asc' },
      select: { ratePerGram: true, fetchedAt: true, source: true },
    });
  }

  async setManualRate(metalType: string, purity: string, ratePerGram: number, source: string = 'MANUAL') {
    const rate = await this.prisma.goldRate.create({
      data: { metalType: metalType as never, purity, ratePerGram, source, fetchedAt: new Date() },
    });

    const cacheKey = `${GOLD_RATE_CACHE_KEY}:${metalType}:${purity}`;
    await this.redis.setex(cacheKey, RATE_CACHE_TTL, JSON.stringify(rate));

    this.eventEmitter.emit('gold.rate.updated', { metalType, purity, ratePerGram, source });
    return rate;
  }

  async checkThresholdAlerts(tenantId: string, alertThresholds: { metalType: string; purity: string; threshold: number }[]) {
    const alerts: Array<{ metalType: string; purity: string; currentRate: number; threshold: number; breach: boolean }> = [];

    for (const t of alertThresholds) {
      const rate = await this.getCurrentRate(t.metalType, t.purity);
      if (rate) {
        const currentRate = Number(rate.ratePerGram);
        alerts.push({ metalType: t.metalType, purity: t.purity, currentRate, threshold: t.threshold, breach: currentRate >= t.threshold });
      }
    }

    const breaches = alerts.filter(a => a.breach);
    if (breaches.length > 0) {
      this.eventEmitter.emit('gold.rate.threshold.breach', { tenantId, breaches });
    }

    return alerts;
  }

  // Fetch rates during market hours (Mon-Sat 9 AM to 6 PM IST)
  @Cron('0 9-18 * * 1-6')
  async fetchLiveRates() {
    // In production, call MCX API here. Using simulated rates for scaffold.
    const rates = [
      { metalType: 'GOLD', purity: '24K', ratePerGram: 7200 },
      { metalType: 'GOLD', purity: '22K', ratePerGram: 6600 },
      { metalType: 'GOLD', purity: '18K', ratePerGram: 5400 },
      { metalType: 'SILVER', purity: '999', ratePerGram: 90 },
    ];

    for (const r of rates) {
      try {
        await this.prisma.goldRate.create({
          data: { metalType: r.metalType as never, purity: r.purity, ratePerGram: r.ratePerGram, source: 'MCX', fetchedAt: new Date() },
        });
        const cacheKey = `${GOLD_RATE_CACHE_KEY}:${r.metalType}:${r.purity}`;
        await this.redis.setex(cacheKey, RATE_CACHE_TTL, JSON.stringify({ ...r, fetchedAt: new Date() }));
      } catch (err) {
        this.logger.error(`Failed to store rate for ${r.metalType} ${r.purity}`, err);
      }
    }
    this.logger.log('Gold rates refreshed');
  }
}
