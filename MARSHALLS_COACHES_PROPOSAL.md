# Coach Operations & Workshop Management System
## Proposed Software Solution

**Prepared for:** Marshall's Coaches  
**Prepared by:** [Your Company Name]  
**Date:** October 2026  
**Version:** 0.1 — DRAFT for Sanoop's review (not yet sent to client)  
**Based on:** Meeting of 7 October 2026 with Glen (MD), Michael (Bookings), Dean (Workshop), Natasha (Billing) and Vanessa (Payroll & Tacho)

> Part A below (§1–§11) is the client document. Part B at the end is internal and is removed before sending.

---

# PART A — Client proposal

## 1. Overview

Marshall's Coaches runs two businesses from one yard: a coach-hire operation serving schools, councils, tour operators and private customers across Buckingham, Milton Keynes and Bedford, and a maintenance workshop that services the company's own fleet of around 50 vehicles as well as external coaches, minibuses and double-deckers.

Today the work runs across several disconnected systems — Coach Manager for quotes and bookings, Distinctive VMS for workshop scheduling, Sage 50 for accounts, spreadsheets for driver records and fuel, and a drawer of stapled quotes and confirmations for the forward diary. Each hand-off between them is re-keyed by hand: 50–200 quotes a day typed from emails, up to 150 pre-departure checks a day done one by one, purchase invoices printed and entered manually, and remittances allocated from a printout.

This document proposes one system that carries a coach-hire job from the first email to the paid invoice, and a workshop job from the maintenance planner to the signed-off inspection record, with the compliance evidence the Traffic Commissioner expects produced as a by-product of the day's work rather than as extra admin.

Delivery is in three phases so the business can adopt it step by step, starting with the workshop and accounts, then coach hire, then the school-run season tickets.

---

## 2. Business Context

| Attribute | Detail |
|---|---|
| Sites | One depot; operating area Buckingham, Milton Keynes, Bedford (Brackley possible) |
| Fleet | c. 50 vehicles — coaches of various capacities, minibuses, double-deckers |
| Work mix | 85% of revenue from schools (season-ticket school runs + school hires); council contract routes; tours and private hire |
| Seasonality | 38 busy weeks, 14 quiet weeks; June–July peak |
| Enquiry volume | c. 100 emails/day (80% repeat customers) plus phone and website form; c. 70% convert |
| Quote volume | 50–200 per day, c. 5 minutes each |
| Pre-departure checks | Up to 150 per day, 3–5 minutes each |
| Compliance | PSV operator licence; OCRS score; drivers' hours; driver CPC, licence and DVS checks |
| Staying as they are | TruTac clocking-in (payroll), Fleetview vehicle tracking, Microlise Transport Resource Manager (tachograph), Triscan Fuel Hub, Sage Payroll, People's Pension |
| To be replaced | Coach Manager (quotes, bookings, sales ledger), Distinctive VMS (workshop), paper job sheets, the quote/confirmation drawer, driver and fuel spreadsheets |
| Accounts | Sage 50 today — see §9 for the two options |

---

## 3. Core Workflows

**Coach hire**

```
Enquiry (email / phone / web) → Draft quote (AI-read, formula-priced) → Quote sent
→ Customer accepts → Availability check (vehicle + driver) → Booking confirmed
→ Pre-departure check (7 days out) → Driver duty on the app → Journey completed
→ Invoice (deposit / balance / contract schedule) → Payment → Accounts
```

**Workshop**

```
Maintenance planner (PMI / annual test / tacho calibration due) or driver defect report
→ Workshop job sheet → Parts from stock or purchase order → Inspection record signed off
→ Vehicle declared roadworthy → (external customers) Invoice → Accounts
```

Every booking and every workshop job has one record that the whole office can see, with its full history, documents and messages attached.

---

## 4. Proposed Modules — Coach Hire

### Module 1 — Customers & Contacts

- One register for every customer: schools, councils, tour operators, event organisers and private individuals, each tagged by sector
- Account terms per customer: private hire (25% deposit, balance 10 days before travel), schools (14 days), councils and contract customers (fixed routes and prices, invoiced on a schedule)
- Contacts, sites and regular pick-up addresses stored once and reused on every quote
- Full history per customer: every enquiry, quote, booking, invoice and message in date order
- Repeat customers (80% of enquiries) are matched automatically when an email arrives

### Module 2 — Enquiries & AI-drafted Quotes

Replaces the 5 minutes per quote spent reading an email and re-typing it into Coach Manager.

