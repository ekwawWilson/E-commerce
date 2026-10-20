# How to Change Currency - Quick Guide

## ✅ Your Settings Page is Ready!

The Currency tab **exists** and is working. Here's how to access it:

## 📍 Step-by-Step Instructions

### 1. Start Your Servers

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

### 2. Access Admin Panel

Open your browser and go to:
```
http://localhost:3000/admin/login
```

Or if using your network IP:
```
http://192.168.0.8:3000/admin/login
```

### 3. Login with Admin Credentials

Use one of these accounts:

**Super Admin:**
- Email: `superadmin@ecommerce.com`
- Password: `superadmin123`

**Admin:**
- Email: `admin@ecommerce.com`
- Password: `admin123`

### 4. Go to Settings

After logging in, click **"Settings"** in the admin sidebar (left menu).

Or navigate directly to:
```
http://localhost:3000/admin/settings
```

### 5. Click the Currency Tab 💰

You'll see 5 tabs at the top:
1. **Store Info** (store icon)
2. **Currency** (💲 dollar sign icon) ← **Click this one!**
3. **Delivery** (truck icon)
4. **Notifications** (bell icon)
5. **Payment Methods**

### 6. Update Currency Settings

In the Currency tab, you'll see 3 fields:

**Currency Code:**
- Enter: `XAF` (or `USD`, `EUR`, `GBP`, etc.)

**Currency Symbol:**
- Enter: `FCFA` (or `$`, `€`, `£`, etc.)

**Decimal Places:**
- Enter: `0` for whole numbers (XAF/FCFA)
- Enter: `2` for cents (USD/EUR)

**Live Preview** shows how it will look: `1,235 FCFA`

### 7. Save Changes

Click the **"Save Currency Settings"** button at the bottom.

You'll see a success alert: "Settings saved successfully"

### 8. Verify on Frontend

1. Go to your storefront: `http://localhost:3000`
2. Browse products
3. Check that prices now show in your new currency format

---

## 🎨 What You'll See

The Settings page has **5 tabs** with icons:

```
[🏪 Store Info] [💲 Currency] [🚚 Delivery] [🔔 Notifications] [Payment Methods]
```

Click the **💲 Currency** tab to change currency settings.

---

## 🔧 If You Don't See the Currency Tab

### Check 1: Make sure you're logged in as admin
- The settings page requires admin authentication
- Use the credentials above

### Check 2: Clear browser cache
```bash
# In browser console (F12):
localStorage.clear()
sessionStorage.clear()
# Then refresh the page
```

### Check 3: Check browser console for errors
- Press F12 to open developer tools
- Look at the Console tab
- Report any errors you see

### Check 4: Restart frontend server
```bash
# Stop the server (Ctrl+C)
cd frontend
npm run dev
```

---

## 📸 Visual Guide

When you open Settings, you should see:

```
╔═══════════════════════════════════════════════════════════╗
║  Store Settings                                           ║
╠═══════════════════════════════════════════════════════════╣
║  [Store Info] [Currency] [Delivery] [Notifications] [...] ║
║                    ↑                                       ║
║              Click this tab!                               ║
╠═══════════════════════════════════════════════════════════╣
║  Currency Settings                                         ║
║  Configure your store's currency and display format        ║
║                                                            ║
║  Currency Code: [XAF___]    ← ISO currency code           ║
║  Currency Symbol: [FCFA__]  ← How it displays             ║
║  Decimal Places: [0_]       ← 0 = no cents, 2 = with cents║
║                                                            ║
║  Preview: 1,235 FCFA                                       ║
║                                                            ║
║  [Save Currency Settings]                                  ║
╚═══════════════════════════════════════════════════════════╝
```

---

## 🌍 Common Currencies to Use

### Central Africa (XAF)
```
Currency Code: XAF
Currency Symbol: FCFA
Decimal Places: 0
Result: 1,235 FCFA
```

### Nigeria (NGN)
```
Currency Code: NGN
Currency Symbol: ₦
Decimal Places: 2
Result: ₦1,234.56
```

### Ghana (GHS)
```
Currency Code: GHS
Currency Symbol: GH₵
Decimal Places: 2
Result: GH₵1,234.56
```

### USA (USD)
```
Currency Code: USD
Currency Symbol: $
Decimal Places: 2
Result: $1,234.56
```

### Europe (EUR)
```
Currency Code: EUR
Currency Symbol: €
Decimal Places: 2
Result: €1,234.56
```

---

## ✅ Confirmation

After saving, you should:
- ✅ See a success message
- ✅ See updated currency on all product pages
- ✅ See updated currency in cart
- ✅ See updated currency at checkout

---

## 🆘 Still Can't Find the Currency Tab?

If you've followed all steps and still don't see it:

1. **Take a screenshot** of what you see at `/admin/settings`
2. **Check the browser console** (F12 → Console tab)
3. **Verify the build completed** without errors:
   ```bash
   cd frontend
   npm run build
   ```

The Currency tab is definitely there in the code - it's at line 226-229 of the settings page!

---

## 📞 Quick Test

Run this in your browser console while on the settings page:

```javascript
// Check if Currency tab exists
document.querySelector('[value="currency"]') ?
  console.log('✅ Currency tab found!') :
  console.log('❌ Currency tab missing');
```

---

**The Currency tab is working and ready to use!** Just login to admin and click the 💲 Currency tab. 🎉
