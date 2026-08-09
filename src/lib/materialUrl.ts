import { supabase } from "@/integrations/supabase/client";

/** Private bucket holding downloadable lesson materials, laid out as <course_id>/<file>. */
export const MATERIAL_BUCKET = "course-material-files";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Materials are stored as storage paths in the private bucket. Older records may
 * still hold an absolute URL, which is returned untouched.
 */
export async function resolveMaterialUrl(fileUrl: string): Promise<string> {
  if (!fileUrl) return "";
  if (/^https?:\/\//i.test(fileUrl) || fileUrl.startsWith("data:")) return fileUrl;

  const { data, error } = await supabase.storage
    .from(MATERIAL_BUCKET)
    .createSignedUrl(fileUrl, SIGNED_URL_TTL_SECONDS);

  if (error) {
    console.error("Failed to sign material URL:", error);
    return "";
  }
  return data?.signedUrl ?? "";
}

/** Resolves file_url on a list of materials into temporary, access-checked links. */
export async function resolveMaterialUrls<T extends { file_url: string }>(
  materials: T[]
): Promise<T[]> {
  return Promise.all(
    materials.map(async (material) => ({
      ...material,
      file_url: await resolveMaterialUrl(material.file_url),
    }))
  );
}
