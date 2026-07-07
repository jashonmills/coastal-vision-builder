export {};

type PannellumConfig = {
  type?: "equirectangular" | "cubemap" | "multires";
  panorama?: string;
  autoLoad?: boolean;
  showControls?: boolean;
  showFullscreenCtrl?: boolean;
  showZoomCtrl?: boolean;
  compass?: boolean;
  haov?: number;
  vaov?: number;
  yaw?: number;
  pitch?: number;
  hfov?: number;
  minHfov?: number;
  maxHfov?: number;
  hotSpots?: unknown[];
  crossOrigin?: "anonymous" | "use-credentials";
};

type PannellumViewerInstance = {
  destroy: () => void;
  on: (event: string, cb: (...args: unknown[]) => void) => void;
};

declare global {
  interface Window {
    pannellum?: {
      viewer: (containerId: string | HTMLElement, config: PannellumConfig) => PannellumViewerInstance;
    };
  }
}
