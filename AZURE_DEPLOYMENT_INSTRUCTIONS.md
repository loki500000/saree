# Azure Deployment Instructions

## ✅ Files Ready for Deployment

The following files have been created/updated for Azure deployment:

### New Files:
- ✅ `server.js` - Entry point for Azure App Service
- ✅ `supabase/migrations/add_pose_keypoints_to_store_images.sql` - Database migration

### Updated Files:
- ✅ `next.config.js` - Added `output: 'standalone'` for Azure
- ✅ `web.config` - Updated for Next.js 15 compatibility
- ✅ `app/api/gallery/upload/route.ts` - Accepts pose data
- ✅ `app/store/admin/page.tsx` - Extracts pose during upload
- ✅ `components/MobileVirtualTryOn.tsx` - Uses pre-computed poses

## 🚀 Deployment Methods

### **Method 1: GitHub Actions (RECOMMENDED)**

This is the easiest method - Azure builds everything automatically.

```bash
# 1. Commit changes
git add server.js web.config next.config.js \
  app/api/gallery/upload/route.ts \
  app/store/admin/page.tsx \
  components/MobileVirtualTryOn.tsx \
  supabase/migrations/add_pose_keypoints_to_store_images.sql

git commit -m "Add Azure deployment config and pose preprocessing"

# 2. Push to GitHub (triggers automatic deployment)
git push origin master
```

**What happens:**
1. GitHub Actions workflow runs (`.github/workflows/master_saree.yml`)
2. Azure builds the app (`npm install` + `npm run build`)
3. Deploys to App Service
4. Takes 5-10 minutes

**Monitor progress:**
- GitHub: https://github.com/your-repo/actions
- Azure: https://portal.azure.com → App Services → sarees → Deployment Center

---

### **Method 2: Direct Azure CLI Deployment**

If GitHub Actions isn't working, use this manual method:

```bash
# 1. First, run the database migration
# Go to Supabase Dashboard → SQL Editor
# Execute: supabase/migrations/add_pose_keypoints_to_store_images.sql

# 2. Set up Azure to build remotely
az webapp config appsettings set \
  --name sarees \
  --resource-group backend_group \
  --settings SCM_DO_BUILD_DURING_DEPLOYMENT=true

# 3. Deploy using Git
git remote add azure https://sarees.scm.azurewebsites.net:443/sarees.git
git push azure master

# Or use ZIP deploy (smaller, faster)
# This only includes source code, not node_modules or .next
```

---

### **Method 3: Azure Portal ZIP Upload**

For manual control:

**Step 1: Create deployment ZIP**
```bash
# Windows (if you have zip)
zip -r deploy.zip \
  app components lib public supabase \
  package.json package-lock.json \
  next.config.js server.js web.config .deployment \
  -x "*.git*" "node_modules/*" ".next/*"

# Or use 7-Zip GUI:
# Select: app, components, lib, public, supabase,
#         package.json, package-lock.json,
#         next.config.js, server.js, web.config, .deployment
# Right-click → 7-Zip → Add to archive → deploy.zip
```

**Step 2: Upload to Azure**
1. Go to https://portal.azure.com
2. Navigate to App Services → sarees
3. Select "Advanced Tools" (Kudu) → Go
4. Click "Tools" → "Zip Push Deploy"
5. Drag & drop `deploy.zip`
6. Wait for deployment to complete

---

## 📋 Pre-Deployment Checklist

Before deploying, ensure:

- [ ] Database migration is ready (but DON'T run it yet)
- [ ] Environment variables are set in Azure:
  ```bash
  az webapp config appsettings list \
    --name sarees \
    --resource-group backend_group
  ```
  Should show:
  - ✅ FAL_KEY
  - ✅ NEXT_PUBLIC_SUPABASE_URL
  - ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
  - ✅ SUPABASE_SERVICE_ROLE_KEY

- [ ] Local build works: `npm run build` (already done ✅)
- [ ] All files committed to git

---

## 🗄️ Database Migration Steps

**IMPORTANT:** Run this AFTER deploying the code, but BEFORE users upload new clothing.

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com
2. Select your project: `rndlzoogkqpbczifafkj`
3. Click "SQL Editor" in sidebar

### Step 2: Execute Migration
1. Click "New Query"
2. Copy contents of `supabase/migrations/add_pose_keypoints_to_store_images.sql`
3. Paste into SQL Editor
4. Click "Run" or press Ctrl+Enter

### Step 3: Verify Migration
Run this query:
```sql
-- Check if columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'store_images'
AND column_name IN ('pose_keypoints', 'pose_detected_at', 'pose_detection_failed');
```

Should return 3 rows.

---

## ✅ Post-Deployment Verification

### 1. Check App Status
```bash
# Check if app is running
az webapp show --name sarees --resource-group backend_group --query "state"

# View recent logs
az webapp log tail --name sarees --resource-group backend_group
```

### 2. Test Website
Visit: https://sarees-cbgvfbbactfvhagw.canadacentral-01.azurewebsites.net

- [ ] Homepage loads
- [ ] Login works
- [ ] Admin can access /store/admin
- [ ] Admin can upload clothing (NEW: should show "Extracting pose...")
- [ ] User can select clothing (should be instant now!)

### 3. Test Pose Preprocessing
As admin:
1. Go to /store/admin
2. Click "Upload Clothing"
3. Select an image with a person
4. Watch for "Extracting pose..." message
5. Upload completes
6. Check database: pose_keypoints should be populated

As user:
1. Upload your photo
2. Select the newly uploaded clothing
3. Should match pose INSTANTLY (~50ms instead of 1-3s)

---

## 🐛 Troubleshooting

### Deployment Fails
```bash
# Check deployment logs
az webapp log deployment show --name sarees --resource-group backend_group

# Check runtime logs
az webapp log tail --name sarees --resource-group backend_group
```

### App Crashes After Deployment
Common issues:
1. **Missing server.js**: Ensure it's included in deployment
2. **Build failed**: Check if `npm run build` succeeded in logs
3. **Environment variables**: Verify in Azure Portal

### "Cannot find module" errors
```bash
# Ensure dependencies are installed on Azure
az webapp config appsettings set \
  --name sarees \
  --resource-group backend_group \
  --settings SCM_DO_BUILD_DURING_DEPLOYMENT=true
```

### Pose preprocessing not working
- Check browser console for TensorFlow errors
- Verify pose_keypoints column exists in database
- Check admin upload shows "Extracting pose..." message

---

## 📊 Current Status

- ✅ Code changes complete
- ✅ Local build successful
- ⏳ Awaiting deployment method selection
- ⏳ Database migration pending
- ⏳ Azure deployment pending

## 🎯 Recommended Next Steps

1. **Choose deployment method** (recommend Method 1: GitHub Actions)
2. **Deploy code** using chosen method
3. **Run database migration** in Supabase
4. **Test the app** on Azure
5. **Verify pose preprocessing** works

---

## 📝 File Sizes Reference

Current deployment size (if including build output):
- node_modules: ~430MB
- .next (build): ~130MB
- Source code: ~5MB

**Total: ~565MB** (TOO LARGE!)

**Recommended approach:**
- Deploy only source code (~5MB)
- Let Azure build it (~10min build time)
- Final deployed size: ~565MB (built on Azure)

---

## 💡 Pro Tips

1. **Use GitHub Actions**: Automated, reliable, visible build logs
2. **Monitor deployments**: Check logs if anything fails
3. **Test locally first**: Always run `npm run build` before deploying
4. **Database migrations**: Always test in staging first (if available)
5. **Rollback plan**: Keep previous deployment in case you need to revert

---

Generated with Claude Code
