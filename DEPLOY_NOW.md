# Deploy to Azure - UPDATED Instructions

## ✅ Correct Kudu URL

Your Kudu (Advanced Tools) URL is:
**https://sarees-cbgvfbbactfvhagw.scm.canadacentral-01.azurewebsites.net**

## 🚀 Method 1: Use Azure Portal (EASIEST)

### Step 1: Access Deployment Center

1. Go to: **https://portal.azure.com**
2. Sign in with: **fitmydress@outlook.com**
3. In the search bar, type: **sarees**
4. Click on your app: **sarees** (App Service)

### Step 2: Find ZIP Deploy Option

**Option A: Via Deployment Center**
1. In left menu, find **"Deployment"** section
2. Click **"Deployment Center"**
3. Look for **"FTPS credentials"** or **"Local Git/FTP"** tab
4. You might see a **"Browse to Kudu"** link
5. OR manually go to: **https://sarees-cbgvfbbactfvhagw.scm.canadacentral-01.azurewebsites.net**

**Option B: Via Advanced Tools (Recommended)**
1. In left menu, scroll down to **"Development Tools"**
2. Click **"Advanced Tools"**
3. Click **"Go →"** button
4. This opens Kudu dashboard
5. Once in Kudu, click **"Tools"** → **"Zip Push Deploy"**

### Step 3: Upload ZIP

Once you're in Zip Push Deploy page:
1. Drag and drop your ZIP file
2. OR click the upload area to browse
3. Wait for deployment (5-10 minutes)

---

## 🚀 Method 2: Use Azure CLI (FASTER)

Since ZIP creation is slow, use this command-line method:

### Check if ZIP is Ready
```bash
ls -lh azure-clean-deploy.zip
```

### If ZIP Exists, Deploy It
```bash
az webapp deployment source config-zip \
  --resource-group backend_group \
  --name sarees \
  --src azure-clean-deploy.zip \
  --timeout 600
```

### If ZIP Doesn't Exist, Create Source-Only ZIP
```powershell
# This creates a smaller ZIP (no node_modules, no .next)
# Azure will build it for you - takes longer but smaller upload

Compress-Archive -Path app,components,lib,public,supabase,package.json,package-lock.json,next.config.js,server.js,web.config,.deployment -DestinationPath source-only.zip -Force
```

Then deploy:
```bash
az webapp deployment source config-zip \
  --resource-group backend_group \
  --name sarees \
  --src source-only.zip \
  --timeout 600
```

---

## 🚀 Method 3: Direct Kudu ZIP Deploy (NO PORTAL)

You can deploy directly to Kudu using curl or PowerShell:

### Get Deployment Credentials
```bash
az webapp deployment list-publishing-credentials \
  --name sarees \
  --resource-group backend_group \
  --query "{username:publishingUserName, password:publishingPassword}" \
  --output json
```

### Deploy with curl (if ZIP ready)
```bash
# Save credentials from above command
USERNAME="your-username-from-above"
PASSWORD="your-password-from-above"

curl -X POST \
  -u "$USERNAME:$PASSWORD" \
  --data-binary @azure-clean-deploy.zip \
  https://sarees-cbgvfbbactfvhagw.scm.canadacentral-01.azurewebsites.net/api/zipdeploy
```

---

## 🎯 QUICKEST OPTION (Recommended Right Now)

Since we have the built app already, let's try Azure CLI deploy:

```bash
# 1. Check current directory
cd C:\Users\KITS\Documents\newer\virtual-tryon

# 2. Use the existing tar.gz (Azure supports it)
az webapp deploy \
  --resource-group backend_group \
  --name sarees \
  --src-path azure-deploy.tar.gz \
  --type tar \
  --async false \
  --timeout 600

# OR if tar doesn't work, wait for ZIP to finish and use:
az webapp deployment source config-zip \
  --resource-group backend_group \
  --name sarees \
  --src azure-clean-deploy.zip \
  --timeout 600
```

---

## 📍 URLs Reference

- **App URL**: https://sarees-cbgvfbbactfvhagw.canadacentral-01.azurewebsites.net
- **Kudu URL**: https://sarees-cbgvfbbactfvhagw.scm.canadacentral-01.azurewebsites.net
- **Azure Portal**: https://portal.azure.com

---

## 🔍 Check Deployment Status

```bash
# View deployment logs
az webapp log deployment show \
  --name sarees \
  --resource-group backend_group

# Stream runtime logs
az webapp log tail \
  --name sarees \
  --resource-group backend_group

# Check app status
az webapp show \
  --name sarees \
  --resource-group backend_group \
  --query "state"
```

---

## ⚡ After Deployment

### 1. Restart the App
```bash
az webapp restart --name sarees --resource-group backend_group
```

### 2. Run Database Migration
- Go to: https://supabase.com
- SQL Editor → New Query
- Paste: `supabase/migrations/add_pose_keypoints_to_store_images.sql`
- Run it

### 3. Test the App
Visit: https://sarees-cbgvfbbactfvhagw.canadacentral-01.azurewebsites.net

---

## 🐛 If Deployment Fails

### Check Logs
```bash
az webapp log tail --name sarees --resource-group backend_group
```

### Common Issues:
1. **Timeout**: Increase --timeout to 1200 (20 minutes)
2. **Too large**: Use source-only.zip instead
3. **Network error**: Try again or use Azure Portal

### Restart and Try Again
```bash
az webapp restart --name sarees --resource-group backend_group
# Wait 30 seconds
# Try deployment again
```

---

## 📝 Current File Status

Check what's ready:
```bash
ls -lh *.zip *.tar.gz
```

- **azure-deploy.tar.gz** (561MB) - Full deployment with build
- **azure-clean-deploy.zip** - Being created now
- **source-only.zip** - Create if needed (smallest, ~10MB)

---

## ✅ Recommended Action RIGHT NOW

Try deploying the tar.gz that already exists:

```bash
az webapp deploy \
  --resource-group backend_group \
  --name sarees \
  --src-path azure-deploy.tar.gz \
  --type tar \
  --async false
```

If that doesn't work, wait for azure-clean-deploy.zip to finish and use Method 2 above.

---

Generated: $(date)
