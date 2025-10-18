# Virtual Try-On Application

A beautiful, AI-powered virtual try-on solution built with Next.js and FAL AI, optimized for tablets in landscape mode.

## Features

- **AI-Powered Try-On**: Uses FAL AI's fashion-tryon model for realistic virtual try-on
- **Beautiful UI**: Modern, gradient-based design optimized for tablet landscape mode
- **Real-time Processing**: Fast image uploads and processing with loading states
- **Gender Selection**: Support for both male and female models
- **Responsive Design**: Optimized for tablets (1024px+ landscape orientation)
- **Download Results**: Easy download of generated images

## Getting Started

### Prerequisites

- Node.js 18+ installed
- FAL AI API key

### Installation

1. Navigate to the project directory:
```bash
cd virtual-tryon
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Copy `.env.example` to `.env.local`
   - Add your FAL AI API key to `.env.local`:
   ```
   FAL_KEY=your_api_key_here
   ```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Upload Your Photo**: Click on the "Your Photo" section and upload a full-body image
2. **Upload Clothing**: Click on "Clothing Item" and upload the garment you want to try on
3. **Select Gender**: Choose the appropriate gender option (Male/Female)
4. **Try It On**: Click the "✨ Try It On" button to generate the result
5. **View & Download**: Once processed, view the result and download it if needed

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI Service**: FAL AI (easel-ai/fashion-tryon model)
- **Image Handling**: Next.js Image component

## Project Structure

```
virtual-tryon/
├── app/
│   ├── api/
│   │   ├── tryon/       # Virtual try-on API endpoint
│   │   └── upload/      # Image upload API endpoint
│   ├── globals.css      # Global styles
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Home page
├── components/
│   ├── ImageUpload.tsx  # Image upload component
│   └── VirtualTryOn.tsx # Main try-on interface
├── lib/
│   └── fal-client.ts    # FAL AI client configuration
└── public/              # Static assets
```

## API Endpoints

### POST /api/upload
Uploads an image to FAL storage and returns the URL.

**Request**: FormData with `file` field
**Response**: `{ url: string }`

### POST /api/tryon
Processes virtual try-on request.

**Request**:
```json
{
  "full_body_image": "string",
  "clothing_image": "string",
  "gender": "male" | "female"
}
```

**Response**:
```json
{
  "image": {
    "url": "string",
    "width": number,
    "height": number,
    "content_type": "string"
  }
}
```

## Configuration

### Tablet Optimization
The app is optimized for tablets in landscape mode (1024px+ width). The UI uses a 3-column grid layout that displays:
- Left: Person image upload
- Center: Clothing image upload
- Right: Result display

### Styling
Custom Tailwind configuration includes:
- Primary color palette (blues)
- Tablet-specific responsive breakpoints
- Custom animations for loading states
- Touch-friendly button sizes

## Building for Production

```bash
npm run build
npm start
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `FAL_KEY` | FAL AI API key for authentication | Yes |

## Troubleshooting

### Images not uploading
- Check that your FAL_KEY is correctly set in `.env.local`
- Ensure images are in supported formats (PNG, JPG, WEBP)
- Verify image size is under 10MB

### Try-on processing fails
- Ensure both images are uploaded successfully
- Check that the person image shows a full-body view
- Verify the clothing image is clear and well-lit

## License

This project is for demonstration purposes.

## Support

For issues related to the FAL AI API, visit [FAL AI Documentation](https://fal.ai/docs)
