# Deployment Checklist - E-Commerce App

Steps for a first deployment: backend on Render, frontend on Vercel, database
and image storage on a Supabase project you create for production.

## 🚀 Deployment Steps

### Backend (Render)

1. **Environment Variables** - Set these in Render dashboard:
   ```bash
   NODE_ENV=production
   PORT=4000

   # Database
   DATABASE_URL=postgresql://postgres.<supabase-project-ref>:<db-password>@<your-pooler-host>.pooler.supabase.com:6543/postgres?pgbouncer=true
   DIRECT_URL=postgresql://postgres.<supabase-project-ref>:<db-password>@<your-pooler-host>.pooler.supabase.com:5432/postgres

   # JWT - IMPORTANT: Generate a strong secret (openssl rand -base64 48).
   # The server refuses to start in production if this is missing, shorter
   # than 32 characters, or one of the template placeholders.
   JWT_SECRET=<generate-strong-random-string>
   JWT_EXPIRES_IN=7d

   # CORS - Set to your Vercel domain
   CORS_ORIGIN=https://your-app.vercel.app

   # Frontend URL
   FRONTEND_URL=https://your-app.vercel.app

   # Supabase Storage
   SUPABASE_URL=https://<your-project-ref>.supabase.co
   SUPABASE_SERVICE_KEY=<get-from-supabase-dashboard>
   SUPABASE_STORAGE_BUCKET=images

   # Company Info
   COMPANY_NAME=YourStoreName
   COMPANY_ADDRESS=Your Address
   COMPANY_PHONE=+233 XX XXX XXXX

   # Currency
   DEFAULT_CURRENCY=GHS
   CURRENCY_SYMBOL=GH₵

   # MTN Mobile Money - REQUIRED for MoMo checkout in production.
   # Production always calls the real MTN API (MOMO_SIMULATE is refused), so
   # without these credentials MoMo payments fail and only COD works.
   MOMO_BASE_URL=https://proxy.momoapi.mtn.com
   MOMO_ENVIRONMENT=mtnghana
   MOMO_SUBSCRIPTION_KEY=<from-mtn-momo-portal>
   MOMO_API_USER=<from-mtn-momo-portal>
   MOMO_API_KEY=<from-mtn-momo-portal>
   MOMO_CALLBACK_URL=https://your-backend.onrender.com/api/payments/webhook

   # Redis - optional; without it no email/SMS/WhatsApp/PDF jobs run
   # REDIS_URL=redis://default:<password>@<host>:6379

   # Google sign-in - the ID token's audience must be one of these
   GOOGLE_CLIENT_ID=<web-or-server-oauth-client-id>
   GOOGLE_WEB_CLIENT_ID=<web-oauth-client-id>
   # GOOGLE_EXTRA_CLIENT_IDS=<android-client-id>,<ios-client-id>

   # Unpaid Mobile Money orders are cancelled (stock released) after this many hours
   UNPAID_ORDER_TTL_HOURS=24

   # Email (if using)
   SMTP_HOST=your-smtp-host
   SMTP_PORT=587
   SMTP_USER=your-email
   SMTP_PASS=your-password
   EMAIL_FROM=noreply@yourdomain.com
   ```

2. **Build Command**: `npm install && npx prisma generate && npm run build`
3. **Database migration** (from `backend/`, against the production database):
   ```bash
   npx prisma migrate deploy
   ```
   On a new, empty production database this creates the whole schema from
   `prisma/migrations`. Use a separate Supabase project (or database) for
   production rather than the development one, and run this again whenever a
   deploy adds a migration.
4. **Start Command**: `npm start`
5. **Deploy**: Push to your connected Git repo

### Frontend (Vercel)

1. **Environment Variables** - Set in Vercel dashboard:
   ```bash
   # API URL - Your Render backend URL
   NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api

   # Site URL - Your Vercel domain
   NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app

   # Site Info
   NEXT_PUBLIC_SITE_NAME=YourStoreName
   NEXT_PUBLIC_SITE_DESCRIPTION=Your store description

   # Contact
   NEXT_PUBLIC_CONTACT_PHONE=+233XXXXXXXXX
   NEXT_PUBLIC_CONTACT_EMAIL=contact@yourdomain.com
   NEXT_PUBLIC_CONTACT_WHATSAPP=+233XXXXXXXXX

   # Currency
   NEXT_PUBLIC_CURRENCY=GHS
   NEXT_PUBLIC_CURRENCY_SYMBOL=GH₵

   # Social Media (optional)
   NEXT_PUBLIC_FACEBOOK_URL=https://facebook.com/yourpage
   NEXT_PUBLIC_INSTAGRAM_URL=https://instagram.com/yourpage
   NEXT_PUBLIC_TWITTER_URL=https://twitter.com/yourpage
   ```

2. **Build Settings**:
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`

3. **Deploy**: Connect your Git repo and deploy

## 📝 Post-Deployment Tasks

### 1. Get Supabase Service Role Key
- Go to: https://supabase.com/dashboard/project/<your-project-ref>/settings/api
- Copy the **service_role** key
- Update in Render environment variables
- Redeploy backend

### 2. Verify Supabase Storage
- Go to: https://supabase.com/dashboard/project/<your-project-ref>/storage/buckets
- Ensure `images` bucket exists and is PUBLIC
- Verify storage policies are set (see setup-supabase-storage.md)

### 3. Update CORS in Backend
After deploying frontend to Vercel:
- Update `CORS_ORIGIN` in Render to your Vercel URL
- Redeploy backend

### 4. Test Everything
- [ ] Backend health check: `https://your-backend.onrender.com/api/health`
- [ ] Frontend loads: `https://your-app.vercel.app`
- [ ] Products display with images
- [ ] Can add products to cart
- [ ] Admin login works: `https://your-app.vercel.app/admin`

## 🔐 Security Checklist

- [ ] Generate strong JWT_SECRET (not the default)
- [ ] Remove any hardcoded passwords from .env files
- [ ] Set NODE_ENV=production in Render
- [ ] Enable HTTPS only (both platforms do this by default)
- [ ] Set appropriate CORS_ORIGIN (not *)
- [ ] Review Supabase storage policies

## 📊 Monitoring

### Backend (Render)
- Logs: https://dashboard.render.com/
- Check for startup errors
- Monitor response times

### Frontend (Vercel)
- Logs: https://vercel.com/dashboard
- Check for build errors
- Monitor image optimization

### Database (Supabase)
- Dashboard: https://supabase.com/dashboard/project/<your-project-ref>
- Monitor queries
- Check storage usage

## 🐛 Troubleshooting

### Images not loading (400 error)
- Check Next.js config has correct Supabase hostname
- Verify images bucket is PUBLIC
- Check storage policies are set

### Backend 502/503 errors
- Check Render logs for startup errors
- Verify DATABASE_URL is correct
- Ensure all required env vars are set

### CORS errors
- Update CORS_ORIGIN in backend to match frontend URL
- Ensure both HTTP and HTTPS are configured if needed

### Admin login fails
- Verify JWT_SECRET is set
- Check database connection
- Ensure admin users exist (run seed script)

## 📞 Support Resources

- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs
- Next.js Docs: https://nextjs.org/docs

## 🎉 Success Criteria

Your deployment is successful when:
- ✅ Backend responds to health checks
- ✅ Frontend loads without errors
- ✅ Products display with images
- ✅ Cart functionality works
- ✅ Admin panel is accessible
- ✅ Orders can be created
- ✅ Images upload successfully
