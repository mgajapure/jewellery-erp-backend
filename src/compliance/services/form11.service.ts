import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import PDFDocument from 'pdfkit';

// Maharashtra Pawnbrokers Act — Form 11: Repayment Receipt (given to borrower on full/partial repayment)
@Injectable()
export class Form11Service {
  constructor(private readonly prisma: PrismaService) {}

  async generate(tenantId: string, paymentId: string): Promise<Buffer> {
    const payment = await this.prisma.girviPayment.findFirstOrThrow({
      where: { id: paymentId, tenantId },
      include: {
        girvi: {
          include: {
            customer: true,
            tenant: true,
            items: { select: { itemName: true, purity: true, netWeight: true, grossWeight: true } },
            payments: { where: { tenantId }, orderBy: { paymentDate: 'asc' } },
          },
        },
      },
    });

    const girvi = payment.girvi;
    const tenant = girvi.tenant;
    const customer = girvi.customer;

    const totalPrincipalPaid = girvi.payments.reduce((s, p) => s + Number(p.principalPaid), 0);
    const principalBalance = Math.max(0, Number(girvi.principalAmount) - totalPrincipalPaid);
    const isFullRepayment = principalBalance === 0;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A5', margin: 30 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - 60;

      // Header
      doc.fontSize(11).font('Helvetica-Bold').text('FORM No. 11', { align: 'center' });
      doc.fontSize(9).font('Helvetica').text('[See Rule 15(1)]', { align: 'center' });
      doc.fontSize(11).font('Helvetica-Bold').text('REPAYMENT RECEIPT', { align: 'center' });
      doc.moveTo(30, doc.y).lineTo(30 + pageWidth, doc.y).stroke();
      doc.moveDown(0.5);

      doc.fontSize(9).font('Helvetica');
      doc.text(`Receipt No: ${payment.receiptNumber ?? ''}   Date: ${this.formatDate(payment.paymentDate)}`);
      doc.moveDown(0.5);

      doc.fontSize(9).font('Helvetica-Bold').text('Pawnbroker:');
      doc.font('Helvetica').text(`${tenant.name}, ${tenant.address ?? ''}. Ph: ${tenant.phone}`);
      doc.moveDown(0.5);

      doc.font('Helvetica-Bold').text('Borrower:');
      doc.font('Helvetica').text(`${customer.name}   Mobile: ${customer.mobile}`);
      if (customer.address) doc.text(customer.address);
      doc.moveDown(0.5);

      doc.font('Helvetica-Bold').text('Girvi Details:');
      doc.font('Helvetica').text(`Girvi No: ${girvi.girviNumber}   Date of Pledge: ${this.formatDate(girvi.startDate)}`);

      const items = girvi.items.map((i) => `${i.itemName} (${i.purity}, ${Number(i.netWeight).toFixed(3)}g net)`).join('; ');
      doc.text(`Items Pledged: ${items}`);
      doc.moveDown(0.5);

      // Payment details box
      doc.rect(30, doc.y, pageWidth, 80).stroke();
      const boxY = doc.y + 5;
      doc.fontSize(9).font('Helvetica-Bold').text('Payment Details', 35, boxY);
      doc.fontSize(9).font('Helvetica');
      doc.text(`Principal Paid: Rs. ${this.formatAmount(Number(payment.principalPaid))}`, 35, boxY + 14);
      doc.text(`Interest Paid: Rs. ${this.formatAmount(Number(payment.interestPaid))}`, 35, boxY + 28);
      doc.text(`Penalty Paid: Rs. ${this.formatAmount(Number(payment.penaltyPaid))}`, 35, boxY + 42);
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text(`TOTAL PAID: Rs. ${this.formatAmount(Number(payment.totalPaid))}`, 35, boxY + 58);
      doc.text(`Mode: ${payment.paymentMode}`, 200, boxY + 58);
      doc.y = boxY + 90;

      doc.fontSize(9).font('Helvetica');
      doc.text(`Principal Balance after this payment: Rs. ${this.formatAmount(principalBalance)}`);

      if (isFullRepayment) {
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#006600');
        doc.text('LOAN FULLY REPAID — Gold items may be released to borrower upon verification.', { align: 'center' });
        doc.fillColor('black');
      }

      doc.moveDown(1);
      doc.moveTo(30, doc.y).lineTo(30 + pageWidth, doc.y).stroke();
      doc.moveDown(0.5);

      const sigY = doc.y;
      doc.fontSize(9).font('Helvetica');
      doc.text('___________________', 30, sigY);
      doc.text('___________________', 230, sigY);
      doc.moveDown(0.3);
      doc.text('Borrower Signature', 30);
      doc.text('Pawnbroker Signature', 230);
      doc.moveDown(0.3);
      doc.fontSize(7).text('This is a statutory receipt under the Maharashtra Pawnbrokers Act.', { align: 'center' });

      doc.end();
    });
  }

  private formatDate(d: Date): string {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private formatAmount(n: number): string {
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  }
}
