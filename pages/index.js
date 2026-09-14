import { isValidSession } from "../lib/auth";
import { getJsonFile } from "../lib/github";
import { useState, useEffect, useCallback } from "react";

export async function getServerSideProps({ req }) {
  if (!isValidSession(req.headers.cookie)) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  const [state, alertsLog, liveSetups, settings] = await Promise.all([
    getJsonFile("state.json", {}),
    getJsonFile("alerts_log.json", []),
    getJsonFile("live_setups.json", { updated_at_utc: null, setups: [] }),
    getJsonFile("settings.json", {
      risk_percent: 0.05,
      account_balance: 1000,
      symbols_enabled: { NAS100: true, XAUUSD: true, EURUSD: true },
      news_pause_enabled: true,
    }),
  ]);

  return {
    props: {
      initialState: state,
      initialAlertsLog: alertsLog,
      initialLiveSetups: liveSetups,
      initialSettings: settings,
    },
  };
}

const SYMBOLS = ["NAS100", "XAUUSD", "EURUSD"];

export default function Dashboard({
  initialState,
  initialAlertsLog,
  initialLiveSetups,
  initialSettings,
}) {
  const [state, setState] = useState(initialState);
  const [alertsLog, setAlertsLog] = useState(initialAlertsLog);
  const [liveSetups, setLiveSetups] = useState(initialLiveSetups);
  const [settings, setSettings] = useState(initialSettings);
  const [triggering, setTriggering] = useState(false);
  const [message, setMessage] = useState("");
  const [filterSymbol, setFilterSymbol] = useState("ALL");
  const [filterDirection, setFilterDirection] = useState("ALL");
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      if (!res.ok) return;
      const data = await res.json();
      setState(data.state || {});
      setAlertsLog(data.alertsLog || []);
      setLiveSetups(data.liveSetups || { setups: [] });
      setSettings(data.settings || {});
      setLastRefresh(new Date());
    } catch (e) {
      console.error("Refresh failed", e);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(refresh, 45000);
    return () => clearInterval(id);
  }, [refresh]);

  async function handleTrigger() {
    setTriggering(true);
    setMessage("");
    try {
      const res = await fetch("/api/trigger", { method: "POST" });
      setMessage(res.ok ? "Bot triggered. Data will update shortly." : "Failed to trigger.");
      if (res.ok) setTimeout(refresh, 8000);
    } catch {
      setMessage("Failed to trigger.");
    }
    setTriggering(false);
  }

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const recentAlerts = [...alertsLog]
    .reverse()
    .filter((a) => {
      if (filterSymbol !== "ALL" && a.symbol !== filterSymbol) return false;
      if (filterDirection !== "ALL" && a.direction !== filterDirection) return false;
      return true;
    })
    .slice(0, 40);

  const symbolsEnabled = settings.symbols_enabled || {};
  const setups = liveSetups.setups || [];
  const updatedAt = liveSetups.updated_at_utc
    ? new Date(liveSetups.updated_at_utc).toLocaleString()
    : "—";

  return (
    <div style={styles.page}>
      {/* HEADER */}
      <header style={styles.header}>
        <div>
          <div style={styles.title}>NAS100 Alert Terminal</div>
          <div style={styles.subtitle}>
            Last bot update: {updatedAt} · Refreshed {lastRefresh.toLocaleTimeString()}
          </div>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.symbolLights}>
            {SYMBOLS.map((s) => (
              <span key={s} style={styles.symbolChip}>
                <span
                  style={{
                    ...styles.dot,
                    background: symbolsEnabled[s] !== false ? "#22c55e" : "#555",
                  }}
