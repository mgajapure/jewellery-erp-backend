import {
  Body, Controller, Get, Param, Post, Put, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../../common/decorators/tenant.decorator';
import { Permission } from '../../auth/rbac/permissions';
import { KarigarService } from '../services/karigar.service';
import {
  CreateJobCardDto, CreateKarigarDto, IssueMaterialDto,
  JobCardQueryDto, KarigarQueryDto, ReceiveMaterialDto, RecordKarigarPaymentDto,
} from '../dto/karigar.dto';

@ApiTags('Karigar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('api/v1/karigar')
export class KarigarController {
  constructor(private readonly karigarService: KarigarService) {}

  @Post()
  @RequirePermissions(Permission.KARIGAR_MANAGE)
  @ApiOperation({ summary: 'Create karigar' })
  async createKarigar(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: CreateKarigarDto) {
    const data = await this.karigarService.createKarigar(tenantId, dto, user.userId);
    return { success: true, data };
  }

  @Get()
  @RequirePermissions(Permission.KARIGAR_VIEW)
  @ApiOperation({ summary: 'List karigars' })
  async findKarigars(@TenantId() tenantId: string, @Query() query: KarigarQueryDto) {
    const data = await this.karigarService.findKarigars(tenantId, query);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermissions(Permission.KARIGAR_VIEW)
  @ApiOperation({ summary: 'Get karigar by ID' })
  async findKarigarById(@TenantId() tenantId: string, @Param('id') id: string) {
    const data = await this.karigarService.findKarigarById(tenantId, id);
    return { success: true, data };
  }

  @Get(':id/ledger')
  @RequirePermissions(Permission.KARIGAR_VIEW)
  @ApiOperation({ summary: 'Get karigar payment ledger and outstanding' })
  async getKarigarLedger(@TenantId() tenantId: string, @Param('id') id: string) {
    const data = await this.karigarService.getKarigarLedger(tenantId, id);
    return { success: true, data };
  }

  @Post('jobs')
  @RequirePermissions(Permission.KARIGAR_MANAGE)
  @ApiOperation({ summary: 'Create job card' })
  async createJobCard(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: CreateJobCardDto) {
    const data = await this.karigarService.createJobCard(tenantId, dto, user.userId);
    return { success: true, data };
  }

  @Get('jobs/list')
  @RequirePermissions(Permission.KARIGAR_VIEW)
  @ApiOperation({ summary: 'List job cards' })
  async findJobCards(@TenantId() tenantId: string, @Query() query: JobCardQueryDto) {
    const data = await this.karigarService.findJobCards(tenantId, query);
    return { success: true, data };
  }

  @Get('jobs/:id')
  @RequirePermissions(Permission.KARIGAR_VIEW)
  @ApiOperation({ summary: 'Get job card by ID with full details' })
  async findJobById(@TenantId() tenantId: string, @Param('id') id: string) {
    const data = await this.karigarService.findJobById(tenantId, id);
    return { success: true, data };
  }

  @Post('jobs/:id/issue-material')
  @RequirePermissions(Permission.KARIGAR_MANAGE)
  @ApiOperation({ summary: 'Issue raw material to karigar for job' })
  async issueMaterial(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: IssueMaterialDto,
  ) {
    const data = await this.karigarService.issueMaterial(tenantId, id, dto, user.userId);
    return { success: true, data };
  }

  @Post('jobs/:id/receive-material')
  @RequirePermissions(Permission.KARIGAR_MANAGE)
  @ApiOperation({ summary: 'Receive finished material back from karigar with wastage calculation' })
  async receiveMaterial(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ReceiveMaterialDto,
  ) {
    const data = await this.karigarService.receiveMaterial(tenantId, id, dto, user.userId);
    return { success: true, data };
  }

  @Put('jobs/:id/complete')
  @RequirePermissions(Permission.KARIGAR_MANAGE)
  @ApiOperation({ summary: 'Mark job as completed with making charge' })
  async completeJob(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('makingCharge') makingCharge: number,
  ) {
    const data = await this.karigarService.completeJob(tenantId, id, makingCharge, user.userId);
    return { success: true, data };
  }

  @Post('jobs/:id/payments')
  @RequirePermissions(Permission.KARIGAR_MANAGE)
  @ApiOperation({ summary: 'Record payment to karigar for job' })
  async recordPayment(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: RecordKarigarPaymentDto,
  ) {
    const data = await this.karigarService.recordPayment(tenantId, id, dto, user.userId);
    return { success: true, data };
  }
}
