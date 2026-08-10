from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
import os

doc = Document()

# Styles
style = doc.styles['Normal']
font = style.font
font.name = 'Calibri'
font.size = Pt(11)

# ====== TITLE PAGE ======
doc.add_paragraph()
doc.add_paragraph()
title = doc.add_paragraph()
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = title.add_run('HustleHub+\nPart 1 - Secure Foundations')
run.bold = True
run.font.size = Pt(28)
run.font.color.rgb = RGBColor(44, 62, 80)

doc.add_paragraph()
subtitle = doc.add_paragraph()
subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = subtitle.add_run('Secure Freelance Marketplace Platform\nBackend API Implementation')
run.font.size = Pt(16)
run.font.color.rgb = RGBColor(127, 140, 141)

doc.add_paragraph()
doc.add_paragraph()
info = doc.add_paragraph()
info.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = info.add_run('The Independent Institute of Education (Pty) Ltd 2026')
run.font.size = Pt(12)
run.font.color.rgb = RGBColor(149, 165, 166)

doc.add_page_break()

# ====== TABLE OF CONTENTS ======
doc.add_heading('Table of Contents', level=1)
toc_items = [
    '1. System Overview',
    '2. Intended Users',
    '3. Architecture Diagram',
    '4. Architecture Explanation',
    '5. Backend Structure',
    '6. API Endpoints',
    '7. Security Decisions',
    '8. Setup Instructions',
    '9. Testing with Postman',
    '10. Automated Test Results',
    '11. Android Client Application',
    'Appendix A: Postman Collection Export',
]
for item in toc_items:
    p = doc.add_paragraph(item)
    p.paragraph_format.space_after = Pt(2)

doc.add_page_break()

# ====== 1. SYSTEM OVERVIEW ======
doc.add_heading('1. System Overview', level=1)
doc.add_paragraph(
    'HustleHub+ is a freelance marketplace platform that connects freelancers offering services with clients '
    'seeking to book those services. The platform processes financial transactions and provides income tracking '
    'with estimated tax calculations.'
)
doc.add_paragraph(
    'The system follows the MERN architecture (MongoDB, Express, React, Node.js), though at this foundational '
    'stage (Part 1), data is stored in-memory. A database will be integrated in Part 2.'
)
doc.add_heading('Core Features (Part 1)', level=2)
features = [
    'Secure user registration and authentication',
    'Role-based user accounts (Client, Freelancer, Admin)',
    'JWT-based protected API routes',
    'HTTPS-secured communications',
    'Input validation and sanitisation',
    'Structured error handling and logging',
    'Rate limiting and security headers (Helmet)',
]
for f in features:
    doc.add_paragraph(f, style='List Bullet')

# ====== 2. INTENDED USERS ======
doc.add_heading('2. Intended Users', level=1)
doc.add_paragraph('The platform supports three user roles:')

table = doc.add_table(rows=4, cols=3)
table.style = 'Light Shading Accent 1'
table.alignment = WD_TABLE_ALIGNMENT.CENTER

headers = ['Role', 'Description', 'Permissions']
for i, h in enumerate(headers):
    cell = table.rows[0].cells[i]
    cell.text = h
    cell.paragraphs[0].runs[0].bold = True

roles_data = [
    ('Client', 'Browses services and books gigs', 'View gigs, book services, manage bookings'),
    ('Freelancer', 'Creates and manages gig listings', 'Create/manage gigs, view income, view tax estimates'),
    ('Admin', 'Manages the platform', 'Oversee users, manage transactions, system administration'),
]
for row_idx, (role, desc, perms) in enumerate(roles_data, 1):
    table.rows[row_idx].cells[0].text = role
    table.rows[row_idx].cells[1].text = desc
    table.rows[row_idx].cells[2].text = perms

# ====== 3. ARCHITECTURE DIAGRAM ======
doc.add_heading('3. Architecture Diagram', level=1)
doc.add_paragraph(
    'The following diagram illustrates the MERN-based architecture of HustleHub+, including security '
    'features and system boundaries.'
)

# Insert the SVG as image - convert to PNG first? Actually python-docx doesn't support SVG.
# Let's use the existing architecture-diagram.svg and note it's a separate file.
doc.add_paragraph('Note: The architecture diagram is provided as a separate SVG file:')
p = doc.add_paragraph()
p.add_run('architecture-diagram.svg').bold = True

