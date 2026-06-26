import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { paginate, buildPaginatedResult } from '../../common/utils/pagination';
import { CreateOldGoldPurchaseDto, OldGoldQueryDto, PurityTestDto, SettleOldGoldDto } from '../dto/old-gold.dto';

@Injectable()
export class OldGoldService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private async nextPurchaseNumber(tenantId: string): Promise<string> {
    const count = await this.prisma.oldGoldPurchase.count({ where: { tenantId } });
    return `OG-${String(count + 1).padStart(5, '0')}`;
  }

  async createPurchase(tenantId: string, dto: CreateOldGoldPurchaseDto, recordedBy: string) {
    if (!dto.customerId && !dto.vendorName) {
      throw new BadRequestException('Either customerId or vendorName is required');
    }

    const purchase = await this.prisma.oldGoldPurchase.create({
      data: {
        tenantId,
        purchaseNumber: await this.nextPurchaseNumber(tenantId),
        customerId: dto.customerId,
        vendorName: dto.vendorName,
        grossWeight: dto.grossWeight,
        ratePerGram: dto.ratePerGram,
        recordedBy,
        notes: dto.notes,
      },
    });

    await this.auditService.log({ tenantId, userId: recordedBy, action: 'CREATE', module: 'OldGold', entityId: purchase.id, entityType: 'OldGoldPurchase', newValues: purchase });
    this.eventEmitter.emit('old_gold.received', { tenantId, purchaseId: purchase.id, purchaseNumber: purchase.purchaseNumber });
    return purchase;
  }

  async findAll(tenantId: string, query: OldGoldQueryDto) {
    const where: any = {
      tenantId,
      deletedAt: null,
      ...(query.status && { status: query.status as never }),
      ...(query.customerId && { customerId: query.customerId }),
    };
    const { skip, take } = paginate(query);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.oldGoldPurchase.findMany({
        where, skip, take,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { id: true, name: true, mobile: true } } },
      }),
      this.prisma.oldGoldPurchase.count({ where }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  async findOne(tenantId: string, id: string) {
    const purchase = await this.prisma.oldGoldPurchase.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { customer: { select: { id: true, name: true, mobile: true } } },
    });
    if (!purchase) throw new NotFoundException('Old gold purchase not found');
    return purchase;
  }

  async recordPurityTest(tenantId: string, id: string, dto: PurityTestDto, testedBy: string) {
    const purchase = await this.findOne(tenantId, id);
    if (purchase.status !== 'RECEIVED') throw new BadRequestException('Purity test can only be recorded for RECEIVED items');

    // Net fine weight after melting loss
    const meltingLoss = dto.meltingLoss ?? 0;
    const netFineWeight = purchase.grossWeight.toNumber() * (dto.testedPurity / 100) * (1 - meltingLoss / 100);
    const totalAmount = netFineWeight * purchase.ratePerGram.toNumber();

    const updated = await this.prisma.oldGoldPurchase.update({
      where: { id },
      data: {
        testedPurity: dto.testedPurity,
        meltingLoss: dto.meltingLoss,
        netFineWeight,
        totalAmount,
        status: 'PURITY_TESTED' as never,
      },
    });

    await this.auditService.log({ tenantId, userId: testedBy, action: 'UPDATE', module: 'OldGold', entityId: id, entityType: 'OldGoldPurchase', oldValues: { status: purchase.status }, newValues: { status: 'PURITY_TESTED', testedPurity: dto.testedPurity, netFineWeight } });
    this.eventEmitter.emit('old_gold.purity_tested', { tenantId, purchaseId: id, testedPurity: dto.testedPurity, netFineWeight });
    return updated;
  }

  async meltAndProcess(tenantId: string, id: string, processedBy: string) {
    const purchase = await this.findOne(tenantId, id);
    if (purchase.status !== 'PURITY_TESTED') throw new BadRequestException('Item must be purity tested before melting');

    const updated = await this.prisma.oldGoldPurchase.update({
      where: { id },
      data: { status: 'MELTED' as never },
    });

    await this.auditService.log({ tenantId, userId: processedBy, action: 'UPDATE', module: 'OldGold', entityId: id, entityType: 'OldGoldPurchase', oldValues: { status: purchase.status }, newValues: { status: 'MELTED' } });
    this.eventEmitter.emit('old_gold.melted', { tenantId, purchaseId: id });
    return updated;
  }

  async settleWithRefiner(tenantId: string, id: string, dto: SettleOldGoldDto, settledBy: string) {
    const purchase = await this.findOne(tenantId, id);
    if (purchase.status !== 'MELTED') throw new BadRequestException('Item must be melted before refiner settlement');

    const updated = await this.prisma.oldGoldPurchase.update({
      where: { id },
      data: {
        status: 'SETTLED' as never,
        refinerId: dto.refinerId,
        settledAt: new Date(),
        ...(dto.settlementNotes && { notes: dto.settlementNotes }),
      },
    });

    await this.auditService.log({ tenantId, userId: settledBy, action: 'UPDATE', module: 'OldGold', entityId: id, entityType: 'OldGoldPurchase', oldValues: { status: purchase.status }, newValues: { status: 'SETTLED', refinerId: dto.refinerId } });
    this.eventEmitter.emit('old_gold.settled', { tenantId, purchaseId: id, refinerId: dto.refinerId });
    return updated;
  }

  async returnToCustomer(tenantId: string, id: string, returnedBy: string) {
    const purchase = await this.findOne(tenantId, id);
    if (['SETTLED', 'RETURNED'].includes(purchase.status)) throw new BadRequestException('Item already settled or returned');

    const updated = await this.prisma.oldGoldPurchase.update({
      where: { id },
      data: { status: 'RETURNED' as never },
    });

    await this.auditService.log({ tenantId, userId: returnedBy, action: 'UPDATE', module: 'OldGold', entityId: id, entityType: 'OldGoldPurchase', oldValues: { status: purchase.status }, newValues: { status: 'RETURNED' } });
    return updated;
  }

  async getReport(tenantId: string) {
    const [byStatus, totalsAgg] = await Promise.all([
      this.prisma.oldGoldPurchase.groupBy({
        by: ['status'],
        where: { tenantId, deletedAt: null },
        _count: true,
        _sum: { grossWeight: true, totalAmount: true },
        orderBy: { _count: { status: 'desc' } },
      }),
      this.prisma.oldGoldPurchase.aggregate({ where: { tenantId, deletedAt: null }, _sum: { grossWeight: true, netFineWeight: true, totalAmount: true } }),
    ]);

    return {
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count, grossWeight: s._sum?.grossWeight, totalAmount: s._sum?.totalAmount })),
      totals: {
        grossWeight: totalsAgg._sum?.grossWeight,
        netFineWeight: totalsAgg._sum?.netFineWeight,
        totalAmount: totalsAgg._sum?.totalAmount,
      },
    };
  }
}
