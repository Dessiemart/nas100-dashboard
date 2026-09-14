import { isValidSession } from "../../lib/auth";
import { getJsonFile } from "../../lib/github";

export default async function handler(req, res) {
  if (!isValidSession(req.headers.cookie)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
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

    res.status(200).json({
      state,
      alertsLog,
      liveSetups,
      settings,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
