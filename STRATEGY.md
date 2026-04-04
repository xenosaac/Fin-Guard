# Fin-Guard — Auth0 Hackathon Strategy ("Authorized to Act")

> Deadline: **April 6, 2026, 5:00 PM PT** (< 48 hours)
> Prize pool: **$10,000** ($5K / $2K / $1K + blog prizes)
> Participants: **2,728** registered
> Format: **Online**, solo allowed

---

## 1. Hackathon Intel

### What They Want
Build an **agentic AI application** using **Auth0 Token Vault**. The core idea: AI agents that can authenticate, authorize, and interact with third-party APIs on behalf of users — securely.

### Mandatory Requirement
- Must use **Token Vault** from Auth0 for AI Agents
- Token Vault handles OAuth flows with 30+ pre-integrated services (Google, Slack, GitHub, Salesforce, etc.)

### Submission Requirements
1. Text description explaining features and functionality
2. **Demo video** (< 3 minutes, YouTube/Vimeo)
3. **Public code repo** URL
4. Published link / deployed app (or explanation)
5. Optional: Blog post (~250 words) for $250 bonus prize (6 winners)

### Judging Criteria (equally weighted, 6 dimensions)
| Criterion | What They're Looking For |
|-----------|-------------------------|
| **Security Model** | Permission boundaries, credential protection, access scoping |
| **User Control** | Permission transparency, consent clarity |
| **Technical Execution** | Code quality, production readiness |
| **Design** | UX quality, frontend-backend balance |
| **Potential Impact** | Community reach, broader implications |
| **Insight Value** | Surface useful patterns, identify gaps |

### Key Rules
- New project or **significantly updated** after submission period start
- Open source allowed if properly licensed
- Retain IP ownership; sponsor gets non-exclusive promo license
- No country restrictions except sanctioned regions

---

## 2. AlphaHack Model Analysis

