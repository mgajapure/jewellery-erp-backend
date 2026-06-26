import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { paginate, buildPaginatedResult } from '../../common/utils/pagination';
import { FiledGstReturnDto, GenerateGstReturnDto, GstReturnQueryDto } from '../dto/gst-filing.dto';

// GST rates for jewellery (% of taxable value)
const GOLD_GST_RATE = 0.03;    // 3% GST on gold
const DIAMOND_GST_RATE = 0.18; // 18% GST on diamond making charges

@Injectable()
export class GstFilingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async generateReturn(tenantId: string, dto: GenerateGstReturnDto, createdBy: string) {
    const existing = await this.prisma.gstReturn.findUnique({
      where: { tenantId_returnType_month_year: { tenantId, returnType: dto.returnType as never, month: dto.month, year: dto.year } },
    });
    if (existing && existing.status !== 'DRAFT') throw new BadRequestException(`${dto.returnType} for ${dto.month}/${dto.year} already filed`);

    // Aggregate sales data for the period
    const periodStart = new Date(dto.year, dto.month - 1, 1);
    const periodEnd = new Date(dto.year, dto.month, 1);

    const sales = await this.prisma.sale.findMany({
      where: { tenantId, deletedAt: null, status: 'COMPLETED', createdAt: { gte: periodStart, lt: periodEnd } },
      select: { subTotal: true, cgst: true, sgst: true, igst: true, totalAmount: true },
    });

    const totalTaxable = sales.reduce((sum, s) => sum + s.subTotal.toNumber(), 0);
    const totalCgst = sales.reduce((sum, s) => sum + s.cgst.toNumber(), 0);
    const totalSgst = sales.reduce((sum, s) => sum + s.sgst.toNumber(), 0);
    const totalIgst = sales.reduce((sum, s) => sum + s.igst.toNumber(), 0);
    const totalTax = totalCgst + totalSgst + totalIgst;

    // Build GSTR-1 B2B invoice list for the return JSON
    const invoices = dto.returnType === 'GSTR1'
      ? await this.buildGstr1Json(tenantId, periodStart, periodEnd)
      : await this.buildGstr3bJson(tenantId, totalTaxable, totalCgst, totalSgst, totalIgst, totalTax);

    const data = {
      tenantId,
      returnType: dto.returnType as never,
      month: dto.month,
      year: dto.year,
      totalTaxable: totalTaxable.toFixed(2),
      totalCgst: totalCgst.toFixed(2),
      totalSgst: totalSgst.toFixed(2),
      totalIgst: totalIgst.toFixed(2),
      totalTax: totalTax.toFixed(2),
      jsonData: invoices as any,
      createdBy,
    };

    const record = existing
      ? await this.prisma.gstReturn.update({ where: { id: existing.id }, data })
      : await this.prisma.gstReturn.create({ data });

    await this.auditService.log({ tenantId, userId: createdBy, action: 'CREATE', module: 'GstFiling', entityId: record.id, entityType: 'GstReturn', newValues: { returnType: dto.returnType, month: dto.month, year: dto.year, totalTax } });
    return record;
  }

  private async buildGstr1Json(tenantId: string, from: Date, to: Date) {
    const sales = await this.prisma.sale.findMany({
      where: { tenantId, deletedAt: null, status: 'COMPLETED', createdAt: { gte: from, lt: to } },
      select: { billNumber: true, subTotal: true, cgst: true, sgst: true, igst: true, totalAmount: true, createdAt: true },
    });
    return {
      returnType: 'GSTR1',
      b2c: sales.map(s => ({
        invoiceNumber: s.billNumber,
        taxableValue: s.subTotal,
        cgst: s.cgst,
        sgst: s.sgst,
        igst: s.igst,
        total: s.totalAmount,
        date: s.createdAt,
      })),
    };
  }

  private async buildGstr3bJson(tenantId: string, taxable: number, cgst: number, sgst: number, igst: number, totalTax: number) {
    return {
      returnType: 'GSTR3B',
      table3_1: {
        outwardTaxableSupplies: { taxableValue: taxable.toFixed(2), igst: igst.toFixed(2), cgst: cgst.toFixed(2), sgst: sgst.toFixed(2) },
      },
      taxPayable: totalTax.toFixed(2),
    };
  }

  async findAll(tenantId: string, query: GstReturnQueryDto) {
    const where: any = {
      tenantId,
      ...(query.returnType && { returnType: query.returnType as never }),
      ...(query.month && { month: query.month }),
      ...(query.year && { year: query.year }),
      ...(query.status && { status: query.status as never }),
    };
    const { skip, take } = paginate(query);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.gstReturn.findMany({ where, skip, take, orderBy: [{ year: 'desc' }, { month: 'desc' }] }),
      this.prisma.gstReturn.count({ where }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  async findOne(tenantId: string, id: string) {
    const record = await this.prisma.gstReturn.findFirst({ where: { id, tenantId } });
    if (!record) throw new NotFoundException('GST return not found');
    return record;
  }

  async markFiled(tenantId: string, id: string, dto: FiledGstReturnDto, filedBy: string) {
    const record = await this.findOne(tenantId, id);
    if (record.status !== 'DRAFT') throw new BadRequestException('Only DRAFT returns can be filed');

    const updated = await this.prisma.gstReturn.update({
      where: { id },
      data: { status: 'FILED' as never, filedAt: new Date(), filedBy },
    });

    await this.auditService.log({ tenantId, userId: filedBy, action: 'UPDATE', module: 'GstFiling', entityId: id, entityType: 'GstReturn', newValues: { status: 'FILED', filedAt: new Date(), reference: dto.referenceNumber } });
    return updated;
  }

  async getItcSummary(tenantId: string, month: number, year: number) {
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 1);

    const purchases = await this.prisma.purchaseOrder.findMany({
      where: { tenantId, deletedAt: null, status: 'INVOICED', updatedAt: { gte: periodStart, lt: periodEnd } },
      select: { totalAmount: true },
    });

    const totalPurchaseTaxable = purchases.reduce((sum, p) => sum + p.totalAmount.toNumber(), 0);
    // Simplified ITC: assume 3% GST on purchases (input credit)
    const estimatedItc = +(totalPurchaseTaxable * GOLD_GST_RATE).toFixed(2);

    return { month, year, totalPurchaseTaxable, estimatedItc };
  }
}
