import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentStatus } from '@prisma/client';

const prismaMock = vi.hoisted(() => {
  const mock = {
    payment: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    order: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  mock.$transaction.mockImplementation((fn: (tx: typeof mock) => unknown) => fn(mock));
  return mock;
});

const queueMock = vi.hoisted(() => ({
  emailQueue: { add: vi.fn() },
  smsQueue: { add: vi.fn() },
  pdfQueue: { add: vi.fn() },
}));

vi.mock('../src/config/database', () => ({ default: prismaMock, prisma: prismaMock }));
vi.mock('../src/config/queue', () => queueMock);
vi.mock('../src/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { PaymentService } from '../src/modules/payments/payment.service';
import { NotFoundError } from '../src/middleware/errorHandler';

const pendingPayment = {
  id: 'pay_1',
  orderId: 'ord_1',
  transactionId: 'TXN-ABC123',
  providerReference: 'MOMO-REF-1',
  status: PaymentStatus.PENDING,
};

function momoReports(service: PaymentService, status: 'SUCCESSFUL' | 'FAILED' | 'PENDING') {
  return vi
    .spyOn(service as any, 'checkMomoStatus')
    .mockResolvedValue({ status, financialTransactionId: 'FT-1' });
}

describe('PaymentService.handleWebhook', () => {
  let service: PaymentService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PaymentService();
    prismaMock.payment.findUnique.mockResolvedValue(pendingPayment);
    prismaMock.order.findUnique.mockResolvedValue({
      id: 'ord_1',
      orderNumber: 'ORD-1',
      customerPhone: '+233200000000',
      customerEmail: null,
      total: 100,
      currency: 'GHS',
    });
  });

  it('ignores the status in the webhook body and asks MoMo instead', async () => {
    const check = momoReports(service, 'PENDING');

    const result = await service.handleWebhook({ externalId: 'TXN-ABC123', status: 'SUCCESSFUL' });

    expect(check).toHaveBeenCalledWith('MOMO-REF-1');
    expect(result.status).toBe(PaymentStatus.PENDING);
    expect(prismaMock.payment.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.order.update).not.toHaveBeenCalled();
  });

  it('marks the order paid when MoMo confirms the payment', async () => {
    momoReports(service, 'SUCCESSFUL');
    prismaMock.payment.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.handleWebhook({ externalId: 'TXN-ABC123' });

    expect(result.status).toBe(PaymentStatus.PAID);
    expect(prismaMock.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pay_1', status: { notIn: [PaymentStatus.PAID, PaymentStatus.PAID] } },
      })
    );
    expect(prismaMock.order.update).toHaveBeenCalledWith({
      where: { id: 'ord_1' },
      data: { paymentStatus: PaymentStatus.PAID },
    });
    expect(queueMock.smsQueue.add).toHaveBeenCalledWith('payment-success', expect.anything());
  });

  it('never moves a paid payment back to failed', async () => {
    momoReports(service, 'FAILED');
    prismaMock.payment.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.payment.findUnique
      .mockResolvedValueOnce({ ...pendingPayment, status: PaymentStatus.PAID })
      .mockResolvedValueOnce({ status: PaymentStatus.PAID });

    const result = await service.handleWebhook({ externalId: 'TXN-ABC123' });

    expect(prismaMock.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pay_1', status: { notIn: [PaymentStatus.PAID, PaymentStatus.FAILED] } },
      })
    );
    expect(result.status).toBe(PaymentStatus.PAID);
    expect(prismaMock.order.update).not.toHaveBeenCalled();
  });

  it('does not notify twice when a duplicate confirmation arrives', async () => {
    momoReports(service, 'SUCCESSFUL');
    prismaMock.payment.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.payment.findUnique
      .mockResolvedValueOnce(pendingPayment)
      .mockResolvedValueOnce({ status: PaymentStatus.PAID });

    const result = await service.handleWebhook({ externalId: 'TXN-ABC123' });

    expect(result.status).toBe(PaymentStatus.PAID);
    expect(queueMock.smsQueue.add).not.toHaveBeenCalled();
    expect(queueMock.pdfQueue.add).not.toHaveBeenCalled();
  });

  it('rejects unknown transaction IDs', async () => {
    prismaMock.payment.findUnique.mockResolvedValue(null);

    await expect(service.handleWebhook({ externalId: 'TXN-NOPE' })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('PaymentService.verifyPayment', () => {
  let service: PaymentService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PaymentService();
    prismaMock.payment.findUnique.mockResolvedValue({ ...pendingPayment, amount: 100, currency: 'GHS' });
    prismaMock.order.findUnique.mockResolvedValue(null);
  });

  it('reports the status that was actually stored', async () => {
    momoReports(service, 'SUCCESSFUL');
    prismaMock.payment.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.verifyPayment('TXN-ABC123');

    expect(result.status).toBe(PaymentStatus.PAID);
  });

  it('still reports success when queuing notifications fails', async () => {
    momoReports(service, 'SUCCESSFUL');
    prismaMock.payment.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.order.findUnique.mockRejectedValue(new Error('redis down'));

    const result = await service.verifyPayment('TXN-ABC123');

    expect(result.status).toBe(PaymentStatus.PAID);
  });
});
