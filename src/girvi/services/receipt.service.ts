import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ReceiptPdfService, ReceiptData } from '../../pdf/services/receipt-pdf.service';
import { StorageService } from '../../files/services/storage.service';

@Injectable()
export class ReceiptService {
  private readonly logger = new Logger(ReceiptService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly receiptPdfService: ReceiptPdfService,
    private readonly storageService: StorageService,
  ) {}

  async generateForPayment(tenantId: string, paymentId: string): Promise<string> {
    const payment = await this.prisma.girviPayment.findFirstOrThrow({
      where: { id: paymentId, tenantId },
      include: {
        girvi: {
          include: {
            customer: true,
            tenant: true,
            payments: {
              where: { tenantId },
              orderBy: { paymentDate: 'asc' },
            },
          },
        },
      },
    });

    const girvi = payment.girvi;
    const totalPrincipalPaid = girvi.payments.reduce(
      (sum, p) => sum + Number(p.principalPaid),
      0,
    );
    const principalBalance = Number(girvi.principalAmount) - totalPrincipalPaid;

    const receiptData: ReceiptData = {
      receiptNumber: payment.receiptNumber ?? `RCT-${Date.now().toString(36).toUpperCase()}`,
      date: payment.paymentDate,
      shopName: girvi.tenant.name,
      shopAddress: girvi.tenant.address ?? '',
      shopPhone: girvi.tenant.phone,
      shopGstin: girvi.tenant.gstin ?? undefined,
      customerName: girvi.customer.name,
      customerMobile: girvi.customer.mobile,
      girviNumber: girvi.girviNumber,
      startDate: girvi.startDate,
      dueDate: girvi.dueDate,
      originalPrincipal: Number(girvi.principalAmount),
      principalPaid: Number(payment.principalPaid),
      interestPaid: Number(payment.interestPaid),
      penaltyPaid: Number(payment.penaltyPaid),
      totalPaid: Number(payment.totalPaid),
      paymentMode: payment.paymentMode,
      principalBalance: Math.max(0, principalBalance),
      notes: payment.notes ?? undefined,
    };

    const [a4Buffer, thermalBuffer] = await Promise.all([
      this.receiptPdfService.generate(receiptData),
      this.receiptPdfService.generateThermal(receiptData),
    ]);

    // Store A4 version (WhatsApp share)
    const { key: a4Key } = await this.storageService.uploadBuffer(
      tenantId,
      'girvi/receipts',
      girvi.id,
      `Receipt-${receiptData.receiptNumber}.pdf`,
      a4Buffer,
      'application/pdf',
    );

    // Store thermal version (Bluetooth printer)
    await this.storageService.uploadBuffer(
      tenantId,
      'girvi/receipts/thermal',
      girvi.id,
      `Thermal-${receiptData.receiptNumber}.pdf`,
      thermalBuffer,
      'application/pdf',
    );

    await this.prisma.girviPayment.update({
      where: { id: paymentId },
      data: { receiptPdfUrl: a4Key },
    });

    this.logger.log(`Receipt generated for payment ${paymentId}`);
    return a4Key;
  }

  async getSignedReceiptUrl(tenantId: string, paymentId: string): Promise<string> {
    const payment = await this.prisma.girviPayment.findFirstOrThrow({
      where: { id: paymentId, tenantId },
      select: { receiptPdfUrl: true, receiptNumber: true },
    });

    if (!payment.receiptPdfUrl) {
      throw new Error('Receipt PDF not yet generated for this payment');
    }

    return this.storageService.getSignedUrl(payment.receiptPdfUrl, 3600);
  }
}
