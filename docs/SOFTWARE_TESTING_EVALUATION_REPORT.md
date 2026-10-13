# EV CHARGE HUB — SOFTWARE TESTING PRACTICAL & EVALUATION REPORT
**Project Title:** EV Charge Hub – Smart EV Charging Station Management System  
**Technology Stack:** Node.js, Express.js, MySQL, HTML5/CSS3/JavaScript, Selenium WebDriver, Pytest  
**Testing Methodologies:** Black-Box Testing, White-Box Testing, Automated Regression Testing  

---

## 1. PRESENTATION WORKFLOW FOR TEACHER / EXAMINER EVALUATION

When presenting this project to your teacher or examiner, follow this **4-Step Demonstration Workflow**:

```
 ┌────────────────────────┐      ┌────────────────────────┐
 │ Step 1: Explain The    │  ──► │ Step 2: Show Test Case │
 │ Testing Architecture   │      │ Tables (BB vs WB)      │
 └────────────────────────┘      └────────────────────────┘
             │                               │
             ▼                               ▼
 ┌────────────────────────┐      ┌────────────────────────┐
 │ Step 3: Run Visible    │  ──► │ Step 4: Show Generated │
 │ Selenium Automation    │      │ Interactive HTML Report│
 └────────────────────────┘      └────────────────────────┘
```

### What to say in your 2-Minute Project Introduction:
> *"Respected Ma'am/Sir, for our EV Charge Hub project, we performed systematic software testing covering both **Black-Box Testing** (functional, UI, boundary value, and authorization barriers from the user's perspective) and **White-Box Testing** (internal branch coverage, JWT cryptographic verification, and database race-condition handling across backend controllers).*  
> *To prove that the test cases are verifiable and repeatable, we automated observable behaviors using **Python + Selenium WebDriver + Pytest**, generating an interactive test evaluation report with automated screenshot capture on failures."*

---

## 2. PART A — BLACK-BOX TEST SUITE

Black-Box tests evaluate observable software behavior without inspecting internal source code.

