# NGS System — System Memory

> **Nextgen Shield (NGS)** — Premium school security gate management system for Lyceum Global Schools.  
> This is the central knowledge document for all agents, models, and developers working on the system.

---

## 1. System Overview

NGS replaces manual logbooks with a role-based digital infrastructure for tracking **visitors**, **vehicles**, and **staff entries** at school gates. It features automated alert generation, meeting lifecycle management, and multi-channel notifications.

### Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | React 19 + Vite 7 |
| Styling | Vanilla CSS with Glassmorphism design language |
| Backend | Supabase (PostgreSQL with RLS) |
| Auth | Custom bcrypt (not Supabase Auth) |
| i18n | i18next (English + Sinhala) |
| PDF | jsPDF with custom branded templates |
| Charts | Chart.js + react-chartjs-2 |
| Animations | Framer Motion |
| Icons | Lucide React |
| Calendar | Google Calendar API (GAPI + GSI) |
| Notifications | Telegram Bot (via Edge Function proxy), SMS (stub) |
| Edge Functions | Deno (Supabase Edge Functions) |

---

## 2. Features

### 2.1 Visitor Management
- **Self Check-In (Kiosk)**: Visitors register at a dedicated kiosk terminal
- **Scheduled Arrival**: Security confirms pre-registered meetings with one click
- **Walk-in Registration**: Security captures details for unexpected visitors
- **Multi-visitor Support**: A single meeting can include multiple visitors
- **NIC/Passport Validation**: Identity document capture during check-in
- **Photo Capture**: Optional visitor photo during kiosk check-in

### 2.2 Meeting Management
- **Meeting Scheduling**: Staff schedule meetings with time slot validation (7:30 AM - 5:30 PM)
- **Approval Workflow**: Telegram-based or web portal approval with time slot assignment
- **External Approval Links**: Secure token-based approval URLs sent via Telegram
- **Public Meeting Request**: External parties can request meetings via a public web form
- **Google Calendar Sync**: Automatic CRUD on Google Calendar events

### 2.3 Vehicle Tracking
- **Vehicle Entry/Exit**: License plate, vehicle type, driver name tracking
- **ANPR Ready**: Infrastructure prepared for Automated Number Plate Recognition
- **Overstay Alerts**: Vehicles on premises > 4 hours trigger alerts

### 2.4 Alert Engine
- **Missing Logout (Visitors)**: Checked-in visitors > 4 hours or after 6 PM
- **Missing Logout (Vehicles)**: Vehicles on premises > 4 hours
- **Meeting Overstay**: Meetings past scheduled end time without completion
- **Severity Levels**: `warning` (4-6hrs), `critical` (>6hrs)
- **Auto-generation**: Runs on page load + polling every 5 minutes
- **Read/Unread Management**: Per-alert read state tracking

### 2.5 Reporting
- **11 Specialized Reports**: Dynamic filtering, date range, status
- **Branded PDF Export**: Company header, logo, color-coded status cells
- **Interactive Charts**: Chart.js visualizations for visitor trends
- **CSV Exports**: Standardized data export utility (legacy)

### 2.6 Security & Access Control
- **RBAC**: 5 roles with route-level and feature-level permissions
- **bcrypt Authentication**: Hashed passwords with strength validation
- **Session Management**: localStorage-based session with integrity checks
- **Audit Trail**: Full history of all system actions in `audit_logs` table
- **RLS Policies**: Row-Level Security on all Supabase tables

### 2.7 Communication
- **Telegram Bot**: Meeting request notifications with inline approval buttons
- **SMS**: Stub implementation ready for gateway integration
- **Google Calendar Events**: Automatic meeting synchronization

### 2.8 i18n (Internationalization)
- **Languages**: English (en), Sinhala (si)
- **Translation Sync**: Database-driven translations synced on app load
- **Language Switcher**: In-app language toggle component

### 2.9 Theming
- **Dark/Light Mode**: Toggle via `data-theme` attribute
- **Glassmorphism Design**: `backdrop-filter`, glass borders, shadow tokens
- **CSS Variables**: `--primary`, `--glass-bg`, `--text-main`, `--glass-blur`, etc.

---

## 3. Roles & Permissions

| Role | Dashboard | Meetings | Vehicles | Reports | Audit | Users | Settings | Alerts |
|------|:---------:|:--------:|:--------:|:-------:|:-----:|:-----:|:--------:|:------:|
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Security HOD | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Security Officer | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| School Management | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| School Operations | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |

---

## 4. Workflows

### 4.1 Visitor Entry Flow
```
Visitor Arrives → Kiosk Self Check-In OR Security Manual Entry
    → If Pre-registered: Auto-match against scheduled_meetings → Auto-confirm
    → If Walk-in: Create new visitor record → Status: "Pending"
    → Telegram Notification sent to approval group
    → Approver clicks "Approve & Set Time" → Meeting approved
    → Visitor completes formal check-in at kiosk
```

### 4.2 Meeting Lifecycle
```
Meeting Request (walk-in / web / kiosk)
    → Telegram notification with approval link
    → Approver sets time slot (7:30 AM - 5:30 PM)
    → Status: Scheduled → Approved → Confirmed (arrival) → Completed
    → Google Calendar event created/updated at each stage
    → Alert generated if meeting exceeds end time
```

