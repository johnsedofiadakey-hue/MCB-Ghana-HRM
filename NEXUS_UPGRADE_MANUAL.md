# Nexus HR Platform Technical Upgrade Manual (v3.3.0)

This document provides a comprehensive guide to the features, architectural changes, and operational protocols implemented during the **March 2026 Appraisal Lifecycle Hardening** phase, plus the **July 2026 PDF Branding & Platform Hardening** phase (section 6–7).

---

## 🏗️ 1. Appraisal Lifecycle Architecture

The appraisal system has been transitioned from a simple submission flow to a robust, 3-stage institutional review process.

### 🔄 The Cycle Workflow
1.  **Stage 1: SELF_REVIEW**
    *   **Owner**: The Employee.
    *   **Action**: Complete the competency framework ratings and provide a personal summary.
    *   **Visibility**: Hidden from managers until the manager's own review is also started/submitted.
2.  **Stage 2: MANAGER_REVIEW**
    *   **Owner**: Primary Supervisor or Department Manager.
    *   **Action**: Evaluate the employee's performance. The system now prevents "answer copying" by hiding the staff's self-assessment until the manager has begun their review.
3.  **Stage 3: FINAL_REVIEW (Institutional Sign-off)**
    *   **Owner**: HR Manager or Managing Director (Rank 80+).
    *   **Action**: Audit the reviews. If a gap or dispute is detected, the MD/HR can provide a definitive **Arbitrated Score** and **Verdict**.

### ⚖️ Arbitration & Dispute Resolution
*   **Arbitration**: If the Manager and Staff scores differ significantly, or a formal dispute is raised, authorized users can set a `finalScore` and `finalVerdict` that overrides all previous ratings.
*   **Persistence**: Arbitrated scores are the source of truth for the **Performance Pulse** and **Historic Dossier**.

---

## 🗑️ 2. Data Purging & Maintenance

### 🧱 Permanent Deletion (Hard Purge)
To support clean testing environments and GDPR-style data removals, the "Delete" action has been upgraded:
*   **Standard Delete**: Permanently removes the `AppraisalPacket` and all associated `AppraisalReview` records.
*   **Cascading**: Implemented via Prisma `onDelete: Cascade` at the database level to ensure zero orphaned data.
*   **Re-initialization**: Once a packet is deleted, the employee is "unlocked" and can be added to a new cycle without "already exists" errors.

---

## 👥 3. Reporting Hierarchy & Persistence

### 🌲 Hierarchy Expansion
The system now recognizes complex reporting structures beyond just a single manager:
*   **New Roles**: Added `MID_MANAGER` (Rank 75) and `SUPERVISOR` (Rank 60) to the organizational roster.
*   **Selection Logic**: The "Reporting Manager" picker in Employee Profiles now dynamically includes all users with Rank 60+, ensuring granular oversight.

### 💾 Persistence Hardening
Resolved critical "Refresh-Loss" issues:
*   **Dossier Fetching**: The `openEdit` protocol now performs a complete database fetch for all linked entities (Department, Supervisor, History) rather than relying on stale list-view state.
*   **Sync Logic**: Form state is synchronized with the backend immediately upon "Update" to ensure that page reloads do not revert unsaved changes.

---

## 📊 4. Performance Analytics & Export

### 💓 Performance Pulse
*   **Algorithm**: Calculated based on the weighted average of individual Targets and the most recent Finalized Appraisal score.
*   **Visuals**: Uses a glassmorphic progress system with real-time status (Ahead/Behind) relative to the organizational timeline.

### 📄 Printable Dossier
*   **Access**: Click "Export PDF" on any Employee Profile.
*   **Content**: Includes a 5-cycle historic performance log, academic credentials, corporate placement, and the latest arbitrated appraisal results.
*   **Security**: Includes a footer signature block for institutional verification.
*   **Update (v3.3.0)**: This is now a server-generated PDFKit document (not a browser print), matching the branded header/footer/logo used by payslips and leave certificates. See section 6.

---

## 🛠️ 5. Operational DevOps

### 🚢 Deployment Protocol
1.  **Backend (Render)**: Automatic on `git push origin main`.
2.  **Frontend (Firebase)**: `cd client && npm run build && firebase deploy`.
3.  **Database Migration**: Run `npx prisma migrate deploy` in the `server` directory after schema changes.

### 🔧 Maintenance Commands (Local Dev only)
*   **Switch to SQLite**: `node scripts/use-sqlite.js`
*   **Sync Target Progress**: `await TargetService.syncAllTargets('tenant-id')` in the dev console.

---

## 🧾 6. PDF Branding & Rendering Fixes (2026-07-02)

### 🖼️ Company Logo Rendering
*   **Root cause**: PDFKit only supports PNG/JPEG, but uploaded logos were stored as WebP; the Firebase bucket also has uniform bucket-level access, so `makePublic()` silently failed and a plain HTTP `GET` returned 403.
*   **Fix**: `pdf.service.ts` now resolves logo bytes via the Firebase **Admin SDK** (`FirebaseStorageService.downloadByUrl()`, bypasses HTTP auth) and converts every source format to PNG with `sharp` before handing it to `doc.image()`.

