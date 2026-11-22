# 🎬 RIO Cinema System (Group H)

A full-stack cinema ticketing, seat reservation, and management platform built with **React**, **Node.js (Express)**, and **PostgreSQL**, containerized with **Docker** and continuously deployed to **CSC Rahti** & **CSC Pukki** via **GitHub Actions**.

---

## 🚀 Iterative Development Roadmap (Iteration 0 – 3)

Our development followed an incremental, agile workflow across four major iterations:

### **Iteration 0: UI/UX Design, Architecture & Project Foundation**

- Designed full end-to-end user interfaces, seat map layouts, and admin workflows in **Figma**.
- Established repository structure, Git branching conventions, and collaborative issue-tracking workflows.
- Designed the relational PostgreSQL database schema and baseline full-stack scaffolding.

### **Iteration 1: Core Customer Ticketing & Discovery** _(Issues #4, #5, #6, #8, #9, #11, #16)_

- Built the end-to-end customer browsing and seat selection path (Homepage → Showtimes → Interactive Seat Map → Checkout UI).
- Implemented public movie catalog, showtime schedules, event listings, ticket pricing tiers, age restrictions, and discount displays.
- Added customer account registration/login (JWT), guest checkout support, and initial temporary seat holding logic.

### **Iteration 2: Reservations, Stripe Integration & Admin Foundations** _(Issues #17–#22)_

- Integrated **Stripe** payment processing across customer checkout and reservation flows.
- Enabled registered customers to reserve seats (`reserved_unpaid`), pay later, or cancel unpaid reservations under enforced hold-window rules.
- Implemented customer waiting list registration and notifications, staff-assisted bookings, discount/booking limit rules, and initial database seed data.
- Began parallel development of the **Admin & Staff Management System**.

### **Iteration 3: Private Screenings, Group Bookings & Full Admin Operations** _(Issues #14, #24–#26; PRs #31, #32, #40)_

- Built corporate/private screening enquiry submission and staff/admin review workflows with unique reference numbers (`PR #31`).
- Expanded waiting list queue management and automated seat-release notifications (`PR #32`).
- Added group booking request and admin approval workflows (`PR #40`).
- Completed full Admin CRUD management for movies, showtimes, auditoriums, seat layouts, and sales/booking oversight.

### **Iteration 4: Containerization, Cloud Deployment & Automated CI/CD** _(Issues #34–#38)_

- Containerized frontend (multi-stage Vite build → `serve` on port `8080`) and backend (Node.js Alpine) using **Docker**.
- Provisioned **CSC Pukki** PostgreSQL DBaaS and deployed frontend/backend services on **CSC Rahti** with Secrets, ConfigMaps, and Ingress Routes.
- Built an automated **GitHub Actions** CI/CD pipeline (`.github/workflows/deploy.yaml`) pushing images to `ghcr.io` and triggering zero-downtime rolling updates on Rahti.
- Implemented an idempotent startup **Database Migration Runner** (`backend/src/config/migrate.js`) tracked via `schema_migrations` (`001` – `007+`).

### **Iteration 5 (Current): End-to-End (E2E) Testing & Production Verification** _(Issues #42–#48)_

- Executing structured manual E2E verification across six functional tracks on the live CSC Rahti deployment:
  1. Authentication, Guest Access & Role-Based Access Control (`#43`)
  2. Public Movie Catalog, Showtimes & Seat Selection (`#44`)
  3. Ticket Booking, Stripe Payment & 2-Hour Unpaid Expiration (`#45`)
  4. Group Bookings & Private Screening Enquiries (`#46`)
  5. Admin Management, System Settings & CI/CD Verification (`#47`)
  6. Showtime Waiting List & Seat Release Notifications (`#48`)
- Finalizing unpaid booking expiration rules (`showtime.start_time - 2 hours`) and production stability sign-off.

---

## 🏗️ System Architecture & Tech Stack

