# Currency & Settings Configuration Guide

## ✅ What Was Implemented

### 1. Currency Display Update
- **Frontend:** Updated currency formatting to show **FCFA** instead of XAF
- **Database:** Changed currency settings from SZL to XAF (Central African CFA Franc)
- **Format:** Numbers now display as `1,235 FCFA` (no decimals for XAF)

### 2. Settings API (Backend)
Created a complete settings management API with the following endpoints:

#### Public Endpoint (No Auth Required):
- `GET /api/settings/public` - Get store info, currency, delivery, and payment settings

#### Admin Endpoints (Requires Admin Auth):
- `GET /api/settings` - Get all settings
- `GET /api/settings/:key` - Get specific setting
- `PUT /api/settings/:key` - Update specific setting
- `PUT /api/settings` - Update multiple settings at once

#### Available Setting Keys:
- `store_info` - Store name, contact info, address
- `currency_settings` - Currency code, symbol, decimal places
- `delivery_settings` - Delivery fees, zones, estimated days
- `notification_settings` - Email/SMS notification preferences
- `payment_methods_enabled` - Enable/disable payment methods

### 3. Admin Settings Page
Created a comprehensive settings management interface at `/admin/settings` with 5 tabs:

#### **Store Info Tab**
- Store name, email, phone, WhatsApp
- Physical address and location
- Company contact information

#### **Currency Tab** ⭐
- Currency code (XAF, USD, EUR, etc.)
- Currency symbol (FCFA, $, €, etc.)
- Decimal places (0-2)
- Live preview of formatting

####**Delivery Tab**
- Default delivery fee
- Free delivery threshold
- Estimated delivery time (min/max days)
- Delivery zones (cities/regions)

#### **Notifications Tab**
- Admin email and WhatsApp for alerts
- Toggle order confirmation emails
- Toggle order confirmation SMS
- Toggle delivery update SMS

#### **Payment Methods Tab**
- Enable/disable Mobile Money (MoMo)
- Enable/disable Cash on Delivery (COD)
- Configure payment providers

## 📋 Files Modified/Created

### Backend:
✅ Created: `backend/src/modules/settings/settings.service.ts`
✅ Created: `backend/src/modules/settings/settings.controller.ts`
✅ Created: `backend/src/modules/settings/settings.routes.ts`
✅ Modified: `backend/src/routes/index.ts` - Added settings routes
✅ Modified: Database - Updated currency_settings to XAF

### Frontend:
✅ Modified: `frontend/src/lib/utils.ts` - Enhanced `formatCurrency()` and `formatPrice()`
✅ Replaced: `frontend/src/app/admin/(dashboard)/settings/page.tsx` - Full settings UI
✅ Modified: `frontend/.env` - Currency settings (XAF, FCFA)
✅ Modified: `frontend/next.config.js` - Fixed Supabase image domain

## 🚀 How to Use

### Changing Currency

#### Option 1: Via Admin Settings Page
1. Log in to admin panel: `http://localhost:3000/admin`
2. Go to **Settings** → **Currency** tab
3. Update:
   - Currency Code: `XAF`
   - Currency Symbol: `FCFA`
   - Decimal Places: `0`
4. Click **Save Currency Settings**

#### Option 2: Via API
```bash
curl -X PUT http://localhost:4000/api/settings/currency_settings \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "value": {
      "default_currency": "XAF",
      "currency_symbol": "FCFA",
      "decimal_places": 0
    }
  }'
```

#### Option 3: Via Database
```sql
UPDATE settings
SET value = '{"default_currency": "XAF", "currency_symbol": "FCFA", "decimal_places": 0}'
WHERE key = 'currency_settings';
```

### Currency Formatting Examples

The `formatPrice()` function now automatically formats prices based on the currency:

```typescript
formatPrice(1234.56)  // "1,235 FCFA" (XAF - rounded, no decimals)
formatCurrency(1234.56, 'USD')  // "$1,235" (USD - with symbol before)
formatCurrency(1234.56, 'EUR')  // "€1,235" (EUR - with symbol before)
```

### Supported Currencies

Currently configured:
- **XAF** (Central African CFA Franc) - Shows as "FCFA" after amount
- **USD** (US Dollar) - Shows as "$" before amount
- **EUR** (Euro) - Shows as "€" before amount
- **GBP** (British Pound) - Shows as "£" before amount

