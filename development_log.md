# NGS System Development Log 🚀

## Project Overview

**Nextgen Shield (NGS)** is a premium school security gate management system designed for **Lyceum Global Schools**. It replaces manual logbooks with a sophisticated, role-based digital infrastructure for tracking visitors, vehicles, and staff entries.

### Core Architecture

- **Frontend**: React + Vite + Vanilla CSS (Glassmorphism design language).
- **Backend/Database**: Supabase (PostgreSQL) with real-time capabilities.
- **Integrations**: Google Calendar API for meeting synchronization.
- **Design Tokens**: Theme-aware system (Light/Dark mode) with curated HSL color palettes.

---

## System Workflows

### 1. Visitor Entry Flow

- **Self Check-In (Kiosk)**: Visitors can use a dedicated kiosk to register.
- **Scheduled Arrival**: Security checks pre-registered meetings and confirms arrival with a single click.
- **Walk-in**: Security captures details for unexpected visitors.

### 2. Meeting Management

- **Scheduling**: Staff can schedule meetings for multiple visitors simultaneously.
- **Calendar Sync**: Automated creation, update, and deletion of Google Calendar events.
- **Audit Trail**: Full history of meeting modifications and visitor arrivals.

### 3. Security Oversight

- **Real-time Alerts**: Automated system flags overdue meetings (30+ mins past end time) and extended stays (>4 hours).
- **Unified Log**: A single, color-coded stream of all facility entry/exit events.
- **ANPR Data model**: Infrastructure ready for Automated Number Plate Recognition.

---

## Core Features

- **Role-Based Access Control**: Tailored dashboards for Security Officers, Security HODs, School Management, and Operations.
- **Unified Access Log**: Merged view of visitor and staff entries with status tracking.
- **Interactive Analytics**: Chart-based visualizations for visitor trends and security metrics.
- **Automated CSV Exports**: Standardization of data exports across all report types.
- **Account Settings**: User-level control over personal details (Username/Password).
- **Multi-Theme Support**: Seamless transition between high-contrast dark mode and clean light mode.

---

## Chronological History

### Phase 1: Foundation (2026-01-12)

- Initialized project with Vite and modern dependencies (Lucide, Chart.js, Framer Motion).
- established Supabase connection and core SQL schema.
- Implemented basic Visitor, Vehicle, and Incident modules.
- Defined the "Glassmorphism" design system.

### Phase 2: Refinement & Consolidation (2026-01-12)

- Removed Incident Management to focus on core security workflows.
- Implemented the Public Landing Page and Role-based Login.
- Developed the Unified Access Log with Agent-Auto vs Manual tracking badges.
- Created the Entry Management module for high-efficiency security operations.

### Phase 3: Integration & Reporting (2026-01-14)

- **Google Calendar Integration**: Implemented OIDC and GAPI integration for meeting synchronization.
- **Reports Module**: Developed 11 specialized reports with dynamic filtering and charting.
- **Standardization**: Refactored all data exports to use a unified CSV utility.

- **Global System Responsiveness**:
  - Implemented a dynamic layout engine in `App.jsx` for real-time viewport adaptation.
  - Developed a mobile-friendly drawer navigation (Sidebar) with hamburger menu toggle.
  - Optimized `DashboardView`, `VehiclesView`, `ReportsView`, and `LoginPage` for mobile devices.
  - Integrated responsive table wrappers for horizontal scrolling support on small screens.
  - Ensured `MeetingScheduler` and alert detail modals are fully responsive.
- **Advanced Alert System**:
  - Implemented database-backed persistent alerts in `alerts` table.
  - Automated detection of "Missing Logouts" (visitors/vehicles > 4hrs) and "Overstays" (meetings).
  - Developed `AlertDetailView` for comprehensive incident analysis.
  - Added Read/Unread state management and HOD sorting filters.
- **Meeting Scheduler**: Restricted scheduling time slots to operating hours (7:30 AM - 5:30 PM) with strict validation.

### Phase 4: Documentation & UX Polish (2026-02-12 — 2026-02-16)

- **Comprehensive Workflow Documentation**:
  - Created role-based workflow architecture using Mermaid diagrams.
  - Developed a self-contained HTML workflow portal with "Print to PDF" capability for offline distribution.
  - Refined cross-functional swimlane diagrams to differentiate between Web-based requests and Kiosk arrivals.
