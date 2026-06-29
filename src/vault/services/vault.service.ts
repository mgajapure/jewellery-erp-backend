import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CreateVaultDto, CreateSafeDto, CreateTrayDto, CreateSlotsDto } from '../dto/vault.dto';

@Injectable()
export class VaultService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createVault(tenantId: string, dto: CreateVaultDto, userId: string) {
    const vault = await this.prisma.vault.create({
      data: { tenantId, ...dto },
    });
    await this.auditService.log({
      tenantId, userId, action: 'CREATE', module: 'vault',
      entityId: vault.id, entityType: 'Vault', newValues: dto,
    });
    return vault;
  }

  async listVaults(tenantId: string) {
    return this.prisma.vault.findMany({
      where: { tenantId, isActive: true },
      include: {
        safes: {
          where: { isActive: true },
          include: {
            trays: {
              where: { isActive: true },
              include: { slots: { select: { id: true, slotNumber: true, status: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getVault(tenantId: string, vaultId: string) {
    const vault = await this.prisma.vault.findFirst({
      where: { id: vaultId, tenantId, isActive: true },
      include: {
        safes: {
          where: { isActive: true },
          include: {
            trays: {
              where: { isActive: true },
              include: { slots: { select: { id: true, slotNumber: true, status: true } } },
            },
          },
        },
      },
    });
    if (!vault) throw new NotFoundException('Vault not found');
    return vault;
  }

  async createSafe(tenantId: string, dto: CreateSafeDto, userId: string) {
    const vault = await this.prisma.vault.findFirst({ where: { id: dto.vaultId, tenantId } });
    if (!vault) throw new NotFoundException('Vault not found');
    const safe = await this.prisma.vaultSafe.create({ data: { tenantId, ...dto } });
    await this.auditService.log({
      tenantId, userId, action: 'CREATE', module: 'vault',
      entityId: safe.id, entityType: 'VaultSafe', newValues: dto,
    });
    return safe;
  }

  async createTray(tenantId: string, dto: CreateTrayDto, userId: string) {
    const safe = await this.prisma.vaultSafe.findFirst({ where: { id: dto.safeId, tenantId } });
    if (!safe) throw new NotFoundException('Safe not found');
    const tray = await this.prisma.vaultTray.create({ data: { tenantId, ...dto } });
    await this.auditService.log({
      tenantId, userId, action: 'CREATE', module: 'vault',
      entityId: tray.id, entityType: 'VaultTray', newValues: dto,
    });
    return tray;
  }

  async createSlots(tenantId: string, dto: CreateSlotsDto, userId: string) {
    const tray = await this.prisma.vaultTray.findFirst({ where: { id: dto.trayId, tenantId } });
    if (!tray) throw new NotFoundException('Tray not found');

    const existing = await this.prisma.vaultSlot.count({ where: { trayId: dto.trayId } });
    const prefix = dto.prefix ?? '';
    const slots = Array.from({ length: dto.count }, (_, i) => ({
      tenantId,
      trayId: dto.trayId,
      slotNumber: `${prefix}${existing + i + 1}`,
    }));

    const result = await this.prisma.vaultSlot.createMany({ data: slots });
    await this.auditService.log({
      tenantId, userId, action: 'CREATE', module: 'vault',
      entityType: 'VaultSlot', newValues: { trayId: dto.trayId, count: dto.count },
    });
    return { created: result.count };
  }

  async listSlots(tenantId: string, trayId: string) {
    return this.prisma.vaultSlot.findMany({
      where: { trayId, tenantId },
      include: {
        assignments: {
          where: { releasedAt: null },
          include: {
            girvi: { select: { girviNumber: true, customer: { select: { name: true } } } },
          },
        },
      },
      orderBy: { slotNumber: 'asc' },
    });
  }

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