To add more currencies, edit [`frontend/src/lib/utils.ts`](frontend/src/lib/utils.ts#L12-L17):

```typescript
const currencySymbols: Record<string, string> = {
  XAF: 'FCFA',
  USD: '$',
  EUR: '€',
  GBP: '£',
  // Add your currency here
  NGN: '₦',  // Nigerian Naira
  GHS: 'GH₵', // Ghanaian Cedi
};
```

## 🎯 Current Currency Configuration

**Database (currency_settings):**
```json
{
  "default_currency": "XAF",
  "currency_symbol": "FCFA",
  "decimal_places": 0
}
```

**Frontend (.env):**
```
NEXT_PUBLIC_CURRENCY=XAF
NEXT_PUBLIC_CURRENCY_SYMBOL=FCFA
```

**Display Format:**
- **Before:** `1,234.56 XAF`
- **After:** `1,235 FCFA` (rounded, no decimals)

## 🔧 Testing

### Test Currency Formatting
```bash
# Start backend
cd backend && npm run dev

# Start frontend
cd frontend && npm run dev

# Navigate to any product page to see prices in FCFA
open http://localhost:3000/products
```

### Test Settings API
```bash
# Get public settings (no auth)
curl http://localhost:4000/api/settings/public

# Get all settings (admin only)
curl http://localhost:4000/api/settings \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Update currency
curl -X PUT http://localhost:4000/api/settings/currency_settings \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": {"default_currency": "USD", "currency_symbol": "$", "decimal_places": 2}}'
```

### Test Admin Settings Page
1. Login: http://localhost:3000/admin/login
   - Email: `superadmin@ecommerce.com`
   - Password: `superadmin123`
2. Go to: http://localhost:3000/admin/settings
3. Test all 5 tabs (Store Info, Currency, Delivery, Notifications, Payment)
4. Make changes and click Save
5. Verify changes appear on frontend

## 📊 Settings in Database

Check current settings:
```bash
PGPASSWORD=<db-password> psql \
  -h aws-1-eu-north-1.pooler.supabase.com \
  -U postgres.<supabase-project-ref> \
  -d postgres \
  -p 5432 \
  -c "SELECT key, value FROM settings;"
```

Current values:
- ✅ `store_info` - Store name and contact details
- ✅ `currency_settings` - XAF/FCFA configuration
- ✅ `delivery_settings` - 2000 FCFA delivery, zones
- ✅ `notification_settings` - Email/SMS preferences
- ✅ `payment_methods_enabled` - MoMo and COD enabled

## 🎨 UI Features

The admin settings page includes:
- **Real-time preview** of currency formatting
- **Save buttons** on each tab
- **Loading states** during save operations
- **Success/error toasts** for user feedback
- **Responsive design** for mobile/desktop
- **Icon-labeled tabs** for easy navigation

## 🔐 Security

- All admin endpoints require authentication
- Only ADMIN and SUPER_ADMIN roles can access
- Public endpoint only exposes non-sensitive settings
- Settings are validated before saving

## 📝 Next Steps

To deploy to production:

1. **Update environment variables** in Render:
   ```bash
   NEXT_PUBLIC_CURRENCY=XAF
   NEXT_PUBLIC_CURRENCY_SYMBOL=FCFA
   ```

2. **Build and deploy** backend with settings API
3. **Build and deploy** frontend with new currency formatting
4. **Test** all currency displays on production
5. **Configure** store settings via admin panel

## 💡 Tips

- Currency changes take effect immediately on frontend
- Decimal places: Use `0` for XAF/FCFA (no cents)
- Use `2` for USD/EUR (shows cents)
- Settings are cached - may need to refresh browser
- All prices in database remain unchanged (in raw numbers)
- Only the display format changes

## 🆘 Troubleshooting

**Currency not updating?**
- Check browser console for errors
- Verify admin token is valid
- Reload page to clear cache
- Check database settings table

**Format looks wrong?**
- Verify `decimal_places` setting (0 for XAF)
- Check `currency_symbol` matches expectation
- Ensure `formatPrice()` is being used

**Settings not saving?**
- Check browser network tab for 401/403 errors
- Verify admin authentication token
- Check backend logs for errors
- Ensure database connection is working

## 📞 Support

If you need help:
1. Check the [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
2. Review backend logs: `backend/logs/`
3. Check browser console for frontend errors
4. Verify database settings are correct

---

✅ **Currency successfully changed from SZL to XAF (FCFA)**
✅ **Admin settings page fully functional**
✅ **All prices now display as: 1,235 FCFA**
