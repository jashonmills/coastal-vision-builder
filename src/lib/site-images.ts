// Single source of truth for every image rendered on this site.
//
// RULE: All <img> tags and CSS background images on this site MUST resolve to
// a URL exported from this file (i.e. the `images` storage bucket on Lovable
// Cloud). The only exception is the AI-generated blueprint on /recommender,
// which is generated per-request by Gemini.
//
// To add new imagery, upload the file to the `images` bucket and add an entry
// below — do not import from src/assets, /public, or external URLs.

const BUCKET_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images`;
const GALLERY_BUCKET_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/new-images`;

export type SiteImage = {
  file: string;
  url: string;
  alt: string;
  caption?: string;
};

function img(file: string, alt: string, caption?: string): SiteImage {
  return { file, url: `${BUCKET_BASE}/${file}`, alt, caption };
}

function galleryImg(file: string, alt: string, caption?: string): SiteImage {
  return {
    file,
    url: `${GALLERY_BUCKET_BASE}/${encodeURIComponent(file)}`,
    alt,
    caption,
  };
}

/**
 * Gallery photos — sourced from the `new-images` storage bucket. Grouped
 * into categories that drive the /gallery page sections.
 */
export const gallerySetups: SiteImage[] = [
  galleryImg("View 1.jpg", "Event tent setup — view 1"),
  galleryImg("View 2.jpg", "Event tent setup — view 2"),
  galleryImg("View 3.jpg", "Event tent setup — view 3"),
  galleryImg("View 5.JPG", "Event tent setup — view 5"),
  galleryImg("View 6.jpg", "Event tent setup — view 6"),
  galleryImg("View 7.jpg", "Event tent setup — view 7"),
  galleryImg("View 7-2.jpg", "Event tent setup — view 7 alternate"),
  galleryImg("View 10.jpeg", "Event tent setup — view 10"),
  galleryImg("View 10-2.jpeg", "Event tent setup — view 10 alternate"),
  galleryImg("Tent in backyard.jpg", "Tent set up in a backyard"),
  galleryImg("Tent in backyard 2.jpg", "Backyard tent — alternate angle"),
  galleryImg("Tent near lake.jpg", "Tent set up near a lake"),
  galleryImg("Tent near lake.jpg", "Tent set up near a lake"),
  galleryImg("2 20' Tent with windows.jpg", "20' tent with windows"),
  galleryImg("20x60 Tent(1).jpg", "20x60 frame tent"),
  galleryImg("10x20-frame-tent-seating-for-16.webp", "10x20 frame tent seating for 16"),
  galleryImg("marq. underside.png", "Marquee tent underside"),
  galleryImg("1051-1.jpg", "Past event setup"),
  galleryImg("331.jpg", "Past event setup"),
  galleryImg("2e19a1a821c8b6ec8943c7abfa09ceb0.jpg", "Past event setup"),
  galleryImg("67dac2ff3cf5f7bd8e60be5b1af34380.jpg", "Past event setup"),
  galleryImg("c0e876c73fbd4fb1bc5cf20e716754e7.jpg", "Past event setup"),
];

export const galleryEquipment: SiteImage[] = [
  galleryImg("6Professionalbarjpg.jpg", "Professional portable bar"),
  galleryImg("Portable Bar 1.jpg", "Portable bar — option 1"),
  galleryImg("Portable Bar 2.jpg", "Portable bar — option 2"),
  galleryImg("Portable Bar 3.jpg", "Portable bar — option 3"),
  galleryImg("fill and chill.jpg", "Fill and chill beverage station"),
  galleryImg("55 gallon water barrel.jpg", "55 gallon water barrel"),
  galleryImg("Patio heater.jpg", "Propane patio heater"),
  galleryImg("Ion BT Speaker.jpg", "Ion portable Bluetooth speaker"),
];

export const galleryFurniture: SiteImage[] = [
  galleryImg("Black Chair.jpg", "Black folding chair"),
  galleryImg("_White Chair.jpg", "White folding chair"),
  galleryImg("wood-folding-fruitwood.jpg", "Fruitwood folding chair"),
  galleryImg("60 round.jpg", "60-inch round folding table"),
  galleryImg("8' table.jpg", "8-foot rectangular folding table"),
];

// Blueprints are defined further down as `sketchImages` and re-exported
// here for the gallery grouping.



