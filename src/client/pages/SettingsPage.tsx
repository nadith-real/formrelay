import { useEffect, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { Copy, Plus, Trash2 } from "lucide-react";
import { api } from "../api";
import { useToast } from "../context/Toast";
import { ConfirmDialog } from "../components/ConfirmDialog";
import type { FormItem, IntegrationPublic, Project } from "../types";

type SettingsPayload = {
  project: Project;
  settings: { retentionDays: number | null };
  integrations: { telegram: IntegrationPublic; email: IntegrationPublic };
};

export function SettingsPage() {
  const { projectId } = useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const { refresh } = useOutletContext<{ refresh: () => Promise<Project[]> }>();
  const [project, setProject] = useState<Project | null>(null);
  const [forms, setForms] = useState<FormItem[]>([]);
  const [appUrl, setAppUrl] = useState("");
  const [telegram, setTelegram] = useState<IntegrationPublic | null>(null);
  const [email, setEmail] = useState<IntegrationPublic | null>(null);
  const [retentionDays, setRetentionDays] = useState("");
  const [formModal, setFormModal] = useState<Partial<FormItem> | null>(null);
  const [examples, setExamples] = useState<FormItem | null>(null);
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [deleteFormId, setDeleteFormId] = useState<string | null>(null);

  async function load() {
    if (!projectId) return;
    const [s, f] = await Promise.all([
      api<SettingsPayload>(`/api/projects/${projectId}/settings`),
      api<{ items: FormItem[]; appUrl: string }>(`/api/projects/${projectId}/forms`),
    ]);
    setProject(s.project);
    setTelegram(s.integrations.telegram);
    setEmail(s.integrations.email);
    setRetentionDays(s.settings.retentionDays ? String(s.settings.retentionDays) : "");
    setForms(f.items);
    setAppUrl(f.appUrl);
  }

  useEffect(() => {
    load().catch((err) => toast.push(err.message, "error"));
  }, [projectId]);

  if (!project) return <p style={{ color: "#737373" }}>Loading settings…</p>;

  const endpoint = (slug: string) => `${appUrl.replace(/\/$/, "")}/f/${slug}`;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Project, forms, notifications, and privacy.</p>
        </div>
      </div>

      <section className="section card card-pad">
        <h2>General</h2>
        <GeneralForm
          project={project}
          onSave={async (payload) => {
            await api(`/api/projects/${project.id}`, { method: "PATCH", body: JSON.stringify(payload) });
            toast.push("Project updated", "success");
            await refresh();
            load();
          }}
        />
        <button className="btn btn-danger" onClick={() => setConfirmDeleteProject(true)}>
          Delete project
        </button>
      </section>

      <section className="section card card-pad">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Forms and endpoints</h2>
          <button className="btn btn-primary" onClick={() => setFormModal({ name: "", enabled: true })}>
            <Plus size={14} /> New form
          </button>
        </div>
        {forms.length === 0 ? (
          <p style={{ color: "#737373" }}>No forms yet. Create one to get a public endpoint.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Endpoint</th>
                  <th>Status</th>
                  <th>Submissions</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {forms.map((form) => (
                  <tr key={form.id}>
                    <td>{form.name}</td>
                    <td>
                      <code>{endpoint(form.endpointSlug)}</code>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={async () => {
                          await navigator.clipboard.writeText(endpoint(form.endpointSlug));
                          toast.push("Copied", "success");
                        }}
                      >
                        <Copy size={14} />
                      </button>
                    </td>
                    <td>
                      <span className={`badge ${form.enabled ? "on" : "off"}`}>{form.enabled ? "Active" : "Disabled"}</span>
                    </td>
                    <td>{form.submissionCount ?? 0}</td>
                    <td>{new Date(form.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-sm" onClick={() => setFormModal(form)}>
                          Edit
                        </button>
                        <button className="btn btn-sm" onClick={() => setExamples(form)}>
                          Examples
                        </button>
                        <button className="btn btn-sm" onClick={() => setDeleteFormId(form.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <TelegramSection
        projectId={project.id}
        integration={telegram}
        onSaved={() => {
          toast.push("Telegram settings saved", "success");
          load();
        }}
      />
      <EmailSection
        projectId={project.id}
        integration={email}
        onSaved={() => {
          toast.push("Email settings saved", "success");
          load();
        }}
      />

      <section className="section card card-pad">
        <h2>Data and privacy</h2>
        <div className="field" style={{ maxWidth: 240 }}>
          <label>Retention days (optional)</label>
          <input value={retentionDays} onChange={(e) => setRetentionDays(e.target.value)} placeholder="Keep forever" />
        </div>
        <div className="row-actions">
          <button
            className="btn"
            onClick={async () => {
              await api(`/api/projects/${project.id}/settings`, {
                method: "PATCH",
                body: JSON.stringify({ retentionDays: retentionDays ? Number(retentionDays) : null }),
              });
              toast.push("Retention saved", "success");
            }}
          >
            Save retention
          </button>
          <button
            className="btn"
            onClick={() => {
              fetch(`/api/projects/${project.id}/submissions.csv`, { credentials: "include" })
                .then(async (res) => {
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "project-submissions.csv";
                  a.click();
                  URL.revokeObjectURL(url);
                });
            }}
          >
            Export project submissions
          </button>
          <button className="btn" onClick={() => setConfirmClear(true)}>
            Clear all submissions
          </button>
        </div>
      </section>

      {formModal && (
        <FormEditor
          form={formModal}
          onClose={() => setFormModal(null)}
          onSave={async (payload) => {
            if (formModal.id) {
              await api(`/api/forms/${formModal.id}`, { method: "PATCH", body: JSON.stringify(payload) });
              toast.push("Form updated", "success");
            } else {
              await api(`/api/projects/${project.id}/forms`, { method: "POST", body: JSON.stringify(payload) });
              toast.push("Form created", "success");
            }
            setFormModal(null);
            load();
          }}
        />
      )}

      {examples && (
        <ExamplesModal form={examples} url={endpoint(examples.endpointSlug)} onClose={() => setExamples(null)} />
      )}

      {confirmDeleteProject && (
        <ConfirmDialog
          title="Delete project"
          body="This deletes the project, its forms, submissions, and integrations."
          confirmLabel="Delete project"
          danger
          onClose={() => setConfirmDeleteProject(false)}
          onConfirm={async () => {
            await api(`/api/projects/${project.id}`, { method: "DELETE" });
            await refresh();
            navigate("/");
          }}
        />
      )}
      {confirmClear && (
        <ConfirmDialog
          title="Clear submissions"
          body="Delete every submission in this project?"
          confirmLabel="Clear data"
          danger
          onClose={() => setConfirmClear(false)}
          onConfirm={async () => {
            await api(`/api/projects/${project.id}/submissions/clear`, { method: "POST" });
            setConfirmClear(false);
            toast.push("Submissions cleared", "success");
          }}
        />
      )}
      {deleteFormId && (
        <ConfirmDialog
          title="Delete form"
          body="This also deletes submissions for this form."
          confirmLabel="Delete form"
          danger
          onClose={() => setDeleteFormId(null)}
          onConfirm={async () => {
            await api(`/api/forms/${deleteFormId}`, { method: "DELETE" });
            setDeleteFormId(null);
            toast.push("Form deleted", "success");
            load();
          }}
        />
      )}
    </div>
  );
}

function GeneralForm({
  project,
  onSave,
}: {
  project: Project;
  onSave: (p: { name: string; description: string; websiteUrl: string }) => void;
}) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");
  const [websiteUrl, setWebsiteUrl] = useState(project.websiteUrl || "");
  useEffect(() => {
    setName(project.name);
    setDescription(project.description || "");
    setWebsiteUrl(project.websiteUrl || "");
  }, [project]);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ name, description, websiteUrl });
      }}
    >
      <div className="grid-2">
        <div className="field">
          <label>Project name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label>Website URL</label>
          <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </div>
      <button className="btn btn-primary" style={{ marginBottom: 16 }}>
        Save project
      </button>
    </form>
  );
}

function FormEditor({
  form,
  onClose,
  onSave,
}: {
  form: Partial<FormItem>;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [name, setName] = useState(form.name || "");
  const [slug, setSlug] = useState(form.endpointSlug || "");
  const [enabled, setEnabled] = useState(form.enabled ?? true);
  const [origins, setOrigins] = useState((form.allowedOrigins || []).join("\n"));
  const [redirectUrl, setRedirectUrl] = useState(form.redirectUrl || "");
  const [successMessage, setSuccessMessage] = useState(form.successMessage || "");
  const [honeypotField, setHoneypotField] = useState(form.honeypotField || "_gotcha");
  const [spamProtection, setSpamProtection] = useState(form.spamProtection ?? true);
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState(form.rateLimitPerMinute ?? 30);
  const [required, setRequired] = useState(
    Array.isArray((form.validationConfig as any)?.required) ? ((form.validationConfig as any).required as string[]).join(", ") : "",
  );
  const [saving, setSaving] = useState(false);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form
        className="modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          try {
            await onSave({
              name,
              endpointSlug: slug || undefined,
              enabled,
              allowedOrigins: origins
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
              redirectUrl: redirectUrl || null,
              successMessage: successMessage || null,
              honeypotField,
              spamProtection,
              rateLimitPerMinute: Number(rateLimitPerMinute),
              validationConfig: {
                required: required
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              },
            });
          } finally {
            setSaving(false);
          }
        }}
      >
        <header>
          <h2>{form.id ? "Edit form" : "New form"}</h2>
        </header>
        <div className="body">
          <div className="field">
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label>Endpoint slug</label>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto-generated if empty" />
            <span className="hint">Lowercase letters, numbers, and hyphens. Leave blank to generate.</span>
          </div>
          <div className="field">
            <label>Allowed origins (one per line)</label>
            <textarea value={origins} onChange={(e) => setOrigins(e.target.value)} rows={3} placeholder="https://example.com" />
          </div>
          <div className="grid-2">
            <div className="field">
              <label>Success redirect URL</label>
              <input value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} />
            </div>
            <div className="field">
              <label>Success message</label>
              <input value={successMessage} onChange={(e) => setSuccessMessage(e.target.value)} />
            </div>
          </div>
          <div className="grid-2">
            <div className="field">
              <label>Honeypot field</label>
              <input value={honeypotField} onChange={(e) => setHoneypotField(e.target.value)} />
            </div>
            <div className="field">
              <label>Rate limit / minute</label>
              <input type="number" min={1} value={rateLimitPerMinute} onChange={(e) => setRateLimitPerMinute(Number(e.target.value))} />
            </div>
          </div>
          <div className="field">
            <label>Required fields (comma-separated)</label>
            <input value={required} onChange={(e) => setRequired(e.target.value)} placeholder="name, email" />
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Enabled
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={spamProtection} onChange={(e) => setSpamProtection(e.target.checked)} /> Spam heuristics
          </label>
        </div>
        <footer>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save form"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function ExamplesModal({ form, url, onClose }: { form: FormItem; url: string; onClose: () => void }) {
  const toast = useToast();
  const html = `<form action="${url}" method="POST">
  <input type="text" name="name" placeholder="Name" required>
  <input type="email" name="email" placeholder="Email" required>
  <textarea name="message" placeholder="Message"></textarea>
  <input type="text" name="${form.honeypotField || "_gotcha"}" style="display:none">
  <button type="submit">Send</button>
</form>`;
  const js = `const response = await fetch("${url}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "John",
    email: "john@example.com",
    message: "Hello!"
  })
});
const result = await response.json();`;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>Integration examples</h2>
        </header>
        <div className="body">
          <p style={{ marginTop: 0 }}>HTML</p>
          <pre className="code">{html}</pre>
          <button
            className="btn btn-sm"
            onClick={async () => {
              await navigator.clipboard.writeText(html);
              toast.push("Copied", "success");
            }}
          >
            Copy HTML
          </button>
          <p>JavaScript</p>
          <pre className="code">{js}</pre>
          <button
            className="btn btn-sm"
            onClick={async () => {
              await navigator.clipboard.writeText(js);
              toast.push("Copied", "success");
            }}
          >
            Copy JavaScript
          </button>
        </div>
        <footer>
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}

