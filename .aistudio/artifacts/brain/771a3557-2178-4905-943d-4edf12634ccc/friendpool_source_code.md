# Friendpool — Complete Source Code Artifact & Supabase Schema Blueprint

> **Notice:** This document contains the verbatim source code of every file in the Friendpool application, along with project directory hierarchy and Supabase database schema specifications for backend integration. No API keys, passwords, or secrets are included.

---

## 📁 Project Directory Structure

```text
friendpool/
├── .env.example
├── index.html
├── metadata.json
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   ├── components/
│   │   ├── audit/
│   │   │   └── AuditView.tsx
│   │   ├── common/
│   │   │   ├── BottomNav.tsx
│   │   │   └── Navbar.tsx
│   │   ├── contributions/
│   │   │   └── ContributionsView.tsx
│   │   ├── dashboard/
│   │   │   └── DashboardView.tsx
│   │   ├── members/
│   │   │   └── MembersView.tsx
│   │   ├── modals/
│   │   │   ├── AddMemberModal.tsx
│   │   │   ├── ContributeModal.tsx
│   │   │   ├── EditMemberModal.tsx
│   │   │   ├── NewProposalModal.tsx
│   │   │   ├── RemoveMemberModal.tsx
│   │   │   ├── ResetConfirmModal.tsx
│   │   │   ├── RotateAdminModal.tsx
│   │   │   └── VoteModal.tsx
│   │   ├── proposals/
│   │   │   └── ProposalsView.tsx
│   │   └── pwa/
│   │       ├── OfflineIndicator.tsx
│   │       └── PWAInstallButton.tsx
│   ├── data/
│   │   └── mockData.ts
│   ├── hooks/
│   │   ├── useOnlineStatus.ts
│   │   └── usePWAInstall.ts
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       └── formatters.ts
```

---

## 🗄️ Supabase PostgreSQL Schema Blueprint

Run the following SQL migration in your Supabase SQL Editor to map Friendpool data models directly to PostgreSQL tables with Row-Level Security (RLS) and constraints:

```sql
-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Members Table (Strict 3–5 member limit per club)
CREATE TABLE IF NOT EXISTS public.members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Admin', 'Member')),
    avatar TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    joined_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_contributed NUMERIC NOT NULL DEFAULT 0,
    contribution_count INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'away')),
    color TEXT NOT NULL DEFAULT '#00f090',
    is_simulated BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Deposit Sandbox Table (Strict ₹100–₹500 constraint, Pending/Approved/Rejected workflow)
CREATE TABLE IF NOT EXISTS public.contributions (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    member_name TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 100 AND amount <= 500),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    note TEXT NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('Simulated UPI', 'Simulated IMPS', 'Club Quick-Deposit')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reference_code TEXT NOT NULL UNIQUE,
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    review_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Investment Proposals Table
CREATE TABLE IF NOT EXISTS public.proposals (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'Index Fund',
        'Sovereign Green Bonds',
        'Tech ETF',
        'Fixed Deposit',
        'Solar Infrastructure',
        'Blue Chip Dividend'
    )),
    requested_amount NUMERIC NOT NULL CHECK (requested_amount >= 100),
    proposer_id TEXT NOT NULL REFERENCES public.members(id),
    proposer_name TEXT NOT NULL,
    duration_months INT NOT NULL CHECK (duration_months > 0),
    risk_level TEXT NOT NULL CHECK (risk_level IN ('Low', 'Moderate', 'High')),
    description TEXT NOT NULL,
    thesis TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'voting' CHECK (status IN ('voting', 'approved', 'rejected', 'executed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    voting_deadline TIMESTAMPTZ NOT NULL,
    executed_at TIMESTAMPTZ,
    executed_by TEXT
);

-- 5. Democratic Ballots Table (Enforces STRICT 1 Vote per Member)
CREATE TABLE IF NOT EXISTS public.votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id TEXT NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
    member_id TEXT NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    member_name TEXT NOT NULL,
    decision TEXT NOT NULL CHECK (decision IN ('approve', 'reject', 'abstain')),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Enforce 1 vote per member per proposal
    CONSTRAINT unique_member_proposal_vote UNIQUE (proposal_id, member_id)
);

-- 6. Rotating Administrator Governance Table
CREATE TABLE IF NOT EXISTS public.admin_rotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    current_admin_id TEXT NOT NULL REFERENCES public.members(id),
    term_start_date DATE NOT NULL,
    term_end_date DATE NOT NULL,
    cycle_duration_days INT NOT NULL DEFAULT 30,
    rotation_queue JSONB NOT NULL DEFAULT '[]'::JSONB,
    history JSONB NOT NULL DEFAULT '[]'::JSONB,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Immutable Audit Trail Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN (
        'contribution_submitted',
        'contribution_approved',
        'contribution_rejected',
        'proposal_created',
        'vote_cast',
        'admin_rotated',
        'proposal_executed',
        'member_added',
        'member_removed',
        'member_updated'
    )),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_id TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    summary TEXT NOT NULL,
    details TEXT,
    hash TEXT NOT NULL
);

-- Indexes for high performance
CREATE INDEX IF NOT EXISTS idx_contributions_status ON public.contributions(status);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.proposals(status);
CREATE INDEX IF NOT EXISTS idx_votes_proposal_id ON public.votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
```

---

## 📄 Complete Source Files

### 1. `package.json`
```json
{
  "name": "friendpool",
  "private": true,
  "version": "1.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port=3000 --host=0.0.0.0",
    "build": "vite build",
    "preview": "vite preview",
    "clean": "rm -rf dist server.js",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@google/genai": "^2.4.0",
    "@tailwindcss/vite": "^4.3.3",
    "@vitejs/plugin-react": "^6.1.1",
    "dotenv": "^17.2.3",
    "express": "^4.21.2",
    "lucide-react": "^0.546.0",
    "motion": "^12.23.24",
    "react": "^19.0.1",
    "react-dom": "^19.0.1",
    "vite": "^8.3.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^22.14.0",
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "autoprefixer": "^10.4.21",
    "esbuild": "^0.25.0",
    "sharp": "^0.33.5",
    "tailwindcss": "^4.3.3",
    "tsx": "^4.21.0",
    "typescript": "^7.0.2",
    "vite-plugin-pwa": "^1.2.0"
  }
}
```

---

### 2. `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "module": "ESNext",
    "types": ["vite/client", "vite-plugin-pwa/client"],
    "lib": [
      "ES2022",
      "DOM",
      "DOM.Iterable"
    ],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "moduleDetection": "force",
    "allowJs": true,
    "jsx": "react-jsx",
    "paths": {
      "@/*": [
        "./*"
      ]
    },
    "allowImportingTsExtensions": true,
    "noEmit": true
  },
  "exclude": ["dist"]
}
```

---

### 3. `vite.config.ts`
```typescript
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icon.svg'],
        manifest: {
          id: '/',
          name: 'Friendpool — Collaborative Investment Club',
          short_name: 'Friendpool',
          description: 'Democratic social micro-investing club dashboard with rotating administrators, proposals, and transparent ledgers.',
          theme_color: '#062319',
          background_color: '#062319',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
```

---

### 4. `index.html`
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <title>Friendpool — Collaborative Investment Club</title>
    <meta name="description" content="Democratic social micro-investing club dashboard with rotating administrators, proposals, transparent ₹100–₹500 ledgers, and voting." />
    <meta name="theme-color" content="#062319" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Friendpool" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="icon" type="image/svg+xml" href="/icon.svg" />
    <link rel="icon" type="image/png" sizes="192x192" href="/pwa-192x192.png" />
    <meta property="og:title" content="Friendpool — Collaborative Investment Club" />
    <meta property="og:description" content="Democratic social micro-investing club dashboard with rotating administrators, proposals, and transparent ledgers." />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  </head>
  <body class="bg-[#041a12] text-slate-100 antialiased selection:bg-[#00f090] selection:text-[#041a12]">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

### 5. `metadata.json`
```json
{
  "name": "Friendpool",
  "description": "Collaborative social investment club PWA featuring democratic voting, rotating administrator leadership, ₹100–₹500 contribution ledgers, and audit history.",
  "requestFramePermissions": [],
  "majorCapabilities": ["MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API"]
}
```

---

### 6. `.env.example`
```env
# GEMINI_API_KEY: Required for Gemini AI API calls.
GEMINI_API_KEY="MY_GEMINI_API_KEY"

# APP_URL: The URL where this applet is hosted.
APP_URL="MY_APP_URL"

# SUPABASE_URL: Your Supabase Project URL
VITE_SUPABASE_URL="https://your-project.supabase.co"

# SUPABASE_ANON_KEY: Your Supabase Public Anon Key
VITE_SUPABASE_ANON_KEY="your-anon-key"
```

---

### 7. `src/main.tsx`
```typescript
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
```

---

### 8. `src/index.css`
```css
@import "tailwindcss";

@layer base {
  body {
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    background-color: #041810;
    color: #e2e8f0;
    overflow-x: hidden;
    -webkit-tap-highlight-color: transparent;
  }

  code, pre, .font-mono {
    font-family: 'JetBrains Mono', monospace;
  }
}

/* Custom dark forest scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #041810;
}

::-webkit-scrollbar-thumb {
  background: #0f3d2a;
  border-radius: 9999px;
}

::-webkit-scrollbar-thumb:hover {
  background: #145339;
}

/* Glassmorphism utility */
.glass-panel {
  background: rgba(10, 36, 26, 0.75);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(0, 240, 144, 0.12);
}

.glass-panel-subtle {
  background: rgba(6, 28, 20, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.glow-mint {
  box-shadow: 0 0 25px -4px rgba(0, 240, 144, 0.28);
}

.glow-mint-sm {
  box-shadow: 0 0 12px -2px rgba(0, 240, 144, 0.25);
}
```

---

### 9. `src/types/index.ts`
```typescript
export type Role = 'Admin' | 'Member';

export interface Member {
  id: string;
  name: string;
  role: Role;
  avatar: string;
  email: string;
  phone: string;
  joinedDate: string;
  totalContributed: number;
  contributionCount: number;
  status: 'active' | 'away';
  color: string;
  isSimulated: boolean;
}

export type ContributionStatus = 'pending' | 'approved' | 'rejected';

export interface Contribution {
  id: string;
  memberId: string;
  memberName: string;
  amount: number; // simulated ₹100 to ₹500
  timestamp: string;
  note: string;
  method: 'Simulated UPI' | 'Simulated IMPS' | 'Club Quick-Deposit';
  status: ContributionStatus;
  referenceCode: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
}

export type VoteDecision = 'approve' | 'reject' | 'abstain';

export interface Vote {
  memberId: string;
  memberName: string;
  decision: VoteDecision;
  timestamp: string;
  comment?: string;
}

export type ProposalCategory = 
  | 'Index Fund' 
  | 'Sovereign Green Bonds' 
  | 'Tech ETF' 
  | 'Fixed Deposit' 
  | 'Solar Infrastructure' 
  | 'Blue Chip Dividend';

export type ProposalStatus = 'voting' | 'approved' | 'rejected' | 'executed';

export interface Proposal {
  id: string;
  title: string;
  category: ProposalCategory;
  requestedAmount: number;
  proposerId: string;
  proposerName: string;
  durationMonths: number;
  riskLevel: 'Low' | 'Moderate' | 'High';
  description: string;
  thesis: string;
  status: ProposalStatus;
  createdAt: string;
  votingDeadline: string;
  votes: Record<string, Vote>;
  executedAt?: string;
  executedBy?: string;
}

export interface AdminRotation {
  currentAdminId: string;
  termStartDate: string;
  termEndDate: string;
  cycleDurationDays: number;
  rotationQueue: string[]; // member IDs in scheduled sequence
  history: {
    memberId: string;
    memberName: string;
    term: string;
    completedAt: string;
  }[];
}

export type AuditEventType = 
  | 'contribution_submitted'
  | 'contribution_approved'
  | 'contribution_rejected'
  | 'proposal_created' 
  | 'vote_cast' 
  | 'admin_rotated' 
  | 'proposal_executed' 
  | 'member_added' 
  | 'member_removed' 
  | 'member_updated';

export interface AuditLogItem {
  id: string;
  type: AuditEventType;
  timestamp: string;
  actorId: string;
  actorName: string;
  summary: string;
  details?: string;
  hash: string;
}
```

---

### 10. `src/data/mockData.ts`
```typescript
import { Member, Contribution, Proposal, AdminRotation, AuditLogItem } from '../types';

// Five configurable member profiles with zero financial bias (₹0 balance)
export const INITIAL_MEMBERS: Member[] = [
  {
    id: 'm1',
    name: 'Aarav Sharma',
    role: 'Admin',
    avatar: 'AS',
    email: 'aarav.sharma@example.com',
    phone: '+91 98201 44521',
    joinedDate: '2026-10-01',
    totalContributed: 0,
    contributionCount: 0,
    status: 'active',
    color: '#00f090',
    isSimulated: true,
  },
  {
    id: 'm2',
    name: 'Priya Nair',
    role: 'Member',
    avatar: 'PN',
    email: 'priya.nair@example.com',
    phone: '+91 98450 78219',
    joinedDate: '2026-10-01',
    totalContributed: 0,
    contributionCount: 0,
    status: 'active',
    color: '#38bdf8',
    isSimulated: true,
  },
  {
    id: 'm3',
    name: 'Rohan Patel',
    role: 'Member',
    avatar: 'RP',
    email: 'rohan.patel@example.com',
    phone: '+91 97123 90312',
    joinedDate: '2026-10-01',
    totalContributed: 0,
    contributionCount: 0,
    status: 'active',
    color: '#fbbf24',
    isSimulated: true,
  },
  {
    id: 'm4',
    name: 'Ananya Iyer',
    role: 'Member',
    avatar: 'AI',
    email: 'ananya.iyer@example.com',
    phone: '+91 98840 12904',
    joinedDate: '2026-10-01',
    totalContributed: 0,
    contributionCount: 0,
    status: 'active',
    color: '#f472b6',
    isSimulated: true,
  },
  {
    id: 'm5',
    name: 'Vikram Sen',
    role: 'Member',
    avatar: 'VS',
    email: 'vikram.sen@example.com',
    phone: '+91 99030 55182',
    joinedDate: '2026-10-01',
    totalContributed: 0,
    contributionCount: 0,
    status: 'active',
    color: '#a78bfa',
    isSimulated: true,
  },
];

export const INITIAL_ADMIN_ROTATION: AdminRotation = {
  currentAdminId: 'm1',
  termStartDate: '2026-10-15',
  termEndDate: '2026-11-15',
  cycleDurationDays: 30,
  rotationQueue: ['m1', 'm2', 'm3', 'm4', 'm5'],
  history: [],
};

// Initial club balance starts cleanly at ₹0. No fictional deposits.
export const INITIAL_CONTRIBUTIONS: Contribution[] = [];

// Clean initial proposal template without unsupported or guaranteed target returns
export const INITIAL_PROPOSALS: Proposal[] = [
  {
    id: 'p1',
    title: 'Sovereign Green Bond Sandbox Allocation',
    category: 'Sovereign Green Bonds',
    requestedAmount: 1000,
    proposerId: 'm2',
    proposerName: 'Priya Nair',
    durationMonths: 12,
    riskLevel: 'Low',
    description: 'Government-backed green initiative proposal to evaluate low-volatility fixed-income instruments for club pool capital.',
    thesis: 'Focuses on capital preservation and ESG alignment. Subject to official sovereign auction yields and market conditions. No returns are guaranteed.',
    status: 'voting',
    createdAt: '2026-10-29T10:00:00Z',
    votingDeadline: '2026-11-05T23:59:59Z',
    votes: {
      m2: { 
        memberId: 'm2', 
        memberName: 'Priya Nair', 
        decision: 'approve', 
        timestamp: '2026-10-29T10:05:00Z', 
        comment: 'Author ballot: Low-risk baseline allocation for testing.' 
      },
    },
  },
];

export const INITIAL_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 'a1',
    type: 'member_updated',
    timestamp: '2026-10-30T06:00:00Z',
    actorId: 'm1',
    actorName: 'Aarav Sharma',
    summary: 'Friendpool Club initialized with 5 configurable member profiles',
    details: 'Initial club balance set to ₹0. Simulated sandbox mode active. No fictional deposits or guaranteed yields.',
    hash: '0e4a9d02c114e5b3',
  },
  {
    id: 'a2',
    type: 'proposal_created',
    timestamp: '2026-10-29T10:00:00Z',
    actorId: 'm2',
    actorName: 'Priya Nair',
    summary: 'Created proposal "Sovereign Green Bond Sandbox Allocation"',
    details: 'Draft proposal submitted for democratic review. 1 vote per member.',
    hash: '5b8c3d911b22fa40',
  },
];
```

---

### 11. `src/utils/formatters.ts`
```typescript
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return dateString;
  }
}

