import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../../common/decorators/tenant.decorator';
import { Permission } from '../../auth/rbac/permissions';
import { GirviService } from '../services/girvi.service';
import { KfsService } from '../services/kfs.service';
import { ReceiptService } from '../services/receipt.service';
import { RbiComplianceService } from '../services/rbi-compliance.service';
import {
  AcknowledgeKfsDto,
  CreateGirviDto,
  GirviQueryDto,
  RecordPaymentDto,
} from '../dto/girvi.dto';

@ApiTags('Girvi')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('api/v1/girvi')
export class GirviController {
  constructor(
    private readonly girviService: GirviService,
    private readonly kfsService: KfsService,
    private readonly receiptService: ReceiptService,
    private readonly rbiCompliance: RbiComplianceService,
  ) {}

  @Post()
  @RequirePermissions(Permission.GIRVI_CREATE)
  @ApiOperation({ summary: 'Create a new Girvi (gold loan)' })
  create(
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateGirviDto,
  ) {
    return this.girviService.create(tenantId, dto, user.id);
  }

  @Get()
  @RequirePermissions(Permission.GIRVI_VIEW)
  @ApiOperation({ summary: 'List Girvis with filters' })
  findAll(@TenantId() tenantId: string, @Query() query: GirviQueryDto) {
    return this.girviService.findAll(tenantId, query);
  }

  @Get('overdue')
  @RequirePermissions(Permission.GIRVI_VIEW)
  @ApiOperation({ summary: 'List all overdue Girvis' })
  getOverdue(@TenantId() tenantId: string) {
    return this.girviService.getOverdueGirvis(tenantId);
  }

  @Get(':id')
  @RequirePermissions(Permission.GIRVI_VIEW)
  @ApiOperation({ summary: 'Get Girvi details with items and payments' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.girviService.findById(tenantId, id);
  }

  @Get(':id/interest')
  @RequirePermissions(Permission.GIRVI_VIEW)
  @ApiOperation({ summary: 'Get interest breakdown for a Girvi' })
  getInterest(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.girviService.getInterestBreakdown(tenantId, id);
  }

  @Post(':id/kfs/generate')
  @RequirePermissions(Permission.GIRVI_UPDATE)
  @ApiOperation({ summary: 'Generate KFS PDF (English + Marathi) and store to S3' })
  async generateKfs(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    const key = await this.kfsService.generateAndStore(tenantId, id);
    const signedUrl = await this.kfsService.getSignedKfsUrl(tenantId, id);
    return { key, signedUrl };
  }

  @Get(':id/kfs/download')
  @RequirePermissions(Permission.GIRVI_VIEW)
  @ApiOperation({ summary: 'Get signed S3 URL for KFS PDF (1h expiry)' })
  getKfsUrl(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.kfsService.getSignedKfsUrl(tenantId, id);
  }

  @Post('kfs/acknowledge')
  @RequirePermissions(Permission.GIRVI_UPDATE)
  @ApiOperation({ summary: 'Acknowledge KFS — required before disbursement' })
  async acknowledgeKfs(
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: AcknowledgeKfsDto,
  ) {
    // Auto-generate KFS PDF if not already generated
    const girvi = await this.girviService.findById(tenantId, dto.girviId);
    if (!girvi.kfsGenerated) {
      await this.kfsService.generateAndStore(tenantId, dto.girviId);
    }
    return this.girviService.acknowledgeKfs(tenantId, dto.girviId, user.id);
  }

  @Patch(':id/disburse')
  @RequirePermissions(Permission.GIRVI_UPDATE)
  @ApiOperation({ summary: 'Mark Girvi as disbursed (KFS + vault required)' })
  disburse(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.girviService.disburse(tenantId, id, user.id);
  }

  @Post(':id/payment')
  @RequirePermissions(Permission.GIRVI_UPDATE)
  @ApiOperation({ summary: 'Record a payment (partial or full)' })
  async recordPayment(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: RecordPaymentDto,
  ) {
    const payment = await this.girviService.recordPayment(tenantId, id, dto, user.id);
    // Async receipt generation — don't block the response
    this.receiptService.generateForPayment(tenantId, payment.id).catch(() => {
      // receipt generation failure is non-blocking
    });
    return payment;
  }

  @Get('payments/:paymentId/receipt')
  @RequirePermissions(Permission.GIRVI_VIEW)
  @ApiOperation({ summary: 'Get signed S3 URL for payment receipt PDF (1h expiry)' })
  getReceiptUrl(@TenantId() tenantId: string, @Param('paymentId') paymentId: string) {
    return this.receiptService.getSignedReceiptUrl(tenantId, paymentId);
  }

  @Patch(':id/redeem')
  @RequirePermissions(Permission.GIRVI_CLOSE)
  @ApiOperation({ summary: 'Redeem Girvi — auto-releases vault slot' })
  redeem(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.girviService.redeem(tenantId, id, user.id);
  }

  @Patch(':id/renew')
  @RequirePermissions(Permission.GIRVI_UPDATE)
  @ApiOperation({ summary: 'Renew Girvi at current gold rate' })
  renew(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.girviService.renew(tenantId, id, user.id);
  }

  @Get(':id/valuation-certificate')
  @RequirePermissions(Permission.GIRVI_VIEW)
  @ApiOperation({ summary: 'Generate RBI 2026 compliant tamper-proof valuation certificate (PDF)' })
  async getValuationCertificate(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Res() res: import('express').Response,
  ) {
    const pdf = await this.rbiCompliance.generateValuationCertificate(tenantId, id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="ValuationCert-${id}.pdf"`,
      'Content-Length': pdf.length,
    });
    res.end(pdf);
  }
}
