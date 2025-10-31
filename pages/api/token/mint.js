import jwt from 'jsonwebtoken';

export default async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).json({ok:false});
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ok:false});

  // TODO: add email to your mailing list provider here (Mailchimp/Firebase)

  const tok = jwt.sign({ email }, process.env.TOKEN_SECRET, { expiresIn: '2h' });
  res.json({ ok: true, tok });
}
