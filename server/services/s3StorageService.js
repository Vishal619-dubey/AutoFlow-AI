const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} = require("@aws-sdk/client-s3");

const getBucketName = () => {
  const bucket = process.env.AWS_S3_BUCKET;

  if (!bucket) {
    throw new Error("AWS_S3_BUCKET is not configured");
  }

  return bucket;
};

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
});

function createDocumentKey({ userId, filename }) {
  const safeFilename = String(filename || "document")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "");

  return `documents/${userId}/${Date.now()}-${safeFilename}.afenc`;
}

async function uploadDocument({ key, buffer }) {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      Body: buffer,
      ContentType: "application/octet-stream",
    })
  );

  return key;
}

async function getDocumentBuffer(key) {
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    })
  );

  if (!response.Body) {
    throw new Error("S3 object body is empty");
  }

  const bytes = await response.Body.transformToByteArray();
  return Buffer.from(bytes);
}

async function deleteDocument(key) {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    })
  );
}

async function documentExists(key) {
  try {
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: getBucketName(),
        Key: key,
      })
    );

    return true;
  } catch (error) {
    if (
      error?.name === "NotFound" ||
      error?.name === "NoSuchKey" ||
      error?.$metadata?.httpStatusCode === 404
    ) {
      return false;
    }

    throw error;
  }
}

module.exports = {
  createDocumentKey,
  uploadDocument,
  getDocumentBuffer,
  deleteDocument,
  documentExists,
};