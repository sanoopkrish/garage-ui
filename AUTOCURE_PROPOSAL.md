# Workshop Management System
## Proposed Software Solution

**Prepared for:** Autocure Repairs and Diagnostics Ltd  
**Prepared by:** [Your Company Name]  
**Date:** July 2026  
**Version:** 1.0 — Draft for Client Review

---

## 1. Overview

Autocure Repairs and Diagnostics Ltd operates a busy automotive workshop in Milton Keynes, handling 20–25 jobs per day across a mix of insurance and private work. The business currently relies on a combination of disconnected tools — ConnectTeam for field engineers, Invoice to Go for billing, manual ADAS certificate generation, and paper-based job cards — with no single system tying the full workflow together.

This document proposes a purpose-built Workshop Management System (WMS) that covers the entire job lifecycle from first enquiry through to payment and reporting, with a mobile-first interface for remote field technicians and a management dashboard giving live operational visibility across the business.

---

## 2. Business Context

| Attribute | Detail |
|---|---|
| Site | Single location, Milton Keynes |
| Job volume | 20–25 jobs per day |
| Work split | ~70% B2B insurance (FMG, VELLA, windscreen companies), ~30% B2C private |
| Staff | 3 remote field technicians, 2 workshop technicians, 1 receptionist, management team |
| Diagnostic equipment | Autel MaxiSys MS909 |
| Current tools to replace | ConnectTeam (field management) |
| Current tools to integrate | Xero, RAM Tracking, PartsLink |

---

## 3. Core Workflow

The system will support the complete end-to-end job lifecycle:

```
Enquiry → Booking → Vehicle Check-in → Diagnosis → Quote
→ Customer Approval → Parts Order → Repair → QC Check
→ Compliance Certificate → Customer Notification
→ Collection → Invoice → Payment → Xero
```

Every stage is tracked on a single job card, giving any staff member an instant view of where a job stands at any point in time.

---

## 4. Proposed Modules

---

### Module 1 — Customer & Vehicle Register

A central register for all customers and vehicles, searchable and linked across the entire system.

**Customer records**
- B2B accounts: company name, VAT number, billing address, agreed labour rate, payment terms, PO requirements
- B2C: contact name, phone, email — minimum fields to keep intake fast
- Customer profitability view — total revenue per B2B account over a selected period

**Vehicle records**
- Linked to customer; one customer can have multiple vehicles
- Fields: registration, VIN, make, model, year, colour
- Full service history by vehicle — every job ever carried out on a registration is accessible in one view
- Mileage log across visits

**DVSA Vehicle Lookup**
- Enter a registration plate and the system automatically populates make, model, year, fuel type, colour and current MOT expiry — no manual typing (via the official DVSA MOT History service)
- MOT history card on every vehicle: recent test results, recorded mileage and advisories — advisories are natural leads for quoting additional work

---

### Module 2 — Job Management

The central hub of the system. Every job has a single job card that all roles interact with throughout its lifecycle.

**Job card**
- Linked to: customer, vehicle, assigned technician(s), quote, parts, documents
- Unique job number (sequential, auto-generated)
- Two separate notes fields:
  - **Customer-facing / billable notes** — visible on invoice and documents
  - **Internal notes** — visible to staff only, never shown to customers

**Job lifecycle statuses**

| Status | Meaning |
|---|---|
| Enquiry | Initial contact logged |
| Booked | Appointment confirmed |
| Checked In | Vehicle received at workshop |
| Diagnosis | Autel scan in progress |
| Quoted | Quote sent, awaiting response |
| Awaiting Authorisation | Customer has not yet approved |
| Approved | Customer confirmed, proceed |
| Parts Ordered | Parts on order from supplier |
| In Repair | Active work in progress |
| Quality Check | Pre-completion inspection |
| Complete | Work finished, pending collection |
| Collected | Vehicle handed back |

**Attachments**
- Photos (arrival, work-in-progress, completion)
- PDF documents (diagnostic reports, certificates, supplier invoices)
- Barcode scanner support — scan a part barcode to attach it to the job on arrival

**Rework flag**
- Mark any job as a rework; links back to the original job
- Records: complaint date, nature of complaint, work carried out, resolution

---

### Module 3 — Vehicle Reception & Check-in

A structured digital check-in process to protect the business and set clear expectations with the customer at drop-off.