doc.add_paragraph(
    'Alternatively, see below for a text representation of the architecture:'
)

architecture_text = """
SYSTEM BOUNDARY
├── CLIENT LAYER (Android app - Kotlin)
│   └── HTTPS Requests with JWT (Retrofit/OkHttp)
│
├── EXPRESS API SERVER (Node.js)
│   ├── Routes
│   │   ├── Auth Routes (/register, /login, /profile)
│   │   ├── Gig Routes (Part 2)
│   │   └── Transaction Routes (Part 2)
│   ├── Middleware Pipeline
│   │   ├── JWT Authentication
│   │   ├── Input Validation
│   │   ├── Error Handler
│   │   └── Logger (Winston)
│   └── Security Controls
│       ├── Helmet (HTTP Headers)
│       ├── Rate Limiting
│       ├── HTTPS / TLS
│       ├── Input Validation
│       └── CORS
│
└── DATA STORES
    ├── In-Memory Storage (Phase 1)
    ├── MongoDB (Phase 2)
    └── Log Files (Winston)
"""

p = doc.add_paragraph()
run = p.add_run(architecture_text)
run.font.size = Pt(9)
run.font.name = 'Courier New'

# ====== 4. ARCHITECTURE EXPLANATION ======
doc.add_heading('4. Architecture Explanation', level=1)
doc.add_paragraph(
    'The architecture follows the MERN stack pattern with a clear separation of concerns across layers:'
)

doc.add_heading('4.1 Client Layer', level=2)
doc.add_paragraph(
    'The client layer is implemented as a native Android application (Kotlin) located in the android/ '
    'folder. It communicates with the API exclusively over HTTPS at https://10.0.2.2:3443/ (the '
    'emulator\'s alias for the host machine). All protected requests include JWT tokens in the '
    'Authorization header. The client pins the backend\'s self-signed certificate so only the exact '
    'HustleHub+ backend certificate is trusted, and stores the JWT in EncryptedSharedPreferences '
    '(AES-256-GCM).'
)

doc.add_heading('4.2 API Layer (Express/Node.js)', level=2)
doc.add_paragraph(
    'The Express.js server is the core of the backend, implementing a middleware pipeline architecture. '
    'Requests flow through security middleware before reaching route handlers:'
)
pipeline = [
    'Helmet sets secure HTTP headers (CSP, HSTS, X-Frame-Options, etc.)',
    'CORS controls cross-origin resource sharing',
    'Rate Limiting restricts request frequency per IP',
    'Body parser limits payload size (10KB)',
    'Route-level validation middleware checks input',
    'Route handlers execute business logic',
    'Centralised error handler catches and sanitises all errors',
]
for p_text in pipeline:
    doc.add_paragraph(p_text, style='List Bullet')

doc.add_heading('4.3 Security Layer', level=2)
doc.add_paragraph(
    'Security is embedded throughout the architecture rather than being an add-on. Key security components include:'
)
security = [
    'Password hashing via bcrypt (12 rounds) - ensures stored credentials are never plain-text',
    'JWT-based authentication - stateless token verification on every protected request',
    'HTTPS/TLS encryption - all data in transit is encrypted',
    'Input validation via express-validator - rejects malformed or malicious input',
    'Rate limiting - prevents brute-force and DoS attacks',
    'Helmet middleware - sets security-focused HTTP headers',
    'Controlled error responses - never exposes stack traces or internal paths',
]
for s in security:
    doc.add_paragraph(s, style='List Bullet')

doc.add_heading('4.4 Data Layer', level=2)
doc.add_paragraph(
    'Currently using in-memory storage for user data. This will be migrated to MongoDB in Part 2. '
    'Logging is handled by Winston, writing structured JSON logs to the filesystem.'
)

# ====== 5. BACKEND STRUCTURE ======
doc.add_heading('5. Backend Structure', level=1)
doc.add_paragraph('The backend project is organised as follows:')

structure_lines = [
    'backend/',
    '  server.js                  # Entry point - HTTPS server',
    '  .env                       # Environment variables',
    '  package.json',
    '  certs/',
    '    cert.pem                 # SSL certificate (self-signed)',
    '    key.pem                  # SSL private key',
    '  logs/                      # Application logs (generated at runtime)',
    '  scripts/',
    '    generate-cert.js          # Self-signed certificate generator',
    '  src/',
    '    app.js                   # Express app configuration',
    '    middleware/',
    '      auth.js                # JWT authentication middleware',
    '      errorHandler.js        # Centralised error handler',
    '      validate.js            # Input validation rules',
    '    models/',
    '      user.js                # User model (in-memory storage)',
    '    routes/',
    '      auth.js                # Auth routes',
    '    utils/',
    '      logger.js              # Winston logger configuration',
    '  tests/',
    '    auth.test.js             # Jest unit tests',
]

