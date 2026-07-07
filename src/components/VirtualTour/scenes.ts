import hallCenter from "@/assets/tour/hall-center.jpg.asset.json";
import hallNorth from "@/assets/tour/hall-north.jpg.asset.json";
import hallSouth from "@/assets/tour/hall-south.jpg.asset.json";
import hallSideBar from "@/assets/tour/hall-side-bar.jpg.asset.json";
import hallSkylight from "@/assets/tour/hall-skylight.jpg.asset.json";

export type Scene = {
  id: string;
  label: string;
  description: string;
  /** Uploaded asset URL. A file at `fallback` in /public overrides this if present. */
  image: string;
  /** Local override path — drop a higher-res file at public/assets/... to replace. */
  fallback: string;
  /** Horizontal angle of view (deg). 360 = full pano; < 360 = partial pano. */
  haov: number;
  /** Vertical angle of view (deg). */
  vaov: number;
  /** Initial camera yaw (deg). */
  yaw: number;
  /** Initial camera pitch (deg). */
  pitch: number;
  /** Initial horizontal FOV. */
  hfov: number;
};

// The uploaded photos are wide panoramas (~180-220°), not full 360° equirectangular.
// haov/vaov tell pannellum to project only that slice so the image isn't stretched.
export const scenes: Scene[] = [
  {
    id: "center",
    label: "Main Hall (Center)",
    description: "Panoramic view of the main event floor.",
    image: hallCenter.url,
    fallback: "/assets/hall-center.jpg",
    haov: 220,
    vaov: 90,
    yaw: 0,
    pitch: 0,
    hfov: 110,
  },
  {
    id: "north",
    label: "North End",
    description: "Beamed ceiling and stair landing on the north end.",
    image: hallNorth.url,
    fallback: "/assets/hall-north.jpg",
    haov: 220,
    vaov: 90,
    yaw: 0,
    pitch: 0,
    hfov: 110,
  },
  {
    id: "south",
    label: "South End",
    description: "South-end window wall with the bar cabinet.",
    image: hallSouth.url,
    fallback: "/assets/hall-south.jpg",
    haov: 220,
    vaov: 90,
    yaw: 0,
    pitch: 0,
    hfov: 110,
  },
  {
    id: "side-bar",
    label: "Side Bar",
    description: "White built-ins and bar counter alcove.",
    image: hallSideBar.url,
    fallback: "/assets/hall-side-bar.jpg",
    haov: 200,
    vaov: 90,
    yaw: 0,
    pitch: 0,
    hfov: 100,
  },
  {
    id: "skylight",
    label: "Skylight",
    description: "Original stained-glass skylight overhead.",
    image: hallSkylight.url,
    fallback: "/assets/hall-skylight.jpg",
    haov: 180,
    vaov: 90,
    yaw: 0,
    pitch: 20,
    hfov: 100,
  },
];
