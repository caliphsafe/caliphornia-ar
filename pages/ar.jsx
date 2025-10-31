import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';

const verifyToken = async (tok, sku) => {
  if (!tok) return false;
  const res = await fetch(`/api/token/verify?tok=${encodeURIComponent(tok)}&sku=${encodeURIComponent(sku||'')}`);
  const j = await res.json();
  return j.ok === true;
};

export default function ARPage(){
  const [ready, setReady] = useState(false);
  const [gated, setGated] = useState(true);
  const [email, setEmail] = useState('');
  const [playlist, setPlaylist] = useState([]);
  const sceneRef = useRef(null);

  useEffect(() => {
    const u = new URL(window.location.href);
    const tok = u.searchParams.get('tok') || '';
    const sku = u.searchParams.get('sku') || '';
    fetch(`/api/playlist?sku=${encodeURIComponent(sku)}`)
      .then(r=>r.json()).then(j => setPlaylist(j.tracks || []));
    (async()=>{
      const ok = await verifyToken(tok, sku);
      setGated(!ok);
    })();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const s1 = document.createElement('script');
    s1.src = 'https://cdn.jsdelivr.net/npm/aframe@1.5.0/dist/aframe.min.js';
    const s2 = document.createElement('script');
    s2.src = 'https://libs.zappar.com/zappar-aframe/2.2.2/zappar-aframe.js';
    const onLoad = () => setReady(true);
    s2.onload = onLoad;
    document.head.appendChild(s1);
    document.head.appendChild(s2);
    return () => { try{s1.remove();s2.remove();}catch(e){} };
  }, []);

  async function joinMailingList() {
    const res = await fetch('/api/token/mint', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email })
    });
    const j = await res.json();
    if (j.ok && j.tok){
      const u = new URL(window.location.href);
      u.searchParams.set('tok', j.tok);
      window.location.href = u.toString();
    }
  }

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <title>Caliphornia AR Player</title>
        <link rel="preload" href="/ui/panel.svg" as="image" />
      </Head>

      {/* Caliphornia top chrome */}
      <div className="caliphornia-chrome glass-panel" style={{padding:10}}>
        <img src="/ui/caliphornia-logo.svg" alt="Caliphornia" height={22}/>
        <div style={{marginLeft:8, fontWeight:600}}>AR Player</div>
      </div>

      {/* Now Playing (glass overlay) */}
      <div id="np" className="glass-panel np-card" style={{display:'none'}}>
        <img id="npCover" alt="" />
        <div className="np-text">
          <div id="npTitle" className="np-title">—</div>
          <div id="npArtist" className="np-artist">—</div>
        </div>
      </div>

      {/* Email Gate */}
      {gated && (
        <div style={{
          position:'fixed', inset:0, display:'grid', placeItems:'center',
          background:'radial-gradient(ellipse at center, rgba(0,0,0,0.75), rgba(0,0,0,0.9))',
          zIndex:10
        }}>
          <div className="glass-panel" style={{width:320, padding:20}}>
            <h3 style={{margin:'0 0 10px'}}>Join Caliphornia</h3>
            <p style={{opacity:0.9, margin:'0 0 12px'}}>Enter your email to unlock the AR playlist.</p>
            <input
              type="email" placeholder="you@domain.com" value={email}
              onChange={e=>setEmail(e.target.value)}
              className="glass-button" style={{width:'100%', marginBottom:10}}
            />
            <button className="glass-button" style={{width:'100%'}} onClick={joinMailingList}>Unlock</button>
            <p style={{opacity:0.6, fontSize:12, marginTop:10}}>Scan your hoodie’s wrist QR to access exclusive drops.</p>
          </div>
        </div>
      )}

      {/* AR Scene */}
      <div ref={sceneRef} style={{height:'100vh', background:'#000'}}>
        {ready && !gated && (
          <div dangerouslySetInnerHTML={{__html: `
            <audio id="player" crossorigin="anonymous" preload="auto" playsinline></audio>

            <button
              id="start"
              class="glass-button"
              style="position:fixed;left:50%;transform:translateX(-50%);bottom:24px;z-index:3;"
              onclick="window.__startAR&&window.__startAR()"
            >
              Start AR & Audio
            </button>

            <a-scene
              renderer="colorManagement: true; physicallyCorrectLights: true"
              zappar="pipeline: cameraPipeline"
              vr-mode-ui="enabled: false"
              device-orientation-permission-ui="enabled: false"
              embedded
              style="height:100vh;">

              <a-entity id="cameraPipeline"></a-entity>
              <a-entity zappar-permissions-ui></a-entity>
              <a-entity zappar-compatibility-ui></a-entity>

              <a-entity id="zapparCamera" camera zappar-camera="userFacing: false;"></a-entity>

              <!-- World-tracked anchor -->
              <a-entity zappar-instant="placement-mode: true" id="instant">
                <!-- Glass panel card -->
                <a-plane id="panel" position="0 0 -1" width="1.2" height="0.72"
                  material="src: /ui/panel.svg; transparent: true;">
                </a-plane>

                <!-- Buttons -->
                <a-image id="btn-prev" src="/ui/btn-prev.svg" position="-0.35 -0.12 -0.99" width="0.18" height="0.18"></a-image>
                <a-image id="btn-play" src="/ui/btn-play.svg" position="0 -0.12 -0.99" width="0.18" height="0.18"></a-image>
                <a-image id="btn-next" src="/ui/btn-next.svg" position="0.35 -0.12 -0.99" width="0.18" height="0.18"></a-image>

                <a-image id="now-title" src="/ui/nowplaying.svg" position="0 0.12 -0.99" width="0.9" height="0.12"></a-image>

                <!-- 3D cover + text inside panel -->
                <a-image id="cover3d" src="/ui/cover-fallback.png" position="-0.42 0.08 -0.99" width="0.24" height="0.24"></a-image>
                <a-entity id="title3d" text="value: ; color: #FFFFFF; width: 1.2; wrapCount: 18"
                          position="-0.12 0.15 -0.99"></a-entity>
                <a-entity id="artist3d" text="value: ; color: #DDDDDD; width: 1.2; wrapCount: 22"
                          position="-0.12 0.05 -0.99"></a-entity>
              </a-entity>
            </a-scene>

            <script>
              let index = 0;
              const audio = document.getElementById('player');

              function updateNowPlayingUI(track){
                try{
                  const np = document.getElementById('np');
                  const cov = document.getElementById('npCover');
                  const t = document.getElementById('npTitle');
                  const a = document.getElementById('npArtist');

                  if (track){
                    if (cov) cov.src = track.cover || '';
                    if (t) t.textContent = track.title || '';
                    if (a) a.textContent = track.artist || '';
                    if (np) np.style.display = 'flex';
                  } else {
                    if (np) np.style.display = 'none';
                  }

                  const c3d = document.getElementById('cover3d');
                  const t3d = document.getElementById('title3d');
                  const a3d = document.getElementById('artist3d');
                  if (c3d && track && track.cover) c3d.setAttribute('src', track.cover);
                  if (t3d) t3d.setAttribute('text', 'value', track?.title || '');
                  if (a3d) a3d.setAttribute('text', 'value', track?.artist || '');
                }catch(e){}
              }

              function loadCurrent(){
                const list = window.__playlist || [];
                const track = list[index];
                if (!track) return;
                audio.src = track.url || '';
                audio.load();
                updateNowPlayingUI(track);
              }

              function ensurePlaylistLoaded(){
                return new Promise((resolve) => {
                  if (window.__playlist && window.__playlist.length) return resolve(true);
                  fetch('/api/playlist' + window.location.search)
                    .then(r=>r.json())
                    .then(j => { window.__playlist = j.tracks || []; resolve(true); })
                    .catch(()=> resolve(true));
                });
              }

              async function requestMotion(){
                try{
                  if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function'){
                    await DeviceMotionEvent.requestPermission();
                  }
                }catch(e){}
              }

              async function requestCamera(){
                try{
                  // Explicit user-gesture camera request for iOS/Safari
                  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
                    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
                    // Immediately stop the temp stream; Zappar will manage camera
                    stream.getTracks().forEach(t => t.stop());
                  }
                }catch(e){}
              }

              // Preload playlist opportunistically
              fetch('/api/playlist' + window.location.search)
                .then(r=>r.json())
                .then(j => { window.__playlist = j.tracks || []; });

              // Global start handler bound inline to guarantee gesture binding
              window.__startAR = async () => {
                await ensurePlaylistLoaded();
                await requestCamera();
                await requestMotion();
                loadCurrent();
                try { await audio.play(); } catch(e) {}
                audio.pause(); // unlocks audio autoplay policy on iOS
                const btn = document.getElementById('start');
                if (btn) btn.style.display='none';
              };

              function play(){ audio.play(); }
              function next(){ if(!window.__playlist?.length) return; index=(index+1)%window.__playlist.length; loadCurrent(); audio.play(); ping('next'); }
              function prev(){ if(!window.__playlist?.length) return; index=(index-1+window.__playlist.length)%window.__playlist.length; loadCurrent(); audio.play(); ping('prev'); }

              const tap = (id, fn) =>
                document.getElementById(id)?.addEventListener('click', fn);
              tap('btn-play', play);
              tap('btn-next', next);
              tap('btn-prev', prev);

              let lastTilt = 0;
              window.addEventListener('deviceorientation', (e)=>{
                if (Math.abs(e.gamma - lastTilt) > 50){
                  if (e.gamma > 40) next();
                  if (e.gamma < -40) prev();
                  lastTilt = e.gamma;
                }
              });

              function ping(action){
                const body = { action, index, sku: new URL(location.href).searchParams.get('sku') };
                navigator.sendBeacon('/api/analytics', JSON.stringify(body));
              }
            </script>
          `}}/>
        )}
      </div>

      <style jsx global>{`
        @import url('/styles/glass.css');
        body, html, #__next { margin:0; height:100%; background:#000; color:#fff; font-family: -apple-system, system-ui, Inter, Roboto, sans-serif; }
        :root{
          --glass-bg: rgba(255,255,255,0.08);
          --glass-stroke: rgba(255,255,255,0.22);
          --glass-highlight: rgba(255,255,255,0.35);
        }
        .glass-panel{
          backdrop-filter: blur(18px) saturate(140%);
          -webkit-backdrop-filter: blur(18px) saturate(140%);
          background: linear-gradient(180deg, var(--glass-bg), rgba(255,255,255,0.04));
          border: 1px solid var(--glass-stroke);
          border-radius: 18px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.35), inset 0 1px 0 var(--glass-highlight);
        }
        .glass-button{
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          background: rgba(255,255,255,0.10);
          border: 1px solid rgba(255,255,255,0.25);
          border-radius: 14px;
          padding: 12px 16px;
          color:#fff;
        }
        .caliphornia-chrome{ position: fixed; inset: 12px 12px auto 12px; display:flex; gap:10px; z-index:5; align-items:center;}
      `}</style>
    </>
  );
}
