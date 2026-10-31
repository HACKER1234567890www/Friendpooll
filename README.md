# Friendpool (Build 1.1) — Democratic Social Micro-Investment Club PWA

Friendpool is a mobile-first Progressive Web App (PWA) designed for collaborative financial circles of 3 to 5 people. It enables close-knit peer groups to pool simulated micro-contributions, propose diversified investment allocations, vote with strict 1-member-1-vote democratic consensus, and rotate leadership administrative stewardship periodically.

> **Disclaimer:** Friendpool is a non-custodial demonstration and financial simulation sandbox. All deposits, portfolio allocations, and voting tallies are simulated. Initial club pool balance starts at ₹0. No real fiat bank transactions, real stock broker purchases, or actual withdrawals are processed. Unsupported guaranteed or target return claims are prohibited.

---

## 🌟 Build 1.1 Core Architecture & Features

1. **Clean Initial Financial State (₹0 Balance)**
   - Initial Club Balance defaults to **₹0**.
   - No fictional pre-populated deposits or phantom invested balances.
   - All transactions, balances, and member profiles are explicitly labeled as **simulated sandbox data**.

2. **Deposit Sandbox (Pending ➔ Approved / Rejected Workflow)**
   - Members submit simulated micro-deposits bounded strictly between **₹100 and ₹500** (`Simulated UPI`, `Simulated IMPS`, or `Club Quick-Deposit`).
   - All newly recorded deposits enter a **Pending Review** status.
   - **Enforced Administrator Verification:** Only the active Club Administrator holds permissions to approve or reject pending deposits.
   - **Immediate Dashboard Update:** The club balance and contributing member's balance increment immediately upon simulated approval.

3. **Five Configurable Member Profiles**
   - The club creator can customize all five member profiles (Full Name, Email, Phone, Theme Color, and Avatar) using the **Configure Profile** editor in the Members tab.
   - Supports 3 to 5 member circles to ensure high trust, peer intimacy, and reliable democratic consensus.

4. **Strict One-Vote-Per-Member Democratic Quorum**
   - Each member may cast **only one ballot per proposal** (Approve, Reject, or Abstain).
   - Once cast, the ballot is permanently locked to prevent duplicate votes from the same member.
   - Real-time quorum progress tracking with majority consensus threshold (e.g. 3 of 5 needed to pass).

5. **Prudent Investment Proposals (No Guaranteed Returns)**
   - Form for proposing capital allocations without misleading or guaranteed target return rates.
   - Specifies target allocation amount (₹), holding horizon (months), asset category, risk classification (Low, Moderate, High), and detailed investment thesis.

6. **Enforced Rotating Administrator Governance**
   - 30-day leadership rotation prevents any individual from monopolizing authority or custody.
   - Functional permission checks:
     - Only the active Administrator can approve/reject sandbox deposits.
     - Only the active Administrator can execute proposals that passed democratic quorum.
     - Only the active Administrator can hand over the baton.
   - Built-in **"Acting As" persona switcher** in the top navigation bar to test administrator and member permissions seamlessly.

7. **Cryptographically-Hashed Audit Ledger**
   - Every deposit submission, approval, rejection, proposal, ballot, and admin handover is recorded with a verifiable mock cryptographic hash (`#0e4a9d02`).
   - Searchable, filterable by event category, and exportable as a `.json` audit log.

8. **Progressive Web App (PWA) Standards**
   - Web App Manifest configured for standalone mobile mode.
   - Offline service worker caching with ambient offline indicator.
   - In-app install button and iOS Safari install guide.
   - Forest green (`#041810` / `#062319`) and mint green (`#00f090`) visual palette.

---

## 🚀 How to Run the Project

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or pnpm

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
The application will launch on `http://localhost:3000`.

### 3. Build for Production
```bash
npm run build
```
This builds the production-optimized bundle into the `dist/` directory with PWA service worker registration and manifest assets.

---

## 📁 Architecture Overview
```
friendpool/
├── public/                 # PWA icons (192px, 512px, maskable, apple-touch, SVG)
├── src/
│   ├── components/
│   │   ├── audit/          # Chronological audit trail & export
│   │   ├── common/         # Top Navbar, persona switcher, Mobile BottomNav
│   │   ├── contributions/  # Deposit Sandbox: Pending, Approved, Rejected ledger
│   │   ├── dashboard/      # Financial overview & rotating admin spotlight
│   │   ├── members/        # 5 configurable profiles & rotation schedule
│   │   ├── modals/         # Deposit, Proposal, Ballot, Rotate Admin, Edit/Add/Remove
│   │   ├── proposals/      # 1-vote democratic balloting, quorum bars, execution
│   │   └── pwa/            # PWA install prompt button & offline indicator
│   ├── data/               # Initial clean demonstration dataset (₹0 balance)
│   ├── hooks/              # usePWAInstall, useOnlineStatus
│   ├── types/              # TypeScript interfaces
│   ├── utils/              # INR currency formatters & audit hash generator
│   ├── App.tsx             # Root component and state orchestrator
│   └── main.tsx            # React DOM mounting
└── README.md
```