- Enquiries arrive from three sources into one inbox: the bookings mailbox (e.g. `info@`), the website enquiry form (connected directly), and phone calls typed in on a short form
- **AI reads each email and drafts the quote**: pick-up and destination, dates and times, passenger numbers, vehicle type, return or one-way, and any extras mentioned. It recognises the customer and pre-fills from their last booking. The draft is reviewed and sent by Michael — nothing goes to a customer unseen
- Quotes are priced by the **pricing formula** (Module 3) and sent as a branded PDF from the bookings mailbox, with an "Accept this quote" link
- Quote status: draft → sent → accepted → booked, or expired / declined with a reason, so conversion is measured rather than guessed
- Follow-up prompts on quotes with no reply after a set number of days
- Amendments create a new quote version; the old one stays on record

### Module 3 — Pricing Engine

The current Coach Manager formula rebuilt as a transparent, editable calculation.

- Distance and journey time calculated automatically from the addresses (mapping service)
- Cost build-up per vehicle class: fuel per mile, maintenance per mile, driver wages per hour (including overnight), profit load, plus parking, tolls and hotel costs as itemised extras
- **Seasonal calendar**: peak weeks (June–July and other busy periods) carry no discount; quiet weeks allow a discount band (e.g. £5–£10) that a user can apply with a reason
- Vehicle type and availability on the date are shown while pricing, so a quote is not offered on a vehicle that is already out
- Every quote stores its cost breakdown, so management can see margin per job and per sector
- Rates are maintained by management in one settings screen; nobody edits a formula in a spreadsheet

### Module 4 — Bookings, Availability & Confirmation

Replaces the printed quote stapled to a confirmation and filed in a drawer.

- Accepting a quote creates a provisional booking; the system checks **vehicle and driver availability** for the date and flags clashes before it is confirmed
- Booking confirmation emailed (and optionally texted) to the customer from the bookings mailbox, with the itinerary, price and terms
- Booking diary by day and week: every journey, its vehicle, driver, status and outstanding actions on one screen
- Statuses: provisional → confirmed → pre-departure checked → dispatched → completed → invoiced, plus cancelled with cancellation charge rules
- Contract and regular work (council routes, school runs) set up once as **recurring bookings** across a term or contract period, so they are not re-entered week by week
- Every change is logged: who changed what, when, and the price before and after

### Module 5 — Vehicle & Driver Allocation

- Allocation board per day: drag a vehicle and driver onto each journey; conflicts, double-bookings and vehicles off the road for maintenance are highlighted
- Driver profile holds the records now kept on spreadsheets: licence check date, **Driver CPC card expiry**, DVS vehicle check, Digicard expiry, medical dates, with alerts before anything lapses
- Driver availability: fixed shift patterns, rest days and holidays recorded against the driver, so the board only offers drivers who can legally take the work
- Allocated duty hours shown per driver per day and fortnight as an early warning; the tachograph system (Microlise) remains the legal record of drivers' hours and is not replaced

### Module 6 — Pre-departure Checks

Turns up to 150 daily 3–5 minute checks into a worked list.

- Seven days before travel the system creates a **pre-departure task** for each journey with the details to confirm: exact addresses, contact person and phone, times, passenger count, special requirements
- One screen per task; confirmed details are stamped, changed details update the booking and, where they change the price, raise an amended quote for the customer to accept
- Pre-departure email (and optional SMS / WhatsApp) sent to the customer with the final itinerary and driver contact arrangements
- Changes are pushed to the driver's app automatically — nothing is printed and handed over unless a driver has no phone (printed job sheet remains available)

### Module 7 — Driver App

An installable app on the driver's phone (no app store needed), with a printed job sheet as the fallback.

- Today's duties with pick-up address, times, passenger count, customer contact and any notes; one tap opens the route in the phone's navigation app
- **Start and finish of each journey confirmed** by the driver, so the office sees live status and the journey is closed properly — today there is no confirmation of finishing
- **Incident log**: delay, breakdown, passenger issue, damage — with photos and time stamp — on the booking record
- Expenses: parking, tolls and other costs photographed and attached for recharge
- Daily vehicle walkaround check (see Module 10) completed in the same app
- Push notifications: new duty, time change, cancellation
- Vehicle GPS tracking stays with Fleetview; this app does not duplicate it

### Module 8 — Hire Billing & Payments

Replaces the Coach Manager sales ledger step for one-off work and automates the deposit cycle.

- Invoice generated from the completed booking with one click, inheriting itinerary, price, extras and the purchase order number where the customer requires one
- **Private hire**: 25% deposit invoice on confirmation, balance invoice due 10 days before travel, automated reminders at each step; travel date flagged if the balance is unpaid
- **Schools**: invoice on completion, 14-day terms; **councils and contracts**: invoices raised on the contract schedule (weekly, monthly, termly) without re-keying
- Payment recording (bank transfer, card, cash) and customer statements emailed from the system
- Payment status on every booking: Unpaid / Deposit paid / Paid / Overdue
- Sales invoices and payments flow to the accounts package automatically (§9)

