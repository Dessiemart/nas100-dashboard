import { useState } from "react";
import { useRouter } from "next/router";
import { theme } from "../styles/theme";

export default function Login() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push("/");
      } else {
        setError("Wrong password.");
      }
    } catch {
      setError("Something went wrong.");
    }
    setLoading(false);
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.title}>NAS100 Alert Terminal</div>
        <div style={styles.subtitle}>Enter password to continue</div>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            autoFocus
          />
          <button type="submit" disabled={loading} className="btn btn-primary" style={styles.button}>
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>

        {error && <div style={styles.error}>{error}</div>}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: theme.color.bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: theme.font.sans,
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    background: theme.color.bgElevated,
    border: `1px solid ${theme.color.border}`,
    borderRadius: theme.radius.lg,
    padding: "36px 28px",
  },
  title: {
    fontFamily: theme.font.serif,
    fontSize: 26,
    fontWeight: 600,
    color: theme.color.text,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: theme.font.mono,
    fontSize: 12,
    color: theme.color.textMuted,
    marginBottom: 24,
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    fontFamily: theme.font.mono,
    fontSize: 15,
    background: theme.color.bg,
    border: `1px solid ${theme.color.borderStrong}`,
    borderRadius: theme.radius.sm,
    color: theme.color.text,
    boxSizing: "border-box",
    outline: "none",
  },
  button: {
    width: "100%",
    marginTop: 12,
    padding: "12px",
    fontSize: 15,
    fontWeight: 600,
    background: "#ffffff",
    color: "#000000",
    border: "none",
    borderRadius: theme.radius.sm,
  },
  error: {
    marginTop: 14,
    color: theme.color.danger,
    fontSize: 14,
  },
};
