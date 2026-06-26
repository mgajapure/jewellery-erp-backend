import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../../common/decorators/tenant.decorator';
import { Permission } from '../../auth/rbac/permissions';
import { SaleService } from '../services/sale.service';
import { CreateSaleDto, GstrExportDto, SaleQueryDto } from '../dto/sale.dto';

@ApiTags('Sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('api/v1/sales')
export class SaleController {
  constructor(private readonly saleService: SaleService) {}

  @Post()
  @RequirePermissions(Permission.SALES_CREATE)
  @ApiOperation({ summary: 'Create a sale — GST auto-calculated from category HSN, inventory decremented' })
  create(
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateSaleDto,
  ) {
    return this.saleService.create(tenantId, dto, user.id);
  }

  @Get()
  @RequirePermissions(Permission.SALES_VIEW)
  @ApiOperation({ summary: 'List sales with date range / customer / search filters' })
  findAll(@TenantId() tenantId: string, @Query() query: SaleQueryDto) {
    return this.saleService.findAll(tenantId, query);
  }

  @Get('gstr1')
  @RequirePermissions(Permission.REPORTS_EXPORT)
  @ApiOperation({ summary: 'GSTR-1 data export for a given month (HSN summary + invoice list)' })
  getGstr1(@TenantId() tenantId: string, @Query() query: GstrExportDto) {
    return this.saleService.getGstr1Data(tenantId, query.year, query.month);
  }

  @Get('gstr3b')
  @RequirePermissions(Permission.REPORTS_EXPORT)
  @ApiOperation({ summary: 'GSTR-3B aggregate data for a given month' })
  getGstr3b(@TenantId() tenantId: string, @Query() query: GstrExportDto) {
    return this.saleService.getGstr3bData(tenantId, query.year, query.month);
  }

  @Get(':id')
  @RequirePermissions(Permission.SALES_VIEW)
  @ApiOperation({ summary: 'Get sale details with items and payments' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.saleService.findById(tenantId, id);
  }
}
