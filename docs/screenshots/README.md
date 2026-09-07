# API Response Screenshots

Captured from the terminal against the live HTTPS API at `https://localhost:3443`.
Each frame shows the request, the JSON response and the HTTP status code.

| File | Covers |
|------|--------|
| `01_registration_responses.png` | health 200, register 201, duplicate 409, validation 400, login 200 |
| `02_protected_routes_and_errors.png` | profile 200, profile 401 (no token), 404 unknown route, admin role 400, malformed JSON 400 |

The full set of requests, including the invalid scenarios, is also provided as a
Postman collection in the repository root: `HustleHub+ Postman Collection.json`.

## Reproducing these

Start the backend, then in a bash shell:

```bash
API=https://localhost:3443
api(){ out=$(curl -sk -w $'
%{http_code}' "$@"); code=${out##*$'
'}; body=${out%$'
'*}; echo "$body" | python -m json.tool 2>/dev/null || echo "$body"; echo "-- HTTP $code"; }

api $API/api/health
api -X POST $API/api/auth/register -H "Content-Type: application/json" -d '{"name":"Connor Bettridge","email":"connor@example.com","password":"SecurePass1!","role":"freelancer"}'
api -X POST $API/api/auth/register -H "Content-Type: application/json" -d '{"name":"Connor Bettridge","email":"connor@example.com","password":"SecurePass1!","role":"freelancer"}'
api -X POST $API/api/auth/register -H "Content-Type: application/json" -d '{"name":"","email":"not-an-email","password":"weak","role":"superadmin"}'
api -X POST $API/api/auth/login -H "Content-Type: application/json" -d '{"email":"connor@example.com","password":"SecurePass1!"}'

TOKEN=$(curl -sk -X POST $API/api/auth/login -H "Content-Type: application/json" -d '{"email":"connor@example.com","password":"SecurePass1!"}' | python -c "import sys,json;print(json.load(sys.stdin)['data']['token'])")

api $API/api/auth/profile -H "Authorization: Bearer $TOKEN"
api $API/api/auth/profile
api $API/api/unknown/route
api -X POST $API/api/auth/register -H "Content-Type: application/json" -d '{"name":"Mallory","email":"mallory@example.com","password":"SecurePass1!","role":"admin"}'
api -X POST $API/api/auth/login -H "Content-Type: application/json" -d '{"email":"connor@example.com",'
```
