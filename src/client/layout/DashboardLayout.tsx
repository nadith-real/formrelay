import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { Inbox, LayoutDashboard, LogOut, Menu, Plus, Settings } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/Toast";
import type { Project } from "../types";
import { CreateProjectModal } from "../components/CreateProjectModal";

export function DashboardLayout() {
  const { username, logout } = useAuth();
  const { projectId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);

  async function refresh() {
    const data = await api<{ items: Project[] }>("/api/projects");
    setProjects(data.items);
    return data.items;
  }

  useEffect(() => {
    refresh().catch(() => toast.push("Could not load projects", "error"));
  }, []);

  useEffect(() => {
    if (!projectId && projects.length) {
      navigate(`/p/${projects[0].id}`, { replace: true });
    }
  }, [projectId, projects, navigate]);

  return (
    <div className={`app-shell ${drawer ? "drawer-open" : ""}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">F</div>
          FormRelay
        </div>
        <div className="sidebar-label">Projects</div>
        <button className="nav-btn" onClick={() => setOpen(true)}>
          <Plus size={16} /> Add Project
        </button>
        <div className="project-list">
          {projects.map((p) => (
            <button
              key={p.id}
              className={`project-item ${p.id === projectId ? "active" : ""}`}
              onClick={() => {
                navigate(`/p/${p.id}`);
                setDrawer(false);
              }}
            >
              {p.name}
            </button>
          ))}
        </div>
        {projectId && (
          <div className="subnav">
            <NavLink to={`/p/${projectId}`} end onClick={() => setDrawer(false)}>
              <LayoutDashboard size={16} /> Overview
            </NavLink>
            <NavLink to={`/p/${projectId}/submissions`} onClick={() => setDrawer(false)}>
              <Inbox size={16} /> Submissions
            </NavLink>
            <NavLink to={`/p/${projectId}/settings`} onClick={() => setDrawer(false)}>
              <Settings size={16} /> Settings
            </NavLink>
          </div>
        )}
        <div className="sidebar-footer">
          <span className="user-chip">{username}</span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </aside>
      <main className="main">
        <button className="btn mobile-toggle" onClick={() => setDrawer((v) => !v)} style={{ marginBottom: 16 }}>
          <Menu size={16} /> Menu
        </button>
        <Outlet context={{ projects, refresh }} />
      </main>
      {open && (
        <CreateProjectModal
          onClose={() => setOpen(false)}
          onCreated={async (id) => {
            await refresh();
            setOpen(false);
            navigate(`/p/${id}`);
          }}
        />
      )}
    </div>
  );
}
