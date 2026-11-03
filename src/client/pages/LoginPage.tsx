import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/Toast";

export function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await login(username, password);
    } catch (err) {
      toast.push(err instanceof Error ? err.message : "Login failed", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card card" onSubmit={submit}>
        <div className="brand" style={{ paddingLeft: 0 }}>
          <div className="brand-mark">F</div>
          FormRelay
        </div>
        <h1>Administrator login</h1>
        <p>Sign in with the credentials from your environment configuration.</p>
        <div className="field">
          <label>Username</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <button className="btn btn-primary" disabled={saving} style={{ width: "100%", justifyContent: "center" }}>
          {saving ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
