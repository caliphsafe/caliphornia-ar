import jwt from 'jsonwebtoken';

export default function handler(req, res){
  const { tok } = req.query || {};
  try{
    jwt.verify(String(tok), process.env.TOKEN_SECRET);
    return res.json({ ok: true });
  }catch(e){
    return res.json({ ok: false });
  }
}
