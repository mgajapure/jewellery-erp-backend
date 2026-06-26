import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../../common/decorators/tenant.decorator';
import { Permission } from '../../auth/rbac/permissions';
import { DiamondService } from '../services/diamond.service';
import { CreateDiamondCertificateDto, DiamondQueryDto } from '../dto/diamond.dto';

@ApiTags('Diamond Certificates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('api/v1/diamond')
export class DiamondController {
  constructor(private readonly diamondService: DiamondService) {}

  @Post('certificates')
  @RequirePermissions(Permission.INVENTORY_MANAGE)
  @ApiOperation({ summary: 'Register diamond certificate (GIA/IGI/HRD) against inventory item' })
  async createCertificate(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: CreateDiamondCertificateDto) {
    const data = await this.diamondService.createCertificate(tenantId, dto, user.userId);
    return { success: true, data };
  }

  @Get('certificates')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'List diamond certificates with 4C filters' })
  async findCertificates(@TenantId() tenantId: string, @Query() query: DiamondQueryDto) {
    const data = await this.diamondService.findCertificates(tenantId, query);
    return { success: true, data };
  }

  @Get('certificates/lookup/:certNumber')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Lookup certificate by number (GIA/IGI cert scan)' })
  async findByCertNumber(@Param('certNumber') certNumber: string) {
    const data = await this.diamondService.findCertificateByCertNumber(certNumber);
    return { success: true, data };
  }

  @Get('certificates/:id/valuation')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Rapaport valuation — price/ct × carat weight with cut discount' })
  async valuateByRapaport(@Param('id') id: string) {
    const data = await this.diamondService.valuateByRapaport(id);
    return { success: true, data };
  }
}
