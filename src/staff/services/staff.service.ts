import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CreateStaffDto, StaffQueryDto, UpdateStaffDto } from '../dto/staff.dto';
import { paginate, buildPaginatedResult } from '../../common/utils/pagination';

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createStaff(tenantId: string, dto: CreateStaffDto, createdBy: string) {
    const existing = await this.prisma.user.findFirst({ where: { tenantId, mobile: dto.mobile } });
    if (existing) throw new ConflictException('Mobile number already registered for this tenant');

    const user = await this.prisma.user.create({
      data: { tenantId, name: dto.name, mobile: dto.mobile, role: dto.role as never, branchId: dto.branchId },
    });
    await this.auditService.log({ tenantId, userId: createdBy, action: 'CREATE', module: 'staff', entityId: user.id, entityType: 'User', newValues: { name: dto.name, mobile: dto.mobile, role: dto.role } });
    return this.sanitize(user);
  }

  async findStaff(tenantId: string, query: StaffQueryDto) {
    const where: any = {
      tenantId, isActive: true, deletedAt: null,
      ...(query.role && { role: query.role as never }),
      ...(query.branchId && { branchId: query.branchId }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { mobile: { contains: query.search } },
        ],
      }),
    };
    const { skip, take } = paginate(query);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ where, skip, take, orderBy: { name: 'asc' }, include: { branch: { select: { name: true, code: true } } } }),
      this.prisma.user.count({ where }),
    ]);
    return buildPaginatedResult(data.map(this.sanitize), total, query);
  }

  async findStaffById(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { branch: { select: { name: true, code: true } }, devices: { select: { id: true, fingerprint: true, status: true, approvedBy: true, lastSeenAt: true } } },
    });
    if (!user) throw new NotFoundException('Staff member not found');
    return this.sanitize(user);
  }

  async updateStaff(tenantId: string, id: string, dto: UpdateStaffDto, updatedBy: string) {
    await this.findStaffById(tenantId, id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { ...(dto.name && { name: dto.name }), ...(dto.role && { role: dto.role as never }), ...(dto.branchId !== undefined && { branchId: dto.branchId }) },
    });
    await this.auditService.log({ tenantId, userId: updatedBy, action: 'UPDATE', module: 'staff', entityId: id, entityType: 'User', newValues: dto as Record<string, unknown> });
    return this.sanitize(updated);
  }

  async deactivateStaff(tenantId: string, id: string, deletedBy: string) {
    await this.findStaffById(tenantId, id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date(), deletedBy },
    });
    await this.auditService.log({ tenantId, userId: deletedBy, action: 'UPDATE', module: 'staff', entityId: id, entityType: 'User', newValues: { isActive: false } });
    return this.sanitize(updated);
  }

  async approveDevice(tenantId: string, deviceId: string, approvedBy: string) {
    const device = await this.prisma.device.findFirst({ where: { id: deviceId, tenantId } });
    if (!device) throw new NotFoundException('Device not found');
    const updated = await this.prisma.device.update({ where: { id: deviceId }, data: { status: 'APPROVED' as never, approvedBy, approvedAt: new Date() } });
    await this.auditService.log({ tenantId, userId: approvedBy, action: 'UPDATE', module: 'staff', entityId: deviceId, entityType: 'Device', newValues: { isApproved: true } });
    return updated;
  }

  async getPendingDevices(tenantId: string) {
    return this.prisma.device.findMany({
      where: { tenantId, status: 'PENDING' as never },
      include: { user: { select: { name: true, mobile: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  private sanitize(user: any) {
    const { pinHash, ...safe } = user;
    return safe;
  }
}
