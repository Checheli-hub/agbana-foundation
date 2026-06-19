import { v2 as cloudinary } from "cloudinary";

const getCloudinaryEnv = () => ({
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
});

export function isCloudinaryConfigured() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
    getCloudinaryEnv();
  return Boolean(
    CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET,
  );
}

export function initializeCloudinary() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
    getCloudinaryEnv();

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.warn(
      "⚠ Cloudinary is not configured. Passport uploads are disabled.",
    );
    return false;
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });

  return true;
}

const buildDataUri = (payload) => {
  if (typeof payload === "string") {
    if (payload.trim().startsWith("data:")) {
      return payload;
    }
    throw new Error(
      "Passport upload requires a valid data URI when uploading from JSON.",
    );
  }

  if (payload?.buffer && payload?.mimetype) {
    return `data:${payload.mimetype};base64,${payload.buffer.toString(
      "base64",
    )}`;
  }

  throw new Error("Invalid passport payload for Cloudinary upload.");
};

export async function uploadPassportImage(passportPayload) {
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary is not configured.");
  }

  const dataUri = buildDataUri(passportPayload);
  const publicId = `beneficiary-passport-${Date.now()}-${Math.floor(
    Math.random() * 100000,
  )}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: "ngo-beneficiaries/passports",
    public_id: publicId,
    overwrite: false,
    resource_type: "image",
  });

  if (!result?.secure_url) {
    throw new Error("Cloudinary upload failed to return a secure URL.");
  }

  return result.secure_url;
}
