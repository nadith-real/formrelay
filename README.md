# FormRelay

Open-source, self-hosted form backend inspired by Formspree.

Deploy your own instance, log into a private dashboard, create projects and forms, collect HTML or JavaScript submissions, inspect analytics, and send Telegram or SMTP notifications.

This is not a commercial SaaS product. There is no public registration, billing, or multi-tenant account system. A single administrator account is configured with environment variables.

## Features

- Private administrator login with HTTP-only sessions, CSRF protection, and login rate limiting
- Multiple projects, each with multiple forms and unique public endpoints
- HTML `POST` and JSON `fetch()` submissions
- Submission inbox with search, filters, spam/read status, bulk delete, and CSV export
- Project analytics from real database records (activity, devices, browsers, geography when available)
- Project-specific Telegram and SMTP integrations with encrypted credentials
- Honeypot, origin checks, request size limits, and per-form rate limiting
- SQLite by default, with libSQL/Turso-compatible URLs for serverless storage
- Node.js, Docker, Vercel, and Netlify deployment adapters sharing the same processor

## Screenshots

Add screenshots of the Overview, Submissions, and Settings pages here after deployment.

## Requirements

- Node.js 20 or later
- npm
- Optional: Docker, a PostgreSQL/libSQL server, or a Turso database for production

## Local development

```bash
# Install dependencies
npm install

# Copy environment template and edit values
cp .env.example .env

# Start API (port 3001) and Vite dashboard (port 5173)
npm run dev
```

Open `http://localhost:5173` and sign in with `APP_USERNAME` / `APP_PASSWORD`.

The Vite dev server proxies `/api` and `/f` to the API.

## Environment setup

See `.env.example`. Required variables:

| Variable | Purpose |
| --- | --- |
| `APP_USERNAME` | Administrator username |
| `APP_PASSWORD` | Administrator password (min 8 characters) |
| `APP_SECRET` | Session signing secret (min 32 characters) |
| `APP_URL` | Public base URL used in endpoint examples |
| `ENCRYPTION_KEY` | Used to encrypt Telegram/SMTP credentials |
| `DATABASE_URL` | SQLite file (`file:./data/formrelay.db`) or libSQL URL |
| `PORT` | API port (default `3001`) |

Never commit real secrets. Never expose these values to the browser.

## Database setup and migrations

SQLite is created automatically on first boot under `./data/`. Schema bootstrap runs at startup.

For Turso or a remote libSQL database:

```bash
DATABASE_URL=libsql://your-db.turso.io
```

Do not use a local SQLite file on Vercel or Netlify. Those platforms have ephemeral filesystems.

## HTML form integration

```html
<form action="https://your-domain.com/f/your-slug" method="POST">
  <input type="text" name="name" placeholder="Name" required>
  <input type="email" name="email" placeholder="Email" required>
  <textarea name="message" placeholder="Message"></textarea>
  <input type="text" name="_gotcha" style="display:none" tabindex="-1" autocomplete="off">
  <button type="submit">Send</button>
</form>
```

No backend is required on the client website.

## JavaScript integration

```js
const response = await fetch("https://your-domain.com/f/your-slug", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "John",
    email: "john@example.com",
    message: "Hello!"
  })
});
const result = await response.json();
```

CORS is configured from each form's allowed origins. An empty origin list allows any origin.

## Telegram integration setup

1. Create a bot with [@BotFather](https://t.me/BotFather) and copy the bot token.
2. Get a chat ID (message the bot, or use a group ID).
3. In project Settings, paste the token and chat ID, enable the integration, and use **Test connection**.

Tokens are encrypted at rest with `ENCRYPTION_KEY`. The dashboard only shows masked tokens.

## SMTP setup

In project Settings, enter host, port, username, password, security mode, sender, and recipients. Use **Send test email** before enabling notifications.

SMTP passwords are stored encrypted and never returned in full.

## Node.js / VPS deployment

```bash
npm install
cp .env.example .env
# edit .env — set APP_URL to your public HTTPS origin
npm run build
NODE_ENV=production npm start
```

Put a reverse proxy (Caddy, nginx, or Traefik) in front and terminate TLS there. Persist the `data/` directory.

## Docker deployment

```bash
cp .env.example .env
docker compose up --build -d
```

The compose file mounts a volume for SQLite. Set `APP_URL` to the public URL.

## Vercel deployment

1. Use a remote libSQL/Turso `DATABASE_URL`. Do not use a local file.
2. Set all environment variables in the Vercel project settings.
3. Deploy. `vercel.json` rewrites `/api` and `/f` to the serverless entry in `api/index.ts`.

## Netlify deployment

1. Use a remote libSQL/Turso `DATABASE_URL`.
2. Set environment variables in the Netlify UI.
3. `netlify.toml` routes `/api/*` and `/f/*` to `netlify/functions/api.ts`.

All adapters call the same `processSubmission` pipeline.

## Security notes

- There is no public signup. Protect `APP_PASSWORD` and `APP_SECRET`.
- Dashboard APIs require a session cookie and CSRF token.
- Public form endpoints are unauthenticated by design. Use origin allowlists, honeypots, rate limits, and validation.
- CORS and Origin checks are not authentication.
- Submitted HTML is escaped in the dashboard and in Telegram/email messages.
- Notification failures do not discard a stored submission.
- For multi-instance or serverless rate limiting, replace the in-memory limiter with a shared store.

## Troubleshooting

**Invalid environment configuration**  
Check `.env` against `.env.example`. `APP_SECRET` must be at least 32 characters.

**Login loops or 401s**  
Confirm cookies are not blocked, `APP_URL` matches the browser origin, and you are not mixing HTTP/HTTPS.

**Form not found**  
The slug must match a form in Settings. Disabled forms return 403.

**Telegram/SMTP test fails**  
The error from the provider is stored on the submission's notification log. Tokens and passwords are never returned to the client.

**Analytics look empty**  
Charts use real submissions only. Submit through `/f/{slug}` first.

**Serverless data loss**  
Local SQLite will reset on Vercel/Netlify. Use Turso/libSQL.

## License

MIT
