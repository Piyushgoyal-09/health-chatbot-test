import { FileAttachment } from "../types";

export const isImageFile = (file: File): boolean => {
  return file.type.startsWith("image/");
};

export const isPDFFile = (file: File): boolean => {
  return file.type === "application/pdf";
};

export const createFilePreview = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (isImageFile(file)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    } else {
      resolve(""); // No preview for non-image files
    }
  });
};

/**
 * Convert image file to base64 string (without data URL prefix)
 * @param file - Image file to convert
 * @returns Base64 string without data URL prefix
 */
export const convertImageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!isImageFile(file)) {
      reject(new Error("File is not an image"));
      return;
    }

    console.log(
      "🖼️ Converting image to base64:",
      file.name,
      `(${Math.round(file.size / 1024)}KB)`
    );

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;

      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const parts = result.split(",");
      if (parts.length !== 2) {
        console.error("❌ Invalid data URL format");
        reject(new Error("Invalid data URL format"));
        return;
      }

      const base64Data = parts[1];
      console.log(
        `✅ Image converted: ${Math.round(
          base64Data.length / 1024
        )}KB base64 data`
      );

      resolve(base64Data);
    };
    reader.onerror = (error) => {
      console.error("❌ FileReader error:", error);
      reject(error);
    };
    reader.readAsDataURL(file);
  });
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export const validateFile = (
  file: File
): { valid: boolean; error?: string } => {
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (file.size > maxSize) {
    return { valid: false, error: "File size must be less than 10MB" };
  }

  if (!isImageFile(file) && !isPDFFile(file)) {
    return { valid: false, error: "Only images and PDFs are supported" };
  }

  return { valid: true };
};

export const createFileAttachment = async (
  file: File
): Promise<FileAttachment> => {
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const preview = await createFilePreview(file);

  return {
    file,
    type: isImageFile(file) ? "image" : "pdf",
    preview,
  };
};