### Module 9 — Customer Communications & Reviews

- Branded email templates for each stage: quote, acceptance, booking confirmation, deposit and balance reminders, pre-departure, completion, invoice
- Sent from Marshall's own mailbox (Microsoft 365 or Google Workspace); no generic system address
- **SMS and WhatsApp** for the short, time-critical messages (confirmation, pre-departure, driver on the way) — switchable per message type
- **Google review request** in the completion email, which directly addresses the aim of more Google reviews
- Every message sent is stored against the customer and the booking

---

## 5. Proposed Modules — Workshop & Fleet Compliance

### Module 10 — Fleet Register & Maintenance Planner

Replaces Distinctive VMS and the printed maintenance job sheets.

- Every vehicle on record: fleet number, registration, class (coach / minibus / double-decker), seating capacity, operator-licence disc, annual test date, tachograph calibration date, lift or tail-lift test, and external customers' vehicles alongside the fleet
- **Maintenance schedule per vehicle**: safety inspection (PMI) interval set per vehicle (six-weekly as the usual starting point, adjusted per vehicle as the DVSA guide allows), annual test, tacho calibration, and any other recurring item
- **Forward planner**: the system creates the workshop jobs ahead of their due dates and shows a 12-week wall chart of what is due, overdue and booked, so the allocation board (Module 5) knows which vehicles are off the road
- **Driver daily walkaround check** on the driver app, in the DVSA format: nil-defect records and reported defects both kept, with photos; a reported defect raises a workshop job immediately and the vehicle is flagged until the defect is signed off as rectified
- Inspection and defect records retained for the period the operator licence requires and exportable for a Traffic Commissioner or DVSA visit — the paper trail behind the OCRS score, produced automatically

### Module 11 — Workshop Jobs & Inspection Records

- Digital job sheet per job: vehicle, work requested, technician, parts, time, photos, notes; the printed sheet is no longer needed
- **Safety inspection record** completed on a tablet in the DVSA layout (all annual-test items, brake test figures, tyre tread and pressures, defects found and rectified) with the roadworthiness declaration signed by the inspecting technician — stored as a PDF against the vehicle
- Job statuses from booked through in-progress, awaiting parts and quality check to complete, visible to the office and to allocation
- **External customers**: a ballpark estimate marked "subject to inspection" is sent first; after inspection the actual work is itemised and the invoice reflects what was done — the two documents stay linked
- Rework and warranty returns tracked against the original job

### Module 12 — Parts, Stock & Purchasing

Gives the workshop the stock system it does not have today and removes the manual purchase-invoice entry.

- Shelf stock with quantities, minimum levels and re-order quantities; low-stock purchase suggestions grouped by supplier
- Parts booked to jobs from stock or ordered per job; barcode scanning on receipt
- **Purchase orders** for parts, consumables, equipment and services, with an approval limit
- **Supplier invoices read by AI**: photograph or upload the invoice and the system extracts supplier, lines, totals and VAT, matches it to the purchase order and flags price or quantity differences before it is approved for payment
- Approved supplier invoices flow to the accounts package as bills (§9) — no more printing, keying and filing

### Module 13 — Asset Register for Testing Equipment

- Register of valuable workshop equipment: description, serial number, value, calibration due dates, warranty, photos
- Location recorded per item (a technician or a workshop location) with calibration reminders
- Optional: GPS tags on the highest-value items so "Locate" shows where the kit is — quoted as an option in §10 because it needs a small tracking gateway

---

## 6. Management, Accounts & Platform

### Module 14 — Reporting & Dashboards

- Live dashboard, configurable per user: today's journeys and their status, drivers and vehicles out, quotes awaiting reply, pre-departure tasks outstanding, vehicles off the road, inspections due, unpaid balances with travel dates approaching
- Coach hire: quotes sent / won / lost and conversion rate; revenue and margin by sector (schools, councils, tours, private) and by month against the 38/14-week pattern; vehicle and driver utilisation
- Fuel: Triscan Fuel Hub data imported so miles-per-gallon is shown per vehicle and per driver, highlighting route deviation — replacing Michael's fuel spreadsheet
- Workshop: inspections due and overdue, defect turnaround time, parts spend by supplier, external workshop revenue
- Compliance pack: a one-click export of inspection, defect and driver-document records for an audit

### Module 15 — Roles & Permissions

Each person sees exactly what their role needs; permissions are enforced on the server, not just hidden in the screen.

