# InternOps — Phase 2 Setup Guide

## What's in Phase 2

### Backend additions
| File | Purpose |
|---|---|
| `backend/middleware/upload.js` | Multer config — validates file type/size, randomizes filenames |
| `backend/controllers/mentorController.js` | Interns list, work item CRUD, submission review, mentor directory |
| `backend/controllers/internController.js` | Dashboard, work items, submit work, timeline, **cohort directory** |
| `backend/routes/mentor.js` | Mentor route definitions |
| `backend/routes/intern.js` | Intern route definitions (multipart upload on `/submit-work`) |
| `backend/server.js` | *(updated)* mounts `/api/mentor` and `/api/intern` |

### Frontend (full React app — 33 files)
| Folder | Contents |
|---|---|
| `frontend/src/api/` | Axios instance with auto token-refresh + 5 API modules |
| `frontend/src/context/`, `hooks/` | `AuthContext`, `useAuth` |
| `frontend/src/layouts/` | `AdminLayout`, `MentorLayout`, `InternLayout` (sidebar + header shell) |
| `frontend/src/components/` | Sidebar, Header, NotificationBell, StatCard, ProgressBar, Table, Modal, StatusBadge, WorkItemCard, SubmissionForm, ProtectedRoute |
| `frontend/src/pages/admin/` | Dashboard, ManageUsers (add admin/mentor/intern), ManageBatches |
| `frontend/src/pages/mentor/` | Dashboard, InternDetail + CreateWorkItemForm, **Directory**, ReviewSubmission |
| `frontend/src/pages/intern/` | Dashboard, WorkItems, WorkItemDetail (with SubmissionForm), Timeline, **Cohort**, Notifications |

**Verified:** `npm install && npx vite build` completes with **0 errors**, 122 modules transformed.

---

## New feature: RISE cohort / mentor directory

As discussed, this is **institution-wide**, not per-batch — every RISE intern can see every other RISE intern (and vice versa for mentors):

| Endpoint | Who can call it | Returns |
|---|---|---|
| `GET /api/intern/cohort` | Any intern | All interns: name, mentor, professor/admin, batch |
| `GET /api/mentor/directory` | Any mentor | All mentors: name, role, intern count |

Both are the **only** intern/mentor endpoints that read across the whole `users` table instead of filtering by `req.user.id` — this is called out explicitly in code comments at the top of both controller files so it reads as a deliberate design choice, not a security gap, if anyone reviews your code (e.g. on GitHub for your LinkedIn post).

Neither endpoint ever joins into `work_items` or `submissions` — so an intern browsing the cohort page sees *who* their batchmates are and *who* mentors them, never their progress, submissions, or feedback.

---

## Run it

### 1. Start backend (if not already running from Phase 1)

```bash
cd backend
npm install
npm run dev
```

### 2. Start frontend

```bash
cd frontend
npm install
npm run dev
```

Visit **http://localhost:3000** — Vite proxies `/api` and `/uploads` to `http://localhost:5000` automatically (see `vite.config.js`), so no CORS setup needed in dev.

### 3. Log in

Use the admin account from Phase 1 seed data:
- Email: `admin@iitjammu.ac.in`
- Password: `Admin@1234`

From there:
1. Go to **Users → Add mentor** to create a mentor (e.g. Sankar Behera)
2. Go to **Batches → New batch** if you haven't created one
3. Go to **Users → Add intern**, assign the batch + mentor
4. Log out, log in as the mentor → **My interns → New work item** to assign an assignment/task/project
5. Log out, log in as the intern → see it on the dashboard, submit work in any of the 5 formats
6. Log back in as the mentor → **Submissions** tab → approve/reject with feedback
7. As any intern → **Cohort** tab → see the full RISE roster
8. As any mentor → **Mentor directory** tab → see all mentors institution-wide

---

## What's NOT in Phase 2 (coming in Phase 3)

- Notification cron jobs (auto reminders — endpoints exist, but nothing triggers them on a schedule yet)
- Recharts analytics graphs (the `getInternAnalytics` endpoint exists and returns data; the chart UI comes in Phase 3)
- Admin's "Best mentor" institution-wide analytics
- Editable timeline (mentor side) — interns can view it, but there's no mentor UI to edit week goals yet

Say **"Start Phase 3"** when ready.
