import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto, CustomerQueryDto } from '../dto/customer.dto';
import { paginate, buildPaginatedResult } from '../../common/utils/pagination';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateCustomerDto, createdBy: string) {
    const customerId = `CUST-${Date.now().toString(36).toUpperCase()}`;
    const qrCode = uuidv4();
    return this.prisma.customer.create({
      data: {
        tenantId,
        customerId,
        qrCode,
        name: dto.name,
        mobile: dto.mobile,
        alternateMobile: dto.alternateMobile,
        email: dto.email,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        aadhaarNumber: dto.aadhaarNumber,
        panNumber: dto.panNumber,
      },
    });
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.customer.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { documents: true },
    });
  }

  async findByQr(tenantId: string, qrCode: string) {
    return this.prisma.customer.findFirst({
      where: { tenantId, qrCode, deletedAt: null },
    });
  }

  async findByMobile(tenantId: string, mobile: string) {
    return this.prisma.customer.findFirst({
      where: { tenantId, mobile, deletedAt: null },
    });
  }

  async findMany(tenantId: string, query: CustomerQueryDto) {
    const where: Prisma.CustomerWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.mobile && { mobile: query.mobile }),
      ...(query.kycStatus && { kycStatus: query.kycStatus as never }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { mobile: { contains: query.search } },
          { customerId: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const { skip, take } = paginate(query);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.customer.count({ where }),
    ]);

    return buildPaginatedResult(data, total, query);
  }

  async update(tenantId: string, id: string, dto: UpdateCustomerDto) {
    return this.prisma.customer.update({
      where: { id, tenantId },
      data: {
        ...dto,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
    });
  }

  async softDelete(tenantId: string, id: string, deletedBy: string) {
    return this.prisma.customer.update({
      where: { id, tenantId },
      data: { deletedAt: new Date(), deletedBy },
    });
  }

  async updateKycStatus(
    tenantId: string,
    id: string,
    status: 'VERIFIED' | 'REJECTED',
    verifiedBy: string,
  ) {
    return this.prisma.customer.update({
      where: { id, tenantId },
      data: {
        kycStatus: status,
        kycVerifiedAt: status === 'VERIFIED' ? new Date() : undefined,
        kycVerifiedBy: status === 'VERIFIED' ? verifiedBy : undefined,
      },
    });
  }

  async addDocument(
    tenantId: string,
    customerId: string,
    docType: string,
    docNumber: string | undefined,
    fileUrl: string,
    fileKey: string,
    uploadedBy: string,
  ) {
    return this.prisma.customerDocument.create({
      data: { tenantId, customerId, docType, docNumber, fileUrl, fileKey, uploadedBy },
    });
  }

  async updateGoldPledged(tenantId: string, customerId: string, delta: number) {
    return this.prisma.customer.update({
      where: { id: customerId, tenantId },
      data: { totalGoldPledged: { increment: delta } },
    });
  }
}
