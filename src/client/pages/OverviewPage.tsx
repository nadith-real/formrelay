import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api";
import type { Overview } from "../types";

const COLORS = ["#2563EB", "#60A5FA", "#93C5FD", "#1E3A8A", "#BFDBFE"];

function fmt(n: number) {
  return n.toLocaleString();
}

export function OverviewPage() {
  const { projectId } = useParams();
  const [data, setData] = useState<Overview | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    api<{ overview: Overview }>(`/api/projects/${projectId}/analytics?${q.toString()}`)
      .then((res) => setData(res.overview))
      .finally(() => setLoading(false));
  }, [projectId, from, to]);

  if (loading && !data) return <p style={{ color: "#737373" }}>Loading overview…</p>;
  if (!data) return <p>Could not load analytics.</p>;

  const deviceData = Object.entries(data.devices).map(([name, value]) => ({ name, value }));
  const browserData = Object.entries(data.browsers).map(([name, value]) => ({ name, value }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Overview</h1>
          <p>Submission activity for the selected project.</p>
        </div>
        <div className="filters" style={{ margin: 0 }}>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 16 }}>
        <Stat label="Total" value={data.stats.total} />
        <Stat label="Today" value={data.stats.today} />
        <Stat label="This week" value={data.stats.week} />
        <Stat
          label="This month"
          value={data.stats.month}
          delta={data.stats.changePercent}
        />
      </div>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="card card-pad">
          <div className="stat-label" style={{ marginBottom: 12 }}>
            Activity over time
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.activity}>
              <CartesianGrid stroke="#EAEAEA" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="#2563EB" fill="#EFF6FF" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card card-pad">
          <div className="stat-label" style={{ marginBottom: 12 }}>
            Daily counts
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.activity}>
              <CartesianGrid stroke="#EAEAEA" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="card card-pad">
          <div className="stat-label" style={{ marginBottom: 12 }}>
            Hourly distribution
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.hourly}>
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#60A5FA" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card card-pad">
          <div className="stat-label" style={{ marginBottom: 12 }}>
            By form
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.forms} layout="vertical">
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563EB" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <PieCard title="Devices" data={deviceData} />
        <PieCard title="Browsers" data={browserData} />
      </div>

      <div className="grid-2">
        <div className="card card-pad">
          <div className="stat-label" style={{ marginBottom: 12 }}>
            Approximate locations
          </div>
          {data.countries.length === 0 ? (
            <p style={{ color: "#737373", margin: 0 }}>No geographic data yet. Configure a geo adapter if needed.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Country</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {data.countries.map((c) => (
                  <tr key={c.country}>
                    <td>{c.country}</td>
                    <td>{c.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card card-pad">
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div className="stat-label">Recent submissions</div>
            <Link to={`/p/${projectId}/submissions`}>View all</Link>
          </div>
          {data.recent.length === 0 ? (
            <p style={{ color: "#737373" }}>No submissions yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Form</th>
                  <th>When</th>
                  <th>Device</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((r) => (
                  <tr key={r.id}>
                    <td>{r.formName}</td>
                    <td>{new Date(r.createdAt).toLocaleString()}</td>
                    <td>{r.deviceType || "unknown"}</td>
                    <td>
                      <span className={`badge ${r.status}`}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, delta }: { label: string; value: number; delta?: number | null }) {
  return (
    <div className="card card-pad">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{fmt(value)}</div>
      {delta != null && (
        <div className={`delta ${delta >= 0 ? "up" : "down"}`}>
          {delta >= 0 ? "+" : ""}
          {delta}% vs previous period
        </div>
      )}
    </div>
  );
}

function PieCard({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  return (
    <div className="card card-pad">
      <div className="stat-label" style={{ marginBottom: 12 }}>
        {title}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
