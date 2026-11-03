import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { FolderPlus } from "lucide-react";
import { CreateProjectModal } from "../components/CreateProjectModal";
import type { Project } from "../types";

export function EmptyProjectsPage() {
  const { projects, refresh } = useOutletContext<{ projects: Project[]; refresh: () => Promise<Project[]> }>();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  if (projects.length) return null;

  return (
    <div className="card empty">
      <FolderPlus size={36} color="#2563EB" />
      <h3>Create your first project</h3>
      <p>A project represents a website. Add forms, collect submissions, and configure notifications.</p>
      <button className="btn btn-primary" onClick={() => setOpen(true)} style={{ marginTop: 16 }}>
        Create project
      </button>
      {open && (
        <CreateProjectModal
          onClose={() => setOpen(false)}
          onCreated={async (id) => {
            await refresh();
            navigate(`/p/${id}`);
          }}
        />
      )}
    </div>
  );
}
