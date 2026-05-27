import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { SiteLayout, PageHero, CTASection } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import festivalImg from "@/assets/festival-tents.jpg";

type InventoryItem = {
  id: string;
  category: string;
  name: string;
  price_cents: number;
  unit: string;
  notes: string | null;
  sort_order: number;
};

const CATEGORY_ORDER = [
  "Canopy",
  "Canopy Options",
  "Canopy Cleaning Fee - Beach",
  "Tables",
  "Chairs",
  "Specialty Items",
  "Delivery",
];

const CATEGORY_BLURB: Record<string, string> = {
  Canopy: "Tent fee includes set up and take down.",
  "Canopy Options": "Add-ons to dial in weather protection, lighting, and finish.",
  "Canopy Cleaning Fee - Beach":
    "Due to sand, salt, and coastal exposure, beach canopies must be cleaned after every rental.",
  Tables: "Rectangular, round, and specialty options for dining, buffets, and bars.",
  Chairs: "Folding and specialty seating for ceremonies, receptions, and gatherings.",
  "Specialty Items": "Bars, dance floors, stages, heat, sound, and lighting accents.",
  Delivery: "Roundtrip delivery rates across the Oregon Coast.",
};

const inventoryQuery = queryOptions({
  queryKey: ["inventory"],
  queryFn: async (): Promise<InventoryItem[]> => {
    const { data, error } = await supabase
      .from("inventory_items")
      .select("id,category,name,price_cents,unit,notes,sort_order")
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return data as InventoryItem[];
  },
});

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Rental Inventory & Pricing | Pacific North Events & Tents" },
      {
        name: "description",
        content:
          "Browse our full Oregon Coast rental inventory: tents, tables, chairs, dance floors, lighting, bars, and delivery zones. Three-day rental pricing included.",
      },
      { property: "og:title", content: "Rental Inventory & Pricing | Pacific North Events & Tents" },
      {
        property: "og:description",
        content: "Tents, tables, chairs, specialty items, and delivery zones for the Oregon Coast.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(inventoryQuery),
  component: InventoryPage,
});

function formatPrice(cents: number) {
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars.toFixed(0)}` : `$${dollars.toFixed(2)}`;
}

function InventoryPage() {
  const { data: items } = useSuspenseQuery(inventoryQuery);

  const grouped = new Map<string, InventoryItem[]>();
  for (const item of items) {
    const arr = grouped.get(item.category) ?? [];
    arr.push(item);
    grouped.set(item.category, arr);
  }
  const orderedCategories = [
    ...CATEGORY_ORDER.filter((c) => grouped.has(c)),
    ...[...grouped.keys()].filter((c) => !CATEGORY_ORDER.includes(c)),
  ];

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Inventory & Pricing"
        title="Rental Inventory & Pricing"
        subtitle="Everything we offer for Oregon Coast events — tents, tables, chairs, lighting, dance floors, bars, and delivery. All rentals include a 3-day rental window."
        image={festivalImg}
      />

      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-secondary/40 px-6 py-5">
          <div>
            <p className="font-serif text-lg text-primary">Pricing includes a 3-day rental</p>
            <p className="text-sm text-muted-foreground">
              Prices below are a reference. Final quote depends on layout, delivery zone, and add-ons.
            </p>
          </div>
          <Link
            to="/contact"
            className="inline-flex items-center rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-[color:var(--navy-soft)]"
          >
            Request a Quote
          </Link>
        </div>

        {/* Category nav */}
        <nav className="mb-12 flex flex-wrap gap-2">
          {orderedCategories.map((c) => (
            <a
              key={c}
              href={`#${slug(c)}`}
              className="rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {c}
            </a>
          ))}
        </nav>

        <div className="space-y-16">
          {orderedCategories.map((category) => {
            const list = grouped.get(category) ?? [];
            return (
              <section key={category} id={slug(category)} className="scroll-mt-24">
                <header className="mb-6 border-b border-border pb-4">
                  <h2 className="font-serif text-2xl text-primary sm:text-3xl">{category}</h2>
                  {CATEGORY_BLURB[category] && (
                    <p className="mt-2 text-sm text-muted-foreground">{CATEGORY_BLURB[category]}</p>
                  )}
                </header>

                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card px-5 py-4 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{item.name}</p>
                        {item.notes && (
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.notes}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-serif text-lg text-[color:var(--gold)]">
                          {formatPrice(item.price_cents)}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {item.unit}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </section>

      <CTASection />
    </SiteLayout>
  );
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
