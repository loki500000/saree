# Azure SSH Deployment Guide

## 📍 Where to Clone on Azure App Service

### Step 1: Check Current Directory
```bash
pwd
ls -la
```

You should be in `/home` or `/home/site`

### Step 2: Navigate to Deployment Directory
```bash
cd /home/site/wwwroot
```

This is where your app runs from.

### Step 3: Backup Existing Files (if any)
```bash
# Check what's there
ls -la

# Backup if needed
cd /home/site
mv wwwroot wwwroot-backup-$(date +%Y%m%d)
mkdir wwwroot
cd wwwroot
```

### Step 4: Clone Your Repository
```bash
# Make sure you're in /home/site/wwwroot
cd /home/site/wwwroot

# Clone the repository
git clone https://github.com/loki500000/saree.git .

# Note: The dot (.) at the end clones into current directory
```

### Step 5: Install Dependencies
```bash
# Check Node version
node --version
npm --version

# Install dependencies
npm install --production
```

### Step 6: Build the Application
```bash
# Build Next.js app
npm run build
```

### Step 7: Set Environment Variables (if not already set)

Check if environment variables are set:
```bash
echo $FAL_KEY
echo $NEXT_PUBLIC_SUPABASE_URL
```

If empty, you need to set them in Azure Portal (not via SSH):
- They're already set in your Azure App Settings
- App will read them automatically

### Step 8: Restart the App
```bash
# You can't restart from SSH, use Azure CLI from your local machine:
# az webapp restart --name sarees --resource-group backend_group

# OR just exit SSH and the app will restart automatically
exit
```

---

## 🚀 Complete SSH Deployment Commands

Copy and paste these commands one by one:

```bash
# 1. Navigate to app directory
cd /home/site/wwwroot

# 2. Clear existing files (if any)
rm -rf *
rm -rf .[!.]*

# 3. Clone repository
git clone https://github.com/loki500000/saree.git .

# 4. Install dependencies
npm ci --production

# 5. Build the app
npm run build

# 6. Check if build succeeded
ls -la .next/

# 7. Exit (app will restart automatically)
exit
```

---

## ⚠️ IMPORTANT: Fix Git History First!

Before cloning, you need to remove the large file from Git history:

### On Your Local Machine (Windows):
```bash
# Remove the large file from git history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch virtual-tryon.zip" \
  --prune-empty --tag-name-filter cat -- --all

# Force push
git push origin master --force

# Clean up
git for-each-ref --format='delete %(refname)' refs/original | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### OR Use BFG Repo-Cleaner (Easier):
```bash
# Download BFG from: https://rtyley.github.io/bfg-repo-cleaner/
# Then run:
java -jar bfg.jar --delete-files virtual-tryon.zip
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push origin master --force
```

---

## 🎯 Alternative: Skip Git Clone (Faster)

Since you have build locally, just copy the built files:

### On Azure SSH:
```bash
cd /home/site/wwwroot

# Create a simple placeholder (we'll upload files)
touch index.html
```

### On Your Local Machine:
```bash
# Use Azure CLI to upload directly
az webapp deployment source config-zip \
  --resource-group backend_group \
  --name sarees \
  --src azure-clean-deploy.zip \
  --timeout 1200
```

This is faster than git clone!

---

## 📁 Azure App Service Directory Structure

```
/home/
├── site/
│   ├── wwwroot/           <- Your app lives here
│   │   ├── .next/         <- Next.js build output
│   │   ├── node_modules/  <- Dependencies
│   │   ├── app/           <- Your source code
│   │   ├── components/
│   │   ├── lib/
│   │   ├── public/
│   │   ├── server.js      <- Entry point
│   │   ├── package.json
│   │   └── ...
│   ├── deployments/       <- Deployment history
│   └── logs/              <- App logs
├── LogFiles/              <- System logs
└── data/                  <- Persistent storage
```

---

## 🔍 Useful Azure SSH Commands

### Check App Status
```bash
# Check if Node.js is running
ps aux | grep node

# Check app directory
cd /home/site/wwwroot
ls -la

# Check logs
cd /home/LogFiles
tail -f application.log

# Check disk space
df -h

# Check memory
free -m
```

### View Environment Variables
```bash
env | grep -E 'FAL|SUPABASE|PORT'
```

### Test the App
```bash
# Check if server.js exists
cat /home/site/wwwroot/server.js

# Check if Next.js build exists
ls -la /home/site/wwwroot/.next/

# Check package.json
cat /home/site/wwwroot/package.json
```

---

## 🐛 Troubleshooting

### If "Permission Denied" on wwwroot
```bash
# Check permissions
ls -la /home/site/

# If needed, work in a different directory
cd /home
mkdir myapp
cd myapp
git clone https://github.com/loki500000/saree.git .
npm install
npm run build

# Then manually copy to wwwroot
cp -r * /home/site/wwwroot/
```

### If Git Clone Fails (Large File)
The large file issue will prevent cloning. Options:
1. Fix git history first (see above)
2. Use Azure CLI upload instead (recommended)
3. Use Kudu Zip Push Deploy

### If Build Fails
```bash
# Check Node version (should be 20.x)
node --version

# If wrong version, can't change it in SSH
# Must configure in Azure Portal -> Configuration -> General Settings

# Check build logs
npm run build 2>&1 | tee build.log
cat build.log
```

---

## ✅ Recommended Approach

Since you have SSH access, here's the BEST approach:

### Option 1: Use Azure CLI (No SSH Needed)
From your local Windows machine:
```bash
az webapp deployment source config-zip \
  --resource-group backend_group \
  --name sarees \
  --src azure-clean-deploy.zip \
  --timeout 1200
```

### Option 2: Git Clone (After Fixing History)
1. Fix git history to remove large file
2. Push to GitHub
3. SSH to Azure:
   ```bash
   cd /home/site/wwwroot
   git clone https://github.com/loki500000/saree.git .
   npm ci
   npm run build
   ```

### Option 3: Manual File Copy via Kudu
1. Use Kudu's file manager
2. Upload files manually
3. Or use Zip Push Deploy

**FASTEST RIGHT NOW: Use Azure CLI with the ZIP file you already have!**

---

Generated: $(date)
