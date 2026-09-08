import { isValidSession } from "../lib/auth";
import { getJsonFile } from "../lib/github";
import { useState } from "react";

export async function getServerSideProps({ req }) {
  if (!isValidSession(req.headers.cookie)) {
    return { redirect: { destination: "/login", permanent: false } };
  }
  const state = await getJsonFile("state.json", {});
  const alertsLog = await getJsonFile("alerts_log.json", []);
  return { props: { state, alertsLog } };
}

export default function Dashboard({ state, alertsLog }) {
  const [triggering, setTriggering] = useState(false);
  const [message, setMessage] = useState("");

  async function handleTrigger() {
    setTriggering(true);
    setMessage("");
    const res = await fetch("/api/trigger", { method: "POST" });
    setTriggering(false);
    setMessage(res.ok ? "Triggered! Check back in a minute." : "Failed to trigger.");
  }

  const recentAlerts = [...alertsLog].reverse().slice(0, 20);
  const byStrategy = {};
  for (const a of alertsLog) {
    byStrategy[a.strategy] = (byStrategy[a.strategy] || 0) + 1;
  }

  return (
    <div style={{ maxWidth: 700, margin: "40px auto", fontFamily: "sans-serif", padding: "0 16px" }}>
      <h1>NAS100 Alert Bot</h1>

      <div style={{ marginBottom: 24 }}>
        <button onClick={handleTrigger} disabled={triggering} style={{ padding: "10px 20px", fontSize: 16 }}>
          {triggering ? "Triggering..." : "Run Now"}
        </button>
        <a href="/settings" style={{ marginLeft: 16 }}>Settings</a>
        {message && <p>{message}</p>}
      </div>

      <h2>Today</h2>
      <p>Alerts sent: {state.alerts_today ?? 0}</p>
      <p>Near-miss heads-ups: {state.near_miss_today ?? 0}</p>

      <h2>Alerts by strategy (all time)</h2>
      <ul>
        {Object.entries(byStrategy).map(([strat, count]) => (
          <li key={strat}>{strat}: {count}</li>
        ))}
        {Object.keys(byStrategy).length === 0 && <li>None yet.</li>}
      </ul>

      <h2>Recent alerts</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>Time (UTC)</th>
            <th style={{ textAlign: "left" }}>Strategy</th>
            <th style={{ textAlign: "left" }}>Symbol</th>
            <th style={{ textAlign: "left" }}>Dir</th>
            <th style={{ textAlign: "left" }}>Entry</th>
            <th style={{ textAlign: "left" }}>SL</th>
            <th style={{ textAlign: "left" }}>TP</th>
          </tr>
        </thead>
        <tbody>
          {recentAlerts.map((a, i) => (
            <tr key={i}>
              <td>{a.sent_at_utc}</td>
              <td>{a.strategy}</td>
              <td>{a.symbol}</td>
              <td>{a.direction}</td>
              <td>{a.entry}</td>
              <td>{a.sl}</td>
              <td>{a.tp}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {recentAlerts.length === 0 && <p>No alerts yet.</p>}
    </div>
  );
}

