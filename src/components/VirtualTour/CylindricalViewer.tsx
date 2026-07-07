import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Loader2, Maximize2, Minimize2 } from "lucide-react";
import type { Scene } from "./scenes";

const deg = (d: number) => (d * Math.PI) / 180;

export function CylindricalViewer({ scene }: { scene: Scene }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const onFs = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setReady(false);
    setError(null);

    let disposed = false;
    let animationId = 0;

    const scene3 = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100);
    camera.rotation.order = "YXZ"; // yaw then pitch — no roll
    camera.rotation.y = 0;
    camera.rotation.x = deg(scene.tilt ?? 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0b1720);
    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.style.cursor = "grab";

    let mesh: THREE.Mesh | null = null;
    let geometry: THREE.CylinderGeometry | null = null;
    let material: THREE.MeshBasicMaterial | null = null;
    let texture: THREE.Texture | null = null;

    const haovRad = deg(scene.haov);

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      scene.image,
      (tex) => {
        if (disposed) {
          tex.dispose();
          return;
        }
        texture = tex;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;

        const imgW = tex.image?.width ?? 4000;
        const imgH = tex.image?.height ?? 1000;
        const radius = 5;
        // Arc length the image wraps around
        const arcLength = radius * haovRad;
        // Preserve aspect: cylinder height = arc length × (imgH / imgW)
        const height = arcLength * (imgH / imgW);

        geometry = new THREE.CylinderGeometry(
          radius,
          radius,
          height,
          128, // radial segments
          1,
          true, // openEnded
          Math.PI - haovRad / 2, // thetaStart: center the arc on -Z (camera forward at yaw=0)
          haovRad,
        );

        material = new THREE.MeshBasicMaterial({
          map: texture,
          side: THREE.BackSide, // view from inside
        });

        mesh = new THREE.Mesh(geometry, material);
        // CylinderGeometry with BackSide + default UVs shows the texture mirrored
        // horizontally when viewed from inside. Flip U by scaling the mesh's X.
        mesh.scale.x = -1;
        scene3.add(mesh);
        setReady(true);
      },
      undefined,
      () => {
        if (!disposed) setError("Failed to load panorama image.");
      },
    );

    // --- pointer drag ---
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    // Pitch (rotation.x) clamped so we don't tilt into open cylinder caps
    const pitchLimit = deg(28);
    // Yaw clamp — keep the visible frustum inside the panorama arc
    const yawLimit = () => Math.max(0, haovRad / 2 - deg(camera.fov / 2));

    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      renderer.domElement.setPointerCapture(e.pointerId);
      renderer.domElement.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      // Speed scales with FOV so zoomed-in drags feel natural
      const speed = (deg(camera.fov) / renderer.domElement.clientHeight) * 0.9;
      camera.rotation.y = THREE.MathUtils.clamp(
        camera.rotation.y + dx * speed,
        -yawLimit(),
        yawLimit(),
      );
      camera.rotation.x = THREE.MathUtils.clamp(
        camera.rotation.x + dy * speed,
        -pitchLimit,
        pitchLimit,
      );
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      try {
        renderer.domElement.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      renderer.domElement.style.cursor = "grab";
    };

    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("pointercancel", onUp);
    renderer.domElement.addEventListener("pointerleave", onUp);

    // --- wheel zoom ---
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const next = camera.fov + (e.deltaY > 0 ? 3 : -3);
      camera.fov = THREE.MathUtils.clamp(next, 40, 90);
      camera.updateProjectionMatrix();
      // Re-clamp yaw in case FOV widened past current limit
      camera.rotation.y = THREE.MathUtils.clamp(camera.rotation.y, -yawLimit(), yawLimit());
    };
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    // --- pinch zoom ---
    let pinchStartDist = 0;
    let pinchStartFov = camera.fov;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const [a, b] = [e.touches[0], e.touches[1]];
        pinchStartDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        pinchStartFov = camera.fov;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStartDist > 0) {
        e.preventDefault();
        const [a, b] = [e.touches[0], e.touches[1]];
        const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        const next = pinchStartFov * (pinchStartDist / d);
        camera.fov = THREE.MathUtils.clamp(next, 40, 90);
        camera.updateProjectionMatrix();
        camera.rotation.y = THREE.MathUtils.clamp(camera.rotation.y, -yawLimit(), yawLimit());
      }
    };
    renderer.domElement.addEventListener("touchstart", onTouchStart, { passive: false });
    renderer.domElement.addEventListener("touchmove", onTouchMove, { passive: false });

    // --- resize ---
    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    // --- render loop ---
    const tick = () => {
      renderer.render(scene3, camera);
      animationId = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(animationId);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("pointercancel", onUp);
      renderer.domElement.removeEventListener("pointerleave", onUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("touchstart", onTouchStart);
      renderer.domElement.removeEventListener("touchmove", onTouchMove);
      if (mesh) scene3.remove(mesh);
      geometry?.dispose();
      material?.dispose();
      texture?.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [scene.id, scene.image, scene.haov, scene.tilt]);

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement === el) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen().catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full select-none bg-[#0b1720]"
      role="img"
      aria-label={`360 degree view: ${scene.label}. ${scene.description}`}
    >
      {!ready && !error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-primary-foreground/80">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-xs font-medium uppercase tracking-widest">Loading view</p>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-destructive">
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={toggleFullscreen}
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur hover:bg-black/65"
      >
        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </button>
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/40 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-white/90 backdrop-blur">
        Drag to look • Scroll to zoom
      </div>
    </div>
  );
}