for line in structure_lines:
    doc.add_paragraph(line)

# ====== 6. API ENDPOINTS ======
doc.add_heading('6. API Endpoints', level=1)
doc.add_paragraph('The following API endpoints are implemented:')

api_table = doc.add_table(rows=5, cols=4)
api_table.style = 'Light Shading Accent 1'
api_table.alignment = WD_TABLE_ALIGNMENT.CENTER

api_headers = ['Method', 'Endpoint', 'Auth Required', 'Description']
for i, h in enumerate(api_headers):
    api_table.rows[0].cells[i].text = h
    api_table.rows[0].cells[i].paragraphs[0].runs[0].bold = True

api_data = [
    ('GET', '/api/health', 'No', 'Health check / server status'),
    ('POST', '/api/auth/register', 'No', 'Register a new user'),
    ('POST', '/api/auth/login', 'No', 'Login and receive JWT token'),
    ('GET', '/api/auth/profile', 'Yes', 'Get authenticated user profile'),
]
for row_idx, (method, endpoint, auth, desc) in enumerate(api_data, 1):
    api_table.rows[row_idx].cells[0].text = method
    api_table.rows[row_idx].cells[1].text = endpoint
    api_table.rows[row_idx].cells[2].text = auth
    api_table.rows[row_idx].cells[3].text = desc

doc.add_heading('Request/Response Examples', level=2)
doc.add_paragraph('Registration Request (POST /api/auth/register):')
p = doc.add_paragraph()
run = p.add_run('{"name": "John Doe", "email": "john@example.com", "password": "SecurePass1!", "role": "freelancer"}')
run.font.size = Pt(9)
run.font.name = 'Courier New'

doc.add_paragraph('Registration Response (201 Created):')
p = doc.add_paragraph()
run = p.add_run(
    '{"status": "success", "message": "User registered successfully", '
    '"data": {"user": {"id": 1, "name": "John Doe", "email": "john@example.com", '
    '"role": "freelancer"}, "token": "eyJhbGciOiJIUzI1NiIs..."}}'
)
run.font.size = Pt(9)
run.font.name = 'Courier New'

doc.add_paragraph('Login Request (POST /api/auth/login):')
p = doc.add_paragraph()
run = p.add_run('{"email": "john@example.com", "password": "SecurePass1!"}')
run.font.size = Pt(9)
run.font.name = 'Courier New'

doc.add_paragraph('Error Response (401 Unauthorized):')
p = doc.add_paragraph()
run = p.add_run('{"status": "error", "statusCode": 401, "message": "Invalid email or password"}')
run.font.size = Pt(9)
run.font.name = 'Courier New'

# ====== 7. SECURITY DECISIONS ======
doc.add_heading('7. Security Decisions', level=1)

doc.add_heading('7.1 Password Hashing', level=2)
doc.add_heading('Algorithm: bcrypt with 12 salt rounds', level=3)
doc.add_paragraph(
    'bcrypt was selected as the password hashing algorithm for the following reasons:'
)
reasons = [
    'Slow by design: bcrypt is deliberately computationally expensive, making brute-force and '
    'rainbow table attacks infeasible. A single bcrypt hash at 12 rounds takes approximately 250ms '
    'to compute, severely limiting attack velocity.',
    'Built-in salting: Each password is automatically combined with a unique cryptographic salt before '
    'hashing. This means even if two users have the same password, their stored hashes will be different, '
    'preventing rainbow table attacks.',
    'Adaptive cost factor: The cost factor (salt rounds) can be increased as hardware improves, maintaining '
    'future security without changing the algorithm.',
    'Proven track record: bcrypt has been widely peer-reviewed since 1999 and is considered the industry '
    'standard for password storage.',
]
for r in reasons:
    doc.add_paragraph(r, style='List Bullet')

doc.add_paragraph(
    'Implementation: Passwords are hashed BEFORE storage using bcrypt.hash() with 12 salt rounds. '
    'During login, bcrypt.compare() performs constant-time comparison to prevent timing attacks. '
    'Under no circumstances are plain-text passwords retained in memory beyond the request lifecycle.'
)

