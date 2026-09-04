// overlay_content.js — injected on demand, renders floating Spotify-style lyrics

(function () {
  // If already injected, just toggle visibility
  const existing = document.getElementById('__lyrics-overlay__');
  if (existing) {
    existing.style.display = existing.style.display === 'none' ? 'flex' : 'none';
    return;
  }

  // ── Build shadow-DOM widget ──────────────────────────────────────────────────
  const host = document.createElement('div');
  host.id = '__lyrics-overlay__';
  Object.assign(host.style, {
    position: 'fixed', top: '20px', right: '20px',
    zIndex: '2147483647', display: 'flex'
  });

  const shadow = host.attachShadow({ mode: 'open' });

  shadow.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');

      :host { all: initial; }

      .panel {
        font-family: 'Inter', sans-serif;
        width: 300px;
        height: 480px;
        background: rgba(12, 12, 12, 0.82);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 20px;
        box-shadow: 0 24px 60px rgba(0,0,0,0.7);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        cursor: default;
        user-select: none;
      }

      /* ─── Header ─────────────────── */
      .header {
        padding: 14px 16px 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid rgba(255,255,255,0.07);
        cursor: grab;
        flex-shrink: 0;
      }
      .header:active { cursor: grabbing; }
      .song-info { overflow: hidden; }
      .title {
        font-size: 13px;
        font-weight: 700;
        color: #fff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .artist {
        font-size: 11px;
        color: rgba(255,255,255,0.45);
        margin-top: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .close {
        background: rgba(255,255,255,0.08);
        border: none;
        color: rgba(255,255,255,0.6);
        font-size: 14px;
        width: 24px; height: 24px;
        border-radius: 50%;
        cursor: pointer;
        flex-shrink: 0;
        margin-left: 8px;
        transition: background 0.2s;
        display: flex; align-items: center; justify-content: center;
      }
      .close:hover { background: rgba(255,255,255,0.18); color: #fff; }

      /* ─── Lyrics scroll area ─────── */
      .lyrics {
        flex: 1;
        overflow-y: auto;
        padding: 24px 20px;
        scroll-behavior: smooth;
        scrollbar-width: none;
        mask-image: linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%);
        -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%);
      }
      .lyrics::-webkit-scrollbar { display: none; }

      .line {
        font-size: 15px;
        line-height: 1.55;
        color: rgba(255,255,255,0.28);
        margin: 12px 0;
        text-align: center;
        transition: color 0.4s ease, font-size 0.35s ease, font-weight 0.35s ease;
      }
      .line.active {
        font-size: 22px;
        font-weight: 800;
        color: #fff;
        text-shadow: 0 0 20px rgba(255,255,255,0.25);
      }
      .line.near {
        font-size: 17px;
        font-weight: 600;
        color: rgba(255,255,255,0.6);
      }

      .empty {
        display: flex; align-items: center; justify-content: center;
        height: 100%; color: rgba(255,255,255,0.3);
        font-size: 13px; text-align: center; padding: 20px;
      }
    </style>

    <div class="panel" id="panel">
      <div class="header" id="drag-handle">
        <div class="song-info">
          <div class="title" id="title">Waiting for music…</div>
          <div class="artist" id="artist"></div>
        </div>
        <button class="close" id="close-btn">✕</button>
      </div>
      <div class="lyrics" id="lyrics">
        <div class="empty">Play something on YouTube or YouTube Music.</div>
      </div>
    </div>
  `;

  document.body.appendChild(host);

  // ── Drag logic ───────────────────────────────────────────────────────────────
  const panel = shadow.getElementById('panel');
  const handle = shadow.getElementById('drag-handle');
  let dragging = false, ox = 0, oy = 0;

  handle.addEventListener('mousedown', e => {
    dragging = true;
    const r = host.getBoundingClientRect();
    ox = e.clientX - r.left;
    oy = e.clientY - r.top;
    host.style.right = 'auto';
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    host.style.left = (e.clientX - ox) + 'px';
    host.style.top  = (e.clientY - oy) + 'px';
  });
  document.addEventListener('mouseup', () => { dragging = false; });

  shadow.getElementById('close-btn').addEventListener('click', () => {
    host.style.display = 'none';
  });

  // ── State ────────────────────────────────────────────────────────────────────
  let currentSong = '';
  let lines = [];
  let activeIdx = -1;

  const lyricsEl = shadow.getElementById('lyrics');
  const titleEl  = shadow.getElementById('title');
  const artistEl = shadow.getElementById('artist');

  function renderLines() {
    lyricsEl.innerHTML = '';
    if (!lines.length) {
      lyricsEl.innerHTML = '<div class="empty">No synced lyrics found for this song.</div>';
      return;
    }
    lines.forEach((l, i) => {
      const d = document.createElement('div');
      d.className = 'line';
      d.textContent = l.text || '♪';
      d.dataset.i = i;
      lyricsEl.appendChild(d);
    });
  }

  function updateActive(idx) {
    if (idx === activeIdx || !lines.length) return;
    activeIdx = idx;
    const allLines = lyricsEl.querySelectorAll('.line');
    allLines.forEach((el, i) => {
      const diff = Math.abs(i - idx);
      el.className = 'line' + (i === idx ? ' active' : diff === 1 ? ' near' : '');
    });
    const activeEl = allLines[idx];
    if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ── Poll chrome.storage.local every 500ms ────────────────────────────────────
  setInterval(() => {
    chrome.storage.local.get('nowPlaying', ({ nowPlaying }) => {
      if (!nowPlaying || !nowPlaying.title) return;

      const { title, artist, currentTime } = nowPlaying;
      const songKey = `${title}|||${artist}`;

      titleEl.textContent  = title  || 'Unknown';
      artistEl.textContent = artist || '';

      if (songKey !== currentSong) {
        currentSong = songKey;
        activeIdx = -1;
        lines = [];
        lyricsEl.innerHTML = '<div class="empty">Fetching lyrics…</div>';

        chrome.runtime.sendMessage({ type: 'GET_LYRICS', title, artist }, res => {
          lines = res?.lines || [];
          renderLines();
        });
      }

      // Find active line
      if (lines.length) {
        let idx = -1;
        for (let i = 0; i < lines.length; i++) {
          if (currentTime >= lines[i].time) idx = i; else break;
        }
        if (idx >= 0) updateActive(idx);
      }
    });
  }, 500);
})();
