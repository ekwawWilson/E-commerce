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
  light: '#f7fafc',
  border: '#e2e8f0',
  text: '#1a202c',
  textMuted: '#718096',
};

export class DeliveryNoteGenerator {
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
      includeBarcode: true,
      footerNotes: [
        'Please verify all items upon delivery.',
        'Sign to confirm receipt of goods in good condition.',
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
        this.drawOrderInfo();
        this.drawAddresses();
        this.drawItemsChecklist();
        await this.drawQrCode();
        this.drawSignatureSection();
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
      .fontSize(22)
      .fillColor('white')
      .text(this.company.name, this.margin, 20, { width: 250 });

    this.doc
      .font('Helvetica')
      .fontSize(9)
      .text(this.company.phone, this.margin, 45);

    // Delivery Note title (right side)
    this.doc
      .font('Helvetica-Bold')
      .fontSize(24)
      .fillColor('white')
      .text('DELIVERY NOTE', this.pageWidth - this.margin - 180, 20, {
        width: 180,
        align: 'right',
      });

    // Order number badge
    this.doc
      .rect(this.pageWidth - this.margin - 180, 50, 180, 22)
      .fill('white');

    this.doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(COLORS.primary)
      .text(`Order: ${this.order.orderNumber}`, this.pageWidth - this.margin - 175, 55, {
        width: 170,
        align: 'center',
      });

    // Reset position
    this.doc.y = headerHeight + 20;
    this.doc.fillColor(COLORS.text);
  }

  private drawOrderInfo(): void {
    const startY = this.doc.y;

    // Info boxes row
    const boxWidth = (this.contentWidth - 20) / 3;
    const boxes = [
      { label: 'ORDER DATE', value: this.formatDate(this.order.createdAt) },
      { label: 'DELIVERY STATUS', value: this.order.deliveryStatus, isStatus: true },
      { label: 'PAYMENT', value: this.order.paymentStatus, isStatus: true },
    ];

    boxes.forEach((box, index) => {
      const boxX = this.margin + index * (boxWidth + 10);

      this.doc
        .rect(boxX, startY, boxWidth, 50)
        .strokeColor(COLORS.border)
        .stroke();

      this.doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(COLORS.textMuted)
        .text(box.label, boxX + 10, startY + 10);

      if (box.isStatus) {
        this.doc
          .font('Helvetica-Bold')
          .fontSize(11)
          .fillColor(this.getStatusColor(box.value))
          .text(box.value, boxX + 10, startY + 26);
      } else {
        this.doc
          .font('Helvetica-Bold')
          .fontSize(11)
          .fillColor(COLORS.text)
          .text(box.value, boxX + 10, startY + 26);
      }
    });

    this.doc.y = startY + 70;
  }

  private drawAddresses(): void {
    const startY = this.doc.y;
    const halfWidth = (this.contentWidth - 20) / 2;

    // Delivery Address Box
    this.doc
      .rect(this.margin, startY, halfWidth, 100)
      .fill(COLORS.light);

    this.doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(COLORS.primary)
      .text('DELIVER TO', this.margin + 15, startY + 12);

    this.doc
      .moveTo(this.margin + 15, startY + 26)
      .lineTo(this.margin + 100, startY + 26)
      .strokeColor(COLORS.accent)
      .lineWidth(2)
      .stroke();

    this.doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(COLORS.text)
      .text(this.order.customerName, this.margin + 15, startY + 35);

    this.doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COLORS.textMuted)
      .text(this.order.customerPhone, this.margin + 15, startY + 52)
      .text(this.order.deliveryAddress, this.margin + 15, startY + 66, {
        width: halfWidth - 30,
      });

    // Courier Info Box (if available)
    const rightBoxX = this.margin + halfWidth + 20;
    this.doc
      .rect(rightBoxX, startY, halfWidth, 100)
      .strokeColor(COLORS.border)
      .stroke();