| Role | Access |
|---|---|
| **Driver** | Driver app only: own duties, walkaround checks, incidents, expenses — no prices |
| **Bookings** (Michael) | Enquiries, quotes, bookings, pre-departure, allocation, customer comms |
| **Operations / Allocation** | Allocation board, driver records, availability |
| **Workshop** (Dean) | Fleet register, planner, jobs, inspections, stock, purchasing |
| **Billing** (Natasha) | Invoices, payments, statements, accounts feed, supplier invoice approval |
| **Management** (Glen) | Everything, all reports, pricing rates, settings |

### Module 16 — AI Assistance

Every AI feature drafts for a person to approve; nothing is sent or saved without a staff member confirming it, each feature has its own on/off switch, and all usage is logged with its cost.

- Enquiry email → draft quote (Module 2) — the largest single time saving in the business
- Supplier invoice capture (Module 12)
- "Improve with AI" on customer emails and notes: professional rewrite, shorten, plain English
- Pre-departure summary: the system drafts the confirmation message from the booking and any changes
- Not included: Teams meeting transcripts and general research (Copilot territory, available through Microsoft licences; we can advise separately)

### Module 17 — Integrations

| Integration | Purpose |
|---|---|
| **Xero** (or Sage 50 export — §9) | Sales invoices, payments, supplier bills |
| **Bookings mailbox** (Microsoft 365 / Google) | Read enquiries in; send quotes and confirmations out |
| **Website enquiry form** | Posts straight into the enquiry inbox |
| **Mapping / distance** | Distance and time for pricing; navigation link for drivers |
| **SMS / WhatsApp** | Confirmations and reminders |
| **Triscan Fuel Hub** | Fuel transactions import for MPG reporting |
| **Google Reviews** | Review link in completion email |
| **DVSA annual test history** | Test history per vehicle on the fleet record |
| **AI (Anthropic Claude)** | Modules 2, 12, 16 |
| **Fleetview, Microlise, TruTac, Triscan (operation), Sage Payroll** | Remain as today — not replaced, not duplicated |

---

## 7. Phase 3 — School Runs & Season Tickets

The school-run side is proposed as a separate third phase because it serves parents rather than the office, and is best introduced at a term boundary.

### Module 18 — Routes, Season Tickets & Parent Portal

- **Routes and stops** with term dates, timings and seat capacity per route and vehicle
- **Season tickets** (termly or annual) priced per route, sold through a **parent portal**: parents register their child, choose route and stop, pay online, and receive the ticket as a **QR code** in the portal and by email
- **Driver app scans the QR code** at boarding; a boarding log per journey shows who travelled, which also gives a safeguarding record of which children were on board
- **Waiting list** per route: when a seat frees up the next parent is offered it automatically with a time-limited link, replacing the start-of-term phone calls
- Renewal reminders before each term; bulk messages to all parents on a route (delay, cancellation, change of vehicle)
- Council-funded passes handled as a ticket type paid by the council on contract, so the same QR and boarding log applies
- Online card payment for parents through a payment provider (decision — §9)

---

## 8. Phased Delivery

| Phase | Scope | Indicative duration |
|---|---|---|
| **Phase 1 — Workshop, fleet compliance & accounts** | Modules 10–15, 17 (accounts feed, mailbox send), fleet and vehicle data migrated from VMS, training | 6–8 weeks |
| **Phase 2 — Coach hire** | Modules 1–9, 16, 17 (mailbox read-in, website form, mapping, SMS/WhatsApp, fuel import), customers and forward bookings migrated from Coach Manager, training; run alongside Coach Manager for an agreed overlap period | 14–16 weeks |
| **Phase 3 — School runs & season tickets** | Module 18, parent portal, online payments; launched for a term start | 8 weeks |

Phase 1 can start on signature. Phase 2 starts once Phase 1 is live; Phase 3 is scheduled against the school calendar.

---

## 9. Decisions Needed From Marshall's

1. **Accounts package.** Option A (recommended): move from Sage 50 to **Xero**, which has a supported migration from Sage and gives bank feeds, automatic remittance matching and reconciliation out of the box, and connects directly to the proposed system. Option B: stay on Sage 50 and receive invoice and bill exports in Sage import format (bank feeds and AutoEntry would then be set up within Sage). Either way the manual purchase-invoice entry stops.
2. **Coach Manager timing.** Distinctive are moving Coach Manager to the cloud in November. We suggest not entering a long-term commitment on the new hosting until Phase 2 timing is agreed; we will need a data export (customers, vehicles, forward bookings) from Distinctive for migration.
3. **Bookings mailbox.** Confirm whether `info@` is on Microsoft 365 or Google Workspace, so enquiries can be read in and quotes sent from it.
4. **Online payments for parents** (Phase 3): a payment provider such as Stripe or GoCardless, in Marshall's own name, is needed for season-ticket sales; fees are the provider's standard rates.
5. **WhatsApp**: requires a WhatsApp Business account in Marshall's name; SMS works without it.
6. **GPS asset tags** (Module 13 option): yes/no, and how many items.

