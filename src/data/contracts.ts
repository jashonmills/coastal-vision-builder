import catering from "@/assets/contracts/catering-contract.pdf.asset.json";
import creditCard from "@/assets/contracts/credit-card-authorization.pdf.asset.json";
import rental from "@/assets/contracts/rental-contract.pdf.asset.json";
import beacon from "@/assets/contracts/beacon-contract.pdf.asset.json";

export type ContractSection = { heading: string; paragraphs: string[] };

export type ContractDoc = {
  id: string;
  category: "Rental" | "Venue" | "Catering" | "Payment";
  title: string;
  subtitle: string;
  description: string;
  downloadUrl: string;
  downloadFilename: string;
  fileType: "PDF" | "DOCX";
  sections: ContractSection[];
};

export const contracts: ContractDoc[] = [
  {
    id: "rental-contract",
    category: "Rental",
    title: "Rental Contract",
    subtitle: "Tents, tables, chairs, and event equipment",
    description:
      "Standard rental terms for Pacific North Events & Tents — payment, deposits, delivery, tents, cancellations, and care of equipment.",
    downloadUrl: rental.url,
    downloadFilename: "pacific-north-rental-contract.pdf",
    fileType: "PDF",
    sections: [
      {
        heading: "Severability & Responsibility of Use — Disclaimer of Warranties",
        paragraphs: [
          "The provisions of this rental contract shall be severable so that the unenforceability or waiver of one provision shall not affect the remaining provisions.",
          "You are responsible for the use of the rented items. You assume all risks inherent to the operation and use of rented items, and agree to assume the entire responsibility for the defense of, and to pay, indemnify, and hold Pacific North Events & Tents harmless from, and hereby release Pacific North Events & Tents from, any and all claims for damage to property or bodily injury (including death) resulting from the use, operation, or possession of the items — whether or not it be claimed or found that such damage or injury resulted in whole or part from our negligence, from the defective condition of the items, or any other cause.",
          "YOU AGREE THAT NO WARRANTIES EXPRESSED OR IMPLIED, INCLUDING MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE, HAVE BEEN MADE IN CONNECTION WITH THE EQUIPMENT RENTED.",
        ],
      },
      {
        heading: "Equipment Failure",
        paragraphs: [
          "You agree to immediately discontinue the use of rented items should they at any time become unsafe or in a state of disrepair, and will immediately (one hour or less) notify Pacific North Events & Tents of the facts. We agree, at our discretion, to make the items operable within a reasonable time, provide a like item if available, make a like item available at another time, or adjust rental charges. This provision does not relieve the renter from the obligations of the contract. In all events, we shall not be responsible for injury or damage resulting from failure or defect of rented items.",
        ],
      },
      {
        heading: "Use of Equipment",
        paragraphs: [
          "Renter agrees and covenants to be satisfied with the instruction and condition of equipment rented and of the proper and safe use of equipment. Renter further agrees that the items will be used only at the address listed on the contract, and only for the purpose for which they were intended and manufactured. Subleasing or improper use is prohibited.",
        ],
      },
      {
        heading: "Time of Return & Late Returns",
        paragraphs: [
          "Renter's right of possession terminates upon the expiration of the rental period set forth on the contract. Time is of the essence in this contract. Any extension must be agreed upon in writing.",
          "Renter shall return rented items during regular business hours, promptly upon or prior to the expiration of the rental period. If the renter does not timely return the items, the rental rate shall continue until items are returned.",
        ],
      },
      {
        heading: "Payment",
        paragraphs: [
          "Renter shall pay all charges payable under this contract in advance. Renter shall pay all reasonable costs of collections, court, and attorney fees. If rental charges are not paid within seven (7) days of the due date, Pacific North Events & Tents at our discretion may re-calculate rental charges on a daily basis and charge the credit card on file. Renter shall pay a service charge of 2.0% per month on all past-due accounts. There will be a $35.00 charge on any returned checks for any reason.",
        ],
      },
      {
        heading: "Additional Charges",
        paragraphs: [
          "In addition to other charges, the renter shall pay charges in accordance with company rates then in effect for: delivery or pickup; delivery or pickup from any location other than ground level; setup/knockdown of tables and chairs; delivery and pickup after business hours, Saturdays, Sundays, and Holidays; service calls; site planning and preparation; and last-minute or rush orders.",
        ],
      },
      {
        heading: "Care of Equipment & Insurance",
        paragraphs: [
          "Renter shall pay a reasonable cleaning charge for items returned dirty and shall protect the rented items from weather damage, breakage, unauthorized or improper use, theft, or loss while in the possession of the renter.",
          "Renter shall maintain, at renter's expense, liability, property, and casualty insurance coverage in an amount sufficient to fully protect Pacific North Events & Tents and its equipment against any and all claims, loss, or damage of whatever nature or type.",
        ],
      },
      {
        heading: "Site Preparation, Permits & Subsurface Conditions",
        paragraphs: [
          "Renter agrees to have the site clean and ready for delivery and installation, or dismantled and ready for pickup, and agrees to pay an additional charge for any delay and any labor charges resulting from renter's failure to do so.",
          "Renter agrees to obtain, at renter's expense, all necessary permits, licenses, and consents prior to installation of any rental equipment, including tents.",
          "Renter agrees to obtain any locating of underground utilities before delivery. Renter agrees to reimburse us for any additional costs incurred as a result of undisclosed or subsurface conditions.",
        ],
      },
      {
        heading: "Hold Harmless Agreement",
        paragraphs: [
          "Renter agrees to assume all risk and hold Pacific North Events & Tents and its staff harmless from any and all claims, losses, liabilities, damages, costs, and expenses arising directly or indirectly out of or relating to: the delivery, loading, unloading, erection, installation, dismantling, and use of rented equipment; contact with underground utilities, pipes, or any condition on renter's property; and all necessary surface repairs.",
        ],
      },
      {
        heading: "Deposit & Payment Terms",
        paragraphs: [
          "Renter shall pay a deposit at the time of reservation. This fee is 25% of the total rental charge. The deposit is non-refundable.",
          "All orders are to be paid in full prior to 7 days before the event, before the time of delivery or customer pick-up. Accepted payment methods are Check, Visa, Discover, MasterCard, and American Express. Items will not be delivered or released unless the total is paid in full and we have received a signed rental contract. No exceptions. If payment is not made before 7 days prior to the event, the remaining balance will be placed on the credit card on file. A credit card must be placed on file, regardless of the payment method.",
        ],
      },
      {
        heading: "Pricing & Cancellation Policy",
        paragraphs: [
          "Pricing is subject to change without notice. Prices reflect a three-day rental period, which includes customer pick-up or delivery the day before the event, keeping the items for the day of the rental, and customer return or pick-up the day after the event. For extended rentals, please contact a sales specialist for rates.",
          "No refunds will be issued for items cancelled within 7 days prior to the event. Customers do have the option to move the rental date — as long as all items are still available — within 12 months of the cancelled date. No changes to a reservation may be made within 7 days of the event.",
        ],
      },
      {
        heading: "Delivery / Pick-Up",
        paragraphs: [
          "Delivery and pick-up are available for an additional fee. Canopy and large items require delivery, set up, take down, and pick-up. For a weekend event we may deliver as early as Tuesday or Wednesday. We cannot guarantee a specific delivery or pick-up time. Pickups scheduled for Monday may be pushed back due to inclement weather or high workload. Rental equipment is the customer's responsibility from the time of delivery until the time of pickup.",
          "Normal delivery prices assume: area is easily accessible to our trucks; equipment can be unloaded within 20 ft of the tailgate; delivery on the first floor; and delivery during normal business hours, 9:00 a.m.–5:00 p.m., Monday–Friday. Additional fees apply for deliveries outside business hours.",
        ],
      },
      {
        heading: "Customer Pick-Up / Returns & Final Inspection",
        paragraphs: [
          "Customers may pick up most items from our warehouse during normal business hours. Items not available for customer pick-up include all tents, staging, and dance floor. If equipment is returned dirty the customer may be charged for cleaning. All items must be returned on the date listed on the invoice; late returns incur additional charges.",
          "Pacific North Events & Tents reserves the right to modify charges for broken, missing, damaged, or dirty items up to 14 days after items have been received and prior to going through final inspection. Propane rentals will not be refunded for unused product.",
        ],
      },
      {
        heading: "Prior to Pick-Up or Return",
        paragraphs: [
          "Rental items including tables and chairs should be stacked in the same manner they were delivered. Linens should be dry and free of excess garbage to prevent mildew and staining. Additional charges will apply if restacking is necessary. Customer will pay the full replacement cost of linens with mildew or staining that cannot be removed during normal washing, as well as full replacement cost for any missing rental items or storage containers.",
        ],
      },
      {
        heading: "Tents & Sidewalls",
        paragraphs: [
          "Prior to tent setup the site must be clear of sticks, patio furniture, yard decor, animal droppings, overhead tree limbs, and debris. There must be a 5–10 ft clearance perimeter around the entire setup area. Tents will not be set up under sap-producing or fruit trees. All installed tents must be anchored at all times — no exceptions. Staking is our first priority (grass, dirt, or sand). Please know what is underground before we arrive; we are not responsible for underground utilities, sprinkler systems, septic systems, etc. Overhead clearance is also necessary. On surfaces where stakes cannot be used we use water barrels at an additional cost. Permits for tents are the customer's responsibility. Water barrel anchoring is a last resort. We reserve the right to refuse to install tents if inclement weather is expected. Customer assumes all responsibility for tents anchored by water barrels.",
          "Sidewalls are an additional cost and not included in the price of tents. Sidewalls are to be installed and removed by Pacific North Events & Tents. In case of high winds, if we are not present, sides must be removed as they take away from the durability of the tent.",
        ],
      },
      {
        heading: "Equipment Responsibility, Emergency Line & Promotional",
        paragraphs: [
          "All items are to be inspected by the customer at drop-off. Renter is responsible for equipment from time of possession to time of return and assumes the entire risk of loss regardless of cause. If items are lost, stolen, or damaged, renter will assume all costs of replacement or repair, including labor. Renter shall pay a reasonable cleaning charge for items returned dirty. Any items not wanted upon delivery are still to be paid for.",
          "If the renter fails to contact Pacific North Events & Tents directly after experiencing an issue with a rental item, no refunds, discounts, or other compensation will be provided. This policy is strictly enforced.",
          "The renter acknowledges that Pacific North Events & Tents may use photos of events for promotional and marketing purposes.",
        ],
      },
    ],
  },
  {
    id: "beacon-contract",
    category: "Venue",
    title: "The Beacon Venue Rental Agreement",
    subtitle: "735 Broadway, Seaside, Oregon",
    description:
      "Full agreement for reserving The Beacon on Broadway — deposits, alcohol policy, insurance, and cancellation policy.",
    downloadUrl: beacon.url,
    downloadFilename: "the-beacon-venue-rental-agreement.pdf",
    fileType: "PDF",
    sections: [
      {
        heading: "Reservations & Payment",
        paragraphs: [
          "Reservations for The Beacon are accepted on a first-come, first-served basis. A signed rental agreement, a refundable security deposit, and a non-refundable reservation fee are required to reserve a date. To reserve a specific date and time, this contract must be signed, dated, and accompanied with a $250 refundable security deposit as well as the $250 non-refundable reservation fee that will be put toward the total rental fee.",
          "The balance for all rental contracts is to be paid in full no later than 30 days prior to the event date. For rentals arranged less than 30 days in advance, payment in full is due with the completed and signed contract agreement.",
          "The Beacon is booked through Pacific North Events & Tents. Please make checks payable to Pacific North Events & Tents. We also accept Visa, Mastercard, Discover, and American Express. Card transactions may reflect as either 'Damarkom Inc.' or 'Sign1 Sign Crafters'. Confirmations will be mailed or emailed along with a copy of the rental agreement within 7 business days.",
        ],
      },
      {
        heading: "Scope of Agreement",
        paragraphs: [
          "This rental agreement is between Pacific North Events & Tents, on behalf of The Beacon on Broadway (the 'facility' or 'The Beacon'), and the Renter. The Beacon Venue has been reserved for the date and time stipulated. The hours assigned to your event include all set up and clean up — including set up and clean up of all subcontractors you may use.",
          "You will adhere to and follow the terms of this agreement, and will be responsible for any damage to the premises and site, including the behavior of your guests, invitees, agents, or sub-contractors resulting from your use of the venue.",
        ],
      },
      {
        heading: "Use of Premises",
        paragraphs: [
          "The facility is to be used only for the stated purpose(s) in this agreement, and only during the time of your rental. We recommend designating a specific event contact (not a member of the bridal party) to communicate directly with our facility manager.",
          "Smoking is prohibited in the facility. No rice, confetti, or glitter is allowed. All decorations must be approved prior to the event, and taken down and removed on the last day of the rental. No pets are allowed except service animals. Candles must be in holders that prevent wax from dripping onto surfaces. Children must always be supervised.",
          "Limited parking is available in the designated parking lot behind The Beacon, marked 'Reserved for 733-737 Broadway.' This lot is shared by other tenants. Cars parked in spaces marked for other businesses are subject to tow. Street parking is available on nearby streets, subject to any posted restrictions.",
          "Included in the rental price: (10) 6-foot round tables, (10) 5-foot round tables, (2) 8-foot banquet tables, 150 black chairs, and access to the storage and staging area for caterers where there is a fridge, microwave, and some chafing pans. Sterno cans are the renter's responsibility.",
        ],
      },
      {
        heading: "Set-up and Breakdown",
        paragraphs: [
          "Do not use nails, tacks, or staples in walls or woodwork. If tape is used, it must be painter's tape. All decorations and tape must be removed at the end of the event rental period.",
          "It is the renter's responsibility to clean up any mess created by the event and return the facility to the state in which it was provided — including decorations, food/beverage containers, event trash, etc. All trash and recyclables must be transferred in garbage bins to avoid spillage to the outside receptacles.",
          "Notify the Facility Manager immediately of any damages that occur during the event.",
        ],
      },
      {
        heading: "Security Deposit; Property Damage",
        paragraphs: [
          "If damage to the facility exceeds the $250 security deposit, the renter agrees to pay for or replace any object that is destroyed, damaged, or stolen during the event. Such payment or replacement must be made immediately upon request. Refunds owed for the $250 security deposit will be processed and submitted within 30 days after the event date.",
        ],
      },
      {
        heading: "Indemnification & Hold Harmless",
        paragraphs: [
          "The Renter assumes full responsibility and liability for any and all damages to the facility. The Renter agrees to indemnify and hold harmless Pacific North Events & Tents, The Beacon, its owners, officers, staff, and agents from any and all claims, actions, suits, costs, damages, and liabilities resulting from breach of this agreement, negligent actions, willful misconduct, or omissions of the Renter and Renter's guests, invitees, agents, or sub-contractors.",
        ],
      },
      {
        heading: "Personal & Abandoned Property",
        paragraphs: [
          "Pacific North Events & Tents, The Beacon, and its representatives assume no responsibility for any property placed in the facility or on the premises, or any property that is left on the premises after the event is over.",
        ],
      },
      {
        heading: "Event Insurance",
        paragraphs: [
          "Renter must provide a certificate of Liability Insurance 30 days prior to the event. The certificate must explicitly state: $1,000,000 Bodily Injury and Property Damage Liability Limits; $1,000,000 Host Liquor Liability (if alcohol is served); and Pacific North Events & Tents and The Beacon named as additional insured.",
          "Failure to provide evidence of this insurance 30 days prior to the event can cause immediate cancellation. Cancellations resulting from failure to provide a timely certificate of liability insurance will be treated as the renter choosing to cancel — refer to Cancellation Policy (below).",
        ],
      },
      {
        heading: "Alcohol Policy",
        paragraphs: [
          "The managing and distribution of alcohol at your event is to be performed by catering booked through Pacific North Events & Tents or by the renter's own services. Any guest who appears to be 30 years of age or under shall be carded by the bartender and must present a valid driver's license or valid picture ID.",
          "No alcohol is allowed to be consumed on the street, sidewalk, or parking area, or in hallways, stairways, or the downstairs area of the facility.",
        ],
      },
      {
        heading: "Cancellation Policy",
        paragraphs: [
          "All cancellations must be made in writing. If the Renter chooses to cancel within 30 days of the contracted event date, the entire rental fee is non-refundable.",
          "Pacific North Events & Tents may cancel rentals for reasons including flooding, earthquakes, fires, power outages, emergency conditions, or events beyond our control. In such cases, all rental fees and the security deposit will be refunded.",
        ],
      },
    ],
  },
  {
    id: "catering-contract",
    category: "Catering",
    title: "Catering Contract",
    subtitle: "Pacific North Catering — buffet, chef stations, bartending",
    description:
      "Catering agreement covering event details, deposits, cancellations, gratuity, and portion sizes.",
    downloadUrl: catering.url,
    downloadFilename: "pacific-north-catering-contract.docx",
    fileType: "DOCX",
    sections: [
      {
        heading: "Event Details Recorded on Contract",
        paragraphs: [
          "Each catering contract records: estimated guests, guaranteed guests, event date, start time, end time, price per person, subtotal, 18% gratuity, total, and 20% non-refundable deposit (based on subtotal).",
          "Customer details include contact name, email, and phone. Venue details include the event location. The finalized menu is attached to the contract.",
        ],
      },
      {
        heading: "Payment & Deposit",
        paragraphs: [
          "20% of the estimated contract cost is due at the time of signed contract unless other arrangements have been agreed to. The deposit is non-refundable. Final payment is due in full no later than 12 days prior to the event.",
        ],
      },
      {
        heading: "Cancellations",
        paragraphs: [
          "Deposits and payments are non-refundable if the client cancels a contracted food event within 12 days prior to the event.",
          "Payments are refundable in full, less the 20% deposit, if the client cancels a contracted food event 13 days or more prior to the event.",
          "Pacific North Catering / Damarkom Inc. reserves the right to terminate this contract for any valid reason. All deposits and payments will be returned in full within (10) days.",
        ],
      },
      {
        heading: "Gratuity & Service",
        paragraphs: [
          "Gratuity is not included in the per-person pricing. Pacific North Catering / Damarkom Inc. will add an 18% gratuity to the final bill.",
        ],
      },
      {
        heading: "Guarantees",
        paragraphs: [
          "Pacific North Catering / Damarkom Inc. must be notified of the exact number of people to guarantee services for no later than 12 days prior to the event. If a guaranteed service number is not received, the original estimated attendance count will be prepared and charged.",
        ],
      },
      {
        heading: "Portion Sizes",
        paragraphs: [
          "Most menu items are sold on a per-guest basis, with generous portion sizes determined by our experienced catering staff. Exact quantities are available in advance on request.",
        ],
      },
      {
        heading: "Reservation & Non-Refund Notice",
        paragraphs: [
          "The event date will NOT be reserved until payment of the deposit has been received in full. Payment of the remaining balance is due 12 days prior to the event. ALL DEPOSITS AND PAYMENTS ARE NON-REFUNDABLE IF THE EVENT IS CANCELLED WITHIN 12 DAYS PRIOR TO THE EVENT.",
        ],
      },
    ],
  },
  {
    id: "credit-card-authorization",
    category: "Payment",
    title: "Credit Card Authorization",
    subtitle: "For damages or unreturned equipment",
    description:
      "Authorization form allowing Pacific North Events & Tents to charge the card on file for damages or unreturned rental equipment.",
    downloadUrl: creditCard.url,
    downloadFilename: "pacific-north-credit-card-authorization.pdf",
    fileType: "PDF",
    sections: [
      {
        heading: "Purpose of Authorization",
        paragraphs: [
          "This authorization is for potential damages or failure to return the equipment you are renting. You will not be charged any fees additional to the rental fees unless we determine that you have damaged or failed to return equipment.",
          "By signing this form, you acknowledge that Damarkom, Inc. DBA (Pacific North) may charge the card on file through a card machine that processes under 'Sign1 Sign Crafters'. We may charge your credit card for damages or unreturned property. You will be notified in writing before charges are made to your credit card at the address listed on the form.",
        ],
      },
      {
        heading: "Information Collected",
        paragraphs: [
          "Cardholder name (as it appears on card), phone number, email address, credit card type (American Express, Discover, Mastercard, Visa), card number, expiration date, security code, and billing address.",
        ],
      },
      {
        heading: "Certification",
        paragraphs: [
          "The signer certifies that the statements and information made in the authorization are true and correct to the best of their knowledge, and that they are authorized to effect charges to the credit card number provided. In the case of any issues or disputes concerning the transaction, the signer will notify Damarkom, Inc. promptly to rectify the situation prior to notifying their credit card company.",
        ],
      },
    ],
  },
];
