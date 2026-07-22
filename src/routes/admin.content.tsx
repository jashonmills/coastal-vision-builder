import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Trash2,
  Upload,
  Save,
  ArrowUp,
  ArrowDown,
  Archive,
  ArchiveRestore,
  RefreshCw,
  Type,
  Image as ImageIcon,
  FolderOpen,
} from "lucide-react";
import { z } from "zod";
import { AdminLayout, AdminPageHeader } from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import { supabase } from "@/integrations/supabase/client";
import { uploadImage } from "@/lib/upload-image";
import { groupTextSlotsByPage, groupImageSlotsByPage } from "@/lib/content-slots";
import { useAllSiteContent, useSaveSlot } from "@/hooks/use-site-content";

type Tab = "text" | "hero" | "media";
const TAB_LABELS: Record<Tab, { label: string; icon: typeof Type; subtitle: string }> = {
  text: { label: "Site Text", icon: Type, subtitle: "Edit the copy that appears on public pages." },
  hero: { label: "Page Hero Images", icon: ImageIcon, subtitle: "Hero backgrounds and section images tied to specific page slots." },
  media: { label: "Media Library", icon: FolderOpen, subtitle: "Gallery, product, floor-plan, and general site images grouped by category." },
};

export const Route = createFileRoute("/admin/content")({
  head: () => ({ meta: [{ title: "Site Content | Admin" }] }),
  validateSearch: (s: Record<string, unknown>) =>
    z.object({ tab: z.enum(["text", "hero", "media"]).optional() }).parse(s),
  component: ContentPage,
});

function ContentPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const tab: Tab = search.tab ?? "text";
  const setTab = (t: Tab) => navigate({ to: "/admin/content", search: { tab: t } });

  if (authLoading || roleLoading) {
    return <AdminLayout><div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AdminLayout>;
  }
  if (!user) return null;
  if (!isAdmin) return <AdminLayout><div className="mx-auto max-w-2xl px-4 py-16 text-center">Admin access required.</div></AdminLayout>;

  const meta = TAB_LABELS[tab];

  return (
    <AdminLayout>
      <AdminPageHeader eyebrow="Content" title="Site Content" subtitle={meta.subtitle} />
      <div className="mb-6 flex flex-wrap gap-2 rounded-xl border border-border bg-card p-1.5">
        {(Object.keys(TAB_LABELS) as Tab[]).map((k) => {
          const { label, icon: Icon } = TAB_LABELS[k];
          const active = tab === k;
          return (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                active ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground hover:bg-secondary"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          );
        })}
      </div>

      {tab === "text" && <TextAdmin />}
      {tab === "hero" && <HeroImagesAdmin />}
      {tab === "media" && <MediaLibraryAdmin />}
    </AdminLayout>
  );
}

/* ---------------- Site Text ---------------- */

