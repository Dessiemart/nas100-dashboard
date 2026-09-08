import { isValidSession } from "../../lib/auth";
import { getJsonFile, updateJsonFile } from "../../lib/github";

const DEFAULT_SETTINGS = {
  risk_percent: 0.05,
  account_balance: 1000,
  symbols_enabled: { NAS100: true, XAUUSD: true, EURUSD: true },
  news_pause_enabled: true,
};

export default async function handler(req, res) {
  if (!isValidSession(req.headers.cookie)) return res.status(401).json({ error: "Unauthorized" });

  if (req.method === "GET") {
    try {
      const settings = await getJsonFile("settings.json", DEFAULT_SETTINGS);
      res.status(200).json({ ...DEFAULT_SETTINGS, ...settings });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
    return;
  }

  if (req.method === "POST") {
    try {
      const body = req.body || {};
      const current = await getJsonFile("settings.json", DEFAULT_SETTINGS);
      const merged = { ...current, ...body };
      await updateJsonFile("settings.json", merged, "Update settings from dashboard");
      res.status(200).json({ ok: true, settings: merged });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
    return;
  }

  res.status(405).end();
}