    this.doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(COLORS.primary)
      .text('COURIER DETAILS', rightBoxX + 15, startY + 12);

    if (this.order.delivery?.courier) {
      this.doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(COLORS.text)
        .text(this.order.delivery.courier.name, rightBoxX + 15, startY + 35);

      if (this.order.delivery.courier.phone) {
        this.doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(COLORS.textMuted)
          .text(this.order.delivery.courier.phone, rightBoxX + 15, startY + 52);
      }

      if (this.order.delivery.trackingNumber) {
        this.doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(COLORS.textMuted)
          .text(`Tracking: ${this.order.delivery.trackingNumber}`, rightBoxX + 15, startY + 66);
      }
    } else {
      this.doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(COLORS.textMuted)
        .text('To be assigned', rightBoxX + 15, startY + 35);
    }

    // Delivery notes if any
    if (this.order.deliveryNotes) {
      this.doc.y = startY + 110;
      this.doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(COLORS.warning)
        .text('DELIVERY NOTES:', this.margin, this.doc.y);
      this.doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(COLORS.text)
        .text(this.order.deliveryNotes, this.margin, this.doc.y + 12, {
          width: this.contentWidth,
        });
      this.doc.y += 30;
    } else {
      this.doc.y = startY + 115;
    }
  }

  private drawItemsChecklist(): void {
    const startY = this.doc.y;
    const items = this.order.itemsSnapshot;

    // Section header
    this.doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(COLORS.primary)
      .text('ITEMS CHECKLIST', this.margin, startY);

    this.doc
      .fontSize(8)
      .fillColor(COLORS.textMuted)
      .text(`(${items.length} item${items.length > 1 ? 's' : ''})`, this.margin + 120, startY + 2);

    // Table header
    const tableTop = startY + 20;
    const columns = {
      check: { x: this.margin, width: 30 },
      item: { x: this.margin + 35, width: 320 },
      qty: { x: this.margin + 365, width: 60 },
      verified: { x: this.margin + 435, width: 60 },
    };

    this.doc
      .rect(this.margin, tableTop, this.contentWidth, 22)
      .fill(COLORS.light);

    this.doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(COLORS.secondary)
      .text('✓', columns.check.x + 10, tableTop + 7)
      .text('ITEM DESCRIPTION', columns.item.x, tableTop + 7)
      .text('QTY', columns.qty.x, tableTop + 7, { width: columns.qty.width, align: 'center' })
      .text('VERIFIED', columns.verified.x, tableTop + 7, { width: columns.verified.width, align: 'center' });

    // Table rows with checkboxes
    let currentY = tableTop + 28;
    this.doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);

    items.forEach((item, index) => {
      // Alternating row background
      if (index % 2 === 0) {
        this.doc
          .rect(this.margin, currentY - 3, this.contentWidth, 24)
          .fill('#fafafa');
      }

      // Checkbox
      this.doc
        .rect(columns.check.x + 8, currentY + 2, 12, 12)
        .strokeColor(COLORS.border)
        .lineWidth(1)
        .stroke();

      // Item details
      this.doc
        .fillColor(COLORS.text)
        .text(this.truncateText(item.name, 50), columns.item.x, currentY + 3);

      // Quantity (bold, larger)
      this.doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(
          `x${item.quantity}`,
          columns.qty.x,
          currentY + 2,
          { width: columns.qty.width, align: 'center' }
        );

      // Verified checkbox
      this.doc
        .rect(columns.verified.x + 22, currentY + 2, 12, 12)
        .strokeColor(COLORS.border)
        .stroke();

      this.doc.font('Helvetica').fontSize(9);
      currentY += 24;
    });

    // Bottom border
    this.doc
      .moveTo(this.margin, currentY + 5)
      .lineTo(this.margin + this.contentWidth, currentY + 5)
      .strokeColor(COLORS.border)
      .lineWidth(1)
      .stroke();

    // Total items summary
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    this.doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(COLORS.primary)
      .text(`Total Items: ${totalItems}`, this.margin + this.contentWidth - 100, currentY + 15, {
        width: 100,
        align: 'right',
      });

    this.doc.y = currentY + 40;
  }

  private async drawQrCode(): Promise<void> {
    if (!this.options.includeQrCode) return;

    const qrUrl = this.options.qrCodeUrl ||
      `${process.env.FRONTEND_URL}/track/${this.order.orderNumber}`;

    try {
      const qrDataUrl = await QRCode.toDataURL(qrUrl, {
        width: 70,
        margin: 1,
        color: {
          dark: COLORS.primary,
          light: '#ffffff',
        },
      });

      const qrX = this.pageWidth - this.margin - 80;
      const qrY = this.doc.y;

      // QR container
      this.doc
        .rect(qrX - 5, qrY - 5, 80, 95)
        .strokeColor(COLORS.border)
        .stroke();

      // QR code
      this.doc.image(qrDataUrl, qrX, qrY, { width: 70 });

      // Label
      this.doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor(COLORS.textMuted)
        .text('Scan to track', qrX - 5, qrY + 72, { width: 80, align: 'center' });
    } catch (error) {
      // Continue without QR
    }
  }

  private drawSignatureSection(): void {
    const startY = Math.max(this.doc.y + 20, this.doc.page.height - 200);
    const signBoxWidth = (this.contentWidth - 30) / 2;

    // Signature boxes
    const signatureBoxes = [
      { label: 'DELIVERED BY', sublabel: 'Driver/Courier Signature' },
      { label: 'RECEIVED BY', sublabel: 'Customer Signature' },
    ];

    signatureBoxes.forEach((box, index) => {
      const boxX = this.margin + index * (signBoxWidth + 30);

      // Box outline
      this.doc
        .rect(boxX, startY, signBoxWidth, 80)
        .strokeColor(COLORS.border)
        .stroke();

      // Label
      this.doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(COLORS.primary)
        .text(box.label, boxX + 10, startY + 8);

      // Signature line
      this.doc
        .moveTo(boxX + 10, startY + 50)
        .lineTo(boxX + signBoxWidth - 10, startY + 50)
        .strokeColor(COLORS.border)
        .lineWidth(0.5)
        .stroke();

      // Sublabel
      this.doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor(COLORS.textMuted)
        .text(box.sublabel, boxX + 10, startY + 54);

      // Date line
      this.doc
        .text('Date: ____________', boxX + 10, startY + 66);
    });

    this.doc.y = startY + 100;
  }

  private drawFooter(): void {
    const footerY = this.doc.page.height - 60;

    // Footer line
    this.doc
      .moveTo(this.margin, footerY)
      .lineTo(this.pageWidth - this.margin, footerY)
      .strokeColor(COLORS.border)
      .stroke();

    // Footer notes
    this.doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor(COLORS.textMuted);

    let noteY = footerY + 8;
    this.options.footerNotes?.forEach((note) => {
      this.doc.text(note, this.margin, noteY, {
        width: this.contentWidth,
        align: 'center',
      });
      noteY += 10;
    });

    // Document info
    this.doc.text(
      `Document generated on ${new Date().toLocaleString()} | ${this.company.name}`,
      this.margin,
      footerY + 40,
      { width: this.contentWidth, align: 'center' }
    );
  }

  // Helper methods
  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  private truncateText(text: string, maxLength: number): string {
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
  }

  private getStatusColor(status: string): string {
    switch (status) {
      case 'PAID':
      case 'DELIVERED':
        return COLORS.success;
      case 'PENDING':
      case 'IN_TRANSIT':
      case 'PICKED_UP':
        return COLORS.warning;
      default:
        return COLORS.text;
    }
  }
}

export async function generateDeliveryNotePdf(
  order: OrderData,
  company: CompanyInfo,
  options?: PdfOptions
): Promise<Buffer> {
  const generator = new DeliveryNoteGenerator(order, company, options);
  return generator.generate();
}
