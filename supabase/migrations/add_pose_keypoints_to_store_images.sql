-- Add pose keypoints columns to store_images table for pre-computed pose detection
-- This allows instant pose matching instead of real-time detection on each clothing selection

ALTER TABLE store_images
ADD COLUMN IF NOT EXISTS pose_keypoints JSONB,
ADD COLUMN IF NOT EXISTS pose_detected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pose_detection_failed BOOLEAN DEFAULT FALSE;

-- Add index for faster queries when filtering by pose availability
CREATE INDEX IF NOT EXISTS idx_store_images_pose_keypoints ON store_images(pose_keypoints) WHERE pose_keypoints IS NOT NULL;

-- Add comment explaining the columns
COMMENT ON COLUMN store_images.pose_keypoints IS 'Pre-computed pose detection keypoints from TensorFlow MoveNet model';
COMMENT ON COLUMN store_images.pose_detected_at IS 'Timestamp when pose was detected and stored';
COMMENT ON COLUMN store_images.pose_detection_failed IS 'Flag indicating if pose detection failed for this image';
