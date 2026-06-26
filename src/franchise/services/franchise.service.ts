import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { paginate, buildPaginatedResult } from '../../common/utils/pagination';
import { CalculateRoyaltyDto, CreateFranchiseeDto, FranchiseeQueryDto, UpdateFranchiseeDto } from '../dto/franchise.dto';

@Injectable()
export class FranchiseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(tenantId: string, dto: CreateFranchiseeDto, createdBy: string) {
    const franchisee = await this.prisma.franchiseeRecord.create({
      data: {
        tenantId,
        franchiseeName: dto.franchiseeName,
        territory: dto.territory,
        contactPerson: dto.contactPerson,
        contactMobile: dto.contactMobile,
        royaltyRate: dto.royaltyRate,
        agreementStart: new Date(dto.agreementStart),
        agreementEnd: new Date(dto.agreementEnd),
        notes: dto.notes,
        createdBy,
      },
    });
    await this.auditService.log({ tenantId, userId: createdBy, action: 'CREATE', module: 'Franchise', entityId: franchisee.id, entityType: 'FranchiseeRecord', newValues: franchisee });
    return franchisee;
  }

  async findAll(tenantId: string, query: FranchiseeQueryDto) {
    const where: any = { tenantId, deletedAt: null, ...(query.status && { status: query.status as never }) };
    const { skip, take } = paginate(query);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.franchiseeRecord.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { royalties: { orderBy: [{ year: 'desc' }, { month: 'desc' }], take: 3 } } }),
      this.prisma.franchiseeRecord.count({ where }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  async findOne(tenantId: string, id: string) {
    const f = await this.prisma.franchiseeRecord.findFirst({ where: { id, tenantId, deletedAt: null }, include: { royalties: { orderBy: [{ year: 'desc' }, { month: 'desc' }] } } });
    if (!f) throw new NotFoundException('Franchisee not found');
    return f;
  }

  async update(tenantId: string, id: string, dto: UpdateFranchiseeDto, updatedBy: string) {
    await this.findOne(tenantId, id);
    const updated = await this.prisma.franchiseeRecord.update({
      where: { id },
      data: {
        ...(dto.franchiseeName && { franchiseeName: dto.franchiseeName }),
        ...(dto.territory && { territory: dto.territory }),
        ...(dto.contactPerson && { contactPerson: dto.contactPerson }),
        ...(dto.contactMobile && { contactMobile: dto.contactMobile }),
        ...(dto.royaltyRate && { royaltyRate: dto.royaltyRate }),
        ...(dto.agreementEnd && { agreementEnd: new Date(dto.agreementEnd) }),
      },
    });
    await this.auditService.log({ tenantId, userId: updatedBy, action: 'UPDATE', module: 'Franchise', entityId: id, entityType: 'FranchiseeRecord', newValues: dto as Record<string, unknown> });
    return updated;
  }

  async suspend(tenantId: string, id: string, updatedBy: string) {
    const f = await this.findOne(tenantId, id);
    if (f.status === 'TERMINATED') throw new BadRequestException('Cannot suspend a terminated franchisee');
    const updated = await this.prisma.franchiseeRecord.update({ where: { id }, data: { status: 'SUSPENDED' as never } });
    await this.auditService.log({ tenantId, userId: updatedBy, action: 'UPDATE', module: 'Franchise', entityId: id, entityType: 'FranchiseeRecord', newValues: { status: 'SUSPENDED' } });
    return updated;
  }

  async calculateRoyalty(tenantId: string, franchiseeId: string, dto: CalculateRoyaltyDto, createdBy: string) {
    const f = await this.findOne(tenantId, franchiseeId);
    const royaltyAmount = +(dto.grossSales * f.royaltyRate.toNumber() / 100).toFixed(2);

    const existing = await this.prisma.royaltyRecord.findUnique({ where: { franchiseeId_month_year: { franchiseeId, month: dto.month, year: dto.year } } });
    if (existing) throw new BadRequestException(`Royalty already calculated for ${dto.month}/${dto.year}`);

    const royalty = await this.prisma.royaltyRecord.create({
      data: { tenantId, franchiseeId, month: dto.month, year: dto.year, grossSales: dto.grossSales, royaltyAmount, createdBy },
    });
    return royalty;
  }

  async markRoyaltyPaid(tenantId: string, royaltyId: string, paidBy: string) {
    const royalty = await this.prisma.royaltyRecord.findFirst({ where: { id: royaltyId, tenantId } });
    if (!royalty) throw new NotFoundException('Royalty record not found');
    if (royalty.isPaid) throw new BadRequestException('Royalty already marked as paid');

    return this.prisma.royaltyRecord.update({ where: { id: royaltyId }, data: { isPaid: true, paidAt: new Date() } });
  }

  async getDashboard(tenantId: string) {
    const [activeFranchisees, unpaidRoyalties, totalRoyalty] = await Promise.all([
      this.prisma.franchiseeRecord.count({ where: { tenantId, status: 'ACTIVE', deletedAt: null } }),
      this.prisma.royaltyRecord.count({ where: { tenantId, isPaid: false } }),
      this.prisma.royaltyRecord.aggregate({ where: { tenantId }, _sum: { royaltyAmount: true } }),
    ]);
    return { activeFranchisees, unpaidRoyalties, totalRoyaltyCollected: totalRoyalty._sum?.royaltyAmount };
  }
}
