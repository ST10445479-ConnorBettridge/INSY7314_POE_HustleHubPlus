# API Response Screenshots

Capture each of the following requests in **Postman** and save the screenshot here. Each screenshot should show the request name, the response **status code**, and the **response time** in the frame (the footer bar in Postman shows both).

Naming convention: use the exact filenames below so the links in the README table resolve.

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

## Minimum required (from the brief)

If time is short, at minimum capture: #1, #2, #4 (409), #5 (400), #7 (login with token), #12 (profile 200), #13 (profile 401 no token), #14 (profile 401 bad token), and #16 (404).

## Steps

1. Start the backend: `cd backend && npm start`
2. Open Postman and import `HustleHub+ Postman Collection.json`
3. Set `baseUrl` to `https://localhost:3443` and disable SSL certificate verification (Settings → General)
4. Run each request; a green check means the automated test in the request passed
5. Screenshot each one with the status code and response time visible (the second line of the Postman response footer shows `Status` and `Time`)
6. Save with the exact filenames above