doc.add_heading('7.2 Token-Based Authentication (JWT)', level=2)
doc.add_heading('Algorithm: HS256 (HMAC with SHA-256)', level=3)
doc.add_paragraph(
    'JSON Web Tokens (JWT) were chosen for authentication because:'
)
jwt_reasons = [
    'Stateless: No server-side session storage is required. Tokens are self-contained, reducing database '
    'load and enabling horizontal scaling.',
    'Self-validating: Each token contains the user identity and metadata, cryptographically signed by the '
    'server. No token lookup is needed on each request.',
    'Expiration: Tokens have a configurable expiry (JWT_EXPIRES_IN = 1 hour), limiting the window of '
    'compromised token misuse.',
    'Payload transparency: The token payload includes user ID, email, role, and name, allowing downstream '
    'middleware to make authorization decisions without additional database queries.',
]
for r in jwt_reasons:
    doc.add_paragraph(r, style='List Bullet')

doc.add_paragraph(
    'Validation Flow: (1) Client sends Authorization: Bearer <token> header -> '
    '(2) Server verifies signature using JWT_SECRET -> '
    '(3) Server checks token expiration -> '
    '(4) Decoded payload is attached to req.user -> '
    '(5) Invalid/expired tokens return 401 status.'
)

doc.add_heading('7.3 Input Validation', level=2)
doc.add_paragraph(
    'Library: express-validator provides middleware-based validation with the following rules:'
)

val_table = doc.add_table(rows=3, cols=2)
val_table.style = 'Light Shading Accent 1'
val_table.cell(0, 0).text = 'Field'
val_table.cell(0, 1).text = 'Validation Rules'
val_table.cell(0, 0).paragraphs[0].runs[0].bold = True
val_table.cell(0, 1).paragraphs[0].runs[0].bold = True

val_data = [
    ('Name', 'Required, trimmed, max 100 characters, HTML-escaped'),
    ('Email', 'Required, valid email format, normalised (lowercased)'),
    ('Password', 'Min 8 chars, must contain: uppercase, lowercase, number, special character'),
    ('Role', 'Must be one of: client, freelancer, admin'),
]
for row_idx, (field, rules) in enumerate(val_data, 1):
    if row_idx < len(val_table.rows):
        val_table.rows[row_idx].cells[0].text = field
        val_table.rows[row_idx].cells[1].text = rules

doc.add_paragraph(
    'Why validate? Validation prevents injection attacks, enforces data integrity, reduces the attack surface, '
    'and provides clear user feedback. All validation occurs in the middleware pipeline before business logic '
    'execution. Invalid input is immediately rejected with a 400 status code.'
)

doc.add_heading('7.4 HTTPS Configuration', level=2)
doc.add_paragraph(
    'The server uses Node.js https.createServer with a locally generated SSL certificate. '
    'Key points about HTTPS implementation:'
)
https_points = [
    'Encryption in transit: All API traffic is encrypted using TLS, preventing eavesdropping and '
    'man-in-the-middle attacks.',
    'Data integrity: TLS ensures data cannot be tampered with during transmission.',
    'Certificate: A self-signed certificate is generated for development using node-forge. '
    'In production, certificates from a trusted CA (e.g., Let\'s Encrypt) should be used.',
    'Port: The server listens on port 3443 (HTTPS).',
]
for p_text in https_points:
    doc.add_paragraph(p_text, style='List Bullet')

doc.add_heading('7.5 Additional Security Measures', level=2)
additional = [
    'Helmet: Sets secure HTTP headers including Content-Security-Policy, X-Content-Type-Options, '
    'X-Frame-Options, and Strict-Transport-Security.',
    'Rate Limiting: Global limit of 100 requests per 15 minutes; auth endpoints limited to 10 requests '
    'per 15 minutes per IP.',
    'Request Body Size Limit: 10KB maximum payload to prevent large payload attacks.',
    'Controlled Error Responses: Generic "Internal server error" for unexpected errors; never exposes '
    'stack traces, file paths, or internal configuration.',
    'Structured Logging: Winston logs key events (registration, login, auth failures) server-side only.',
]
for p_text in additional:
    doc.add_paragraph(p_text, style='List Bullet')

# ====== 8. SETUP INSTRUCTIONS ======
doc.add_heading('8. Setup Instructions', level=1)

