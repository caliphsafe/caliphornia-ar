import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';

const verifyToken = async (tok, sku) => {
  if (!tok) return false;
  const res = await fetch(`/api/token/verify?tok=${encodeURIComponent(tok)}&sku=${encodeURIComponent(sku||'')}`);
  const j = await res.json();
  return j.ok === true;
};

function ARPage(){
  const [ready, setReady] = useState(false);
  const [gated, setGated] = useState(true);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('Loading AR engine…');
  const sceneRef = useRef(null);

  useEffect(() => {
    const u = new URL(window.location.href);
    const tok = u.searchParams.get('tok') || '';
    const sku = u.searchParams.get('sku') || '';
    fetch(`/api/playlist?sku=${encodeURIComponent(sku)}`).catch(()=>{});
    (async()=>{
      const ok = await verifyToken(tok, sku);
      setGated(!ok);
    })();
  }, []);

  // ---- Load scripts (local A-Frame only + Zappar) ----
  async function loadScripts() {
    if (typeof window === 'undefined') return;
    setReady(false);
    setStatus('Loading A-Frame…');

    const loadScript = (src) => new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.crossOrigin = 'anonymous';
      s.onload = () => resolve(src);
      s.onerror = () => reject(new Error('Failed ' + src));
      document.head.appendChild(s);
    });

    const AFRAME_SOURCES = [ '/vendor/aframe/aframe.min.js?v=1' ]; // local
    const ZAPPAR_SOURCES = [
      '/vendor/zappar/zappar-aframe.js?v=1',
      'https://unpkg.com/@zappar/zappar-aframe@2.2.2/dist/zappar-aframe.js'
    ];

    let afOk = false;
    for (const src of AFRAME_SOURCES) {
      try { await loadScript(src); afOk = true; setStatus('A-Frame loaded'); break; }
      catch { setStatus('A-Frame failed. Tap retry.'); }
    }
    if (!afOk && window.AFRAME) afOk = true;
    if (!afOk) return;

    let zapOk = false;
    setStatus('Loading Zappar…');
    for (const src of ZAPPAR_SOURCES) {
      try { await loadScript(src); zapOk = true; setStatus('Zappar loaded'); break; }
      catch { setStatus('Retrying Zappar…'); }
    }
    if (!zapOk) { setStatus('Zappar failed. Tap retry.'); return; }

    setReady(true);
  }

  useEffect(() => { loadScripts(); }, []);

  async function joinMailingList() {
    const res = await fetch('/api/token/mint', {
      method:'POST', headers:{'Content-Type':'application/json'},
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

      {/* Top chrome */}
      <div className="caliphornia-chrome glass-panel" style={{padding:10}}>
        <img src="/ui/caliphornia-logo.svg" alt="Caliphornia" height={22}/>
        <div style={{marginLeft:8, fontWeight:600}}>AR Player</div>
      </div>

      {/* Now Playing (overlay) */}
      <div id="np" className="glass-panel np-card" style={{display:'none'}}>
        <img id="npCover" alt="" />
        <div className="np-text">
          <div id="npTitle" className="np-title">—</div>
          <div id="npArtist" className="np-artist">—</div>
        </div>
      </div>

      {/* Portrait HUD controls */}
      {!gated && (
        <div id="hud" style={{
          position:'fixed', left:0, right:0, bottom:14, zIndex:7,
          display:'flex', gap:12, justifyContent:'center', alignItems:'center'
        }}>
          <button id="hPrev" className="glass-button">◀︎</button>
          <button id="hPlay" className="glass-button">Play/Pause</button>
          <button id="hNext" className="glass-button">▶︎</button>
        </div>
      )}

      {/* Email Gate */}
      {gated && (
        <div style={{ position:'fixed', inset:0, display:'grid', placeItems:'center',
          background:'radial-gradient(ellipse at center, rgba(0,0,0,0.75), rgba(0,0,0,0.9))', zIndex:10 }}>
          <div className="glass-panel" style={{width:320, padding:20}}>
            <h3 style={{margin:'0 0 10px'}}>Join Caliphornia</h3>
            <p style={{opacity:0.9, margin:'0 0 12px'}}>Enter your email to unlock the AR playlist.</p>
            <input type="email" placeholder="you@domain.com" value={email}
              onChange={e=>setEmail(e.target.value)}
              className="glass-button" style={{width:'100%', marginBottom:10}}/>
            <button className="glass-button" style={{width:'100%'}} onClick={joinMailingList}>Unlock</button>
            <p style={{opacity:0.6, fontSize:12, marginTop:10}}>Scan your hoodie’s wrist QR to access exclusive drops.</p>
          </div>
        </div>
      )}

      {/* Loading HUD with retry */}
      {!gated && !ready && (
        <div style={{ position:'fixed', inset:0, display:'grid', placeItems:'center', zIndex:6 }}>
          <div className="glass-panel" style={{padding:'12px 16px', fontSize:14, display:'flex', gap:10, alignItems:'center'}}>
            <span>{status}</span>
            <button className="glass-button" onClick={loadScripts}>Retry</button>
          </div>
        </div>
      )}

      {/* AR Scene */}
      <div ref={sceneRef} style={{position:'fixed', inset:0, background:'transparent'}}>
        {ready && !gated && (
          <div dangerouslySetInnerHTML={{__html: `
            <pre id="dbg" style="position:fixed;left:8px;bottom:64px;z-index:6;color:#9cf;background:rgba(0,0,0,.45);padding:6px 8px;border-radius:8px;max-width:70vw;max-height:40vh;overflow:auto;font-size:10px;display:block"></pre>

            <audio id="player" crossorigin="anonymous" preload="auto" playsinline webkit-playsinline></audio>

            <button id="start" class="glass-button"
              style="position:fixed;left:50%;transform:translateX(-50%);bottom:110px;z-index:7;"
              onclick="window.__startAR&&window.__startAR()">
              Start AR & Audio
            </button>

            <a-scene
              renderer="alpha: true; antialias: true; physicallyCorrectLights: true; colorManagement: true"
              background="transparent: true"
              zappar="pipeline: cameraPipeline"
              vr-mode-ui="enabled: false"
              device-orientation-permission-ui="enabled: false"
              embedded
              style="position:fixed; inset:0;">

              <a-entity id="cameraPipeline"></a-entity>
              <!-- Let these UIs prompt for camera/motion; no manual getUserMedia -->
              <a-entity zappar-permissions-ui></a-entity>
              <a-entity zappar-compatibility-ui></a-entity>

              <a-entity id="zapparCamera" camera zappar-camera="userFacing: false;"></a-entity>

              <!-- Instant placement anchor (tap once to place) -->
              <a-entity id="anchor" zappar-instant="placement-mode: true">
                <a-plane id="panel" position="0 0 -1" width="0.95" height="0.56"
                  material="src: /ui/panel.svg; transparent: true;"></a-plane>

                <a-image id="cover3d" src="/ui/cover-fallback.png" position="-0.32 0.06 -0.99" width="0.20" height="0.20"></a-image>
                <a-entity id="title3d" text="value: ; color: #FFFFFF; width: 1.1; wrapCount: 18"
                          position="-0.05 0.11 -0.99"></a-entity>
                <a-entity id="artist3d" text="value: ; color: #DDDDDD; width: 1.1; wrapCount: 22"
                          position="-0.05 0.02 -0.99"></a-entity>
              </a-entity>
            </a-scene>

            <script>
              const dbg = document.getElementById('dbg');
              const startBtn = document.getElementById('start');
              function log(m){ try{ dbg.textContent += (m+'\\n'); }catch(e){} }
              function setBtn(t){ try{ startBtn.textContent = t; }catch(e){} }

              let index = 0;
              const audio = document.getElementById('player');

              // HTML HUD controls (portrait)
              const hPrev = document.getElementById('hPrev');
              const hNext = document.getElementById('hNext');
              const hPlay = document.getElementById('hPlay');

              function updateNowPlayingUI(track){
                try{
                  const np = document.getElementById('np');
                  const cov = document.getElementById('npCover');
                  const t = document.getElementById('npTitle');
                  const a = document.getElementById('npArtist');
                  if (track){ if (cov) cov.src = track.cover||''; if (t) t.textContent = track.title||''; if (a) a.textContent = track.artist||''; if (np) np.style.display='flex'; }
                  else { if (np) np.style.display='none'; }
                  const c3d=document.getElementById('cover3d'); const t3d=document.getElementById('title3d'); const a3d=document.getElementById('artist3d');
                  if (c3d && track && track.cover) c3d.setAttribute('src', track.cover);
                  if (t3d) t3d.setAttribute('text', 'value', track?.title||'');
                  if (a3d) a3d.setAttribute('text', 'value', track?.artist||'');
                }catch(e){ log('updateUI fail'); }
              }

              function loadCurrent(){
                const list = window.__playlist||[]; const track=list[index];
                if (!track){ log('no track'); return false; }
                audio.src = track.url||''; audio.load(); updateNowPlayingUI(track); log('loaded: '+(track.title||'')); return true;
              }

              function ensurePlaylistLoaded(){
                return new Promise((resolve) => {
                  if (window.__playlist && window.__playlist.length) return resolve(true);
                  fetch('/api/playlist'+window.location.search)
                    .then(r=>r.json())
                    .then(j => { window.__playlist = j.tracks||[]; log('tracks:'+window.__playlist.length); resolve(true); })
                    .catch(()=> resolve(false));
                });
              }

              // iOS motion permission (audio shake/tilt). Camera permission is handled by zappar-permissions-ui.
              async function requestMotion(){
                try{
                  if (typeof DeviceMotionEvent!=='undefined' && typeof DeviceMotionEvent.requestPermission==='function'){
                    const st = await DeviceMotionEvent.requestPermission(); log('motion: '+st); return st==='granted';
                  }
                }catch(e){ log('motion denied'); }
                return true;
              }

              fetch('/api/playlist'+window.location.search)
                .then(r=>r.json())
                .then(j => { window.__playlist = j.tracks||[]; log('preload tracks:'+window.__playlist.length); });

              // First document tap exits placement mode so the panel anchors
              document.addEventListener('click', () => {
                const anchor = document.getElementById('anchor');
                try{
                  const cfg = anchor.getAttribute('zappar-instant');
                  if (cfg && cfg.placementMode){ anchor.setAttribute('zappar-instant','placement-mode: false'); log('anchor placed'); }
                }catch(e){}
              }, { once: true });

              window.__startAR = async () => {
                log('start tap'); setBtn('Loading…');
                const gotList = await ensurePlaylistLoaded();
                const motOK = await requestMotion();
                if (!gotList){ setBtn('Retry: Load Playlist'); return; }
                const ok = loadCurrent(); if (!ok){ setBtn('No Tracks — Retry'); return; }
                let audioOK=false; try{ await audio.play(); audioOK=true; log('audio: play ok'); }catch(e){ log('audio: play blocked'); }
                if (!audioOK){ setBtn('Tap to Unmute / Play'); return; }
                startBtn.style.display='none';
              };

              function playPause(){ if (audio.paused) audio.play(); else audio.pause(); }
              function next(){ if(!window.__playlist?.length) return; index=(index+1)%window.__playlist.length; loadCurrent(); audio.play(); }
              function prev(){ if(!window.__playlist?.length) return; index=(index-1+window.__playlist.length)%window.__playlist.length; loadCurrent(); audio.play(); }
              hPlay?.addEventListener('click', playPause);
              hNext?.addEventListener('click', next);
              hPrev?.addEventListener('click', prev);

              let lastTilt=0;
              window.addEventListener('deviceorientation',(e)=>{
                if (Math.abs(e.gamma-lastTilt)>50){ if (e.gamma>40) next(); if (e.gamma<-40) prev(); lastTilt=e.gamma; }
              });
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

export default dynamic(() => Promise.resolve(ARPage), { ssr: false });
