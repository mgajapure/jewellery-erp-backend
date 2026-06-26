import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CreateRepairDto, RepairQueryDto, UpdateRepairStatusDto } from '../dto/repair.dto';
import { paginate, buildPaginatedResult } from '../../common/utils/pagination';
import dayjs from 'dayjs';

const VALID_TRANSITIONS: Record<string, string[]> = {
  RECEIVED: ['ASSESSING', 'CANCELLED'],
  ASSESSING: ['ESTIMATE_SENT', 'CANCELLED'],
  ESTIMATE_SENT: ['APPROVED', 'CANCELLED'],
  APPROVED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['READY'],
  READY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

@Injectable()
export class RepairService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createRepair(tenantId: string, dto: CreateRepairDto, createdBy: string) {
    const ticketNumber = `REP-${dayjs().format('YYYYMMDD')}-${Date.now().toString(36).toUpperCase()}`;
    const repair = await this.prisma.repair.create({
      data: {
        tenantId,
        ticketNumber,
        customerId: dto.customerId,
        itemDescription: dto.itemDescription,
        itemPhotoUrls: dto.itemPhotoUrls ?? [],
        damageDescription: dto.damageDescription,
        estimatedCost: dto.estimatedCost,
        promisedDate: dto.promisedDate ? new Date(dto.promisedDate) : undefined,
        notes: dto.notes,
        createdBy,
      },
      include: { customer: { select: { name: true, mobile: true } } },
    });
    await this.auditService.log({ tenantId, userId: createdBy, action: 'CREATE', module: 'repairs', entityId: repair.id, entityType: 'Repair', newValues: { ticketNumber } });
    return repair;
  }

  async findRepairs(tenantId: string, query: RepairQueryDto) {
    const where: any = {
      tenantId,
      deletedAt: null,
      ...(query.customerId && { customerId: query.customerId }),
      ...(query.status && { status: query.status as never }),
      ...(query.search && {
        OR: [
          { ticketNumber: { contains: query.search, mode: 'insensitive' } },
          { itemDescription: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };
    const { skip, take } = paginate(query);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.repair.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        include: { customer: { select: { name: true, mobile: true } } },
      }),
      this.prisma.repair.count({ where }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  async findRepairById(tenantId: string, id: string) {
    const repair = await this.prisma.repair.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { customer: true },
    });
    if (!repair) throw new NotFoundException('Repair ticket not found');
    return repair;
  }

  async updateStatus(tenantId: string, id: string, dto: UpdateRepairStatusDto, updatedBy: string) {
    const repair = await this.findRepairById(tenantId, id);
    const allowed = VALID_TRANSITIONS[repair.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(`Cannot transition from ${repair.status} to ${dto.status}`);
    }

    const updateData: any = { status: dto.status as never };
    if (dto.status === 'ESTIMATE_SENT') updateData.estimateSentAt = new Date();
    if (dto.status === 'APPROVED') updateData.estimateApprovedAt = new Date();
    if (dto.status === 'DELIVERED') {
      updateData.deliveredAt = new Date();
      if (dto.deliverySignatureUrl) updateData.deliverySignatureUrl = dto.deliverySignatureUrl;
    }
    if (dto.finalCost !== undefined) updateData.finalCost = dto.finalCost;
    if (dto.notes) updateData.notes = dto.notes;

    const updated = await this.prisma.repair.update({ where: { id }, data: updateData });

    await this.auditService.log({ tenantId, userId: updatedBy, action: 'UPDATE', module: 'repairs', entityId: id, entityType: 'Repair', oldValues: { status: repair.status }, newValues: { status: dto.status } });
    this.eventEmitter.emit('repair.status.changed', { tenantId, repairId: id, status: dto.status, customerId: repair.customerId });
    return updated;
  }

  async getAnalytics(tenantId: string) {
    const [byStatus, overduePending] = await this.prisma.$transaction([
      this.prisma.repair.groupBy({
        by: ['status'],
        where: { tenantId, deletedAt: null },
        _count: true,
        orderBy: { _count: { status: 'desc' } },
      }),
      this.prisma.repair.count({
        where: {
          tenantId, deletedAt: null,
          status: { notIn: ['DELIVERED', 'CANCELLED'] as never[] },
          promisedDate: { lt: new Date() },
        },
      }),
    ]);
    return { byStatus: byStatus.map(s => ({ status: s.status, count: s._count })), overduePending };
  }
}
