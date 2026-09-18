# Screenshots

Screenshots captured from the live application (Edge, 1280×900) via the DevTools Protocol and saved as PNGs. Filenames match the links in the root README table.

## Web UI (Part 2)

| # | Screen | Route used | Filename |
|---|--------|------------|----------|
| 1 | Home — gig marketplace | `/` | `web_01_home.png` |
| 2 | Login | `/login` | `web_02_login.png` |
| 3 | Register | `/register` | `web_03_register.png` |
| 4 | Gig detail (public view) | `/gigs/:id` | `web_04_gig_detail.png` |
| 5 | Client dashboard — my bookings (`alex@hustlehub.demo`) | `/dashboard` | `web_05_client_dashboard.png` |
| 6 | Freelancer dashboard — my gigs (`zane@hustlehub.demo`) | `/dashboard/freelancer` | `web_06_freelancer_dashboard.png` |
| 7 | Gig form (create) | `/dashboard/gigs/new` | `web_07_gig_form.png` |
| 8 | Income + estimated tax | `/dashboard/income` | `web_08_income.png` |
| 9 | 404 Not Found | `/does-not-exist` | `web_09_404.png` |

## API responses (Part 1, Postman)

These were captured in Postman for the Part 1 milestone and show the request name, status code and response time in the footer. Keep the naming so the old README links resolve.

| # | Request | Expected Status | Filename |
|---|---------|-----------------|----------|
| 1 | GET `/api/health` | 200 | `01_health.png` |
| 2 | POST `/api/auth/register` — Freelancer success | 201 | `02_register_success.png` |
| 3 | POST `/api/auth/register` — Client success | 201 | `03_register_client.png` |
| 4 | POST `/api/auth/register` — Duplicate email | 409 | `04_register_duplicate.png` |
| 5 | POST `/api/auth/register` — Validation errors | 400 | `05_register_validation.png` |
| 6 | POST `/api/auth/register` — Admin role rejected | 400 | `06_register_admin_rejected.png` |
| 7 | POST `/api/auth/login` — Success with JWT | 200 | `07_login_success.png` |
| 8 | POST `/api/auth/login` — Wrong password | 401 | `08_login_wrong_password.png` |
| 9 | POST `/api/auth/login` — Non-existent user | 401 | `09_login_no_user.png` |
| 10 | POST `/api/auth/login` — Malformed JSON | 400 | `10_login_malformed_json.png` |
| 11 | POST `/api/auth/login` — Oversized body | 413 | `11_login_oversized.png` |
| 12 | GET `/api/auth/profile` — Valid token | 200 | `12_profile_success.png` |
| 13 | GET `/api/auth/profile` — No token | 401 | `13_profile_no_token.png` |
| 14 | GET `/api/auth/profile` — Invalid token | 401 | `14_profile_invalid_token.png` |
| 15 | GET `/api/auth/profile` — Expired token | 401 | `15_profile_expired_token.png` |
| 16 | GET `/api/unknown/route` — Not found | 404 | `16_404_unknown_route.png` |

## How the web screenshots were captured

1. Start the backend and seed: `cd backend && npm start` then `npm run seed`
2. Launch Edge with remote debugging: `msedge --remote-debugging-port=9222 --user-data-dir=<tmp> --ignore-certificate-errors about:blank`
3. Drive via the DevTools Protocol (see `scripts/capture-screens.js`): navigate each route, log in as the demo account via `fetch`, take `Page.captureScreenshot` at 1280×900.
4. Demo accounts (password `DemoPass1!`): `alex@hustlehub.demo` (client), `zane@hustlehub.demo` / `mia@hustlehub.demo` (freelancers).