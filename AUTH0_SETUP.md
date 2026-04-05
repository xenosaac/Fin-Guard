# Auth0 Setup Guide for Fin-Guard

## 1. Create Free Auth0 Account

Go to https://auth0.com and sign up (free tier works).

## 2. Create Application

1. Dashboard → Applications → Applications → **Create Application**
2. Name: `Fin-Guard`
3. Type: **Regular Web Application**
4. Note your **Client ID** and **Client Secret**

## 3. Configure Application Settings

In your app settings:
- **Allowed Callback URLs**: `http://localhost:8000/callback`
- **Allowed Logout URLs**: `http://localhost:3000`
- **Allowed Web Origins**: `http://localhost:3000`

## 4. Enable Token Vault Grant Type

1. Go to your app → **Advanced Settings** → **Grant Types**
2. Enable:
   - `authorization_code`
   - `refresh_token`
   - `urn:auth0:params:oauth:grant-type:token-exchange:federated-connection-access-token` (Token Vault)
3. **Save Changes**

## 5. Configure Connected Accounts (Token Vault Connections)

### Google (for Google Sheets budget access)

1. Dashboard → Authentication → Social → **Google**
2. Enter your Google OAuth Client ID + Secret
   - Get from: https://console.cloud.google.com/apis/credentials
   - Enable Google Sheets API in your GCP project
3. Scopes: `openid profile email https://www.googleapis.com/auth/spreadsheets.readonly`
4. In **Purpose** section: toggle **"Use for Connected Accounts for Token Vault"**
5. Go to **Applications** tab → enable for `Fin-Guard`

### Slack (for alert notifications)

1. Dashboard → Authentication → Social → **Create Connection** → Slack
2. Enter Slack App Client ID + Secret
   - Get from: https://api.slack.com/apps → Create New App
   - Add OAuth scopes: `chat:write`, `channels:read`
3. In **Purpose** section: toggle **"Use for Connected Accounts for Token Vault"**
4. Enable for `Fin-Guard` app

### Financial API (mock — no real Plaid needed)

For the hackathon demo, financial data is mocked. In production you'd add a Plaid connection here.

## 6. Important: MFA Setting

Token Vault requires MFA policy set to **Never** (not Always) to retrieve access tokens.
- Dashboard → Security → Multi-factor Auth → set policy to **Never**

## 7. Create Backend API Resource Server

1. Dashboard → Applications → APIs → **Create API**
2. Name: `Fin-Guard API`
3. Identifier: `https://fin-guard-api.example.com`
4. Signing Algorithm: RS256

## 8. Fill in .env

```bash
cp backend/.env.example backend/.env
```

Fill in:
```
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_AUDIENCE=https://fin-guard-api.example.com
```

## 9. Test

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Visit http://localhost:8000/docs to see the API.
Visit http://localhost:8000/login to test Auth0 login flow.
