import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { paginate, buildPaginatedResult } from '../../common/utils/pagination';
import { ApprovePayrollDto, GeneratePayrollDto, PayrollQueryDto } from '../dto/payroll.dto';

// Statutory deduction rates (FY 2024-25)
const PF_RATE = 0.12;      // 12% on basic
const ESI_RATE = 0.0075;   // 0.75% on gross (employee share)
const ESI_CEILING = 21000; // ESI applicable if gross ≤ 21000/month
const TDS_SLAB = 250000;   // Annual exemption threshold — simplified flat rate

@Injectable()
export class PayrollService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private calcDeductions(basic: number, hra: number, da: number, other: number, gross: number, otherDeductions: number) {
    const pfDeduction = +(basic * PF_RATE).toFixed(2);
    const esiDeduction = gross <= ESI_CEILING ? +(gross * ESI_RATE).toFixed(2) : 0;
    // Simplified TDS: 5% on annualised gross above exemption
    const annualGross = gross * 12;
    const tdsDeduction = annualGross > TDS_SLAB ? +((annualGross - TDS_SLAB) * 0.05 / 12).toFixed(2) : 0;
    const totalDeductions = +(pfDeduction + esiDeduction + tdsDeduction + otherDeductions).toFixed(2);
    const netSalary = +(gross - totalDeductions).toFixed(2);
    return { pfDeduction, esiDeduction, tdsDeduction, totalDeductions, netSalary };
  }

  async generatePayroll(tenantId: string, dto: GeneratePayrollDto, createdBy: string) {
    const hra = dto.hra ?? 0;
    const da = dto.da ?? 0;
    const otherAllowances = dto.otherAllowances ?? 0;
    const otherDeductions = dto.otherDeductions ?? 0;

    // Pro-rate salary if present days < working days
    const workingDays = dto.workingDays ?? 26;
    const presentDays = dto.presentDays ?? workingDays;
    const attendanceRatio = Math.min(presentDays / workingDays, 1);

    const basic = +(dto.basicSalary * attendanceRatio).toFixed(2);
    const hraAmt = +(hra * attendanceRatio).toFixed(2);
    const daAmt = +(da * attendanceRatio).toFixed(2);
    const othersAmt = +(otherAllowances * attendanceRatio).toFixed(2);
    const grossSalary = +(basic + hraAmt + daAmt + othersAmt).toFixed(2);
    const { pfDeduction, esiDeduction, tdsDeduction, totalDeductions, netSalary } =
      this.calcDeductions(basic, hraAmt, daAmt, othersAmt, grossSalary, otherDeductions);

    const existing = await this.prisma.payrollRecord.findUnique({ where: { staffId_month_year: { staffId: dto.staffId, month: dto.month, year: dto.year } } });
    if (existing && existing.status !== 'DRAFT') {
      throw new BadRequestException('Payroll already processed for this period');
    }

    const data = {
      tenantId, staffId: dto.staffId, month: dto.month, year: dto.year,
      basicSalary: basic, hra: hraAmt, da: daAmt, otherAllowances: othersAmt, grossSalary,
      pfDeduction, esiDeduction, tdsDeduction, otherDeductions, totalDeductions, netSalary,
      workingDays, presentDays, createdBy,
    };

    const record = existing
      ? await this.prisma.payrollRecord.update({ where: { id: existing.id }, data })
      : await this.prisma.payrollRecord.create({ data });

    await this.auditService.log({ tenantId, userId: createdBy, action: 'CREATE', module: 'Payroll', entityId: record.id, entityType: 'PayrollRecord', newValues: { staffId: dto.staffId, month: dto.month, year: dto.year, grossSalary, netSalary } });
    return record;
  }

  async findAll(tenantId: string, query: PayrollQueryDto) {
    const where: any = {
      tenantId,
      ...(query.month && { month: query.month }),
      ...(query.year && { year: query.year }),
      ...(query.staffId && { staffId: query.staffId }),
      ...(query.status && { status: query.status as never }),
    };
    const { skip, take } = paginate(query);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.payrollRecord.findMany({ where, skip, take, orderBy: [{ year: 'desc' }, { month: 'desc' }] }),
      this.prisma.payrollRecord.count({ where }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  async findOne(tenantId: string, id: string) {
    const record = await this.prisma.payrollRecord.findFirst({ where: { id, tenantId } });
    if (!record) throw new NotFoundException('Payroll record not found');
    return record;
  }

  async approvePayroll(tenantId: string, id: string, dto: ApprovePayrollDto, approvedBy: string) {
    const record = await this.findOne(tenantId, id);
    if (record.status !== 'DRAFT') throw new BadRequestException('Only DRAFT payroll can be approved');

    const updated = await this.prisma.payrollRecord.update({
      where: { id },
      data: { status: 'APPROVED' as never, approvedBy, approvedAt: new Date() },
    });

    await this.auditService.log({ tenantId, userId: approvedBy, action: 'APPROVE', module: 'Payroll', entityId: id, entityType: 'PayrollRecord', newValues: { status: 'APPROVED' } });
    return updated;
  }

  async markPaid(tenantId: string, id: string, paidBy: string) {
    const record = await this.findOne(tenantId, id);
    if (record.status !== 'APPROVED') throw new BadRequestException('Only APPROVED payroll can be marked as paid');

    const updated = await this.prisma.payrollRecord.update({
      where: { id },
      data: { status: 'PAID' as never, paidAt: new Date() },
    });

    await this.auditService.log({ tenantId, userId: paidBy, action: 'UPDATE', module: 'Payroll', entityId: id, entityType: 'PayrollRecord', newValues: { status: 'PAID' } });
    return updated;
  }

  async getPayrollSummary(tenantId: string, month: number, year: number) {
    const records = await this.prisma.payrollRecord.findMany({ where: { tenantId, month, year } });
    const totals = records.reduce(
      (acc, r) => ({
        grossSalary: acc.grossSalary + r.grossSalary.toNumber(),
        pfDeduction: acc.pfDeduction + r.pfDeduction.toNumber(),
        esiDeduction: acc.esiDeduction + r.esiDeduction.toNumber(),
        tdsDeduction: acc.tdsDeduction + r.tdsDeduction.toNumber(),
        netSalary: acc.netSalary + r.netSalary.toNumber(),
        count: acc.count + 1,
      }),
      { grossSalary: 0, pfDeduction: 0, esiDeduction: 0, tdsDeduction: 0, netSalary: 0, count: 0 },
    );
    return { month, year, ...totals };
  }
}
