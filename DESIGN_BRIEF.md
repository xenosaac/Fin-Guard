# Fin-Guard UI Design Brief (for Gemini Stitch)

## Product Context
Fin-Guard is a read-only AI financial guardian. It monitors your bank transactions, budget spreadsheets, and spending patterns — then alerts you via Slack when something looks off. The critical differentiator: **the agent can NEVER modify your financial data**. This zero-trust security model is the core product story.

Built for the Auth0 "Authorized to Act" hackathon. Judging criteria includes "Design" as 1/6 of the score.

## Design Direction
- **Dark mode** (finance/security products feel more premium in dark)
- **Clean, trust-inspiring** — think Linear meets a fintech dashboard
- **Green = safe/read-only, Red = blocked/alert, Amber = warning**
- **Monospace for data, sans-serif for UI** — feels technical but not raw
- **Generous whitespace** — judges scan in 30 seconds, density is the enemy

## Pages Needed

### 1. Main Dashboard (single page app)
The only page. Three-column layout on desktop, stacked on mobile.

**Left Panel — Service Connections**
- Card for each connected service (Financial API, Google Sheets, Slack)
- Each shows: service icon, name, permission badge ("READ-ONLY" in green), connected status
- Connect/Disconnect buttons per service
- When connected: green dot + "READ-ONLY" badge
- When disconnected: gray + "Connect via Token Vault" button
- Visual emphasis on the fact that ALL connections are read-only

**Center Panel — Agent Activity & Alerts**
- Big "Run Analysis" CTA button at top
- Analysis summary card when analysis completes (transactions scanned, anomalies found)
- Alert feed below — cards sorted by severity
  - High severity: red border/accent, amount prominently displayed
  - Medium: amber
  - Low: subtle gray
- Each alert shows: title, description, amount, merchant, timestamp, notification channels (slack badge, in-app badge)

**Right Panel — Audit Trail**
- Scrollable list of every API call the agent made
- Each entry: timestamp, service name, action, permission level, success/blocked
- Successful reads: green checkmark + "read" badge
- Blocked writes: RED X + "BLOCKED" badge + reason text — this is the demo money shot
- Should look like a security log / terminal output

**Header**
- Fin-Guard logo/name (shield icon + "Fin-Guard")
- "ZERO-TRUST MODE" badge (always visible, green)
- User avatar (if logged in) or "Demo Mode" label

**Footer**
- One-line security model statement: "Fin-Guard operates in permanent read-only mode. Financial data can be observed but never modified."

### 2. Key Interactions
- Clicking "Connect" triggers Auth0 Token Vault OAuth flow (or simulates it in demo)
- Clicking "Run Analysis" shows a brief loading state, then populates alerts + audit trail
- Clicking "Try Write (Blocked)" adds a red BLOCKED entry to the audit trail — this demonstrates the security model
- Clicking "Revoke" on a connection immediately disconnects it

### 3. Data to Display

**Mock Service Connections:**
- Financial Account (Plaid) — READ-ONLY — transactions:read, accounts:read
- Google Sheets — READ-ONLY — spreadsheets.readonly
- Slack — SEND ALERTS — chat:write (the only "write" is sending notifications TO the user)

**Mock Alerts (after analysis):**
- "Unusual transaction: $847.32 at Unknown Overseas Merchant" — HIGH
- "Unusually large crypto purchase: $2,500.00 at CryptoExchange Ltd" — HIGH
- "Over budget in shopping: $1,847.31 spent vs $400.00 budget (462%)" — MEDIUM
- "High-value purchase: $1,299.99 at Luxury Store Paris" — MEDIUM

**Mock Audit Trail (after analysis):**
- ✓ financial_api.read_transactions — READ — "Read 120 transactions (last 30 days)"
- ✓ google_sheets.read_budget — READ — "Read monthly budget spreadsheet"
- ✓ slack.send_alert — READ — "Sent alert 'Unusual transaction: $847.32' to Slack"
- ✗ financial_api.write_transaction — BLOCKED — "Write access permanently disabled"

## Color Palette
- Background: #0a0a0f (near-black)
- Card background: #111118
- Border: #1e1e2e
- Primary accent (safe/connected): #34d399 (emerald-400)
- Warning: #fbbf24 (amber-400)
- Danger/blocked: #f87171 (red-400)
- Text primary: #f1f5f9
- Text secondary: #94a3b8
- Text muted: #64748b

## Typography
- Headlines: Inter or system sans-serif, semibold
- Body: Inter or system sans-serif, regular
- Data/code: JetBrains Mono or system monospace
- Sizes: compact but readable. Dashboard data should be information-dense without feeling cramped.

## Component Style
- Rounded corners (8px cards, 6px buttons, 4px badges)
- Subtle borders (1px, low contrast)
- No drop shadows — use borders and background color shifts instead
- Badges: small pill shapes with tinted backgrounds (like GitHub labels)
- Buttons: solid fill for primary actions, outline for secondary/destructive

## Responsive
- 3-column on desktop (>1024px)
- 2-column on tablet
- Stacked on mobile
- The demo video will be recorded on desktop, but judges may check on mobile

## What Makes This UI Win the "Design" Criterion
1. The security model is VISIBLE — not hidden in docs. Green read-only badges, red blocked entries, audit trail front-and-center
2. Information hierarchy is clear — alerts are prominent, audit trail supports the security story
3. It looks like a real fintech product, not a hackathon toy
4. The "Try Write (Blocked)" interaction is a one-click demo of the core security concept
