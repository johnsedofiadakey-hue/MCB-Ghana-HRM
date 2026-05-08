# Nexus HR Platform Technical Upgrade Manual (v3.2.0)

This document provides a comprehensive guide to the features, architectural changes, and operational protocols implemented during the **March 2026 Appraisal Lifecycle Hardening** phase.

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

**Last Documented Version: 3.2.0-STABLE**
*Date: March 2026*