doc.add_heading('Prerequisites', level=2)
prereqs = ['Node.js v18 or higher', 'npm']
for p_text in prereqs:
    doc.add_paragraph(p_text, style='List Bullet')

doc.add_heading('Installation Steps', level=2)
steps = [
    'cd backend',
    'npm install',
    'node scripts/generate-cert.js',
    'npm start  (or npm run dev for auto-reload)',
]
for i, step in enumerate(steps, 1):
    doc.add_paragraph(f'{i}. {step}')

doc.add_paragraph('The server starts on https://localhost:3443')

doc.add_heading('Running Tests', level=2)
doc.add_paragraph('npm test')

# ====== 9. TESTING WITH POSTMAN ======
doc.add_heading('9. Testing with Postman', level=1)
doc.add_paragraph(
    'A Postman collection is included in the project submission: "HustleHub+ Postman Collection.json"'
)
postman_steps = [
    'Import the collection into Postman',
    'Set the baseUrl variable to https://localhost:3443',
    'Disable SSL certificate verification in Postman settings '
    '(Settings > General > SSL certificate verification: OFF)',
    'Test endpoints in the following order:',
]
for p_text in postman_steps:
    doc.add_paragraph(p_text, style='List Bullet')

doc.add_paragraph('Recommended test order:')
order = [
    '1. Health Check (GET /api/health)',
    '2. Register - Freelancer (POST /api/auth/register)',
    '3. Register - Client (POST /api/auth/register)',
    '4. Register - Duplicate Email (POST /api/auth/register - expects 409 error)',
    '5. Register - Validation Error (POST /api/auth/register - expects 400 error)',
    '6. Login - Success (POST /api/auth/login)',
    '7. Login - Wrong Password (POST /api/auth/login - expects 401 error)',
    '8. Login - Non-Existent User (POST /api/auth/login - expects 401 error)',
    '9. Profile - Authenticated (GET /api/auth/profile - with token)',
    '10. Profile - No Token (GET /api/auth/profile - expects 401 error)',
    '11. Profile - Invalid Token (GET /api/auth/profile - expects 401 error)',
    '12. 404 - Unknown Route (GET /api/unknown - expects 404 error)',
]
for p_text in order:
    doc.add_paragraph(p_text)

doc.add_paragraph()
doc.add_paragraph(
    'The collection includes pre-configured test scripts that validate response status codes, '
    'check for proper error handling, and automatically save the JWT token for use in subsequent requests.'
)

# ====== 10. AUTOMATED TEST RESULTS ======
doc.add_heading('10. Automated Test Results', level=1)
doc.add_paragraph(
    'Jest unit tests were implemented covering all API endpoints. Test results confirm all 16 tests pass:'
)

test_table = doc.add_table(rows=17, cols=3)
test_table.style = 'Light Shading Accent 1'
test_table.alignment = WD_TABLE_ALIGNMENT.CENTER

test_table.rows[0].cells[0].text = 'Test Suite'
test_table.rows[0].cells[1].text = 'Test Name'
test_table.rows[0].cells[2].text = 'Result'
for cell in test_table.rows[0].cells:
    cell.paragraphs[0].runs[0].bold = True

test_results = [
    ('Register', 'Register a new freelancer successfully', 'PASS'),
    ('Register', 'Register a new client successfully', 'PASS'),
    ('Register', 'Reject duplicate email registration', 'PASS'),
    ('Register', 'Reject registration with weak password', 'PASS'),
    ('Register', 'Reject registration with invalid email', 'PASS'),
    ('Register', 'Reject registration with invalid role', 'PASS'),
    ('Register', 'Reject registration with empty name', 'PASS'),
    ('Login', 'Login successfully with valid credentials', 'PASS'),
    ('Login', 'Reject login with wrong password', 'PASS'),
    ('Login', 'Reject login with non-existent email', 'PASS'),
    ('Login', 'Reject login with missing password', 'PASS'),
    ('Profile', 'Reject profile access without token', 'PASS'),
    ('Profile', 'Reject profile access with invalid token', 'PASS'),
    ('Profile', 'Return profile with valid token', 'PASS'),
    ('Health', 'Return health status', 'PASS'),
    ('404', 'Return 404 for unknown routes', 'PASS'),
]