---

## 10. Quotation

*All amounts exclude VAT at the standard rate. Draft figures for approval — basis in Part B §B4.*

### 10.1 Licence subscriptions

*All subscriptions are on calendar month rolling.*

| Licence | Price |
|---|---|
| A-Soft coach operations & workshop platform, incl. hosting and support | **£40 pm** |
| **Pro User** licence — office staff: bookings, operations, workshop manager, billing, management | **£30 pm** per user |
| **Basic User** licence — workshop technicians: job sheets, inspections, stock | **£10 pm** per user |
| **Driver App** licence — drivers: duties, walkaround checks, incidents, expenses | **£5 pm** per driver, capped at £250 pm |
| School-run portal & season tickets module (from Phase 3 go-live) | **£150 pm** |
| Native AI features, dependent on usage (token package) | Base £30 \| Medium £60 \| **Large £120** * |
| Optional — Agentic AI (conversational assistant / chatbot for customers and parents) | from £200 set up and £50 pm usage fee # |
| SMS and WhatsApp messages | passed through at provider cost (SMS c. 4–5p each) |

\* *free trial for first month. Large is recommended: the email-to-quote volume (c. 2,200 enquiries a month) sits above the Medium package.*  
\# *depending on requirements.*

Illustrative monthly totals for 8 office users, 4 technicians and up to 60 drivers:

| Stage | Platform | Pro | Basic | Drivers | Modules | AI | Total |
|---|---|---|---|---|---|---|---|
| Phase 1 live (workshop) | £40 | 4 × £30 = £120 | 4 × £10 = £40 | £250 | — | Base £30 | **£480 pm** |
| Phase 2 live (coach hire) | £40 | 8 × £30 = £240 | £40 | £250 | — | Large £120 | **£690 pm** |
| Phase 3 live (school runs) | £40 | £240 | £40 | £250 | £150 | £120 | **£840 pm** |

### 10.2 Implementation & changeover

| Item | Phase 1 | Phase 2 | Phase 3 |
|---|---|---|---|
| Project management | £500 | £500 | £500 |
| Configuration to requirements (approx. 1 month / 2 months / 1 month) | £1,500 | £3,000 | £1,500 |
| Integrations as required — P1: accounts package, mailbox sending; P2: mailbox read-in, mapping, SMS/WhatsApp, Triscan import; P3: payment provider | £1,000 | £2,000 | £1,000 |
| Data migration to new software, capturing history — P1: VMS vehicles and maintenance history; P2: Coach Manager customers, vehicles, forward bookings | £1,000 | £1,500 | — |
| Training for all users & implementation | £1,000 | £1,000 | £1,000 |
| **Subtotal** | **£5,000** | **£8,000** | **£4,000** |

Implementation total across the three phases: **£17,000**.

### 10.3 Development labour — new capabilities

The coach-hire, fleet-compliance and school-run capabilities are developed new for Marshall's. Development is charged at **£300 per day**. As the founding coach-operations client, Marshall's pays **50% of the development labour**; the remaining 50% is our investment in the platform, and the resulting capabilities are covered by the licences above for as long as they are held.

| Phase | What is developed | Days | Full labour | Marshall's share (50%) |
|---|---|---|---|---|
| 1 | Fleet register, maintenance planner, driver walkaround and defect reporting, safety inspection records | 17 | £5,100 | **£2,550** |
| 2 | Enquiry inbox with AI-drafted quotes, pricing engine, hire quotes, bookings and availability, allocation board and driver records, pre-departure tasks, driver app, hire billing with deposits and contract schedules, reporting | 60 | £18,000 | **£9,000** |
| 3 | Routes and capacity, season tickets, parent portal, QR tickets and boarding scan, waiting list, renewals and bulk messaging | 31 | £9,300 | **£4,650** |
| | **Total** | **108** | **£32,400** | **£16,200** |

Options (charged in full, not shared): GPS tags for testing equipment — tracking gateway and "Locate" map, 9 days £2,700 plus tags (c. £30–60 each); Sage 50 import files instead of Xero, 3 days £900.

### 10.4 Project fees and payment

| Phase | Implementation | Development share | **Phase total** | Payable |
|---|---|---|---|---|
| 1 — Workshop, fleet compliance & accounts | £5,000 | £2,550 | **£7,550** | £2,000 deposit at phase start; balance in three equal monthly instalments after go-live |
| 2 — Coach hire | £8,000 | £9,000 | **£17,000** | £5,000 deposit at phase start; balance in three equal monthly instalments after go-live |
| 3 — School runs & season tickets | £4,000 | £4,650 | **£8,650** | £2,500 deposit at phase start; balance in three equal monthly instalments after go-live |
| | **£17,000** | **£16,200** | **£33,200** | |

