import { useState, useRef, type ReactNode, type ElementType } from "react";
import { Pencil, Upload, Loader2, X, Check } from "lucide-react";
import { useIsAdmin } from "@/hooks/use-admin";
import { useSlotText, useSlotImage, useSaveSlot } from "@/hooks/use-site-content";
import { uploadImage } from "@/lib/upload-image";

type EditableTextProps = {
  slot: string;
  fallback: string;
  as?: ElementType;
  className?: string;
  multiline?: boolean;
  children?: (text: string) => ReactNode;
};

export function EditableText({ slot, fallback, as: Tag = "span", className, multiline, children }: EditableTextProps) {
  const { isAdmin } = useIsAdmin();
  const text = useSlotText(slot, fallback);
  const save = useSaveSlot();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);

  if (!isAdmin) {
    return children ? <>{children(text)}</> : <Tag className={className}>{text}</Tag>;
  }

  if (editing) {
    return (
      <span className="relative inline-block w-full align-top">
        {multiline ? (
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            className="w-full rounded-md border-2 border-amber-400 bg-white p-3 text-base text-foreground shadow-lg"
          />
        ) : (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full rounded-md border-2 border-amber-400 bg-white p-2 text-base text-foreground shadow-lg"
          />
        )}
        <span className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={async () => { await save.mutateAsync({ key: slot, value: { text: draft } }); setEditing(false); }}
            disabled={save.isPending}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white"
          >
            {save.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Save
          </button>
          <button
            type="button"
            onClick={() => { setDraft(text); setEditing(false); }}
            className="inline-flex items-center gap-1 rounded-full bg-zinc-700 px-3 py-1 text-xs font-semibold text-white"
          >
            <X className="h-3 w-3" /> Cancel
          </button>
        </span>
      </span>
    );
  }

  return (
    <Tag className={(className ? className + " " : "") + "relative outline-dashed outline-1 outline-transparent hover:outline-amber-400/60 group"}>
      {text}
      <button
        type="button"
        onClick={() => { setDraft(text); setEditing(true); }}
        className="absolute -right-2 -top-2 z-10 hidden h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white shadow group-hover:inline-flex"
        aria-label="Edit text"
      >
        <Pencil className="h-3 w-3" />
      </button>
    </Tag>
  );
}

type EditableImageProps = {
  slot: string;
  fallback: string;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
};

export function EditableImage({ slot, fallback, alt = "", className, width, height }: EditableImageProps) {
  const { isAdmin } = useIsAdmin();
  const url = useSlotImage(slot, fallback) ?? fallback;
  const save = useSaveSlot();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const newUrl = await uploadImage(file, "slots");
      await save.mutateAsync({ key: slot, value: { url: newUrl } });
    } catch (err) {
      alert("Upload failed: " + (err as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (!isAdmin) {
    return <img src={url} alt={alt} className={className} width={width} height={height} loading="lazy" />;
  }

  return (
    <span className="relative inline-block h-full w-full">
      <img src={url} alt={alt} className={className} width={width} height={height} loading="lazy" />
      <span className="pointer-events-none absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/30" />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow"
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
        {busy ? "Uploading…" : "Replace"}
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
    </span>
  );
}