### 4.3 Alert Generation
```
Every 5 minutes (polling):
    1. Check visitors: entry_time > 4 hours AND no exit_time → Missing Logout
    2. Check visitors: still present after 6 PM → Missing Logout
    3. Check vehicles: entry_time > 4 hours AND no exit_time → Missing Logout
    4. Check meetings: today + scheduled + end_time < now → Overstay
    → Deduplicate: only create if no existing alert for same source_id + category today
```

### 4.4 Vehicle Tracking
```
Vehicle Arrives → Security logs: plate, type, driver, purpose
    → entry_time recorded
    → Vehicle exits → Security logs exit → exit_time recorded
    → If > 4 hours without exit → Alert generated
```

---

## 5. Architecture

### 5.1 Directory Structure
```
NGS-System/
├── src/
│   ├── services/              # Domain services (OOP)
│   │   ├── BaseService.js     # Abstract repository
│   │   ├── VisitorService.js
│   │   ├── MeetingService.js
│   │   ├── VehicleService.js
│   │   ├── AlertService.js    # Facade over domain services
│   │   ├── AuthService.js
│   │   ├── index.js           # Barrel export
│   │   └── notifications/
│   │       ├── NotificationStrategy.js  # Abstract + implementations
│   │       └── NotificationService.js   # Orchestrator
│   ├── components/            # Reusable UI (PascalCase .jsx)
│   ├── views/                 # Page components (PascalCase .jsx)
│   ├── context/               # React Contexts (thin service wrappers)
│   ├── lib/                   # Infrastructure (Supabase, agents, integrations)
│   ├── utils/                 # Pure functions (RBAC, PDF, passwords)
│   ├── assets/                # Static assets
│   └── locales/               # i18n translation files
├── supabase/
│   ├── migrations/            # Timestamped SQL migrations
│   └── functions/             # Edge functions (telegram-bot, telegram-proxy)
├── scripts/                   # Build/validation scripts
├── .agents/skills/            # Agent skill definitions
├── system_memory.md           # THIS FILE — Central knowledge doc
└── development_log.md         # Chronological dev history
```

### 5.2 Design Patterns Used

| Pattern | Where | Purpose |
|---------|-------|---------|
| Repository | BaseService | Standard CRUD abstraction |
| Template Method | EntryAgent | Agent validation lifecycle |
| Strategy | NotificationStrategy | Multi-channel notifications |
| Facade | AlertService | Orchestrate domain services for alerts |
| Builder | PDFExportService | Chainable PDF configuration |
| Singleton | supabase.js | Single client instance |
| Observer | AlertContext polling | Periodic alert checks |

### 5.3 Import Boundaries
```
Views → Services → Lib/Supabase
Views → Utils (pure functions)
Views → Context (state)
Components → Lib (never Views)
Services → Lib/Supabase (BaseService provides client)
```

---

## 6. Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| `users` | System user accounts with bcrypt password hashes |
| `visitors` | Visitor check-in/out records |
| `scheduled_meetings` | Meeting lifecycle with multi-visitor grouping via `meeting_id` |
| `vehicle_entries` | Vehicle entry/exit tracking |
| `alerts` | System-generated alerts (overstay, missing logout) |
| `audit_logs` | Full action history (login, approve, modify, etc.) |
| `translations` | i18n key-value pairs synced to frontend |

### Key Relationships
- `scheduled_meetings.meeting_id` groups multiple visitors in one meeting
- `alerts.source_id` references the entity that triggered the alert
- `audit_logs.user_id` tracks who performed each action

---

## 7. Environment Variables

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth2 client ID |
| `VITE_GOOGLE_API_KEY` | Google API key for Calendar |
| `VITE_PRINCIPAL_CALENDAR_ID` | Google Calendar ID for events |
| `VITE_TELEGRAM_PROXY_URL` | Supabase Edge Function URL for Telegram |
| `VITE_TELEGRAM_CHAT_ID` | Telegram group chat ID for notifications |
| `VITE_APP_URL` | Public app URL for approval links |

---

## 8. Design Guidelines

### Color Palette
- **Primary**: `hsl(33, 100%, 50%)` — Orange/Gold accent
- **Header BG**: `rgb(15, 23, 42)` — Deep navy
- **Glass BG**: `rgba(255, 255, 255, 0.05)` (dark) / `rgba(255, 255, 255, 0.7)` (light)
- **Success**: `rgb(16, 185, 129)` — Green
- **Warning**: `rgb(245, 158, 11)` — Amber
- **Danger**: `rgb(239, 68, 68)` — Red

### Typography
- System font stack with fallbacks
- Font weights: 400 (body), 600 (labels), 800 (headings)
- Letter spacing: `-0.02em` for headings

### Spacing & Layout
- Sidebar: 280px fixed width (desktop), drawer (mobile)
- Border radius: `16px` (cards), `10px` (buttons), `8px` (inputs)
- Responsive breakpoint: 768px

---

## 9. Validation Commands

```bash
npm run validate:arch  # Check architecture rules + service layer
npm run build          # Vite production build
npm run lint           # ESLint checks
npm run dev            # Development server
```
