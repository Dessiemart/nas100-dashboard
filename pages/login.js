import { useState } from "react";
import { useRouter } from "next/router";

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
          <button type="submit" disabled={loading} style={styles.button}>
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
    background: "#0a0a0a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    background: "#141414",
    border: "1px solid #252525",
    borderRadius: 12,
    padding: "32px 28px",
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: "#e5e5e5",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: "#888",
    marginBottom: 24,
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    fontSize: 15,
    background: "#0f0f0f",
    border: "1px solid #333",
    borderRadius: 8,
    color: "#e5e5e5",
    boxSizing: "border-box",
    outline: "none",
  },
  button: {
    width: "100%",
    marginTop: 12,
    padding: "12px",
    fontSize: 15,
    fontWeight: 600,
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
  error: {
    marginTop: 14,
    color: "#f87171",
    fontSize: 14,
  },
};
