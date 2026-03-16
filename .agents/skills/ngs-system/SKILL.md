---
name: ngs-system
description: |
  Skills for working with the NGS (Nextgen Shield) school security gate management system.
  Covers all agents, models, services, architectural patterns, and system conventions.
  Use this skill when modifying, debugging, or extending any part of the NGS-System codebase.
---

# NGS-System Agent Skills

> **Important**: Always read `system_memory.md` in the project root for full system context including features, rules, workflows, designs, database schema, and integration details.

## System Architecture

NGS-System (Nextgen Shield) is a school security gate management system built for Lyceum Global Schools.

| Layer | Technology | Location |
|-------|-----------|----------|
| Frontend | React 19 + Vite 7 | `src/` |
| Styling | Vanilla CSS (Glassmorphism) | `src/index.css`, `src/App.css` |
| State | React Context + Hooks | `src/context/` |
| Services | OOP Class Hierarchy | `src/services/` |
| Backend | Supabase (PostgreSQL) | `supabase/` |
| Edge Functions | Deno (Telegram Bot/Proxy) | `supabase/functions/` |
| i18n | i18next (en, si) | `src/locales/`, `src/i18n.js` |

## Service Layer (OOP Patterns)

All business logic lives in `src/services/`. **Never put Supabase queries directly in views or components.**

### Class Hierarchy

```
BaseService (abstract — Repository pattern)
├── VisitorService    — Visitor check-in/out, overstay detection
├── MeetingService    — Meeting scheduling, approval workflows
├── VehicleService    — Vehicle entry/exit tracking
├── AlertService      — Alert generation (Facade over domain services)
└── AuthService       — Login, session, password management
```

### Notification System (Strategy Pattern)

```
NotificationStrategy (abstract)
├── TelegramNotification  — Via Supabase Edge Function proxy
├── SMSNotification       — TODO: integrate real gateway
└── CalendarNotification  — Google Calendar API
```

Orchestrated by `NotificationService` which supports `notifyAll()` and `notifyChannel()`.

### Agent System (Template Method Pattern)

```
EntryAgent (abstract — Template Method)
├── StaffEntryAgent    — Validates against users table
└── VisitorEntryAgent  — Validates against scheduled_meetings
```

## RBAC Module

Located at `src/utils/routeConfig.js`. Contains:
- `ROLES` — Frozen enum of all system roles
- `ROUTE_PERMISSIONS` — Route-level access control
- `FEATURE_PERMISSIONS` — Feature-level gating
- `hasPermission(role, path)` — Route check
- `hasFeatureAccess(role, feature)` — Feature check

## Key Conventions

### File Organization
- **Views** (`src/views/`): Page-level components, PascalCase `.jsx`
- **Components** (`src/components/`): Reusable UI components, PascalCase `.jsx`
- **Services** (`src/services/`): Domain logic classes, PascalCase `.js`
- **Lib** (`src/lib/`): Infrastructure utilities (Supabase client, audit, integrations)
- **Utils** (`src/utils/`): Pure functions and helpers
- **Context** (`src/context/`): React Contexts (thin wrappers around services)

### CSS Design System
- Use `var(--primary)`, `var(--glass-bg)`, `var(--text-main)` for theme compatibility
- Glassmorphism: `backdrop-filter: var(--glass-blur)`, `border: 1px solid var(--glass-border)`
- Dark/Light mode via `data-theme` attribute

### Database
- Primary grouping: `scheduled_meetings` uses `meeting_id` (UUID) for multi-visitor appointments
- Always check for `google_event_id` before calendar operations
- SQL migrations in `supabase/migrations/` with timestamp prefixes

### Import Boundaries
1. Views → Services → Lib (never Views → Supabase directly)
2. Components never import from Views
3. Only `src/lib/supabase.js` imports from `@supabase/supabase-js`

### Adding New Features
1. Create a service class extending `BaseService`
2. Add barrel export in `src/services/index.js`
3. Wire into React via context or direct import in views
4. Update `scripts/validate-architecture.js` required files list
5. Update `system_memory.md` with new feature documentation

### PDF Reports
Use `PDFExportService` (Builder pattern):
```js
await new PDFExportService('Report Title')
  .withMetadata({ generatedBy: 'Admin' })
  .addTable(columns, data)
  .export('filename.pdf');
```

## Available Models & Agents

| Agent / Model | Purpose | Location |
|---------------|---------|----------|
| StaffEntryAgent | Auto-validates staff entries against DB | `src/lib/agent.js` |
| VisitorEntryAgent | Auto-validates visitors against meetings | `src/lib/agent.js` |
| AlertService | Generates system alerts (overstay, missing logout) | `src/services/AlertService.js` |
| NotificationService | Multi-channel notification dispatch | `src/services/notifications/` |
| PDFExportService | Branded PDF report generation | `src/utils/pdfExport.js` |
| AuthService | Authentication and session management | `src/services/AuthService.js` |

## Validation

Run these commands to validate the codebase:
```bash
npm run validate:arch  # Architecture validation
npm run build          # Build validation
npm run lint           # ESLint
```
