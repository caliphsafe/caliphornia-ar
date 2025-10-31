export default function handler(req, res){
  const sku = String(req.query.sku || 'HOODIE123');
  const MAP = {
    'HOODIE123': [
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
    ]
  };
  res.json({ urls: MAP[sku] || MAP['HOODIE123'] });
}