/**
 * Hand-drawn configuration sketches showing tent + table + chair + dance
 * floor layouts. Rendered on the Inventory page so customers can visualize
 * setups before requesting a quote.
 */
export const sketchImages: SiteImage[] = [
  img(
    "474563191_565306963173752_1136886455040851362_n.jpg",
    "Floor plan: 20 by 60 foot frame tent with eight round tables and a sixteen-section dance floor",
    "20×60 Frame Tent · 8 round tables · 64 chairs · 16 dance-floor sections",
  ),
  img(
    "517165782_695961306774983_6044612679187186672_n.jpg",
    "Floor plan combining two 20 by 20 hex tents with dance floor and catering area",
    "Two 20×20 hex tents · 120–160 guests · dance floor + catering",
  ),
  img(
    "474463283_565307009840414_7074023454884750889_n.jpg",
    "Five seating variations for a 20 by 20 canopy",
    "20×20 canopy · 5 seating options (32–54 chairs)",
  ),
  img(
    "488600635_620872890950492_8628789741656867627_n.jpg",
    "Four seating layouts for 20 by 20 tents",
    "Seating layouts for 20×20 tents",
  ),
  img(
    "488978407_620872867617161_1556481910414724815_n.jpg",
    "Three seating layouts for 10 by 20 tents",
    "Seating layouts for 10×20 tents",
  ),
  img(
    "488602422_620872864283828_7647138966100628412_n.jpg",
    "Four seating layouts for 20 by 40 tents",
    "Seating layouts for 20×40 tents",
  ),
  img(
    "488645422_620872920950489_2299407176129296613_n.jpg",
    "Three seating layouts for 10 by 10 tents",
    "Seating layouts for 10×10 tents",
  ),
  img(
    "480938094_589477454090036_9027517813852096889_n.jpg",
    "Wedding ceremony floor plan inside a 20 by 40 frame tent with 80 folding chairs",
    "Wedding ceremony · 20×40 frame tent · 80 chairs",
  ),
  img(
    "474456177_564737223230726_5504818826038496031_n.jpg",
    "20 by 40 frame tent shown with banquet tables and round tables",
    "20×40 frame tent · banquet or round table layout",
  ),
  img(
    "480575350_589477564090025_5245801037659980793_n.jpg",
    "20 by 40 frame tent with mixed banquet and round table seating",
    "20×40 frame tent · 80–64 guests",
  ),
  img(
    "474259057_565307199840395_3796474448715405360_n.jpg",
    "20 by 40 marquee tent illustration with round table layout",
    "20×40 marquee tent · round table layout",
  ),
  img(
    "517385670_695961310108316_1740422929856782877_n.jpg",
    "Hexagon tent variation reference sheet",
    "Hexagon tent variations",
  ),
  img(
    "481000015_589607617410353_9019655516564925065_n.jpg",
    "Hexagon tent variation reference sheet",
    "Hexagon tent variations",
  ),
  img(
    "481447287_589477590756689_4406621329276958219_n.jpg",
    "20 by 40 marquee tent illustration with round table layout",
    "20×40 marquee tent · round table layout",
  ),
];

/**
 * Product cutout shots (single item on a white background). Useful for
 * inventory thumbnails where a clean isolated photo reads better than an
 * event scene.
 */
export const productImages: SiteImage[] = [
  img("469177750_529823493388766_6347225283875997257_n.jpg", "60-inch round folding table"),
  img("469372788_529823503388765_4348043901117254958_n.jpg", "8-foot rectangular folding table"),
  img("469150182_529823540055428_4671922222938595837_n.jpg", "Black folding chair"),
  img("469165463_529823473388768_7013416796850691535_n.jpg", "Outdoor propane patio heater"),
  img("468962666_529823536722095_9181053484769189188_n.jpg", "Portable PA speaker"),
];

/**
 * Real event photos — tents up, lights on, guests in the frame. Used for
 * heroes, gallery, and any decorative imagery throughout the site.
 */
