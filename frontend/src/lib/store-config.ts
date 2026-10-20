/**
 * Store branding and contact details.
 *
 * Centralised so the storefront has a single source of truth — these values
 * were previously hardcoded (and inconsistent) across the header, footer, and
 * product pages. Override per-environment via NEXT_PUBLIC_* env vars.
 */
export const STORE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'TechHub';

export const STORE_TAGLINE =
  process.env.NEXT_PUBLIC_SITE_DESCRIPTION ||
  'Phones, laptops and accessories — genuine stock, delivered nationwide.';

export const STORE_PHONE = process.env.NEXT_PUBLIC_CONTACT_PHONE || '+233 30 000 0000';

export const STORE_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'support@techhub.com.gh';

export const STORE_WHATSAPP =
  process.env.NEXT_PUBLIC_CONTACT_WHATSAPP || STORE_PHONE;

export const STORE_LOCATION = process.env.NEXT_PUBLIC_STORE_LOCATION || 'Accra, Ghana';