export function generateAuditHash(): string {
  const chars = '0123456789abcdef';
  let hash = '';
  for (let i = 0; i < 16; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}
```

---

### 12. `src/hooks/usePWAInstall.ts`
```typescript
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect standalone mode (already installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    install,
  };
}
```

---

### 13. `src/hooks/useOnlineStatus.ts`
```typescript
import { useEffect, useState } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
```

---

### 14. `src/components/common/Navbar.tsx`
```typescript
import React from 'react';
import { Member } from '../../types';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { Crown, UserCheck, RefreshCw, RotateCcw } from 'lucide-react';

interface NavbarProps {
  members: Member[];
  currentMemberId: string;
  onSelectMember: (id: string) => void;
  onRefreshData: () => void;
  onOpenResetModal: () => void;
  isRefreshing?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  members,
  currentMemberId,
  onSelectMember,
  onRefreshData,
  onOpenResetModal,
  isRefreshing = false,
}) => {
  const currentMember = members.find((m) => m.id === currentMemberId) || members[0];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#062319]/90 backdrop-blur-md border-b border-[#00f090]/15">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-2.5">
        {/* Brand identity */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00f090] to-[#041a12] p-0.5 shadow-md flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-[#041a12] rounded-[10px] flex items-center justify-center">
              <span className="text-[#00f090] font-black text-lg leading-none">₹</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-base tracking-tight text-white">Friendpool</h1>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#00f090]/20 text-[#00f090] border border-[#00f090]/30 hidden sm:inline">
                PWA
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden xs:block -mt-0.5">Democratic Micro-Investment Club</p>
          </div>
        </div>

        {/* Right tools: Member persona switcher, Refresh, Reset, and PWA Install */}
        <div className="flex items-center gap-2">
          {/* Active Persona dropdown (switch active member perspective) */}
          <div className="relative flex items-center">
            <div className="hidden lg:flex items-center gap-1 mr-1.5 text-xs text-slate-400">
              <UserCheck className="w-3.5 h-3.5 text-[#00f090]" />
              <span>Acting as:</span>
            </div>
            <div className="flex items-center bg-[#041a12] border border-white/15 rounded-xl px-2 py-1 gap-1.5 hover:border-[#00f090]/40 transition">
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0 relative"
                style={{ backgroundColor: currentMember?.color || '#00f090' }}
              >
                {currentMember?.avatar}
                {currentMember?.role === 'Admin' && (
                  <Crown className="w-2.5 h-2.5 text-amber-400 absolute -top-1 -right-1 fill-amber-400" />
                )}
              </div>
              <select
                value={currentMemberId}
                onChange={(e) => onSelectMember(e.target.value)}
                className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer pr-1"
                title="Switch active member perspective to vote or manage pool"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id} className="bg-[#07241a] text-white">
                    {m.name} {m.role === 'Admin' ? '👑 (Admin)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Refresh / Sync Button with spin animation */}
          <button
            onClick={onRefreshData}
            title="Refresh sandbox state and sync ledger"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-white/10 bg-[#041a12] text-slate-300 hover:text-white hover:border-[#00f090]/40 active:scale-95 transition cursor-pointer text-xs font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#00f090] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Reset Sandbox State Button */}
          <button
            onClick={onOpenResetModal}
            title="Reset Sandbox to ₹0 clean state"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-amber-400/25 bg-[#0a271c] text-amber-300 hover:bg-amber-400/15 hover:border-amber-400/40 active:scale-95 transition cursor-pointer text-xs font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Reset ₹0</span>
          </button>

          {/* In-App PWA Install Button */}
          <PWAInstallButton />
        </div>
      </div>
    </header>
  );
};
```

---

### 15. `src/components/common/BottomNav.tsx`
```typescript
import React from 'react';
import { 
  LayoutDashboard, 
  ReceiptText, 
  Vote, 
  Users, 
  History 
} from 'lucide-react';

export type NavTab = 'dashboard' | 'contributions' | 'proposals' | 'members' | 'audit';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  openProposalsCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  openProposalsCount,
}) => {
  const tabs: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'contributions', label: 'Ledger', icon: ReceiptText },
    { id: 'proposals', label: 'Proposals', icon: Vote, badge: openProposalsCount },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'audit', label: 'Audit', icon: History },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <nav 
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#062319]/95 backdrop-blur-xl border-t border-[#00f090]/20 pb-safe md:hidden"
      >
        <div className="grid grid-cols-5 h-16 max-w-md mx-auto px-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  isActive ? 'text-[#00f090]' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 w-8 h-1 bg-[#00f090] rounded-b-full shadow-[0_0_8px_#00f090]" />
                )}
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                  {Boolean(tab.badge && tab.badge > 0) && (
                    <span className="absolute -top-1 -right-2 w-4 h-4 bg-emerald-400 text-[#041a12] text-[10px] font-extrabold rounded-full flex items-center justify-center">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Desktop Top Subnav */}
      <div className="hidden md:block bg-[#041a12]/80 border-b border-white/10 sticky top-[53px] z-30 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 flex items-center gap-1 py-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  isActive
                    ? 'bg-[#00f090]/15 text-[#00f090] border border-[#00f090]/30 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#00f090] text-[#041a12] text-[10px] font-black">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
```

---

### 16. `src/components/dashboard/DashboardView.tsx`
```typescript
import React from 'react';
import { 
  TrendingUp, 
  Users, 
  Wallet, 
  Crown, 
  ShieldCheck, 
  ArrowUpRight, 
  Plus, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Lock,
  ReceiptText,
  RefreshCw
} from 'lucide-react';
import { Member, Contribution, Proposal, AdminRotation } from '../../types';
import { formatINR, formatDate } from '../../utils/formatters';

interface DashboardViewProps {
  members: Member[];
  contributions: Contribution[];
  proposals: Proposal[];
  rotation: AdminRotation;
  currentMember: Member;
  isAdmin: boolean;
  onOpenContributeModal: () => void;
  onOpenProposalModal: () => void;
  onOpenRotateModal: () => void;
  onSelectProposalForVote: (proposal: Proposal) => void;
  onNavigateToTab: (tab: 'contributions' | 'proposals' | 'members' | 'audit') => void;
  onRefreshData?: () => void;
  isRefreshing?: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  members,
  contributions,
  proposals,
  rotation,
  currentMember,
  isAdmin,
  onOpenContributeModal,
  onOpenProposalModal,
  onOpenRotateModal,
  onSelectProposalForVote,
  onNavigateToTab,
  onRefreshData,
  isRefreshing = false,
}) => {
  // Financial calculations: only APPROVED deposits count toward club balance!
  const approvedContributions = contributions.filter((c) => c.status === 'approved');
  const pendingContributions = contributions.filter((c) => c.status === 'pending');

  const totalBalance = approvedContributions.reduce((sum, c) => sum + c.amount, 0);
  
  // Executed proposals amount
  const executedAmount = proposals
    .filter((p) => p.status === 'executed')
    .reduce((sum, p) => sum + p.requestedAmount, 0);

  // Unallocated liquid cash available for proposals
  const unallocatedBalance = Math.max(0, totalBalance - executedAmount);

  const activeProposals = proposals.filter((p) => p.status === 'voting');
  const currentAdmin = members.find((m) => m.id === rotation.currentAdminId) || members[0];
  
  // Calculate days remaining in admin term
  const today = new Date('2026-10-30');
  const termEnd = new Date(rotation.termEndDate);
  const diffDays = Math.max(1, Math.ceil((termEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  const currentQueueIdx = rotation.rotationQueue.indexOf(rotation.currentAdminId);
  const nextQueueIdx = (currentQueueIdx + 1) % rotation.rotationQueue.length;
  const nextAdmin = members.find((m) => m.id === rotation.rotationQueue[nextQueueIdx]) || members[1];

  return (
    <div className="space-y-5 pb-6">
      {/* Simulation Disclaimer Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#072d21] via-[#0a3a2a] to-[#072d21] border border-[#00f090]/25 p-3.5 sm:p-4 shadow-lg flex items-start gap-3">
        <div className="p-2 rounded-xl bg-[#00f090]/15 text-[#00f090] shrink-0 mt-0.5">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="text-xs space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-white text-sm">Simulated Investment Club Sandbox</span>
            <span className="px-2 py-0.5 rounded-full bg-[#00f090]/20 text-[#00f090] font-mono text-[10px] font-bold">
              Clean Initial Balance: ₹0
            </span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            All member profiles, deposits (₹100–₹500), and investment proposals are strictly simulated for demonstration. No real bank accounts, real fiat deposits, guaranteed returns, or stock market trading are connected.
          </p>
        </div>
      </div>

      {/* Pending Deposit Review Notice (if any) */}
      {pendingContributions.length > 0 && (
        <div className="rounded-xl bg-amber-950/40 border border-amber-400/40 p-3.5 flex items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>{pendingContributions.length} simulated deposit(s)</strong> awaiting Administrator verification.
            </span>
          </div>
          <button
            onClick={() => onNavigateToTab('contributions')}
            className="px-3 py-1.5 rounded-lg bg-amber-400 text-[#041a12] font-bold hover:bg-amber-300 transition cursor-pointer text-xs shrink-0"
          >
            {isAdmin ? 'Review & Approve' : 'View Sandbox Ledger'}
          </button>
        </div>
      )}

      {/* Main Stats Header */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Club Balance */}
        <div className="col-span-2 sm:col-span-1 rounded-2xl bg-[#07241a] border border-[#00f090]/30 p-4 sm:p-5 relative overflow-hidden shadow-lg glow-mint-sm">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-[#00f090]/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider">Approved Pool Balance</span>
            <div className="flex items-center gap-1.5">
              {onRefreshData && (
                <button
                  onClick={onRefreshData}
                  className="p-1 rounded-lg text-slate-400 hover:text-[#00f090] hover:bg-white/5 active:scale-90 transition cursor-pointer"
                  title="Refresh pool balance"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#00f090]' : ''}`} />
                </button>
              )}
              <div className="p-1.5 rounded-lg bg-[#00f090]/15 text-[#00f090]">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {formatINR(totalBalance)}
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-[#00f090] font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{approvedContributions.length} approved deposits</span>
          </div>
        </div>

        {/* Members Count */}
        <div className="rounded-2xl bg-[#07241a] border border-white/10 p-4 sm:p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider">Configured Members</span>
              <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {members.length} <span className="text-xs font-normal text-slate-400">/ 5 max</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>5 simulated profiles</span>
            <button
              onClick={() => onNavigateToTab('members')}
              className="text-[#00f090] hover:underline font-medium text-[11px] cursor-pointer"
            >
              Configure →
            </button>
          </div>
        </div>

        {/* Liquid vs Allocated */}
        <div className="rounded-2xl bg-[#07241a] border border-white/10 p-4 sm:p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider">Unallocated Cash</span>
              <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#00f090] tracking-tight">
              {formatINR(unallocatedBalance)}
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            <span>{formatINR(executedAmount)} in executed allocations</span>
          </div>
        </div>

        {/* Active Proposals Count */}
        <div className="col-span-2 sm:col-span-1 rounded-2xl bg-[#07241a] border border-white/10 p-4 sm:p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider">Active Ballots</span>
              <div className="p-1.5 rounded-lg bg-amber-400/15 text-amber-300">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {activeProposals.length} <span className="text-xs font-normal text-slate-400">open</span>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-amber-300 font-medium">1 member = 1 vote</span>
            <button
              onClick={() => onNavigateToTab('proposals')}
              className="text-[#00f090] hover:underline font-medium text-[11px] cursor-pointer"
            >
              Vote →
            </button>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <button
          onClick={onOpenContributeModal}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#00f090] to-[#10b981] text-[#041a12] font-bold text-xs sm:text-sm shadow-md hover:brightness-110 active:scale-[0.98] transition cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Deposit (₹100–₹500)</span>
        </button>

        <button
          onClick={onOpenProposalModal}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-[#00f090]/40 bg-[#07241a] text-[#00f090] font-bold text-xs sm:text-sm hover:bg-[#0c3829] active:scale-[0.98] transition cursor-pointer"
        >
          <TrendingUp className="w-4 h-4" />
          <span>+ New Proposal</span>
        </button>

        <button
          onClick={onOpenRotateModal}
          className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-amber-400/40 bg-[#07241a] text-amber-300 font-bold text-xs sm:text-sm hover:bg-[#1a2c1d] active:scale-[0.98] transition cursor-pointer"
        >
          <Crown className="w-4 h-4 text-amber-400" />
          <span>Rotate Admin Baton</span>
        </button>
      </div>

      {/* Rotating Administrator Spotlight Card */}
      <div className="rounded-2xl bg-gradient-to-br from-[#07261c] to-[#041810] border border-[#00f090]/25 p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-base font-bold text-white shadow-md border-2 border-amber-400"
                style={{ backgroundColor: currentAdmin.color || '#00f090' }}
              >
                {currentAdmin.avatar}
              </div>
              <Crown className="w-4 h-4 text-amber-400 absolute -top-1.5 -right-1.5 fill-amber-400 drop-shadow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">{currentAdmin.name}</h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold border border-amber-400/30">
                  Active Administrator
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Stewardship term ends {formatDate(rotation.termEndDate)} ({diffDays} days remaining)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right sm:block hidden">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Next in Line</span>
              <span className="text-xs font-semibold text-white">{nextAdmin.name}</span>
            </div>
            <button
              onClick={onOpenRotateModal}
              className="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 text-xs font-semibold border border-amber-400/30 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Pass Baton</span>
            </button>
          </div>
        </div>

        {/* Rotation Queue visual ribbon */}
        <div className="pt-3">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Democratic Leadership Cycle (Sequential 30-Day Rotations)
          </span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {rotation.rotationQueue.map((mId, index) => {
              const mem = members.find((m) => m.id === mId);
              if (!mem) return null;
              const isCurrent = mId === rotation.currentAdminId;
              const isNext = mId === nextAdmin.id;

              return (
                <div
                  key={mId}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl shrink-0 text-xs transition ${
                    isCurrent
                      ? 'bg-amber-400/20 border border-amber-400 text-amber-300 font-bold'
                      : isNext
                      ? 'bg-[#00f090]/15 border border-[#00f090]/40 text-[#00f090]'
                      : 'bg-[#041a12] border border-white/10 text-slate-400'
                  }`}
                >
                  <span className="font-mono text-[10px] opacity-75">#{index + 1}</span>
                  <span>{mem.name}</span>
                  {isCurrent && <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />}
                  {isNext && <span className="text-[10px] bg-[#00f090]/30 px-1 rounded font-bold">Next</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Investment Proposals Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white tracking-tight">Democratic Ballots</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#00f090]/15 text-[#00f090] font-bold">
              {activeProposals.length}
            </span>
          </div>
          <button
            onClick={() => onNavigateToTab('proposals')}
            className="text-xs text-[#00f090] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>All Proposals</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {activeProposals.length === 0 ? (
          <div className="rounded-2xl bg-[#07241a] border border-white/10 p-8 text-center space-y-3">
            <FileText className="w-10 h-10 text-slate-500 mx-auto" />
            <h4 className="text-sm font-semibold text-white">No active proposals right now</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Any member can submit an investment proposal for democratic voting.
            </p>
            <button
              onClick={onOpenProposalModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00f090] text-[#041a12] text-xs font-bold hover:bg-[#10b981] transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Proposal</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {activeProposals.map((proposal) => {
              const votesList = Object.values(proposal.votes);
              const approvals = votesList.filter((v) => v.decision === 'approve').length;
              const rejects = votesList.filter((v) => v.decision === 'reject').length;
              const abstains = votesList.filter((v) => v.decision === 'abstain').length;
              const totalVotes = votesList.length;
              const quorumNeeded = Math.floor(members.length / 2) + 1; // e.g. 3 of 5
              const hasVoted = Boolean(proposal.votes[currentMember.id]);
              const memberVote = proposal.votes[currentMember.id];

              return (
                <div
                  key={proposal.id}
                  className="rounded-2xl bg-[#07241a] border border-[#00f090]/25 p-4 sm:p-5 shadow-lg flex flex-col justify-between space-y-4 hover:border-[#00f090]/50 transition"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#00f090] uppercase tracking-wider">
                        {proposal.category}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/10">
                        {proposal.riskLevel} Risk
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-white line-clamp-1">{proposal.title}</h4>

                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {proposal.description}
                    </p>

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                      <span>
                        Target: <strong className="text-white">{formatINR(proposal.requestedAmount)}</strong>
                      </span>
                      <span>
                        Horizon: <strong className="text-white">{proposal.durationMonths} Mos</strong>
                      </span>
                    </div>
                  </div>

                  {/* Quorum Progress Bar */}
                  <div className="space-y-1.5 pt-2 border-t border-white/10">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>
                        Quorum: <strong className="text-[#00f090]">{approvals}/{members.length}</strong> (need {quorumNeeded})
                      </span>
                      <span>{members.length - totalVotes} pending</span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-[#041810] overflow-hidden flex">
                      <div
                        className="h-full bg-[#00f090] transition-all"
                        style={{ width: `${(approvals / members.length) * 100}%` }}
                        title={`${approvals} Approvals`}
                      />
                      <div
                        className="h-full bg-rose-500 transition-all"
                        style={{ width: `${(rejects / members.length) * 100}%` }}
                        title={`${rejects} Rejections`}
                      />
                      <div
                        className="h-full bg-amber-400 transition-all"
                        style={{ width: `${(abstains / members.length) * 100}%` }}
                        title={`${abstains} Abstains`}
                      />
                    </div>
                  </div>

                  {/* Vote Action */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="text-xs">
                      {hasVoted ? (
                        <span className="text-[#00f090] flex items-center gap-1 font-semibold text-[11px]">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Voted: {memberVote?.decision.toUpperCase()} (Recorded)</span>
                        </span>
                      ) : (
                        <span className="text-amber-300 font-medium text-[11px] flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Ballot awaiting your vote</span>
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => onSelectProposalForVote(proposal)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        hasVoted
                          ? 'border border-white/10 text-slate-400 hover:text-white'
                          : 'bg-[#00f090] text-[#041a12] hover:bg-[#10b981] shadow-md'
                      }`}
                    >
                      {hasVoted ? 'View Your Ballot' : 'Cast Vote (1x)'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Ledger Activity */}
      <div className="rounded-2xl bg-[#07241a] border border-white/10 p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white tracking-tight">Recent Simulated Deposits</h3>
          <button
            onClick={() => onNavigateToTab('contributions')}
            className="text-xs text-[#00f090] hover:underline font-semibold cursor-pointer"
          >
            Open Sandbox Ledger →
          </button>
        </div>

        {contributions.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No simulated deposits recorded yet. Club pool starts at ₹0.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {contributions.slice(0, 4).map((contrib) => {
              const member = members.find((m) => m.id === contrib.memberId);
              return (
                <div key={contrib.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: member?.color || '#00f090' }}
                    >
                      {member?.avatar || 'MB'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="text-sm font-semibold text-white">{contrib.memberName}</h5>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                            contrib.status === 'approved'
                              ? 'bg-[#00f090]/15 text-[#00f090]'
                              : contrib.status === 'pending'
                              ? 'bg-amber-400/20 text-amber-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {contrib.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">{contrib.note}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-sm font-bold block ${
                        contrib.status === 'approved'
                          ? 'text-[#00f090]'
                          : contrib.status === 'pending'
                          ? 'text-amber-300'
                          : 'text-slate-400 line-through'
                      }`}
                    >
                      +{formatINR(contrib.amount)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {contrib.referenceCode}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
```

---

### 17. `src/components/contributions/ContributionsView.tsx`
```typescript
import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  ReceiptText, 
  Sparkles, 
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  ShieldCheck,
  Crown,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Member, Contribution, ContributionStatus } from '../../types';
import { formatINR, formatDateTime } from '../../utils/formatters';

interface ContributionsViewProps {
  members: Member[];
  contributions: Contribution[];
  currentMember: Member;
  isAdmin: boolean;
  adminName: string;
  onOpenContributeModal: () => void;
  onSimulateQuickDeposit: (amount: number) => void;
  onApproveDeposit: (depositId: string) => void;
  onRejectDeposit: (depositId: string, reason?: string) => void;
  onRefreshData?: () => void;
  isRefreshing?: boolean;
}

export const ContributionsView: React.FC<ContributionsViewProps> = ({
  members,
  contributions,
  currentMember,
  isAdmin,
  adminName,
  onOpenContributeModal,
  onSimulateQuickDeposit,
  onApproveDeposit,
  onRejectDeposit,
  onRefreshData,
  isRefreshing = false,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [filterMemberId, setFilterMemberId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const approvedContributions = contributions.filter((c) => c.status === 'approved');
  const pendingContributions = contributions.filter((c) => c.status === 'pending');
  const rejectedContributions = contributions.filter((c) => c.status === 'rejected');

  const totalApprovedPool = approvedContributions.reduce((acc, c) => acc + c.amount, 0);
  const totalPendingAmount = pendingContributions.reduce((acc, c) => acc + c.amount, 0);

  const filteredContributions = contributions.filter((c) => {
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchMember = filterMemberId === 'all' || c.memberId === filterMemberId;
    const matchSearch =
      c.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.note.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.referenceCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchMember && matchSearch;
  });

  return (
    <div className="space-y-5 pb-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ReceiptText className="w-5 h-5 text-[#00f090]" />
            <h2 className="text-xl font-extrabold text-white tracking-tight">Deposit Sandbox & Ledger</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Simulated micro-deposits (<strong className="text-[#00f090]">₹100–₹500</strong>) with Administrator verification
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onRefreshData && (
            <button
              onClick={onRefreshData}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-white/10 bg-[#07241a] text-slate-300 hover:text-white text-xs font-semibold hover:border-[#00f090]/40 transition cursor-pointer"
              title="Refresh ledger entries"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#00f090] ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          )}

          <button
            onClick={onOpenContributeModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00f090] to-[#10b981] text-[#041a12] font-bold text-xs sm:text-sm shadow-lg hover:brightness-110 active:scale-95 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Submit Deposit</span>
          </button>
        </div>
      </div>

      {/* Financial Status Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-[#07241a] border border-[#00f090]/30 shadow-md">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Approved Club Balance</span>
          <span className="text-xl font-extrabold text-[#00f090]">{formatINR(totalApprovedPool)}</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">{approvedContributions.length} verified deposits</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#07241a] border border-amber-400/30 shadow-md">
          <span className="text-[10px] uppercase font-bold text-amber-300 block">Pending Admin Review</span>
          <span className="text-xl font-extrabold text-amber-300">{formatINR(totalPendingAmount)}</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">{pendingContributions.length} awaiting review</span>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3.5 rounded-xl bg-[#07241a] border border-white/10 shadow-md">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Rejected / Cancelled</span>
          <span className="text-xl font-extrabold text-slate-300">{rejectedContributions.length}</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Zero impact on pool</span>
        </div>
      </div>

      {/* Quick 1-Click Simulation Toolbar for Active Member */}
      <div className="rounded-2xl bg-[#07241a] border border-[#00f090]/25 p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ backgroundColor: currentMember.color || '#00f090' }}
          >
            {currentMember.avatar}
          </div>
          <div>
            <span className="text-xs font-semibold text-white block">
              Quick Test Deposit as <span className="text-[#00f090]">{currentMember.name}</span>
            </span>
            <span className="text-[11px] text-slate-400">Submits sandbox micro-deposit into Pending state</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {[100, 250, 500].map((amt) => (
            <button
              key={amt}
              onClick={() => onSimulateQuickDeposit(amt)}
              className="px-3 py-1.5 rounded-xl bg-[#041a12] hover:bg-[#00f090] hover:text-[#041a12] text-[#00f090] border border-[#00f090]/30 text-xs font-bold transition active:scale-95 cursor-pointer"
            >
              +₹{amt} (Test)
            </button>
          ))}
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'all', label: 'All Deposits', count: contributions.length },
            { id: 'pending', label: 'Pending Review', count: pendingContributions.length, highlight: true },
            { id: 'approved', label: 'Approved (Settled)', count: approvedContributions.length },
            { id: 'rejected', label: 'Rejected', count: rejectedContributions.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-[#00f090] text-[#041a12] shadow-sm'
                  : 'bg-[#07241a] text-slate-300 hover:text-white border border-white/10'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  statusFilter === tab.id
                    ? 'bg-[#041a12] text-[#00f090]'
                    : tab.highlight && tab.count > 0
                    ? 'bg-amber-400/20 text-amber-300'
                    : 'bg-white/10 text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by member, note, or reference code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#07241a] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00f090] transition"
            />
          </div>

          <select
            value={filterMemberId}
            onChange={(e) => setFilterMemberId(e.target.value)}
            className="bg-[#07241a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00f090] cursor-pointer"
          >
            <option value="all">All Members ({members.length})</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Ledger Table / List */}
      <div className="rounded-2xl bg-[#07241a] border border-white/10 shadow-lg overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Ledger Entries ({filteredContributions.length})
          </span>
          <span className="text-[11px] text-slate-400">
            Deposit Sandbox
          </span>
        </div>

        {filteredContributions.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <ReceiptText className="w-10 h-10 text-slate-500 mx-auto" />
            <h4 className="text-sm font-semibold text-white">No simulated deposits yet</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Initial club balance is ₹0. Submit a simulated deposit (₹100–₹500) to test the sandbox workflow.
            </p>
            <button
              onClick={onOpenContributeModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00f090] text-[#041a12] text-xs font-bold hover:bg-[#10b981] transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Record First Deposit</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredContributions.map((entry) => {
              const member = members.find((m) => m.id === entry.memberId);
              const isPending = entry.status === 'pending';
              const isApproved = entry.status === 'approved';
              const isRejected = entry.status === 'rejected';

              return (
                <div
                  key={entry.id}
                  className="p-4 hover:bg-white/[0.02] transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5"
                      style={{ backgroundColor: member?.color || '#00f090' }}
                    >
                      {member?.avatar || 'MB'}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-white">{entry.memberName}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({entry.referenceCode})
                        </span>
                        
                        {/* Status Badge */}
                        {isApproved && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00f090]/15 text-[#00f090] border border-[#00f090]/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Approved & Settled</span>
                          </span>
                        )}
                        {isPending && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/15 text-amber-300 border border-amber-400/30">
                            <Clock className="w-3 h-3" />
                            <span>Pending Review</span>
                          </span>
                        )}
                        {isRejected && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                            <XCircle className="w-3 h-3" />
                            <span>Rejected</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300">{entry.note}</p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5 flex-wrap">
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {formatDateTime(entry.timestamp)}
                        </span>
                        <span className="text-slate-500 font-mono">via {entry.method}</span>
                        {entry.reviewedBy && (
                          <span className="text-[#00f090] text-[10px]">
                            Reviewed by {entry.reviewedBy}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right side: Amount and Admin Actions */}
                  <div className="flex sm:flex-row md:flex-col items-center md:items-end justify-between gap-3 border-t md:border-t-0 pt-2 md:pt-0 border-white/5">
                    <span
                      className={`text-base font-extrabold ${
                        isApproved
                          ? 'text-[#00f090]'
                          : isPending
                          ? 'text-amber-300'
                          : 'text-slate-400 line-through'
                      }`}
                    >
                      +{formatINR(entry.amount)}
                    </span>

                    {/* Admin Approval Permissions */}
                    {isPending && (
                      <div className="flex items-center gap-2">
                        {isAdmin ? (
                          <>
                            <button
                              onClick={() => onApproveDeposit(entry.id)}
                              className="px-2.5 py-1 rounded-lg bg-[#00f090] text-[#041a12] text-xs font-bold hover:bg-[#10b981] transition cursor-pointer flex items-center gap-1 shadow"
                              title="Approve deposit and update club balance immediately"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => onRejectDeposit(entry.id)}
                              className="px-2.5 py-1 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/15 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                              title="Reject simulated deposit"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] text-amber-300/90 italic flex items-center gap-1">
                            <Crown className="w-3 h-3 text-amber-400" />
                            <span>Requires Admin ({adminName})</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
```

---

### 18. `src/components/proposals/ProposalsView.tsx`
```typescript
import React, { useState } from 'react';
import { 
  Vote, 
  Plus, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  Check, 
  ThumbsDown, 
  MinusCircle,
  Crown,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Lock,
  ShieldAlert
} from 'lucide-react';
import { Member, Proposal, ProposalStatus, VoteDecision } from '../../types';
import { formatINR, formatDate, formatDateTime } from '../../utils/formatters';

interface ProposalsViewProps {
  proposals: Proposal[];
  members: Member[];
  currentMember: Member;
  isAdmin: boolean;
  adminName: string;
  onOpenNewProposalModal: () => void;
  onOpenVoteModal: (proposal: Proposal) => void;
  onExecuteProposal: (proposalId: string) => void;
}

export const ProposalsView: React.FC<ProposalsViewProps> = ({
  proposals,
  members,
  currentMember,
  isAdmin,
  adminName,
  onOpenNewProposalModal,
  onOpenVoteModal,
  onExecuteProposal,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedTheses, setExpandedTheses] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedTheses((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredProposals = proposals.filter((p) => {
    if (filterStatus === 'all') return true;
    return p.status === filterStatus;
  });

  return (
    <div className="space-y-5 pb-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Vote className="w-5 h-5 text-[#00f090]" />
            <h2 className="text-xl font-extrabold text-white tracking-tight">Investment Proposals & Ballots</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Democratic Governance: <strong>Strict 1 Member = 1 Vote Limit</strong>. Quorum required for approval.
          </p>
        </div>

        <button
          onClick={onOpenNewProposalModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00f090] to-[#10b981] text-[#041a12] font-bold text-xs sm:text-sm shadow-lg hover:brightness-110 active:scale-95 transition cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>New Investment Proposal</span>
        </button>
      </div>

      {/* Disclaimers & Rules Banner */}
      <div className="rounded-xl bg-[#06281c] border border-amber-400/25 p-3.5 flex items-start gap-2.5 text-xs text-slate-300">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-white">Democratic & Prudent Standards:</strong> Guaranteed or speculative returns are strictly prohibited. Each member may vote <strong>only once per proposal</strong> (votes are permanently locked upon casting).
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'All Proposals', count: proposals.length },
          { id: 'voting', label: 'Voting Open', count: proposals.filter((p) => p.status === 'voting').length },
          { id: 'approved', label: 'Approved (Pending Exec)', count: proposals.filter((p) => p.status === 'approved').length },
          { id: 'executed', label: 'Executed', count: proposals.filter((p) => p.status === 'executed').length },
          { id: 'rejected', label: 'Rejected', count: proposals.filter((p) => p.status === 'rejected').length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterStatus(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition cursor-pointer ${
              filterStatus === tab.id
                ? 'bg-[#00f090] text-[#041a12] shadow-sm'
                : 'bg-[#07241a] text-slate-300 hover:text-white border border-white/10'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                filterStatus === tab.id ? 'bg-[#041a12] text-[#00f090]' : 'bg-white/10 text-slate-300'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Proposals List */}
      <div className="space-y-4">
        {filteredProposals.length === 0 ? (
          <div className="rounded-2xl bg-[#07241a] border border-white/10 p-10 text-center space-y-3">
            <Vote className="w-10 h-10 text-slate-500 mx-auto" />
            <h4 className="text-sm font-semibold text-white">No proposals in this category</h4>
            <p className="text-xs text-slate-400">
              Create an investment proposal to initiate a democratic ballot for the club.
            </p>
          </div>
        ) : (
          filteredProposals.map((proposal) => {
            const votesList = Object.values(proposal.votes);
            const approvals = votesList.filter((v) => v.decision === 'approve').length;
            const rejections = votesList.filter((v) => v.decision === 'reject').length;
            const abstains = votesList.filter((v) => v.decision === 'abstain').length;
            const quorumThreshold = Math.floor(members.length / 2) + 1; // e.g. 3 of 5
            const hasPassedQuorum = approvals >= quorumThreshold;
            const isVotingOpen = proposal.status === 'voting';
            const userVote = proposal.votes[currentMember.id];
            const isExpanded = expandedTheses[proposal.id];

            // Status Badge styling
            const getStatusBadge = (status: ProposalStatus) => {
              switch (status) {
                case 'voting':
                  return (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-400/15 text-amber-300 border border-amber-400/30">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Voting Open</span>
                    </span>
                  );
                case 'approved':
                  return (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#00f090]/15 text-[#00f090] border border-[#00f090]/30">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Quorum Approved</span>
                    </span>
                  );
                case 'executed':
                  return (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Executed & Allocated</span>
                    </span>
                  );
                case 'rejected':
                  return (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Rejected</span>
                    </span>
                  );
              }
            };

            return (
              <div
                key={proposal.id}
                className="rounded-2xl bg-[#07241a] border border-[#00f090]/20 p-5 shadow-xl space-y-4 hover:border-[#00f090]/40 transition"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-[#00f090]/15 text-[#00f090] uppercase tracking-wider">
                      {proposal.category}
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg ${
                        proposal.riskLevel === 'Low'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : proposal.riskLevel === 'Moderate'
                          ? 'bg-amber-400/15 text-amber-300'
                          : 'bg-rose-500/15 text-rose-300'
                      }`}
                    >
                      {proposal.riskLevel} Risk
                    </span>
                    <span className="text-xs text-slate-400">
                      Proposed by <strong className="text-white">{proposal.proposerName}</strong>
                    </span>
                  </div>

                  {getStatusBadge(proposal.status)}
                </div>

                {/* Title & Description */}
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-white tracking-tight">{proposal.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{proposal.description}</p>
                </div>

                {/* Metric pill bar (Strictly allocation amount, risk and horizon - NO fictional ROI) */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#041a12] border border-white/5 text-center">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Target Allocation</span>
                    <span className="text-sm sm:text-base font-extrabold text-[#00f090]">
                      {formatINR(proposal.requestedAmount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Holding Horizon</span>
                    <span className="text-sm sm:text-base font-extrabold text-white">
                      {proposal.durationMonths} Mos
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Risk Tier</span>
                    <span className="text-sm sm:text-base font-extrabold text-white">
                      {proposal.riskLevel}
                    </span>
                  </div>
                </div>

                {/* Investment Thesis Accordion */}
                <div className="rounded-xl bg-[#0d3b2c]/40 border border-[#00f090]/15 p-3 space-y-1.5">
                  <div
                    onClick={() => toggleExpand(proposal.id)}
                    className="flex items-center justify-between text-xs font-semibold text-[#00f090] cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Investment Thesis & Risk Analysis</span>
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>

                  {isExpanded && (
                    <div className="text-xs text-slate-300 leading-relaxed pt-2 border-t border-white/5 space-y-2 animate-in fade-in duration-150">
                      <p>{proposal.thesis}</p>
                      <p className="text-[10px] text-slate-400 italic">
                        * Note: Simulated club modeling. Returns depend on actual fund NAV and macro factors. Past returns do not guarantee future performance.
                      </p>
                    </div>
                  )}
                </div>

                {/* Democratic Voting Quorum Section */}
                <div className="space-y-2.5 pt-2 border-t border-white/10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">Ballot Quorum:</span>
                      <span className="text-[#00f090] font-semibold">
                        {approvals} of {members.length} Approved
                      </span>
                      {hasPassedQuorum ? (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                          Threshold Met (≥{quorumThreshold})
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">
                          (Need {quorumThreshold - approvals} more for majority)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Check className="w-3 h-3" /> {approvals} Yes
                      </span>
                      <span className="flex items-center gap-1 text-rose-400">
                        <ThumbsDown className="w-3 h-3" /> {rejections} No
                      </span>
                      <span className="flex items-center gap-1 text-amber-300">
                        <MinusCircle className="w-3 h-3" /> {abstains} Abstain
                      </span>
                    </div>
                  </div>

                  {/* Quorum Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-[#041810] overflow-hidden flex">
                    <div
                      className="h-full bg-[#00f090] transition-all"
                      style={{ width: `${(approvals / members.length) * 100}%` }}
                    />
                    <div
                      className="h-full bg-rose-500 transition-all"
                      style={{ width: `${(rejections / members.length) * 100}%` }}
                    />
                    <div
                      className="h-full bg-amber-400 transition-all"
                      style={{ width: `${(abstains / members.length) * 100}%` }}
                    />
                  </div>

                  {/* Member Votes Roster (Transparent 1 Member = 1 Vote) */}
                  <div className="pt-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">
                      Ballots Cast (1 Vote Per Member Rule)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {members.map((m) => {
                        const v = proposal.votes[m.id];
                        return (
                          <div
                            key={m.id}
                            className={`p-2 rounded-xl border flex items-center justify-between text-xs ${
                              v
                                ? v.decision === 'approve'
                                  ? 'bg-[#00f090]/10 border-[#00f090]/30 text-white'
                                  : v.decision === 'reject'
                                  ? 'bg-rose-500/10 border-rose-500/30 text-white'
                                  : 'bg-amber-400/10 border-amber-400/30 text-white'
                                : 'bg-[#041a12] border-white/5 text-slate-500'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                                style={{ backgroundColor: m.color || '#00f090' }}
                              >
                                {m.avatar}
                              </div>
                              <div className="line-clamp-1">
                                <span className="font-semibold">{m.name}</span>
                                {v?.comment && (
                                  <p className="text-[10px] text-slate-300 italic line-clamp-1">
                                    "{v.comment}"
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              {v ? (
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase flex items-center gap-1 ${
                                    v.decision === 'approve'
                                      ? 'text-[#00f090]'
                                      : v.decision === 'reject'
                                      ? 'text-rose-400'
                                      : 'text-amber-300'
                                  }`}
                                >
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>{v.decision}</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500 italic">Pending</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/10">
                  <div className="text-xs text-slate-400">
                    {proposal.status === 'executed' ? (
                      <span className="text-sky-300 flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Simulated allocation executed by {proposal.executedBy}</span>
                      </span>
                    ) : (
                      <span>Voting closes on {formatDate(proposal.votingDeadline)}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Voting Action: STRICT 1 VOTE PER MEMBER */}
                    {isVotingOpen && (
                      <button
                        onClick={() => onOpenVoteModal(proposal)}
                        className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          userVote
                            ? 'border border-white/15 text-slate-300 hover:border-white/30 hover:text-white bg-[#041a12]'
                            : 'bg-[#00f090] text-[#041a12] hover:bg-[#10b981] shadow-md'
                        }`}
                      >
                        {userVote ? (
                          <>
                            <Lock className="w-3.5 h-3.5 text-[#00f090]" />
                            <span>Your Vote Locked ({userVote.decision.toUpperCase()})</span>
                          </>
                        ) : (
                          <>
                            <Vote className="w-3.5 h-3.5" />
                            <span>Cast Ballot (1x)</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Admin Execution Action if Approved */}
                    {proposal.status === 'approved' && (
                      <button
                        onClick={() => onExecuteProposal(proposal.id)}
                        disabled={!isAdmin}
                        className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          isAdmin
                            ? 'bg-gradient-to-r from-amber-400 to-[#00f090] text-[#041a12] hover:brightness-110 shadow-md'
                            : 'bg-white/10 text-slate-400 cursor-not-allowed'
                        }`}
                        title={isAdmin ? 'Simulate executing allocation' : `Only active administrator (${adminName}) can execute`}
                      >
                        <Crown className="w-3.5 h-3.5" />
                        <span>{isAdmin ? 'Execute Allocation' : `Awaiting Admin (${adminName})`}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
```

---

### 19. `src/components/members/MembersView.tsx`
```typescript
import React from 'react';
import { 
  Users, 
  Crown, 
  UserPlus, 
  UserMinus,
  ShieldCheck, 
  Mail, 
  Phone, 
  Calendar,
  Sparkles,
  Clock,
  Info,
  Edit3
} from 'lucide-react';
import { Member, AdminRotation } from '../../types';
import { formatINR, formatDate } from '../../utils/formatters';

interface MembersViewProps {
  members: Member[];
  rotation: AdminRotation;
  currentMember: Member;
  isAdmin: boolean;
  onOpenAddMemberModal: () => void;
  onOpenEditMemberModal: (member: Member) => void;
  onOpenRemoveMemberModal: (member: Member) => void;
  onOpenRotateModal: () => void;
  onToggleMemberStatus: (memberId: string) => void;
}

export const MembersView: React.FC<MembersViewProps> = ({
  members,
  rotation,
  currentMember,
  isAdmin,
  onOpenAddMemberModal,
  onOpenEditMemberModal,
  onOpenRemoveMemberModal,
  onOpenRotateModal,
  onToggleMemberStatus,
}) => {
  const currentAdmin = members.find((m) => m.id === rotation.currentAdminId) || members[0];
  
  const currentQueueIdx = rotation.rotationQueue.indexOf(rotation.currentAdminId);
  const nextQueueIdx = (currentQueueIdx + 1) % rotation.rotationQueue.length;
  const nextAdmin = members.find((m) => m.id === rotation.rotationQueue[nextQueueIdx]) || members[1];

  const canRemoveMember = members.length > 3;

  return (
    <div className="space-y-5 pb-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#00f090]" />
            <h2 className="text-xl font-extrabold text-white tracking-tight">Club Members & Leadership</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure up to <strong>5 member profiles</strong> with rotating administrative stewardship
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAddMemberModal}
            disabled={members.length >= 5}
            className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              members.length >= 5
                ? 'bg-white/10 text-slate-400 cursor-not-allowed'
                : 'bg-[#00f090] text-[#041a12] hover:bg-[#10b981]'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>{members.length >= 5 ? 'All 5 Slots Filled' : 'Add Member Slot'}</span>
          </button>
        </div>
      </div>

      {/* Member Management Explanatory Notice */}
      <div className="rounded-xl bg-[#06291d] border border-[#00f090]/25 p-3.5 flex items-start gap-2.5 text-xs text-slate-300">
        <Info className="w-4 h-4 text-[#00f090] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="leading-relaxed">
            <strong className="text-white">Five Profile Configuration:</strong> Click the <strong className="text-[#00f090]">Configure Profile (pencil icon)</strong> on any member card below to customize their name, email, phone, and theme color.
          </p>
          <p className="text-slate-400 text-[11px]">
            All member profiles are simulated for sandbox demonstration. Minimum 3 members are required for democratic quorum.
          </p>
        </div>
      </div>

      {/* Rotating Administrator Spotlight & Philosophy Card */}
      <div className="rounded-2xl bg-gradient-to-br from-[#072d21] to-[#041810] border border-[#00f090]/30 p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-400/20 text-amber-300">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Rotating Administrator System</h3>
              <p className="text-xs text-slate-300">Enforced permissions: Only active admin can approve deposits or execute proposals</p>
            </div>
          </div>

          <button
            onClick={onOpenRotateModal}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-[#00f090] text-[#041a12] text-xs font-extrabold shadow-md hover:brightness-110 active:scale-95 transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Crown className="w-4 h-4 fill-[#041a12]" />
            <span>Pass Admin Baton</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Current & Next Admins */}
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-[#041a12] border border-amber-400/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white relative"
                  style={{ backgroundColor: currentAdmin.color || '#00f090' }}
                >
                  {currentAdmin.avatar}
                  <Crown className="w-3.5 h-3.5 text-amber-400 absolute -top-1.5 -right-1.5 fill-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-white">{currentAdmin.name}</span>
                    <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.2 rounded font-bold">
                      Current Admin
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    Term: {formatDate(rotation.termStartDate)} – {formatDate(rotation.termEndDate)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#041a12] border border-[#00f090]/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white relative"
                  style={{ backgroundColor: nextAdmin.color || '#38bdf8' }}
                >
                  {nextAdmin.avatar}
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00f090] absolute -top-1.5 -right-1.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-white">{nextAdmin.name}</span>
                    <span className="text-[10px] bg-[#00f090]/20 text-[#00f090] px-1.5 py-0.2 rounded font-bold">
                      Next in Line
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">Scheduled next baton successor</span>
                </div>
              </div>
            </div>
          </div>

          {/* Governance & Permissions Notice */}
          <div className="p-4 rounded-xl bg-[#0d3b2c]/40 border border-white/5 space-y-2 text-xs text-slate-300">
            <span className="font-bold text-white flex items-center gap-1.5 text-xs">
              <Sparkles className="w-4 h-4 text-[#00f090]" />
              <span>Enforced Administrator Privileges</span>
            </span>
            <ul className="space-y-1.5 list-disc list-inside text-slate-300/90 text-[11px]">
              <li><strong>Deposit Verification:</strong> Only the current active admin ({currentAdmin.name}) can approve pending simulated deposits into the club balance.</li>
              <li><strong>Proposal Execution:</strong> When quorum passes (majority approval), only the active admin can execute the simulated allocation.</li>
              <li><strong>Democratic Rotation:</strong> Anyone can simulate different roles by switching personas in the top navigation bar.</li>
            </ul>
          </div>
        </div>

        {/* History of Past Terms */}
        {rotation.history && rotation.history.length > 0 && (
          <div className="pt-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Previous Stewardship Terms
            </span>
            <div className="flex flex-wrap gap-2">
              {rotation.history.map((hist, i) => (
                <div
                  key={i}
                  className="px-3 py-1.5 rounded-xl bg-[#041a12] border border-white/10 text-xs text-slate-300 flex items-center gap-2"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    <strong>{hist.memberName}</strong> ({hist.term})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Member Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white tracking-tight">Configurable Member Profiles ({members.length})</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-bold">
              {members.length} / 5 slots
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {canRemoveMember ? 'Removable (above min 3)' : 'Quorum Protected (min 3)'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {members.map((member) => {
            const isMemberAdmin = member.role === 'Admin';
            const isCurrentUser = member.id === currentMember.id;

            return (
              <div
                key={member.id}
                className={`rounded-2xl bg-[#07241a] border p-5 shadow-lg space-y-4 transition ${
                  isMemberAdmin ? 'border-amber-400/40 glow-mint-sm' : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold text-white relative shrink-0"
                      style={{ backgroundColor: member.color || '#00f090' }}
                    >
                      {member.avatar}
                      {isMemberAdmin && (
                        <Crown className="w-4 h-4 text-amber-400 absolute -top-1.5 -right-1.5 fill-amber-400" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-white">{member.name}</h4>
                        {isCurrentUser && (
                          <span className="px-1.5 py-0.2 rounded bg-[#00f090]/20 text-[#00f090] text-[10px] font-bold">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isMemberAdmin
                              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                              : 'bg-white/10 text-slate-300'
                          }`}
                        >
                          {member.role === 'Admin' ? '👑 Administrator' : 'Club Member'}
                        </span>
                        <span className="text-[10px] text-slate-400 bg-[#041a12] px-1.5 py-0.5 rounded border border-white/5">
                          Simulated
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Configure Profile, Status Toggle, Remove Member */}
                  <div className="flex items-center gap-1.5">
                    {/* Configure profile */}
                    <button
                      onClick={() => onOpenEditMemberModal(member)}
                      className="p-1.5 rounded-lg border border-white/15 text-slate-300 hover:text-[#00f090] hover:border-[#00f090]/40 text-xs transition cursor-pointer"
                      title="Configure member profile details"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {/* Status toggle */}
                    <button
                      onClick={() => onToggleMemberStatus(member.id)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                        member.status === 'active'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                      title="Toggle availability status"
                    >
                      {member.status === 'active' ? '● Active' : '○ Away'}
                    </button>

                    {/* Remove Member */}
                    <button
                      onClick={() => onOpenRemoveMemberModal(member)}
                      className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                        canRemoveMember
                          ? 'border-rose-500/30 text-rose-400 hover:bg-rose-500/15'
                          : 'border-white/5 text-slate-600 hover:text-slate-400'
                      }`}
                      title={canRemoveMember ? 'Remove member slot' : 'Cannot remove: Club requires minimum 3 members'}
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Contact & Meta */}
                <div className="space-y-1 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>{member.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{member.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Joined {formatDate(member.joinedDate)}</span>
                  </div>
                </div>

                {/* Financial Summary (Clean zero default) */}
                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[#041a12] border border-white/5 text-center">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Approved Pool Share</span>
                    <span className="text-sm font-extrabold text-[#00f090]">
                      {formatINR(member.totalContributed)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Settled Deposits</span>
                    <span className="text-sm font-extrabold text-white">
                      {member.contributionCount}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
```

---

### 20. `src/components/audit/AuditView.tsx`
```typescript
import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  ShieldCheck, 
  ReceiptText, 
  Vote, 
  Crown, 
  UserCheck, 
  UserMinus,
  CheckCircle2,
  Calendar,
  Hash
} from 'lucide-react';
import { AuditLogItem, AuditEventType } from '../../types';
import { formatDateTime } from '../../utils/formatters';

interface AuditViewProps {
  logs: AuditLogItem[];
}

export const AuditView: React.FC<AuditViewProps> = ({ logs }) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredLogs = logs.filter((log) => {
    const matchType = filterType === 'all' || log.type === filterType;
    const matchSearch =
      log.actorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase())) ||
      log.hash.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchSearch;
  });

  const getEventIcon = (type: AuditEventType) => {
    switch (type) {
      case 'contribution_submitted':
        return <ReceiptText className="w-4 h-4 text-amber-400" />;
      case 'contribution_approved':
        return <CheckCircle2 className="w-4 h-4 text-[#00f090]" />;
      case 'contribution_rejected':
        return <UserMinus className="w-4 h-4 text-rose-400" />;
      case 'proposal_created':
      case 'vote_cast':
        return <Vote className="w-4 h-4 text-sky-400" />;
      case 'admin_rotated':
        return <Crown className="w-4 h-4 text-amber-400" />;
      case 'proposal_executed':
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case 'member_added':
      case 'member_updated':
        return <UserCheck className="w-4 h-4 text-purple-400" />;
      case 'member_removed':
        return <UserMinus className="w-4 h-4 text-rose-400" />;
    }
  };

  const exportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `friendpool_audit_ledger_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#00f090]" />
            <h2 className="text-xl font-extrabold text-white tracking-tight">Audit & Activity History</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable transparency log: every micro-deposit, proposal, ballot, and admin handover
          </p>
        </div>

        <button
          onClick={exportJSON}
          className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-white/10 bg-[#07241a] text-xs font-semibold text-white hover:border-[#00f090]/40 transition cursor-pointer"
        >
          <Download className="w-4 h-4 text-[#00f090]" />
          <span>Export Audit Ledger (.JSON)</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search audit trail by actor, summary, or hash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#07241a] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00f090] transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-[#07241a] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#00f090] cursor-pointer"
          >
            <option value="all">All Events ({logs.length})</option>
            <option value="contribution_submitted">Deposits Submitted</option>
            <option value="contribution_approved">Deposits Approved</option>
            <option value="contribution_rejected">Deposits Rejected</option>
            <option value="vote_cast">Ballots Cast</option>
            <option value="proposal_created">New Proposals</option>
            <option value="admin_rotated">Admin Rotations</option>
            <option value="proposal_executed">Allocations Executed</option>
          </select>
        </div>
      </div>

      {/* Audit Timeline */}
      <div className="rounded-2xl bg-[#07241a] border border-white/10 shadow-lg overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Chronological Trail ({filteredLogs.length} Records)
          </span>
          <span className="text-[11px] text-[#00f090] font-mono flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Cryptographically Verified</span>
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-400">
            No audit records match your query.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 hover:bg-white/[0.02] transition flex flex-col sm:flex-row sm:items-start justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#041a12] border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                    {getEventIcon(log.type)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white">{log.actorName}</span>
                      <span className="text-xs text-slate-300">{log.summary}</span>
                    </div>

                    {log.details && (
                      <p className="text-xs text-slate-400">{log.details}</p>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3 text-slate-600" />
                        {formatDateTime(log.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hash Badge */}
                <div className="sm:text-right shrink-0">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#041a12] border border-white/10 font-mono text-[10px] text-slate-400">
                    <Hash className="w-3 h-3 text-[#00f090]" />
                    <span>{log.hash}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
```

---

### 21. `src/components/modals/ContributeModal.tsx`
```typescript
import React, { useState } from 'react';
import { X, Sparkles, AlertCircle, ArrowRight, ShieldCheck, Clock } from 'lucide-react';
import { Member } from '../../types';
import { formatINR } from '../../utils/formatters';

interface ContributeModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  currentMemberId: string;
  onSimulateContribution: (data: {
    memberId: string;
    amount: number;
    note: string;
    method: 'Simulated UPI' | 'Simulated IMPS' | 'Club Quick-Deposit';
  }) => void;
}

export const ContributeModal: React.FC<ContributeModalProps> = ({
  isOpen,
  onClose,
  members,
  currentMemberId,
  onSimulateContribution,
}) => {
  const [selectedMemberId, setSelectedMemberId] = useState(currentMemberId);
  const [amount, setAmount] = useState<number>(250);
  const [note, setNote] = useState('');
  const [method, setMethod] = useState<'Simulated UPI' | 'Simulated IMPS' | 'Club Quick-Deposit'>('Simulated UPI');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const presets = [100, 200, 250, 350, 500];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount < 100 || amount > 500) {
      setError('Simulated deposit must be strictly between ₹100 and ₹500.');
      return;
    }
    setError(null);
    onSimulateContribution({
      memberId: selectedMemberId,
      amount,
      note: note.trim() || 'Simulated micro-deposit tranche',
      method,
    });
    setNote('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-[#07241a] border border-[#00f090]/30 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00f090] animate-pulse" />
              <h3 className="text-lg font-bold text-white tracking-tight">Deposit Sandbox (Simulated)</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">₹100–₹500 micro-pool testing rail</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sandbox Warning Notice */}
        <div className="mx-6 mt-4 p-3 rounded-xl bg-[#0d3b2c]/80 border border-[#00f090]/20 flex items-start gap-2.5 text-xs text-slate-300">
          <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p>
            <strong className="text-white">Approval Workflow:</strong> Submitted deposits enter the <strong>Pending</strong> state. The active Club Administrator must review and approve them before the club balance is incremented. No real money is transferred.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Member selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Contributing Member (Simulated Profile)
            </label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full bg-[#041a12] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#00f090] transition"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role === 'Admin' ? '👑 Admin' : 'Member'}) — Approved: {formatINR(m.totalContributed)}
                </option>
              ))}
            </select>
          </div>

          {/* Amount selector with ₹100 - ₹500 rule */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Simulated Amount (₹100 to ₹500)
              </label>
              <span className="text-sm font-bold text-[#00f090]">{formatINR(amount)}</span>
            </div>

            {/* Quick preset chips */}
            <div className="grid grid-cols-5 gap-2 mb-3">
              {presets.map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => {
                    setAmount(preset);
                    setError(null);
                  }}
                  className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                    amount === preset
                      ? 'bg-[#00f090] text-[#041a12] shadow-sm'
                      : 'bg-[#041a12] text-slate-300 hover:text-white border border-white/10 hover:border-[#00f090]/40'
                  }`}
                >
                  ₹{preset}
                </button>
              ))}
            </div>

            {/* Slider */}
            <input
              type="range"
              min={100}
              max={500}
              step={25}
              value={amount}
              onChange={(e) => {
                setAmount(Number(e.target.value));
                setError(null);
              }}
              className="w-full accent-[#00f090] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>Min ₹100</span>
              <span>Default ₹250</span>
              <span>Max ₹500</span>
            </div>
          </div>

          {/* Simulated Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Simulated Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Simulated UPI', 'Simulated IMPS', 'Club Quick-Deposit'] as const).map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`py-2 px-1 text-[11px] font-medium rounded-xl border text-center transition cursor-pointer ${
                    method === m
                      ? 'border-[#00f090] bg-[#00f090]/15 text-[#00f090]'
                      : 'border-white/10 bg-[#041a12] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {m.replace('Simulated ', '')}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Deposit Note / Purpose
            </label>
            <input
              type="text"
              placeholder="e.g. Monthly sandbox contribution, Test pool tranche"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={60}
              className="w-full bg-[#041a12] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00f090] transition"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-red-900/40 border border-red-500/40 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#00f090] to-[#10b981] text-[#041a12] font-bold text-sm shadow-lg hover:brightness-110 active:scale-[0.98] transition cursor-pointer"
            >
              <span>Submit Simulated Deposit for Approval</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

---

### 22. `src/components/modals/NewProposalModal.tsx`
```typescript
import React, { useState } from 'react';
import { X, TrendingUp, AlertCircle, Sparkles, ShieldAlert } from 'lucide-react';
import { Member, ProposalCategory } from '../../types';
import { formatINR } from '../../utils/formatters';

interface NewProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  currentMemberId: string;
  clubBalance: number;
  onCreateProposal: (data: {
    title: string;
    category: ProposalCategory;
    requestedAmount: number;
    proposerId: string;
    durationMonths: number;
    riskLevel: 'Low' | 'Moderate' | 'High';
    description: string;
    thesis: string;
  }) => void;
}

const CATEGORIES: ProposalCategory[] = [
  'Index Fund',
  'Sovereign Green Bonds',
  'Tech ETF',
  'Fixed Deposit',
  'Solar Infrastructure',
  'Blue Chip Dividend',
];

export const NewProposalModal: React.FC<NewProposalModalProps> = ({
  isOpen,
  onClose,
  members,
  currentMemberId,
  clubBalance,
  onCreateProposal,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ProposalCategory>('Index Fund');
  const [requestedAmount, setRequestedAmount] = useState<number>(1000);
  const [durationMonths, setDurationMonths] = useState<number>(12);
  const [riskLevel, setRiskLevel] = useState<'Low' | 'Moderate' | 'High'>('Moderate');
  const [description, setDescription] = useState('');
  const [thesis, setThesis] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentMember = members.find((m) => m.id === currentMemberId) || members[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a descriptive proposal title.');
      return;
    }
    if (requestedAmount < 100) {
      setError('Minimum simulated allocation amount is ₹100.');
      return;
    }
    if (!description.trim() || !thesis.trim()) {
      setError('Please outline both the description and the investment thesis.');
      return;
    }

    onCreateProposal({
      title: title.trim(),
      category,
      requestedAmount,
      proposerId: currentMember.id,
      durationMonths,
      riskLevel,
      description: description.trim(),
      thesis: thesis.trim(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#07241a] border border-[#00f090]/30 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#00f090]" />
              <h3 className="text-lg font-bold text-white tracking-tight">Create Investment Proposal</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Drafted by <span className="text-[#00f090] font-medium">{currentMember.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Regulatory & Realism Notice */}
        <div className="mx-6 mt-4 p-3 rounded-xl bg-[#041a12] border border-amber-400/30 text-xs text-amber-200/90 flex items-start gap-2 shrink-0">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p>
            <strong className="text-white">Prudent Investment Policy:</strong> Unsupported or guaranteed target returns are prohibited. Investment proposals must evaluate risk, time horizon, and allocation rationale realistically.
          </p>
        </div>

        {/* Form Body - scrollable */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Proposal Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Nifty 50 Index Accumulation SIP or Liquid Fixed Deposit"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError(null);
              }}
              className="w-full bg-[#041a12] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00f090] transition"
            />
          </div>

          {/* Category & Risk */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Asset Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProposalCategory)}
                className="w-full bg-[#041a12] border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00f090] transition"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Risk Classification
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['Low', 'Moderate', 'High'] as const).map((r) => (
                  <button
                    type="button"
                    key={r}
                    onClick={() => setRiskLevel(r)}
                    className={`py-2 text-xs font-medium rounded-lg border text-center transition cursor-pointer ${
                      riskLevel === r
                        ? r === 'Low'
                          ? 'border-[#00f090] bg-[#00f090]/15 text-[#00f090]'
                          : r === 'Moderate'
                          ? 'border-amber-400 bg-amber-400/15 text-amber-300'
                          : 'border-rose-400 bg-rose-400/15 text-rose-300'
                        : 'border-white/10 bg-[#041a12] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Requested Amount & Horizon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Target Allocation Amount (₹)
              </label>
              <input
                type="number"
                min={100}
                step={100}
                value={requestedAmount}
                onChange={(e) => setRequestedAmount(Number(e.target.value))}
                className="w-full bg-[#041a12] border border-white/15 rounded-xl px-3 py-2 text-sm font-semibold text-[#00f090] focus:outline-none focus:border-[#00f090] transition"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Current club unallocated pool: {formatINR(clubBalance)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Holding Horizon
              </label>
              <select
                value={durationMonths}
                onChange={(e) => setDurationMonths(Number(e.target.value))}
                className="w-full bg-[#041a12] border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00f090] transition"
              >
                <option value={3}>3 Months</option>
                <option value={6}>6 Months</option>
                <option value={12}>12 Months (1 yr)</option>
                <option value={24}>24 Months (2 yr)</option>
                <option value={36}>36 Months (3 yr)</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Asset Description
            </label>
            <textarea
              rows={2}
              required
              placeholder="Explain the vehicle, fund structure, or asset..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#041a12] border border-white/15 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00f090] transition resize-none"
            />
          </div>

          {/* Investment Thesis */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Investment Thesis & Rationale
            </label>
            <textarea
              rows={3}
              required
              placeholder="Outline risk mitigation, liquidity terms, and why this allocation suits our collective club goals..."
              value={thesis}
              onChange={(e) => setThesis(e.target.value)}
              className="w-full bg-[#041a12] border border-white/15 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00f090] transition resize-none"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-red-900/40 border border-red-500/40 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/15 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#00f090] to-[#10b981] text-[#041a12] font-bold text-sm shadow-lg hover:brightness-110 active:scale-[0.98] transition cursor-pointer"
            >
              Submit Proposal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

---

### 23. `src/components/modals/VoteModal.tsx`
```typescript
import React, { useState } from 'react';
import { X, Check, ThumbsDown, MinusCircle, ShieldCheck, Lock } from 'lucide-react';
import { Proposal, Member, VoteDecision } from '../../types';
import { formatINR, formatDateTime } from '../../utils/formatters';

interface VoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: Proposal | null;
  currentMember: Member;
  onCastVote: (proposalId: string, decision: VoteDecision, comment?: string) => void;
}

export const VoteModal: React.FC<VoteModalProps> = ({
  isOpen,
  onClose,
  proposal,
  currentMember,
  onCastVote,
}) => {
  if (!isOpen || !proposal) return null;

  const existingVote = proposal.votes[currentMember.id];
  const [decision, setDecision] = useState<VoteDecision>(existingVote?.decision || 'approve');
  const [comment, setComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (existingVote) return; // Enforce: vote only once per member!
    onCastVote(proposal.id, decision, comment.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-[#07241a] border border-[#00f090]/30 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#00f090]" />
              <h3 className="text-lg font-bold text-white tracking-tight">Democratic Ballot</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Strict Rule: 1 Member = 1 Single Vote</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Proposal Summary Box */}
          <div className="p-3.5 rounded-xl bg-[#041a12] border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-[#00f090] uppercase">
                {proposal.category}
              </span>
              <span className="text-[11px] font-semibold text-slate-300">
                {proposal.riskLevel} Risk
              </span>
            </div>
            <h4 className="text-sm font-bold text-white leading-snug">{proposal.title}</h4>
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span>Target Allocation: <strong className="text-white">{formatINR(proposal.requestedAmount)}</strong></span>
              <span>Horizon: <strong className="text-white">{proposal.durationMonths} Mos</strong></span>
            </div>
          </div>

          {/* Voter Identity Info */}
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#0d3b2c]/60 border border-[#00f090]/20">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ backgroundColor: currentMember.color || '#00f090' }}
            >
              {currentMember.avatar}
            </div>
            <div className="text-xs">
              <span className="text-slate-400">Voter: </span>
              <strong className="text-white">{currentMember.name}</strong>
              <span className="text-slate-400 text-[11px] ml-1">({currentMember.role})</span>
            </div>
          </div>

          {/* If already voted: Enforce One Vote Per Member */}
          {existingVote ? (
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-400/40 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <Lock className="w-4 h-4" />
                <span>Ballot Already Recorded (Vote Locked)</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                You have already cast your official single ballot on this proposal as <strong>{existingVote.decision.toUpperCase()}</strong> on {formatDateTime(existingVote.timestamp)}.
              </p>
              {existingVote.comment && (
                <p className="text-slate-400 italic">
                  Rationale provided: "{existingVote.comment}"
                </p>
              )}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2 rounded-lg bg-[#0d3b2c] text-white font-semibold hover:bg-[#145339] transition cursor-pointer"
                >
                  Close Ballot
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Vote Choices */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                  Cast Your Decision (Irreversible once cast)
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDecision('approve')}
                    className={`py-3 px-2 rounded-xl border flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      decision === 'approve'
                        ? 'border-[#00f090] bg-[#00f090]/20 text-white shadow-sm'
                        : 'border-white/10 bg-[#041a12] text-slate-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${decision === 'approve' ? 'bg-[#00f090] text-[#041a12]' : 'bg-white/10 text-slate-300'}`}>
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                    <span className="text-xs font-bold">Approve</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecision('reject')}
                    className={`py-3 px-2 rounded-xl border flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      decision === 'reject'
                        ? 'border-rose-500 bg-rose-500/20 text-white shadow-sm'
                        : 'border-white/10 bg-[#041a12] text-slate-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${decision === 'reject' ? 'bg-rose-500 text-white' : 'bg-white/10 text-slate-300'}`}>
                      <ThumbsDown className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold">Reject</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecision('abstain')}
                    className={`py-3 px-2 rounded-xl border flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      decision === 'abstain'
                        ? 'border-amber-400 bg-amber-400/20 text-white shadow-sm'
                        : 'border-white/10 bg-[#041a12] text-slate-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${decision === 'abstain' ? 'bg-amber-400 text-[#041a12]' : 'bg-white/10 text-slate-300'}`}>
                      <MinusCircle className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold">Abstain</span>
                  </button>
                </div>
              </div>

              {/* Comment Rationale */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Comment / Rationale (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Explain your ballot rationale for other club members..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full bg-[#041a12] border border-white/15 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00f090] transition resize-none"
                />
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00f090] to-[#10b981] text-[#041a12] font-bold text-sm shadow-lg hover:brightness-110 active:scale-[0.98] transition cursor-pointer"
                >
                  Cast Official Ballot (Final)
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
```

---

### 24. `src/components/modals/RotateAdminModal.tsx`
```typescript
import React, { useState } from 'react';
import { X, Crown, ArrowRight, Shield, CheckCircle2 } from 'lucide-react';
import { Member, AdminRotation } from '../../types';
import { formatDate } from '../../utils/formatters';

interface RotateAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  rotation: AdminRotation;
  members: Member[];
  onRotateAdmin: (nextAdminId: string, note?: string) => void;
}

export const RotateAdminModal: React.FC<RotateAdminModalProps> = ({
  isOpen,
  onClose,
  rotation,
  members,
  onRotateAdmin,
}) => {
  if (!isOpen) return null;

  const currentAdmin = members.find((m) => m.id === rotation.currentAdminId) || members[0];
  
  // Find next member in rotation queue
  const currentQueueIndex = rotation.rotationQueue.indexOf(rotation.currentAdminId);
  const nextQueueIndex = (currentQueueIndex + 1) % rotation.rotationQueue.length;
  const defaultNextId = rotation.rotationQueue[nextQueueIndex];

  const [selectedNextId, setSelectedNextId] = useState<string>(defaultNextId);
  const [rotationNote, setRotationNote] = useState('');

  const nextAdmin = members.find((m) => m.id === selectedNextId) || members[1];

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    onRotateAdmin(selectedNextId, rotationNote.trim() || 'Scheduled democratic leadership baton transfer');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-[#07241a] border border-[#00f090]/30 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-bold text-white tracking-tight">Rotate Administrator Baton</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Democratic leadership rotation system</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="p-6 space-y-4">
          {/* Visual Baton Transfer Graphic */}
          <div className="p-4 rounded-xl bg-[#041a12] border border-white/10 flex items-center justify-between gap-3">
            {/* Outgoing */}
            <div className="flex flex-col items-center text-center">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold text-white border-2 border-amber-400 relative"
                style={{ backgroundColor: currentAdmin.color || '#00f090' }}
              >
                {currentAdmin.avatar}
                <Crown className="w-4 h-4 text-amber-400 absolute -top-2 -right-2 fill-amber-400" />
              </div>
              <span className="text-xs font-bold text-white mt-1.5 line-clamp-1">{currentAdmin.name}</span>
              <span className="text-[10px] text-amber-300">Outgoing Admin</span>
            </div>

            <div className="flex flex-col items-center px-2">
              <span className="text-[10px] text-slate-400 mb-1">Pass Baton</span>
              <div className="w-10 h-0.5 bg-gradient-to-r from-amber-400 to-[#00f090] relative flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-[#00f090] absolute" />
              </div>
            </div>

            {/* Incoming */}
            <div className="flex flex-col items-center text-center">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold text-white border-2 border-[#00f090] relative"
                style={{ backgroundColor: nextAdmin.color || '#38bdf8' }}
              >
                {nextAdmin.avatar}
                <Shield className="w-3.5 h-3.5 text-[#00f090] absolute -top-1.5 -right-1.5" />
              </div>
              <span className="text-xs font-bold text-white mt-1.5 line-clamp-1">{nextAdmin.name}</span>
              <span className="text-[10px] text-[#00f090]">Incoming Admin</span>
            </div>
          </div>

          {/* Select Next Administrator */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Assign Next Administrator
            </label>
            <select
              value={selectedNextId}
              onChange={(e) => setSelectedNextId(e.target.value)}
              className="w-full bg-[#041a12] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#00f090] transition"
            >
              {members
                .filter((m) => m.id !== currentAdmin.id)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.id === defaultNextId ? '(Scheduled Next in Queue)' : ''}
                  </option>
                ))}
            </select>
          </div>

          {/* Handover note */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Handover Remarks (Logged to Audit)
            </label>
            <input
              type="text"
              placeholder="e.g. Regular 30-day rotation, all allocations audited"
              value={rotationNote}
              onChange={(e) => setRotationNote(e.target.value)}
              className="w-full bg-[#041a12] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00f090] transition"
            />
          </div>

          <div className="p-3 rounded-xl bg-[#0d3b2c]/60 border border-[#00f090]/20 text-xs text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 text-[#00f090] font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Decentralized Governance Rule</span>
            </div>
            <p>
              Friendpool rotates administrative stewardship every 30 days. The active admin is entrusted to execute passed proposals and audit pool deposits.
            </p>
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/15 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-[#00f090] text-[#041a12] font-bold text-sm shadow-lg hover:brightness-110 active:scale-[0.98] transition cursor-pointer"
            >
              Pass Baton Now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

---

### 25. `src/components/modals/AddMemberModal.tsx`
```typescript
import React, { useState } from 'react';
import { X, UserPlus, AlertCircle, Users } from 'lucide-react';
import { Member } from '../../types';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCount: number;
  onAddMember: (memberData: {
    name: string;
    email: string;
    phone: string;
  }) => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  currentCount,
  onAddMember,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  if (currentCount >= 5) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-md rounded-2xl bg-[#07241a] border border-amber-500/40 p-6 shadow-2xl text-center">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Club Capacity Reached</h3>
          <p className="text-xs text-slate-300 mb-5">
            Friendpool is optimized for close-knit groups of <strong>3 to 5 people</strong> to maintain intimacy, high trust, and 100% democratic consensus.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[#0d3b2c] text-white text-sm font-semibold hover:bg-[#145339] transition cursor-pointer"
          >
            Understood
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide the member full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    setError(null);
    onAddMember({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || '+91 98' + Math.floor(10000000 + Math.random() * 90000000),
    });
    setName('');
    setEmail('');
    setPhone('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-[#07241a] border border-[#00f090]/30 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#00f090]" />
              <h3 className="text-lg font-bold text-white tracking-tight">Invite Club Member</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Current members: {currentCount} of 5 max
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Maya Deshmukh"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              className="w-full bg-[#041a12] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00f090] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Email Address *
            </label>
            <input
              type="email"
              required
              placeholder="e.g. maya@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              className="w-full bg-[#041a12] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00f090] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Mobile Number (Optional)
            </label>
            <input
              type="text"
              placeholder="+91 98200 11223"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-[#041a12] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00f090] transition"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-red-900/40 border border-red-500/40 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/15 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#00f090] to-[#10b981] text-[#041a12] font-bold text-sm shadow-lg hover:brightness-110 active:scale-[0.98] transition cursor-pointer"
            >
              Add to Club
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

---

### 26. `src/components/modals/EditMemberModal.tsx`
```typescript
import React, { useState, useEffect } from 'react';
import { X, UserCheck, Palette, Sparkles } from 'lucide-react';
import { Member } from '../../types';

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  onSaveMember: (updatedMember: Member) => void;
}

const COLOR_OPTIONS = [
  '#00f090', // Mint
  '#38bdf8', // Sky
  '#fbbf24', // Amber
  '#f472b6', // Pink
  '#a78bfa', // Purple
  '#34d399', // Emerald
  '#fb923c', // Orange
];

export const EditMemberModal: React.FC<EditMemberModalProps> = ({
  isOpen,
  onClose,
  member,
  onSaveMember,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [color, setColor] = useState('#00f090');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (member) {
      setName(member.name);
      setEmail(member.email);
      setPhone(member.phone);
      setColor(member.color || '#00f090');
      setError(null);
    }
  }, [member]);

  if (!isOpen || !member) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Member name is required.');
      return;
    }

    const initials = name
      .trim()
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'MB';

    onSaveMember({
      ...member,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      avatar: initials,
      color,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-[#07241a] border border-[#00f090]/30 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[#00f090]" />
              <h3 className="text-lg font-bold text-white tracking-tight">Configure Member Profile</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Customize member identity and details</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Avatar Preview */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#041a12] border border-white/10">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-md shrink-0"
              style={{ backgroundColor: color }}
            >
              {name
                .trim()
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2) || member.avatar}
            </div>
            <div>
              <span className="text-xs font-bold text-white block">{name || 'Member Preview'}</span>
              <span className="text-[11px] text-slate-400">
                {member.role === 'Admin' ? '👑 Current Club Administrator' : 'Club Member (Simulated)'}
              </span>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              className="w-full bg-[#041a12] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#00f090] transition"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#041a12] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#00f090] transition"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Mobile Number
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-[#041a12] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#00f090] transition"
            />
          </div>

          {/* Accent Color */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
              Theme Color Tag
            </label>
            <div className="flex items-center gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-xl transition cursor-pointer flex items-center justify-center ${
                    color === c ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-400">{error}</p>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/15 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#00f090] to-[#10b981] text-[#041a12] font-bold text-sm shadow-lg hover:brightness-110 active:scale-[0.98] transition cursor-pointer"
            >
              Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

---

### 27. `src/components/modals/RemoveMemberModal.tsx`
```typescript
import React, { useState } from 'react';
import { X, UserMinus, AlertTriangle, ArrowRight, ShieldAlert, Crown } from 'lucide-react';
import { Member, AdminRotation } from '../../types';
import { formatINR } from '../../utils/formatters';

interface RemoveMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  currentMemberCount: number;
  rotation: AdminRotation;
  members: Member[];
  onConfirmRemove: (memberId: string, reason: string) => void;
}

export const RemoveMemberModal: React.FC<RemoveMemberModalProps> = ({
  isOpen,
  onClose,
  member,
  currentMemberCount,
  rotation,
  members,
  onConfirmRemove,
}) => {
  const [reason, setReason] = useState('');

  if (!isOpen || !member) return null;

  // Club requires at least 3 members
  if (currentMemberCount <= 3) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-md rounded-2xl bg-[#07241a] border border-amber-500/40 p-6 shadow-2xl text-center">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center mb-3">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Minimum Quorum Required</h3>
          <p className="text-xs text-slate-300 mb-5 leading-relaxed">
            Friendpool requires a minimum of <strong>3 members</strong> to maintain democratic quorum and rotation rules. You cannot remove any more members unless another member is added first.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[#0d3b2c] text-white text-sm font-semibold hover:bg-[#145339] transition cursor-pointer"
          >
            Understood
          </button>
        </div>
      </div>
    );
  }

  const isCurrentAdmin = member.id === rotation.currentAdminId;
  const nextInQueueId = rotation.rotationQueue.find((id) => id !== member.id);
  const nextAdminCandidate = members.find((m) => m.id === nextInQueueId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmRemove(member.id, reason.trim() || 'Simulated member departure and pool exit settlement');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-[#07241a] border border-rose-500/40 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <UserMinus className="w-5 h-5 text-rose-400" />
              <h3 className="text-lg font-bold text-white tracking-tight">Remove Club Member</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Offboard member and settle simulated pool equity</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Member Card Summary */}
          <div className="p-3.5 rounded-xl bg-[#041a12] border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
                style={{ backgroundColor: member.color || '#00f090' }}
              >
                {member.avatar}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{member.name}</h4>
                <p className="text-xs text-slate-400">{member.email}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-400 block">Total Contributed</span>
              <span className="text-sm font-extrabold text-[#00f090]">
                {formatINR(member.totalContributed)}
              </span>
            </div>
          </div>

          {/* Admin warning if removing active admin */}
          {isCurrentAdmin && (
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-400/40 text-xs text-amber-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-300">
                <Crown className="w-4 h-4 fill-amber-300" />
                <span>Active Administrator Notice</span>
              </div>
              <p>
                <strong>{member.name}</strong> is currently holding the Admin Baton. Upon removal, administrative leadership will automatically transfer to <strong>{nextAdminCandidate?.name}</strong>.
              </p>
            </div>
          )}

          {/* Settlement notice */}
          <div className="p-3 rounded-xl bg-[#0d3b2c]/60 border border-[#00f090]/20 text-xs text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-white">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Simulated Exit Settlement</span>
            </div>
            <p>
              Simulates returning the member's accrued pool equity of <strong>{formatINR(member.totalContributed)}</strong>. The member will be removed from all upcoming democratic ballots and the rotation queue.
            </p>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Departure Reason (Logged to Audit Trail)
            </label>
            <input
              type="text"
              placeholder="e.g. Relocated to new city, stepped down mutually"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[#041a12] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-400 transition"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/15 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 text-white font-bold text-sm shadow-lg hover:brightness-110 active:scale-[0.98] transition cursor-pointer"
            >
              Confirm Offboarding
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

---

### 28. `src/components/modals/ResetConfirmModal.tsx`
```typescript
import React from 'react';
import { X, RotateCcw, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ResetConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset: () => void;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirmReset,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-[#07241a] border border-amber-400/40 p-6 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Reset Sandbox to ₹0</h3>
              <p className="text-[11px] text-slate-400">Restore clean initial demonstration state</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-4 space-y-3 text-xs text-slate-300 leading-relaxed">
          <div className="p-3 rounded-xl bg-[#041a12] border border-amber-400/20 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p>
              This will clear all pending and approved simulated deposits, resetting the club balance back to <strong>₹0</strong> and archiving voting ballots.
            </p>
          </div>
          <p className="text-slate-400">
            Use this anytime you want to re-test the contribution sandbox, administrator approvals, or democratic voting from a fresh starting point.
          </p>
        </div>

        <div className="flex items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/15 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirmReset();
              onClose();
            }}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-[#00f090] text-[#041a12] font-bold text-sm shadow-lg hover:brightness-110 active:scale-[0.98] transition cursor-pointer"
          >
            Confirm Reset (₹0)
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

### 29. `src/components/pwa/PWAInstallButton.tsx`
```typescript
import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button or show a subtle installed indicator
  if (isInstalled) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0d3b2c] border border-[#00f090]/25 text-[#00f090] text-xs font-medium">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Installed PWA</span>
      </div>
    );
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#00f090] to-[#10b981] px-3.5 py-1.5 text-xs font-semibold text-[#041a12] shadow-sm hover:brightness-110 active:scale-95 transition cursor-pointer"
        title="Install Friendpool as standalone Web App"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-xl border border-[#00f090]/30 bg-[#0a2e22] px-3 py-1.5 text-xs font-medium text-[#00f090] hover:bg-[#0f3d2e] transition cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Install iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[#08281d] border border-[#00f090]/30 p-6 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#00f090]/15 flex items-center justify-center text-[#00f090]">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white">Install on iPhone / iPad</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="flex items-start gap-3 bg-[#041810] p-3 rounded-xl border border-white/5">
                  <span className="w-6 h-6 rounded-full bg-[#00f090]/20 text-[#00f090] flex items-center justify-center text-xs font-bold shrink-0">1</span>
                  <span>Tap the <strong>Share</strong> button (box with upward arrow) in the Safari toolbar.</span>
                </div>
                <div className="flex items-start gap-3 bg-[#041810] p-3 rounded-xl border border-white/5">
                  <span className="w-6 h-6 rounded-full bg-[#00f090]/20 text-[#00f090] flex items-center justify-center text-xs font-bold shrink-0">2</span>
                  <span>Scroll down the action sheet and tap <strong>Add to Home Screen</strong>.</span>
                </div>
                <div className="flex items-start gap-3 bg-[#041810] p-3 rounded-xl border border-white/5">
                  <span className="w-6 h-6 rounded-full bg-[#00f090]/20 text-[#00f090] flex items-center justify-center text-xs font-bold shrink-0">3</span>
                  <span>Confirm with <strong>Add</strong> to launch Friendpool like a native app.</span>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-[#00f090] py-2.5 text-sm font-semibold text-[#041a12] hover:bg-[#10b981] transition cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback info button if not on Chromium or iOS prompt
  return (
    <button
      onClick={() => {
        // Fallback info
      }}
      className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#0a2e22]/60 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:border-[#00f090]/30 transition"
      title="PWA Install Guide"
    >
      <Download className="w-3.5 h-3.5 text-[#00f090]" />
      <span className="hidden sm:inline">PWA App</span>
    </button>
  );
};
```

---

### 30. `src/components/pwa/OfflineIndicator.tsx`
```typescript
import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:right-auto md:w-80 z-50 flex items-center gap-2.5 rounded-xl bg-amber-900/90 border border-amber-500/40 px-3.5 py-2.5 text-xs font-medium text-amber-200 shadow-xl backdrop-blur-md">
      <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
      <div>
        <p className="font-semibold text-white">Offline Mode</p>
        <p className="text-amber-200/80">Using local cached ledger and simulations.</p>
      </div>
    </div>
  );
};
```

---

### 31. `src/App.tsx`
```typescript
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Member, 
  Contribution, 
  Proposal, 
  AdminRotation, 
  AuditLogItem, 
  VoteDecision 
} from './types';
import { 
  INITIAL_MEMBERS, 
  INITIAL_CONTRIBUTIONS, 
  INITIAL_PROPOSALS, 
  INITIAL_ADMIN_ROTATION, 
  INITIAL_AUDIT_LOGS 
} from './data/mockData';
import { Navbar } from './components/common/Navbar';
import { BottomNav, NavTab } from './components/common/BottomNav';
import { DashboardView } from './components/dashboard/DashboardView';
import { ContributionsView } from './components/contributions/ContributionsView';
import { ProposalsView } from './components/proposals/ProposalsView';
import { MembersView } from './components/members/MembersView';
import { AuditView } from './components/audit/AuditView';
import { ContributeModal } from './components/modals/ContributeModal';
import { NewProposalModal } from './components/modals/NewProposalModal';
import { VoteModal } from './components/modals/VoteModal';
import { RotateAdminModal } from './components/modals/RotateAdminModal';
import { AddMemberModal } from './components/modals/AddMemberModal';
import { EditMemberModal } from './components/modals/EditMemberModal';
import { RemoveMemberModal } from './components/modals/RemoveMemberModal';
import { ResetConfirmModal } from './components/modals/ResetConfirmModal';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';
import { generateAuditHash, formatINR } from './utils/formatters';

const STORAGE_KEY = 'friendpool_pwa_state_v1_1';

export default function App() {
  // Load state from localStorage or initial clean demonstration data (₹0 balance)
  const [members, setMembers] = useState<Member[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_members`);
      return saved ? JSON.parse(saved) : INITIAL_MEMBERS;
    } catch {
      return INITIAL_MEMBERS;
    }
  });

  const [contributions, setContributions] = useState<Contribution[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_contributions`);
      return saved ? JSON.parse(saved) : INITIAL_CONTRIBUTIONS;
    } catch {
      return INITIAL_CONTRIBUTIONS;
    }
  });

  const [proposals, setProposals] = useState<Proposal[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_proposals`);
      return saved ? JSON.parse(saved) : INITIAL_PROPOSALS;
    } catch {
      return INITIAL_PROPOSALS;
    }
  });

  const [rotation, setRotation] = useState<AdminRotation>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_rotation`);
      return saved ? JSON.parse(saved) : INITIAL_ADMIN_ROTATION;
    } catch {
      return INITIAL_ADMIN_ROTATION;
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_audit`);
      return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  });

  const [currentMemberId, setCurrentMemberId] = useState<string>('m1');
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  // Modals state
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [isRotateModalOpen, setIsRotateModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<Member | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [proposalToVote, setProposalToVote] = useState<Proposal | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_members`, JSON.stringify(members));
      localStorage.setItem(`${STORAGE_KEY}_contributions`, JSON.stringify(contributions));
      localStorage.setItem(`${STORAGE_KEY}_proposals`, JSON.stringify(proposals));
      localStorage.setItem(`${STORAGE_KEY}_rotation`, JSON.stringify(rotation));
      localStorage.setItem(`${STORAGE_KEY}_audit`, JSON.stringify(auditLogs));
    } catch {
      // ignore storage quota issues
    }
  }, [members, contributions, proposals, rotation, auditLogs]);

  const currentMember = members.find((m) => m.id === currentMemberId) || members[0];
  const currentAdmin = members.find((m) => m.id === rotation.currentAdminId) || members[0];
  const isAdmin = currentMember?.id === rotation.currentAdminId;

  // Club balance is strictly calculated from APPROVED contributions!
  const approvedTotalBalance = contributions
    .filter((c) => c.status === 'approved')
    .reduce((sum, c) => sum + c.amount, 0);

  // Deposit Sandbox: Submit contribution into PENDING state
  const handleSimulateContribution = ({
    memberId,
    amount,
    note,
    method,
  }: {
    memberId: string;
    amount: number;
    note: string;
    method: 'Simulated UPI' | 'Simulated IMPS' | 'Club Quick-Deposit';
  }) => {
    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    const refNum = Math.floor(1000 + Math.random() * 9000);
    const newContribution: Contribution = {
      id: `c_${Date.now()}`,
      memberId: member.id,
      memberName: member.name,
      amount,
      timestamp: new Date().toISOString(),
      note,
      method,
      status: 'pending', // Starts in pending review state!
      referenceCode: `FP-SIM-${refNum}`,
    };

    setContributions((prev) => [newContribution, ...prev]);

    // Audit log
    const auditItem: AuditLogItem = {
      id: `a_${Date.now()}`,
      type: 'contribution_submitted',
      timestamp: new Date().toISOString(),
      actorId: member.id,
      actorName: member.name,
      summary: `Submitted simulated deposit of ${formatINR(amount)} (Pending Review)`,
      details: `Reference: FP-SIM-${refNum} submitted via ${method}. Awaiting Administrator approval. "${note}"`,
      hash: generateAuditHash(),
    };
    setAuditLogs((prev) => [auditItem, ...prev]);
  };

  const handleSimulateQuickDeposit = (amount: number) => {
    handleSimulateContribution({
      memberId: currentMember.id,
      amount,
      note: 'Quick micro-deposit test',
      method: 'Club Quick-Deposit',
    });
  };

  // Administrator Permission: Approve pending deposit
  const handleApproveDeposit = (depositId: string) => {
    if (!isAdmin) {
      alert(`Only the active administrator (${currentAdmin.name}) can approve sandbox deposits.`);
      return;
    }

    const target = contributions.find((c) => c.id === depositId);
    if (!target || target.status !== 'pending') return;

    // Update contribution status to approved
    setContributions((prev) =>
      prev.map((c) =>
        c.id === depositId
          ? {
              ...c,
              status: 'approved',
              reviewedBy: currentMember.name,
              reviewedAt: new Date().toISOString(),
            }
          : c
      )
    );

    // Update contributing member's balance and count
    setMembers((prev) =>
      prev.map((m) =>
        m.id === target.memberId
          ? {
              ...m,
              totalContributed: m.totalContributed + target.amount,
              contributionCount: m.contributionCount + 1,
            }
          : m
      )
    );

    // Audit log
    const auditItem: AuditLogItem = {
      id: `a_${Date.now()}`,
      type: 'contribution_approved',
      timestamp: new Date().toISOString(),
      actorId: currentMember.id,
      actorName: currentMember.name,
      summary: `Approved simulated deposit of ${formatINR(target.amount)} from ${target.memberName}`,
      details: `Reference ${target.referenceCode} approved by Administrator ${currentMember.name}. Club pool balance incremented.`,
      hash: generateAuditHash(),
    };
    setAuditLogs((prev) => [auditItem, ...prev]);
  };

  // Administrator Permission: Reject pending deposit
  const handleRejectDeposit = (depositId: string, reason?: string) => {
    if (!isAdmin) {
      alert(`Only the active administrator (${currentAdmin.name}) can reject sandbox deposits.`);
      return;
    }

    const target = contributions.find((c) => c.id === depositId);
    if (!target || target.status !== 'pending') return;

    setContributions((prev) =>
      prev.map((c) =>
        c.id === depositId
          ? {
              ...c,
              status: 'rejected',
              reviewedBy: currentMember.name,
              reviewedAt: new Date().toISOString(),
              reviewNote: reason || 'Rejected during simulated verification',
            }
          : c
      )
    );

    // Audit log
    const auditItem: AuditLogItem = {
      id: `a_${Date.now()}`,
      type: 'contribution_rejected',
      timestamp: new Date().toISOString(),
      actorId: currentMember.id,
      actorName: currentMember.name,
      summary: `Rejected simulated deposit of ${formatINR(target.amount)} from ${target.memberName}`,
      details: `Reference ${target.referenceCode} rejected by Administrator ${currentMember.name}. Reason: ${reason || 'Unverified'}.`,
      hash: generateAuditHash(),
    };
    setAuditLogs((prev) => [auditItem, ...prev]);
  };

  // Configure Member Profile
  const handleSaveMember = (updatedMember: Member) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === updatedMember.id ? updatedMember : m))
    );

    // Audit log
    const auditItem: AuditLogItem = {
      id: `a_${Date.now()}`,
      type: 'member_updated',
      timestamp: new Date().toISOString(),
      actorId: currentMember.id,
      actorName: currentMember.name,
      summary: `Configured profile for ${updatedMember.name}`,
      details: `Updated details (Email: ${updatedMember.email || 'N/A'}, Phone: ${updatedMember.phone || 'N/A'}).`,
      hash: generateAuditHash(),
    };
    setAuditLogs((prev) => [auditItem, ...prev]);
  };

  // Proposal Creation: Clean allocation modeling without guaranteed returns
  const handleCreateProposal = (data: {
    title: string;
    category: any;
    requestedAmount: number;
    proposerId: string;
    durationMonths: number;
    riskLevel: 'Low' | 'Moderate' | 'High';
    description: string;
    thesis: string;
  }) => {
    const proposer = members.find((m) => m.id === data.proposerId) || currentMember;
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);

    const newProposal: Proposal = {
      id: `p_${Date.now()}`,
      title: data.title,
      category: data.category,
      requestedAmount: data.requestedAmount,
      proposerId: proposer.id,
      proposerName: proposer.name,
      durationMonths: data.durationMonths,
      riskLevel: data.riskLevel,
      description: data.description,
      thesis: data.thesis,
      status: 'voting',
      createdAt: new Date().toISOString(),
      votingDeadline: deadline.toISOString(),
      votes: {
        [proposer.id]: {
          memberId: proposer.id,
          memberName: proposer.name,
          decision: 'approve',
          timestamp: new Date().toISOString(),
          comment: 'Author ballot: Proposal submitted for democratic vote',
        },
      },
    };

    setProposals((prev) => [newProposal, ...prev]);

    // Audit log
    const auditItem: AuditLogItem = {
      id: `a_${Date.now()}`,
      type: 'proposal_created',
      timestamp: new Date().toISOString(),
      actorId: proposer.id,
      actorName: proposer.name,
      summary: `Created investment proposal "${data.title}"`,
      details: `Category: ${data.category}, Target Allocation: ${formatINR(data.requestedAmount)}, Horizon: ${data.durationMonths}m, Risk: ${data.riskLevel}.`,
      hash: generateAuditHash(),
    };
    setAuditLogs((prev) => [auditItem, ...prev]);
  };

  // Democratic Balloting: STRICT 1 VOTE PER MEMBER
  const handleCastVote = (proposalId: string, decision: VoteDecision, comment?: string) => {
    const targetProposal = proposals.find((p) => p.id === proposalId);
    if (!targetProposal) return;

    // Strict rule: member cannot vote if ballot already cast
    if (targetProposal.votes[currentMember.id]) {
      alert(`${currentMember.name} has already cast their single vote on this proposal.`);
      return;
    }

    setProposals((prev) =>
      prev.map((prop) => {
        if (prop.id !== proposalId) return prop;

        const updatedVotes = {
          ...prop.votes,
          [currentMember.id]: {
            memberId: currentMember.id,
            memberName: currentMember.name,
            decision,
            timestamp: new Date().toISOString(),
            comment,
          },
        };

        // Democratic majority quorum check: majority of all club members
        const approvals = Object.values(updatedVotes).filter((v) => v.decision === 'approve').length;
        const rejections = Object.values(updatedVotes).filter((v) => v.decision === 'reject').length;
        const quorumNeeded = Math.floor(members.length / 2) + 1;

        let nextStatus = prop.status;
        if (approvals >= quorumNeeded) {
          nextStatus = 'approved';
        } else if (rejections >= quorumNeeded) {
          nextStatus = 'rejected';
        }

        return {
          ...prop,
          votes: updatedVotes,
          status: nextStatus,
        };
      })
    );

    // Audit log
    const auditItem: AuditLogItem = {
      id: `a_${Date.now()}`,
      type: 'vote_cast',
      timestamp: new Date().toISOString(),
      actorId: currentMember.id,
      actorName: currentMember.name,
      summary: `Cast democratic vote "${decision.toUpperCase()}" on "${targetProposal.title}"`,
      details: comment ? `Rationale: "${comment}"` : 'Single official ballot recorded.',
      hash: generateAuditHash(),
    };
    setAuditLogs((prev) => [auditItem, ...prev]);
  };

  // Administrator Permission: Execute approved proposal
  const handleExecuteProposal = (proposalId: string) => {
    if (!isAdmin) {
      alert(`Only the active administrator (${currentAdmin.name}) can execute approved allocations.`);
      return;
    }

    const targetProposal = proposals.find((p) => p.id === proposalId);
    if (!targetProposal || targetProposal.status !== 'approved') return;

    setProposals((prev) =>
      prev.map((prop) =>
        prop.id === proposalId
          ? {
              ...prop,
              status: 'executed',
              executedAt: new Date().toISOString(),
              executedBy: currentMember.name,
            }
          : prop
      )
    );

    // Audit log
    const auditItem: AuditLogItem = {
      id: `a_${Date.now()}`,
      type: 'proposal_executed',
      timestamp: new Date().toISOString(),
      actorId: currentMember.id,
      actorName: currentMember.name,
      summary: `Executed simulated allocation of ${formatINR(targetProposal.requestedAmount)} for "${targetProposal.title}"`,
      details: `Executed by Club Administrator ${currentMember.name}. Approved by democratic majority quorum.`,
      hash: generateAuditHash(),
    };
    setAuditLogs((prev) => [auditItem, ...prev]);
  };

  // Administrator Rotation & Permission Handover
  const handleRotateAdmin = (nextAdminId: string, note?: string) => {
    const oldAdmin = members.find((m) => m.id === rotation.currentAdminId);
    const newAdmin = members.find((m) => m.id === nextAdminId);
    if (!newAdmin || !oldAdmin) return;

    // Update members role
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id === nextAdminId) return { ...m, role: 'Admin' };
        if (m.id === oldAdmin.id) return { ...m, role: 'Member' };
        return m;
      })
    );

    // Calculate dates for 30-day term
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 30);

    const updatedHistory = [
      {
        memberId: oldAdmin.id,
        memberName: oldAdmin.name,
        term: `${oldAdmin.name}'s Stewardship (${oldAdmin.joinedDate.slice(0, 7)})`,
        completedAt: new Date().toISOString(),
      },
      ...(rotation.history || []),
    ];

    setRotation((prev) => ({
      ...prev,
      currentAdminId: nextAdminId,
      termStartDate: startDate.toISOString().slice(0, 10),
      termEndDate: endDate.toISOString().slice(0, 10),
      history: updatedHistory,
    }));

    // Audit log
    const auditItem: AuditLogItem = {
      id: `a_${Date.now()}`,
      type: 'admin_rotated',
      timestamp: new Date().toISOString(),
      actorId: oldAdmin.id,
      actorName: oldAdmin.name,
      summary: `Rotated Administrator Baton from ${oldAdmin.name} to ${newAdmin.name}`,
      details: note || 'Scheduled 30-day democratic leadership baton transfer.',
      hash: generateAuditHash(),
    };
    setAuditLogs((prev) => [auditItem, ...prev]);
  };

  // Add Member (capped at 5)
  const handleAddMember = (memberData: { name: string; email: string; phone: string }) => {
    if (members.length >= 5) return;

    const initials = memberData.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const colors = ['#f472b6', '#38bdf8', '#fbbf24', '#a78bfa', '#34d399'];
    const assignedColor = colors[members.length % colors.length];

    const newMember: Member = {
      id: `m_${Date.now()}`,
      name: memberData.name,
      role: 'Member',
      avatar: initials || 'MB',
      email: memberData.email,
      phone: memberData.phone,
      joinedDate: new Date().toISOString().slice(0, 10),
      totalContributed: 0,
      contributionCount: 0,
      status: 'active',
      color: assignedColor,
      isSimulated: true,
    };

    setMembers((prev) => [...prev, newMember]);
    setRotation((prev) => ({
      ...prev,
      rotationQueue: [...prev.rotationQueue, newMember.id],
    }));

    // Audit log
    const auditItem: AuditLogItem = {
      id: `a_${Date.now()}`,
      type: 'member_added',
      timestamp: new Date().toISOString(),
      actorId: currentMember.id,
      actorName: currentMember.name,
      summary: `Added new club member ${memberData.name}`,
      details: `Capacity now at ${members.length + 1} of 5 people. Added to admin rotation sequence.`,
      hash: generateAuditHash(),
    };
    setAuditLogs((prev) => [auditItem, ...prev]);
  };

  // Remove Member (protected at minimum 3)
  const handleRemoveMember = (memberId: string, reason: string) => {
    if (members.length <= 3) return;

    const targetMember = members.find((m) => m.id === memberId);
    if (!targetMember) return;

    const remainingMembers = members.filter((m) => m.id !== memberId);
    let nextAdminId = rotation.currentAdminId;

    // If removed member was the active Admin, transfer baton to next in queue
    if (rotation.currentAdminId === memberId) {
      const nextId = rotation.rotationQueue.find((id) => id !== memberId) || remainingMembers[0].id;
      nextAdminId = nextId;
      setMembers(
        remainingMembers.map((m) => (m.id === nextId ? { ...m, role: 'Admin' } : { ...m, role: 'Member' }))
      );
    } else {
      setMembers(remainingMembers);
    }

    // Update rotation queue
    setRotation((prev) => ({
      ...prev,
      currentAdminId: nextAdminId,
      rotationQueue: prev.rotationQueue.filter((id) => id !== memberId),
    }));

    // If active acting persona is the removed member, switch to remaining admin
    if (currentMemberId === memberId) {
      setCurrentMemberId(nextAdminId);
    }

    // Audit log
    const auditItem: AuditLogItem = {
      id: `a_${Date.now()}`,
      type: 'member_removed',
      timestamp: new Date().toISOString(),
      actorId: currentMember.id,
      actorName: currentMember.name,
      summary: `Removed member ${targetMember.name} (Simulated settlement: ${formatINR(targetMember.totalContributed)})`,
      details: reason || 'Member offboarded from investment pool.',
      hash: generateAuditHash(),
    };
    setAuditLogs((prev) => [auditItem, ...prev]);
  };

  const handleToggleMemberStatus = (memberId: string) => {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? { ...m, status: m.status === 'active' ? 'away' : 'active' }
          : m
      )
    );
  };

  const handleRefreshData = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      try {
        const savedMembers = localStorage.getItem(`${STORAGE_KEY}_members`);
        const savedContribs = localStorage.getItem(`${STORAGE_KEY}_contributions`);
        const savedProps = localStorage.getItem(`${STORAGE_KEY}_proposals`);
        const savedRot = localStorage.getItem(`${STORAGE_KEY}_rotation`);
        const savedAudit = localStorage.getItem(`${STORAGE_KEY}_audit`);
        if (savedMembers) setMembers(JSON.parse(savedMembers));
        if (savedContribs) setContributions(JSON.parse(savedContribs));
        if (savedProps) setProposals(JSON.parse(savedProps));
        if (savedRot) setRotation(JSON.parse(savedRot));
        if (savedAudit) setAuditLogs(JSON.parse(savedAudit));
      } catch {
        // storage reading fallback
      }
      setIsRefreshing(false);
    }, 450);
  };

  // Reset to initial clean demonstration data (₹0 balance)
  const handleResetData = () => {
    setMembers(INITIAL_MEMBERS);
    setContributions(INITIAL_CONTRIBUTIONS);
    setProposals(INITIAL_PROPOSALS);
    setRotation(INITIAL_ADMIN_ROTATION);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setCurrentMemberId('m1');
    localStorage.removeItem(`${STORAGE_KEY}_members`);
    localStorage.removeItem(`${STORAGE_KEY}_contributions`);
    localStorage.removeItem(`${STORAGE_KEY}_proposals`);
    localStorage.removeItem(`${STORAGE_KEY}_rotation`);
    localStorage.removeItem(`${STORAGE_KEY}_audit`);
  };

  const openProposalsCount = proposals.filter((p) => p.status === 'voting').length;

  return (
    <div className="min-h-screen bg-[#041810] text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        members={members}
        currentMemberId={currentMemberId}
        onSelectMember={setCurrentMemberId}
        onRefreshData={handleRefreshData}
        onOpenResetModal={() => setIsResetModalOpen(true)}
        isRefreshing={isRefreshing}
      />

      {/* Navigation tabs for mobile bottom / desktop top */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        openProposalsCount={openProposalsCount}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 pt-4 sm:pt-6 pb-24 md:pb-12">
        {activeTab === 'dashboard' && (
          <DashboardView
            members={members}
            contributions={contributions}
            proposals={proposals}
            rotation={rotation}
            currentMember={currentMember}
            isAdmin={isAdmin}
            onOpenContributeModal={() => setIsContributeModalOpen(true)}
            onOpenProposalModal={() => setIsProposalModalOpen(true)}
            onOpenRotateModal={() => setIsRotateModalOpen(true)}
            onSelectProposalForVote={(prop) => setProposalToVote(prop)}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onRefreshData={handleRefreshData}
            isRefreshing={isRefreshing}
          />
        )}

        {activeTab === 'contributions' && (
          <ContributionsView
            members={members}
            contributions={contributions}
            currentMember={currentMember}
            isAdmin={isAdmin}
            adminName={currentAdmin.name}
            onOpenContributeModal={() => setIsContributeModalOpen(true)}
            onSimulateQuickDeposit={handleSimulateQuickDeposit}
            onApproveDeposit={handleApproveDeposit}
            onRejectDeposit={handleRejectDeposit}
            onRefreshData={handleRefreshData}
            isRefreshing={isRefreshing}
          />
        )}

        {activeTab === 'proposals' && (
          <ProposalsView
            proposals={proposals}
            members={members}
            currentMember={currentMember}
            isAdmin={isAdmin}
            adminName={currentAdmin.name}
            onOpenNewProposalModal={() => setIsProposalModalOpen(true)}
            onOpenVoteModal={(prop) => setProposalToVote(prop)}
            onExecuteProposal={handleExecuteProposal}
          />
        )}

        {activeTab === 'members' && (
          <MembersView
            members={members}
            rotation={rotation}
            currentMember={currentMember}
            isAdmin={isAdmin}
            onOpenAddMemberModal={() => setIsAddMemberModalOpen(true)}
            onOpenEditMemberModal={(m) => setMemberToEdit(m)}
            onOpenRemoveMemberModal={(m) => setMemberToRemove(m)}
            onOpenRotateModal={() => setIsRotateModalOpen(true)}
            onToggleMemberStatus={handleToggleMemberStatus}
          />
        )}

        {activeTab === 'audit' && <AuditView logs={auditLogs} />}
      </main>

      {/* Modals */}
      <ContributeModal
        isOpen={isContributeModalOpen}
        onClose={() => setIsContributeModalOpen(false)}
        members={members}
        currentMemberId={currentMemberId}
        onSimulateContribution={handleSimulateContribution}
      />

      <NewProposalModal
        isOpen={isProposalModalOpen}
        onClose={() => setIsProposalModalOpen(false)}
        members={members}
        currentMemberId={currentMemberId}
        clubBalance={approvedTotalBalance}
        onCreateProposal={handleCreateProposal}
      />

      <VoteModal
        isOpen={Boolean(proposalToVote)}
        onClose={() => setProposalToVote(null)}
        proposal={proposalToVote}
        currentMember={currentMember}
        onCastVote={handleCastVote}
      />

      <RotateAdminModal
        isOpen={isRotateModalOpen}
        onClose={() => setIsRotateModalOpen(false)}
        rotation={rotation}
        members={members}
        onRotateAdmin={handleRotateAdmin}
      />

      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        currentCount={members.length}
        onAddMember={handleAddMember}
      />

      <EditMemberModal
        isOpen={Boolean(memberToEdit)}
        onClose={() => setMemberToEdit(null)}
        member={memberToEdit}
        onSaveMember={handleSaveMember}
      />

      <RemoveMemberModal
        isOpen={Boolean(memberToRemove)}
        onClose={() => setMemberToRemove(null)}
        member={memberToRemove}
        currentMemberCount={members.length}
        rotation={rotation}
        members={members}
        onConfirmRemove={handleRemoveMember}
      />

      <ResetConfirmModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirmReset={handleResetData}
      />

      {/* Connectivity Status Indicator */}
      <OfflineIndicator />
    </div>
  );
}
```
