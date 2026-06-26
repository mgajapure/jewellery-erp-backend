import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { paginate, buildPaginatedResult } from '../../common/utils/pagination';
import dayjs from 'dayjs';

export class CreateSchemeDto {
  customerId: string;
  schemeName: string;
  monthlyAmount: number;
  durationMonths: number;
  bonusMonth?: number;
  startDate: string;
  notes?: string;
}

export class RecordCollectionDto {
  month: number;
  year: number;
  amount: number;
  paymentMode: string;
}

export class SchemeQueryDto {
  customerId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class SavingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createScheme(tenantId: string, dto: CreateSchemeDto, createdBy: string) {
    const startDate = dayjs(dto.startDate);
    const maturityDate = startDate.add(dto.durationMonths, 'month');

    const scheme = await this.prisma.savingsScheme.create({
      data: {
        tenantId,
        customerId: dto.customerId,
        schemeName: dto.schemeName,
        monthlyAmount: dto.monthlyAmount,
        durationMonths: dto.durationMonths,
        bonusMonth: dto.bonusMonth,
        startDate: startDate.toDate(),
        maturityDate: maturityDate.toDate(),
        notes: dto.notes,
        createdBy,
      },
      include: { customer: { select: { name: true, mobile: true } } },
    });

    await this.auditService.log({ tenantId, userId: createdBy, action: 'CREATE', module: 'savings', entityId: scheme.id, entityType: 'SavingsScheme', newValues: { schemeName: dto.schemeName, monthlyAmount: dto.monthlyAmount } });
    return scheme;
  }

  async findSchemes(tenantId: string, query: SchemeQueryDto) {
    const where: any = {
      tenantId, deletedAt: null,
      ...(query.customerId && { customerId: query.customerId }),
      ...(query.status && { status: query.status as never }),
    };
    const { skip, take } = paginate(query);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.savingsScheme.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        include: { customer: { select: { name: true, mobile: true } }, _count: { select: { collections: true } } },
      }),
      this.prisma.savingsScheme.count({ where }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  async findSchemeById(tenantId: string, id: string) {
    const scheme = await this.prisma.savingsScheme.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { customer: true, collections: { orderBy: [{ year: 'asc' }, { month: 'asc' }] } },
    });
    if (!scheme) throw new NotFoundException('Savings scheme not found');
    return scheme;
  }

  async recordCollection(tenantId: string, schemeId: string, dto: RecordCollectionDto, recordedBy: string) {
    const scheme = await this.findSchemeById(tenantId, schemeId);
    if (scheme.status !== 'ACTIVE') throw new BadRequestException(`Scheme is ${scheme.status}`);

    const existing = await this.prisma.schemeCollection.findFirst({ where: { schemeId, month: dto.month, year: dto.year } });
    if (existing) throw new ConflictException(`Collection for ${dto.month}/${dto.year} already recorded`);

    const collection = await this.prisma.schemeCollection.create({
      data: {
        tenantId, schemeId, month: dto.month, year: dto.year,
        amount: dto.amount, paymentMode: dto.paymentMode as never,
        paidAt: new Date(), recordedBy,
      },
    });

    await this.auditService.log({ tenantId, userId: recordedBy, action: 'CREATE', module: 'savings', entityId: schemeId, entityType: 'SchemeCollection', newValues: { month: dto.month, year: dto.year, amount: dto.amount } });
    return collection;
  }

  async getSchemeStatement(tenantId: string, schemeId: string) {
    const scheme = await this.findSchemeById(tenantId, schemeId);
    const totalCollected = scheme.collections.reduce((s, c) => s + Number(c.amount), 0);
    const expectedTotal = Number(scheme.monthlyAmount) * scheme.durationMonths;
    const bonusAmount = scheme.bonusMonth ? Number(scheme.monthlyAmount) : 0;
    const maturityValue = expectedTotal + bonusAmount;
    const missedMonths = scheme.durationMonths - scheme.collections.length;

    return {
      schemeId,
      schemeName: scheme.schemeName,
      customer: { name: scheme.customer.name, mobile: scheme.customer.mobile },
      monthlyAmount: Number(scheme.monthlyAmount),
      durationMonths: scheme.durationMonths,
      startDate: scheme.startDate,
      maturityDate: scheme.maturityDate,
      status: scheme.status,
      totalCollected,
      expectedTotal,
      bonusAmount,
      maturityValue,
      missedMonths,
      collectionsPaid: scheme.collections.length,
    };
  }

  // Daily check for matured schemes (run at 8 AM)
  @Cron('0 8 * * *')
  async processMaturities() {
    const today = new Date();
    const matured = await this.prisma.savingsScheme.findMany({
      where: { status: 'ACTIVE', maturityDate: { lte: today } },
    });

    for (const scheme of matured) {
      await this.prisma.savingsScheme.update({ where: { id: scheme.id }, data: { status: 'MATURED', maturedAt: today } });
      this.eventEmitter.emit('scheme.matured', { tenantId: scheme.tenantId, schemeId: scheme.id, customerId: scheme.customerId });
    }
  }

  async getDefaulters(tenantId: string) {
    const today = dayjs();
    const schemes = await this.prisma.savingsScheme.findMany({
      where: { tenantId, status: 'ACTIVE', deletedAt: null },
      include: { customer: { select: { name: true, mobile: true } }, _count: { select: { collections: true } } },
    });

    return schemes.filter(scheme => {
      const monthsElapsed = today.diff(dayjs(scheme.startDate), 'month') + 1;
      const expected = Math.min(monthsElapsed, scheme.durationMonths);
      return scheme._count.collections < expected;
    }).map(s => ({
      schemeId: s.id, schemeName: s.schemeName,
      customer: s.customer, paid: s._count.collections,
      expected: Math.min(dayjs().diff(dayjs(s.startDate), 'month') + 1, s.durationMonths),
    }));
  }
}
