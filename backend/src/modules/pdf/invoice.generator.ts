import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { OrderData, CompanyInfo, PdfOptions } from './pdf.types';

// Color palette
const COLORS = {
  primary: '#1a365d',
  secondary: '#2d3748',
  accent: '#3182ce',
  success: '#38a169',
  warning: '#d69e2e',
  danger: '#e53e3e',
  light: '#f7fafc',
  border: '#e2e8f0',
  text: '#1a202c',
  textMuted: '#718096',
};

export class InvoiceGenerator {
  private doc: PDFKit.PDFDocument;
  private order: OrderData;
  private company: CompanyInfo;
  private options: PdfOptions;
  private pageWidth: number;
  private margin: number;
  private contentWidth: number;

  constructor(order: OrderData, company: CompanyInfo, options: PdfOptions = {}) {
    this.order = order;
    this.company = company;
    this.options = {
      includeQrCode: true,
      footerNotes: [
        'Thank you for your business!',
        'For questions, contact us at the phone number above.',
      ],
      ...options,
    };
    this.margin = 50;
    this.pageWidth = 595.28; // A4 width in points
    this.contentWidth = this.pageWidth - this.margin * 2;

    this.doc = new PDFDocument({
      size: 'A4',
      margin: this.margin,
      bufferPages: true,
    });
  }

  async generate(): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const chunks: Buffer[] = [];

        this.doc.on('data', (chunk) => chunks.push(chunk));
        this.doc.on('end', () => resolve(Buffer.concat(chunks)));
        this.doc.on('error', reject);

        // Generate PDF content
        await this.drawHeader();
        this.drawInvoiceInfo();
        this.drawCustomerInfo();
        this.drawItemsTable();
        this.drawTotals();
        this.drawPaymentInfo();
        await this.drawQrCode();
        this.drawFooter();

        this.doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private async drawHeader(): Promise<void> {
    const headerHeight = 80;

    // Header background
    this.doc
      .rect(0, 0, this.pageWidth, headerHeight)
      .fill(COLORS.primary);

    // Company name (left side)
    this.doc
      .font('Helvetica-Bold')
      .fontSize(24)
      .fillColor('white')
      .text(this.company.name, this.margin, 25, { width: 300 });

    // Invoice title (right side)
    this.doc
      .font('Helvetica-Bold')
      .fontSize(28)
      .fillColor('white')
      .text('INVOICE', this.pageWidth - this.margin - 150, 25, {
        width: 150,
        align: 'right',
      });

    // Reset position
    this.doc.y = headerHeight + 20;
    this.doc.fillColor(COLORS.text);
  }

  private drawInvoiceInfo(): void {
    const startY = this.doc.y;
    const leftCol = this.margin;
    const rightCol = this.pageWidth - this.margin - 200;

    // Left column - Company details
    this.doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COLORS.textMuted)
      .text(this.company.address, leftCol, startY)
      .text(this.company.phone)
      .text(this.company.email || '')
      .text(this.company.website || '');

    // Right column - Invoice details
    this.doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(COLORS.text)
      .text('Invoice Number:', rightCol, startY)
      .font('Helvetica')
      .text(this.order.orderNumber, rightCol + 100, startY);

    this.doc
      .font('Helvetica-Bold')
      .text('Date:', rightCol, startY + 15)
      .font('Helvetica')
      .text(this.formatDate(this.order.createdAt), rightCol + 100, startY + 15);

    this.doc
      .font('Helvetica-Bold')
      .text('Status:', rightCol, startY + 30)
      .font('Helvetica')
      .fillColor(this.getStatusColor(this.order.paymentStatus))
      .text(this.order.paymentStatus, rightCol + 100, startY + 30);

