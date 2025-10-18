// Helper to load images from public folder
export interface SampleImage {
  id: string;
  name: string;
  url: string;
  category: 'clothing' | 'models';
}

// You can manually define your sample images here
// Once you add images to public/sample-images/clothing and public/sample-images/models
// update these arrays

export const sampleClothing: SampleImage[] = [
  // Example (uncomment and modify when you add actual images):
  // { id: '1', name: 'Blue Dress', url: '/sample-images/clothing/dress1.jpg', category: 'clothing' },
  // { id: '2', name: 'Red Shirt', url: '/sample-images/clothing/shirt1.jpg', category: 'clothing' },
];

export const sampleModels: SampleImage[] = [
  // Example (uncomment and modify when you add actual images):
  // { id: '1', name: 'Model 1', url: '/sample-images/models/model1.jpg', category: 'models' },
  // { id: '2', name: 'Model 2', url: '/sample-images/models/model2.jpg', category: 'models' },
];

// Default placeholder images using FAL AI examples
export const defaultClothing: SampleImage[] = [
  {
    id: 'default-1',
    name: 'Sample Outfit',
    url: 'https://images.easelai.com/tryon/outfit6.webp',
    category: 'clothing'
  },
];

export const defaultModels: SampleImage[] = [
  {
    id: 'default-1',
    name: 'Sample Model',
    url: 'https://images.easelai.com/tryon/woman.webp',
    category: 'models'
  },
];

export function getClothingImages(): SampleImage[] {
  return sampleClothing.length > 0 ? sampleClothing : defaultClothing;
}

export function getModelImages(): SampleImage[] {
  return sampleModels.length > 0 ? sampleModels : defaultModels;
}
