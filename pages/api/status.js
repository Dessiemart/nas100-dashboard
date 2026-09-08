import { isValidSession } from "../../lib/auth";
import { getJsonFile } from "../../lib/github";

export default async function handler(req, res) {
  if (!isValidSession(req.headers.cookie)) return res.status(401).json({ error: "Unauthorized" });
  try {
    const state = await getJsonFile("state.json", {});
    const alertsLog = await getJsonFile("alerts_log.json", []);
    res.status(200).json({ state, alertsLog });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}

