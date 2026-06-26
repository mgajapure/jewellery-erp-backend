import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { Permission } from '../../auth/rbac/permissions';
import { Form6Service } from '../services/form6.service';
import { Form9Service } from '../services/form9.service';
import { Form11Service } from '../services/form11.service';
import { Form12Service } from '../services/form12.service';
import { Form13Service } from '../services/form13.service';
import { Section25Service } from '../services/section25.service';
import {
  Form6QueryDto,
  Form9QueryDto,
  Form11QueryDto,
  Form12QueryDto,
  Form13QueryDto,
  Section25NoticeDto,
  Section25StatementDto,
} from '../dto/compliance.dto';

@ApiTags('Compliance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('api/v1/compliance')
export class ComplianceController {
  constructor(
    private readonly form6Service: Form6Service,
    private readonly form9Service: Form9Service,
    private readonly form11Service: Form11Service,
    private readonly form12Service: Form12Service,
    private readonly form13Service: Form13Service,
    private readonly section25Service: Section25Service,
  ) {}

  @Get('form6')
  @RequirePermissions(Permission.REPORTS_VIEW)
  @ApiOperation({ summary: 'Form 6 — Daily Cash Book (Maharashtra Pawnbrokers Act)' })
  async getForm6(
    @TenantId() tenantId: string,
    @Query() query: Form6QueryDto,
    @Res() res: Response,
  ) {
    const pdf = await this.form6Service.generate(tenantId, new Date(query.date));
    this.sendPdf(res, pdf, `Form6-CashBook-${query.date}.pdf`);
  }

  @Get('form9')
  @RequirePermissions(Permission.REPORTS_VIEW)
  @ApiOperation({ summary: 'Form 9 — Debtor Ledger for a customer' })
  async getForm9(
    @TenantId() tenantId: string,
    @Query() query: Form9QueryDto,
    @Res() res: Response,
  ) {
    const pdf = await this.form9Service.generate(tenantId, query.customerId);
    this.sendPdf(res, pdf, `Form9-DebtorLedger-${query.customerId}.pdf`);
  }

  @Get('form11')
  @RequirePermissions(Permission.REPORTS_VIEW)
  @ApiOperation({ summary: 'Form 11 — Repayment Receipt (statutory)' })
  async getForm11(
    @TenantId() tenantId: string,
    @Query() query: Form11QueryDto,
    @Res() res: Response,
  ) {
    const pdf = await this.form11Service.generate(tenantId, query.paymentId);
    this.sendPdf(res, pdf, `Form11-RepaymentReceipt-${query.paymentId}.pdf`);
  }

  @Get('form12')
  @RequirePermissions(Permission.REPORTS_VIEW)
  @ApiOperation({ summary: 'Form 12 — Receipt to Debtor (at pledge time)' })
  async getForm12(
    @TenantId() tenantId: string,
    @Query() query: Form12QueryDto,
    @Res() res: Response,
  ) {
    const pdf = await this.form12Service.generate(tenantId, query.girviId);
    this.sendPdf(res, pdf, `Form12-PledgeReceipt-${query.girviId}.pdf`);
  }

  @Get('form13')
  @RequirePermissions(Permission.REPORTS_VIEW)
  @ApiOperation({ summary: 'Form 13 — Annual Capital Account' })
  async getForm13(
    @TenantId() tenantId: string,
    @Query() query: Form13QueryDto,
    @Res() res: Response,
  ) {
    const pdf = await this.form13Service.generate(tenantId, Number(query.year));
    this.sendPdf(res, pdf, `Form13-CapitalAccount-${query.year}.pdf`);
  }

  @Post('section25/notice')
  @RequirePermissions(Permission.GIRVI_UPDATE)
  @ApiOperation({ summary: 'Section 25(1) — Generate 14-day auction notice for overdue Girvi' })
  async getSection25Notice(
    @TenantId() tenantId: string,
    @Body() dto: Section25NoticeDto,
    @Res() res: Response,
  ) {
    const pdf = await this.section25Service.generateNotice(tenantId, dto.girviId);
    this.sendPdf(res, pdf, `Section25-AuctionNotice-${dto.girviId}.pdf`);
  }

  @Get('section25/statement')
  @RequirePermissions(Permission.REPORTS_VIEW)
  @ApiOperation({ summary: 'Section 25(1) — Summary statement of overdue/auction cases' })
  async getSection25Statement(
    @TenantId() tenantId: string,
    @Query() query: Section25StatementDto,
    @Res() res: Response,
  ) {
    const pdf = await this.section25Service.generateStatement(
      tenantId,
      new Date(query.from),
      new Date(query.to),
    );
    this.sendPdf(res, pdf, `Section25-Statement-${query.from}-${query.to}.pdf`);
  }

  private sendPdf(res: Response, pdf: Buffer, filename: string): void {
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdf.length,
    });
    res.end(pdf);
  }
}
