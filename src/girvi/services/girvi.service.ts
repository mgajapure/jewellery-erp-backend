import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CustomerService } from '../../customers/services/customer.service';
import { VaultService } from '../../vault/services/vault.service';
import { InterestService } from '../../interest/services/interest.service';
import { CreateGirviDto, GirviQueryDto, RecordPaymentDto } from '../dto/girvi.dto';
import { paginate, buildPaginatedResult } from '../../common/utils/pagination';
import { Prisma } from '@prisma/client';
import dayjs from 'dayjs';

// RBI 2026: Tiered LTV limits
const LTV_TIERS = [
  { maxAmount: 250000, ltv: 85 },
  { maxAmount: 500000, ltv: 80 },
  { maxAmount: Infinity, ltv: 75 },
] as const;

// RBI 2026: 1kg per borrower cap
const MAX_GOLD_PLEDGE_GRAMS = 1000;
const GOLD_PLEDGE_WARNING_GRAMS = 900;

@Injectable()
export class GirviService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly customerService: CustomerService,
    private readonly vaultService: VaultService,
    private readonly interestService: InterestService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(tenantId: string, dto: CreateGirviDto, createdBy: string) {
    // Validate customer exists and KYC
    const customer = await this.customerService.findById(tenantId, dto.customerId);

    // Fetch current gold rate
    const goldRate = await this.getCurrentGoldRate(tenantId);

    // Calculate weights and valuation
    const totalGrossWeight = dto.items.reduce((s, i) => s + i.grossWeight, 0);
    const totalNetWeight = dto.items.reduce((s, i) => s + i.netWeight, 0);
    const totalFineWeight = dto.items.reduce(
      (s, i) => s + this.toFineWeight(i.netWeight, i.purity),
      0,
    );
    const totalValuation = parseFloat((totalFineWeight * goldRate).toFixed(2));

    // RBI: 1kg pledge cap
    const currentPledged = Number(customer.totalGoldPledged);
    if (currentPledged + totalNetWeight > MAX_GOLD_PLEDGE_GRAMS) {
      throw new BadRequestException(
        `Total gold pledged would exceed RBI 1kg limit. Current: ${currentPledged}g`,
      );
    }
    if (currentPledged + totalNetWeight > GOLD_PLEDGE_WARNING_GRAMS) {
      // Warning only — log but allow
      console.warn(`[RBI] Customer ${customer.id} approaching 1kg pledge limit`);
    }

    // RBI: Tiered LTV
    const ltv = this.getLtvForAmount(totalValuation);
    const maxLoan = parseFloat(((totalValuation * ltv) / 100).toFixed(2));

    // PAN check for loans > 50,000
    await this.customerService.validatePanRequired(tenantId, dto.customerId, maxLoan);

    const girviNumber = await this.generateGirviNumber(tenantId);
    const startDate = new Date();
    const dueDate = dayjs(startDate).add(dto.tenureMonths, 'month').toDate();

    const girvi = await this.prisma.$transaction(async (tx) => {
      const newGirvi = await tx.girvi.create({
        data: {
          tenantId,
          girviNumber,
          customerId: dto.customerId,
          branchId: dto.branchId,
          goldRateAtCreation: goldRate,
          principalAmount: maxLoan,
          ltv,
          interestRate: dto.interestRate,
          interestType: dto.interestType,
          tenureMonths: dto.tenureMonths,
          startDate,
          dueDate,
          totalGrossWeight,
          totalNetWeight,
          totalFineWeight,
          totalValuation,
          notes: dto.notes,
          createdBy,
          items: {
            create: dto.items.map((item) => ({
              tenantId,
              itemName: item.itemName,
              metalType: item.metalType,
              purity: item.purity,
              grossWeight: item.grossWeight,
              netWeight: item.netWeight,
              fineWeight: this.toFineWeight(item.netWeight, item.purity),
              stoneWeight: item.stoneWeight,
              valuation: this.toFineWeight(item.netWeight, item.purity) * goldRate,
              photoUrls: item.photoUrls ?? [],
              description: item.description,
            })),
          },
        },
        include: { items: true, customer: { select: { name: true, mobile: true } } },
      });

      // Update customer total pledged
      await tx.customer.update({
        where: { id: dto.customerId },
        data: { totalGoldPledged: { increment: totalNetWeight } },
      });

      return newGirvi;
    });

    await this.auditService.log({
      tenantId,
      userId: createdBy,
      action: 'CREATE',
      module: 'girvi',
      entityId: girvi.id,
      entityType: 'Girvi',
      newValues: { girviNumber, principalAmount: maxLoan, ltv },
    });

    this.eventEmitter.emit('girvi.created', { tenantId, girviId: girvi.id, customerId: dto.customerId });

    return girvi;
  }

  async acknowledgeKfs(tenantId: string, girviId: string, userId: string) {
    const girvi = await this.findById(tenantId, girviId);
    if (girvi.kfsGenerated && girvi.kfsAcknowledgedAt) {
      throw new BadRequestException('KFS already acknowledged');
    }

    return this.prisma.girvi.update({
      where: { id: girviId },
      data: { kfsGenerated: true, kfsAcknowledgedAt: new Date() },
    });
  }

  async disburse(tenantId: string, girviId: string, userId: string) {
    const girvi = await this.findById(tenantId, girviId);

    if (!girvi.kfsAcknowledgedAt) {
      throw new ForbiddenException('KFS must be acknowledged before disbursement');
    }

    // Check vault assignment exists
    const assignment = await this.vaultService.getAssignment(tenantId, girviId);
    if (!assignment) {
      throw new BadRequestException('Vault slot must be assigned before disbursement');
    }

    return this.prisma.girvi.update({
      where: { id: girviId },
      data: { disbursedAt: new Date() },
    });
  }

  async recordPayment(
    tenantId: string,
    girviId: string,
    dto: RecordPaymentDto,
    recordedBy: string,
  ) {
    const girvi = await this.findById(tenantId, girviId);
    if (!['ACTIVE', 'PARTIAL_PAID', 'OVERDUE'].includes(girvi.status)) {
      throw new BadRequestException(`Cannot record payment for ${girvi.status} Girvi`);
    }

    const totalPaid = dto.principalPaid + dto.interestPaid + dto.penaltyPaid;
    const receiptNumber = `RCT-${Date.now().toString(36).toUpperCase()}`;

    const payment = await this.prisma.girviPayment.create({
      data: {
        tenantId,
        girviId,
        paymentDate: new Date(),
        principalPaid: dto.principalPaid,
        interestPaid: dto.interestPaid,
        penaltyPaid: dto.penaltyPaid,
        totalPaid,
        paymentMode: dto.paymentMode as never,
        receiptNumber,
        recordedBy,
        notes: dto.notes,
      },
    });

    // Update girvi status
    await this.prisma.girvi.update({
      where: { id: girviId },
      data: { status: dto.principalPaid > 0 ? 'PARTIAL_PAID' : undefined },
    });

    await this.auditService.log({
      tenantId,
      userId: recordedBy,
      action: 'UPDATE',
      module: 'girvi',
      entityId: girviId,
      entityType: 'GirviPayment',
      newValues: { paymentId: payment.id, totalPaid, receiptNumber },
    });

    this.eventEmitter.emit('girvi.payment.recorded', { tenantId, girviId, paymentId: payment.id });
    return payment;
  }

  async redeem(tenantId: string, girviId: string, userId: string) {
    const girvi = await this.findById(tenantId, girviId);
    if (!['ACTIVE', 'PARTIAL_PAID', 'OVERDUE'].includes(girvi.status)) {
      throw new BadRequestException(`Cannot redeem ${girvi.status} Girvi`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.girvi.update({
        where: { id: girviId },
        data: { status: 'REDEEMED', closedDate: new Date() },
      });

      await tx.girviItem.updateMany({
        where: { girviId },
        data: { status: 'RELEASED' },
      });

      // Update customer pledge tracking
      await tx.customer.update({
        where: { id: girvi.customerId },
        data: { totalGoldPledged: { decrement: Number(girvi.totalNetWeight) } },
      });
    });

    // Auto-release vault slot
    await this.vaultService.releaseSlot(tenantId, girviId, userId);

    await this.auditService.log({
      tenantId,
      userId,
      action: 'UPDATE',
      module: 'girvi',
      entityId: girviId,
      entityType: 'Girvi',
      newValues: { status: 'REDEEMED' },
    });

    this.eventEmitter.emit('girvi.redeemed', { tenantId, girviId });
  }

  async renew(tenantId: string, girviId: string, userId: string) {
    const girvi = await this.findById(tenantId, girviId);
    const goldRate = await this.getCurrentGoldRate(tenantId);
    const newValuation = Number(girvi.totalFineWeight) * goldRate;
    const newDueDate = dayjs().add(girvi.tenureMonths, 'month').toDate();

    await this.prisma.$transaction(async (tx) => {
      await tx.girviRenewal.create({
        data: {
          tenantId,
          girviId,
          previousDueDate: girvi.dueDate,
          newDueDate,
          newGoldRate: goldRate,
          newValuation,
          renewedBy: userId,
        },
      });

      await tx.girvi.update({
        where: { id: girviId },
        data: {
          dueDate: newDueDate,
          status: 'ACTIVE',
          goldRateAtCreation: goldRate,
          totalValuation: newValuation,
        },
      });
    });

    this.eventEmitter.emit('girvi.renewed', { tenantId, girviId });
    return this.findById(tenantId, girviId);
  }

  async getInterestBreakdown(tenantId: string, girviId: string) {
    await this.findById(tenantId, girviId);
    return this.interestService.calculateForGirvi(girviId, tenantId);
  }

  async findById(tenantId: string, id: string) {
    const girvi = await this.prisma.girvi.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        items: true,
        customer: { select: { name: true, mobile: true, customerId: true } },
        payments: { orderBy: { paymentDate: 'desc' } },
        vaultAssignments: {
          where: { releasedAt: null },
          include: { slot: { include: { tray: { include: { safe: { include: { vault: true } } } } } } },
        },
      },
    });
    if (!girvi) throw new NotFoundException('Girvi not found');
    return girvi;
  }

  async findAll(tenantId: string, query: GirviQueryDto) {
    const where: Prisma.GirviWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.status && { status: query.status as never }),
      ...(query.customerId && { customerId: query.customerId }),
      ...(query.search && {
        OR: [
          { girviNumber: { contains: query.search, mode: 'insensitive' } },
          { customer: { name: { contains: query.search, mode: 'insensitive' } } },
          { customer: { mobile: { contains: query.search } } },
        ],
      }),
    };

    const { skip, take } = paginate(query);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.girvi.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true, mobile: true, customerId: true } },
          _count: { select: { payments: true } },
        },
      }),
      this.prisma.girvi.count({ where }),
    ]);

    return buildPaginatedResult(data, total, query);
  }

  async getOverdueGirvis(tenantId: string) {
    return this.prisma.girvi.findMany({
      where: {
        tenantId,
        status: { in: ['ACTIVE', 'PARTIAL_PAID'] },
        dueDate: { lt: new Date() },
        deletedAt: null,
      },
      include: { customer: { select: { name: true, mobile: true } } },
      orderBy: { dueDate: 'asc' },
    });
  }

  private getLtvForAmount(valuation: number): number {
    for (const tier of LTV_TIERS) {
      if (valuation <= tier.maxAmount) return tier.ltv;
    }
    return 75;
  }

  private toFineWeight(netWeight: number, purity: string): number {
    const purityMap: Record<string, number> = {
      '24K': 1.0, '22K': 0.9167, '18K': 0.75, '14K': 0.5833,
      '999': 0.999, '925': 0.925, '916': 0.9167,
    };
    const factor = purityMap[purity] ?? 0.9167;
    return parseFloat((netWeight * factor).toFixed(3));
  }

  private async getCurrentGoldRate(tenantId: string): Promise<number> {
    const rate = await this.prisma.goldRate.findFirst({
      where: { metalType: 'GOLD', purity: '22K' },
      orderBy: { fetchedAt: 'desc' },
    });
    return rate ? Number(rate.ratePerGram) : 6500; // fallback for dev
  }

  private async generateGirviNumber(tenantId: string): Promise<string> {
    const count = await this.prisma.girvi.count({ where: { tenantId } });
    const seq = String(count + 1).padStart(6, '0');
    return `GRV-${dayjs().format('YYYYMM')}-${seq}`;
  }
}
