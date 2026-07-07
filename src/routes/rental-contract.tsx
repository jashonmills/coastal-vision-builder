import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { contracts, type ContractDoc } from "@/data/contracts";
import { Download, FileText, ChevronDown, Printer } from "lucide-react";

const BRAND = "Pacific North Events & Tents";

export const Route = createFileRoute("/rental-contract")({
  component: ContractsHubPage,
  head: () => ({
    meta: [
      { title: "Rental Contracts & Forms — Pacific North Events & Tents" },
      {
        name: "description",
        content:
          "View and download every Pacific North Events & Tents contract — rental, venue, catering, and credit card authorization forms — in one place.",
      },
      { property: "og:title", content: "Rental Contracts & Forms — Pacific North Events & Tents" },
      {
        property: "og:description",
        content:
          "Full text of our rental, Beacon venue, catering, and credit card authorization forms — read online or download the branded PDFs.",
      },
      { property: "og:url", content: "https://pacificnorthrentals.com/rental-contract" },
    ],
    links: [{ rel: "canonical", href: "https://pacificnorthrentals.com/rental-contract" }],
  }),
});

const CATEGORY_ORDER: ContractDoc["category"][] = ["Rental", "Venue", "Catering", "Payment"];

const CATEGORY_COPY: Record<ContractDoc["category"], { eyebrow: string; blurb: string }> = {
  Rental: {
    eyebrow: "Rental",
    blurb: "Standard rental terms for equipment, tents, and setup services.",
  },
  Venue: {
    eyebrow: "Venue",
    blurb: "Rental agreement for The Beacon on Broadway in downtown Seaside.",
  },
  Catering: {
    eyebrow: "Catering",
    blurb: "Terms for buffet, chef stations, and bartending services.",
  },
  Payment: {
    eyebrow: "Payment forms",
    blurb: "Authorization forms required to complete a reservation.",
  },
};

function ContractCard({ doc }: { doc: ContractDoc }) {
  const [open, setOpen] = useState(false);

  return (
    <article
      id={doc.id}
      className="scroll-mt-28 overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      <header className="flex flex-wrap items-start justify-between gap-4 p-6 sm:p-7">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color:var(--gold)]/15 text-[color:var(--gold)]">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {doc.category} · {doc.fileType}
            </p>
            <h3 className="mt-1 font-serif text-xl text-foreground sm:text-2xl">{doc.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{doc.subtitle}</p>
            <p className="mt-3 max-w-2xl text-sm text-foreground">{doc.description}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={doc.downloadUrl}
            download={doc.downloadFilename}
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--gold)] px-4 py-2 text-sm font-semibold text-[color:var(--ink-on-gold,#1a1a1a)] shadow-sm hover:opacity-90"
          >
            <Download className="h-4 w-4" /> Download {doc.fileType}
          </a>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={`${doc.id}-body`}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
          >
            {open ? "Hide text" : "Read full text"}
            <ChevronDown
              className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
        </div>
      </header>

      {open && (
        <div
          id={`${doc.id}-body`}
          className="border-t border-border bg-background/60 px-6 py-6 sm:px-7 sm:py-8"
        >
          <div className="prose prose-neutral max-w-none prose-headings:font-serif prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground">
            {doc.sections.map((s) => (
              <section key={s.heading}>
                <h4 className="mt-8 text-lg first:mt-0">{s.heading}</h4>
                <div className="space-y-3">
                  {s.paragraphs.map((p, i) => (
                    <p key={i} className="text-sm sm:text-base">
                      {p}
                    </p>
                  ))}
                </div>
              </section>
            ))}
            <p className="mt-8 text-xs text-muted-foreground">
              This on-page text is a plain-language summary for easy reading. The signed PDF /
              Word file downloaded above is the authoritative document.
            </p>
          </div>
        </div>
      )}
    </article>
  );
}

function ContractsHubPage() {
  return (
    <SiteLayout>
      <div className="bg-background text-foreground">
        <header className="border-b border-border bg-card">
          <div className="mx-auto max-w-6xl px-6 py-14">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Documents
            </p>
            <h1 className="mt-2 font-serif text-4xl md:text-5xl">Contracts & Forms</h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Every contract and authorization form we use, in one place. Read the full text
              online, or download the branded PDF / Word file to sign and return. All documents
              are issued by {BRAND} (Damarkom, Inc.), Seaside, Oregon.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2 text-sm hover:bg-secondary"
              >
                <Printer className="h-4 w-4" /> Print this page
              </button>
              <Link
                to="/contact"
                className="rounded-full bg-[color:var(--gold)] px-5 py-2 text-sm font-medium text-[color:var(--ink-on-gold,#1a1a1a)] hover:opacity-90"
              >
                Questions? Contact us
              </Link>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-6 py-12">
          {CATEGORY_ORDER.map((category) => {
            const docs = contracts.filter((c) => c.category === category);
            if (docs.length === 0) return null;
            const copy = CATEGORY_COPY[category];
            return (
              <section key={category} className="mt-12 first:mt-0">
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--gold)]">
                    {copy.eyebrow}
                  </p>
                  <h2 className="mt-2 font-serif text-2xl text-foreground sm:text-3xl">
                    {category === "Payment"
                      ? "Payment authorization"
                      : `${category} agreement${docs.length > 1 ? "s" : ""}`}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{copy.blurb}</p>
                </div>
                <div className="grid gap-6">
                  {docs.map((doc) => (
                    <ContractCard key={doc.id} doc={doc} />
                  ))}
                </div>
              </section>
            );
          })}

          <hr className="my-14 border-border" />
          <p className="text-sm text-muted-foreground">
            Last updated for the 2026 season. {BRAND} reserves the right to update these terms;
            the version attached to your signed agreement governs your reservation.
          </p>
        </div>
      </div>
    </SiteLayout>
  );
}
