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
                />
                {s}
              </span>
            ))}
          </div>

          <button onClick={refresh} style={styles.btnSecondary}>
            Refresh
          </button>
          <button onClick={handleTrigger} disabled={triggering} style={styles.btnPrimary}>
            {triggering ? "Triggering…" : "Run Now"}
          </button>
          <a href="/settings" style={styles.link}>
            Settings
          </a>
          <button onClick={handleLogout} style={styles.btnGhost}>
            Logout
          </button>
        </div>
      </header>

      {message && <div style={styles.message}>{message}</div>}

      {/* TODAY STATS */}
      <section style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Alerts today</div>
          <div style={styles.statValue}>{state.alerts_today ?? 0}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Near-misses today</div>
          <div style={styles.statValue}>{state.near_miss_today ?? 0}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Active setups</div>
          <div style={styles.statValue}>{setups.length}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>News pause</div>
          <div style={styles.statValue}>
            {settings.news_pause_enabled ? "ON" : "OFF"}
          </div>
        </div>
      </section>

      {/* LIVE SETUPS */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Live Setups</h2>
        {setups.length === 0 ? (
          <div style={styles.empty}>
            No setups currently building confluence.
          </div>
        ) : (
          <div style={styles.setupsGrid}>
            {setups.map((s) => (
              <div key={s.key || `\( {s.strategy}- \){s.symbol}`} style={styles.setupCard}>
                <div style={styles.setupHeader}>
                  <span style={styles.setupName}>
                    {s.strategy} · {s.symbol}
                  </span>
                  <span
                    style={{
                      ...styles.dirBadge,
                      background: s.leaning === "BUY" ? "#166534" : s.leaning === "SELL" ? "#7f1d1d" : "#333",
                    }}
                  >
                    {s.leaning || "—"}
                  </span>
                </div>
                <div style={styles.progressText}>
                  {s.confirmed}/{s.total} confirmed
                </div>
                <div style={styles.progressBar}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: `${(s.confirmed / Math.max(s.total, 1)) * 100}%`,
                      background: s.confirmed === s.total ? "#22c55e" : "#eab308",
                    }}
                  />
                </div>
                <ul style={styles.stepList}>
                  {(s.steps || []).map((step, i) => (
                    <li key={i} style={styles.stepItem}>
                      <span style={{ color: step.ok ? "#22c55e" : "#666" }}>
                        {step.ok ? "✓" : "○"}
                      </span>{" "}
                      {step.label}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ALERT HISTORY */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Alert History</h2>
          <div style={styles.filters}>
            <select
              value={filterSymbol}
              onChange={(e) => setFilterSymbol(e.target.value)}
              style={styles.select}
            >
              <option value="ALL">All symbols</option>
              {SYMBOLS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={filterDirection}
              onChange={(e) => setFilterDirection(e.target.value)}
              style={styles.select}
            >
              <option value="ALL">All directions</option>
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </div>
        </div>

        {recentAlerts.length === 0 ? (
          <div style={styles.empty}>No alerts yet.</div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Time (UTC)</th>
                  <th style={styles.th}>Strategy</th>
                  <th style={styles.th}>Symbol</th>
                  <th style={styles.th}>Dir</th>
                  <th style={styles.th}>Entry</th>
                  <th style={styles.th}>SL</th>
                  <th style={styles.th}>TP</th>
                </tr>
              </thead>
              <tbody>
                {recentAlerts.map((a, i) => (
                  <tr key={i} style={styles.tr}>
                    <td style={styles.td}>{a.sent_at_utc?.replace("T", " ").slice(0, 19)}</td>
                    <td style={styles.td}>{a.strategy}</td>
                    <td style={styles.td}>{a.symbol}</td>
                    <td
                      style={{
                        ...styles.td,
                        color: a.direction === "buy" ? "#22c55e" : "#ef4444",
                        fontWeight: 600,
                      }}
                    >
                      {a.direction?.toUpperCase()}
                    </td>
                    <td style={styles.tdMono}>{a.entry}</td>
                    <td style={styles.tdMono}>{a.sl}</td>
                    <td style={styles.tdMono}>{a.tp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0a0a0a",
    color: "#e5e5e5",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
    padding: "20px 24px 60px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 24,
    borderBottom: "1px solid #222",
    paddingBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: "-0.02em",
  },
  subtitle: {
    fontSize: 13,
    color: "#888",
    marginTop: 4,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  symbolLights: {
    display: "flex",
    gap: 8,
    marginRight: 8,
  },
  symbolChip: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontSize: 12,
    color: "#aaa",
    background: "#161616",
    padding: "4px 8px",
    borderRadius: 6,
    border: "1px solid #2a2a2a",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    display: "inline-block",
  },
  btnPrimary: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnSecondary: {
    background: "#1f1f1f",
    color: "#e5e5e5",
    border: "1px solid #333",
    padding: "8px 14px",
    borderRadius: 6,
    fontSize: 13,
    cursor: "pointer",
  },
  btnGhost: {
    background: "transparent",
    color: "#888",
    border: "1px solid #333",
    padding: "8px 12px",
    borderRadius: 6,
    fontSize: 13,
    cursor: "pointer",
  },
  link: {
    color: "#93c5fd",
    textDecoration: "none",
    fontSize: 14,
    padding: "8px 4px",
  },
  message: {
    background: "#1e3a5f",
    color: "#bfdbfe",
    padding: "10px 14px",
    borderRadius: 6,
    marginBottom: 16,
    fontSize: 14,
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    background: "#141414",
    border: "1px solid #252525",
    borderRadius: 8,
    padding: "14px 16px",
  },
  statLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 700,
  },
  section: {
    marginBottom: 36,
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    margin: 0,
    color: "#ccc",
  },
  filters: {
    display: "flex",
    gap: 8,
  },
  select: {
    background: "#161616",
    color: "#e5e5e5",
    border: "1px solid #333",
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 13,
  },
  empty: {
    background: "#141414",
    border: "1px dashed #2a2a2a",
    borderRadius: 8,
    padding: "28px 16px",
    textAlign: "center",
    color: "#666",
    fontSize: 14,
  },
  setupsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 14,
  },
  setupCard: {
    background: "#141414",
    border: "1px solid #252525",
    borderRadius: 10,
    padding: 16,
  },
  setupHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  setupName: {
    fontSize: 14,
    fontWeight: 600,
  },
  dirBadge: {
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: 4,
    color: "#fff",
  },
  progressText: {
    fontSize: 12,
    color: "#aaa",
    marginBottom: 6,
  },
  progressBar: {
    height: 6,
    background: "#222",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    transition: "width 0.3s",
  },
  stepList: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    fontSize: 13,
  },
  stepItem: {
    marginBottom: 4,
    color: "#bbb",
  },
  tableWrap: {
    overflowX: "auto",
    border: "1px solid #252525",
    borderRadius: 8,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    background: "#161616",
    color: "#888",
    fontWeight: 600,
    borderBottom: "1px solid #252525",
    whiteSpace: "nowrap",
  },
  tr: {
    borderBottom: "1px solid #1c1c1c",
  },
  td: {
    padding: "9px 12px",
    whiteSpace: "nowrap",
  },
  tdMono: {
    padding: "9px 12px",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 12.5,
  },
};
