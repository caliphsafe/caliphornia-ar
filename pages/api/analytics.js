export default async function handler(req, res) {
  // Accept POST or GET and just return ok for now
  return res.status(200).json({ ok: true });
}