export const photoImages: SiteImage[] = [
  img("469103714_529823583388757_5821615986589818114_n.jpg", "Oregon Coast event tent setup"),
  img("469143421_529823760055406_8167397046202509944_n.jpg", "Tent reception with table settings"),
  img("469312785_529823293388786_3537228070558775988_n.jpg", "Catering buffet table with food spread"),
  img("472843788_555397524164696_310875170561736773_n.jpg", "Outdoor event tent on the coast"),
  img("473592002_559650870406028_3348516647888160355_n.jpg", "Evening tent with warm lighting"),
  img("473616827_559650917072690_5340889121591763082_n.jpg", "Tent interior styled for a reception"),
  img("473619262_559650953739353_1042426680856328212_n.jpg", "Wedding reception under a frame tent"),
  img("477774387_581310684906713_3535566232057442071_n.jpg", "Coastal event setup at golden hour"),
  img("479981805_582339711470477_5695802475426332013_n.jpg", "Outdoor celebration tent"),
  img("480905156_586604277710687_7910586654484016224_n.jpg", "Tent and table setup before guests arrive"),
  img("480928681_588116267559488_6265058064909025116_n.jpg", "Festival vendor tent"),
  img("481168375_589298140774634_6869263384576956075_n.jpg", "Wedding reception tent interior"),
  img("481275883_591672693870512_4782124943036351944_n.jpg", "Outdoor private party tent"),
  img("481977720_597885596582555_1292309761831142039_n.jpg", "Tent setup at dusk with string lights"),
  img("489155647_623363370701444_6038613740890065939_n.jpg", "Coastal wedding tent on the beach"),
  img("492004498_636109879426793_8448455459233426235_n.jpg", "Frame tent reception with dining tables"),
  img("493743462_640100312361083_109003193886203950_n.jpg", "Outdoor corporate event tent"),
  img("503580985_668256652878782_1786729605668802944_n.jpg", "Event tent reception with floral centerpieces"),
  img("515978807_716959321341848_1041124182856331715_n.jpg", "Tent setup with bar and lounge area"),
  img("516880908_695144426856671_5536688911026073693_n.jpg", "Reception tent under coastal evening sky"),
  img("517402629_695961400108307_2554067438201962614_n.jpg", "Wedding tent with hanging lights"),
  img("518051008_695961203441660_5858388040880933537_n.jpg", "Outdoor wedding ceremony seating"),
  img("518719135_702356896135424_7203534893586646496_n.jpg", "Festival tent row at dusk"),
  img("519426015_695961206774993_9183983329355994245_n.jpg", "Coastal reception with sunset backdrop"),
  img("527224258_716959364675177_1938040731493724615_n.jpg", "Tent setup with bistro lighting"),
  img("536887974_730801069957673_7523838707378289774_n.jpg", "Coastal event tent at twilight"),
  img("537447385_730803213290792_164603695709163801_n.jpg", "Wedding reception tent with banquet tables"),
  img("537543257_730801106624336_6992849400480143259_n.jpg", "Outdoor private party with tent and seating"),
  img("538218786_730803399957440_9003608376902676372_n.jpg", "Reception tent interior with chandeliers"),
  img("538317848_730803386624108_4632632641682768296_n.jpg", "Coastal wedding tent at golden hour"),
  img("654301047_902739286097183_8263221457944672870_n.jpg", "Frame tent ready for guests"),
  img("670389331_920421537662291_6410634364917607168_n.jpg", "Beachfront event tent with ocean view"),
  img("flyer.jpg", "Pacific North Events & Tents promotional flyer"),
];

export const galleryBlueprints: SiteImage[] = sketchImages;

export const galleryImages: SiteImage[] = [
  ...gallerySetups,
  ...galleryEquipment,
  ...galleryFurniture,
  ...galleryBlueprints,
];

export const allImages: SiteImage[] = [...sketchImages, ...productImages, ...photoImages];


// ----- Helpers ----------------------------------------------------------

export const heroImage = (): SiteImage => photoImages[0];

/** Stable per-key pick so the same caller gets the same image across renders. */
export function pickPhoto(key: string): SiteImage {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return photoImages[h % photoImages.length];
}

export function pickPhotos(n: number, startKey = "default"): SiteImage[] {
  let h = 0;
  for (let i = 0; i < startKey.length; i++) h = (h * 31 + startKey.charCodeAt(i)) >>> 0;
  const start = h % photoImages.length;
  const out: SiteImage[] = [];
  for (let i = 0; i < n; i++) out.push(photoImages[(start + i) % photoImages.length]);
  return out;
}
