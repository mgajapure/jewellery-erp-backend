import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditService } from '../../audit/audit.service';
import { CustomerRepository } from '../repositories/customer.repository';
import { CreateCustomerDto, CustomerQueryDto, UpdateCustomerDto } from '../dto/customer.dto';

@Injectable()
export class CustomerService {
  constructor(
    private readonly customerRepo: CustomerRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(tenantId: string, dto: CreateCustomerDto, userId: string) {
    const existing = await this.customerRepo.findByMobile(tenantId, dto.mobile);
    if (existing) throw new ConflictException('Customer with this mobile already exists');

    const customer = await this.customerRepo.create(tenantId, dto, userId);

    await this.auditService.log({
      tenantId,
      userId,
      action: 'CREATE',
      module: 'customers',
      entityId: customer.id,
      entityType: 'Customer',
      newValues: { name: customer.name, mobile: customer.mobile },
    });

    this.eventEmitter.emit('customer.created', { tenantId, customerId: customer.id });
    return customer;
  }

  async findById(tenantId: string, id: string) {
    const customer = await this.customerRepo.findById(tenantId, id);
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async findByQr(tenantId: string, qrCode: string) {
    const customer = await this.customerRepo.findByQr(tenantId, qrCode);
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async findAll(tenantId: string, query: CustomerQueryDto) {
    return this.customerRepo.findMany(tenantId, query);
  }

  async update(tenantId: string, id: string, dto: UpdateCustomerDto, userId: string) {
    await this.findById(tenantId, id);

    if (dto.mobile) {
      const existing = await this.customerRepo.findByMobile(tenantId, dto.mobile);
      if (existing && existing.id !== id) {
        throw new ConflictException('Mobile already assigned to another customer');
      }
    }

    const updated = await this.customerRepo.update(tenantId, id, dto);
    await this.auditService.log({
      tenantId,
      userId,
      action: 'UPDATE',
      module: 'customers',
      entityId: id,
      entityType: 'Customer',
    });

    return updated;
  }

  async verifyKyc(
    tenantId: string,
    id: string,
    status: 'VERIFIED' | 'REJECTED',
    userId: string,
  ) {
    await this.findById(tenantId, id);
    const updated = await this.customerRepo.updateKycStatus(tenantId, id, status, userId);
    await this.auditService.log({
      tenantId,
      userId,
      action: 'UPDATE',
      module: 'customers',
      entityId: id,
      entityType: 'CustomerKYC',
      newValues: { kycStatus: status },
    });
    return updated;
  }

  async delete(tenantId: string, id: string, userId: string) {
    await this.findById(tenantId, id);
    await this.customerRepo.softDelete(tenantId, id, userId);
    await this.auditService.log({
      tenantId,
      userId,
      action: 'DELETE',
      module: 'customers',
      entityId: id,
      entityType: 'Customer',
    });
  }

  async validatePanRequired(tenantId: string, customerId: string, loanAmount: number) {
    if (loanAmount > 50000) {
      const customer = await this.findById(tenantId, customerId);
      if (!customer.panNumber) {
        throw new BadRequestException('PAN number is mandatory for loans above ₹50,000');
      }
    }
  }
}
