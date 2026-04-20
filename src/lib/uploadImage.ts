import { supabase } from "@/integrations/supabase/client";

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function uploadImage(
  file: File,
  bucket: "project-covers" | "project-gallery",
  projectSlug: string
): Promise<{ url: string; path: string }> {
  const path = `${projectSlug}/${Date.now()}-${slugify(file.name)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export async function deleteImage(
  bucket: "project-covers" | "project-gallery",
  path: string
) {
  await supabase.storage.from(bucket).remove([path]);
}
