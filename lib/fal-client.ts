import { fal } from "@fal-ai/client";

// Configure FAL client
const falKey = process.env.FAL_KEY || process.env.NEXT_PUBLIC_FAL_KEY;

if (!falKey) {
  console.warn("FAL_KEY is not configured. FAL AI features will not work.");
}

fal.config({
  credentials: falKey,
  requestMiddleware: async (request) => {
    // Increase timeout for FAL AI requests to 60 seconds
    // Note: timeout configuration is handled by the underlying HTTP client
    return request;
  },
});

export interface TryOnInput {
  full_body_image: string;
  clothing_image: string;
  gender?: "male" | "female";
}

export interface TryOnResult {
  image: {
    url: string;
    content_type: string;
    file_name: string;
    file_size: number;
    width: number;
    height: number;
  };
}

export async function runVirtualTryOn(input: TryOnInput): Promise<TryOnResult> {
  if (!falKey) {
    throw new Error("FAL_KEY is not configured. Please set FAL_KEY in your environment variables.");
  }

  try {
    console.log("Starting virtual try-on with FAL AI...");

    const result = await fal.subscribe("easel-ai/fashion-tryon", {
      input: {
        full_body_image: {
          url: input.full_body_image,
          width: 0,
          height: 0,
        },
        clothing_image: {
          url: input.clothing_image,
          width: 0,
          height: 0,
        },
        gender: input.gender || "female",
      },
      logs: true,
      onQueueUpdate: (update) => {
        console.log("FAL Queue Update:", update.status);
        if (update.status === "IN_PROGRESS") {
          update.logs?.map((log) => log.message).forEach(console.log);
        }
      },
    });

    console.log("Virtual try-on completed successfully");
    return result.data as TryOnResult;
  } catch (error: any) {
    console.error("Virtual try-on error:", error);
    console.error("Error details:", {
      message: error.message,
      statusCode: error.statusCode,
      response: error.response,
    });

    // Provide more specific error message
    if (error.statusCode === 401 || error.statusCode === 403) {
      throw new Error("Invalid FAL AI API key");
    } else if (error.statusCode === 429) {
      throw new Error("FAL AI rate limit exceeded");
    } else if (error.statusCode === 400) {
      throw new Error("Invalid image URLs or parameters");
    }

    throw error;
  }
}

export async function uploadImageToFal(file: File): Promise<string> {
  if (!falKey) {
    throw new Error("FAL_KEY is not configured. Please set FAL_KEY in your environment variables.");
  }

  try {
    console.log("Uploading image to FAL storage:", {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    const url = await fal.storage.upload(file);

    console.log("Image uploaded successfully:", url);
    return url;
  } catch (error: any) {
    console.error("Image upload error:", error);
    console.error("Upload error details:", {
      message: error.message,
      statusCode: error.statusCode,
      response: error.response,
    });

    // Provide more specific error message
    if (error.statusCode === 401 || error.statusCode === 403) {
      throw new Error("Invalid FAL AI API key");
    } else if (error.statusCode === 429) {
      throw new Error("Rate limit exceeded");
    }

    throw error;
  }
}
