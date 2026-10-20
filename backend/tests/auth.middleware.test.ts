import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

const prismaMock = vi.hoisted(() => ({
  admin: { findUnique: vi.fn() },
}));

vi.mock('../src/config/database', () => ({ default: prismaMock, prisma: prismaMock }));

import config from '../src/config';
import { authenticate, optionalAuth } from '../src/middleware/auth';

const admin = { id: 'adm_1', email: 'admin@example.com', role: 'ADMIN', active: true };

function requestWith(payload: object) {
  const token = jwt.sign(payload, config.jwtSecret);
  return { headers: { authorization: `Bearer ${token}` } } as any;
}

function mockResponse() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('authenticate (admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.admin.findUnique.mockResolvedValue(admin);
  });

  it('accepts an admin token', async () => {
    const req = requestWith({ type: 'admin', adminId: 'adm_1', email: admin.email, role: 'ADMIN' });
    const next = vi.fn();

    await authenticate(req, mockResponse(), next);

    expect(next).toHaveBeenCalledWith();
    expect(req.admin).toEqual(admin);
  });

  it('accepts an admin token issued before token types existed', async () => {
    const req = requestWith({ adminId: 'adm_1', email: admin.email, role: 'ADMIN' });
    const next = vi.fn();

    await authenticate(req, mockResponse(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it.each([
    ['customer', { type: 'customer', customerId: 'cus_1', email: 'c@example.com', phone: '1' }],
    ['supplier', { type: 'supplier', supplierAdminId: 'sa_1', supplierId: 'sup_1', email: 's@example.com', role: 'OWNER' }],
  ])('rejects a %s token', async (_kind, payload) => {
    const res = mockResponse();
    const next = vi.fn();

    await authenticate(requestWith(payload), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
    expect(prismaMock.admin.findUnique).not.toHaveBeenCalled();
  });
});

describe('optionalAuth (admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.admin.findUnique.mockResolvedValue(admin);
  });

  it('does not attach an admin for a customer token', async () => {
    const req = requestWith({ type: 'customer', customerId: 'cus_1', email: 'c@example.com', phone: '1' });
    const next = vi.fn();

    await optionalAuth(req, mockResponse(), next);

    expect(next).toHaveBeenCalledWith();
    expect(req.admin).toBeUndefined();
  });
});
