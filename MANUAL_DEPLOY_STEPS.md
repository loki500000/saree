# Manual Azure Deployment Steps

## Issue: Large File in Git History
GitHub push failed because `virtual-tryon.zip` (488MB) is in git history.

## ✅ **RECOMMENDED: Use Azure Portal ZIP Deploy**

This is the EASIEST and FASTEST method!

### Step 1: Create Deployment ZIP (Using File Explorer)

**Option A: Using 7-Zip or WinRAR (if installed)**
1. Select these folders/files:
   ```
   .next
   node_modules
   package.json
   package-lock.json
   next.config.js
   public
   server.js
   web.config
   .deployment
   app
   components
   lib
   supabase
   ```
2. Right-click → 7-Zip → "Add to archive"
3. Name it: `azure-deploy.zip`
4. Click OK

**Option B: Using PowerShell (if 7-Zip not available)**
```powershell
# Open PowerShell in project directory
cd C:\Users\KITS\Documents\newer\virtual-tryon

# Create ZIP (this takes 2-3 minutes)
Compress-Archive -Path .next,node_modules,package.json,package-lock.json,next.config.js,public,server.js,web.config,.deployment,app,components,lib,supabase -DestinationPath azure-deploy.zip -Force
```

### Step 2: Deploy via Azure Portal

1. **Open Azure Portal**
   - Go to: https://portal.azure.com
   - Sign in with: fitmydress@outlook.com

2. **Navigate to App Service**
   - Click "App Services" in left menu
   - Click "sarees"

3. **Open Deployment Center**
   - In left menu, scroll to "Deployment"
   - Click "Deployment Center"

4. **Use ZIP Deploy**
   - Click "Advanced Tools" OR "Kudu" link
   - This opens Kudu dashboard in new tab
   - In Kudu, click "Tools" menu → "Zip Push Deploy"

5. **Upload ZIP**
   - Drag & drop `azure-deploy.zip` to the page
   - OR click to browse and select the file
   - Wait for upload (may take 5-10 minutes)
   - You'll see deployment logs

6. **Verify Deployment**
   - Once complete, visit: https://sarees-cbgvfbbactfvhagw.canadacentral-01.azurewebsites.net
   - App should load!

---

## Alternative: Use Azure CLI (Smaller Package)

If ZIP upload is too large, try deploying just source code:

### Step 1: Configure Azure for Remote Build
```bash
az webapp config appsettings set \
  --name sarees \
  --resource-group backend_group \
  --settings SCM_DO_BUILD_DURING_DEPLOYMENT=true
```

### Step 2: Create Source-Only ZIP
```bash
# This ZIP is much smaller (no node_modules, no .next)
# Azure will build it for you

zip -r source-deploy.zip \
  app components lib public supabase \
  package.json package-lock.json \
  next.config.js server.js web.config .deployment

# Or use PowerShell:
Compress-Archive -Path app,components,lib,public,supabase,package.json,package-lock.json,next.config.js,server.js,web.config,.deployment -DestinationPath source-deploy.zip -Force
```

### Step 3: Deploy Source ZIP
```bash
az webapp deployment source config-zip \
  --resource-group backend_group \
  --name sarees \
  --src source-deploy.zip
```

This will:
1. Upload source code (~10MB)
2. Azure runs `npm install`
3. Azure runs `npm run build`
4. Takes 10-15 minutes but works!

---

## After Deployment: Run Database Migration

**IMPORTANT:** Do this AFTER deploying the code!

### Step 1: Open Supabase
1. Go to: https://supabase.com
2. Select project: `rndlzoogkqpbczifafkj`
3. Click "SQL Editor"

### Step 2: Run Migration
1. Click "New Query"
2. Open file: `supabase/migrations/add_pose_keypoints_to_store_images.sql`
3. Copy all contents
4. Paste into Supabase SQL Editor
5. Click "Run" or press Ctrl+Enter

### Step 3: Verify
```sql
-- Run this to check:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'store_images'
AND column_name IN ('pose_keypoints', 'pose_detected_at', 'pose_detection_failed');
```

Should return 3 rows.

---

## Testing the Deployment

### 1. Check App is Running
Visit: https://sarees-cbgvfbbactfvhagw.canadacentral-01.azurewebsites.net

- [ ] Homepage loads
- [ ] Can login
- [ ] No errors in browser console

### 2. Test Pose Preprocessing (as Admin)
1. Login as admin
2. Go to /store/admin
3. Click "Upload Clothing"
4. Select an image
5. **Watch for "Extracting pose..." message** (NEW!)
6. Upload completes
7. Check database - pose_keypoints should have data

### 3. Test Fast Pose Matching (as User)
1. Login as regular user
2. Upload your photo
3. Select newly uploaded clothing
4. **Should match instantly** (~50ms instead of 1-3s)!

---

## Troubleshooting

### ZIP Upload Fails
- **File too large**: Use "Source-Only ZIP" method above
- **Upload timeout**: Try again, or use smaller chunks

### App Doesn't Start
```bash
# Check logs
az webapp log tail --name sarees --resource-group backend_group

# Common issues:
# 1. Missing server.js - ensure it's in ZIP
# 2. Build failed - check logs for npm errors
# 3. Wrong PORT - app uses PORT env variable
```

### "Cannot GET /" Error
- Check if server.js exists in deployment
- Verify web.config is correct
- Check Azure logs for startup errors

### Pose Preprocessing Not Working
- Check browser console for TensorFlow errors
- Verify migration ran successfully
- Check if pose_keypoints column exists

---

## Current Status

✅ Code changes complete
✅ Local build successful
✅ Azure CLI logged in
⏳ Awaiting manual ZIP deployment
⏳ Database migration pending

## File Sizes for Reference

- **Full deployment** (.next + node_modules): ~565MB
- **Source only**: ~10MB
- **Recommended**: Use Azure Portal ZIP Deploy with full build

---

## Quick Command Reference

```bash
# Check app status
az webapp show --name sarees --resource-group backend_group --query "state"

# View logs
az webapp log tail --name sarees --resource-group backend_group

# Restart app
az webapp restart --name sarees --resource-group backend_group

# Check settings
az webapp config appsettings list --name sarees --resource-group backend_group

# Create source ZIP (PowerShell)
Compress-Archive -Path app,components,lib,public,supabase,package.json,package-lock.json,next.config.js,server.js,web.config,.deployment -DestinationPath source-deploy.zip -Force

# Deploy source ZIP (Azure CLI)
az webapp deployment source config-zip --resource-group backend_group --name sarees --src source-deploy.zip
```

---

**Recommended Next Step:** Use Azure Portal ZIP Deploy (easiest!)
