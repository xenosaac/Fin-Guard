# Fin-Guard

**Your read-only AI financial guardian** — powered by Auth0 Token Vault.

Fin-Guard is an AI agent that monitors your financial accounts across multiple services and proactively alerts you to unusual spending patterns. The key insight: **the agent can observe but never modify your financial data**. This zero-trust, read-only security model makes AI financial monitoring safe by design.

## How It Works

1. **Connect services** via Auth0 Token Vault (financial API, Google Sheets budget, Slack)
2. **Fin-Guard reads** your transactions and budget — with audited, read-only access
3. **Anomaly detection** flags unusual charges, over-budget categories, and suspicious merchants
4. **Alerts sent** to Slack and in-app — the only "action" the agent takes
5. **Full audit trail** — every API call logged with permission level and timestamp

## Security Model

- **READ-ONLY**: The agent can never create, modify, or delete financial data
- **Per-service permissions**: Each connected service has isolated OAuth tokens via Token Vault
- **Granular revocation**: Disconnect any service without affecting others
- **Full audit trail**: Every data access is logged with timestamp, service, and permission used
- **Blocked writes logged**: Attempted write operations are rejected and appear in the audit trail

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI (Python) |
| AI Agent | LangGraph + OpenAI |
| Auth | Auth0 for AI Agents + Token Vault |
| Frontend | Next.js + React + Tailwind CSS |
| Notifications | Slack API via Token Vault |
| Budget Data | Google Sheets API via Token Vault |

## Quick Start

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # Fill in your Auth0 + OpenAI credentials
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

## Auth0 Token Vault Integration

Fin-Guard uses Token Vault for:
- **Financial API**: Read-only transaction access
- **Google Sheets**: Read-only budget spreadsheet access  
- **Slack**: Send alert notifications

Each connection goes through Auth0's Connected Accounts OAuth flow. The user explicitly grants read-only permissions, and Token Vault securely stores and refreshes tokens.

## The "Read-Only Agent" Pattern

Most AI agent demos show agents that DO things — send emails, book meetings, move files. Fin-Guard demonstrates that agents that WATCH things are equally powerful and dramatically safer.

This pattern applies beyond finance:
- Healthcare agents that read patient records but can't modify them
- Legal agents that analyze documents but can't file them  
- HR agents that screen resumes but can't make hiring decisions

**Token Vault makes the permission boundary the feature, not the limitation.**

## Built for

[Authorized to Act: Auth0 for AI Agents Hackathon](https://authorizedtoact.devpost.com/)
