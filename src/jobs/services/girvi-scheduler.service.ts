import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { RbiComplianceService } from '../../girvi/services/rbi-compliance.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class GirviSchedulerService {
  private readonly logger = new Logger(GirviSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rbiCompliance: RbiComplianceService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // Run daily at 9 AM — mark overdue girvis, check return timers
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async runDailyGirviJobs(): Promise<void> {
    this.logger.log('Running daily Girvi jobs...');

    const tenants = await this.prisma.tenant.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true },
    });

    for (const tenant of tenants) {
      await this.markOverdueGirvis(tenant.id);
      await this.rbiCompliance.checkGoldReturnTimers(tenant.id);
    }
  }

  private async markOverdueGirvis(tenantId: string): Promise<void> {
    const now = new Date();

    const result = await this.prisma.girvi.updateMany({
      where: {
        tenantId,
        status: { in: ['ACTIVE', 'PARTIAL_PAID'] },
        dueDate: { lt: now },
        deletedAt: null,
      },
      data: { status: 'OVERDUE' },
    });

    if (result.count > 0) {
      this.logger.log(`[${tenantId}] Marked ${result.count} Girvi(s) as OVERDUE`);
      this.eventEmitter.emit('girvi.overdue.batch', { tenantId, count: result.count });
    }
  }

  // Run every hour during business hours — check day 5 gold return alerts
  @Cron('0 9-18 * * 1-6')
  async checkGoldReturnAlerts(): Promise<void> {
    const tenants = await this.prisma.tenant.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true },
    });

    for (const tenant of tenants) {
      await this.rbiCompliance.checkGoldReturnTimers(tenant.id);
    }
  }
}
