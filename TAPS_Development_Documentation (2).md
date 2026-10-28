# TAPS (Travel Authority Processing System) — Development Documentation

**Client:** DENR-PENRO
**Framework:** Next.js (App Router)
**Database:** PostgreSQL (Supabase) + Prisma ORM
**Methodology:** Kanban (continuous flow, WIP-limited board)
**Companion files:** `schema.prisma`, `TAPS_API_Design.md`, `sms.ts`

This is the single reference document for the development phase — everything confirmed so far, in one place, plus a ready-to-use build prompt and a sequential checklist.

---

## 1. Project Overview

TAPS is a web-based Travel Authority Processing System built for DENR-PENRO. It replaces a manual/paper TA process with a system that lets employees file travel requests, routes them through a strict 3-level approval chain, and notifies everyone involved in real time — both in-app and via SMS.

**Four roles:**
1. **Employee** — files TA requests
2. **Staff/Signatories** — Section Chief, Division Chief, Head of PENRO (three separate accounts, same UI)
3. **Account Manager** — creates/activates accounts, assigns sections, can also file their own TA request
4. **Admin** — system-wide user & master-data management

---

## 2. Confirmed Business Rules

These are final — don't re-derive or reinterpret them during development:

1. **Approval order is strictly sequential**: Section Chief → Division Chief → Head of PENRO. No skipping, no parallel approval.
2. **Two separate rejection paths, with different consequences:**
   - **Overdue (system-triggered):** the request must be fully approved by the travel `startDate` itself — that date IS the deadline, there's no separate fixed processing window. If not fully approved in time, it's auto-rejected and **terminal** — employee must file a brand new request.
   - **Manual (chief-triggered):** any of the 3 chiefs can reject at their own step for reasons like personal reasons or a schedule conflict. This is **not terminal** — the employee can edit **only the date fields** and resubmit, which restarts the approval chain from Section Chief.
3. **Team or solo:** a TA request can cover a team or a single person. Team members are all equal — no designated lead.
4. **Only the request creator files it** — no separate "add team member" flow; members are listed directly when the request is created. (Both Employees and the Account Manager can be a request creator.)
5. **Final document:** once all 3 chiefs have signed, a ready-to-print document is auto-generated listing all 3 signatories. (Template to be provided later.)
6. **Account creation flow:** employee self-registers via an in-system form (personal info + phone number) → account sits as `PENDING_REVIEW` → Account Manager reviews, activates, and assigns a section (section types still TBD) → only then can the employee log in.
7. **Map provider:** Leaflet (OpenStreetMap-based, free, no API key).
8. **Notifications:** every status change fires both an in-app notification and an SMS (via Semaphore) to the relevant party — see §6.
9. **Data privacy:** system must reference compliance with the **Data Privacy Act of 2012 (RA 10173)** given it handles employee personal data.

---

## 3. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Styling | Tailwind CSS (DENR green theme — see §7) |
| UI Components | shadcn/ui (New York style, CSS variables) |
| Database | PostgreSQL via Supabase |
| ORM | Prisma |
| Auth | Auth.js (NextAuth), role-based access control |
| Maps | Leaflet + OpenStreetMap |
| SMS | Semaphore (Philippine SMS gateway) |
| Hosting | Vercel |
| Version control | Git + GitHub |

---

## 4. Project Structure & UI Setup

### 4.1 Folder structure (App Router, role-based, with route groups)

Route groups (parentheses in folder names) split layouts without adding URL segments — `(auth)` and `(dashboard)` each get their own `layout.tsx`, and Next.js applies the right one based on which group the current route lives in.

```
src/
  app/
    (auth)/
      layout.tsx          # simple centered layout, no nav/sidebar
      login/page.tsx      # serves at /login
      register/page.tsx   # serves at /register
    (dashboard)/
      layout.tsx          # shared shell: sidebar, top nav, logout
      employee/page.tsx
      staff/page.tsx             # signatories: Section/Division/Head chiefs
      account-manager/page.tsx
      admin/page.tsx
    api/
      requests/
      approvals/
      notifications/
  components/
    ui/                   # shadcn/ui components live here
    wizard/                # multi-step TA form
    map/                   # Leaflet destination picker
    approval-trail/
  lib/
    auth.ts
    prisma.ts
    sms.ts
  types/
    request.ts             # TA request, approval state types
```

