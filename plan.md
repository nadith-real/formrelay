# Build FormRelay — Open-Source, Self-Hosted Form Backend

## 1. Project Overview

Build **FormRelay**, a lightweight, open-source, self-hosted form handling platform inspired by Formspree.

FormRelay allows website owners and developers to receive HTML and JavaScript form submissions without building their own backend.

Users deploy their own FormRelay instance, log into a private administration dashboard, create projects, configure forms, manage submissions, view analytics, and configure notification integrations.

The application must be suitable for deployment on:
- Vercel
- Netlify
- Any Node.js-compatible VPS or server
- Other compatible serverless environments where practical

This is NOT a commercial SaaS platform.

Do not implement:
- Subscription plans
- Billing
- Payment gateways
- Public registration
- Multi-tenant SaaS infrastructure
- Subscription-based usage limits

It is a self-hosted tool with a single administrator account.

## 2. Design and UI Requirements

Create a clean, simple, professional administration dashboard.

### Visual direction

- Background: White (#FFFFFF).
- Primary text: Near-black (#171717).
- Secondary text: Neutral grey.
- Borders: Light grey (#EAEAEA).
- Accent colour: Subtle blue (#2563EB).
- Font: Montserrat throughout the application.
- Rounded corners: Subtle, approximately 8–12px.
- Shadows: Minimal.
- Layout: Clean, spacious and responsive.

Avoid:
- Excessive gradients.
- Glassmorphism.
- Excessive animations.
- Overly colourful charts.
- Giant decorative illustrations.
- Unnecessary UI elements.
- Complicated navigation.

Use Lucide icons.

The dashboard should feel like a lightweight developer tool, not an enterprise CRM.

### Main application layout

Desktop:
- Fixed left sidebar.
- Main content area.
- Responsive mobile navigation.

Sidebar:

1. FormRelay logo/name.
2. Projects section.
3. Add Project button.
4. List of existing projects.
5. Selected project navigation:
   - Overview
   - Submissions
   - Settings
6. Administrator profile and logout at the bottom.

The selected project determines the content of Overview, Submissions and Settings.

If no projects exist, show a useful empty state with a Create Project action.

## 3. Authentication and Initial Configuration

The application must have a private administrator login.

Credentials are configured through environment variables.

Example `.env`:

APP_USERNAME=admin
APP_PASSWORD=your-secure-password
APP_SECRET=your-long-random-secret
APP_URL=https://your-domain.com
ENCRYPTION_KEY=your-encryption-key

Requirements:

- No public registration.
- No user management system.
- Secure login.
- Password verification using a secure password hashing approach.
- HTTP-only secure session cookies.
- CSRF protection where applicable.
- Login rate limiting.
- Session expiration.
- Logout functionality.
- Protect every dashboard and management API route.

Never expose environment secrets to the frontend.

Do not use hardcoded production credentials.

Provide `.env.example` and clear setup instructions.

## 4. Projects Management

Users can create and manage multiple projects.

A project represents a website or application.

Each project should have:

- Project name.
- Description (optional).
- Website URL (optional).
- Creation date.
- Associated forms.
- Notification integrations.
- Submission statistics.

Project functionality:

- Create project.
- Edit project.
- Delete project.
- Select project.
- View project information.

Deleting a project should require confirmation and handle its associated forms and submissions safely.

A project can contain multiple forms.

Example:

Project: PumpkinLuma

Forms:
- Contact Form
- Order Inquiry Form
- Newsletter Form

Each form has its own unique public endpoint.

## 5. Overview Dashboard

Create a project-specific analytics dashboard.

### A. Statistics cards

Display:

- Total submissions.
- Today's submissions.
- This week's submissions.
- This month's submissions.

Include date-range filtering and comparisons with the previous equivalent period where sufficient data exists.

### B. Submission charts

Implement:

- Submission activity over time (line chart).
- Daily submission counts (bar chart).
- Hourly submission distribution.
- Form-wise submission comparison.

Use a lightweight charting library such as Recharts.

Charts must use actual database data, not placeholder values.

### C. Device analytics

Show submission breakdown by:

- Desktop.
- Mobile.
- Tablet.
- Unknown.

Use request user-agent information to estimate device categories.

### D. Browser analytics

Show browser distribution where identifiable:

- Chrome.
- Firefox.
- Safari.
- Edge.
- Other.

### E. Geographic analytics

Show approximate submission locations:

- Country.
- Region where available.

Use an optional IP geolocation provider or pluggable geolocation adapter.

Do not make geolocation a mandatory external dependency.

Do not claim exact visitor tracking. These are submission-level analytics.

Avoid unnecessary retention of raw IP addresses.

### F. Recent submissions

Include a compact recent submissions table showing:

- Form name.
- Submission timestamp.
- Device.
- Status.

Provide a link to the full Submissions page.

All statistics and charts must support the selected project and date range.

## 6. Submissions Management

Create a dedicated submissions page.

Display submissions in a clean table.

Columns:

- Submission ID.
- Form.
- Sender information when available.
- Submission date.
- Device.
- Location.
- Status.

Features:

- Search submissions.
- Filter by form.
- Filter by date.
- Filter by status.
- View complete submission details.
- Mark as read/unread.
- Mark as spam.
- Delete submissions.
- Bulk delete.
- Export CSV.

### Submission details

Clicking a submission should open a details panel or dedicated page.

Display:

- All submitted fields and values.
- Form information.
- Timestamp.
- User-agent information.
- Device information.
- Approximate geography.
- Notification delivery history where available.

Submitted field names must be dynamic.

Do not require predefined database columns for every possible form field.

Use JSONB or an equivalent flexible storage mechanism.

Safely escape all submitted content before rendering.

## 7. Form Management and Endpoints

This is the central functionality of FormRelay.

Each project can contain multiple forms.

Each form must have:

- Unique ID.
- Human-readable name.
- Unique endpoint slug.
- Enabled/disabled status.
- Optional allowed domains.
- Optional redirect URL.
- Optional success message.
- Optional custom validation rules.
- Notification preferences.
- Creation timestamp.

Example endpoints:

https://our.domain/f/thisiscoolform

https://our.domain/f/pumpkin-contact

https://our.domain/f/snowflex-orders

Provide endpoint generation and management inside project Settings.

Users should be able to:
- Create forms.
- Edit forms.
- Enable/disable forms.
- Delete forms.
- Copy endpoints.
- View integration examples.

Prevent endpoint slug collisions.

Use cryptographically secure identifiers or sufficiently random slugs.

### HTML integration

A client should be able to use a simple HTML form:

<form action="https://our.domain/f/thisiscoolform" method="POST">

  <input type="text" name="name" placeholder="Name" required>

  <input type="email" name="email" placeholder="Email" required>

  <textarea name="message" placeholder="Message"></textarea>

  <button type="submit">Send</button>

</form>

No backend code should be required on the client's website.

### JavaScript integration

Also support JSON submissions through fetch():

const response = await fetch(
  "https://our.domain/f/thisiscoolform",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: "John",
      email: "john@example.com",
      message: "Hello!"
    })
  }
);

const result = await response.json();

Support appropriate CORS configuration for browser-based requests.

### Submission responses

Support:

- JSON success/error responses for AJAX requests.
- Redirects for standard HTML form submissions.
- Configurable success redirects.
- Configurable success messages.
- Clear validation errors.

## 8. Project Settings

Create a settings page for each selected project.

Organize it into clear sections.

### A. General

- Project name.
- Description.
- Website URL.
- Project deletion.

### B. Forms and endpoints

List all forms belonging to the project.

For each form show:
- Form name.
- Endpoint URL.
- Active status.
- Submission count.
- Created date.
- Edit/delete actions.

Allow users to create and configure forms.

### C. Telegram notifications

Telegram configuration MUST be project-specific.

Do not place Telegram bot tokens or chat IDs in global environment variables.

Each project must have independent Telegram integration settings.

Fields:

- Enable/disable Telegram notifications.
- Telegram bot token.
- Telegram chat ID.
- Test connection button.
- Save settings button.

Users must be able to configure different Telegram bots and chat IDs for different projects.

Store bot tokens encrypted in the database using an encryption key supplied through the application environment.

Never return decrypted bot tokens to the frontend.

Display saved tokens in masked form.

Send notifications using the Telegram Bot API.

Example notification:

New Form Submission

Form: Contact Form

Name: John Doe

Email: john@example.com

Message: I need a website.

Website: example.com

Submission time: ...

Support:
- HTML-formatted Telegram messages.
- Multiple chat IDs where practical.
- Configurable message templates.
- Delivery error logging.
- Connection testing.

Escape user-provided content before inserting it into Telegram HTML messages.

### D. Email notifications

Email configuration must also be project-specific.

Allow configuration of:

- SMTP host.
- SMTP port.
- SMTP username.
- SMTP password.
- SMTP security mode.
- Sender email.
- Recipient email addresses.
- Enable/disable notifications.

Store sensitive SMTP credentials encrypted.

Support a test email function.

Use Nodemailer or an equivalent SMTP library.

### E. Form behaviour

Allow configuration of:

- Allowed website origins.
- Success redirect URL.
- Custom success message.
- Spam protection.
- Honeypot field.
- Submission validation.
- Request limits.

### F. Data and privacy

Allow:

- Submission retention settings.
- Export project submissions.
- Delete project submissions.
- Clear all project data.

## 9. Backend Architecture

Use a modular architecture.

Recommended stack:

- TypeScript.
- Node.js.
- Hono for the API framework.
- Zod for validation.
- PostgreSQL for production storage.
- SQLite as an optional self-hosted adapter.
- Prisma or Drizzle ORM.
- Recharts for frontend charts.
- Nodemailer for SMTP.
- Telegram Bot API for notifications.
- Lucide icons.
- Montserrat font.

Avoid unnecessary microservices.

Use a modular monolith with clearly separated components.

Suggested architecture:

src/
  core/
    processor.ts
    validator.ts
    config.ts
    response.ts

  auth/
    authentication.ts
    sessions.ts

  projects/
    project.service.ts
    project.routes.ts

  forms/
    form.service.ts
    form.routes.ts

  submissions/
    submission.service.ts
    submission.routes.ts

  analytics/
    analytics.service.ts
    analytics.routes.ts

  notifications/
    telegram.ts
    email.ts
    notification.service.ts

  storage/
    interface.ts
    postgres.ts
    sqlite.ts

  security/
    rate-limit.ts
    honeypot.ts
    encryption.ts
    cors.ts

  adapters/
    node/
    vercel/
    netlify/

  app.ts

Keep the public form submission engine independent from dashboard functionality.

## 10. Database Design

Create a proper relational database schema.

Suggested tables:

### projects

- id
- name
- description
- website_url
- created_at
- updated_at

### forms

- id
- project_id
- name
- endpoint_slug
- enabled
- allowed_origins
- redirect_url
- success_message
- validation_config
- created_at
- updated_at

### submissions

- id
- form_id
- data (JSONB)
- status
- device_type
- browser
- country
- region
- user_agent
- created_at

### project_integrations

- id
- project_id
- provider
- enabled
- encrypted_credentials
- settings
- created_at
- updated_at

### notification_logs

- id
- project_id
- submission_id
- provider
- status
- error_message
- sent_at
- created_at

### sessions

- id
- session_token_hash
- expires_at
- created_at

Use foreign keys and indexes appropriately.

Use UUIDs for internal IDs.

Make endpoint slugs unique.

Use appropriate cascading deletion and retention behaviour.

The administrator credentials can remain environment-based. A public users table and registration system are unnecessary for the initial single-admin release.

## 11. Submission Processing Pipeline

Every public form submission should follow this sequence:

1. Receive the request.
2. Identify the form through its endpoint slug.
3. Check whether the form exists and is enabled.
4. Validate the request method and content type.
5. Enforce request size limits.
6. Validate configured allowed origins where applicable.
7. Validate submitted fields.
8. Apply honeypot and spam checks.
9. Apply rate limiting.
10. Generate a submission ID.
11. Identify device/browser metadata.
12. Obtain approximate geography if available.
13. Save the submission when storage is enabled.
14. Load the associated project's integrations.
15. Send configured Telegram notifications.
16. Send configured email notifications.
17. Record notification delivery results.
18. Return the appropriate response.

Notification failures must not destroy an otherwise successfully received submission.

Where supported, use background processing or a durable queue. For serverless environments, do not rely on unawaited background promises or in-memory queues.

## 12. Security

Security is essential.

Implement:

- Secure authentication.
- Password hashing.
- Session protection.
- CSRF protection.
- Login rate limiting.
- Public endpoint rate limiting.
- Request body size restrictions.
- Input validation.
- Output escaping.
- Honeypot protection.
- Optional CAPTCHA integration.
- Secure CORS handling.
- Secret encryption.
- Environment variable protection.
- Project ownership checks.
- Safe database queries.
- Protection against endpoint enumeration and abuse.

Important:

CORS and Origin checks are not authentication mechanisms.

Do not trust client-supplied metadata.

Do not expose Telegram bot tokens, SMTP passwords or encryption keys.

Never execute user-submitted HTML or JavaScript.

For serverless deployments, use a shared rate-limiting backend instead of process-local counters.

## 13. Deployment Compatibility

The application must support multiple deployment environments.

### Vercel

Provide:
- Vercel-compatible API adapter.
- Build configuration.
- Environment variable documentation.
- Deployment instructions.

### Netlify

Provide:
- Netlify Functions adapter.
- Configuration file.
- Build instructions.
- Environment variable documentation.

### Node.js / VPS

Provide:
- Standard Node.js server entry point.
- Production start script.
- Environment configuration.
- Dockerfile.
- Docker Compose example.
- Persistent database configuration.
- HTTPS/reverse proxy guidance.

All deployment adapters must use the same core submission processing logic.

Do not create separate implementations of the form processor for different platforms.

Account for serverless filesystem limitations. Do not rely on local persistent files for Vercel or Netlify storage.

## 14. User Experience

Implement:

- Loading states.
- Empty states.
- Error states.
- Success notifications/toasts.
- Confirmation dialogs.
- Copy-to-clipboard functionality.
- Responsive tables.
- Responsive charts.
- Search and filtering.
- Form validation feedback.

The application should be fully functional, not just a visual prototype.

Every button must perform its intended action.

Avoid placeholder statistics and fake submission records in production.

For first-time installations, show helpful onboarding instructions.

## 15. Documentation

Create a comprehensive README.md covering:

- What FormRelay is.
- Features.
- Screenshots placeholders.
- Requirements.
- Local development.
- Environment setup.
- Database setup and migrations.
- Vercel deployment.
- Netlify deployment.
- VPS deployment.
- Docker deployment.
- Telegram integration setup.
- SMTP setup.
- HTML form integration.
- JavaScript integration.
- Security notes.
- Troubleshooting.
- License.

Include:
- .env.example
- forms.config.example.json if applicable
- Dockerfile
- docker-compose.yml
- deployment configuration files.

Use the MIT License.

## 16. Development Priorities

Build in this order:

Phase 1:
- Project initialization.
- Authentication.
- Database schema.
- Dashboard layout.
- Project management.

Phase 2:
- Form creation.
- Unique endpoint generation.
- HTML form submission support.
- JavaScript submission support.
- Submission storage.

Phase 3:
- Submission management.
- Submission details.
- Search and filtering.
- CSV export.

Phase 4:
- Project-specific Telegram integration.
- Project-specific SMTP integration.
- Notification logs.
- Test connection features.

Phase 5:
- Overview analytics.
- Charts and statistics.
- Device/browser breakdown.
- Geographic analytics.

Phase 6:
- Security hardening.
- Vercel adapter.
- Netlify adapter.
- Node.js deployment.
- Docker support.
- Documentation.

## 17. Final Requirements

Before considering the project complete:

- Test actual HTML form submissions.
- Test actual JavaScript submissions.
- Test multiple projects.
- Test multiple forms within one project.
- Verify project-specific Telegram credentials.
- Verify SMTP delivery.
- Verify endpoint disabling.
- Verify authentication protection.
- Verify CSV exports.
- Verify analytics against actual database records.
- Test deployment adapters.
- Test error handling and notification failures.

Do not skip backend functionality to focus on the UI.

Do not invent fake integrations or pretend that notifications were delivered when they failed.

Do not overengineer the initial version.

Prioritize maintainability, portability, security, minimal resource usage and straightforward self-hosting.

**The final result should be a working, polished, open-source alternative to Formspree that users can deploy on their own infrastructure and manage through a simple white-themed dashboard using Montserrat typography.**