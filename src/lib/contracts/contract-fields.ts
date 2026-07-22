// Field schemas describing what each contract collects. Kept client-safe so
// the fill form and the PDF renderer share the same structure.

export type ContractFieldType = "text" | "email" | "tel" | "date" | "time" | "number" | "textarea" | "select";

export interface ContractField {
  name: string;
  label: string;
  type: ContractFieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  helpText?: string;
  maxLength?: number;
}

export interface ContractFieldGroup {
  heading: string;
  fields: ContractField[];
}

export interface ContractFormSchema {
  id: string;
  title: string;
  agreementSummary: string;
  groups: ContractFieldGroup[];
}

const CUSTOMER_GROUP: ContractFieldGroup = {
  heading: "Your information",
  fields: [
    { name: "customer_name", label: "Full name", type: "text", required: true, maxLength: 120 },
    { name: "customer_email", label: "Email", type: "email", required: true, maxLength: 200 },
    { name: "customer_phone", label: "Phone", type: "tel", required: true, maxLength: 40 },
    { name: "billing_address", label: "Billing address", type: "textarea", required: true, maxLength: 300 },
  ],
};

const EVENT_GROUP: ContractFieldGroup = {
  heading: "Event details",
  fields: [
    { name: "event_type", label: "Event type", type: "text", placeholder: "e.g. Wedding, birthday", maxLength: 80 },
    { name: "event_date", label: "Event date", type: "date", required: true },
    { name: "event_location", label: "Event location / delivery address", type: "textarea", required: true, maxLength: 300 },
    { name: "guest_count", label: "Estimated guest count", type: "number" },
  ],
};

export const CONTRACT_SCHEMAS: Record<string, ContractFormSchema> = {
  "rental-contract": {
    id: "rental-contract",
    title: "Rental Contract",
    agreementSummary:
      "By signing, you agree to the Pacific North Events & Tents rental terms — payment, deposits, delivery, tents, cancellations, and care of equipment — as posted on the rental contract page.",
    groups: [
      CUSTOMER_GROUP,
      EVENT_GROUP,
      {
        heading: "Rental period",
        fields: [
          { name: "delivery_date", label: "Delivery / setup date", type: "date", required: true },
          { name: "pickup_date", label: "Pickup / teardown date", type: "date", required: true },
          {
            name: "rental_items",
            label: "Items being rented (as quoted)",
            type: "textarea",
            required: true,
            helpText: "Paste the list from your quote, or briefly describe.",
            maxLength: 2000,
          },
        ],
      },
    ],
  },
  "beacon-contract": {
    id: "beacon-contract",
    title: "The Beacon Venue Rental Agreement",
    agreementSummary:
      "By signing, you agree to the terms of The Beacon on Broadway rental agreement — deposits, alcohol policy, insurance, cancellation, and care of the venue — as posted on the rental contract page.",
    groups: [
      CUSTOMER_GROUP,
      {
        heading: "Event at The Beacon",
        fields: [
          { name: "event_type", label: "Event type", type: "text", required: true, maxLength: 80 },
          { name: "event_date", label: "Event date", type: "date", required: true },
          { name: "event_start_time", label: "Start time (includes setup)", type: "time", required: true },
          { name: "event_end_time", label: "End time (includes cleanup)", type: "time", required: true },
          { name: "guest_count", label: "Guest count", type: "number", required: true },
          { name: "alcohol_served", label: "Will alcohol be served?", type: "select", options: ["No", "Yes"], required: true },
          { name: "event_contact", label: "On-site event contact (name + phone)", type: "text", required: true, maxLength: 160 },
        ],
      },
    ],
  },
  "catering-contract": {
    id: "catering-contract",
    title: "Catering Contract",
    agreementSummary:
      "By signing, you agree to the Pacific North Catering terms — deposits, cancellations, 18% gratuity, portion sizes, and guarantees — as posted on the rental contract page.",
    groups: [
      CUSTOMER_GROUP,
      {
        heading: "Catering event",
        fields: [
          { name: "event_date", label: "Event date", type: "date", required: true },
          { name: "event_start_time", label: "Service start time", type: "time", required: true },
          { name: "event_end_time", label: "Service end time", type: "time", required: true },
          { name: "event_location", label: "Venue / event location", type: "textarea", required: true, maxLength: 300 },
          { name: "guest_count_estimated", label: "Estimated guest count", type: "number", required: true },
          { name: "guest_count_guaranteed", label: "Guaranteed guest count (if known)", type: "number" },
          {
            name: "menu_selection",
            label: "Menu selection (from catering page)",
            type: "textarea",
            required: true,
            helpText: "e.g. Silver Buffet + Taco Bar add-on, dietary notes",
            maxLength: 2000,
          },
        ],
      },
    ],
  },
  "credit-card-authorization": {
    id: "credit-card-authorization",
    title: "Credit Card Authorization",
    agreementSummary:
      "By signing, you authorize Damarkom, Inc. DBA Pacific North Events & Tents to charge the card on file for damages or unreturned rental equipment, as described in the authorization form.",
    groups: [
      {
        heading: "Cardholder",
        fields: [
          { name: "customer_name", label: "Cardholder name (as on card)", type: "text", required: true, maxLength: 120 },
          { name: "customer_email", label: "Email", type: "email", required: true, maxLength: 200 },
          { name: "customer_phone", label: "Phone", type: "tel", required: true, maxLength: 40 },
          { name: "billing_address", label: "Billing address", type: "textarea", required: true, maxLength: 300 },
        ],
      },
      {
        heading: "Card on file",
        fields: [
          {
            name: "card_type",
            label: "Card type",
            type: "select",
            options: ["Visa", "Mastercard", "American Express", "Discover"],
            required: true,
          },
          {
            name: "card_last4",
            label: "Last 4 digits of card number",
            type: "text",
            required: true,
            maxLength: 4,
            helpText: "For your security we only collect the last 4 digits online. Full card details are captured by phone once we call to confirm.",
          },
          { name: "card_expiration", label: "Expiration (MM/YY)", type: "text", required: true, maxLength: 5, placeholder: "MM/YY" },
        ],
      },
      {
        heading: "Related event (optional)",
        fields: [
          { name: "event_date", label: "Event date", type: "date" },
          { name: "event_location", label: "Event location", type: "text", maxLength: 200 },
        ],
      },
    ],
  },
};

export function getContractSchema(id: string): ContractFormSchema | null {
  return CONTRACT_SCHEMAS[id] ?? null;
}