**Arrival checklist**
- Fuel level (gauge selector)
- Mileage recorded
- Bodywork marks and damage (free text + photo)
- Sundry notes

**Damage walk-around**
- Photo capture at check-in — stamped against the job with date and time

**Key tracking**
- Key tag number assigned at drop-off
- Lock box location logged against the job
- Key status: In Workshop / Returned to Customer

**Road test**
- Checkbox: road test required / not required / completed — recorded at job completion

---

### Module 4 — Diagnosis & Compliance

Linking diagnostic output directly to the job and automating compliance certificate generation.

**Autel diagnostic report**
- PDF uploaded directly to the job card
- System attempts to auto-match a report to the correct job by registration and date where possible

**Fault code selection**
- Technician selects from the faults identified in the diagnostic report
- Customer is shown the fault list and chooses which items to authorise for repair

**ADAS compliance certificate**
- Auto-generated from the completed job data: VIN, registration, work carried out, calibration date, technician
- Output as a branded PDF, attached to the job and emailed with the invoice
- No manual re-entry of data from a separate template

**Completion quality checklist**
- Lights check
- Tyre condition and pressures
- Torque settings confirmed
- Battery health
- Fault codes cleared

---

### Module 5 — Quoting & Estimation

A structured quote builder that supports multiple customer rates and produces a professional, itemised output.

**Quote builder**
- Add labour lines: description, hours, rate
- Add parts lines: description, cost price, markup percentage, sell price
- Labour rate stored per customer/account type — e.g. £140/hr insurance, £120/hr trade account — applied automatically
- Configurable parts markup (default 10%)
- VAT calculated on net total

**Quote approval workflow**
- Quote emailed to customer as itemised PDF (parts + labour breakdown)
- Job status moves to **Awaiting Authorisation**
- Partial approval supported — customer can approve selected lines; rejected lines remain on record
- Follow-up reminder prompt after configurable number of days with no response

**Quote rejection**
- Diagnosis-only fee applied automatically on rejection: £140 + VAT

**Deposit**
- Configurable deposit threshold (e.g. jobs over £500 require deposit)
- Deposit recorded against job; email receipt issued

---

### Module 6 — Parts & Procurement

Tracking every parts order from approval through to job-ready on the shelf.

**Parts order**
- Created from approved quote lines
- Fields: supplier name, part description, order reference, expected due date, cost
- Assigned to Workshop Manager for placing

**Order status tracking**

| Status | Meaning |
|---|---|
| To Order | Approved, not yet placed |
| Ordered | Placed with supplier |
| Delayed | Supplier has flagged delay — notes field |
| Received | Part on shelf, assigned to job |
| Wrong Part | Incorrect part received |
| Returned | RMA reference logged, return in progress |

**Shelf allocation**
- Each part is assigned a shelf location tagged with the job number
- No stock holding — all parts ordered per job

**Barcode scanning**
- Scan a part barcode on arrival to mark it as received and attach to the correct job

**PartsLink integration**
- Look up parts by registration or VIN within the system
- Retrieve pricing to populate quote lines

---

### Module 7 — Scheduling & Technician Dispatch

Assigning the right technician to the right job, with a clean interface that shows only what each technician needs to see.

**Job assignment**
- Workshop Manager assigns jobs to technicians
- Filter technicians by skill type (e.g. ADAS/electrical specialist, general)
- Multiple technicians can be assigned to one job with separate time entries

**Technician job card view**
- Shows: job description, vehicle, customer first name, tasks to complete, checklist
- Does **not** show: pricing, margins, invoice values, customer financial details

**Labour time recording**
- Technician logs actual time spent after job completion
- Compared against quoted hours for variance reporting

---

### Module 8 — Field Engineer Module

A mobile-first interface for remote technicians working on-site away from the workshop, replacing ConnectTeam.

**Mobile job view**
- Optimised for phone and tablet
- Shows: customer address, job details, task checklist with tick boxes and notes per item

**Time recording**
- On-site time: start and stop per job (not travel time)
- Time logged against the job for invoicing

**On-site uploads**
- Photo upload from the field — attached to job card in real time
- Diagnostic report PDF upload from field device

**Notes**
- Separate internal notes field for field engineers — non-billable, not visible to the customer

