import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";

const BRAND = "Pacific North Events & Tents";

type Section = { id: string; title: string; body: React.ReactNode };

const sections: Section[] = [
  {
    id: "payment",
    title: "Payment",
    body: (
      <p>
        Renter shall pay all charges payable under this contract in advance, provided however that the foregoing shall not
        limit the amount payable by the renter hereunder and all additional amounts hereunder shall be paid immediately as
        such costs are incurred. Renter shall pay all reasonable costs of collections, court, and attorney fees. If rental
        charges are not paid within seven (7) days of the due date, {BRAND} at our discretion may re-calculate rental
        charges on a daily basis and charge the credit card on file. Renter shall pay, in addition to any other amounts
        payable hereunder, a service charge of 2.0% per month on all past due accounts. There will be a $35.00 charge on
        any returned checks for any reason.
      </p>
    ),
  },
  {
    id: "additional-charges",
    title: "Additional Charges",
    body: (
      <>
        <p>
          In addition to other charges and costs provided herein, the renter shall pay charges in accordance with company
          rates then in effect for the following services:
        </p>
        <ul>
          <li>Delivery or pickup</li>
          <li>Delivery or pickup from any location other than ground level</li>
          <li>Setup / knockdown of tables and chairs</li>
          <li>Delivery and pickup after business hours, Saturdays, Sundays, and Holidays</li>
          <li>Service calls</li>
          <li>Site planning and preparation</li>
          <li>Last-minute or rush orders</li>
        </ul>
      </>
    ),
  },
  {
    id: "care",
    title: "Care of Equipment",
    body: (
      <p>
        In addition to its other obligations hereunder, Renter shall pay a reasonable cleaning charge for items returned
        dirty, and shall protect the rented items from weather damage, breakage, unauthorized or improper use, theft, or
        loss while in the possession of the renter.
      </p>
    ),
  },
  {
    id: "insurance",
    title: "Insurance",
    body: (
      <p>
        Renter shall maintain, at renter's expense, liability, property, and casualty insurance coverage in an amount
        sufficient to fully protect {BRAND} and its equipment against any and all claims, loss, or damage of whatever
        nature or type.
      </p>
    ),
  },
  {
    id: "site-prep",
    title: "Site Preparation",
    body: (
      <p>
        Renter agrees to have the site clean and ready for delivery and installation, or dismantled and ready for pickup of
        the equipment, and also agrees to pay an additional charge for any delay incurred along with any labor charges
        resulting from renter's failure to do so.
      </p>
    ),
  },
  {
    id: "permits",
    title: "Permits & Licenses",
    body: (
      <p>
        Renter agrees, prior to any installation of rental equipment including tents, to obtain at renter's expense any and
        all necessary permits, licenses, and other consents.
      </p>
    ),
  },
  {
    id: "severability",
    title: "Severability & Disclaimer of Warranties",
    body: (
      <>
        <p>
          The provisions of this rental contract shall be severable so that the unenforceability or waiver of one provision
          shall not affect the remaining provisions.
        </p>
        <p>
          You are responsible for the use of the rented items. You assume all risks inherent to the operation and use of
          rented items, and agree to assume the entire responsibility for the defense of, and to pay, indemnify, and hold
          {" "}{BRAND} harmless from, and hereby release {BRAND} from, any and all claims for damage to property or bodily
          injury (including death) resulting from the use, operation, or possession of the items — whether or not it be
          claimed or found that such damage or injury resulted in whole or part from {BRAND}'s negligence, from the
          defective condition of the items, or any other cause.
        </p>
        <p className="font-semibold uppercase tracking-wide">
          You agree that no warranties expressed or implied, including merchantability or fitness for a particular purpose,
          have been made in connection with the equipment rented.
        </p>
      </>
    ),
  },
  {
    id: "equipment-failure",
    title: "Equipment Failure",
    body: (
      <p>
        You agree to immediately discontinue the use of rented items should they at any time become unsafe or in a state of
        disrepair, and will immediately (one hour or less) notify {BRAND} of the facts. {BRAND} agrees, at our discretion,
        to make the items operable within a reasonable time, provide a like item if available, make a like item available
        at another time, or adjust rental charges. This provision does not relieve renter from the obligations of the
        contract. In all events, {BRAND} shall not be responsible for injury or damage resulting from failure or defect of
        rented items.
      </p>
    ),
  },
  {
    id: "use",
    title: "Use of Equipment",
    body: (
      <p>
        Renter agrees and covenants to be satisfied with the instruction and condition of equipment rented and of the
        proper and safe use of equipment. Renter further agrees that the items will be used only at the address listed on
        the contract, and only for the purpose for which it was intended and manufactured. Subleasing or improper use is
        prohibited.
      </p>
    ),
  },
  {
    id: "time-of-return",
    title: "Time of Return",
    body: (
      <p>
        Renter's right of possession terminates upon the expiration of the rental period set forth on the contract. Time is
        of the essence in this contract. Any extension must be agreed upon in writing.
      </p>
    ),
  },
  {
    id: "late-returns",
    title: "Late Returns",
    body: (
      <p>
        Renter shall return rented items to {BRAND} during regular business hours, promptly upon or prior to the expiration
        of the rental period. If the renter does not timely return the items, the rental rate shall continue until items
        are returned.
      </p>
    ),
  },
  {
    id: "subsurface",
    title: "Subsurface Conditions",
    body: (
      <p>
        Renter agrees to obtain any locating of underground utilities before delivery of rented items. Renter also agrees
        to reimburse {BRAND} for any additional costs incurred as a result of undisclosed or subsurface conditions
        resulting in an additional cost to us.
      </p>
    ),
  },
  {
    id: "hold-harmless",
    title: "Hold Harmless Agreement",
    body: (
      <>
        <p>
          Renter agrees to assume all risk and agrees to hold {BRAND} and any of its staff harmless from and against any
          and all claims, losses, liabilities, damages, costs, and expenses arising directly or indirectly out of or
          relating to:
        </p>
        <ul>
          <li>The delivery, loading, unloading, erection, installation, dismantling, and use of rented equipment</li>
          <li>Contact with underground utilities, pipes, or any condition on renter's property</li>
          <li>All necessary surface repairs</li>
        </ul>
      </>
    ),
  },
  {
    id: "deposit",
    title: "Deposit",
    body: (
      <p>
        Renter shall pay a deposit at the time of reservation. This fee is 25% of the total rental charge. The deposit is
        non-refundable.
      </p>
    ),
  },
  {
    id: "payment-terms",
    title: "Payment Terms",
    body: (
      <p>
        All orders are to be <strong>paid in full</strong> prior to 7 days before the event, before the time of delivery
        or customer pick-up. Accepted payment methods are Check, Visa, Discover, MasterCard, and American Express. Items
        will not be delivered or released unless the total is paid in full and we have received a signed rental contract.
        No exceptions. If payment is not made before 7 days prior to the event week, the remaining balance will be placed
        on the credit card on file. A credit card must be placed on file, regardless of the payment method.
      </p>
    ),
  },
  {
    id: "pricing",
    title: "Pricing",
    body: (
      <p>
        Pricing is subject to change without notice. Prices represented on our price list reflect a three-day rental
        period, which includes customer pick-up or delivery the day before the event, keeping the items for the day of the
        rental, and customer return or pick-up the day after the event. If you wish to rent items for an extended period,
        please contact a sales specialist for rates.
      </p>
    ),
  },
  {
    id: "cancellation",
    title: "Cancellation Policy",
    body: (
      <p>
        No refunds will be issued for items cancelled within 7 days prior to the event. Customers do, however, have the
        option to move the rental date — as long as all items are still available — within 12 months of the cancelled date.
        No changes to a reservation may be made within 7 days of the event.
      </p>
    ),
  },
  {
    id: "delivery",
    title: "Delivery / Pick-Up",
    body: (
      <>
        <p>
          Delivery and pick-up are available for an additional fee. Canopy and large items require delivery, set up, take
          down, and pick-up. For a weekend event we may deliver as early as Tuesday or Wednesday. If you are scheduled for
          a Friday delivery we may call you at the beginning of the week and move the delivery day up a day or two,
          depending on workload and weather conditions.
        </p>
        <p className="font-semibold">We cannot guarantee a specific delivery or pick-up time.</p>
        <p>
          To find out when your order is scheduled, please call the week of your event date indicated on your contract. If
          a specific delivery or pick-up time is needed, additional fees may apply. Pickups scheduled for Monday may be
          pushed back due to inclement weather or high workload. Your flexibility is greatly appreciated. Rental equipment
          is the customer's responsibility from the time of delivery until the time of pickup.
        </p>
        <p>Normal delivery prices represent the following requirements:</p>
        <ul>
          <li>Area is easily accessible to our trucks</li>
          <li>Equipment can be unloaded within 20 feet of the tailgate of the truck</li>
          <li>All delivered equipment is dropped off in stacks as close to your requested area as our delivery vehicle can reach, according to layout/directions submitted by the customer</li>
          <li>Delivery location must be on the first floor</li>
          <li>Delivery takes place during normal business hours, 9:00 a.m.–5:00 p.m., Monday–Friday</li>
          <li>Additional fees apply for deliveries or pick-ups outside business hours, once approved by management</li>
        </ul>
      </>
    ),
  },
  {
    id: "customer-pickup",
    title: "Customer Pick-Up / Returns",
    body: (
      <p>
        Customers may pick up most items from the {BRAND} warehouse during normal business hours to avoid delivery and
        pick-up charges. Items that are not available for customer pick-up include all tents, staging, and dance floor. If
        equipment is returned dirty the customer may be charged for cleaning. {BRAND} is not responsible for any damage to
        the customer's vehicle during loading or unloading. All items must be returned on the date listed on the invoice.
        If late, additional charges apply.
      </p>
    ),
  },
  {
    id: "final-inspection",
    title: "Returns — Final Inspection",
    body: (
      <p>
        {BRAND} reserves the right to modify charges for broken, missing, damaged, or dirty items up to 14 days after items
        have been received and prior to going through final inspection. Propane rentals will not be refunded for unused
        product.
      </p>
    ),
  },
  {
    id: "prior-to-pickup",
    title: "Prior to Pick-Up or Return",
    body: (
      <p>
        Rental items including tables and chairs should be stacked in the same manner they were delivered in. Linens should
        be dry and free of excess garbage to prevent mildew and staining. Additional charges will apply if restacking is
        necessary. Customer will pay the full replacement cost of linens with mildew or staining that cannot be removed
        during normal washing, as well as the full replacement cost for any rental items or storage containers missing
        upon pick-up.
      </p>
    ),
  },
  {
    id: "tents",
    title: "Tents",
    body: (
      <p>
        Prior to tent setup, the site must be clear of all sticks, patio furniture, yard decor, animal droppings, overhead
        tree limbs that may interfere, and debris. There must be at least a 5–10 ft clearance perimeter around the entire
        set-up area for all tents. Tents will not be set up under sap-producing or fruit trees. All tents we install must
        be anchored to the ground at all times — no exceptions. Our first priority is staking, which can generally be done
        in grass, dirt, or sand. Please know what is underground before we arrive; we are not responsible for any
        underground utilities, sprinkler systems, septic systems, etc. Overhead clearance (electrical wire, tree branches,
        etc.) is also necessary. If set-up is required on concrete, pavement, gravel, or any other surface where stakes
        are not permitted or able to be used, we use water barrels at an additional cost. Permits for tents are the
        customer's responsibility. Water barrel anchoring is a last resort. We reserve the right to refuse to install tents
        if inclement weather, including wind, is expected. Customer assumes all responsibility for tents anchored by water
        barrels and is held liable for any damages or injuries (including death) associated with failure due to water
        barrel usage.
      </p>
    ),
  },
  {
    id: "sidewalls",
    title: "Sidewalls",
    body: (
      <p>
        Sidewalls are an additional cost and not included in the price of tents. Sidewalls are to be installed and removed
        by {BRAND}. In the case of high winds, if {BRAND} is not present, sides must be removed as they take away from the
        durability of the tent in high-wind situations.
      </p>
    ),
  },
  {
    id: "equipment-responsibility",
    title: "Equipment Responsibility",
    body: (
      <p>
        All items are to be inspected by the customer at the time of drop-off. If there are problems with the items,
        {" "}{BRAND} must be notified before the event. Renter is responsible for equipment from time of possession to time
        of return, and assumes the entire risk of loss regardless of cause. If items are lost, stolen, or damaged, renter
        will assume all costs of replacement or repair, including all labor costs. Renter shall pay a reasonable cleaning
        charge for rented items returned dirty. Any items not wanted upon delivery are still to be paid for by the
        customer.
      </p>
    ),
  },
  {
    id: "emergency",
    title: "Emergency Line",
    body: (
      <p>
        If the renter fails to contact {BRAND} directly after experiencing an issue with a rental item, no refunds,
        discounts, or other compensation will be provided. This policy is strictly enforced with no exceptions.
      </p>
    ),
  },
  {
    id: "promotional",
    title: "Promotional",
    body: (
      <p>
        The renter acknowledges that {BRAND} may use photos of events for promotional and marketing purposes.
      </p>
    ),
  },
];