Licence subscriptions start at each phase's go-live and are invoiced monthly in advance on the users and drivers active that month.

**Included:** environment setup, configuration of rates, templates and terms, data migration from the exports Distinctive provide, on-site training per phase, and the first month of go-live support for each phase.  
**Not included:** third-party fees payable directly by Marshall's — Xero subscription, payment-provider fees, WhatsApp Business, SMS, mapping lookups beyond 10,000 a month, GPS tag hardware.  
**Validity:** 30 days from the date of this proposal.

---

## 11. Next Steps

1. Walk-through of the system using Marshall's own examples: an enquiry email turned into a quote, a booking through pre-departure to the driver app, a vehicle through the maintenance planner to a signed inspection record, and a supplier invoice captured by AI. 60–90 minutes, on site, with Glen, Michael, Dean and Natasha
2. Decisions in §9
3. Signature and Phase 1 start; request data exports from Distinctive

*Document version 0.1 — draft. All module scope is subject to final commercial agreement.*

---
---

# PART B — Internal notes (never sent to the client)

## B1. Framing rules

- **Solutions proposal in their vocabulary** (bookings, journeys, drivers, PMI, OCRS), not a GarageOS product pitch. Part A never says GarageOS, never says anything is "already built", and carries no built/new status column — what exists versus what is new lives only in B2/B3. Same rule as TF7 and the Autocure proposal.
- **Not changing** (Sanoop, 2026-10-23): TruTac clocking-in and the weekly/monthly wages process, and Fleetview vehicle tracking. Therefore **do not offer** Sprint 18 clocking/timesheets/kiosk, Sprint 22 vehicle GPS, or any payroll export, even though the notes describe spreadsheet adjustments (06:30 clock-in for 07:30 shift, lunch deductions). Leave as a later conversation only if they raise it.
- Microlise (tacho), Sage Payroll, People's Pension, Triscan as an operational fuel system: untouched. Triscan appears only as a file import for MPG reporting.
- Compliance framing is deliberately strong (OCRS, inspection records, walkaround checks, driver documents) — it is what the MD worries about and what nothing in their current stack produces cleanly.
- Autocure's "not an MOT centre / no MOT reminders" rule does not apply here: Marshall's is an O-licence operator with its own fleet; annual test and PMI reminders are core.
- The only new consumer-facing surface is the Phase 3 parent portal. It is also the piece with the most unknowns (payments, safeguarding data, scale per term), hence a separate phase and a separate line.

## B2. Requirement → existing capability → gap

| # | Requirement (meeting notes) | GarageOS today | Gap |
|---|---|---|---|
| 1 | Customers by sector with terms | Customers module (B2B/B2C, terms, labour rate) | Sector tag, deposit rule per customer type, contacts & regular addresses — small |
| 2 | Enquiry inbox, 100 emails/day, 80% repeat | Email send (M365/Google/SMTP/SendGrid). No mailbox read-in | Mailbox ingestion (Graph / IMAP), website form endpoint, customer matching — new |
| 3 | AI email → draft quote | AI module (4 features, Haiku, usage log, per-feature switches) | New feature on the same AI plumbing |
| 4 | Pricing formula (distance, fuel, maintenance, wages, profit, extras, vehicle type, season) | Labour rate/markup settings only | Pricing engine + mapping distance + seasonal calendar — new |
| 5 | Quote → accept → booking → confirmation | Quotes module is job/labour/parts shaped | New `hire-quotes` + `bookings` domain (do not bend workshop quotes to fit) |
| 6 | Availability check on vehicle + driver, drawer filing | Schedule view (technician lanes), assignments | Allocation board for vehicle+driver per journey; driver availability/shift patterns — new |
| 7 | Driver profile: CPC, licence check, DVS (spreadsheet) | Profile fields; HR records sprint (19) parked for Autocure | Driver document types with expiry + alerts — a slice of Sprint 19, built here |
| 8 | Pre-departure checks, 150/day | Follow-up scheduler pattern | Task generation T-7, confirm/amend screen, re-quote on price change — new |
| 9 | Driver app, route, no completion/incident logging | Field PWA (duties, timer, photos, push, panic) | Re-skin as driver duty list; start/finish, incidents, expenses, walkaround form — extend |
| 10 | Billing: deposits 25% + balance 10 days before; schools 14 days; contract routes fixed | Invoices, payments, statements, credit notes, Xero push, overdue chase | Deposit/balance schedule, contract-schedule invoicing, invoice-from-booking — extend |
| 11 | Remittances, bank feeds, purchase invoices manual | Procurement: suppliers, POs, supplier invoices, AI capture, Xero bills push, stock with re-order | Config only (Xero) or Sage CSV export (Cara pattern, 2–3 days) |
| 12 | Workshop: maintenance schedule per coach, job sheets printed | Jobs, checklists, QC gate, parts per job, PDFs | Fleet fields on Vehicle, recurring maintenance schedules + planner, PSV inspection checklist template + PDF, walkaround/defect entity — new |
| 13 | External jobs: ballpark quote subject to inspection, invoice actual | Quote → invoice flow | "Estimate" flag + wording — config |
| 14 | No stock system | Sprint 23 stock items, low-stock suggestions | Config |
| 15 | Testing equipment tracked physically; GPS tag asset register | Sprint 21 asset register (location dropdown, tracking device link) | Live Locate needs the Sprint 22 gateway — priced as option |
| 16 | Google reviews | Completion email with review link | Config |
| 17 | SMS / WhatsApp | Twilio SMS adapter exists | Enable SMS; WhatsApp via Twilio — small |
| 18 | Fuel spreadsheet, 6 mpg, route deviation | RAM mileage table (dormant) | Triscan CSV import + MPG per vehicle/driver — new, small |
| 19 | School runs: QR season tickets, waiting list, term-start call flood | Nothing | Phase 3 entirely new (routes, tickets, parent portal, payments, QR scan, waiting list) |
| 20 | Clocking, payroll, Fleetview, Microlise | Sprint 18 exists | **Out of scope by decision** |

