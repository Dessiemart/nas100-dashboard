import { isValidSession } from "../lib/auth";
import { getJsonFile } from "../lib/github";
import { useState } from "react";

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
  return { props: { initialSettings: { ...DEFAULT_SETTINGS, ...settings } } };
}

export default function Settings({ initialSettings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setMessage(res.ok ? "Saved! Takes effect on the next bot run." : "Failed to save.");
  }

  function toggleSymbol(sym) {
    setSettings((s) => ({
      ...s,
      symbols_enabled: { ...s.symbols_enabled, [sym]: !s.symbols_enabled[sym] },
    }));
  }

  return (
    <div style={{ maxWidth: 500, margin: "40px auto", fontFamily: "sans-serif", padding: "0 16px" }}>
      <h1>Settings</h1>
      <a href="/">Back to dashboard</a>
      <form onSubmit={handleSave} style={{ marginTop: 20 }}>
        <label style={{ display: "block", marginBottom: 12 }}>
          Risk % per trade (e.g. 0.05 = 5%)
          <input
            type="number"
            step="0.01"
            min="0.01"
            max="1"
            value={settings.risk_percent}
            onChange={(e) => setSettings({ ...settings, risk_percent: parseFloat(e.target.value) })}
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4, boxSizing: "border-box" }}
          />
        </label>

        <label style={{ display: "block", marginBottom: 12 }}>
          Account balance ($)
          <input
            type="number"
            step="1"
            value={settings.account_balance}
            onChange={(e) => setSettings({ ...settings, account_balance: parseFloat(e.target.value) })}
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4, boxSizing: "border-box" }}
          />
        </label>

        <fieldset style={{ marginBottom: 12 }}>
          <legend>Symbols enabled</legend>
          {["NAS100", "XAUUSD", "EURUSD"].map((sym) => (
            <label key={sym} style={{ display: "block" }}>
              <input
                type="checkbox"
                checked={!!settings.symbols_enabled[sym]}
                onChange={() => toggleSymbol(sym)}
              />
              {" "}{sym}
            </label>
          ))}
        </fieldset>

        <label style={{ display: "block", marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={settings.news_pause_enabled}
            onChange={(e) => setSettings({ ...settings, news_pause_enabled: e.target.checked })}
          />
          {" "}Pause alerts near high-impact news
        </label>

        <button type="submit" disabled={saving} style={{ padding: "10px 20px", fontSize: 16 }}>
          {saving ? "Saving..." : "Save settings"}
        </button>
        {message && <p>{message}</p>}
      </form>
    </div>
  );
}

