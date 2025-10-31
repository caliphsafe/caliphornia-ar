export default function handler(req, res){
  const sku = String(req.query.sku || 'HOODIE123');

  const MAP = {
    'HOODIE123': [
      {
        url: '/audio/caliph-polygamy.mp3',
        title: 'Polygamy',
        artist: 'Caliph',
        cover: '/covers/polygamy.jpg'
      },
      {
        url: '/audio/caliph-mariajulia.mp3',
        title: 'Maria Julia',
        artist: 'Caliph',
        cover: '/covers/mariajulia.jpg'
      },
      {
        // placeholder – replace with your 3rd song URL when ready
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
        title: 'Demo Track',
        artist: 'Caliph',
        cover: '/ui/cover-fallback.png'
      }
    ]
  };

  const tracks = MAP[sku] || MAP['HOODIE123'];
  res.json({ tracks });
}