### 4.2 shadcn/ui setup

Initialize shadcn/ui in the project:

```bash
npx shadcn@latest init -d
```

Recommended answers if run without `-d`: style **New York**, base color **Slate** or **Zinc** (overridden by the DENR palette in §7 anyway), CSS variables **Yes**.

Install components — either all at once, or the specific set TAPS needs:

```bash
# Everything at once
npx shadcn@latest add --all

# Or just what the wizard/dashboards/approval-trail actually use
npx shadcn@latest add button form input select calendar dialog table badge card sidebar tabs dropdown-menu toast avatar separator
```

Cherry-picking the specific set is the better default — it keeps `components/ui/` limited to what's actually in use, which matters when debugging later.

> **Note:** shadcn's CLI does not use random alphanumeric `--preset` flags (e.g. `--preset b2cgnpaoHg`). Don't run install commands from unverified sources — a bad `init`/`add` flag can point at an untrusted registry or run an unexpected post-install script.

### 4.3 Leaflet + Next.js note

Leaflet touches `window`, so it breaks under SSR. Always import map components dynamically:

```tsx
import dynamic from 'next/dynamic';
const MapPicker = dynamic(() => import('@/components/map/MapPicker'), { ssr: false });
```

---

## 5. Data Model

Full schema lives in `schema.prisma`. Core entities:

- **User** — role, status (`PENDING_REVIEW`/`ACTIVE`), section, phoneNumber
- **TARequest** — purpose, destination (+ lat/lng), startDate/endDate, status, resubmitCount
- **TARequestMember** — join table for team members (all equal)
- **ApprovalStep** — one row per role per request (`order`: 1/2/3), tracks approve/reject + remarks
- **Notification** — in-app + SMS delivery tracking (`channel`, `smsStatus`)

See `schema.prisma` for the full annotated file — every business rule above is mapped to a specific field or enum in there.

---

## 6. API & Notification Design (Summary)

Full detail is in `TAPS_API_Design.md` (~21 routes). Key flow:

```
Employee registers → Account Manager activates
        ↓
Employee/Account Manager creates TA request (DRAFT)
        ↓
Submit → PENDING_SECTION_CHIEF ──SMS──> Section Chief
        ↓ approve                    ↓ reject (reason)
PENDING_DIVISION_CHIEF          REJECTED_MANUAL ──SMS──> Employee
        ↓ approve                    ↓ employee edits date, resubmits
PENDING_HEAD_PENRO             (restarts at Section Chief)
        ↓ approve
     APPROVED ──SMS──> Employee (printable doc ready)

  [parallel] any PENDING_* past startDate → REJECTED_OVERDUE (terminal) ──SMS──> Employee
```

SMS fires alongside every in-app notification via a shared `notifyUser()` helper (`sms.ts`) — see that file's trigger table for exact recipients/messages.

---

## 7. Design System (from existing prototype)

| Token | Value | Use |
|---|---|---|
| Primary | `#1B4332` | DENR forest green |
| Accent | `#40916C` | Buttons, active states |
| Light tint | `#D8F3DC` | Backgrounds, cards |
| Rejection | `#E63946` | Rejected states, errors |

Prototype already covers: multi-step TA wizard, map-based destination picker, approval-trail visualization, role-switching UI. Known issues to fix during development (deferred from critique): disabled-date handling, read-only field behavior, missing field indicators, review-screen data bug.

---

## 8. Still Open (deferred, not blockers)

| Item | Status |
|---|---|
| Section list/types | TBD — Account Manager assigns at activation, exact values not yet defined |
| Ready-to-print document template | You'll provide later, post-approval-flow build |
| 4 UI critique fixes | Deferred — tackle during the polish/testing phase |
| Demo/seed accounts | Want 3 separate chief accounts (Section/Division/Head), same shared UI |

---