### 📄 Phantom Second Page
*   **Root cause**: With `bufferPages: true`, an explicit-Y `doc.text()` call near the bottom margin (`Y=790`) tripped PDFKit's page-break check (`Y + lineHeight > page.maxY()`) and silently started a second page for the footer.
*   **Fix**: Footer line/text moved up to `Y=762`/`Y=770`, safely inside the A4 content area — every generated PDF (payslips, leave certificates, appraisals, employee dossiers) is now a clean single page (or exact multi-page count with no trailing blank sheet).

### 🪪 Employee Dossier — now a real branded PDF
*   The old "Export PDF" button rendered a browser `window.print()` of an on-page component — unreliable across browsers/mobile and inconsistent with the rest of the document system.
*   Replaced with a server-side `EMPLOYEE_DOSSIER` PDFKit renderer (`pdf.service.ts`) sharing the same header/footer/branding engine as payslips: photo hero, identity & contact, employment, leave balance, financial & compensation, emergency contacts, academic credentials, performance snapshot, and a sign-off block.
*   `GET /export/employee/:id/pdf` is now gated to the employee themselves or rank 75+ (previously anyone authenticated could pull anyone's dossier).

---

## 🏛️ 7. Platform Hardening & UX Fixes (2026-07-02)

### 🔐 Sessions now persist until explicit logout
*   Removed the blanket 2-hour idle-activity auto-logout in `App.tsx`.
*   Extended the refresh-token window from 24 hours to **30 days** (`auth.controller.ts`). The existing axios refresh interceptor silently renews the 1-hour access token in the background, so a user only signs out when they explicitly click Log Out (or their account is suspended/password changed).

### 🔑 Forced password change is a deliberate, global gate
*   Confirmed by design: `mustChangePassword` blocks every route except `/profile` until the user sets a new password — there's no allowlist for Support or any other page. This is intentional (HR/IT-initiated resets and first-time onboarding logins must be resolved before anything else).

### 🎫 Help-desk attachment upload
*   `CreateTicketModal.tsx` gained a real file-attach field (previously tickets could only be created without an attachment; files could only be added afterward via a reply).
*   `attachTicketFile` (and the new create-time `attachmentData` path) now fall back to storing a base64 data URI if Firebase Storage throws, matching the resiliency pattern already used for document-vault and medical-certificate uploads — a transient storage outage no longer 500s the upload.
*   Both upload surfaces now enforce a 6MB client-side size guard and surface the real backend error message instead of a generic "Uplink failed" toast.

### 📦 Multi-asset onboarding assignment
*   The onboarding "assign asset" step (`Onboarding.tsx`) is now a checkbox multi-select instead of a single dropdown — HR can hand a new hire a laptop, monitor, and access card in one action. Backend already modeled `AssetAssignment` as one row per asset, so the frontend now just fires one `/assets/assign` call per selected asset via `Promise.allSettled`.

### 🏢 Department-scoped visibility
*   Backend (`GET /users` / `GET /employees`) already restricted rank <80 staff to their own department + direct reports — confirmed no cross-department leak.
*   The gap was the `/departments` page: non-managers could see every department's card/headcount but had **no roster view at all**, even for their own team. Added a read-only "View Team" roster (visible only for the viewer's own department) alongside the existing manager-only edit flow — the underlying employee list was already correctly scoped, so this is safe by construction.

### 📋 Policy Library draft visibility
*   Root cause: `listPolicies` returns every status for managers only when no `status` filter is passed, but the frontend hard-defaulted the filter to `PUBLISHED` for everyone — so an HR Director's own just-created (default `DRAFT`) policy was invisible even to them.
*   Fix: managers now default to the "All Statuses" filter; the create-success toast explicitly says the policy is a draft and needs the eye-icon Publish action.

### ⚖️ Disciplinary case notifications
*   `createDisciplinaryCase` never called the notification service — the affected employee had no way to find out a case existed, and there was no employee-facing surface at all.
*   Added: a `notify()` call on create (and on status change) with a generic, non-sensitive message (case details stay behind the authenticated profile view, not in an email/push preview); a self-scoped `GET /hr/disciplinary/mine` endpoint (always filtered to the caller, ignores any `employeeId` param); a `POST /hr/disciplinary/:id/acknowledge` endpoint; and a new "Disciplinary Records" section on the employee's own profile page with an Acknowledge action.

### ⚡ Bundle size / perceived speed
*   `App.tsx` eagerly imported several overlay components that are mounted on every authenticated page but rarely visible (Command Palette, Help Guide, First-Run Welcome, AI Insight panel, Sandbox HUD, Demo Persona Switcher). Converted to `React.lazy()` behind a `Suspense`+`ChunkErrorBoundary` pair.
*   Result: the main JS chunk dropped from 779.8 kB → 687.6 kB (215.1 kB → 187.2 kB gzip); the 1,294-line Help Guide component (67.8 kB / 22.1 kB gzip) now only loads the first time a user opens Help instead of on every page load.

---

**Last Documented Version: 3.3.0-STABLE**
*Date: March 2026*
