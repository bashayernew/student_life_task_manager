/** Minimal probe — if this fails on Vercel, the /api runtime itself is misconfigured. */
export default function handler(_req, res) {
  res.status(200).json({ probe: 'ok' });
}
