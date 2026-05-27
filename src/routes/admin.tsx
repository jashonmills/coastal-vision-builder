import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, Upload, Save, ShieldCheck, Image as ImageIcon, Box, Type } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/SiteLayout";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import { supabase } from "@/integrations/supabase/client";
import { uploadImage } from "@/lib/upload-image";
import { TEXT_SLOTS, IMAGE_SLOTS } from "@/lib/content-slots";
import { useAllSiteContent, useSaveSlot } from "@/hooks/use-site-content";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin | Pacific North Events & Tents" }] }),
  component: AdminPage,
});

type Tab = "inventory" | "gallery" | "images" | "text";

function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("inventory");

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login", search: { next: "/admin" } as never });
  }, [user, authLoading, navigate]);

  if (authLoading || roleLoading) {
    return <SiteLayout><div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></SiteLayout>;
  }
  if (!user) return null;
  if (!isAdmin) return <SiteLayout><ClaimAdmin /></SiteLayout>;

  return (
    <SiteLayout>
      <PageHero eyebrow="Admin" title="Site Content" subtitle="Manage inventory, gallery, site images and text." />
      <div className="mx-auto max-w-6xl px-4 pt-6 lg:px-8">
        <Link to="/admin/inventory" className="inline-flex items-center gap-2 rounded-full border border-[color:var(--gold)]/40 bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-[color:var(--gold)]/10">
          <Box className="h-4 w-4" /> Open Inventory Management
        </Link>
      </div>
      <section className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
        <div className="mb-8 flex flex-wrap gap-2">
          {([["inventory", Box, "Inventory"], ["gallery", ImageIcon, "Gallery"], ["images", Upload, "Site Images"], ["text", Type, "Site Text"]] as const).map(([k, Icon, label]) => (
            <button key={k} onClick={() => setTab(k)} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${tab === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-secondary"}`}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
        {tab === "inventory" && <InventoryAdmin />}
        {tab === "gallery" && <GalleryAdmin />}
        {tab === "images" && <ImagesAdmin />}
        {tab === "text" && <TextAdmin />}
      </section>
    </SiteLayout>
  );
}

function ClaimAdmin() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function claim() {
    setBusy(true); setErr(null);
    try {
      // Only succeeds if no admin row exists yet (we'll insert; RLS denies if not admin AND there are admins)
      // Safer: check count first using a count query (public read on user_roles is restricted; use rpc-less approach)
      const { count, error: cErr } = await supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin");
      if (cErr) throw cErr;
      if ((count ?? 0) > 0) throw new Error("An admin already exists. Ask an existing admin to add you.");
      const { error } = await supabase.from("user_roles").insert({ user_id: user!.id, role: "admin" });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["is-admin"] });
    } catch (e) {
      setErr((e as Error).message);
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
      <h1 className="mt-4 font-serif text-3xl text-primary">Admin access required</h1>
      <p className="mt-3 text-muted-foreground">If no admin has been set up yet, you can claim this account as the first admin.</p>
      <button onClick={claim} disabled={busy} className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Claim as first admin
      </button>
      {err && <p className="mt-4 text-sm text-destructive">{err}</p>}
      <p className="mt-8"><Link to="/account" className="text-sm text-muted-foreground underline">Back to account</Link></p>
    </div>
  );
}

/* ---------------- Inventory ---------------- */

type InvItem = { id: string; category: string; name: string; price_cents: number; unit: string; notes: string | null; sort_order: number };

function InventoryAdmin() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin-inventory"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pricing_items").select("*").order("category").order("sort_order");
      if (error) throw error;
      return data as InvItem[];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pricing_items").insert({ category: "New Category", name: "New item", price_cents: 0, unit: "each", sort_order: 0 });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-inventory"] }),
  });

  if (isLoading) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />;
  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={() => add.mutate()} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" /> Add item</button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Category</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Price ($)</th><th className="px-3 py-2">Unit</th><th className="px-3 py-2">Notes</th><th className="px-3 py-2">Order</th><th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => <InventoryRow key={it.id} item={it} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InventoryRow({ item }: { item: InvItem }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState(item);
  const dirty = JSON.stringify(draft) !== JSON.stringify(item);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pricing_items").update({
        category: draft.category, name: draft.name, price_cents: draft.price_cents, unit: draft.unit, notes: draft.notes, sort_order: draft.sort_order, updated_at: new Date().toISOString(),
      }).eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-inventory"] }),
  });
  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pricing_items").delete().eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-inventory"] }),
  });

  return (
    <tr className="border-t border-border">
      <td className="px-2 py-1"><input className="w-32 rounded border px-2 py-1" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} /></td>
      <td className="px-2 py-1"><input className="w-48 rounded border px-2 py-1" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></td>
      <td className="px-2 py-1"><input type="number" step="0.01" className="w-24 rounded border px-2 py-1" value={(draft.price_cents / 100).toString()} onChange={(e) => setDraft({ ...draft, price_cents: Math.round(parseFloat(e.target.value || "0") * 100) })} /></td>
      <td className="px-2 py-1"><input className="w-20 rounded border px-2 py-1" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} /></td>
      <td className="px-2 py-1"><input className="w-56 rounded border px-2 py-1" value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></td>
      <td className="px-2 py-1"><input type="number" className="w-16 rounded border px-2 py-1" value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: parseInt(e.target.value || "0", 10) })} /></td>
      <td className="px-2 py-1">
        <div className="flex gap-1">
          <button disabled={!dirty || save.isPending} onClick={() => save.mutate()} className="rounded-full bg-emerald-600 p-1.5 text-white disabled:opacity-30"><Save className="h-3.5 w-3.5" /></button>
          <button onClick={() => { if (confirm("Delete this item?")) del.mutate(); }} className="rounded-full bg-red-600 p-1.5 text-white"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </td>
    </tr>
  );
}

