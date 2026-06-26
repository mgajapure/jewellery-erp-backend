import { Injectable } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

interface LogParams {
  tenantId: string;
  userId?: string;
  action: AuditAction;
  module: string;
  entityId?: string;
  entityType?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: LogParams): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        tenantId: params.tenantId,
        action: params.action,
        module: params.module,
        entityId: params.entityId,
        entityType: params.entityType,
        oldValues: params.oldValues as never,
        newValues: params.newValues as never,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        ...(params.userId ? { userId: params.userId } : {}),
      },
    });
  }
}
