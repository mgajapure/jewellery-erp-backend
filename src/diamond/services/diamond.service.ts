import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CreateDiamondCertificateDto, DiamondQueryDto } from '../dto/diamond.dto';
import { paginate, buildPaginatedResult } from '../../common/utils/pagination';
import dayjs from 'dayjs';

// Rapaport base price table (USD/ct) — simplified tiers by colour + clarity
const RAP_TABLE: Record<string, Record<string, number>> = {
  'D': { 'IF': 25000, 'VVS1': 22000, 'VVS2': 19000, 'VS1': 16000, 'VS2': 13500, 'SI1': 9500, 'SI2': 7000 },
  'E': { 'IF': 22000, 'VVS1': 19500, 'VVS2': 17000, 'VS1': 14000, 'VS2': 12000, 'SI1': 8500, 'SI2': 6200 },
  'F': { 'IF': 19000, 'VVS1': 17000, 'VVS2': 15000, 'VS1': 12500, 'VS2': 10500, 'SI1': 7500, 'SI2': 5500 },
  'G': { 'IF': 16000, 'VVS1': 14000, 'VVS2': 12000, 'VS1': 10000, 'VS2': 8500, 'SI1': 6200, 'SI2': 4500 },
  'H': { 'IF': 13000, 'VVS1': 11500, 'VVS2': 10000, 'VS1': 8500, 'VS2': 7000, 'SI1': 5200, 'SI2': 3800 },
};

@Injectable()
export class DiamondService {
  private readonly logger = new Logger(DiamondService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createCertificate(tenantId: string, dto: CreateDiamondCertificateDto, createdBy: string) {
    const item = await this.prisma.inventoryItem.findFirst({ where: { id: dto.inventoryItemId, tenantId, deletedAt: null } });
    if (!item) throw new NotFoundException('Inventory item not found');

    const existing = await this.prisma.diamondCertificate.findFirst({ where: { certNumber: dto.certNumber } });
    if (existing) throw new BadRequestException(`Certificate ${dto.certNumber} already registered`);

    const cert = await this.prisma.diamondCertificate.create({
      data: {
        tenantId,
        inventoryItemId: dto.inventoryItemId,
        certNumber: dto.certNumber,
        lab: dto.lab,
        shape: dto.shape,
        caratWeight: dto.caratWeight,
        color: dto.color,
        clarity: dto.clarity,
        cut: dto.cut,
        polish: dto.polish,
        symmetry: dto.symmetry,
        fluorescence: dto.fluorescence,
        rapPrice: dto.rapPrice,
        certUrl: dto.certUrl,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });

    await this.auditService.log({ tenantId, userId: createdBy, action: 'CREATE', module: 'diamond', entityId: cert.id, entityType: 'DiamondCertificate', newValues: { certNumber: dto.certNumber, lab: dto.lab } });
    return cert;
  }

  async findCertificates(tenantId: string, query: DiamondQueryDto) {
    const where: any = {
      tenantId,
      ...(query.inventoryItemId && { inventoryItemId: query.inventoryItemId }),
      ...(query.lab && { lab: query.lab }),
      ...(query.color && { color: query.color }),
      ...(query.clarity && { clarity: query.clarity }),
    };
    const { skip, take } = paginate(query);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.diamondCertificate.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.diamondCertificate.count({ where }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  async findCertificateByCertNumber(certNumber: string) {
    const cert = await this.prisma.diamondCertificate.findFirst({ where: { certNumber } });
    if (!cert) throw new NotFoundException(`Certificate ${certNumber} not found`);
    return cert;
  }

  async valuateByRapaport(certId: string) {
    const cert = await this.prisma.diamondCertificate.findFirst({ where: { id: certId } });
    if (!cert) throw new NotFoundException('Certificate not found');

    const basePrice = RAP_TABLE[cert.color]?.[cert.clarity] ?? null;
    if (!basePrice) {
      return { certId, certNumber: cert.certNumber, color: cert.color, clarity: cert.clarity, caratWeight: Number(cert.caratWeight), rapBasePricePerCarat: null, totalRapValue: null, note: 'No Rapaport data for this grade combination' };
    }

    const discountPercent = cert.cut === 'Excellent' ? 0 : cert.cut === 'Very Good' ? 5 : 10;
    const effectivePrice = basePrice * (1 - discountPercent / 100);
    const totalValue = effectivePrice * Number(cert.caratWeight);

    return {
      certId, certNumber: cert.certNumber,
      color: cert.color, clarity: cert.clarity, cut: cert.cut,
      caratWeight: Number(cert.caratWeight),
      rapBasePricePerCarat: basePrice,
      cutDiscountPercent: discountPercent,
      effectivePricePerCarat: parseFloat(effectivePrice.toFixed(2)),
      totalRapValue: parseFloat(totalValue.toFixed(2)),
      currency: 'USD',
    };
  }

  // Daily alert at 8 AM for expiring certificates
  @Cron('0 8 * * *')
  async checkCertificateExpiry() {
    const in30Days = dayjs().add(30, 'day').toDate();
    const expiring = await this.prisma.diamondCertificate.findMany({
      where: { expiresAt: { lte: in30Days, gte: new Date() } },
      include: { inventoryItem: { select: { name: true, tenantId: true } } },
    });

    for (const cert of expiring) {
      const daysLeft = dayjs(cert.expiresAt).diff(dayjs(), 'day');
      this.logger.warn(`Certificate ${cert.certNumber} expires in ${daysLeft} days`);
      this.eventEmitter.emit('diamond.cert.expiring', { tenantId: cert.tenantId, certId: cert.id, certNumber: cert.certNumber, daysLeft });
    }
  }
}
