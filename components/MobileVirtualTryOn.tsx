"use client";

import { useState, useRef, ChangeEvent, useEffect } from "react";
import Image from "next/image";
import { detectPose, comparePoses, isPoseDetectionSupported, PoseKeypoints } from "@/lib/poseDetection";

interface GalleryImage {
  id: string;
  url: string;
  type: 'clothing';
  name: string | null;
  main_code?: string;
  sub_variant?: string;
}

interface Store {
  id: string;
  name: string;
  credits: number;
}

export default function MobileVirtualTryOn() {
  const [personImageUrl, setPersonImageUrl] = useState<string>("");
  const [clothingImageUrl, setClothingImageUrl] = useState<string>("");
  const [gender, setGender] = useState<"male" | "female">("female");
  const [resultImageUrl, setResultImageUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [showClothingGallery, setShowClothingGallery] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [clothingImages, setClothingImages] = useState<GalleryImage[]>([]);
  const [store, setStore] = useState<Store | null>(null);
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Pose detection state
  const [userPose, setUserPose] = useState<PoseKeypoints | null>(null);
  const [poseTolerance, setPositTolerance] = useState<number>(30);
  const [poseMatched, setPoseMatched] = useState<boolean>(true);
  const [poseChecking, setPoseChecking] = useState<boolean>(false);
  const [poseDetectionAvailable] = useState<boolean>(isPoseDetectionSupported());

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const resultContainerRef = useRef<HTMLDivElement>(null);

  // Fetch gallery images and store info on mount
  useEffect(() => {
    fetchGalleryImages();
    fetchUserAndStore();
    fetchPoseTolerance();
  }, []);

  const fetchPoseTolerance = async () => {
    try {
      const res = await fetch('/api/settings', {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.pose_tolerance !== undefined) {
        setPositTolerance(data.pose_tolerance);
        console.log('Fetched pose tolerance:', data.pose_tolerance);
      }
    } catch (error) {
      console.error('Failed to fetch pose tolerance:', error);
    }
  };

  const fetchGalleryImages = async () => {
    try {
      const res = await fetch('/api/gallery/images?type=clothing', {
        credentials: 'include'
      });
      const data = await res.json();
      setClothingImages(data.images || []);
    } catch (error) {
      console.error('Failed to fetch gallery images:', error);
    }
  };

  const fetchUserAndStore = async () => {
    try {
      const userRes = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      const userData = await userRes.json();
      setUser(userData.user);

      if (userData.user.store_id) {
        const storeRes = await fetch(`/api/admin/stores/${userData.user.store_id}`, {
          credentials: 'include'
        });
        const storeData = await storeRes.json();
        setStore(storeData.store);
      }
    } catch (error) {
      console.error('Failed to fetch user/store:', error);
    }
  };

  const handleFileUpload = async (file: File) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const imageUrl = reader.result as string;
      setPersonImageUrl(imageUrl);

      // Detect pose from user's photo if pose detection is available
      if (poseDetectionAvailable) {
        try {
          setPoseChecking(true);
          const pose = await detectPose(imageUrl);
          setUserPose(pose);
          console.log('User pose detected:', pose ? 'success' : 'failed');
        } catch (error) {
          console.error('Error detecting user pose:', error);
          setUserPose(null);
        } finally {
          setPoseChecking(false);
        }
      }
    };
    reader.readAsDataURL(file);

    // Upload to FAL storage with retry logic
    let uploadAttempts = 0;
    const maxAttempts = 3;

    while (uploadAttempts < maxAttempts) {
      try {
        uploadAttempts++;
        console.log(`Upload attempt ${uploadAttempts}/${maxAttempts}`);

        const formData = new FormData();
        formData.append("file", file);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const response = await fetch("/api/upload", {
          method: "POST",
          credentials: 'include',
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Upload failed");
        }

        const data = await response.json();
        setPersonImageUrl(data.url);

        // Re-detect pose with the uploaded URL if needed
        if (poseDetectionAvailable && !userPose) {
          try {
            const pose = await detectPose(data.url);
            setUserPose(pose);
          } catch (error) {
            console.error('Error detecting pose from uploaded URL:', error);
          }
        }

        // Success - break the loop
        break;
      } catch (error: any) {
        console.error(`Upload error (attempt ${uploadAttempts}):`, error);

        if (uploadAttempts >= maxAttempts) {
          // All attempts failed
          if (error.name === 'AbortError') {
            setError("Upload timed out. Please check your internet connection and try again.");
          } else {
            setError(error.message || "Failed to upload image. Please try again.");
          }
        } else {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
      // Reset input value to allow selecting the same file again
      e.target.value = '';
    }
  };

  const selectClothingImage = async (image: GalleryImage) => {
    setClothingImageUrl(image.url);
    setShowClothingGallery(false);

    // Check pose matching if user pose is available
    if (poseDetectionAvailable && userPose) {
      try {
        setPoseChecking(true);
        const clothingPose = await detectPose(image.url);

        if (clothingPose) {
          const difference = comparePoses(userPose, clothingPose);
          console.log(`Pose difference: ${difference}% (tolerance: ${poseTolerance}%)`);

          if (difference > poseTolerance) {
            setPoseMatched(false);
            console.log('Pose mismatch - Try-On blocked');
          } else {
            setPoseMatched(true);
            console.log('Pose match - Try-On allowed');
          }
        } else {
          // If clothing pose detection fails, allow try-on
          console.log('Clothing pose detection failed - allowing try-on');
          setPoseMatched(true);
        }
      } catch (error) {
        console.error('Error checking pose match:', error);
        // On error, allow try-on
        setPoseMatched(true);
      } finally {
        setPoseChecking(false);
      }
    } else {
      // If user pose not available, allow try-on
      setPoseMatched(true);
    }
  };

  const handleTryOn = async () => {
    console.log('Using pose tolerance for try-on (MobileVirtualTryOn):', poseTolerance);
    if (!personImageUrl || !clothingImageUrl) {
      setError("Please select both images");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/tryon", {
        method: "POST",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_body_image: personImageUrl,
          clothing_image: clothingImageUrl,
          gender,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process try-on");
      }

      const result = await response.json();
      if (result.image && result.image.url) {
        setImageLoading(true);
        setResultImageUrl(result.image.url);
        // Update credits
        if (result.credits_remaining !== undefined) {
          setStore(prev => prev ? { ...prev, credits: result.credits_remaining } : null);
        }
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err: any) {
      console.error("Try-on error:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResultImageUrl("");
    setClothingImageUrl("");
    setError("");
    setImageLoading(false);
    setPoseMatched(true);
  };

  const handleNewTryOn = () => {
    setPersonImageUrl("");
    setClothingImageUrl("");
    setResultImageUrl("");
    setError("");
    setShowClothingGallery(false);
    setImageLoading(false);
    setUserPose(null);
    setPoseMatched(true);
  };

  const handleShare = async () => {
    if (!resultImageUrl) return;

    try {
      if (navigator.share) {
        // Fetch the image and convert to blob
        const response = await fetch(resultImageUrl);
        const blob = await response.blob();
        const file = new File([blob], "tryon-result.png", { type: blob.type });

        await navigator.share({
          title: "AI pattu - Virtual Try-On",
          text: "Check out my virtual try-on!",
          files: [file],
        });
      } else {
        // Fallback: Copy link to clipboard
        await navigator.clipboard.writeText(resultImageUrl);
        alert("Link copied to clipboard!");
      }
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  const toggleFullscreen = async () => {
    if (!resultContainerRef.current) return;

    try {
      if (!isFullscreen) {
        // Enter fullscreen
        if (resultContainerRef.current.requestFullscreen) {
          await resultContainerRef.current.requestFullscreen();
        } else if ((resultContainerRef.current as any).webkitRequestFullscreen) {
          await (resultContainerRef.current as any).webkitRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-violet-100 via-pink-50 to-blue-100 pb-safe">
      {/* Camera Input */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Gallery Input */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Main Content - Responsive for all screen sizes */}
      <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-3 sm:space-y-4 md:space-y-6 max-w-2xl lg:max-w-7xl mx-auto">
        {/* Header - Responsive */}
        <div className="text-center mb-4 sm:mb-6 lg:mb-8 relative">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-violet-600 via-fuchsia-600 to-purple-600 bg-clip-text text-transparent">
            Virtual Try-On
          </h1>

          {/* Credits Display - Positioned in top-left */}
          {store && (
            <div className="absolute top-0 left-0 p-2 sm:p-3 rounded-lg bg-white/90 shadow-lg border border-violet-100">
              <div className="text-left">
                <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Credits</p>
                <p className="text-lg sm:text-2xl font-bold text-violet-600">{store.credits}</p>
              </div>
            </div>
          )}

          {/* Logout button - Positioned in top-right */}
          <button
            onClick={handleLogout}
            className="absolute top-0 right-0 p-2 sm:p-3.5 rounded-lg bg-white/80 hover:bg-red-50 text-red-600 shadow-lg transition-colors active:scale-95 border border-red-100"
            title="Logout"
          >
            <svg className="w-5 h-5 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </button>
        </div>

        {/* Large User Image Display / Result - Desktop uses grid layout */}
        <div className="relative lg:grid lg:grid-cols-3 lg:gap-6">
          {/* Main image container - takes full width on mobile, left column on desktop */}
          <div className="lg:col-span-2 aspect-[3/4] lg:aspect-auto max-h-[65vh] sm:max-h-[70vh] lg:max-h-[80vh] lg:min-h-[600px] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-white to-violet-50 border-2 sm:border-4 border-white relative">
            {loading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-violet-400 to-fuchsia-400 z-20">
                <div className="relative mb-6">
                  <div className="w-24 h-24 border-8 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl">🎨</span>
                  </div>
                </div>
                <p className="text-white text-xl font-bold animate-pulse">Creating Magic...</p>
                <p className="text-violet-100 text-sm mt-2">30-60 seconds</p>
              </div>
            ) : resultImageUrl ? (
              <div ref={resultContainerRef} className="relative w-full h-full bg-gray-100">
                {imageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
                      <p className="text-sm text-gray-600">Loading result...</p>
                    </div>
                  </div>
                )}
                <Image
                  src={resultImageUrl}
                  alt="Result"
                  fill
                  className="object-contain"
                  onLoadingComplete={() => setImageLoading(false)}
                  onError={() => {
                    setImageLoading(false);
                    setError("Failed to load result image. Please try again.");
                    setResultImageUrl("");
                  }}
                  priority
                  unoptimized
                />
                {/* Fullscreen Button */}
                <div className="absolute top-4 right-4">
                  <button
                    onClick={toggleFullscreen}
                    className="bg-white/90 backdrop-blur-sm p-3 sm:p-4 rounded-full shadow-xl active:scale-95 transition-transform"
                  >
                    {isFullscreen ? (
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ) : personImageUrl ? (
              <div className="relative w-full h-full">
                <Image
                  src={personImageUrl}
                  alt="Your photo"
                  fill
                  className="object-contain"
                />
                <div className="absolute top-4 right-4">
                  <button
                    onClick={() => {
                      setPersonImageUrl("");
                      setClothingImageUrl("");
                      setResultImageUrl("");
                      setError("");
                    }}
                    className="bg-white/90 backdrop-blur-sm p-4 rounded-full shadow-xl active:scale-95 transition-transform"
                  >
                    <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 sm:gap-6 md:gap-8 lg:gap-10 px-4 sm:px-6 md:px-8 lg:px-12 py-6">
                {/* Animated Icon */}
                <div className="relative">
                  <div className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl animate-bounce">📸</div>
                </div>

                {/* Header Text */}
                <div className="text-center space-y-2 sm:space-y-3">
                  <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                    Get Started
                  </p>
                </div>

                {/* Dual Buttons - Responsive Layout */}
                <div className="w-full space-y-3 sm:space-y-4 max-w-sm lg:max-w-md">
                  {/* Camera Button - Hidden on desktop (no camera), shown on mobile */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      cameraInputRef.current?.click();
                    }}
                    className="lg:hidden w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white py-4 sm:py-5 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg shadow-xl hover:shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2 sm:gap-3"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Take Photo
                  </button>

                  {/* Upload Button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      galleryInputRef.current?.click();
                    }}
                    className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white py-5 sm:py-6 lg:py-7 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg lg:text-xl shadow-2xl hover:shadow-3xl active:scale-95 transition-all flex items-center justify-center gap-3 sm:gap-4 group"
                  >
                    <svg className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 flex-shrink-0 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="hidden lg:inline">Upload Your Photo</span>
                    <span className="lg:hidden">Choose from Gallery</span>
                  </button>

                  {/* Desktop: Additional Camera Option */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      cameraInputRef.current?.click();
                    }}
                    className="hidden lg:flex w-full bg-white text-violet-600 py-5 sm:py-6 lg:py-7 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg lg:text-xl shadow-xl hover:shadow-2xl border-3 border-violet-300 hover:border-violet-400 active:scale-95 transition-all items-center justify-center gap-3 sm:gap-4 group"
                  >
                    <svg className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 flex-shrink-0 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Use Webcam
                  </button>
                </div>

                {/* Helper Text */}
                <div className="hidden md:flex items-center gap-2 text-xs sm:text-sm text-gray-500 bg-violet-50 px-4 sm:px-6 py-2 sm:py-3 rounded-full">
                  <svg className="w-4 h-4 text-violet-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>Best results with full-body photos in good lighting</span>
                </div>
              </div>
            )}
          </div>

          {/* Floating Selected Clothing Badge - Hidden on desktop (shows in sidebar) */}
          {clothingImageUrl && !resultImageUrl && !loading && (
            <div className="lg:hidden absolute -bottom-3 sm:-bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-xl sm:rounded-2xl shadow-2xl p-1.5 sm:p-2 flex items-center gap-2 sm:gap-3 animate-fadeIn border-2 border-violet-200 max-w-[90%]">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl overflow-hidden relative flex-shrink-0">
                <Image src={clothingImageUrl} alt="Selected" fill className="object-cover" />
              </div>
              <div className="pr-1 sm:pr-2 min-w-0">
                <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Selected Outfit</p>
                <p className="text-xs sm:text-sm font-bold text-violet-600 truncate">Ready to try on</p>
              </div>
            </div>
          )}

          {/* Desktop Sidebar - Controls and Clothing Selection */}
          <div className="hidden lg:flex lg:col-span-1 lg:flex-col lg:gap-6">
            {/* Welcome Card - Shows when no image uploaded */}
            {!personImageUrl && (
              <div className="bg-white rounded-2xl sm:rounded-3xl p-6 lg:p-8 shadow-xl h-full flex flex-col justify-center space-y-6 lg:space-y-8">
                <div className="text-center space-y-3 lg:space-y-4">
                  <div className="text-5xl lg:text-6xl">👋</div>
                  <h3 className="text-2xl lg:text-3xl font-bold text-gray-800">Welcome!</h3>
                  <p className="text-gray-600 text-sm lg:text-base leading-relaxed">
                    Experience AI-powered virtual try-on. Upload your photo to get started!
                  </p>
                </div>

                {/* Steps */}
                <div className="space-y-4 lg:space-y-5">
                  <div className="flex gap-3 lg:gap-4">
                    <div className="flex-shrink-0 w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-sm lg:text-base">1</div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm lg:text-base">Upload Photo</p>
                      <p className="text-xs lg:text-sm text-gray-600">Full-body image works best</p>
                    </div>
                  </div>
                  <div className="flex gap-3 lg:gap-4">
                    <div className="flex-shrink-0 w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-sm lg:text-base">2</div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm lg:text-base">Choose Outfit</p>
                      <p className="text-xs lg:text-sm text-gray-600">Select from our collection</p>
                    </div>
                  </div>
                  <div className="flex gap-3 lg:gap-4">
                    <div className="flex-shrink-0 w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-sm lg:text-base">3</div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm lg:text-base">See the Magic</p>
                      <p className="text-xs lg:text-sm text-gray-600">AI generates your try-on</p>
                    </div>
                  </div>
                </div>

                {/* Decorative Element */}
                <div className="pt-4 lg:pt-6 border-t border-gray-100">
                  <div className="flex items-center justify-center gap-2 text-xs lg:text-sm text-gray-500">
                    <svg className="w-4 h-4 lg:w-5 lg:h-5 text-violet-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span>Powered by AI Technology</span>
                  </div>
                </div>
              </div>
            )}

            {/* Result Action Buttons - Desktop Version */}
            {resultImageUrl && (
              <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xl space-y-2 sm:space-y-3 animate-fadeIn">
                <div className="flex flex-col gap-2 sm:gap-3">
                  <button
                    onClick={handleReset}
                    className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white py-3 sm:py-4 md:py-5 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-1.5 sm:gap-2"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span>Try Different Outfit</span>
                  </button>
                  <button
                    onClick={handleShare}
                    className="w-full bg-violet-100 text-violet-600 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Share
                  </button>
                </div>
                <button
                  onClick={handleNewTryOn}
                  className="w-full text-center text-violet-600 font-semibold text-xs sm:text-sm py-2 active:scale-95 transition-transform"
                >
                  Start Over
                </button>
              </div>
            )}

            {/* Clothing Gallery & Controls - Desktop Version */}
            {personImageUrl && !resultImageUrl && (
              <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xl flex-1 overflow-y-auto">
                {!clothingImageUrl ? (
                  <div className="space-y-3 sm:space-y-4">
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
                      <span className="text-xl sm:text-2xl">👕</span>
                      Choose an Outfit
                    </h3>

                    {/* Search Bar */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search by code..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                      />
                      <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      {clothingImages.length > 0 ? (
                        clothingImages
                          .filter(image => {
                            const searchTerm = searchQuery.toLowerCase();
                            const variantCode = `${image.main_code || ''}${image.sub_variant || ''}`.toLowerCase();
                            const imageName = (image.name || '').toLowerCase();
                            return variantCode.includes(searchTerm) || imageName.includes(searchTerm);
                          })
                          .map((image) => (
                          <button
                            key={image.id}
                            onClick={() => selectClothingImage(image)}
                            className="aspect-square rounded-2xl overflow-hidden shadow-lg active:scale-95 transition-all border-4 border-transparent hover:border-violet-400 relative"
                          >
                            <Image
                              src={image.url}
                              alt={image.name || 'Clothing'}
                              width={200}
                              height={200}
                              className="w-full h-full object-cover"
                              unoptimized
                            />
                            {/* Variant Badge */}
                            {image.main_code && image.sub_variant && (
                              <div className="absolute top-2 left-2 px-2 py-1 bg-violet-600 text-white text-xs font-bold rounded">
                                {image.main_code}{image.sub_variant}
                              </div>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="col-span-2 text-center py-8 text-gray-500">
                          <p className="mb-2">No clothing items available</p>
                          <p className="text-xs">Ask your store admin to upload some!</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 sm:space-y-5 animate-fadeIn">
                    {/* Selected Clothing Preview */}
                    <div className="aspect-square rounded-2xl overflow-hidden shadow-lg border-4 border-violet-400">
                      <Image
                        src={clothingImageUrl}
                        alt="Selected outfit"
                        width={400}
                        height={400}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Gender Selection */}
                    <div>
                      <label className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4 block flex items-center gap-2">
                        <span className="text-xl sm:text-2xl">👤</span>
                        Select Gender
                      </label>
                      <div className="flex flex-col gap-2 sm:gap-3">
                        <button
                          onClick={() => setGender("female")}
                          className={`w-full py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base transition-all shadow-lg ${
                            gender === "female"
                              ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white scale-105"
                              : "bg-gray-100 text-gray-600 active:scale-95 hover:bg-gray-200"
                          }`}
                        >
                          <span className="text-base sm:text-lg mr-1.5 sm:mr-2">👩</span>
                          Female
                        </button>
                        <button
                          onClick={() => setGender("male")}
                          className={`w-full py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base transition-all shadow-lg ${
                            gender === "male"
                              ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white scale-105"
                              : "bg-gray-100 text-gray-600 active:scale-95 hover:bg-gray-200"
                          }`}
                        >
                          <span className="text-base sm:text-lg mr-1.5 sm:mr-2">👨</span>
                          Male
                        </button>
                      </div>
                    </div>

                    {/* Pose Warning Message */}
                    {poseChecking && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-700 text-sm flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span>Checking pose match...</span>
                      </div>
                    )}

                    {!poseMatched && !poseChecking && (
                      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 text-red-700 font-semibold text-sm flex items-start gap-2">
                        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span>⚠️ Image not matched</span>
                      </div>
                    )}

                    {/* Try-On Button */}
                    <button
                      onClick={handleTryOn}
                      disabled={loading || !poseMatched || poseChecking}
                      className="w-full py-5 sm:py-6 rounded-xl sm:rounded-2xl font-bold text-lg sm:text-xl text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-2xl active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed hover:shadow-3xl"
                    >
                      <span className="text-xl sm:text-2xl mr-2">✨</span>
                      Try It On!
                    </button>

                    {/* Change Outfit Link */}
                    <button
                      onClick={() => setClothingImageUrl("")}
                      className="w-full text-center text-violet-600 font-semibold text-xs sm:text-sm active:scale-95 transition-transform hover:text-violet-700"
                    >
                      ← Change Outfit
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Result Action Buttons - Mobile/Tablet Only */}
        {resultImageUrl && (
          <div className="lg:hidden bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xl space-y-2 sm:space-y-3 animate-fadeIn">
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={handleReset}
                className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white py-3 sm:py-4 md:py-5 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-1.5 sm:gap-2"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="truncate">Try Different Outfit</span>
              </button>
              <button
                onClick={handleShare}
                className="bg-violet-100 text-violet-600 p-3 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl font-bold shadow-lg active:scale-95 transition-transform"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            </div>
            <button
              onClick={handleNewTryOn}
              className="w-full text-center text-violet-600 font-semibold text-xs sm:text-sm py-2 active:scale-95 transition-transform"
            >
              Start Over
            </button>
          </div>
        )}

        {/* Clothing Gallery OR Gender Selection & Try-On - Mobile/Tablet Only */}
        {personImageUrl && !resultImageUrl && (
          <div className="lg:hidden bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xl">
            {!clothingImageUrl ? (
              // Show clothing gallery when no outfit is selected
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
                  <span className="text-xl sm:text-2xl">👕</span>
                  Choose an Outfit
                </h3>

                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                  />
                  <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {clothingImages.length > 0 ? (
                    clothingImages
                      .filter(image => {
                        const searchTerm = searchQuery.toLowerCase();
                        const variantCode = `${image.main_code || ''}${image.sub_variant || ''}`.toLowerCase();
                        const imageName = (image.name || '').toLowerCase();
                        return variantCode.includes(searchTerm) || imageName.includes(searchTerm);
                      })
                      .map((image) => (
                      <button
                        key={image.id}
                        onClick={() => selectClothingImage(image)}
                        className="aspect-square rounded-2xl overflow-hidden shadow-lg active:scale-95 transition-all border-4 border-transparent relative"
                      >
                        <Image
                          src={image.url}
                          alt={image.name || 'Clothing'}
                          width={200}
                          height={200}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                        {/* Variant Badge */}
                        {image.main_code && image.sub_variant && (
                          <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-violet-600 text-white text-[10px] font-bold rounded">
                            {image.main_code}{image.sub_variant}
                          </div>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="col-span-3 text-center py-8 text-gray-500">
                      <p className="mb-2">No clothing items available</p>
                      <p className="text-xs">Ask your store admin to upload some!</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Show gender selection and try-on button when outfit is selected
              <div className="space-y-4 sm:space-y-5 animate-fadeIn">
                {/* Gender Selection */}
                <div>
                  <label className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4 block flex items-center gap-2">
                    <span className="text-xl sm:text-2xl">👤</span>
                    Select Gender
                  </label>
                  <div className="flex gap-2 sm:gap-3">
                    <button
                      onClick={() => setGender("female")}
                      className={`flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base transition-all shadow-lg ${
                        gender === "female"
                          ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white scale-105"
                          : "bg-gray-100 text-gray-600 active:scale-95"
                      }`}
                    >
                      <span className="text-base sm:text-lg mr-1.5 sm:mr-2">👩</span>
                      Female
                    </button>
                    <button
                      onClick={() => setGender("male")}
                      className={`flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base transition-all shadow-lg ${
                        gender === "male"
                          ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white scale-105"
                          : "bg-gray-100 text-gray-600 active:scale-95"
                      }`}
                    >
                      <span className="text-base sm:text-lg mr-1.5 sm:mr-2">👨</span>
                      Male
                    </button>
                  </div>
                </div>

                {/* Pose Warning Message */}
                {poseChecking && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-700 text-sm flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>Checking pose match...</span>
                  </div>
                )}

                {!poseMatched && !poseChecking && (
                  <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 text-red-700 font-semibold text-sm flex items-start gap-2">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span>⚠️ Image not matched</span>
                  </div>
                )}

                {/* Try-On Button */}
                <button
                  onClick={handleTryOn}
                  disabled={loading || !poseMatched || poseChecking}
                  className="w-full py-5 sm:py-6 rounded-xl sm:rounded-2xl font-bold text-lg sm:text-xl text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-2xl active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed"
                >
                  <span className="text-xl sm:text-2xl mr-2">✨</span>
                  Try It On!
                </button>

                {/* Change Outfit Link */}
                <button
                  onClick={() => setClothingImageUrl("")}
                  className="w-full text-center text-violet-600 font-semibold text-xs sm:text-sm active:scale-95 transition-transform"
                >
                  ← Change Outfit
                </button>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-start gap-3 animate-fadeIn">
            <svg className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-red-600 font-medium text-sm sm:text-base">{error}</p>
          </div>
        )}

        {/* Features - Responsive grid */}
        {!personImageUrl && (
          <div className="grid grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
            <div className="bg-white rounded-2xl lg:rounded-3xl p-4 md:p-6 lg:p-8 shadow-lg text-center hover:shadow-xl hover:scale-105 transition-all duration-300 group">
              <div className="text-3xl md:text-4xl lg:text-5xl mb-2 lg:mb-3 group-hover:scale-110 transition-transform">⚡</div>
              <p className="text-xs md:text-sm lg:text-base font-bold text-gray-800 mb-1 lg:mb-2">Fast Processing</p>
              <p className="text-[10px] md:text-xs lg:text-sm text-gray-600 hidden md:block">Get results in 30-60 seconds</p>
            </div>
            <div className="bg-white rounded-2xl lg:rounded-3xl p-4 md:p-6 lg:p-8 shadow-lg text-center hover:shadow-xl hover:scale-105 transition-all duration-300 group">
              <div className="text-3xl md:text-4xl lg:text-5xl mb-2 lg:mb-3 group-hover:scale-110 transition-transform">🎯</div>
              <p className="text-xs md:text-sm lg:text-base font-bold text-gray-800 mb-1 lg:mb-2">Highly Accurate</p>
              <p className="text-[10px] md:text-xs lg:text-sm text-gray-600 hidden md:block">Realistic AI-powered results</p>
            </div>
            <div className="bg-white rounded-2xl lg:rounded-3xl p-4 md:p-6 lg:p-8 shadow-lg text-center hover:shadow-xl hover:scale-105 transition-all duration-300 group">
              <div className="text-3xl md:text-4xl lg:text-5xl mb-2 lg:mb-3 group-hover:scale-110 transition-transform">🔒</div>
              <p className="text-xs md:text-sm lg:text-base font-bold text-gray-800 mb-1 lg:mb-2">100% Secure</p>
              <p className="text-[10px] md:text-xs lg:text-sm text-gray-600 hidden md:block">Your privacy is protected</p>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom, 1rem);
        }
      `}</style>
    </div>
  );
}
