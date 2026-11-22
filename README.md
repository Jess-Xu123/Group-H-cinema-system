# RIO Cinema System (Group H)

A full-stack cinema ticketing, seat reservation, and management platform built with **React**, **Node.js (Express)**, and **PostgreSQL**, containerized with **Docker** and continuously deployed to **CSC Rahti** & **CSC Pukki** via **GitHub Actions**.

---

## Iterative Development Roadmap (Iteration 0 – 3)

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

### **Iteration 3: Private Screenings, Group Bookings & Full Admin Operations** _(Issues #14, #24–#26; #31, #32, #40)_

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

## System Architecture & Tech Stack

| Layer                | Technology                                             | Hosting / Infrastructure                                |
| :------------------- | :----------------------------------------------------- | :------------------------------------------------------ |
| **Frontend**         | React, Vite, CSS / Responsive UI                       | Docker Container (`serve :8080`) on **CSC Rahti**       |
| **Backend API**      | Node.js, Express, JWT Auth, Background Cron Jobs       | Docker Container (`node:alpine :8080`) on **CSC Rahti** |
| **Database**         | PostgreSQL (Transactional + Idempotent SQL Migrations) | **CSC Pukki** DBaaS (Restricted Rahti Subnet Access)    |
| **CI/CD & Registry** | GitHub Actions, GitHub Container Registry (`ghcr.io`)  | Automated Rolling Deployments on Push to `main`         |

---

## Project Structure

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

## Cloud Infrastructure & CI/CD Deployment Workflow

Our deployment architecture separates **one-time cloud infrastructure provisioning** (CSC Pukki + CSC Rahti) from **continuous, automated delivery** (GitHub Actions + `ghcr.io` + startup SQL migrations).

### Part 1: Initial Cloud Infrastructure Provisioning (One-Time Setup)

1. **Provisioning CSC Pukki PostgreSQL DBaaS:**
   - Created a managed PostgreSQL instance on **CSC Pukki** (`pukki.dbaas.csc.fi`) and initialized the baseline database schema.
   - Configured network firewall rules to restrict database access strictly to the **CSC Rahti** cluster egress subnet (`86.50.229.0/24`), blocking direct public internet connections.
2. **Configuring CSC Rahti (OpenShift) Environment:**
   - Created a project namespace in **CSC Rahti** and configured **Secrets** & **ConfigMaps** for backend runtime environment variables (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `CLIENT_URL`).
   - Configured container image pull secrets so Rahti pods can pull private/public images from **GitHub Container Registry (`ghcr.io`)**.
   - Exposed both frontend and backend services externally via Rahti **Routes / Ingress** (mapping external HTTPS traffic to container port `8080`).
3. **Connecting GitHub Actions to Rahti:**
   - Created a permanent `ServiceAccount` in Rahti with deployment rollout permissions and stored its access token as `RAHTI_TOKEN` in **GitHub Repository Secrets**.

---

### Part 2: Automated CI/CD & Database Migration Pipeline (On Every Push to `main`)

Once the baseline infrastructure was live, we transitioned from manual S2I builds to a fully automated containerized pipeline (`.github/workflows/deploy.yaml`):

1. **Code & Versioned Schema Push:**
   - Developers commit frontend/backend code changes alongside any new sequential SQL migration scripts under `backend/sql/migrations/` (e.g., `007_update_unpaid_booking_expiry.sql`, `008_feature_update.sql`) and push to the `main` branch.
2. **Multi-Stage Docker Build & Registry Push (`ghcr.io`):**
   - **Frontend Image:** Built using a multi-stage `Dockerfile` (Stage 1 compiles the Vite/React bundle with `VITE_API_BASE_URL` baked in at build time; Stage 2 serves static assets via `serve` on port `8080`).
   - **Backend Image:** Built on lightweight `node:alpine` exposing port `8080`.
   - Both images are tagged and pushed automatically to `ghcr.io/jess-xu123/...`.
3. **Zero-Downtime Rolling Update on CSC Rahti:**
   - GitHub Actions authenticates to the CSC Rahti API using `RAHTI_TOKEN` and triggers a rolling update (`oc rollout restart`) for both frontend and backend deployments.
   - Rahti spins up new pods with the latest images and gracefully terminates old pods only after health checks pass.
4. **Zero-Touch Automated Database Migration (`migrate.js`):**
   - Because GitHub Actions runners use dynamic public IPs blocked by Pukki's firewall, database migrations execute **inside the backend pod at startup** (`backend/src/server.js`), which already resides within Rahti's trusted network.
   - Before accepting HTTP traffic or starting the background expiration cron job, `runMigrations(pool)` (`backend/src/config/migrate.js`):
     1. Ensures the `schema_migrations` tracking table exists.
     2. Reads all `.sql` files in `backend/sql/migrations/` in alphanumeric order.
     3. Executes any unapplied script inside an atomic PostgreSQL transaction (`BEGIN` / `COMMIT` with automatic `ROLLBACK` on error) and logs the filename into `schema_migrations`.

---

## Local Development Setup

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

## Quality Assurance & E2E Testing

- Production verification is tracked systematically across six functional end-to-end test tracks:

- Authentication & RBAC: Customer registration/login, guest booking tokens, and admin route guards.

- Public Discovery: Movie catalog, showtime filtering, and real-time seat map rendering.

- Booking & Expiration Lifecycle: Concurrent seat locking, payment confirmation, and 2-hour unpaid reservation auto-release.

- Group & Private Screenings: Customer enquiry submission and admin approval workflows.

- Admin & CI/CD Health: Full CRUD operations, system settings, and automated migration verification.

- Showtime Waiting List: Sold-out queue registration, duplicate prevention, and seat-release triggers.
