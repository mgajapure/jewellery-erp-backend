import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import PDFDocument from 'pdfkit';

// Maharashtra Pawnbrokers Act — Form 9: Debtor Ledger
@Injectable()
export class Form9Service {
  constructor(private readonly prisma: PrismaService) {}

  async generate(tenantId: string, customerId: string): Promise<Buffer> {
    const customer = await this.prisma.customer.findFirstOrThrow({
      where: { id: customerId, tenantId },
    });

    const tenant = await this.prisma.tenant.findFirstOrThrow({ where: { id: tenantId } });

    const girvis = await this.prisma.girvi.findMany({
      where: { tenantId, customerId, deletedAt: null },
      include: {
        payments: { orderBy: { paymentDate: 'asc' } },
        items: { select: { itemName: true, purity: true, netWeight: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - 80;

      // Header
      doc.fontSize(11).font('Helvetica-Bold').text('FORM No. 9', { align: 'center' });
      doc.fontSize(10).font('Helvetica').text('[See Rule 14(1)]', { align: 'center' });
      doc.fontSize(11).font('Helvetica-Bold').text('Debtor Ledger', { align: 'center' });
      doc.moveDown(0.5);

      doc.fontSize(9).font('Helvetica');
      doc.text(`Name of Pawnbroker: ${tenant.name}`);
      doc.text(`Address: ${tenant.address ?? ''}`);
      doc.moveDown(0.5);

      doc.fontSize(10).font('Helvetica-Bold').text('Debtor Details');
      doc.fontSize(9).font('Helvetica');
      doc.text(`Name: ${customer.name}   Mobile: ${customer.mobile}`);
      if (customer.address) doc.text(`Address: ${customer.address}`);
      if (customer.aadhaarNumber) doc.text(`Aadhaar: XXXX-XXXX-${customer.aadhaarNumber.slice(-4)}`);
      if (customer.panNumber) doc.text(`PAN: ${customer.panNumber}`);
      doc.moveDown(1);

      let grandTotalPrincipal = 0;
      let grandTotalPaid = 0;

      for (const girvi of girvis) {
        grandTotalPrincipal += Number(girvi.principalAmount);

        doc.fontSize(10).font('Helvetica-Bold').text(`Girvi No: ${girvi.girviNumber}`);
        doc.fontSize(9).font('Helvetica');
        doc.text(`Loan Date: ${this.formatDate(girvi.startDate)}   Due: ${this.formatDate(girvi.dueDate)}   Status: ${girvi.status}`);
        doc.text(`Loan Amount: Rs. ${this.formatAmount(Number(girvi.principalAmount))}   Interest Rate: ${girvi.interestRate}% p.m.`);

        const itemSummary = girvi.items.map((i) => `${i.itemName} (${i.purity}, ${Number(i.netWeight).toFixed(3)}g)`).join(', ');
        doc.text(`Items: ${itemSummary}`);
        doc.moveDown(0.3);

        if (girvi.payments.length > 0) {
          // Payment ledger
          this.ledgerHeader(doc, pageWidth);
          let runningBalance = Number(girvi.principalAmount);

          for (const p of girvi.payments) {
            grandTotalPaid += Number(p.totalPaid);
            runningBalance -= Number(p.principalPaid);
            this.ledgerRow(doc, p, runningBalance, pageWidth);
          }
          doc.moveDown(0.3);
        } else {
          doc.text('No payments recorded.', { indent: 10 });
          doc.moveDown(0.3);
        }

        doc.moveTo(40, doc.y).lineTo(40 + pageWidth, doc.y).dash(2, { space: 2 }).stroke().undash();
        doc.moveDown(0.5);
      }

      // Summary
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text(`Total Principal Loaned: Rs. ${this.formatAmount(grandTotalPrincipal)}`);
      doc.text(`Total Amount Received: Rs. ${this.formatAmount(grandTotalPaid)}`);
      doc.text(`Outstanding Balance: Rs. ${this.formatAmount(grandTotalPrincipal - grandTotalPaid)}`);
      doc.moveDown(2);

      doc.fontSize(9).font('Helvetica').text('___________________________', 40);
      doc.text('Signature of Pawnbroker');

      doc.end();
    });
  }

  private ledgerHeader(doc: PDFKit.PDFDocument, width: number): void {
    const y = doc.y;
    const cw = [60, 80, 90, 90, 90, 100];
    doc.rect(40, y, width, 16).fill('#e8e8e8').fillColor('black');
    doc.fontSize(7).font('Helvetica-Bold');
    const headers = ['Date', 'Receipt No.', 'Principal Paid', 'Interest Paid', 'Penalty', 'Balance'];
    let x = 40;
    headers.forEach((h, i) => { doc.text(h, x + 2, y + 4, { width: cw[i] - 4 }); x += cw[i]; });
    doc.y = y + 18;
  }

  private ledgerRow(doc: PDFKit.PDFDocument, p: { paymentDate: Date; receiptNumber: string | null; principalPaid: object; interestPaid: object; penaltyPaid: object }, balance: number, width: number): void {
    const y = doc.y;
    const cw = [60, 80, 90, 90, 90, 100];
    doc.fontSize(7).font('Helvetica');
    const cols = [
      this.formatDate(p.paymentDate),
      p.receiptNumber ?? '',
      this.formatAmount(Number(p.principalPaid)),
      this.formatAmount(Number(p.interestPaid)),
      this.formatAmount(Number(p.penaltyPaid)),
      this.formatAmount(Math.max(0, balance)),
    ];
    let x = 40;
    cols.forEach((c, i) => { doc.text(c, x + 2, y, { width: cw[i] - 4 }); x += cw[i]; });
    doc.y = y + 12;
  }

  private formatDate(d: Date): string {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private formatAmount(n: number): string {
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  }
}
