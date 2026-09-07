# LeadTriage n8n Workflows (optional)

These three workflows are an **optional** orchestration layer in front of the
LeadTriage API. The backend works completely standalone without n8n — see
"Demo mode" below. Import them only if you want a visual, editable front door
for lead capture and outbound alerts (e.g. a form builder, a Slack channel,
Typeform, a marketing site's contact form, etc.), backed by n8n's free-tier
webhook nodes.

## Files

- **`lead-intake.json`** — Webhook (receives a raw lead payload from anywhere
  — a form tool, a CRM, curl) → logs in to the LeadTriage API → `POST
  /api/v1/leads` with the payload mapped to the Lead schema
  (`name, email, phone, company, message, source`).
- **`notification.json`** — Webhook (FastAPI calls this after qualifying a
  lead) → forwards a Slack-compatible `{text, lead_id, classification,
  score}` message to your real notification target (Slack incoming webhook,
  Discord, a local mock endpoint, whatever accepts a JSON POST).
- **`follow-up.json`** — Same shape as `notification.json`, but triggered
  separately with the AI's `suggested_follow_up` text, tagged as a follow-up
  rather than a new-lead alert.

All three are plain **webhook-in → HTTP Request-out** flows. No paid nodes,
no community nodes, nothing beyond what ships in a stock n8n install (cloud
free tier or self-hosted).

## How the pieces fit together

```
Any lead source → [lead-intake.json] → POST /api/v1/leads → AI qualification
                                                                    │
                                        FastAPI calls the two webhooks below
                                                                    │
                        ┌───────────────────────────────────────────┤
                        ▼                                           ▼
              [notification.json]                          [follow-up.json]
              (new-lead alert)                              (follow-up draft)
                        │                                           │
                        └──────────────► your Slack/webhook ◄───────┘
```

FastAPI's `NOTIFICATION_WEBHOOK_URL` env var is "the configurable webhook
URL" it posts to after qualifying a lead (see `backend/services/
notifications.py`). Point it at your n8n instance's webhook URL for
`notification.json` / `follow-up.json` (n8n gives each imported workflow its
own webhook URL) if you want n8n in the loop reformatting/relaying messages;
leave it unset and the backend just logs the payload instead (demo mode).

## Importing into n8n

1. Spin up n8n — either [n8n Cloud's free tier](https://n8n.io/cloud/) or
   self-hosted (`docker run -it --rm -p 5678:5678 n8nio/n8n`, or as part of
   your own docker-compose stack — not included here to keep this repo's
   compose file to just API + Postgres).
2. In the n8n editor: **Workflows → Import from File** and pick each of the
   three `.json` files, or via the CLI in a self-hosted instance:
   ```
   n8n import:workflow --input=n8n-workflows/lead-intake.json
   n8n import:workflow --input=n8n-workflows/notification.json
   n8n import:workflow --input=n8n-workflows/follow-up.json
   ```
   (Verified: all three import cleanly with n8n's own CLI.)
3. Open each imported workflow and note its webhook's production URL (the
   **Webhook** node's URL, shown once you activate the workflow).
4. Configure environment variables in your n8n instance (Settings →
   Environments, or your host's env config):
   - `API_BASE_URL` — where LeadTriage's FastAPI backend is reachable, e.g.
     `https://api.leadtriage.example.com` or `http://localhost:8000` for
     local dev.
   - `LEADTRIAGE_ADMIN_USERNAME` / `LEADTRIAGE_ADMIN_PASSWORD` — the plaintext
     admin credentials `lead-intake.json` logs in with to get a bearer token
     before calling `POST /api/v1/leads` (the API only accepts the password
     hash — see `backend/.env.example` — so n8n needs the plaintext value
     separately, same as any other API client would).
   - `SLACK_COMPATIBLE_WEBHOOK_URL` — the real destination `notification.json`
     / `follow-up.json` forward to (a Slack incoming webhook URL, or any
     endpoint that accepts `{"text": "..."}`-shaped JSON).
5. On the LeadTriage backend side, set `NOTIFICATION_WEBHOOK_URL` to the
   webhook URL n8n gave you in step 3 for `notification.json` (FastAPI fires
   both the new-lead and follow-up webhooks at the same configured URL —
   n8n's own webhook path, e.g. `/webhook/leadtriage-notification`, is what
   distinguishes them if you point separate env vars at each; the simplest
   setup runs both notification flows off one shared downstream target).
6. Activate the workflows (top-right toggle in the n8n editor).

## Demo mode (no n8n required)

Nothing above is required to run or demo LeadTriage. `POST /api/v1/leads`
works standalone — call it directly (curl, Postman, your own frontend) and
qualification/notification still happen exactly the same way, just without
n8n as a front door. These workflows exist purely as an optional automation
layer for teams that want a low-code webhook fan-out instead of wiring their
lead sources directly into the API.