| Test Case ID | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Actual Result | Status | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BB-AUTH-001** | Auth | Verify Login page loads with all form controls | Browser open | 1. Navigate to `/pages/login.html`<br>2. Inspect title and form elements | N/A | Title is "Login \| EV Charge Hub", email, password inputs & submit button are visible | Form elements and title match requirements | **PASS** | P1 |
| **BB-AUTH-002** | Auth | Login rejection on empty inputs | On login page | 1. Leave email & password empty<br>2. Click Sign In | Email: `""`<br>Password: `""` | HTML5 validation or alert prevents submission | Browser halts form submission | **PASS** | P2 |
| **BB-AUTH-003** | Auth | Login rejection with invalid credentials | User registered | 1. Enter valid email with wrong password<br>2. Click Sign In | Email: `admin@evchargehub.com`<br>Password: `WrongPass999` | Server rejects with HTTP 400 and displays "Invalid credentials" error banner | Error banner displayed on page | **PASS** | P1 |
| **BB-AUTH-004** | Auth | Password visibility toggle button | On login page | 1. Type password in input<br>2. Click eye toggle icon | Password: `Password@123` | Input type toggles between `password` and `text` | Input type changes dynamically | **PASS** | P3 |
| **BB-AUTH-005** | Auth | Quick-fill admin credentials button | On login page | 1. Click `#fillAdminBtn` button | N/A | Email field populated with `admin@evchargehub.com`, password with `admin123` | Credentials auto-filled | **PASS** | P3 |
| **BB-AUTH-006** | Auth | Successful Admin Login and Dashboard Redirect | Valid admin account | 1. Fill admin credentials<br>2. Click Sign In | `admin@evchargehub.com` / `admin123` | Session stored in `localStorage`, user redirected to `admin-dashboard.html` | Redirected to `admin-dashboard.html` | **PASS** | P1 |
| **BB-AUTH-007** | Auth | Registration phone number validation (<10 digits) | On register page | 1. Enter name, email, password<br>2. Enter short phone number<br>3. Submit | Phone: `12345` | Rejection notice: 10-digit Indian mobile number starting with 6-9 required | Submission blocked | **PASS** | P2 |
| **BB-AUTH-008** | Auth | Registration password mismatch validation | On register page | 1. Enter password and different confirm password<br>2. Submit | Pass: `Pass@123`<br>Confirm: `Pass@999` | Client alert: "Passwords do not match" | Form submission blocked | **PASS** | P2 |
| **BB-AUTH-009** | Auth | Protected page access barrier without JWT | Session cleared | 1. Clear `localStorage`<br>2. Navigate to `dashboard.html` | No token | Client detects missing token and redirects immediately to `login.html` | User redirected to `login.html` | **PASS** | P1 |
| **BB-VEH-001** | Vehicle | Open Add Vehicle modal | Logged in user | 1. Open `vehicles.html`<br>2. Click `#addVehicleBtn` | N/A | Modal `#vehicleModal` becomes visible with input controls | Modal opens with active inputs | **PASS** | P2 |
| **BB-VEH-002** | Vehicle | Dynamic EV model dropdown population | Modal open | 1. Select Brand "Tata Motors" | Brand: `Tata Motors` | Model dropdown enables and populates with Nexon EV, Punch EV, Curvv EV | Dropdown updates dynamically | **PASS** | P2 |
| **BB-VEH-003** | Vehicle | Auto-fill connector and battery specs | Modal open | 1. Select Brand "Tata Motors"<br>2. Select Model "Nexon EV" | Model: `Nexon EV` | Connector auto-selects `CCS2`, battery capacity auto-fills `40.5 kWh` | Connector & battery populated | **PASS** | P2 |
| **BB-VEH-004** | Vehicle | Registration plate uppercase sanitization | Modal open | 1. Enter lowercase registration `mh12ab1234` | Reg: `mh12ab1234` | Form script auto-capitalizes input to `MH-12-AB-1234` | Text transformed to uppercase | **PASS** | P3 |
| **BB-STAT-001** | Station | Search stations by keyword query | On search page | 1. Enter "Shastri" in station search input | Query: `Shastri` | Station list dynamically filters matching station cards | List filtered in real time | **PASS** | P2 |
| **BB-STAT-002** | Station | Reset station search input | Filtered results | 1. Click clear search `x` button | N/A | Input field clears and full station list is restored | Input reset to empty string | **PASS** | P3 |
| **BB-STAT-003** | Station | Expand/collapse advanced filter options | On search page | 1. Click Filter toggle button | N/A | Advanced filter panel toggles visibility | Filter panel toggles | **PASS** | P3 |
| **BB-STAT-004** | Station | Price range slider display update | On search page | 1. Drag price slider to ₹20 | Slider val: `20` | Display label updates text to "₹20/kWh" | Label updates | **PASS** | P3 |
| **BB-BOOK-001** | Booking | Verify slot and pricing controls render | Active station | 1. Navigate to `booking.html?station_id=1` | Station ID: `1` | Slot picker, date picker, start/end time, and total summary are visible | Form controls rendered | **PASS** | P1 |
| **BB-BOOK-002** | Booking | Booking rejection when vehicle not selected | On booking page | 1. Choose slot and time range<br>2. Leave vehicle empty<br>3. Click Proceed | Vehicle: None | Validation alert prompts user to choose a registered vehicle | Submission blocked | **PASS** | P2 |
| **BB-BOOK-003** | Booking | Booking rejection when end time is before start time | On booking page | 1. Set start time to 15:00<br>2. Set end time to 14:00<br>3. Submit | Start: `15:00`<br>End: `14:00` | System rejects with invalid duration error | Duration error displayed | **PASS** | P2 |
| **BB-PAY-001** | Payment | Dynamic booking cost calculation | On booking page | 1. Select 2-hour duration (10:00 to 12:00) | Duration: 2 hrs | Total amount updates based on slot tariff (e.g., 2 × ₹180 = ₹360) | Total updates in real time | **PASS** | P1 |
| **BB-PAY-002** | Payment | EV Wallet card and balance display | On dashboard | 1. Open `dashboard.html` | Logged-in user | EV Wallet card renders showing current digital balance | Balance card visible | **PASS** | P2 |
| **BB-REV-001** | Reviews | Review modal structure on bookings page | On bookings page | 1. Open `bookings.html` | Completed booking | Modal renders overall star rating and multi-category review inputs | Modal controls present | **PASS** | P3 |
| **BB-REV-002** | Reviews | Interactive star rating selection | Modal open | 1. Click 5th star in overall rating | 5 Stars | Overall rating label updates to "5 Stars" | Label displays "5" | **PASS** | P3 |
| **BB-CHAT-001** | Chat | ChargeBot AI Assistant widget button | On dashboard | 1. View dashboard bottom right | N/A | Floating ChargeBot button `#chat-toggle-btn` is visible | Widget button displayed | **PASS** | P3 |
| **BB-CHAT-002** | Chat | Open and close AI chat drawer | On dashboard | 1. Click `#chat-toggle-btn`<br>2. Click close button `#chat-close-btn` | N/A | Chat drawer slides open on click and closes on close button | Drawer opens and closes | **PASS** | P3 |
| **BB-NOTIF-001**| Notif | Topbar notification bell presence | On dashboard | 1. View top navigation bar | Logged-in user | Notification trigger bell icon `.ev-notif-trigger` is visible | Bell icon rendered | **PASS** | P3 |
| **BB-NOTIF-002**| Notif | Open notification dropdown panel | On dashboard | 1. Click notification bell | N/A | Dropdown container `.ev-notif-dropdown` expands displaying alerts | Dropdown displayed | **PASS** | P3 |
| **BB-ADM-001** | Admin | Admin Dashboard KPI metrics cards | On admin cockpit | 1. Navigate to `admin-dashboard.html` | Admin account | KPI metrics cards (Total Users, Stations, Active Bookings, Revenue) render | KPI cards visible | **PASS** | P1 |
| **BB-ADM-002** | Admin | Admin sidebar tab switching | On admin cockpit | 1. Click Station Management tab<br>2. Click Analytics tab | N/A | Main content updates to corresponding admin view | Views switch dynamically | **PASS** | P2 |

