import { isValidSession } from "../lib/auth";
import { getJsonFile } from "../lib/github";
import { useState } from "react";
import { theme } from "../styles/theme";

const DEFAULT_SETTINGS = {
  risk_percent: 0.05,
  account_balance: 1000,
  symbols_enabled: { NAS100: true, XAUUSD: true, EURUSD: true },
  news_pause_enabled: true,
};

export async function getServerSideProps({ req }) {
  if (!isValidSession(req.headers.cookie)) {
    return { redirect: { destination: "/login", permanent: false } };
  }
  const settings = await getJsonFile("settings.json", DEFAULT_SETTINGS);
  return {
    props: {
      initialSettings: { ...DEFAULT_SETTINGS, ...settings },
    },
  };
}

export default function Settings({ initialSettings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      setMessage(
        res.ok
          ? "Saved. Changes take effect on the next bot run."
          : "Failed to save."
      );
    } catch {
      setMessage("Failed to save.");
    }
    setSaving(false);
  }

  function toggleSymbol(sym) {
    setSettings((s) => ({
      ...s,
      symbols_enabled: {
        ...s.symbols_enabled,
        [sym]: !s.symbols_enabled[sym],
      },
    }));
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Settings</h1>
          <a href="/" className="link-violet">
            ← Back to terminal
          </a>
        </div>

        <form onSubmit={handleSave} style={styles.form}>
          <label style={styles.label}>
            Risk % per trade
            <span style={styles.hint}>e.g. 0.05 = 5%</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="1"
              value={settings.risk_percent}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  risk_percent: parseFloat(e.target.value) || 0,
                })
              }
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Account balance ($)
            <input
              type="number"
              step="1"
              min="0"
              value={settings.account_balance}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  account_balance: parseFloat(e.target.value) || 0,
                })
              }
              style={styles.input}
            />
          </label>

          <fieldset style={styles.fieldset}>
            <legend style={styles.legend}>Symbols enabled</legend>
            {["NAS100", "XAUUSD", "EURUSD"].map((sym) => (
              <label key={sym} style={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={!!settings.symbols_enabled[sym]}
                  onChange={() => toggleSymbol(sym)}
                  style={styles.checkbox}
                />
                {sym}
              </label>
            ))}
          </fieldset>

          <label style={styles.checkLabel}>
            <input
              type="checkbox"
              checked={!!settings.news_pause_enabled}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  news_pause_enabled: e.target.checked,
                })
              }
              style={styles.checkbox}
            />
            Pause alerts near high-impact news
          </label>

          <button type="submit" disabled={saving} className="btn btn-primary" style={styles.button}>
            {saving ? "Saving…" : "Save settings"}
          </button>

          {message && (
            <div
              style={{
                ...styles.message,
                color: message.startsWith("Saved") ? theme.color.success : theme.color.danger,
              }}
            >
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: theme.color.bg,
    color: theme.color.text,
    fontFamily: theme.font.sans,
    padding: "40px 16px",
  },
  container: {
    maxWidth: 480,
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  title: {
    fontFamily: theme.font.serif,
    fontSize: 28,
    fontWeight: 600,
    margin: 0,
  },
  form: {
    background: theme.color.bgElevated,
    border: `1px solid ${theme.color.border}`,
    borderRadius: theme.radius.lg,
    padding: 24,
  },
  label: {
    display: "block",
    marginBottom: 18,
    fontSize: 14,
    color: theme.color.text,
  },
  hint: {
    display: "block",
    fontFamily: theme.font.mono,
    fontSize: 11,
    color: theme.color.textFaint,
    marginTop: 2,
    marginBottom: 6,
  },
  input: {
    display: "block",
    width: "100%",
    marginTop: 6,
    padding: "10px 12px",
    fontFamily: theme.font.mono,
    fontSize: 15,
    background: theme.color.bg,
    border: `1px solid ${theme.color.borderStrong}`,
    borderRadius: theme.radius.sm,
    color: theme.color.text,
    boxSizing: "border-box",
  },
  fieldset: {
    border: `1px solid ${theme.color.border}`,
    borderRadius: theme.radius.sm,
    padding: "12px 14px",
    marginBottom: 18,
  },
  legend: {
    padding: "0 6px",
    color: theme.color.textMuted,
    fontSize: 13,
  },
  checkLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    fontSize: 14,
    color: theme.color.text,
    cursor: "pointer",
  },
  checkbox: {
    width: 16,
    height: 16,
    accentColor: theme.color.violet,
  },
  button: {
    marginTop: 8,
    width: "100%",
    padding: "12px",
    fontSize: 15,
    fontWeight: 600,
    background: "#ffffff",
    color: "#000000",
    border: "none",
    borderRadius: theme.radius.sm,
  },
  message: {
    marginTop: 14,
    fontSize: 14,
  },
};
