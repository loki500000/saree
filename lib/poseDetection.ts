import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';
import * as tf from '@tensorflow/tfjs-core';

let detector: poseDetection.PoseDetector | null = null;

export interface PoseKeypoints {
  keypoints: Array<{
    x: number;
    y: number;
    score?: number;
    name?: string;
  }>;
}

/**
 * Initialize the pose detection model
 */
export async function initializePoseDetector(): Promise<poseDetection.PoseDetector> {
  if (detector) {
    return detector;
  }

  // Set backend to WebGL for better performance
  await tf.setBackend('webgl');
  await tf.ready();

  // Create MoveNet detector (Lightning version for speed)
  detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    {
      modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
    }
  );

  return detector;
}

/**
 * Detect pose from an image URL or HTMLImageElement
 */
export async function detectPose(imageSource: string | HTMLImageElement): Promise<PoseKeypoints | null> {
  try {
    const detectorInstance = await initializePoseDetector();

    let imageElement: HTMLImageElement;

    if (typeof imageSource === 'string') {
      // Load image from URL
      imageElement = await loadImage(imageSource);
    } else {
      imageElement = imageSource;
    }

    // Estimate pose
    const poses = await detectorInstance.estimatePoses(imageElement);

    if (poses.length === 0) {
      console.warn('No pose detected in image');
      return null;
    }

    // Return the first pose (single person)
    return {
      keypoints: poses[0].keypoints.map(kp => ({
        x: kp.x,
        y: kp.y,
        score: kp.score,
        name: kp.name,
      })),
    };
  } catch (error) {
    console.error('Error detecting pose:', error);
    return null;
  }
}

/**
 * Load image from URL
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Calculate the angle between three points (in degrees)
 */
function calculateAngle(
  point1: { x: number; y: number },
  point2: { x: number; y: number },
  point3: { x: number; y: number }
): number {
  const radians =
    Math.atan2(point3.y - point2.y, point3.x - point2.x) -
    Math.atan2(point1.y - point2.y, point1.x - point2.x);

  let angle = Math.abs((radians * 180.0) / Math.PI);

  if (angle > 180.0) {
    angle = 360.0 - angle;
  }

  return angle;
}

/**
 * Get keypoint by name
 */
function getKeypoint(pose: PoseKeypoints, name: string) {
  return pose.keypoints.find(kp => kp.name === name);
}

/**
 * Calculate similarity between two arm poses (0-100, lower is more similar)
 */
function compareArm(
  pose1: PoseKeypoints,
  pose2: PoseKeypoints,
  shoulderName: string,
  elbowName: string,
  wristName: string
): number {
  const shoulder1 = getKeypoint(pose1, shoulderName);
  const elbow1 = getKeypoint(pose1, elbowName);
  const wrist1 = getKeypoint(pose1, wristName);

  const shoulder2 = getKeypoint(pose2, shoulderName);
  const elbow2 = getKeypoint(pose2, elbowName);
  const wrist2 = getKeypoint(pose2, wristName);

  // Check if all keypoints exist and have good confidence
  const minConfidence = 0.3;
  if (
    !shoulder1 || !elbow1 || !wrist1 ||
    !shoulder2 || !elbow2 || !wrist2 ||
    (shoulder1.score && shoulder1.score < minConfidence) ||
    (elbow1.score && elbow1.score < minConfidence) ||
    (wrist1.score && wrist1.score < minConfidence) ||
    (shoulder2.score && shoulder2.score < minConfidence) ||
    (elbow2.score && elbow2.score < minConfidence) ||
    (wrist2.score && wrist2.score < minConfidence)
  ) {
    // If keypoints are missing or low confidence, return moderate difference
    return 50;
  }

  // Calculate angles for both poses
  const angle1 = calculateAngle(shoulder1, elbow1, wrist1);
  const angle2 = calculateAngle(shoulder2, elbow2, wrist2);

  // Calculate angle difference (0-180 degrees)
  const angleDiff = Math.abs(angle1 - angle2);

  // Normalize to 0-100 scale (180 degrees = 100% different)
  return (angleDiff / 180) * 100;
}

/**
 * Compare two poses and return difference percentage (0-100)
 * 0 = identical poses, 100 = completely different poses
 */
export function comparePoses(userPose: PoseKeypoints, clothingPose: PoseKeypoints): number {
  try {
    // Compare left arm
    const leftArmDiff = compareArm(
      userPose,
      clothingPose,
      'left_shoulder',
      'left_elbow',
      'left_wrist'
    );

    // Compare right arm
    const rightArmDiff = compareArm(
      userPose,
      clothingPose,
      'right_shoulder',
      'right_elbow',
      'right_wrist'
    );

    // Average the differences
    const totalDiff = (leftArmDiff + rightArmDiff) / 2;

    return Math.round(totalDiff);
  } catch (error) {
    console.error('Error comparing poses:', error);
    // Return moderate difference if comparison fails
    return 50;
  }
}

/**
 * Check if pose detection is supported in the current browser
 */
export function isPoseDetectionSupported(): boolean {
  try {
    return typeof window !== 'undefined' && 'WebGLRenderingContext' in window;
  } catch {
    return false;
  }
}