---

## 3. PART B — WHITE-BOX TEST SUITE

White-Box tests analyze the internal source code paths, conditional logic branches, and exception handlers within backend controllers and middleware.

| Test Case ID | Target Function | Target File | Code Logic / Branch Tested | Input Condition | Expected Internal Behavior | Coverage Type |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **WB-AUTH-001** | `authenticate()` | `backend/middleware/authMiddleware.js` | Missing Authorization header:<br>`if (!authHeader)` | `req.headers.authorization = undefined` | Execution halts; returns HTTP 401 with message: `"Access denied. No token provided."` | Branch & Condition Coverage |
| **WB-AUTH-002** | `authenticate()` | `backend/middleware/authMiddleware.js` | Malformed Bearer token format:<br>`if (!authHeader.startsWith('Bearer '))` | `req.headers.authorization = 'Basic xyz'` | Execution halts; returns HTTP 401: `"Malformed token."` | Branch Coverage |
| **WB-AUTH-003** | `authenticate()` | `backend/middleware/authMiddleware.js` | Valid JWT verification:<br>`jwt.verify(token, JWT_SECRET)` | Valid active signed JWT | Decodes payload; attaches `req.user = decoded`; calls `next()` to proceed | Path & Statement Coverage |
| **WB-AUTH-004** | `authorizeAdmin()`| `backend/middleware/authMiddleware.js` | Non-admin role barrier:<br>`if (req.user.role.toLowerCase() !== 'admin')` | `req.user.role = 'user'` | Blocks access; returns HTTP 403: `"Access forbidden. Admin rights required."` | Branch Coverage |
| **WB-AUTH-005** | `login()` | `backend/controllers/authController.js` | Legacy plaintext password upgrade:<br>`if (user.password === password)` | User with unhashed password | Matches plaintext → generates bcrypt salt & hash → updates database → issues JWT | Path & Mutation Coverage |
| **WB-USER-001** | `getProfile()` | `backend/controllers/userController.js` | User record lookup by session ID:<br>`WHERE id = ?` | `req.user.id = 999` (non-existent) | `users.length === 0` branch evaluates true; returns HTTP 404: `"User not found."` | Branch Coverage |
| **WB-USER-002** | `changePassword()`| `backend/controllers/userController.js` | Current password verification:<br>`!await bcrypt.compare(currentPassword, hash)` | Incorrect `currentPassword` | Compare fails; returns HTTP 400: `"Incorrect current password."` | Branch & Condition Coverage |
| **WB-VEH-001** | `deleteVehicle()` | `backend/controllers/vehicleController.js` | Foreign key booking integrity check:<br>`if (bookings.length > 0)` | Vehicle with past/future bookings | Blocks SQL deletion; returns HTTP 409: `"Cannot delete vehicle with active bookings."` | Condition & Safety Coverage |
| **WB-BOOK-001** | `createBooking()` | `backend/controllers/bookingController.js` | Slot overlap detection query:<br>`WHERE slot_id = ? AND NOT (end <= ? OR start >= ?)` | Conflicting time range | Overlap count > 0; aborts booking; returns HTTP 409: `"Slot is already booked."` | Branch Coverage |
| **WB-BOOK-002** | `createBooking()` | `backend/controllers/bookingController.js` | Overnight slot duration calculation:<br>`if (endMinutes < startMinutes)` | Start: 23:30, End: 00:30 | Adds 1440 minutes (24h rollover); prevents negative duration | Path & Condition Coverage |
| **WB-BOOK-003** | `verifyPayment()` | `backend/controllers/bookingController.js` | Razorpay HMAC SHA-256 signature verification | Tampered signature | Generated HMAC !== received signature; returns HTTP 400: `"Invalid payment signature."` | Cryptographic Path Coverage |
| **WB-BOOK-004** | `cancelBooking()` | `backend/controllers/bookingController.js` | Completed booking cancellation barrier:<br>`if (booking.status === 'Completed')` | Status: `Completed` | Rejects cancellation; returns HTTP 400: `"Cannot cancel a completed booking."` | Branch Coverage |
| **WB-REV-001** | `addReview()` | `backend/controllers/reviewController.js` | Duplicate review prevention query | User already reviewed booking | Query finds existing record; returns HTTP 400: `"You have already reviewed this booking."` | Branch Coverage |
| **WB-CHAT-001** | `handleChatMessage()`| `backend/controllers/chatController.js` | Fallback deterministic rule engine | Missing Gemini API Key / Quota 429 | Exception caught → regex rule engine matches query keywords (e.g. "charge", "pay") | Exception Handling Path |

