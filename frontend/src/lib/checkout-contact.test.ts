import { describe, it, expect, beforeEach } from 'vitest';
import { saveCheckoutContact, loadCheckoutContact } from './checkout-contact';

describe('checkout contact', () => {
  beforeEach(() => sessionStorage.clear());

  it('keeps the contact details for the order that was placed', () => {
    saveCheckoutContact('ord_1', { customerName: 'Ama', customerPhone: '0244123456', deliveryAddress: 'Accra' });
    expect(loadCheckoutContact('ord_1')?.customerName).toBe('Ama');
    expect(loadCheckoutContact('ord_2')).toBeNull();
  });

  it('copes with unreadable storage', () => {
    sessionStorage.setItem('checkout-contact:ord_1', '{not json');
    expect(loadCheckoutContact('ord_1')).toBeNull();
  });
});
