const {
  RekognitionClient,
  DetectFacesCommand,
  CompareFacesCommand,
} = require("@aws-sdk/client-rekognition");

const rekognitionClient = new RekognitionClient({
  region: process.env.AWS_REGION || "ap-south-1",
});

const DEFAULT_SIMILARITY_THRESHOLD = 90;

/* =====================================================
   Validate Face Image
===================================================== */

async function validateFaceImage(imageBuffer) {
  if (!Buffer.isBuffer(imageBuffer) || !imageBuffer.length) {
    throw new Error("Face image is empty");
  }

  const response = await rekognitionClient.send(
    new DetectFacesCommand({
      Image: {
        Bytes: imageBuffer,
      },
      Attributes: [
        "DEFAULT",
        "FACE_OCCLUDED",
        "EYES_OPEN",
      ],
    })
  );

  const faces = response.FaceDetails || [];

  if (faces.length === 0) {
    return {
      valid: false,
      reason: "No face detected",
      faceCount: 0,
    };
  }

  if (faces.length > 1) {
    return {
      valid: false,
      reason: "Multiple faces detected",
      faceCount: faces.length,
    };
  }

  const face = faces[0];

  const confidence = Number(face.Confidence || 0);
  const sharpness = Number(face.Quality?.Sharpness || 0);
  const brightness = Number(face.Quality?.Brightness || 0);

  const occluded =
    face.FaceOccluded?.Value === true &&
    Number(face.FaceOccluded?.Confidence || 0) >= 80;

  if (confidence < 95) {
    return {
      valid: false,
      reason: "Face detection confidence is too low",
      faceCount: 1,
      confidence,
    };
  }

  if (occluded) {
    return {
      valid: false,
      reason: "Face appears to be partially covered",
      faceCount: 1,
      confidence,
    };
  }

  return {
    valid: true,
    reason: "Face image accepted",
    faceCount: 1,
    confidence,
    sharpness,
    brightness,
    eyesOpen: face.EyesOpen?.Value ?? null,
    pose: {
      pitch: face.Pose?.Pitch ?? 0,
      roll: face.Pose?.Roll ?? 0,
      yaw: face.Pose?.Yaw ?? 0,
    },
  };
}

/* =====================================================
   Compare Enrolled Face vs Live Face
===================================================== */

async function compareFaces({
  enrolledImageBuffer,
  liveImageBuffer,
  similarityThreshold = DEFAULT_SIMILARITY_THRESHOLD,
}) {
  if (
    !Buffer.isBuffer(enrolledImageBuffer) ||
    !enrolledImageBuffer.length
  ) {
    throw new Error("Enrolled face image is unavailable");
  }

  if (
    !Buffer.isBuffer(liveImageBuffer) ||
    !liveImageBuffer.length
  ) {
    throw new Error("Live face image is unavailable");
  }

  const liveValidation =
    await validateFaceImage(liveImageBuffer);

  if (!liveValidation.valid) {
    return {
      verified: false,
      similarity: 0,
      threshold: similarityThreshold,
      reason: liveValidation.reason,
      liveValidation,
    };
  }

  const response = await rekognitionClient.send(
    new CompareFacesCommand({
      SourceImage: {
        Bytes: enrolledImageBuffer,
      },

      TargetImage: {
        Bytes: liveImageBuffer,
      },

      SimilarityThreshold: similarityThreshold,

      QualityFilter: "AUTO",
    })
  );

  const matches = response.FaceMatches || [];

  if (!matches.length) {
    return {
      verified: false,
      similarity: 0,
      threshold: similarityThreshold,
      reason: "Face does not match enrolled identity",
      liveValidation,
    };
  }

  const bestMatch = matches.reduce(
    (best, current) => {
      const bestScore = Number(
        best?.Similarity || 0
      );

      const currentScore = Number(
        current?.Similarity || 0
      );

      return currentScore > bestScore
        ? current
        : best;
    },
    matches[0]
  );

  const similarity = Number(
    bestMatch?.Similarity || 0
  );

  return {
    verified:
      similarity >= similarityThreshold,

    similarity: Number(
      similarity.toFixed(2)
    ),

    threshold: similarityThreshold,

    reason:
      similarity >= similarityThreshold
        ? "Biometric identity verified"
        : "Face similarity below required threshold",

    liveValidation,

    faceConfidence: Number(
      bestMatch?.Face?.Confidence || 0
    ),
  };
}

module.exports = {
  validateFaceImage,
  compareFaces,
  DEFAULT_SIMILARITY_THRESHOLD,
};