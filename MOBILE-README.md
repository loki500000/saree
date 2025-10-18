# Mobile Virtual Try-On UI

## Overview

A stunning mobile-first portrait UI for virtual try-on, featuring modern gradients, smooth animations, and an intuitive user experience.

## Design Features

### 🎨 Beautiful UI Elements
- **Gradient Headers**: Violet to fuchsia gradient with glassmorphism effect
- **Modern Cards**: Rounded corners (3xl) with shadow effects
- **Smooth Animations**: Scale, fade, and pulse effects
- **Touch-Optimized**: Large tap targets, gesture-friendly interactions

### 📱 Mobile-First Layout
1. **Large Hero Image Area**: 3:4 aspect ratio for user photo/result
2. **Thumbnail Gallery**: Horizontal scrolling for clothing selection
3. **Model Selector**: Quick-pick models with upload option
4. **Floating Controls**: Context-aware buttons and badges

### 🎯 User Flow

#### Step 1: Select Your Photo
- Upload your own photo (camera/gallery)
- Or choose from sample models
- Large preview fills the screen

#### Step 2: Choose Outfit
- Scroll through clothing thumbnails
- Tap to select
- Selected item shows as floating badge

#### Step 3: Configure & Try-On
- Select gender (Male/Female)
- Tap "✨ Try It On!" button
- Watch animated loading state

#### Step 4: View Results
- Result replaces user photo seamlessly
- Tap result to reveal action buttons
- Download or try different outfits

## Color Scheme

```css
Primary: Violet (#8B5CF6) to Fuchsia (#D946EF)
Background: Violet-100 via Pink-50 to Blue-100
Cards: White with subtle shadows
Text: Gray-800 (headings), Gray-600 (body)
Accents: Violet-600, Fuchsia-600
```

## Adding Your Own Images

### Clothing Images
1. Place images in `public/sample-images/clothing/`
2. Update `lib/image-loader.ts`:

```typescript
export const sampleClothing: SampleImage[] = [
  {
    id: '1',
    name: 'Blue Dress',
    url: '/sample-images/clothing/dress1.jpg',
    category: 'clothing'
  },
  {
    id: '2',
    name: 'Red Shirt',
    url: '/sample-images/clothing/shirt2.jpg',
    category: 'clothing'
  },
  // Add more...
];
```

### Model Images
1. Place images in `public/sample-images/models/`
2. Update `lib/image-loader.ts`:

```typescript
export const sampleModels: SampleImage[] = [
  {
    id: '1',
    name: 'Model 1',
    url: '/sample-images/models/model1.jpg',
    category: 'models'
  },
  {
    id: '2',
    name: 'Model 2',
    url: '/sample-images/models/model2.jpg',
    category: 'models'
  },
  // Add more...
];
```

## Key Components

### MobileVirtualTryOn.tsx
Main component with all logic and UI

**Features:**
- State management for images, gender, loading, errors
- File upload handling
- Gallery selection
- Result display with overlay controls
- Responsive animations

### image-loader.ts
Image management utility

**Functions:**
- `getClothingImages()`: Returns clothing array
- `getModelImages()`: Returns model array
- Fallback to default FAL AI samples

## Interactions

### Touch Gestures
- **Tap**: Select images, buttons
- **Tap & Hold**: Reveal result controls
- **Horizontal Scroll**: Browse galleries
- **Pinch**: Native browser zoom (disabled on buttons)

### Animations
- **Scale**: Active state on buttons (scale-95)
- **Fade In**: New content appearance
- **Pulse**: Loading indicators
- **Spin**: Processing animation

## Responsive Considerations

### Safe Areas
- Header: Sticky with backdrop blur
- Bottom: Safe area padding for notches
- Scrolling: Hidden scrollbars for clean look

### Portrait Optimization
- Full viewport height utilization
- Vertical scrolling for content
- Horizontal scrolling for galleries only

## Best Practices

1. **Image Sizes**
   - Clothing: 512x512 to 1024x1024px
   - Models: 768x1024 to 1024x1536px
   - Format: JPG, PNG, WEBP

2. **Performance**
   - Use Next.js Image component
   - Lazy load off-screen images
   - Optimize images before upload

3. **Accessibility**
   - High contrast ratios
   - Large touch targets (min 44x44px)
   - Clear visual feedback

4. **Error Handling**
   - Friendly error messages
   - Retry mechanisms
   - Fallback states

## Testing on Mobile

### Development
```bash
npm run dev
```

Then access from mobile device:
- Find your local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
- Access: `http://YOUR_IP:3000`
- Or use mobile browser dev tools in Chrome/Safari

### Production
```bash
npm run build
npm start
```

## Customization Tips

### Change Colors
Edit `tailwind.config.ts` primary colors

### Adjust Layout
Modify aspect ratios in MobileVirtualTryOn.tsx:
```typescript
className="aspect-[3/4]" // Change to aspect-[9/16], etc.
```

### Add More Features
- Share results to social media
- Save favorites
- Compare before/after
- Multiple outfit tries at once

## Performance Metrics

- First Load: < 2s
- Image Upload: < 1s
- Try-On Processing: 30-60s (AI model)
- Smooth 60fps animations

---

Built with Next.js 15, TypeScript, Tailwind CSS, and FAL AI
