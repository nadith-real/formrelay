import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Download, Search, Trash2 } from "lucide-react";
import { api } from "../api";
import { useToast } from "../context/Toast";
import { ConfirmDialog } from "../components/ConfirmDialog";
import type { FormItem, Submission } from "../types";

export function SubmissionsPage() {
  const { projectId } = useParams();
  const toast = useToast();
  const [items, setItems] = useState<Submission[]>([]);
  const [total, setTotal] = useState(0);
  const [forms, setForms] = useState<FormItem[]>([]);
  const [search, setSearch] = useState("");
  const [formId, setFormId] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<any>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [confirmOne, setConfirmOne] = useState<string | null>(null);

  async function load() {
    if (!projectId) return;
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    if (formId) q.set("formId", formId);
    if (status) q.set("status", status);
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    const data = await api<{ items: Submission[]; total: number }>(`/api/projects/${projectId}/submissions?${q}`);
    setItems(data.items);
    setTotal(data.total);
  }

  useEffect(() => {
    if (!projectId) return;
    api<{ items: FormItem[] }>(`/api/projects/${projectId}/forms`).then((d) => setForms(d.items));
  }, [projectId]);

  useEffect(() => {
    load().catch((err) => toast.push(err.message, "error"));
  }, [projectId, formId, status, from, to]);

  async function openDetail(id: string) {
    const data = await api<{ item: any }>(`/api/projects/${projectId}/submissions/${id}`);
    setDetail(data.item);
    if (data.item.status === "unread") {
      await api(`/api/projects/${projectId}/submissions/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "read" }),
      });
      load();
    }
  }

  async function setStatusFor(id: string, next: string) {
    await api(`/api/projects/${projectId}/submissions/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: next }),
    });
    toast.push("Updated", "success");
    load();
    if (detail?.id === id) setDetail({ ...detail, status: next });
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Submissions</h1>
          <p>
            {total} result{total === 1 ? "" : "s"}
          </p>
        </div>
        <div className="row-actions">
          <a className="btn" href={`/api/projects/${projectId}/submissions.csv`} onClick={(e) => {
            e.preventDefault();
            const q = new URLSearchParams();
            if (search) q.set("search", search);
            if (formId) q.set("formId", formId);
            if (status) q.set("status", status);
            fetch(`/api/projects/${projectId}/submissions.csv?${q}`, { credentials: "include" })
              .then(async (res) => {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "submissions.csv";
                a.click();
                URL.revokeObjectURL(url);
              });
          }}>
            <Download size={14} /> Export CSV
          </a>
          <button className="btn" disabled={!selected.size} onClick={() => setConfirmBulk(true)}>
            <Trash2 size={14} /> Delete selected
          </button>
        </div>
      </div>

      <div className="filters">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
          style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
        >
          <input
            placeholder="Search fields or ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn" type="submit">
            <Search size={14} /> Search
          </button>
        </form>
        <select value={formId} onChange={(e) => setFormId(e.target.value)}>
          <option value="">All forms</option>
          {forms.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
          <option value="spam">Spam</option>
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      <div className="card table-wrap">
        {items.length === 0 ? (
          <div className="empty">
            <h3>No submissions</h3>
            <p>New entries will appear here after a form is submitted.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th></th>
                <th>ID</th>
                <th>Form</th>
                <th>Sender</th>
                <th>Date</th>
                <th>Device</th>
                <th>Location</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="clickable" onClick={() => openDetail(item.id)}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} />
                  </td>
                  <td>{item.id.slice(0, 8)}</td>
                  <td>{item.formName}</td>
                  <td>{item.sender || "—"}</td>
                  <td>{new Date(item.createdAt).toLocaleString()}</td>
                  <td>{item.deviceType || "unknown"}</td>
                  <td>{[item.country, item.region].filter(Boolean).join(", ") || "—"}</td>
                  <td>
                    <span className={`badge ${item.status}`}>{item.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {detail && (
        <div className="modal-backdrop" onClick={() => setDetail(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <header>
              <h2>Submission {detail.id.slice(0, 8)}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setDetail(null)}>
                Close
              </button>
            </header>
            <div className="body">
              <dl className="kv">
                <dt>Form</dt>
                <dd>{detail.form?.name}</dd>
                <dt>Time</dt>
                <dd>{new Date(detail.createdAt).toLocaleString()}</dd>
                <dt>Device</dt>
                <dd>{detail.deviceType || "unknown"} / {detail.browser || "Other"}</dd>
                <dt>Location</dt>
                <dd>{[detail.country, detail.region].filter(Boolean).join(", ") || "Unavailable"}</dd>
                <dt>User agent</dt>
                <dd>{detail.userAgent || "—"}</dd>
                <dt>Status</dt>
                <dd>
                  <span className={`badge ${detail.status}`}>{detail.status}</span>
                </dd>
              </dl>
              <h3 style={{ fontSize: 14, margin: "18px 0 8px" }}>Fields</h3>
              <dl className="kv">
                {Object.entries(detail.data || {}).map(([key, value]) => (
                  <div key={key} style={{ display: "contents" }}>
                    <dt>{key}</dt>
                    <dd>{String(value ?? "")}</dd>
                  </div>
                ))}
              </dl>
              <h3 style={{ fontSize: 14, margin: "18px 0 8px" }}>Notifications</h3>
              {(detail.notifications || []).length === 0 ? (
                <p style={{ color: "#737373" }}>No notification attempts recorded.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Provider</th>
                      <th>Status</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.notifications.map((n: any) => (
                      <tr key={n.id}>
                        <td>{n.provider}</td>
                        <td>{n.status}</td>
                        <td>{n.errorMessage || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <footer>
              <button className="btn" onClick={() => setStatusFor(detail.id, "unread")}>
                Mark unread
              </button>
              <button className="btn" onClick={() => setStatusFor(detail.id, "spam")}>
                Mark spam
              </button>
              <button className="btn btn-danger" onClick={() => setConfirmOne(detail.id)}>
                Delete
              </button>
            </footer>
          </div>
        </div>
      )}

      {confirmBulk && (
        <ConfirmDialog
          title="Delete submissions"
          body={`Delete ${selected.size} selected submission(s)? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onClose={() => setConfirmBulk(false)}
          onConfirm={async () => {
            await api(`/api/projects/${projectId}/submissions/bulk-delete`, {
              method: "POST",
              body: JSON.stringify({ ids: [...selected] }),
            });
            setSelected(new Set());
            setConfirmBulk(false);
            toast.push("Deleted", "success");
            load();
          }}
        />
      )}
      {confirmOne && (
        <ConfirmDialog
          title="Delete submission"
          body="Delete this submission permanently?"
          confirmLabel="Delete"
          danger
          onClose={() => setConfirmOne(null)}
          onConfirm={async () => {
            await api(`/api/projects/${projectId}/submissions/${confirmOne}`, { method: "DELETE" });
            setConfirmOne(null);
            setDetail(null);
            toast.push("Deleted", "success");
            load();
          }}
        />
      )}
    </div>
  );
}
