import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { UpdateInterestConfigDto, UpdateSettingsDto, UpdateTenantProfileDto } from '../dto/settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getTenantProfile(tenantId: string) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async updateTenantProfile(tenantId: string, dto: UpdateTenantProfileDto, updatedBy: string) {
    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: dto,
    });
    await this.auditService.log({ tenantId, userId: updatedBy, action: 'UPDATE', module: 'settings', entityId: tenantId, entityType: 'Tenant', newValues: dto as Record<string, unknown> });
    return tenant;
  }

  async getSettings(tenantId: string) {
    const tenant = await this.getTenantProfile(tenantId);
    return (tenant.settings as Record<string, unknown>) ?? {};
  }

  async updateSettings(tenantId: string, dto: UpdateSettingsDto, updatedBy: string) {
    const current = await this.getSettings(tenantId);
    const merged = { ...current, ...dto.settings };

    await this.prisma.tenant.update({ where: { id: tenantId }, data: { settings: merged as any } });
    await this.auditService.log({ tenantId, userId: updatedBy, action: 'UPDATE', module: 'settings', entityId: tenantId, entityType: 'TenantSettings', newValues: dto.settings });
    return merged;
  }

  async updateInterestConfig(tenantId: string, dto: UpdateInterestConfigDto, updatedBy: string) {
    const current = await this.getSettings(tenantId);
    const interest = { ...(current['interest'] as Record<string, unknown> ?? {}), ...dto };
    const merged = { ...current, interest };

    await this.prisma.tenant.update({ where: { id: tenantId }, data: { settings: merged as any } });
    await this.auditService.log({ tenantId, userId: updatedBy, action: 'UPDATE', module: 'settings', entityId: tenantId, entityType: 'InterestConfig', newValues: dto as Record<string, unknown> });
    return interest;
  }

  async getInterestConfig(tenantId: string) {
    const settings = await this.getSettings(tenantId);
    return (settings['interest'] as Record<string, unknown>) ?? {
      defaultInterestRate: 2,
      defaultInterestType: 'SIMPLE',
      overdueInterestRate: 3,
      billingThresholdDays: 15,
    };
  }
}