    this.doc.y = startY + 70;
    this.doc.fillColor(COLORS.text);
  }

  private drawCustomerInfo(): void {
    const startY = this.doc.y;

    // Section header
    this.doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(COLORS.primary)
      .text('BILL TO', this.margin, startY);

    // Divider line
    this.doc
      .moveTo(this.margin, startY + 15)
      .lineTo(this.margin + 200, startY + 15)
      .strokeColor(COLORS.accent)
      .lineWidth(2)
      .stroke();

    // Customer details
    this.doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(COLORS.text)
      .text(this.order.customerName, this.margin, startY + 25);

    this.doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COLORS.textMuted)
      .text(this.order.customerPhone, this.margin, startY + 40)
      .text(this.order.customerEmail || '', this.margin, startY + 52)
      .text(this.order.deliveryAddress, this.margin, startY + 64, {
        width: 250,
      });

    this.doc.y = startY + 100;
  }

  private drawItemsTable(): void {
    const startY = this.doc.y;
    const items = this.order.itemsSnapshot;

    // Table header
    const columns = {
      item: { x: this.margin, width: 250 },
      qty: { x: this.margin + 260, width: 50 },
      price: { x: this.margin + 320, width: 90 },
      total: { x: this.margin + 420, width: 75 },
    };

    // Header background
    this.doc
      .rect(this.margin, startY, this.contentWidth, 25)
      .fill(COLORS.light);

    // Header text
    this.doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(COLORS.secondary);

    this.doc.text('ITEM', columns.item.x + 10, startY + 8);
    this.doc.text('QTY', columns.qty.x, startY + 8, { width: columns.qty.width, align: 'center' });
    this.doc.text('PRICE', columns.price.x, startY + 8, { width: columns.price.width, align: 'right' });
    this.doc.text('TOTAL', columns.total.x, startY + 8, { width: columns.total.width, align: 'right' });

    // Table rows
    let currentY = startY + 30;
    this.doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);

    items.forEach((item, index) => {
      const itemTotal = Number(item.price) * item.quantity;

      // Alternating row background
      if (index % 2 === 0) {
        this.doc
          .rect(this.margin, currentY - 5, this.contentWidth, 22)
          .fill('#fafafa');
      }

      this.doc.fillColor(COLORS.text);
      this.doc.text(
        this.truncateText(item.name, 40),
        columns.item.x + 10,
        currentY
      );
      this.doc.text(
        item.quantity.toString(),
        columns.qty.x,
        currentY,
        { width: columns.qty.width, align: 'center' }
      );
      this.doc.text(
        this.formatCurrency(Number(item.price)),
        columns.price.x,
        currentY,
        { width: columns.price.width, align: 'right' }
      );
      this.doc.text(
        this.formatCurrency(itemTotal),
        columns.total.x,
        currentY,
        { width: columns.total.width, align: 'right' }
      );

      currentY += 22;
    });

    // Bottom border
    this.doc
      .moveTo(this.margin, currentY)
      .lineTo(this.margin + this.contentWidth, currentY)
      .strokeColor(COLORS.border)
      .lineWidth(1)
      .stroke();

    this.doc.y = currentY + 15;
  }

  private drawTotals(): void {
    const startY = this.doc.y;
    const rightCol = this.pageWidth - this.margin - 200;
    const valueCol = this.pageWidth - this.margin - 80;

    // Subtotal
    this.doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(COLORS.textMuted)
      .text('Subtotal:', rightCol, startY)
      .fillColor(COLORS.text)
      .text(this.formatCurrency(Number(this.order.subtotal)), valueCol, startY, {
        width: 80,
        align: 'right',
      });

    // Delivery Fee
    this.doc
      .fillColor(COLORS.textMuted)
      .text('Delivery Fee:', rightCol, startY + 18)
      .fillColor(COLORS.text)
      .text(this.formatCurrency(Number(this.order.deliveryFee)), valueCol, startY + 18, {
        width: 80,
        align: 'right',
      });

    // Divider
    this.doc
      .moveTo(rightCol, startY + 38)
      .lineTo(this.pageWidth - this.margin, startY + 38)
      .strokeColor(COLORS.border)
      .stroke();

    // Total
    this.doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .fillColor(COLORS.primary)
      .text('TOTAL:', rightCol, startY + 48)
      .text(this.formatCurrency(Number(this.order.total)), valueCol, startY + 48, {
        width: 80,
        align: 'right',
      });

    // Currency note
    this.doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(COLORS.textMuted)
      .text(`Currency: ${this.order.currency}`, rightCol, startY + 68);

    this.doc.y = startY + 90;
  }

  private drawPaymentInfo(): void {
    const startY = this.doc.y;

    // Payment method box
    this.doc
      .rect(this.margin, startY, 200, 60)
      .strokeColor(COLORS.border)
      .stroke();

    this.doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(COLORS.primary)
      .text('PAYMENT METHOD', this.margin + 10, startY + 10);

    this.doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(COLORS.text)
      .text(
        this.order.paymentMethod === 'MOMO' ? 'Mobile Money' : 'Cash on Delivery',
        this.margin + 10,
        startY + 28
      );

    if (this.order.payment?.transactionId) {
      this.doc
        .fontSize(8)
        .fillColor(COLORS.textMuted)
        .text(`Ref: ${this.order.payment.transactionId}`, this.margin + 10, startY + 43);
    }

    this.doc.y = startY + 80;
  }

  private async drawQrCode(): Promise<void> {
    if (!this.options.includeQrCode) return;

    const qrUrl = this.options.qrCodeUrl ||
      `${process.env.FRONTEND_URL}/track/${this.order.orderNumber}`;

    try {
      const qrDataUrl = await QRCode.toDataURL(qrUrl, {
        width: 80,
        margin: 1,
        color: {
          dark: COLORS.primary,
          light: '#ffffff',
        },
      });

      const qrX = this.pageWidth - this.margin - 90;
      const qrY = this.doc.y - 70;

      // QR code background
      this.doc
        .rect(qrX - 5, qrY - 5, 90, 110)
        .fill('#ffffff')
        .strokeColor(COLORS.border)
        .stroke();

      // QR code image
      this.doc.image(qrDataUrl, qrX, qrY, { width: 80 });

      // Label
      this.doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor(COLORS.textMuted)
        .text('Scan to track order', qrX - 5, qrY + 85, {
          width: 90,
          align: 'center',
        });
    } catch (error) {
      // QR code generation failed, continue without it
    }
  }

  private drawFooter(): void {
    const footerY = this.doc.page.height - 80;

    // Footer line
    this.doc
      .moveTo(this.margin, footerY)
      .lineTo(this.pageWidth - this.margin, footerY)
      .strokeColor(COLORS.border)
      .stroke();

    // Footer notes
    this.doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(COLORS.textMuted);

    let noteY = footerY + 10;
    this.options.footerNotes?.forEach((note) => {
      this.doc.text(note, this.margin, noteY, {
        width: this.contentWidth,
        align: 'center',
      });
      noteY += 12;
    });

    // Page number
    this.doc
      .fontSize(8)
      .text(
        `Page 1 of 1 | Generated on ${new Date().toLocaleDateString()}`,
        this.margin,
        footerY + 50,
        { width: this.contentWidth, align: 'center' }
      );
  }

  // Helper methods
  private formatCurrency(amount: number): string {
    return `${amount.toLocaleString()} ${this.order.currency}`;
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  private truncateText(text: string, maxLength: number): string {
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
  }

  private getStatusColor(status: string): string {
    switch (status) {
      case 'PAID':
        return COLORS.success;
      case 'PENDING':
        return COLORS.warning;
      case 'FAILED':
      case 'REFUNDED':
        return COLORS.danger;
      default:
        return COLORS.text;
    }
  }
}

export async function generateInvoicePdf(
  order: OrderData,
  company: CompanyInfo,
  options?: PdfOptions
): Promise<Buffer> {
  const generator = new InvoiceGenerator(order, company, options);
  return generator.generate();
}