function TelegramSection({
  projectId,
  integration,
  onSaved,
}: {
  projectId: string;
  integration: IntegrationPublic | null;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [enabled, setEnabled] = useState(integration?.enabled || false);
  const [botToken, setBotToken] = useState(integration?.masked.botToken || "");
  const [chatIds, setChatIds] = useState(integration?.masked.chatIds || "");
  const [template, setTemplate] = useState(String(integration?.settings?.template || ""));
  useEffect(() => {
    setEnabled(integration?.enabled || false);
    setBotToken(integration?.masked.botToken || "");
    setChatIds(integration?.masked.chatIds || "");
    setTemplate(String(integration?.settings?.template || ""));
  }, [integration]);
  return (
    <section className="section card card-pad">
      <h2>Telegram notifications</h2>
      <p className="hint" style={{ color: "#737373", marginTop: 0 }}>
        Tokens are stored encrypted. Saved tokens are shown masked and are never returned in full.
      </p>
      <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Enable Telegram
      </label>
      <div className="field">
        <label>Bot token</label>
        <input value={botToken} onChange={(e) => setBotToken(e.target.value)} placeholder="123456:ABC..." />
      </div>
      <div className="field">
        <label>Chat IDs</label>
        <input value={chatIds} onChange={(e) => setChatIds(e.target.value)} placeholder="123456789, -100987654321" />
      </div>
      <div className="field">
        <label>Optional HTML template</label>
        <textarea value={template} onChange={(e) => setTemplate(e.target.value)} rows={4} placeholder="New Form Submission&#10;Form: {form}" />
      </div>
      <div className="row-actions">
        <button
          className="btn btn-primary"
          onClick={async () => {
            await api(`/api/projects/${projectId}/integrations/telegram`, {
              method: "PUT",
              body: JSON.stringify({ enabled, botToken, chatIds, template }),
            });
            onSaved();
          }}
        >
          Save Telegram
        </button>
        <button
          className="btn"
          onClick={async () => {
            try {
              await api(`/api/projects/${projectId}/integrations/telegram/test`, { method: "POST" });
              toast.push("Telegram test succeeded", "success");
            } catch (err) {
              toast.push(err instanceof Error ? err.message : "Test failed", "error");
            }
          }}
        >
          Test connection
        </button>
      </div>
    </section>
  );
}

function EmailSection({
  projectId,
  integration,
  onSaved,
}: {
  projectId: string;
  integration: IntegrationPublic | null;
  onSaved: () => void;
}) {
  const toast = useToast();
  const m = integration?.masked || {};
  const [enabled, setEnabled] = useState(integration?.enabled || false);
  const [host, setHost] = useState(m.host || "");
  const [port, setPort] = useState(m.port || "587");
  const [username, setUsername] = useState(m.username || "");
  const [password, setPassword] = useState(m.password || "");
  const [security, setSecurity] = useState(m.security || "tls");
  const [from, setFrom] = useState(m.from || "");
  const [to, setTo] = useState(m.to || "");
  useEffect(() => {
    setEnabled(integration?.enabled || false);
    setHost(m.host || "");
    setPort(m.port || "587");
    setUsername(m.username || "");
    setPassword(m.password || "");
    setSecurity(m.security || "tls");
    setFrom(m.from || "");
    setTo(m.to || "");
  }, [integration]);
  return (
    <section className="section card card-pad">
      <h2>Email notifications</h2>
      <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Enable email
      </label>
      <div className="grid-2">
        <div className="field">
          <label>SMTP host</label>
          <input value={host} onChange={(e) => setHost(e.target.value)} />
        </div>
        <div className="field">
          <label>Port</label>
          <input value={port} onChange={(e) => setPort(e.target.value)} />
        </div>
        <div className="field">
          <label>Username</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="field">
          <label>Security</label>
          <select value={security} onChange={(e) => setSecurity(e.target.value)}>
            <option value="tls">TLS</option>
            <option value="ssl">SSL</option>
            <option value="none">None</option>
          </select>
        </div>
        <div className="field">
          <label>From</label>
          <input value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Recipients</label>
        <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="you@example.com" />
      </div>
      <div className="row-actions">
        <button
          className="btn btn-primary"
          onClick={async () => {
            await api(`/api/projects/${projectId}/integrations/email`, {
              method: "PUT",
              body: JSON.stringify({
                enabled,
                host,
                port: Number(port),
                username,
                password,
                security,
                from,
                to,
              }),
            });
            onSaved();
          }}
        >
          Save email
        </button>
        <button
          className="btn"
          onClick={async () => {
            try {
              await api(`/api/projects/${projectId}/integrations/email/test`, { method: "POST" });
              toast.push("Email test succeeded", "success");
            } catch (err) {
              toast.push(err instanceof Error ? err.message : "Test failed", "error");
            }
          }}
        >
          Send test email
        </button>
      </div>
    </section>
  );
}
