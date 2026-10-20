// The public order lookup deliberately returns no personal details, so the
// confirmation page shows the contact details entered at checkout from this
// browser tab's session storage instead.
export interface CheckoutContact {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress: string;
  deliveryNotes?: string;
}

const key = (orderId: string) => `checkout-contact:${orderId}`;

export function saveCheckoutContact(orderId: string, contact: CheckoutContact) {
  try {
    sessionStorage.setItem(key(orderId), JSON.stringify(contact));
  } catch {
    // Storage unavailable (e.g. private mode); the pages work without it
  }
}

export function loadCheckoutContact(orderId: string): CheckoutContact | null {
  try {
    const raw = sessionStorage.getItem(key(orderId));
    return raw ? (JSON.parse(raw) as CheckoutContact) : null;
  } catch {
    return null;
  }
}