## B3. Build estimate (days)

| Phase | Item | Days |
|---|---|---|
| 1 | Fleet fields on Vehicle (class, capacity, disc, test/calibration dates) + external vs fleet | 2 |
| 1 | Recurring maintenance schedules + forward planner wall chart + auto-created jobs | 6 |
| 1 | Walkaround check + defect report (driver app form, nil-defect, defect → job, rectification sign-off, retention) | 5 |
| 1 | PSV safety inspection checklist template + brake test fields + declaration + PDF | 4 |
| 1 | Estimate-subject-to-inspection config, stock/procurement/asset config, dashboards, roles | 2 |
| 1 | VMS data migration (vehicles, history CSV), training, go-live support | 3 |
| | **Phase 1** | **22** |
| 2 | Customers: sector, deposit rules, contacts/addresses | 1.5 |
| 2 | Enquiry inbox: mailbox read-in (Graph/IMAP), website form endpoint, customer matching | 6 |
| 2 | AI email → draft quote feature | 4 |
| 2 | Pricing engine + mapping distance + seasonal calendar + settings screen | 7 |
| 2 | Hire quotes: entity, PDF, send, accept link, versions, expiry, follow-ups | 5 |
| 2 | Bookings: availability check, confirmation, diary, statuses, recurring/contract bookings, change log | 8 |
| 2 | Allocation board, driver availability/shift patterns, driver documents with expiry alerts, duty-hours warning | 6 |
| 2 | Pre-departure tasks: generation, confirm/amend, re-quote, comms | 5 |
| 2 | Driver app: duties, start/finish, incidents, expenses, printed job sheet, push | 7 |
| 2 | Hire billing: invoice-from-booking, deposit/balance schedule + reminders, contract-schedule invoicing, PO numbers | 6 |
| 2 | SMS enable + WhatsApp (Twilio), templates, review link | 3 |
| 2 | Reporting: conversion, revenue/margin by sector, utilisation, Triscan import + MPG | 4 |
| 2 | Coach Manager migration (customers, vehicles, forward bookings), training, overlap support | 5 |
| | **Phase 2** | **67.5** |
| 3 | Routes, stops, term dates, capacity | 4 |
| 3 | Season-ticket products, sales, council-paid passes | 5 |
| 3 | Parent portal PWA: registration, child, route/stop, payment (Stripe/GoCardless) | 10 |
| 3 | QR ticket issue + driver scan + boarding log | 5 |
| 3 | Waiting list with auto-offer | 3 |
| 3 | Renewals, bulk messaging, reporting | 4 |
| | **Phase 3** | **31** |
| | **Total** | **~120 days** |
| opt | GPS asset tags: Traccar gateway on the VPS + Locate (Sprint 22 subset) | 8–10 + ops |
| opt | Sage 50 CSV export (sales + bills) | 2–3 |

Rough-order only; each phase gets its own `SPRINT_nn_PLAN.md` before code, per the usual flow.

## B4. Pricing basis and sensitivity

