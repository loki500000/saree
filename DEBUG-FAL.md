# Debug FAL AI Connection

## Current Status
- FAL API Key: Configured in `.env.local`
- FAL Client: Installed (`@fal-ai/client@1.6.2`)
- Error: "Internal Server Error" when trying virtual try-on

## Steps to Debug

### 1. Check Server Console Output

When you try the virtual try-on, check the **terminal where Next.js is running** for detailed error messages.

The updated code now logs:
- FAL AI Error details
- Error message, stack trace, and response
- Automatic credit refund if FAL fails

### 2. Common FAL AI Issues

#### A. Invalid API Key
**Symptoms:** Unauthorized or Authentication errors

**Fix:**
1. Go to https://fal.ai/dashboard
2. Check if your API key is valid
3. Generate a new key if needed
4. Update `.env.local`:
```bash
FAL_KEY=your-new-api-key
```
5. Restart the Next.js dev server

#### B. Model Name Issue
**Symptoms:** Model not found errors

The current model is: `easel-ai/fashion-tryon`

**Check if model exists:**
- Go to https://fal.ai/models
- Search for "fashion-tryon" or "virtual try-on"
- Verify the exact model name

**Alternative models to try:**
```typescript
// In app/api/tryon/route.ts, try these models:
fal.subscribe("fal-ai/virtual-try-on", { ... })
// or
fal.subscribe("fal-ai/idm-vton", { ... })
```

#### C. Image Format Issues
**Symptoms:** Invalid input errors

FAL AI expects:
- Image URLs or base64 encoded images
- Supported formats: JPEG, PNG, WebP
- Max file size: Usually 10MB

**Check image URLs:**
- Make sure they're publicly accessible
- For Supabase Storage, ensure they're public URLs
- Base64 images should be properly formatted

### 3. Test FAL Connection Directly

Create a simple test file to verify FAL works:

```typescript
// test-fal.ts
import { fal } from "@fal-ai/client";

fal.config({
  credentials: "your-api-key-here",
});

async function testFal() {
  try {
    const result = await fal.subscribe("easel-ai/fashion-tryon", {
      input: {
        full_body_image: "https://example.com/person.jpg",
        clothing_image: "https://example.com/clothing.jpg",
        gender: "female",
      },
    });
    console.log("Success:", result);
  } catch (error) {
    console.error("Error:", error);
  }
}

testFal();
```

Run it:
```bash
npx tsx test-fal.ts
```

### 4. Check Environment Variables

Verify FAL_KEY is loaded:

```typescript
// Add this temporarily to app/api/tryon/route.ts
console.log("FAL_KEY exists:", !!process.env.FAL_KEY);
console.log("FAL_KEY length:", process.env.FAL_KEY?.length);
```

### 5. Network/Firewall Issues

FAL AI might be blocked:
- Check if you're behind a corporate firewall
- Try using a VPN
- Check if fal.ai is accessible from your location

### 6. Check FAL Dashboard

1. Go to https://fal.ai/dashboard
2. Check:
   - API key status
   - Usage limits
   - Any service status issues
   - Account balance (if applicable)

## Quick Fix Attempts

### Fix 1: Restart Dev Server
```bash
# Stop the dev server (Ctrl+C)
npm run dev
```

### Fix 2: Clear Next.js Cache
```bash
rm -rf .next
npm run dev
```

### Fix 3: Verify Model Name
The model might have changed. Check FAL docs:
- https://fal.ai/models/easel-ai/fashion-tryon

### Fix 4: Update FAL Client
```bash
npm install @fal-ai/client@latest
```

## What to Look For in Console

After trying virtual try-on, you should see one of these errors:

1. **"Unauthorized"** → API key issue
2. **"Model not found"** → Wrong model name
3. **"Invalid input"** → Image format/URL issue
4. **Network error** → Firewall/connectivity issue
5. **Rate limit** → Too many requests

The console will now show the exact error with the updated logging!

## Next Steps

1. Try virtual try-on again
2. Check the **terminal console** for detailed FAL error
3. Share the error message for more specific help