---

## 4. HOW TO DEMONSTRATE TO YOUR TEACHER (STEP-BY-STEP)

### Step 1: Open VS Code Side-by-Side
1. Open this file `docs/SOFTWARE_TESTING_EVALUATION_REPORT.md` in VS Code and press `Ctrl+Shift+V` to open the **Markdown Rich Preview**.
2. Show your teacher the **Black-Box Table (Section 2)** and **White-Box Table (Section 3)**.

### Step 2: Show the Selenium Automation Code
1. Open `tests/test_auth.py` or `tests/test_chat.py`.
2. Point out:
   - Modern **Selenium 4** explicit waits (`WebDriverWait` + `EC.visibility_of_element_located`).
   - Zero hardcoded `time.sleep()` for stable execution.
   - Clean fixtures in `conftest.py` with failure screenshot capture.

### Step 3: Run the Live Browser Automation in Front of Your Teacher
Make sure your backend server is running in Terminal 1 (`npm run dev`).

Open Terminal 2 in VS Code and execute:
```powershell
$env:HEADLESS="0"; pytest tests\test_auth.py
```
**What will happen on screen:**
- A real Google Chrome window will pop up automatically.
- Chrome will navigate to `http://localhost:5000/pages/login.html`.
- It will test empty validation, password toggle, autofill buttons, and authentication barriers right before your teacher's eyes!

### Step 4: Show the Interactive Test Report
Run this command in PowerShell:
```powershell
Start-Process "reports\test_report.html"
```
An interactive HTML report will open in your browser showing the test breakdown, execution time, pass status, and environment details.

---

## 5. COMMON VIVA QUESTIONS AND MODEL ANSWERS

**Q1: What is the main difference between your Black-Box and White-Box test cases?**  
> *"Ma'am/Sir, our Black-Box test cases (e.g., `BB-AUTH-001` to `BB-AUTH-009`) test user-observable behaviors—like form validation alerts, button states, and page redirects without looking at code. Our White-Box test cases (e.g., `WB-AUTH-001` to `WB-BOOK-004`) test internal source code logic—such as JWT header parsing in `authMiddleware.js`, SQL time-overlap algorithms in `bookingController.js`, and bcrypt password upgrades in `authController.js`."*

**Q2: Why did you use Selenium with explicit waits instead of `time.sleep()`?**  
> *"Explicit waits (`WebDriverWait`) dynamically poll the DOM until specific elements or conditions are satisfied, making the tests fast and reliable. `time.sleep()` pauses the thread unconditionally, causing slow tests or race condition errors."*

**Q3: How does your system prevent double booking of charging slots?**  
> *"In White-Box test `WB-BOOK-001`, we tested the SQL condition `WHERE slot_id = ? AND NOT (end_time <= ? OR start_time >= ?)`. If an overlap is found, the server rejects the request with HTTP 409 Conflict."*

**Q4: How does your test suite capture evidence if a test fails?**  
> *"In `conftest.py`, we implemented the `pytest_runtest_makereport` hook. If any assertion fails during execution, Selenium automatically takes a screenshot and saves it to the `reports/screenshots/` folder with a timestamp."*