export const Route = createFileRoute("/rental-contract")({
  component: RentalContractPage,
  head: () => ({
    meta: [
      { title: "Rental Contract — Pacific North Events & Tents" },
      {
        name: "description",
        content:
          "Preview the standard rental contract for Pacific North Events & Tents — payment, deposits, delivery, tents, cancellations, and care of equipment.",
      },
      { property: "og:title", content: "Rental Contract — Pacific North Events & Tents" },
      {
        property: "og:description",
        content:
          "A sample preview of the rental terms we use for tents, tables, and event equipment on the Oregon Coast.",
      },
      { property: "og:url", content: "https://pacificnorthrentals.com/rental-contract" },
    ],
    links: [{ rel: "canonical", href: "https://pacificnorthrentals.com/rental-contract" }],
  }),
});

function RentalContractPage() {
  return (
    <SiteLayout>
      <div className="bg-[color:var(--bg)] text-[color:var(--ink)]">
        <header className="border-b border-[color:var(--line)] bg-[color:var(--bg-elev)]">
          <div className="mx-auto max-w-5xl px-6 py-12">
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">Sample document</p>
            <h1 className="mt-2 font-serif text-4xl md:text-5xl">Rental Contract</h1>
            <p className="mt-4 max-w-2xl text-[color:var(--muted)]">
              This is a preview of the standard terms used by {BRAND}. Your final, signable contract is generated with
              each reservation and may include event-specific addenda. Please review carefully — by signing your rental
              agreement you accept these terms.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-full border border-[color:var(--line)] px-5 py-2 text-sm hover:bg-[color:var(--bg-elev-2)]"
              >
                Print / Save as PDF
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

        <div className="mx-auto grid max-w-5xl gap-10 px-6 py-12 lg:grid-cols-[220px_1fr]">
          <aside className="hidden lg:block print:hidden">
            <nav className="sticky top-24 text-sm">
              <p className="mb-3 text-xs uppercase tracking-wider text-[color:var(--muted)]">Contents</p>
              <ul className="space-y-2">
                {sections.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="text-[color:var(--muted)] hover:text-[color:var(--ink)]">
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <article className="prose prose-neutral max-w-none prose-headings:font-serif prose-headings:text-[color:var(--ink)] prose-p:text-[color:var(--ink)] prose-li:text-[color:var(--ink)] prose-strong:text-[color:var(--ink)]">
            {sections.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <h2 className="mt-10 text-2xl">{s.title}</h2>
                <div className="space-y-4">{s.body}</div>
              </section>
            ))}

            <hr className="my-12 border-[color:var(--line)]" />
            <p className="text-sm text-[color:var(--muted)]">
              Last updated for the 2026 season. {BRAND} reserves the right to update these terms; the version attached to
              your signed rental agreement governs your reservation.
            </p>
          </article>
        </div>
      </div>
    </SiteLayout>
  );
}