/* ---------------- Gallery ---------------- */

type GalleryRow = { id: string; url: string; caption: string | null; sort_order: number };

function GalleryAdmin() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: images = [], isLoading } = useQuery({
    queryKey: ["admin-gallery"],
    queryFn: async () => {
      const { data, error } = await supabase.from("gallery_images").select("*").order("sort_order");
      if (error) throw error;
      return data as GalleryRow[];
    },
  });

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const f of files) {
        const url = await uploadImage(f, "gallery");
        await supabase.from("gallery_images").insert({ url, sort_order: images.length });
      }
      qc.invalidateQueries({ queryKey: ["admin-gallery"] });
      qc.invalidateQueries({ queryKey: ["gallery"] });
    } catch (err) { alert("Upload failed: " + (err as Error).message); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gallery_images").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-gallery"] }); qc.invalidateQueries({ queryKey: ["gallery"] }); },
  });

  if (isLoading) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />;
  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={() => fileRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload photos
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onPick} />
      </div>
      {images.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">No gallery photos yet. Upload some to override the default gallery.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img) => (
            <div key={img.id} className="group relative overflow-hidden rounded-xl border border-border bg-card">
              <img src={img.url} alt={img.caption ?? ""} className="h-40 w-full object-cover" />
              <button onClick={() => { if (confirm("Delete this image?")) del.mutate(img.id); }} className="absolute right-2 top-2 rounded-full bg-red-600 p-1.5 text-white opacity-0 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
              <CaptionEditor row={img} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CaptionEditor({ row }: { row: GalleryRow }) {
  const qc = useQueryClient();
  const [v, setV] = useState(row.caption ?? "");
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("gallery_images").update({ caption: v }).eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-gallery"] }),
  });
  return (
    <div className="flex gap-1 p-2">
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder="Caption…" className="flex-1 rounded border px-2 py-1 text-xs" />
      <button onClick={() => save.mutate()} disabled={v === (row.caption ?? "")} className="rounded-full bg-emerald-600 p-1.5 text-white disabled:opacity-30"><Save className="h-3 w-3" /></button>
    </div>
  );
}

/* ---------------- Site Images ---------------- */

function ImagesAdmin() {
  const { data: content = {} } = useAllSiteContent();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {IMAGE_SLOTS.map((s) => <ImageSlotRow key={s.key} slotKey={s.key} label={s.label} url={content[s.key]?.url} />)}
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

/* ---------------- Site Text ---------------- */

function TextAdmin() {
  const { data: content = {} } = useAllSiteContent();
  return (
    <div className="space-y-4">
      {TEXT_SLOTS.map((s) => <TextSlotRow key={s.key} slotKey={s.key} label={s.label} fallback={s.default} multiline={s.multiline} current={content[s.key]?.text} />)}
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
