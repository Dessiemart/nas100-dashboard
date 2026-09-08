import { isValidSession } from "../../lib/auth";
import { dispatchWorkflow } from "../../lib/github";

export default async function handler(req, res) {
  if (!isValidSession(req.headers.cookie)) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "POST") return res.status(405).end();
  try {
    await dispatchWorkflow("alert.yml");
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}