for row_idx, (suite, name, result) in enumerate(test_results, 1):
    test_table.rows[row_idx].cells[0].text = suite
    test_table.rows[row_idx].cells[1].text = name
    test_table.rows[row_idx].cells[2].text = result

doc.add_paragraph()
test_summary = doc.add_paragraph()
run = test_summary.add_run('Test Suites: 1 passed, 1 total | Tests: 16 passed, 16 total')
run.bold = True

# ====== 11. ANDROID CLIENT APPLICATION ======
doc.add_heading('11. Android Client Application', level=1)
doc.add_paragraph(
    'In addition to the Node.js backend, a native Android client (Kotlin) was implemented to demonstrate '
    'the Part 1 security requirements from the client side. The app lives in the android/ folder of the '
    'project and was verified end-to-end against the running backend on an Android emulator.'
)

doc.add_heading('11.1 Features', level=2)
android_features = [
    'Splash-to-Login routing with JWT persistence (stays signed in until the token expires)',
    'Registration with role selection (Client / Freelancer) and auto-login',
    'Login with server-side credential validation (wrong credentials show the API\'s 401 message)',
    'Dashboard showing the authenticated profile, the JWT token, and a live security status panel',
    'Client-side input validation mirroring the server rules (email format, password strength, confirm-password match)',
    'Encrypted token storage via EncryptedSharedPreferences (AES-256-GCM)',
    'Certificate pinning: the app embeds res/raw/server_cert.pem and only trusts that exact certificate over TLS',
    'Controlled server error messages surfaced from the API\'s JSON error responses',
]
for f in android_features:
    doc.add_paragraph(f, style='List Bullet')

doc.add_heading('11.2 App Structure', level=2)
android_lines = [
    'android/',
    '  app/',
    '    build.gradle.kts              # AGP 8.5.2, Kotlin 1.9.24, minSdk 26',
    '    src/main/',
    '      AndroidManifest.xml         # INTERNET permission, network security config',
    '      res/raw/server_cert.pem     # Pinned backend certificate',
    '      res/xml/network_security_config.xml',
    '      res/layout/                 # activity_login, activity_register, activity_dashboard',
    '      res/values/                 # Dark theme and strings',
    '      java/com/hustlehub/app/',
    '        MainActivity.kt           # Splash + authentication routing',
    '        LoginActivity.kt          # Login screen',
    '        RegisterActivity.kt       # Registration screen with role spinner',
    '        DashboardActivity.kt      # Profile, JWT, copy token, security status, logout',
    '        HustleHubApplication.kt   # Application context holder',
    '        api/ApiClient.kt          # Retrofit + OkHttp + cert TrustManager',
    '        api/ApiService.kt         # REST endpoint definitions',
    '        model/AuthModels.kt       # Request/response DTOs',
    '        security/TokenManager.kt  # EncryptedSharedPreferences JWT storage',
]
for line in android_lines:
    doc.add_paragraph(line)

doc.add_heading('11.3 End-to-End Verification', level=2)
doc.add_paragraph(
    'The app was built (assembleDebug) and installed on a Pixel 5 API 34 emulator, then verified '
    'against the live backend using device UI automation. Confirmed behaviours:'
)
e2e = [
    'Wrong-password login displays the server response "Invalid email or password" (401)',
    'Registration of a new user (Bob Smith, freelancer) returns 201 and auto-navigates to the dashboard',
    'Dashboard shows the correct profile (name, email, role, user ID) and "Server: Connected"',
    'JWT token is displayed and stored encrypted; the security panel confirms HTTPS, JWT bearer, encrypted storage, and bcrypt hashing',
    'Logout clears the token; subsequent login with correct credentials succeeds',
    'Client-side validation blocks invalid email and mismatched passwords before any network call',
]
for e in e2e:
    doc.add_paragraph(e, style='List Bullet')

doc.add_paragraph(
    'Screenshots of the running app are provided in the mockups/ folder '
    '(app_01_login.png, app_02_register.png, app_03_dashboard.png, app_05_login_error.png).'
)

# ====== APPENDIX ======
doc.add_heading('Appendix A: Postman Collection Export', level=1)
doc.add_paragraph(
    'The complete Postman collection JSON file (HustleHub+ Postman Collection.json) is included '
    'in the project submission. It contains 12 pre-configured requests covering all API endpoints '
    'with test scripts for automated validation.'
)

# Save
output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'HustleHub+_Part1_Report.docx')
doc.save(output_path)
print(f'Document saved to: {output_path}')
