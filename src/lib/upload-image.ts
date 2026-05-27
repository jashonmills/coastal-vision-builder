import { supabase } from "@/integrations/supabase/client";

export async function uploadImage(file: File, folder = "site"): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("images").getPublicUrl(path);
  return data.publicUrl;
}
