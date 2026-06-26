import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class VaultService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async assignSlot(
    tenantId: string,
    girviId: string,
    slotId: string,
    assignedBy: string,
  ) {
    // Prevent double assignment
    const slot = await this.prisma.vaultSlot.findFirst({
      where: { id: slotId, tenantId },
    });
    if (!slot) throw new NotFoundException('Vault slot not found');
    if (slot.status === 'OCCUPIED') throw new ConflictException('Vault slot already occupied');

    // Check girvi exists
    await this.prisma.girvi.findFirstOrThrow({ where: { id: girviId, tenantId } });

    return this.prisma.$transaction(async (tx) => {
      await tx.vaultSlot.update({
        where: { id: slotId },
        data: { status: 'OCCUPIED' },
      });

      const assignment = await tx.vaultAssignment.create({
        data: { tenantId, girviId, slotId, assignedBy },
      });

      await this.auditService.log({
        tenantId,
        userId: assignedBy,
        action: 'CREATE',
        module: 'vault',
        entityId: assignment.id,
        entityType: 'VaultAssignment',
        newValues: { girviId, slotId },
      });

      return assignment;
    });
  }

  async releaseSlot(tenantId: string, girviId: string, releasedBy: string) {
    const assignment = await this.prisma.vaultAssignment.findFirst({
      where: { tenantId, girviId, releasedAt: null },
    });
    if (!assignment) throw new NotFoundException('No active vault assignment found');

    return this.prisma.$transaction(async (tx) => {
      await tx.vaultSlot.update({
        where: { id: assignment.slotId },
        data: { status: 'AVAILABLE' },
      });

      await tx.vaultAssignment.update({
        where: { id: assignment.id },
        data: { releasedAt: new Date(), releasedBy },
      });
    });
  }

  async getAssignment(tenantId: string, girviId: string) {
    return this.prisma.vaultAssignment.findFirst({
      where: { tenantId, girviId, releasedAt: null },
      include: {
        slot: {
          include: {
            tray: { include: { safe: { include: { vault: true } } } },
          },
        },
      },
    });
  }

  async findAvailableSlots(tenantId: string, vaultId?: string) {
    return this.prisma.vaultSlot.findMany({
      where: {
        tenantId,
        status: 'AVAILABLE',
        tray: { safe: { ...(vaultId ? { vaultId } : {}) } },
      },
      include: {
        tray: { include: { safe: { include: { vault: { select: { name: true } } } } } },
      },
      take: 100,
    });
  }

  async getOccupancySummary(tenantId: string) {
    const [total, occupied] = await Promise.all([
      this.prisma.vaultSlot.count({ where: { tenantId } }),
      this.prisma.vaultSlot.count({ where: { tenantId, status: 'OCCUPIED' } }),
    ]);

    return {
      total,
      occupied,
      available: total - occupied,
      occupancyPercent: total > 0 ? parseFloat(((occupied / total) * 100).toFixed(1)) : 0,
    };
  }

  async searchByGirvi(tenantId: string, girviId: string) {
    return this.prisma.vaultAssignment.findFirst({
      where: { tenantId, girviId, releasedAt: null },
      include: {
        slot: {
          include: {
            tray: { include: { safe: { include: { vault: true } } } },
          },
        },
        girvi: { select: { girviNumber: true, customer: { select: { name: true, mobile: true } } } },
      },
    });
  }
}
