import hallCenter from "@/assets/tour/hall-center.jpg.asset.json";
import hallNorth from "@/assets/tour/hall-north.jpg.asset.json";
import hallSouth from "@/assets/tour/hall-south.jpg.asset.json";
import hallSideBar from "@/assets/tour/hall-side-bar.jpg.asset.json";
import hallSkylight from "@/assets/tour/hall-skylight.jpg.asset.json";

export type Scene = {
  id: string;
  label: string;
  description: string;
  image: string;
  /** Horizontal coverage of the panorama in degrees (≤ 360). */
  haov: number;
  /** Initial vertical tilt of the camera in degrees. */
  tilt?: number;
};

export const scenes: Scene[] = [
  {
    id: "center",
    label: "Main Hall (Center)",
    description: "Panoramic view of the main event floor.",
    image: hallCenter.url,
    haov: 220,
  },
  {
    id: "north",
    label: "North End",
    description: "Beamed ceiling and stair landing on the north end.",
    image: hallNorth.url,
    haov: 220,
  },
  {
    id: "south",
    label: "South End",
    description: "South-end window wall with the bar cabinet.",
    image: hallSouth.url,
    haov: 220,
  },
  {
    id: "side-bar",
    label: "Side Bar",
    description: "White built-ins and bar counter alcove.",
    image: hallSideBar.url,
    haov: 200,
  },
  {
    id: "skylight",
    label: "Skylight",
    description: "Original stained-glass skylight overhead.",
    image: hallSkylight.url,
    haov: 180,
    tilt: 40,
  },
];
