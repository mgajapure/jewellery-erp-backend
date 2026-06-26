import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

export interface KfsData {
  girviNumber: string;
  date: Date;
  // Lender (shop)
  shopName: string;
  shopAddress: string;
  shopPhone: string;
  shopGstin?: string;
  licenseNumber?: string;
  // Borrower (customer)
  customerName: string;
  customerMobile: string;
  customerAddress?: string;
  aadhaarNumber?: string;
  panNumber?: string;
  // Loan details
  principalAmount: number;
  interestRate: number;
  interestType: string;
  tenureMonths: number;
  startDate: Date;
  dueDate: Date;
  ltv: number;
  goldRateAtCreation: number;
  // Gold items
  items: Array<{
    itemName: string;
    purity: string;
    grossWeight: number;
    netWeight: number;
    fineWeight: number;
    valuation: number;
  }>;
  totalGrossWeight: number;
  totalNetWeight: number;
  totalFineWeight: number;
  totalValuation: number;
}

@Injectable()
export class KfsPdfService {
  async generate(data: KfsData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.renderEnglishSection(doc, data);
      doc.addPage();
      this.renderMarathiSection(doc, data);

      doc.end();
    });
  }

  private renderEnglishSection(doc: PDFKit.PDFDocument, data: KfsData): void {
    const pageWidth = doc.page.width - 80;

    // Header
    doc.fontSize(16).font('Helvetica-Bold').text('KEY FACT STATEMENT', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('Gold Loan — Key Facts', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(9).text(
      'This document contains key facts about your gold loan as required by RBI guidelines.',
      { align: 'center' },
    );
    doc.moveDown(1);

    // Divider
    doc.moveTo(40, doc.y).lineTo(40 + pageWidth, doc.y).stroke();
    doc.moveDown(0.5);

    // Section A — Lender Details
    this.sectionHeader(doc, 'A. LENDER DETAILS');
    this.row(doc, 'Lender Name', data.shopName);
    this.row(doc, 'Address', data.shopAddress);
    this.row(doc, 'Phone', data.shopPhone);
    if (data.shopGstin) this.row(doc, 'GSTIN', data.shopGstin);
    if (data.licenseNumber) this.row(doc, 'License No.', data.licenseNumber);
    doc.moveDown(0.5);

    // Section B — Borrower Details
    this.sectionHeader(doc, 'B. BORROWER DETAILS');
    this.row(doc, 'Borrower Name', data.customerName);
    this.row(doc, 'Mobile', data.customerMobile);
    if (data.customerAddress) this.row(doc, 'Address', data.customerAddress);
    if (data.aadhaarNumber) this.row(doc, 'Aadhaar No.', `XXXX-XXXX-${data.aadhaarNumber.slice(-4)}`);
    if (data.panNumber) this.row(doc, 'PAN No.', data.panNumber);
    doc.moveDown(0.5);

    // Section C — Loan Details
    this.sectionHeader(doc, 'C. LOAN DETAILS');
    this.row(doc, 'Girvi Number', data.girviNumber);
    this.row(doc, 'Date of Sanction', this.formatDate(data.startDate));
    this.row(doc, 'Due Date', this.formatDate(data.dueDate));
    this.row(doc, 'Loan Amount (Principal)', `₹ ${this.formatAmount(data.principalAmount)}`);
    this.row(doc, 'Interest Rate', `${data.interestRate}% per month`);
    this.row(doc, 'Interest Type', this.formatInterestType(data.interestType));
    this.row(doc, 'Loan Tenure', `${data.tenureMonths} month(s)`);
    this.row(doc, 'LTV Ratio', `${data.ltv}%`);
    this.row(doc, 'Gold Rate (at sanction)', `₹ ${this.formatAmount(data.goldRateAtCreation)}/gram (22K)`);
    doc.moveDown(0.5);

    // Section D — Pledged Gold Items
    this.sectionHeader(doc, 'D. PLEDGED GOLD ITEMS');
    this.tableHeader(doc, pageWidth);
    data.items.forEach((item, idx) => {
      this.tableRow(doc, idx + 1, item, pageWidth);
    });
    doc.moveDown(0.3);
    this.tableTotals(doc, data, pageWidth);
    doc.moveDown(0.5);

    // Section E — Charges & Fees
    this.sectionHeader(doc, 'E. APPLICABLE CHARGES');
    this.row(doc, 'Processing Fee', 'As applicable (disclosed at counter)');
    this.row(doc, 'Prepayment Penalty', 'Nil');
    this.row(doc, 'Late Payment Penalty', 'As per interest config');
    this.row(doc, 'Auction Notice Period', '14 days (as per RBI guidelines)');
    doc.moveDown(0.5);

    // Section F — Important Disclosures
    this.sectionHeader(doc, 'F. IMPORTANT DISCLOSURES (RBI 2026)');
    const disclosures = [
      `Maximum loan amount is ${data.ltv}% of gold value as per RBI tiered LTV norms.`,
      'Gold will be stored safely in our vault. You may inspect it during business hours.',
      'You have the right to redeem your gold at any time by repaying principal + interest.',
      'In case of default, gold may be auctioned after 14 days written notice.',
      'Cash disbursement above ₹20,000 requires bank transfer as per IT Act.',
      'Total gold pledged per borrower cannot exceed 1 kg (RBI circular 2026).',
      'This loan is regulated by RBI guidelines for Gold Loan NBFCs / Pawnbrokers Act.',
    ];
    disclosures.forEach((d, i) => {
      doc.fontSize(9).font('Helvetica').text(`${i + 1}. ${d}`, { indent: 10 });
    });
    doc.moveDown(1);

    // Signature block
    doc.moveTo(40, doc.y).lineTo(40 + pageWidth, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(9).text(
      'I / We hereby acknowledge receipt of this Key Fact Statement and confirm that the terms have been explained to me / us in a language I / we understand.',
    );
    doc.moveDown(2);
    const y = doc.y;
    doc.text('___________________________', 40, y);
    doc.text('___________________________', 350, y);
    doc.moveDown(0.3);
    doc.text('Borrower Signature / Thumb Impression', 40);
    doc.text('Authorised Signatory (Lender)', 350);
    doc.moveDown(0.3);
    doc.text(`Date: ${this.formatDate(data.date)}`, 40);
    doc.text(`Girvi No: ${data.girviNumber}`, 350);
  }

  private renderMarathiSection(doc: PDFKit.PDFDocument, data: KfsData): void {
    const pageWidth = doc.page.width - 80;

    // Marathi header (using ASCII transliteration as pdfkit needs Unicode font for Devanagari)
    doc.fontSize(16).font('Helvetica-Bold').text('MUKHYA MAHITI PATR (KEY FACT STATEMENT)', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('Sona Taran - Mukhya Mahiti', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(9).text(
      'Ha dastavej apanachya sona taranasambandhi mukhya mahiti RBI niyamanusaar deto.',
      { align: 'center' },
    );
    doc.moveDown(1);
    doc.moveTo(40, doc.y).lineTo(40 + pageWidth, doc.y).stroke();
    doc.moveDown(0.5);

    // Section A — Saravakar Mahiti
    this.sectionHeader(doc, 'A. SARAVAKAR MAHITI (LENDER DETAILS)');
    this.row(doc, 'Saravakaracha Nav (Lender Name)', data.shopName);
    this.row(doc, 'Patta (Address)', data.shopAddress);
    this.row(doc, 'Phone', data.shopPhone);
    if (data.licenseNumber) this.row(doc, 'Parwana Kramank (License No.)', data.licenseNumber);
    doc.moveDown(0.5);

    // Section B — Taran Karta Mahiti
    this.sectionHeader(doc, 'B. TARAN KARTA MAHITI (BORROWER DETAILS)');
    this.row(doc, 'Taran Kartyacha Nav (Name)', data.customerName);
    this.row(doc, 'Mobile', data.customerMobile);
    if (data.customerAddress) this.row(doc, 'Patta (Address)', data.customerAddress);
    if (data.aadhaarNumber) this.row(doc, 'Aadhaar Kramank', `XXXX-XXXX-${data.aadhaarNumber.slice(-4)}`);
    if (data.panNumber) this.row(doc, 'PAN Kramank', data.panNumber);
    doc.moveDown(0.5);

    // Section C — Karja Tatve
    this.sectionHeader(doc, 'C. KARJA TATVE (LOAN DETAILS)');
    this.row(doc, 'Girvi Kramank', data.girviNumber);
    this.row(doc, 'Manjuri Tarikh (Sanction Date)', this.formatDate(data.startDate));
    this.row(doc, 'Dekhai Tarikh (Due Date)', this.formatDate(data.dueDate));
    this.row(doc, 'Karja Rakam (Loan Amount)', `Rs. ${this.formatAmount(data.principalAmount)}`);
    this.row(doc, 'Vyaj Dar (Interest Rate)', `${data.interestRate}% prati mahina`);
    this.row(doc, 'Vyaj Prakar (Interest Type)', this.formatInterestType(data.interestType));
    this.row(doc, 'Muddat (Tenure)', `${data.tenureMonths} mahina`);
    this.row(doc, 'LTV Pramat (LTV Ratio)', `${data.ltv}%`);
    this.row(doc, 'Sonyacha Dar (Gold Rate)', `Rs. ${this.formatAmount(data.goldRateAtCreation)}/gram (22K)`);
    doc.moveDown(0.5);

    // Section D — Taran Keleli Sona
    this.sectionHeader(doc, 'D. TARAN KELELI SONA (PLEDGED GOLD ITEMS)');
    this.tableHeader(doc, pageWidth);
    data.items.forEach((item, idx) => {
      this.tableRow(doc, idx + 1, item, pageWidth);
    });
    doc.moveDown(0.3);
    this.tableTotals(doc, data, pageWidth);
    doc.moveDown(0.5);

    // Section E — Shulka
    this.sectionHeader(doc, 'E. SHULKA ANI KHARCH (CHARGES & FEES)');
    this.row(doc, 'Prakriya Shulka (Processing Fee)', 'Lagoo Teshe (Kauntaravar Sanga)');
    this.row(doc, 'Agatvela Paripakvata Dand (Prepayment Penalty)', 'Nahi');
    this.row(doc, 'Udhar Dand (Late Payment Penalty)', 'Vyaj Niyamanusaar');
    this.row(doc, 'Nilami Suchana Kalawardhan', '14 Divas (RBI Niyamanusaar)');
    doc.moveDown(0.5);

    // Section F — Mahatvachya Goshti
    this.sectionHeader(doc, 'F. MAHATVACHYA MAHITI (IMPORTANT DISCLOSURES)');
    const marathiDisclosures = [
      `Karjachi kamal rakam RBI tiered LTV niyamanusaar sonyachya mulyanusaar ${data.ltv}% ahe.`,
      'Sone surakshit tijoreet thevaley. Vyavharaachya velat apan te tapsasat pahau shakata.',
      'Mulbhanda + vyaj bharun apan kenvaahi sone partat ghetanu shakata.',
      'Default zhhalyavar 14 divas lekhi suchana deun nilami hoil.',
      'Rs. 20,000 peksha jast rokhane karaj deta yena - bank transfer avashyak (IT Ayam).',
      'Eka taran karyakade 1 kg peksha jast sone taran thevata yena (RBI 2026 parishapat).',
      'He karaj RBI niyam aani Sarraf Act nusaar niyantrit ahe.',
    ];
    marathiDisclosures.forEach((d, i) => {
      doc.fontSize(9).font('Helvetica').text(`${i + 1}. ${d}`, { indent: 10 });
    });
    doc.moveDown(1);

    // Signature block
    doc.moveTo(40, doc.y).lineTo(40 + pageWidth, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(9).text(
      'Mala / Amhala ha Mukhya Mahiti Patr mila ahe aani mala / amhala ek bhashet sarva niyam samjavun sangitale gele aaheta.',
    );
    doc.moveDown(2);
    const y = doc.y;
    doc.text('___________________________', 40, y);
    doc.text('___________________________', 350, y);
    doc.moveDown(0.3);
    doc.text('Taran Karta Sahi / Angtha (Borrower)', 40);
    doc.text('Adhikrit Sahi (Saravakar)', 350);
    doc.moveDown(0.3);
    doc.text(`Tarikh (Date): ${this.formatDate(data.date)}`, 40);
    doc.text(`Girvi Kramank: ${data.girviNumber}`, 350);
  }

  private sectionHeader(doc: PDFKit.PDFDocument, title: string): void {
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a1a1a').text(title);
    doc.moveDown(0.3);
    doc.font('Helvetica').fillColor('black');
  }

  private row(doc: PDFKit.PDFDocument, label: string, value: string): void {
    const y = doc.y;
    doc.fontSize(9).font('Helvetica-Bold').text(`${label}:`, 40, y, { width: 180, continued: false });
    doc.fontSize(9).font('Helvetica').text(value, 230, y);
    doc.moveDown(0.2);
  }

  private tableHeader(doc: PDFKit.PDFDocument, width: number): void {
    const y = doc.y;
    doc.rect(40, y, width, 18).fill('#f0f0f0').fillColor('black');
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('#', 45, y + 5);
    doc.text('Item', 65, y + 5, { width: 120 });
    doc.text('Purity', 185, y + 5);
    doc.text('Gross Wt', 230, y + 5);
    doc.text('Net Wt', 290, y + 5);
    doc.text('Fine Wt', 345, y + 5);
    doc.text('Value (₹)', 400, y + 5);
    doc.moveDown(0.1);
    doc.y = y + 20;
  }

  private tableRow(
    doc: PDFKit.PDFDocument,
    idx: number,
    item: KfsData['items'][0],
    width: number,
  ): void {
    const y = doc.y;
    if (idx % 2 === 0) doc.rect(40, y, width, 16).fill('#fafafa').fillColor('black');
    doc.fontSize(8).font('Helvetica');
    doc.text(String(idx), 45, y + 4);
    doc.text(item.itemName, 65, y + 4, { width: 115 });
    doc.text(item.purity, 185, y + 4);
    doc.text(`${item.grossWeight.toFixed(3)}g`, 230, y + 4);
    doc.text(`${item.netWeight.toFixed(3)}g`, 290, y + 4);
    doc.text(`${item.fineWeight.toFixed(3)}g`, 345, y + 4);
    doc.text(this.formatAmount(item.valuation), 400, y + 4);
    doc.y = y + 18;
  }

  private tableTotals(doc: PDFKit.PDFDocument, data: KfsData, width: number): void {
    const y = doc.y;
    doc.rect(40, y, width, 16).fill('#e8e8e8').fillColor('black');
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('TOTAL', 65, y + 4);
    doc.text(`${data.totalGrossWeight.toFixed(3)}g`, 230, y + 4);
    doc.text(`${data.totalNetWeight.toFixed(3)}g`, 290, y + 4);
    doc.text(`${data.totalFineWeight.toFixed(3)}g`, 345, y + 4);
    doc.text(this.formatAmount(data.totalValuation), 400, y + 4);
    doc.y = y + 18;
    doc.fillColor('black');
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private formatAmount(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  private formatInterestType(type: string): string {
    const map: Record<string, string> = {
      SIMPLE: 'Simple Interest',
      KATMITI: 'Compound (Katmiti) Interest',
      DAILY: 'Daily Interest',
    };
    return map[type] ?? type;
  }
}
