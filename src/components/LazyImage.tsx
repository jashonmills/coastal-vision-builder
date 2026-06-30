import { useCallback, useState, type ImgHTMLAttributes } from "react";

type Props = ImgHTMLAttributes<HTMLImageElement> & {
  /** Initial aspect ratio (width / height) used to reserve space before load. */
  defaultRatio?: number;
  /** Wrapper className. */
  wrapperClassName?: string;
};

/**
 * Image with reserved layout space to prevent CLS while loading.
 * Uses a wrapper with aspect-ratio; updates to natural ratio once loaded.
 */
export function LazyImage({
  defaultRatio = 4 / 3,
  wrapperClassName,
  className,
  onLoad,
  loading = "lazy",
  decoding = "async",
  ...rest
}: Props) {
  const [ratio, setRatio] = useState(defaultRatio);
  const [loaded, setLoaded] = useState(false);

  const markLoaded = (img: HTMLImageElement) => {
    if (img.naturalWidth && img.naturalHeight) {
      setRatio(img.naturalWidth / img.naturalHeight);
    }
    setLoaded(true);
  };

  // Handle cached images: onLoad doesn't fire if the image is already complete
  // by the time React attaches the handler.
  const refCallback = useCallback((node: HTMLImageElement | null) => {
    if (node && node.complete && node.naturalWidth > 0) {
      markLoaded(node);
    }
  }, []);

  return (
    <div
      className={wrapperClassName}
      style={{ aspectRatio: String(ratio), backgroundColor: "hsl(var(--muted) / 0.4)" }}
    >
      <img
        {...rest}
        ref={refCallback}
        loading={loading}
        decoding={decoding}
        onLoad={(e) => {
          markLoaded(e.currentTarget);
          onLoad?.(e);
        }}
        className={`${className ?? ""} transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
}