**Job completion**
- Field engineer marks job complete from mobile; office is notified

**Installable app with push notifications**
- The field module installs to the engineer's phone home screen like a native app (no app store required)
- Push notifications reach the engineer even when the app is closed: job assigned, parts received (with shelf location), schedule changes
- Per-device opt-in — each engineer enables notifications with one tap

**RAM Tracking integration**
- System pulls mileage data per field technician from RAM Tracking
- Calculates and displays fuel cost and estimated MPG per technician per period
- Surfaced in the management reporting dashboard

---

### Module 9 — Invoicing & Payments

Generating accurate invoices from completed job data and feeding them into Xero without manual re-entry.

**Invoice generation**
- Auto-generated from the completed, approved job card
- Inherits all labour lines, parts lines, notes, and job number
- Sequential invoice numbering (auto-incremented)
- VAT calculated on net total

**B2B invoicing**
- Per-job invoice issued immediately on completion
- Monthly statement run handled by Accounts (statement view available)
- Insurance/B2B credit accounts: vehicle collected on account, payment due within agreed terms (typically 30 days)

**B2C invoicing**
- Payment required before collection
- Invoice emailed as PDF at job completion

**Storage charge**
- Configurable rule: after X days uncollected, £20/day (or part thereof) automatically added to the invoice

**Payment methods**
- Card payments taken on the workshop terminal and recorded against the invoice
- Bank transfer — manually marked as paid within system

**Xero integration**
- Sales invoices pushed to Xero automatically on issue
- Card payment records fed through to Xero
- Parts purchase invoices available for accountant review

**Payment status**
- Visible on every job card and in the accounts view: Unpaid / Part Paid / Paid / Overdue

---

### Module 10 — Notifications & Communications

Automated, timely emails to keep customers informed at every stage — reducing inbound calls to the office.

**Automated email triggers**

| Trigger | Email sent |
|---|---|
| Quote ready | Itemised quote PDF attached |
| Quote approved | Confirmation to customer |
| Job in progress | Work has started |
| Ready for collection | Car is ready, invoice attached |
| Invoice issued | Invoice PDF with payment details |

**Templates**
- Branded email templates for each trigger
- Standard wording used across B2B and B2C

**Send from your own mailbox**
- Customer emails can be sent from the workshop's own email address rather than a generic system address — supports Microsoft 365, Google Workspace / SMTP, and SendGrid
- Microsoft 365 connection uses a one-time admin approval; no passwords are stored in the system

**Follow-up reminders**
- If no quote response after configurable number of days, system prompts receptionist to follow up (email or call)
- Uncollected vehicle prompts: internal alert to staff after configurable period

**Post-job**
- Google Reviews link included in the collection/completion email

---

### Module 11 — Warranty & Rework Tracking

A structured process for managing returned jobs and protecting the business.

**Rework job**
- Created from the original job — all history inherited
- Fields: complaint received date, customer complaint description, work carried out under warranty, resolution and outcome

**Parts return**
- Wrong or damaged parts: supplier name, original order ref, RMA reference, return date, cost impact notes

**Reporting**
- Rework count surfaced in daily and weekly dashboard
- Rework jobs identifiable in technician utilisation reporting (to exclude from billable hours)

---

### Module 12 — Reporting & Analytics Dashboard

A live management view across all operational and financial metrics, replacing spreadsheets and ad-hoc checks.

**Daily view**
- Jobs completed today
- New jobs booked today
- Total invoice value raised today
- Vehicles currently in the workshop
- Rework jobs open
- Field engineer job status (live)

**Management KPIs**
- Staff utilisation — hours booked to jobs vs standard contracted hours (per technician, per week)
- Field technician fuel costs and MPG per technician per period (from RAM Tracking)
- Quote pipeline: quotes sent / approved / rejected / conversion rate
- Rework rate by technician or period
- B2B customer profitability — revenue by account over selected date range
- Vehicle history — every job carried out on a registration, in date order

**Accountant view**
- Sales invoices filterable by period — exportable
- Parts purchase invoices filterable by period
- Outstanding and overdue invoice list

**Customisable dashboard**
- Each management user can pin the widgets most relevant to their role
- Christian's default view configured to his preferred KPIs

---

### Module 13 — Roles & Permissions

