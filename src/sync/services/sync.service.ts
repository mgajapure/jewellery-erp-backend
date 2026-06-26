import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { PushSyncOperationDto, SyncQueryDto } from '../dto/sync.dto';
import { paginate, buildPaginatedResult } from '../../common/utils/pagination';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  async pushOperation(tenantId: string, dto: PushSyncOperationDto) {
    const entry = await this.prisma.syncQueue.create({
      data: {
        tenantId,
        deviceId: dto.deviceId,
        operation: dto.operation,
        payload: dto.payload as any,
        status: 'PENDING',
      },
    });
    return entry;
  }

  async findQueue(tenantId: string, query: SyncQueryDto) {
    const where: any = {
      tenantId,
      ...(query.status && { status: query.status as never }),
    };
    const { skip, take } = paginate(query);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.syncQueue.findMany({ where, skip, take, orderBy: { createdAt: 'asc' } }),
      this.prisma.syncQueue.count({ where }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  async getSyncStatus(tenantId: string) {
    const counts = await this.prisma.syncQueue.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: true,
      orderBy: { _count: { status: 'desc' } },
    });
    return counts.map(c => ({ status: c.status, count: c._count }));
  }

  // Process pending sync entries every 30 seconds
  @Cron('*/30 * * * * *')
  async processPendingOperations() {
    const pending = await this.prisma.syncQueue.findMany({
      where: { status: 'PENDING', retryCount: { lt: 5 } },
      take: 20,
      orderBy: { createdAt: 'asc' },
    });

    for (const entry of pending) {
      try {
        await this.prisma.syncQueue.update({
          where: { id: entry.id },
          data: { status: 'SYNCING' },
        });

        await this.processOperation(entry.operation, entry.payload as Record<string, unknown>, entry.tenantId);

        await this.prisma.syncQueue.update({
          where: { id: entry.id },
          data: { status: 'SYNCED', processedAt: new Date() },
        });
      } catch (err: any) {
        const retryCount = entry.retryCount + 1;
        await this.prisma.syncQueue.update({
          where: { id: entry.id },
          data: {
            status: retryCount >= 5 ? 'FAILED' : 'PENDING',
            retryCount,
            error: err?.message ?? String(err),
          },
        });
        this.logger.error(`Sync failed for ${entry.operation} [${entry.id}] attempt ${retryCount}`, err);
      }
    }
  }

  private async processOperation(operation: string, payload: Record<string, unknown>, tenantId: string) {
    // Route offline operations to appropriate handlers
    // In production this dispatches to the correct service based on operation type
    this.logger.log(`Processing sync operation: ${operation} for tenant ${tenantId}`);
    // e.g. 'Girvi.create', 'Sale.create', 'Customer.update' etc.
  }
}
