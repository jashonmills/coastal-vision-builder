import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2, Upload, Save, ArrowUp, ArrowDown, ArrowLeft } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/SiteLayout";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import { supabase } from "@/integrations/supabase/client";
import { uploadImage } from "@/lib/upload-image";

export const Route = createFileRoute("/admin/site-images")({
  head: () => ({ meta: [{ title: "Site Images | Admin | Pacific North Events & Tents" }] }),
  component: SiteImagesPage,
});

type Row = {
  id: string;
  category: string;
  bucket: string;
  file: string;
  url: string;
  alt: string;
  caption: string | null;
  sort_order: number;
};

const CATEGORIES: { key: string; label: string; description: string }[] = [
  { key: "gallery_setups", label: "Gallery · Setups", description: "Tent setups shown in the main gallery." },
  { key: "gallery_equipment", label: "Gallery · Equipment", description: "Bars, heaters, PA and specialty equipment." },
  { key: "gallery_furniture", label: "Gallery · Furniture", description: "Tables and chairs." },
  { key: "gallery_uploads", label: "Gallery · Custom uploads", description: "Photos uploaded from the Gallery tab." },
  { key: "blueprints", label: "Floor plans", description: "Blueprints and seating layouts." },
  { key: "products", label: "Rental product shots", description: "Product photos used on rentals pages." },
  { key: "photos", label: "Photo library", description: "General photo library used across the site." },
  { key: "catering_callout", label: "Catering callout", description: "Image shown on the Services / catering callout." },
];

function SiteImagesPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const navigate = useNavigate();
  const [category, setCategory] = useState(CATEGORIES[0].key);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login", search: { next: "/admin/site-images" } as never });
  }, [user, authLoading, navigate]);

  if (authLoading || roleLoading) {
    return <SiteLayout><div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></SiteLayout>;
  }
  if (!user) return null;
  if (!isAdmin) return <SiteLayout><div className="mx-auto max-w-2xl px-4 py-16 text-center">Admin access required.</div></SiteLayout>;

  const activeMeta = CATEGORIES.find((c) => c.key === category)!;

  return (
    <SiteLayout>
      <PageHero eyebrow="Admin" title="Site Images" subtitle="Add, replace, remove and reorder every image shown on the public site." />
      <section className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
        <Link to="/admin" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Admin
        </Link>
        <div className="mb-6 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`rounded-full border px-4 py-2 text-sm font-medium ${
                category === c.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-secondary"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <p className="mb-6 text-sm text-muted-foreground">{activeMeta.description}</p>
        <CategoryPanel category={category} />
      </section>
    </SiteLayout>
  );
}

function CategoryPanel({ category }: { category: string }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: images = [], isLoading } = useQuery({
    queryKey: ["site-images", category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_images")
        .select("*")
        .eq("category", category)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      let next = images.length;
      for (const f of files) {
        const url = await uploadImage(f, category);
        const { error } = await supabase.from("site_images").insert({
          category,
          bucket: "images",
          file: f.name,
          url,
          alt: f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
          sort_order: next++,
        });
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ["site-images", category] });
    } catch (err) {
      alert("Upload failed: " + (err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("site_images").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site-images", category] }),
  });

  const move = useMutation({
    mutationFn: async ({ id, dir }: { id: string; dir: -1 | 1 }) => {
      const idx = images.findIndex((i) => i.id === id);
      const swapIdx = idx + dir;
      if (idx < 0 || swapIdx < 0 || swapIdx >= images.length) return;
      const a = images[idx];
      const b = images[swapIdx];
      const { error: e1 } = await supabase.from("site_images").update({ sort_order: b.sort_order }).eq("id", a.id);
      const { error: e2 } = await supabase.from("site_images").update({ sort_order: a.sort_order }).eq("id", b.id);
      if (e1 || e2) throw e1 ?? e2;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site-images", category] }),
  });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload to this category
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onPick} />
      </div>

      {isLoading ? (
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
      ) : images.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">No images in this category yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img, i) => (
            <ImageCard
              key={img.id}
              img={img}
              onDelete={() => { if (confirm("Delete this image?")) del.mutate(img.id); }}
              onUp={i > 0 ? () => move.mutate({ id: img.id, dir: -1 }) : undefined}
              onDown={i < images.length - 1 ? () => move.mutate({ id: img.id, dir: 1 }) : undefined}
              onSaved={() => qc.invalidateQueries({ queryKey: ["site-images", category] })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ImageCard({
  img,
  onDelete,
  onUp,
  onDown,
  onSaved,
}: {
  img: Row;
  onDelete: () => void;
  onUp?: () => void;
  onDown?: () => void;
  onSaved: () => void;
}) {
  const [alt, setAlt] = useState(img.alt ?? "");
  const [caption, setCaption] = useState(img.caption ?? "");
  const dirty = useMemo(() => alt !== (img.alt ?? "") || caption !== (img.caption ?? ""), [alt, caption, img]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("site_images").update({ alt, caption: caption || null }).eq("id", img.id);
      if (error) throw error;
    },
    onSuccess: onSaved,
  });

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative">
        <img src={img.url} alt={alt} className="h-48 w-full object-cover" />
        <div className="absolute right-2 top-2 flex gap-1">
          {onUp && (
            <button onClick={onUp} className="rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80" title="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
          )}
          {onDown && (
            <button onClick={onDown} className="rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80" title="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
          )}
          <button onClick={onDelete} className="rounded-full bg-red-600 p-1.5 text-white hover:bg-red-700" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      <div className="space-y-2 p-3">
        <label className="block text-xs font-medium text-muted-foreground">
          Alt text
          <input value={alt} onChange={(e) => setAlt(e.target.value)} className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-sm" />
        </label>
        <label className="block text-xs font-medium text-muted-foreground">
          Caption (optional)
          <input value={caption} onChange={(e) => setCaption(e.target.value)} className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-sm" />
        </label>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="truncate" title={img.file}>{img.file}</span>
          <button
            onClick={() => save.mutate()}
            disabled={!dirty || save.isPending}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
          >
            {save.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}
