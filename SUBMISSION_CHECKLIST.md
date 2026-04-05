# Fin-Guard — Submission Checklist

> Deadline: **April 6, 2026 5:00 PM PT**

## Required Submissions

- [ ] **Text description** — features and functionality (500+ words, fill ALL Devpost fields)
- [ ] **Demo video** — ~3 minutes, uploaded to YouTube (public)
  - [ ] Shows project functioning on the device it was built for
  - [ ] No third-party trademarks or copyrighted music
  - [ ] Demo arc: Problem → Insight → Solution → Impact
- [ ] **Public code repo** — github.com/xenosaac/Fin-Guard
  - [ ] Contains all source code, assets, and instructions
  - [ ] README with setup instructions
- [ ] **Published link** — deployed app URL (Vercel + Railway)
- [ ] **Uses Token Vault** from Auth0 for AI Agents (MANDATORY)

## Bonus Submissions (extra $250 x 6 winners)

- [ ] **Blog post** — 250+ words in the text description
  - [ ] Covers Token Vault related achievement
  - [ ] Materially different from the main text description
  - [ ] Has a header or callout so judges see it
  - [ ] Judged on: quality, relevance to Auth0 community, completeness

## Judging Criteria (equally weighted)

| Criterion | How Fin-Guard Addresses It |
|-----------|---------------------------|
| **Security Model** | Read-only zero-trust — agent can observe but NEVER modify financial data. Permission boundaries enforced at every level. |
| **User Control** | Per-service connect/disconnect via Token Vault. User sets spending thresholds. Full audit trail visible. |
| **Technical Execution** | FastAPI + LangGraph + Auth0 SDK. Clean code, proper error handling, deployed and functional. |
| **Design** | Dark-mode fintech dashboard. Clean information hierarchy. Security model VISIBLE in UI. |
| **Potential Impact** | "Read-only agent" pattern applies to healthcare, legal, HR — any domain where AI needs to observe but not act. |
| **Insight Value** | Most AI agent demos show agents that DO things. Fin-Guard shows that WATCHING agents are powerful AND safer. Token Vault makes the permission boundary the feature. |

## Hackathon Context to Address

The hackathon description mentions:
- "Sovereign AI that runs locally" → Fin-Guard's agent logic could run locally
- "Restricted mode" → Our read-only mode IS restricted mode
- "Intermediary agent" → Fin-Guard is the intermediary between user and financial APIs
- "Consent delegation" → Token Vault handles OAuth consent per-service
- "Async auth / step-up auth" → Can mention Auth0 handles this for Token Vault connections
- "Keeps users in control" → Per-service revocation, audit trail, spending thresholds

## AlphaHack Winning Signals to Hit

- [ ] Demo video (IC=+0.102)
- [ ] 3+ screenshots/images (IC=+0.123)
- [ ] Public GitHub repo (IC=+0.081)
- [ ] Description 500+ words with tech depth keywords (IC=+0.163)
- [ ] Links to deployed app (IC=+0.082)
- [ ] 4-5 tech tags (IC sweet spot)
- [ ] Include quantitative metrics in description (IC=+0.067)
- [ ] Name target user in description (IC=+0.078)
- [ ] Fill EVERY Devpost field (IC=+0.122)
- [ ] Structure description with headings/sections (IC=+0.155)