- **System Stability & Bug Fixes**:
  - Resolved critical "Confirm Arrival" crash caused by database schema mismatch.
  - Fixed operational modal positioning (centering issues) on the main dashboard for better usability.
- **Copy Standardization**:
  - Updated internal and external portal success messages for clarity and professional tone.
  - Simplified SMS and web notifications for meeting request submissions.
- **Input Standardization**:
  - Merged specialized vehicle types ("Van (School)" and "Van (Private)") into a unified "Van" category for cleaner logging and reporting.
- **Reporting Overhaul**:
  - Implemented professional, high-fidelity PDF report generation matching the corporate template.
  - Replaced legacy CSV exports with branded PDF reports across all administrative and intelligence views.

---

### Phase 5: Real-time Infrastructure & Alerts Refinement (2026-04-06)

- **Resolved "Silent Success" Bug**:
  - Implemented database-level triggers (`fn_generate_meeting_alert`) for instant alert generation upon meeting request submission.
  - Enabled Supabase Real-time for the `alerts` table to eliminate the 30-second notification delay for security officers.
  - Integrated `supabase.channel` subscriptions in `AlertContext.jsx` for push-based dashboard updates.
- **SQL & Schema Stability**:
  - Resolved `operator does not exist: text = uuid` errors in triggers by implementing explicit type casting for polymorphic `source_id` references.
  - Optimized `AlertService.js` to prioritize trigger-based events while maintaining manual scans as a secondary reconciliation safety net.
- **UI/UX Infrastructure Fixes**:
  - Implemented **React Portals** for `AlertDetailView` to bypass parent stacking context restrictions (fixing the partially hidden modal bug).
  - Normalized alert detail data mapping to ensure consistent display of "Names" and "Times" across Visitor, Vehicle, and Meeting alert types.
  - Increased fallback polling intervals to 60s to reduce unnecessary database overhead.

### Phase 6: Branding & UX Polish (2026-04-06 — 2026-04-07)

- **Logo & Visual Identity Restoration**:
    - Restored the original high-resolution **Nextgen Shield (NGS)** logo with its correct `0.82:1` vertical aspect ratio.
    - Enhanced **Lyceum International School** logo visibility for dark-mode reports by converting black typography to high-contrast white while preserving the original Aristotle bust emblem.
    - Normalized logo rendering in PDF exports to prevent stretching or distortion across different screen sizes and print formats.
- **Reporting Overhaul**:
    - Optimized PDF report headers: reduced total header height to `45mm` and relocated titles to the bottom of the header to prevent overlap with logos.
    - Standardized report branding: removed redundant text labels where logos provided sufficient identification.
- **Interface Consistency**:
    - Updated **Navbar** to prioritize the **Active User's Username** over their system role for a more personalized staff experience.
    - Modified **"Pre-Scheduled" coloring policy**: transitioned labels and chart indicators from green to blue in `ReportsView` to differentiate "Scheduled" status from "Success/Arrival" states.

---

## Technical Context for Future Agents

- **Logo Assets**: Use `public/ngs-logo.png` (843x1024) and `public/lyceum-logo.png` (946x182). Always maintain their natural aspect ratios in UI and PDF exports.
- **Alert Generation**: Alerts are primarily generated by database triggers (`tr_on_meeting_requested`). Manual scans in `AlertService` serve only as secondary reconciliation.
- **Real-time Subscriptions**: Use `AlertContext` for dashboard notifications. Kiosk interactions use direct `scheduled_meetings` subscriptions for approval status.
- **Modals & Portals**: Global modals (like `AlertDetailView`) MUST use Portals to avoid being clipped by specialized glassmorphism containers like the `Navbar` or `Sidebar`.
- **Primary Data Table**: `scheduled_meetings` uses a `meeting_id` (TEXT) for custom request grouping and an `id` (UUID) for row-level identification.
- **Color Patterns**: Use blue (`#3b82f6` / `COLORS[1]`) for "Pre-Scheduled" entries and green/accent (`#10b981`) for "Success/Checked-In" states.
- **CSS Variables**: Use `var(--primary)`, `var(--glass-bg)`, and `var(--text-main)` to maintain theme compatibility.
- **Contexts**: Always refer to `AlertContext` for system-wide notification state.