Structure mirrors the Autocure price sheet (Sanoop, 2026-10-26): rolling per-user licences + implementation & changeover lines + a deposit-then-instalments schedule. Autocure actuals for reference: platform £20 pm; Basic User £10 pm; Pro User £30 pm discounted £10 for life as founder client; AI Base £30 / Medium £60 (first month free); optional agentic AI from £200 setup + £50 pm; implementation PM £500 + config £1,500 (≈1 month) + integrations £1,000 + migration £1,000 + training £1,000 = £5,000; £1,000 deposit then equal instalments after go-live.

- **Platform £40 pm** (Autocure £20): a 50-vehicle operator with mailbox polling, a public parent portal and term-start spikes costs more to host; the planned 4 GB VPS (PRODUCTION_RELEASE_PLAN.md) is sized for Autocure — budget an 8 GB tier or a second box before Phase 2. Drop to £20 if you want parity.
- **Driver App licence £5 pm, capped £250**: a new tier. Drivers only use the app (duties, walkaround, incidents); charging £10 Basic for 60 drivers (£600 pm) would price us out and discourage rolling it out to every driver, which the walkaround compliance story depends on. The cap means driver headcount is not a sales objection. Driver count is unknown — B6 Q4.
- **Pro £30 / Basic £10**: list price, no founder discount on seats; the founder benefit here is the 50% development co-funding instead. If Sanoop wants the same optics as Autocure, Pro £30 → £25 for life costs ≈ £40 pm on 8 users.
- **AI Large £120 pm**: new tier above Medium. 100 emails/day ≈ 2,200 email-to-quote runs a month plus invoice capture; Haiku cost is a few pence per run, so margin is healthy. Token-package wording kept so overage is handled as with Autocure.
- **Development labour £300/day, 50% co-funded**: 108 dev days (B3 minus config/migration/training, which sit in §10.2). Full labour would be £32,400; at 50% Marshall's pays £16,200. Rationale: the coach-hire, PSV compliance and season-ticket modules become sellable platform capability for other operators; the co-funding is the equivalent of Autocure's founder discount and keeps the one-off total (£33,200) credible next to their current multi-vendor spend. Levers: 60% share → £19,440; 100% → £32,400; £350/day at 50% → £18,900.
- **Implementation £17,000**: Autocure's £5,000 pattern applied per phase, scaled by configuration length (P2 ≈ 2 months) and migration size (Coach Manager > VMS).
- **Deposits** sized at roughly 25–30% of each phase total; balance over three monthly instalments after go-live, matching Autocure's deposit-then-instalments pattern.
- Phase 3 payments: Autocure's "Worldpay dropped" decision is Autocure-specific; parents paying online is essential here. Stripe (cards, Apple/Google Pay) or GoCardless (direct debit for termly tickets) — recommend Stripe first.
- Do not quote Phases 2–3 as fixed-price without the discovery items in B6; the proposal says "subject to final commercial agreement".

## B5. Tenant configuration

- One tenant `marshalls` on the GarageOS platform; modules enabled per phase (OPT-IN submodules). Phase 1 = workshop, procurement, assets, dashboard, help; Phase 2 = new hire modules; Phase 3 = school-run module + public parent portal route.
- Branding stays GarageOS/a-soft at platform level; Marshall's identity is tenant data (per the branding rule).
- Help Centre pages must be written for each new screen (maintenance rule) — include in the per-sprint plans.

## B6. Open questions for the client (before pricing is final)

1. What do they currently pay Distinctive (Coach Manager + VMS + maintenance agreement + new cloud hosting) and when does the contract renew?
2. Can Distinctive export customers, vehicles, forward bookings and maintenance history (CSV)? Confirm before Phase 2 fixed price.
3. Mailbox platform for `info@` and the confirmation mailbox (Microsoft 365 vs Google), and whether they will give app consent for read access.
4. Number of drivers, office users, and vehicles by class (for allocation board design and hosting sizing).
5. Exact pricing formula from Coach Manager (fields and rates) — needed to rebuild it faithfully.
6. School runs: how many routes, pupils per term, how parents pay today, and whether councils fund any passes.
7. Which contract customers have fixed schedules and how they are invoiced today (frequency, PO numbers).
8. PMI interval per vehicle as declared on VOL, and the inspection form they use now (so the digital record matches).
9. Accounts decision: Xero migration (recommended) or Sage 50 with import files.
10. Who owns Google Business Profile for the review link.

## B7. Positioning notes

- Distinctive are moving customers to cloud in November — this is the moment they are already reviewing; the pitch is "one system instead of four plus spreadsheets", not "a cheaper Coach Manager".
- Fleetview, Microlise and TruTac stay — say so explicitly in the meeting; it lowers the perceived risk and respects the MD's decision.
- The AI email-to-quote feature is the headline: 50–200 quotes/day at 5 minutes is 4–16 hours of Michael's day.
- OCRS/compliance pack is the second headline for Glen.
