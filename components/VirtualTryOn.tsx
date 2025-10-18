"use client";

import { useState } from "react";
import ImageUpload from "./ImageUpload";
import Image from "next/image";

export default function VirtualTryOn() {
  const [personImageUrl, setPersonImageUrl] = useState<string>("");
  const [clothingImageUrl, setClothingImageUrl] = useState<string>("");
  const [gender, setGender] = useState<"male" | "female">("female");
  const [resultImageUrl, setResultImageUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const handleTryOn = async () => {
    if (!personImageUrl || !clothingImageUrl) {
      setError("Please upload both images");
      return;
    }

    setLoading(true);
    setError("");
    setResultImageUrl("");

    try {
      const response = await fetch("/api/tryon", {
        method: "POST",
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
      setResultImageUrl(result.image.url);
    } catch (err: any) {
      console.error("Try-on error:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPersonImageUrl("");
    setClothingImageUrl("");
    setResultImageUrl("");
    setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-purple-50 p-6">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Virtual Try-On
          </h1>
          <p className="text-gray-600 text-lg">
            Upload your photo and clothing to see how it looks on you
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-6">
          {/* Person Image Upload */}
          <div className="bg-white rounded-3xl shadow-xl p-6">
            <ImageUpload
              label="Your Photo"
              icon="👤"
              onImageSelect={setPersonImageUrl}
              previewUrl={personImageUrl}
            />
          </div>

          {/* Clothing Image Upload */}
          <div className="bg-white rounded-3xl shadow-xl p-6">
            <ImageUpload
              label="Clothing Item"
              icon="👕"
              onImageSelect={setClothingImageUrl}
              previewUrl={clothingImageUrl}
            />
          </div>

          {/* Result Display */}
          <div className="bg-white rounded-3xl shadow-xl p-6">
            <label className="text-lg font-semibold text-gray-700 block mb-3">
              Result
            </label>
            <div className="h-[400px] rounded-2xl border-2 border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
              {loading ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl">✨</span>
                    </div>
                  </div>
                  <p className="text-lg font-medium text-gray-700 animate-pulse">
                    Creating magic...
                  </p>
                  <p className="text-sm text-gray-500">
                    This may take 30-60 seconds
                  </p>
                </div>
              ) : resultImageUrl ? (
                <div className="relative w-full h-full group">
                  <Image
                    src={resultImageUrl}
                    alt="Try-on result"
                    fill
                    className="object-contain p-4"
                  />
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={resultImageUrl}
                      download="tryon-result.png"
                      className="bg-white rounded-full p-3 shadow-lg hover:bg-primary-50 transition-colors"
                    >
                      <svg
                        className="w-6 h-6 text-primary-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-400">
                  <div className="text-6xl mb-4">🎨</div>
                  <p className="text-lg">Your result will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-3xl shadow-xl p-6">
          <div className="flex items-center justify-between gap-6">
            {/* Gender Selection */}
            <div className="flex items-center gap-4">
              <label className="text-lg font-semibold text-gray-700">
                Gender:
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setGender("female")}
                  className={`
                    px-6 py-3 rounded-xl font-medium transition-all duration-300
                    ${
                      gender === "female"
                        ? "bg-primary-600 text-white shadow-lg scale-105"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }
                  `}
                >
                  👩 Female
                </button>
                <button
                  onClick={() => setGender("male")}
                  className={`
                    px-6 py-3 rounded-xl font-medium transition-all duration-300
                    ${
                      gender === "male"
                        ? "bg-primary-600 text-white shadow-lg scale-105"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }
                  `}
                >
                  👨 Male
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                disabled={loading}
                className="px-8 py-3 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset
              </button>
              <button
                onClick={handleTryOn}
                disabled={loading || !personImageUrl || !clothingImageUrl}
                className="px-12 py-3 rounded-xl font-medium text-white bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg transform hover:scale-105 active:scale-95"
              >
                {loading ? "Processing..." : "✨ Try It On"}
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 flex items-center gap-3">
              <svg
                className="w-6 h-6 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <p>{error}</p>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-md text-center">
            <div className="text-3xl mb-2">⚡</div>
            <h3 className="font-semibold text-gray-800 mb-1">Fast Processing</h3>
            <p className="text-sm text-gray-600">Results in 30-60 seconds</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-md text-center">
            <div className="text-3xl mb-2">🎯</div>
            <h3 className="font-semibold text-gray-800 mb-1">Accurate Results</h3>
            <p className="text-sm text-gray-600">Realistic try-on experience</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-md text-center">
            <div className="text-3xl mb-2">🔒</div>
            <h3 className="font-semibold text-gray-800 mb-1">Privacy First</h3>
            <p className="text-sm text-gray-600">Your images are secure</p>
          </div>
        </div>
      </div>
    </div>
  );
}