### Genre Classification
```
tiny corporate ai_productivity (theme_heavy, neutral)
```
- **Prize axis**: theme_heavy (single sponsor, no multi-sponsor prize splitting)
- **Size axis**: tiny (but 2,728 participants is misleading — actual submissions will be much fewer)
- **Theme axis**: ai_productivity (direct match to Isaac's strength)
- **Host axis**: corporate (Okta/Auth0 — clear judging criteria)
- **Solo axis**: neutral

### Archetype Prediction (Model 1)
| Rank | Archetype | Confidence |
|------|-----------|------------|
| 1 | **hype_surfer** | 74.9% |
| 2 | tech_showoff | 14.0% |
| 3 | scrappy_utility | 9.9% |

### Genre Multiplier: 1.31x (favorable)

### Game Selection: STRONG GO (EV = $2,293)

### Model Recommendation
- **Primary play: hype_surfer** — ride the AI agent wave, show something that feels futuristic
- **Secondary play: tech_showoff** — the security/auth domain rewards technical depth
- Given the 6 judging criteria, the winning formula is: **impressive AI agent + bulletproof security model + clean UX**

---

## 3. Strategic Analysis

### What the Judges Actually Care About

The 6 criteria reveal what Auth0/Okta values:

1. **Security Model (most differentiating)** — This is their product domain. Most hackathon submissions will have weak security. A project that demonstrates proper permission scoping, least-privilege access, and credential isolation will stand out immediately.

2. **User Control** — Auth0's brand is about giving users control over their identity. Show explicit consent flows, granular permission management, and the ability to revoke agent access.

3. **Insight Value** — This is unusual for a hackathon. They want projects that **teach them something** about how their product is used. Build something that surfaces a non-obvious use case for Token Vault.

### Competitive Landscape (2,728 registrants)

Expected submission pattern:
- ~70% will build a basic chatbot that calls one API (Gmail, Calendar)
- ~20% will build a multi-service integration (reads email + schedules meetings)
- ~8% will build something creative with a good demo
- ~2% will nail all 6 criteria

**Our target: the 2%.** Differentiate on Security Model + Insight Value — the two dimensions most participants will ignore.

### What Wins This Hackathon

The winning project needs to:
1. Use Token Vault in a **non-trivial** way (not just "read my email")
2. Show **multi-service orchestration** (agent talks to 2-3 APIs)
3. Demonstrate **security-first thinking** (permission boundaries, audit trail)
4. Have a **clean, working demo** (video is mandatory, 3 min)
5. Surface an **insight** about agentic identity that teaches Auth0 something new

---

## 4. Idea Candidates

### Idea A: AI Fin-Guard (RECOMMENDED)

**Concept**: An AI agent that monitors your financial accounts across multiple services (bank API, Google Sheets budgets, Slack notifications) and proactively alerts you to unusual spending patterns — but with a **zero-trust security model** where the agent can only READ financial data, never WRITE.

**Why this wins**:
- **Security Model**: Demonstrates read-only permission scoping — the agent can see but never move money. This is the exact security pattern Auth0 wants to showcase.
- **User Control**: User sets spending thresholds, approves what the agent can see, can revoke access per-service instantly.
- **Insight Value**: Surfaces the pattern of "read-only agents" — most AI agent discourse assumes agents need write access. Showing that read-only agents are valuable and safer is a genuine insight for Auth0.
- **Multi-service**: Token Vault connects to 3+ services (financial API, Google Sheets, Slack/email notifications).
- **Demo-friendly**: "Watch the agent detect an unusual charge and alert me on Slack" is a compelling 3-minute story.

**Tech Stack**: Python (FastAPI) + LangGraph + Auth0 SDK + Plaid/mock financial API + Google Sheets API + Slack API

**Demo Arc**: Problem (agents with financial access are scary) -> Insight (read-only agents are powerful AND safe) -> Solution (financial guardian with zero-trust) -> Impact (this pattern applies to healthcare, legal, HR)

---

### Idea B: Multi-Persona Agent Workspace

**Concept**: A workspace where one user has multiple AI agents, each with different permission levels and service access — like a "team" of AI assistants where each has a specific role and can only access what they need.

**Why this works**:
- **Security Model**: Each agent persona has isolated Token Vault credentials — the "research agent" can read Google Drive but not Slack, the "comms agent" can send Slack but not read Drive.
- **Insight Value**: Shows Token Vault used for **agent-to-agent permission isolation**, not just user-to-service.

**Tech Stack**: Next.js + Auth0 SDK + LangGraph multi-agent + Token Vault per-agent scoping

---

### Idea C: Consent-Aware Meeting Prep Agent

**Concept**: An agent that prepares you for meetings by pulling context from Google Calendar, relevant Slack threads, Google Drive docs, and email — but with explicit **consent checkpoints** before accessing each service.

**Why this works**:
- **User Control**: Shows step-by-step consent, not blanket "grant all permissions"
- **Practical**: Everyone has meetings, everyone understands the pain

---

## 5. Recommended Pick: Idea A — Fin-Guard

### Why Idea A Over Others

| Criterion | Idea A | Idea B | Idea C |
|-----------|--------|--------|--------|
| Security Model | Read-only zero-trust (novel) | Agent isolation (good) | Standard OAuth (weak) |
| User Control | Per-service granular | Per-persona | Consent checkpoints |
| Insight Value | "Read-only agents" pattern (high) | Agent permission isolation (medium) | Standard consent (low) |
| Demo Impact | "Caught a suspicious charge" (visceral) | Multi-agent dashboard (complex) | Meeting prep (boring) |
| Feasibility (48h solo) | High — 3 APIs + UI | Medium — complex state | High — but low ceiling |
| Wow Factor | High — financial + security | Medium | Low |

---

## 6. Implementation Plan (48 hours)

### Hour 0-4: Setup & Auth0 Config
- [ ] Create Auth0 tenant + configure Token Vault
- [ ] Set up Connected Accounts for: Google Sheets, Slack, mock financial API
- [ ] Configure permission scopes (read-only for financial, write for Slack notifications)
- [ ] Bootstrap FastAPI backend + Next.js/React frontend

### Hour 4-12: Core Agent Logic
- [ ] Build LangGraph agent with tool-calling for each connected service
- [ ] Implement read-only permission enforcement (agent CAN'T write to financial services)
- [ ] Build spending pattern detection logic (anomaly detection on transaction data)
- [ ] Integrate Slack notification tool (agent sends alerts via Token Vault)

### Hour 12-20: Security & User Control
- [ ] Build permission dashboard — user sees exactly what each service can do
- [ ] Implement per-service revocation (user can disconnect Google Sheets without losing Slack)
- [ ] Add audit trail — every API call the agent makes is logged with timestamp + scope
- [ ] Implement spending threshold configuration (user sets what counts as "unusual")

### Hour 20-28: UI/UX Polish
- [ ] Build clean dashboard showing: connected accounts, recent agent actions, alerts
- [ ] Show permission boundaries visually (green = read, red = blocked write attempts)
- [ ] Add real-time notification feed
- [ ] Make it mobile-responsive (judges will check on phones)

### Hour 28-36: Demo & Content
- [ ] Record 3-minute demo video
  - 0:00-0:30: Problem — "AI agents with financial access are terrifying"
  - 0:30-1:30: Solution — show the guardian detecting anomaly + Slack alert
  - 1:30-2:15: Security — show permission dashboard, audit trail, revocation
  - 2:15-3:00: Insight — "read-only agents are powerful AND safe"
- [ ] Write blog post (250 words) for $250 bonus prize
- [ ] Deploy to Vercel/Railway
- [ ] Push code to public GitHub repo

### Hour 36-48: Submit & Polish
- [ ] Write Devpost description (all sections filled — this is IC=+0.122)
- [ ] Add 3+ screenshots to submission
- [ ] Final test of deployed app
- [ ] Submit before 5:00 PM PT April 6

---

## 7. Tech Stack

| Layer | Tech | Why |
|-------|------|-----|
| Backend | **FastAPI** (Python) | Fast to build, Auth0 Python SDK support |
| AI Agent | **LangGraph** | Tool-calling agent framework, Auth0 has official examples |
| Auth | **Auth0 for AI Agents** + **Token Vault** | Required |
| Frontend | **Next.js** or **React + Tailwind** | Clean UI for permission dashboard |
| Financial API | **Plaid** (or mock data) | Realistic transactions |
| Notifications | **Slack API** via Token Vault | Demonstrates multi-service orchestration |
| Data | **Google Sheets API** via Token Vault | User's budget spreadsheet |
| Deploy | **Vercel** (frontend) + **Railway** (backend) | Fast deploy, free tier |

---

## 8. Winning Checklist (from AlphaHack EX_ANTE model)

Based on IC-validated signals from 100K+ hackathon submissions:

- [ ] Demo video (mandatory, IC=+0.102)
- [ ] 3+ screenshots/images (IC=+0.123)
- [ ] Public GitHub repo (IC=+0.081)
- [ ] Description 500+ words with tech depth keywords (IC=+0.163)
- [ ] Links to deployed app (IC=+0.082)
- [ ] 4-5 tech tags (sweet spot: 22-23% win rate vs 14.6% at 1 tag)
- [ ] Mention theme keywords in description (IC=+0.075)
- [ ] Include quantitative metrics (IC=+0.067)
- [ ] Name target user in description (IC=+0.078)
- [ ] Fill EVERY Devpost field (IC=+0.122 — #2 most important signal)
- [ ] Structure description with headings/sections (IC=+0.155)
- [ ] Blog post for $250 bonus (6 winners = high probability)

---

## 9. Key Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Plaid setup too slow | Use mock financial data; still demonstrates the pattern |
| Auth0 Token Vault config issues | Start with their official assistant0 sample repo as base |
| Demo video quality | Script it first, record in one take, edit with ScreenFlow |
| Time pressure (48h) | Cut scope ruthlessly — 1 polished feature > 3 half-done |
| Too many similar chatbot submissions | Our differentiation is security-first + read-only insight |

---

## 10. Blog Post Draft (for $250 bonus)

> **Building a Read-Only Fin-Guard with Auth0 Token Vault**
>
> Most AI agent demos show agents that DO things — send emails, book meetings, move files. But what about agents that WATCH things? Our Fin-Guard uses Auth0 Token Vault to connect to financial services with strictly read-only permissions. The agent monitors spending patterns across connected accounts, detects anomalies, and alerts the user via Slack — but it can never move money or modify data.
>
> The key insight: Token Vault's per-connection scoping makes this zero-trust pattern trivial to implement. Each connected service gets its own OAuth scope, and the agent's tools enforce read-only at the code level. The audit trail shows every API call with its permission scope, giving users complete visibility.
>
> This "read-only agent" pattern is broadly applicable beyond finance — healthcare agents that read patient records but can't modify them, legal agents that analyze documents but can't file them, HR agents that screen resumes but can't make hiring decisions. Token Vault makes the permission boundary the feature, not the limitation.
