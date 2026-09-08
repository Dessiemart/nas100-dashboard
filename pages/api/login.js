import { createSessionCookie } from "../../lib/auth";

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { password } = req.body || {};
  if (!password || password !== process.env.DASHBOARD_PASSWORD) {
    return res.status(401).json({ error: "Invalid password" });
  }
  res.setHeader("Set-Cookie", createSessionCookie());
  res.status(200).json({ ok: true });
}

