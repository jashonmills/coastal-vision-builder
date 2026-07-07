import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHero } from "@/components/SiteLayout";
import { VirtualTour } from "@/components/VirtualTour/VirtualTour";
import hallCenter from "@/assets/tour/hall-center.jpg.asset.json";

export const Route = createFileRoute("/virtual-tour")({
  head: () => ({
    meta: [
      { title: "360° Virtual Tour | Beacon on Broadway — Pacific North Events & Tents" },
      {
        name: "description",
        content:
          "Take an interactive 360° tour of Beacon on Broadway — a 2,800 sq ft historic event venue in Seaside, Oregon. Drag to look around and step inside from anywhere.",
      },
      { property: "og:title", content: "360° Virtual Tour — Beacon on Broadway" },
      {
        property: "og:description",
        content: "Interactive walk-through of the Beacon on Broadway event hall.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: hallCenter.url },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VirtualTourPage,
});

function VirtualTourPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Virtual Tour"
        title="Step inside Beacon on Broadway"
        subtitle="An interactive 360° walk-through of our Seaside event hall."
      />
      <section className="mx-auto max-w-6xl px-4 py-12 lg:px-8">
        <VirtualTour />
      </section>
    </SiteLayout>
  );
}
