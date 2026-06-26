import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import PDFDocument from 'pdfkit';

// Maharashtra Pawnbrokers Act — Form 13: Capital Account (Annual Statement)
@Injectable()
export class Form13Service {
  constructor(private readonly prisma: PrismaService) {}

  async generate(tenantId: string, year: number): Promise<Buffer> {
    const tenant = await this.prisma.tenant.findFirstOrThrow({ where: { id: tenantId } });

    const from = new Date(year, 3, 1); // April 1
    const to = new Date(year + 1, 2, 31, 23, 59, 59); // March 31

    const [allGirvis, allPayments] = await Promise.all([
      this.prisma.girvi.findMany({
        where: { tenantId, startDate: { gte: from, lte: to }, deletedAt: null },
        orderBy: { startDate: 'asc' },
      }),
      this.prisma.girviPayment.findMany({
        where: { tenantId, paymentDate: { gte: from, lte: to } },
      }),
    ]);

    const totalLoansGranted = allGirvis.reduce((s, g) => s + Number(g.principalAmount), 0);
    const totalInterestReceived = allPayments.reduce((s, p) => s + Number(p.interestPaid), 0);
    const totalPrincipalReceived = allPayments.reduce((s, p) => s + Number(p.principalPaid), 0);
    const totalPenaltyReceived = allPayments.reduce((s, p) => s + Number(p.penaltyPaid), 0);
    const activeGirvis = allGirvis.filter((g) => ['ACTIVE', 'PARTIAL_PAID', 'OVERDUE'].includes(g.status));
    const outstandingPrincipal = activeGirvis.reduce((s, g) => s + Number(g.principalAmount), 0);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - 80;

      // Header
      doc.fontSize(11).font('Helvetica-Bold').text('FORM No. 13', { align: 'center' });
      doc.fontSize(9).font('Helvetica').text('[See Rule 18(1)]', { align: 'center' });
      doc.fontSize(11).font('Helvetica-Bold').text('CAPITAL ACCOUNT', { align: 'center' });
      doc.fontSize(9).font('Helvetica').text('Annual Statement — Maharashtra Pawnbrokers Act, 2014', { align: 'center' });
      doc.moveDown(0.5);

      doc.text(`Name of Pawnbroker: ${tenant.name}`);
      doc.text(`Address: ${tenant.address ?? ''}`);
      doc.text(`Financial Year: ${year}-${String(year + 1).slice(-2)} (01 Apr ${year} to 31 Mar ${year + 1})`);
      doc.moveDown(1);

      doc.moveTo(40, doc.y).lineTo(40 + pageWidth, doc.y).stroke();
      doc.moveDown(0.5);

      // Receipts side
      doc.fontSize(10).font('Helvetica-Bold').text('DR. (RECEIPTS / INCOME)');
      doc.moveDown(0.3);
      this.ledgerEntry(doc, 'Total Loans Granted During Year', totalLoansGranted, pageWidth);
      this.ledgerEntry(doc, 'Interest Income Received', totalInterestReceived, pageWidth);
      this.ledgerEntry(doc, 'Penalty Charges Received', totalPenaltyReceived, pageWidth);
      doc.moveTo(40, doc.y).lineTo(40 + pageWidth, doc.y).stroke();
      doc.moveDown(0.3);
      this.ledgerEntry(doc, 'TOTAL RECEIPTS', totalLoansGranted + totalInterestReceived + totalPenaltyReceived, pageWidth, true);
      doc.moveDown(1);

      // Payments side
      doc.fontSize(10).font('Helvetica-Bold').text('CR. (PAYMENTS / EXPENDITURE)');
      doc.moveDown(0.3);
      this.ledgerEntry(doc, 'Principal Repayments Received', totalPrincipalReceived, pageWidth);
      this.ledgerEntry(doc, 'Outstanding Principal (Active Loans)', outstandingPrincipal, pageWidth);
      doc.moveTo(40, doc.y).lineTo(40 + pageWidth, doc.y).stroke();
      doc.moveDown(0.3);
      this.ledgerEntry(doc, 'TOTAL', totalPrincipalReceived + outstandingPrincipal, pageWidth, true);
      doc.moveDown(1);

      // Summary statistics
      doc.moveTo(40, doc.y).lineTo(40 + pageWidth, doc.y).dash(2, { space: 2 }).stroke().undash();
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica-Bold').text('ANNUAL SUMMARY');
      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica');
      doc.text(`Total Girvis Created: ${allGirvis.length}`);
      doc.text(`Active Girvis at Year End: ${activeGirvis.length}`);
      doc.text(`Redeemed / Closed: ${allGirvis.filter((g) => ['REDEEMED', 'CLOSED'].includes(g.status)).length}`);
      doc.text(`Auctioned: ${allGirvis.filter((g) => g.status === 'AUCTIONED').length}`);
      doc.text(`Net Interest Profit: Rs. ${this.formatAmount(totalInterestReceived)}`);
      doc.moveDown(2);

      // Declaration
      doc.font('Helvetica-Bold').text('DECLARATION');
      doc.font('Helvetica').fontSize(8);
      doc.text(
        'I hereby declare that the foregoing is a true and correct account of all the transactions ' +
        'conducted by me as a licensed pawnbroker under the Maharashtra Pawnbrokers Act, 2014, ' +
        `during the financial year ${year}-${String(year + 1).slice(-2)}.`,
      );
      doc.moveDown(2);

      const sigY = doc.y;
      doc.fontSize(9).text('Place: ___________________', 40, sigY);
      doc.text('___________________________', 300, sigY);
      doc.moveDown(0.3);
      doc.text(`Date: ${this.formatDate(new Date())}`, 40);
      doc.text('Signature of Pawnbroker / Proprietor', 300);

      doc.end();
    });
  }

  private ledgerEntry(doc: PDFKit.PDFDocument, label: string, amount: number, width: number, bold = false): void {
    const y = doc.y;
    const font = bold ? 'Helvetica-Bold' : 'Helvetica';
    doc.fontSize(9).font(font);
    doc.text(label, 40, y, { width: width - 120 });
    doc.text(`Rs. ${this.formatAmount(amount)}`, 40 + width - 120, y, { width: 120, align: 'right' });
    doc.moveDown(0.3);
  }

  private formatDate(d: Date): string {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private formatAmount(n: number): string {
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  }
}
