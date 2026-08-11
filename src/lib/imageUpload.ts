import UTIF from "utif";

/** File pickers that should accept radiology TIFFs alongside regular web images. */
export const IMAGE_UPLOAD_ACCEPT = "image/*,.tif,.tiff,image/tiff";

export function isTiffFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    file.type === "image/tiff" ||
    file.type === "image/tif" ||
    name.endsWith(".tif") ||
    name.endsWith(".tiff")
  );
}

/**
 * Browsers cannot render TIFF, so TIFF uploads are decoded client-side and
 * re-encoded as lossless PNG. Non-TIFF files are returned untouched.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (!isTiffFile(file)) return file;

  const buffer = await file.arrayBuffer();

  let rgba: Uint8Array;
  let width: number;
  let height: number;
  try {
    const pages = UTIF.decode(buffer);
    if (!pages.length) throw new Error("no pages");
    // Multi-page TIFFs: use the first page.
    const page = pages[0];
    UTIF.decodeImage(buffer, page, pages);
    rgba = new Uint8Array(UTIF.toRGBA8(page));
    width = page.width;
    height = page.height;
  } catch (err) {
    console.error("TIFF decode failed:", err);
    throw new Error(
      "This TIFF file could not be read (unsupported compression). Please re-save it as an uncompressed/LZW TIFF or as PNG."
    );
  }

  if (!width || !height || rgba.length < width * height * 4) {
    throw new Error("This TIFF file could not be converted. Please try saving it as PNG.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image conversion is not supported in this browser.");
  ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), width, height), 0, 0);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/png")
  );
  if (!blob) throw new Error("Failed to convert the TIFF image.");

  const baseName = file.name.replace(/\.(tiff?|TIFF?)$/i, "") || "image";
  return new File([blob], `${baseName}.png`, { type: "image/png" });
}
