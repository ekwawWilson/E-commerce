import prisma from '../../config/database';
import { supabase, STORAGE_BUCKET, isSupabaseConfigured } from '../../config/supabase';
import logger from '../../utils/logger';
import { generateInvoicePdf } from './invoice.generator';
import { generateDeliveryNotePdf } from './delivery-note.generator';
import { OrderData, CompanyInfo, PdfOptions } from './pdf.types';

export class PdfService {
  private getCompanyInfo(): CompanyInfo {
    return {
      name: process.env.COMPANY_NAME || 'E-Commerce Store',
      address: process.env.COMPANY_ADDRESS || 'Accra, Ghana',
      phone: process.env.COMPANY_PHONE || '+233 30 000 0000',
      email: process.env.COMPANY_EMAIL || '',
      website: process.env.COMPANY_WEBSITE || '',
    };
  }

  /**
   * Generate and upload invoice PDF
   */
  async generateInvoice(orderId: string, options?: PdfOptions): Promise<string> {
    const order = await this.getOrderData(orderId);
    const company = this.getCompanyInfo();

    // Generate PDF
    const pdfBuffer = await generateInvoicePdf(order, company, {
      ...options,
      qrCodeUrl: `${process.env.FRONTEND_URL}/track/${order.orderNumber}`,
    });

    // Upload to Supabase Storage
    const filename = `invoice-${order.orderNumber}.pdf`;
    const uploadResult = await this.uploadToSupabase(pdfBuffer, filename, 'invoices');

    // Update order with invoice URL
    await prisma.order.update({
      where: { id: orderId },
      data: { invoiceUrl: uploadResult.url },
    });

    logger.info(`Invoice generated for order ${order.orderNumber}: ${uploadResult.url}`);
    return uploadResult.url;
  }

  /**
   * Generate and upload delivery note PDF
   */
  async generateDeliveryNote(orderId: string, options?: PdfOptions): Promise<string> {
    const order = await this.getOrderData(orderId);
    const company = this.getCompanyInfo();

    // Generate PDF
    const pdfBuffer = await generateDeliveryNotePdf(order, company, {
      ...options,
      qrCodeUrl: `${process.env.FRONTEND_URL}/track/${order.orderNumber}`,
    });

    // Upload to Supabase Storage
    const filename = `delivery-note-${order.orderNumber}.pdf`;
    const uploadResult = await this.uploadToSupabase(pdfBuffer, filename, 'delivery-notes');

    // Update order with delivery note URL
    await prisma.order.update({
      where: { id: orderId },
      data: { deliveryNoteUrl: uploadResult.url },
    });

    logger.info(`Delivery note generated for order ${order.orderNumber}: ${uploadResult.url}`);
    return uploadResult.url;
  }

  /**
   * Generate both invoice and delivery note
   */
  async generateAllDocuments(orderId: string): Promise<{ invoiceUrl: string; deliveryNoteUrl: string }> {
    const [invoiceUrl, deliveryNoteUrl] = await Promise.all([
      this.generateInvoice(orderId),
      this.generateDeliveryNote(orderId),
    ]);

    return { invoiceUrl, deliveryNoteUrl };
  }

  /**
   * Regenerate invoice for an order
   */
  async regenerateInvoice(orderId: string): Promise<string> {
    // Delete old invoice if exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { invoiceUrl: true, orderNumber: true },
    });

    if (order?.invoiceUrl) {
      await this.deleteFromSupabase(order.invoiceUrl);
    }

    return this.generateInvoice(orderId);
  }

  /**
   * Get order data for PDF generation
   */
  private async getOrderData(orderId: string): Promise<OrderData> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payment: true,
        delivery: {
          include: {
            courier: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      deliveryAddress: order.customerAddress,
      deliveryNotes: order.deliveryNotes,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      deliveryStatus: order.deliveryStatus,
      subtotal: order.subtotal.toNumber(),
      deliveryFee: order.deliveryFee.toNumber(),
      total: order.total.toNumber(),
      currency: order.currency,
      itemsSnapshot: order.itemsSnapshot as any[],
      payment: order.payment ? {
        id: order.payment.id,
        provider: order.payment.provider || '',
        transactionId: order.payment.transactionId,
        status: order.payment.status,
        paidAt: order.payment.paidAt,
      } : null,
      delivery: order.delivery ? {
        id: order.delivery.id,
        trackingNumber: order.delivery.trackingNumber,
        status: order.delivery.status,
        courier: order.delivery.courier ? {
          name: order.delivery.courier.name,
          phone: order.delivery.courier.phone,
        } : null,
      } : null,
    };
  }

  /**
   * Upload PDF buffer to Supabase Storage
   */
  private async uploadToSupabase(
    buffer: Buffer,
    filename: string,
    folder: string
  ): Promise<{ url: string; path: string }> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase Storage is not configured');
    }

    const filePath = `documents/${folder}/${filename}`;

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, buffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      logger.error('Supabase PDF upload error:', error);
      throw new Error(`Failed to upload PDF: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      path: filePath,
    };
  }

  /**
   * Delete PDF from Supabase Storage
   */
  private async deleteFromSupabase(url: string): Promise<void> {
    try {
      if (!isSupabaseConfigured()) {
        return;
      }

      // Extract file path from URL
      const urlObj = new URL(url);
      const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);

      if (pathMatch) {
        const filePath = pathMatch[1];
        const { error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([filePath]);

        if (error) {
          logger.error('Failed to delete PDF from Supabase:', error);
        }
      }
    } catch (error) {
      logger.error('Failed to delete PDF from Supabase:', error);
    }
  }
}

export const pdfService = new PdfService();