## 9. Kanban Board — Active Delivery Plan

Work is pulled continuously from **Backlog** to **In Progress**, then **Review**, then **Done**.

**Board columns:** `Backlog` → `In Progress` (WIP limit: 2) → `Review` → `Done`

### 9.1 Swimlanes / Epics

1. Core Workflow
2. Auth & Access Control
3. Notifications (SMS/Email/In-app)
4. Admin & Data Management
5. Quality, Security, and Release

### 9.2 Initial Cards (priority order)

| # | Card | Epic |
|---|---|---|
| 1 | Validate end-to-end TA request lifecycle (create → approve/reject → resubmit) | Core Workflow |
| 2 | Enforce strict role/route access for employee/staff/account-manager/admin | Auth & Access Control |
| 3 | Harden overdue auto-rejection cron flow and edge cases | Core Workflow |
| 4 | Finalize travel order document generation for approved requests | Core Workflow |
| 5 | Complete notification reliability checks (in-app + SMS + email) | Notifications (SMS/Email/In-app) |
| 6 | Add/verify audit-log coverage for all status-changing actions | Quality, Security, and Release |
| 7 | Stabilize admin CRUD flows (users/divisions/sections/signatures) | Admin & Data Management |
| 8 | Expand automated tests for approval sequence and rejection paths | Quality, Security, and Release |
| 9 | Run lint/build/test gate in CI and block merges on failures | Quality, Security, and Release |
| 10 | Perform security pass (input validation, auth checks, secret handling) | Quality, Security, and Release |
| 11 | Update docs/runbooks (env setup, seed, deployment, cron operations) | Quality, Security, and Release |
| 12 | Prepare release checklist and production readiness verification | Quality, Security, and Release |

### 9.3 Definition of Done (applies to every card)

- Acceptance criteria met
- Relevant tests added/updated and passing
- Security/privacy impact checked
- Documentation updated when behavior changes
- Reviewed and merged

---

## 10. Build Prompt (ready to paste into Claude Code / Cursor / similar)

Use this to scaffold the project. Paste `schema.prisma` and `TAPS_API_Design.md` alongside it for full context.

```
I'm building TAPS (Travel Authority Processing System) for DENR-PENRO, a Philippine
government agency, as my IT capstone project. Stack: Next.js 14 (App Router),
TypeScript, Tailwind CSS, shadcn/ui, Prisma + PostgreSQL (Supabase), Auth.js for
authentication, Leaflet for maps, Semaphore for SMS.

I have a finalized Prisma schema (schema.prisma) and API design doc
(TAPS_API_Design.md) — use them as the source of truth, don't redesign the data
model or routes.

Key business rules to enforce exactly:
1. Approval is strictly sequential: Section Chief -> Division Chief -> Head of PENRO.
   Never allow a step to be actioned out of order.
2. Two distinct rejection paths:
   - REJECTED_OVERDUE: system-triggered when a PENDING_* request's startDate has
     passed. Terminal — no edit/resubmit allowed.
   - REJECTED_MANUAL: any chief can reject at their step with a reason. NOT
     terminal — employee can edit ONLY startDate/endDate and resubmit, which
     resets all ApprovalStep rows and restarts the chain at Section Chief.
3. Requests can be solo or team (TARequestMember join table, no lead distinction).
4. Account flow: employee self-registers (status PENDING_REVIEW) -> Account
   Manager reviews/activates (status ACTIVE, assigns section) -> only then can
   they log in.
5. Every status-changing action (submit, approve, reject, resubmit, overdue) must
   call a shared notifyUser() helper that creates an in-app Notification AND
   sends an SMS via Semaphore — never just one or the other.
6. Design system: primary #1B4332 (DENR forest green), accent #40916C, light tint
   #D8F3DC, rejection/error #E63946.

Follow the Kanban priority order in this document and implement one card at a time.
Do not assume scope beyond the active card. Ask me before assuming anything not
covered in schema.prisma or TAPS_API_Design.md.
```

---

*Keep this file updated as decisions change — it's your single source of truth for both coding and writing up your methodology chapter later.*