Controlled access ensuring each staff member sees exactly what they need — nothing more. Permissions are enforced on the server for every operation — not just hidden in the interface — so access rules hold even against direct API use.

| Role | Access |
|---|---|
| **Technician** | Own allocated job cards only; task checklists; photo upload; time logging; no pricing or financial data |
| **Field Engineer** | Mobile job view; own jobs; time recording; photo/document upload; internal notes |
| **Receptionist** | Full job lifecycle; customer records; quote sending; notifications; can edit completed jobs |
| **Workshop Manager** | All of above + technician assignment; parts ordering; pricing decisions; labour rate configuration |
| **Management** | Full access to all modules, all reports, all financial data, all staff records |
| **Accounts** | Invoicing module; payment recording; Xero feed; monthly statements; financial reports |

---

### Module 14 — AI Assistance

Built-in AI features that cut manual typing and speed up quoting — always as a draft for staff to review and accept, never acting on its own. Each feature can be switched on or off individually, and every AI action is logged.

**Diagnostic report reading**
- When an Autel diagnostic PDF is uploaded, the AI reads it: registration, test date, vehicle and every fault code — with plain-English descriptions
- Writes a technical summary to the job's internal notes and a customer-friendly explanation ready to use when quoting
- Works with any report layout — no dependence on a fixed template

**Quote suggestions**
- One click in the quote builder proposes the labour and parts lines for the job, priced from the workshop's *own* past approved quotes for similar work
- Parts without a price history are still listed (with quantities) for the workshop to price — the AI never invents prices
- Suggestions land as normal editable draft lines under the usual rate and markup rules

**Damage notes from photos**
- At check-in, the AI examines the arrival photos and drafts the bodywork-damage notes in standard panel notation (OSF/NSF etc.)
- Consistent, written intake evidence on every job — particularly valuable for the insurance-led workload
- Factual by design: describes only what is visible, never invents damage

**Writing assistance**
- "Improve with AI" on customer-facing notes and email templates: rewrite professionally, translate technician shorthand into plain English, or shorten — facts, figures and prices always preserved

**Control and transparency**
- Every feature has its own on/off switch; nothing is sent to a customer or saved to a job without a staff member confirming it
- Full usage log: which features were used, how often, and the running cost — reviewed from the administration area

| Integration | Purpose |
|---|---|
| **DVSA MOT History** | Auto-fill vehicle details (make, model, year, fuel, colour, MOT expiry) from registration plate; MOT test history and advisories per vehicle |
| **Xero** | Push sales invoices and payment records; parts purchase invoice visibility |
| **RAM Tracking** | Pull mileage and location data per field technician for MPG and fuel cost reporting; live field map on the schedule |
| **PartsLink** | Parts lookup by registration or VIN; pricing to populate quote lines |
| **Autel MaxiSys** | PDF diagnostic report auto-matched to job by registration and date |
| **Google Reviews** | Post-completion review link included in customer email |
| **AI (Anthropic Claude)** | Powers the Module 14 assistance features — document reading, quote suggestions, photo analysis, writing help |
| **Microsoft 365 / SMTP / SendGrid** | Customer emails sent from the workshop's own mailbox |

---

## 6. Phased Delivery Approach

To manage risk and allow the business to adopt the system progressively, delivery is proposed in three phases.

### Phase 1 — Core Operations
Customer & vehicle register, job management, vehicle check-in, quoting and approval, invoicing, Xero integration, email notifications, roles and permissions.

### Phase 2 — Field & Diagnostics
Field engineer mobile module, RAM Tracking integration, Autel PDF auto-match, ADAS compliance certificate auto-generation, parts and procurement module.

### Phase 3 — Intelligence & Optimisation
Full reporting and analytics dashboard, customisable management views, B2B customer profitability, staff utilisation reporting, Google Reviews integration, PartsLink integration, DVSA vehicle lookup, **AI assistance features (Module 14)**.

---

## 7. Next Steps

1. Client review and sign-off on this proposed scope
2. Clarification of any outstanding items (invoice template, certificate template, sample documents)
3. Technical discovery — confirm API access for RAM Tracking and PartsLink (Xero and DVSA MOT History access already confirmed)
4. Detailed specification and wireframes per module
5. Commercial proposal and project timeline

---

*Document version 1.0 — for discussion and approval.*  
*All module scope is subject to final commercial agreement.*