function TextAdmin() {
  const { data: content = {} } = useAllSiteContent();
  const groups = groupTextSlotsByPage();
  const [activePage, setActivePage] = useState(groups[0]?.page ?? "Home");
  const active = groups.find((g) => g.page === activePage) ?? groups[0];
  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        {groups.map((g) => (
          <button
            key={g.page}
            onClick={() => setActivePage(g.page)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
              activePage === g.page ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-secondary"
            }`}
          >
            {g.page}
          </button>
        ))}
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Edits save immediately and update the public site. Admins can also click any hero heading on the site to edit it inline.
      </p>
      <div className="space-y-4">
        {active?.slots.map((s) => (
          <TextSlotRow key={s.key} slotKey={s.key} label={s.label} fallback={s.default} multiline={s.multiline} current={content[s.key]?.text} />
        ))}
      </div>
    </div>
  );
}

function TextSlotRow({ slotKey, label, fallback, multiline, current }: { slotKey: string; label: string; fallback: string; multiline?: boolean; current?: string }) {
  const save = useSaveSlot();
  const [v, setV] = useState(current ?? fallback);
  const dirty = v !== (current ?? fallback);
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="font-mono text-[10px] text-muted-foreground">{slotKey}</p>
      </div>
      {multiline ? (
        <textarea value={v} onChange={(e) => setV(e.target.value)} rows={3} className="w-full rounded border px-3 py-2 text-sm" />
      ) : (
        <input value={v} onChange={(e) => setV(e.target.value)} className="w-full rounded border px-3 py-2 text-sm" />
      )}
      <div className="mt-2 flex justify-end gap-2">
        <button onClick={() => setV(fallback)} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">Reset to default</button>
        <button onClick={() => save.mutate({ key: slotKey, value: { text: v } })} disabled={!dirty || save.isPending} className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-40">
          {save.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
        </button>
      </div>
    </div>
  );
}

/* ---------------- Page Hero Images (slot-based) ---------------- */

function HeroImagesAdmin() {
  const { data: content = {} } = useAllSiteContent();
  const groups = groupImageSlotsByPage();
  return (
    <div className="space-y-8">
      {groups.map((g) => (
        <div key={g.page}>
          <h3 className="mb-3 text-lg font-semibold text-foreground">{g.page}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {g.slots.map((s) => <ImageSlotRow key={s.key} slotKey={s.key} label={s.label} url={content[s.key]?.url} />)}
          </div>
        </div>
      ))}
      <p className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">
        Looking for gallery, product, or floor-plan images? Switch to the Media Library tab above.
      </p>
    </div>
  );
}

function ImageSlotRow({ slotKey, label, url }: { slotKey: string; label: string; url?: string }) {
  const save = useSaveSlot();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setBusy(true);
    try { const u = await uploadImage(file, "slots"); await save.mutateAsync({ key: slotKey, value: { url: u } }); }
    catch (err) { alert("Upload failed: " + (err as Error).message); }
    finally { setBusy(false); if (ref.current) ref.current.value = ""; }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="mb-2 text-sm font-medium text-foreground">{label}</p>
      <p className="mb-3 font-mono text-[10px] text-muted-foreground">{slotKey}</p>
      {url ? <img src={url} alt="" className="mb-3 h-32 w-full rounded object-cover" /> : <div className="mb-3 flex h-32 items-center justify-center rounded bg-secondary text-xs text-muted-foreground">Using default</div>}
      <button onClick={() => ref.current?.click()} disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {url ? "Replace" : "Upload"}
      </button>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={onPick} />
    </div>
  );
}

/* ---------------- Media Library (category-based) ---------------- */

type Row = {
  id: string;
  category: string;
  bucket: string;
  file: string;
  url: string;
  alt: string;
  caption: string | null;
  sort_order: number;
  archived: boolean;
};

const CATEGORIES: { key: string; label: string; description: string }[] = [
  { key: "gallery_setups", label: "Gallery · Setups", description: "Tent setups shown in the main gallery." },
  { key: "gallery_equipment", label: "Gallery · Equipment", description: "Bars, heaters, PA and specialty equipment." },
  { key: "gallery_furniture", label: "Gallery · Furniture", description: "Tables and chairs." },
  { key: "gallery_uploads", label: "Gallery · Custom uploads", description: "Extra photos appended to the public gallery." },
  { key: "blueprints", label: "Floor plans", description: "Blueprints and seating layouts." },
  { key: "products", label: "Rental product shots", description: "Product photos used on rentals pages." },
  { key: "photos", label: "Photo library", description: "General photo library used across the site." },
  { key: "catering_callout", label: "Catering callout", description: "Image shown on the Services / catering callout." },
];

function MediaLibraryAdmin() {
  const [category, setCategory] = useState(CATEGORIES[0].key);
  const [showArchived, setShowArchived] = useState(false);
  const activeMeta = CATEGORIES.find((c) => c.key === category)!;
  return (
    <div>
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{activeMeta.description}</p>
        <label className="inline-flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="h-4 w-4" />
          Show archived
        </label>
      </div>
      <CategoryPanel category={category} showArchived={showArchived} />
    </div>
  );
}

function CategoryPanel({ category, showArchived }: { category: string; showArchived: boolean }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: images = [], isLoading } = useQuery({
    queryKey: ["site-images", category, { archived: showArchived }],
    queryFn: async () => {
      let q = supabase.from("site_images").select("*").eq("category", category).order("sort_order", { ascending: true });
      if (!showArchived) q = q.eq("archived", false);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["site-images", category] });
    qc.invalidateQueries({ queryKey: ["site-images-public"] });
    qc.invalidateQueries({ queryKey: ["gallery"] });
    qc.invalidateQueries({ queryKey: ["admin-gallery"] });
  }

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
      invalidate();
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
    onSuccess: invalidate,
  });

  const archive = useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const { error } = await supabase.from("site_images").update({ archived }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
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
    onSuccess: invalidate,
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
        <p className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          {showArchived ? "No archived images in this category." : "No images in this category yet."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img, i) => (
            <ImageCard
              key={img.id}
              img={img}
              onDelete={() => { if (confirm("Permanently delete this image? Use Archive to hide it without deleting.")) del.mutate(img.id); }}
              onArchive={() => archive.mutate({ id: img.id, archived: !img.archived })}
              onUp={i > 0 ? () => move.mutate({ id: img.id, dir: -1 }) : undefined}
              onDown={i < images.length - 1 ? () => move.mutate({ id: img.id, dir: 1 }) : undefined}
              onSaved={invalidate}
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
  onArchive,
  onUp,
  onDown,
  onSaved,
}: {
  img: Row;
  onDelete: () => void;
  onArchive: () => void;
  onUp?: () => void;
  onDown?: () => void;
  onSaved: () => void;
}) {
  const [alt, setAlt] = useState(img.alt ?? "");
  const [caption, setCaption] = useState(img.caption ?? "");
  const [replacing, setReplacing] = useState(false);
  const replaceRef = useRef<HTMLInputElement>(null);
  const dirty = useMemo(() => alt !== (img.alt ?? "") || caption !== (img.caption ?? ""), [alt, caption, img]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("site_images").update({ alt, caption: caption || null }).eq("id", img.id);
      if (error) throw error;
    },
    onSuccess: onSaved,
  });

  async function onReplace(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReplacing(true);
    try {
      const url = await uploadImage(file, img.category);
      const { error } = await supabase.from("site_images").update({ url, file: file.name, bucket: "images" }).eq("id", img.id);
      if (error) throw error;
      onSaved();
    } catch (err) {
      alert("Replace failed: " + (err as Error).message);
    } finally {
      setReplacing(false);
      if (replaceRef.current) replaceRef.current.value = "";
    }
  }

  return (
    <div className={`overflow-hidden rounded-xl border bg-card ${img.archived ? "border-amber-500/60 opacity-70" : "border-border"}`}>
      <div className="relative">
        <img src={img.url} alt={alt} className="h-48 w-full object-cover" />
        {img.archived && (
          <span className="absolute left-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">Archived</span>
        )}
        <div className="absolute right-2 top-2 flex gap-1">
          {onUp && (
            <button onClick={onUp} className="rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80" title="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
          )}
          {onDown && (
            <button onClick={onDown} className="rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80" title="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
          )}
          <button onClick={() => replaceRef.current?.click()} disabled={replacing} className="rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80 disabled:opacity-50" title="Replace image">
            {replacing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </button>
          <input ref={replaceRef} type="file" accept="image/*" className="hidden" onChange={onReplace} />
          <button
            onClick={onArchive}
            className={`rounded-full p-1.5 text-white ${img.archived ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700"}`}
            title={img.archived ? "Unarchive (show on site)" : "Archive (hide from site)"}
          >
            {img.archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
          </button>
          <button onClick={onDelete} className="rounded-full bg-red-600 p-1.5 text-white hover:bg-red-700" title="Delete permanently"><Trash2 className="h-3.5 w-3.5" /></button>
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