| Layer                | Technology                                             | Hosting / Infrastructure                                |
| :------------------- | :----------------------------------------------------- | :------------------------------------------------------ |
| **Frontend**         | React, Vite, CSS / Responsive UI                       | Docker Container (`serve :8080`) on **CSC Rahti**       |
| **Backend API**      | Node.js, Express, JWT Auth, Background Cron Jobs       | Docker Container (`node:alpine :8080`) on **CSC Rahti** |
| **Database**         | PostgreSQL (Transactional + Idempotent SQL Migrations) | **CSC Pukki** DBaaS (Restricted Rahti Subnet Access)    |
| **CI/CD & Registry** | GitHub Actions, GitHub Container Registry (`ghcr.io`)  | Automated Rolling Deployments on Push to `main`         |

---

## 📂 Project Structure

```text
Group-H-cinema-system/
├── .github/
│   └── workflows/
│       └── deploy.yaml                 # CI/CD pipeline: Docker build -> ghcr.io -> Rahti rollout
├── src/                                # Frontend React source code (pages, components, CSS)
├── public/                             # Static frontend assets
├── Dockerfile                          # Multi-stage frontend production build
├── package.json                        # Frontend dependencies & build scripts
└── backend/
    ├── Dockerfile                      # Backend Node.js Alpine container build
    ├── package.json                    # Backend dependencies & scripts
    ├── sql/
    │   └── migrations/                 # Sequential versioned SQL migrations (001_*.sql - 007_*.sql)
    └── src/
        ├── app.js                      # Express app setup, middleware & API routes
        ├── server.js                   # Entry point: DB check -> auto-migrations -> expiration job -> HTTP server
        ├── config/
        │   ├── db.js                   # PostgreSQL connection pool configuration
        │   └── migrate.js              # Idempotent startup SQL migration runner (schema_migrations)
        ├── controllers/                # Route handlers (auth, movies, showtimes, bookings, admin, waiting list)
        ├── middleware/                 # JWT authentication & RBAC authorization guards
        └── services/
            └── bookingExpirationService.js  # Periodic worker releasing expired unpaid reservations
```

---

## 🔄 CI/CD & Database Migration Workflow

- Code & Schema Push: Developers commit application changes and any new numbered SQL scripts under backend/sql/migrations/ (e.g., 008_feature_update.sql) to main.

- Automated Build & Push: GitHub Actions builds both frontend (injecting VITE_API_BASE_URL) and backend Docker images and pushes them to ghcr.io.

- Rolling Deployment: GitHub Actions authenticates to CSC Rahti via RAHTI_TOKEN and triggers a rolling update of the frontend and backend pods.

- Zero-Touch DB Migration: On startup (server.js), the backend connects to CSC Pukki inside the trusted Rahti network, executes any unapplied .sql files inside a transaction (BEGIN/COMMIT), and records them in schema_migrations before accepting traffic.

---

## 💻 Local Development Setup

### Prerequisites

- Node.js (v20+)
- PostgreSQL (v15+) or Docker Desktop

#### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env   # Configure DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, JWT_SECRET
npm run dev            # Automatically runs pending SQL migrations and starts server on port 3000
```

#### 2. Frontend Setup

```bash
   # From project root
   npm install
   cp .env.example .env # Configure VITE_API_BASE_URL=http://localhost:3000
   npm run dev # Starts Vite dev server on http://localhost:5173
```

---

## 🧪 Quality Assurance & Phase 5 E2E Testing

- Production verification is tracked systematically across six functional end-to-end test tracks:

- Authentication & RBAC: Customer registration/login, guest booking tokens, and admin route guards.

- Public Discovery: Movie catalog, showtime filtering, and real-time seat map rendering.

- Booking & Expiration Lifecycle: Concurrent seat locking, payment confirmation, and 2-hour unpaid reservation auto-release.

- Group & Private Screenings: Customer enquiry submission and admin approval workflows.

- Admin & CI/CD Health: Full CRUD operations, system settings, and automated migration verification.

- Showtime Waiting List: Sold-out queue registration, duplicate prevention, and seat-release triggers.
