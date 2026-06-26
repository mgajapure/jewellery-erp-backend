import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../../common/decorators/tenant.decorator';
import { Permission } from '../../auth/rbac/permissions';
import { BarcodeService } from '../services/barcode.service';
import { BarcodeQueryDto, GenerateBarcodeDto } from '../dto/barcode.dto';

@ApiTags('Barcode')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('api/v1/barcode')
export class BarcodeController {
  constructor(private readonly barcodeService: BarcodeService) {}

  @Post('generate')
  @RequirePermissions(Permission.INVENTORY_MANAGE)
  @ApiOperation({ summary: 'Generate barcode/QR for inventory item SKU, logs print audit' })
  async generateBarcode(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: GenerateBarcodeDto) {
    const data = await this.barcodeService.generateBarcode(tenantId, dto, user.userId);
    return { success: true, data };
  }

  @Get('lookup/:sku')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Lookup inventory item by SKU scan (< 1s)' })
  async lookupBySku(@TenantId() tenantId: string, @Param('sku') sku: string) {
    const data = await this.barcodeService.lookupBySku(tenantId, sku);
    return { success: true, data };
  }

  @Get('history')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Barcode print history with reprint audit trail' })
  async findPrintHistory(@TenantId() tenantId: string, @Query() query: BarcodeQueryDto) {
    const data = await this.barcodeService.findPrintHistory(tenantId, query);
    return { success: true, data };
  }
}
