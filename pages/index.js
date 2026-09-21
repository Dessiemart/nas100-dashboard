import { isValidSession } from "../lib/auth";
import { getJsonFile } from "../lib/github";
import { useState, useEffect, useCallback } from "react";
import { theme } from "../styles/theme";

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
                    background: symbolsEnabled[s] !== false ? theme.color.success : theme.color.textFaint,
                  }}
                />
                {s}
              </span>
            ))}
          </div>

          <button onClick={refresh} className="btn btn-secondary" style={styles.btnSecondary}>
            Refresh
          </button>
          <button onClick={handleTrigger} disabled={triggering} className="btn btn-primary" style={styles.btnPrimary}>
            {triggering ? "Triggering…" : "Run Now"}
          </button>
          <a href="/settings" className="link-violet">
            Settings
          </a>
          <button onClick={handleLogout} className="btn btn-ghost" style={styles.btnGhost}>
            Logout
          </button>
        </div>
      </header>

      {message && <div style={styles.message}>{message}</div>}

      {/* TODAY STATS */}
      <section style={styles.statsRow}>
        <div className="card-hover" style={styles.statCard}>
          <div style={styles.statLabel}>Alerts today</div>
          <div style={styles.statValue}>{state.alerts_today ?? 0}</div>
        </div>
        <div className="card-hover" style={styles.statCard}>
          <div style={styles.statLabel}>Near-misses today</div>
          <div style={styles.statValue}>{state.near_miss_today ?? 0}</div>
        </div>
        <div className="card-hover" style={styles.statCard}>
          <div style={styles.statLabel}>Active setups</div>
          <div style={styles.statValue}>{setups.length}</div>
        </div>
        <div className="card-hover" style={styles.statCard}>
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
              <div key={s.key || `${s.strategy}-${s.symbol}`} className="card-hover" style={styles.setupCard}>
                <div style={styles.setupHeader}>
                  <span style={styles.setupName}>
                    {s.strategy} · {s.symbol}
                  </span>
                  <span
                    style={{
                      ...styles.dirBadge,
                      background: s.leaning === "BUY" ? "#166534" : s.leaning === "SELL" ? "#7f1d1d" : "#222",
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
                      background: s.confirmed === s.total ? theme.color.success : theme.color.warning,
                    }}
                  />
                </div>
                <ul style={styles.stepList}>
                  {(s.steps || []).map((step, i) => (
                    <li key={i} style={styles.stepItem}>
                      <span style={{ color: step.ok ? theme.color.success : theme.color.textFaint }}>
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
                    <td style={styles.tdMono}>{a.sent_at_utc?.replace("T", " ").slice(0, 19)}</td>
                    <td style={styles.td}>{a.strategy}</td>
                    <td style={styles.td}>{a.symbol}</td>
                    <td
                      style={{
                        ...styles.td,
                        color: a.direction === "buy" ? theme.color.success : theme.color.danger,
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
    background: theme.color.bg,
    color: theme.color.text,
    fontFamily: theme.font.sans,
    padding: "20px 24px 60px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 24,
    borderBottom: `1px solid ${theme.color.border}`,
    paddingBottom: 16,
  },
  title: {
    fontFamily: theme.font.serif,
    fontSize: 32,
    fontWeight: 600,
    letterSpacing: "-0.01em",
  },
  subtitle: {
    fontFamily: theme.font.mono,
    fontSize: 12,
    color: theme.color.textMuted,
    marginTop: 6,
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
    fontFamily: theme.font.mono,
    fontSize: 12,
    color: theme.color.textMuted,
    background: theme.color.bgElevated,
    padding: "4px 8px",
    borderRadius: theme.radius.sm,
    border: `1px solid ${theme.color.border}`,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    display: "inline-block",
  },
  btnPrimary: {
    background: "#ffffff",
    color: "#000000",
    border: "none",
    padding: "8px 16px",
    borderRadius: theme.radius.sm,
    fontSize: 14,
    fontWeight: 600,
  },
  btnSecondary: {
    background: "transparent",
    color: theme.color.text,
    border: `1px solid ${theme.color.borderStrong}`,
    padding: "8px 14px",
    borderRadius: theme.radius.sm,
    fontSize: 13,
  },
  btnGhost: {
    background: "transparent",
    color: theme.color.textMuted,
    border: `1px solid ${theme.color.border}`,
    padding: "8px 12px",
    borderRadius: theme.radius.sm,
    fontSize: 13,
  },
  message: {
    background: theme.color.violetDim,
    color: theme.color.violet,
    padding: "10px 14px",
    borderRadius: theme.radius.sm,
    marginBottom: 16,
    fontSize: 14,
    border: `1px solid ${theme.color.border}`,
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    background: theme.color.bgElevated,
    border: `1px solid ${theme.color.border}`,
    borderRadius: theme.radius.lg,
    padding: "14px 16px",
  },
  statLabel: {
    fontSize: 12,
    color: theme.color.textMuted,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: theme.font.mono,
    fontSize: 22,
    fontWeight: 600,
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
    fontFamily: theme.font.serif,
    fontSize: 18,
    fontWeight: 600,
    margin: 0,
    color: theme.color.text,
  },
  filters: {
    display: "flex",
    gap: 8,
  },
  select: {
    background: theme.color.bgElevated,
    color: theme.color.text,
    border: `1px solid ${theme.color.borderStrong}`,
    borderRadius: theme.radius.sm,
    padding: "6px 10px",
    fontSize: 13,
  },
  empty: {
    background: theme.color.bgElevated,
    border: `1px dashed ${theme.color.border}`,
    borderRadius: theme.radius.lg,
    padding: "28px 16px",
    textAlign: "center",
    color: theme.color.textFaint,
    fontSize: 14,
  },
  setupsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 14,
  },
  setupCard: {
    background: theme.color.bgElevated,
    border: `1px solid ${theme.color.border}`,
    borderRadius: theme.radius.lg,
    padding: 16,
  },
  setupHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  setupName: {
    fontFamily: theme.font.mono,
    fontSize: 13,
    fontWeight: 600,
  },
  dirBadge: {
    fontFamily: theme.font.mono,
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: 4,
    color: "#fff",
  },
  progressText: {
    fontFamily: theme.font.mono,
    fontSize: 12,
    color: theme.color.textMuted,
    marginBottom: 6,
  },
  progressBar: {
    height: 6,
    background: theme.color.border,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    transition: "width 300ms ease-out",
  },
  stepList: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    fontSize: 13,
  },
  stepItem: {
    marginBottom: 4,
    color: theme.color.textMuted,
  },
  tableWrap: {
    overflowX: "auto",
    border: `1px solid ${theme.color.border}`,
    borderRadius: theme.radius.lg,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    background: theme.color.bgElevated,
    color: theme.color.textMuted,
    fontWeight: 600,
    borderBottom: `1px solid ${theme.color.border}`,
    whiteSpace: "nowrap",
  },
  tr: {
    borderBottom: `1px solid ${theme.color.border}`,
  },
  td: {
    padding: "9px 12px",
    whiteSpace: "nowrap",
  },
  tdMono: {
    padding: "9px 12px",
    fontFamily: theme.font.mono,
    fontSize: 12.5,
    color: theme.color.textMuted,
    whiteSpace: "nowrap",
  },
};
