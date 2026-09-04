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
        background: rgba(12, 12, 12, 0.88);
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
        resize: both; /* Native resize handle */
        min-width: 200px;
        min-height: 200px;
      }

      /* ── Horizontal bar layout ── */
      .panel.horizontal {
        width: 500px !important; height: auto !important; min-height: 80px;
        border-radius: 14px;
        resize: none; /* Disable resize in horizontal mode */
      }
      .panel.horizontal .lyrics {
        flex: 1; overflow: hidden; padding: 0 20px 14px;
        display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 4px;
        mask-image: none; -webkit-mask-image: none;
      }
      .panel.horizontal .progress { display: none; }
      .panel.horizontal .line { display: none; }
      .panel.horizontal .line.near {
        display: block; font-size: 12px; color: rgba(255,255,255,0.35); font-weight: 400; margin: 0;
      }
      .panel.horizontal .line.active {
        display: block; font-size: 18px; font-weight: 800;
        color: #fff; text-shadow: 0 0 15px rgba(255,255,255,0.3); margin: 0;
      }
      .panel.horizontal .empty { font-size: 13px; }

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
      .song-info { overflow: hidden; flex: 1; }
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
      .header-btns { display: flex; align-items: center; gap: 4px; margin-left: 8px; flex-shrink: 0; }
      .icon-btn {
        background: rgba(255,255,255,0.08);
        border: none;
        color: rgba(255,255,255,0.6);
        font-size: 14px;
        width: 26px; height: 26px;
        border-radius: 50%;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: background 0.2s, color 0.2s;
      }
      .icon-btn:hover { background: rgba(255,255,255,0.18); color: #fff; }

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

      /* ─── Progress slider ────────── */
      .progress {
        padding: 0 16px 14px;
        flex-shrink: 0;
        border-top: 1px solid rgba(255,255,255,0.07);
      }
      .slider-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding-top: 10px;
      }
      .time {
        font-size: 10px;
        color: rgba(255,255,255,0.4);
        min-width: 32px;
        font-variant-numeric: tabular-nums;
      }
      .time.right { text-align: right; }
      input[type=range] {
        -webkit-appearance: none;
        appearance: none;
        flex: 1;
        height: 4px;
        border-radius: 2px;
        background: rgba(255,255,255,0.15);
        outline: none;
        cursor: pointer;
        margin: 0;
      }
      input[type=range]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 0 6px rgba(0,0,0,0.4);
        cursor: pointer;
        transition: transform 0.15s;
      }
      input[type=range]::-webkit-slider-thumb:hover {
        transform: scale(1.3);
      }
      input[type=range]::-moz-range-thumb {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #fff;
        border: none;
        cursor: pointer;
      }
      .play-pause {
        background: #fff;
        border: none;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: transform 0.15s;
        margin-right: 4px;
      }
      .play-pause:hover { transform: scale(1.1); }
      .play-pause svg { width: 14px; height: 14px; fill: #000; }
    </style>

    <div class="panel" id="panel">
      <div class="header" id="drag-handle">
        <div class="song-info">
          <div class="title" id="title">Waiting for music…</div>
          <div class="artist" id="artist"></div>
        </div>
        <div class="header-btns">
          <button class="icon-btn" id="layout-btn" title="Toggle subtitle layout (Ctrl+Shift+M)">⊟</button>
          <button class="icon-btn" id="close-btn" title="Close">✕</button>
        </div>
      </div>
      <div class="lyrics" id="lyrics">
        <div class="empty">Play something on YouTube or YouTube Music.</div>
      </div>
      <div class="progress">
        <div class="slider-row">
          <button class="play-pause" id="play-pause" title="Play/Pause">
            <svg viewBox="0 0 24 24"><polygon points="6,4 20,12 6,20"/></svg>
          </button>
          <span class="time" id="time-cur">0:00</span>
          <input type="range" id="slider" min="0" max="100" value="0" step="0.1">
          <span class="time right" id="time-dur">0:00</span>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(host);

  // ── Drag & Resize logic ────────────────────────────────────────────────────
  const panel = shadow.getElementById('panel');
  let dragging = false, ox = 0, oy = 0;
  
  const abortCtrl = new AbortController();

  panel.addEventListener('mousedown', e => {
    // Don't drag if clicking buttons, inputs, or sliders
    if (e.target.closest('button, input')) return;
    
    // Don't drag if clicking the bottom-right corner (native resize handle)
    const r = panel.getBoundingClientRect();
    if (e.clientX > r.right - 25 && e.clientY > r.bottom - 25 && !panel.classList.contains('horizontal')) return;

    dragging = true;
    const hr = host.getBoundingClientRect();
    ox = e.clientX - hr.left;
    oy = e.clientY - hr.top;
    host.style.right = 'auto';
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    host.style.left = (e.clientX - ox) + 'px';
    host.style.top  = (e.clientY - oy) + 'px';
  }, { signal: abortCtrl.signal });
  document.addEventListener('mouseup', () => { 
    dragging = false; 
    if (!isHorizontal) {
       lastVertTop = host.style.top;
       lastVertLeft = host.style.left;
       lastVertRight = host.style.right;
    }
  }, { signal: abortCtrl.signal });

  shadow.getElementById('close-btn').addEventListener('click', () => {
    host.style.display = 'none';
  });

  // ── Layout toggle ────────────────────────────────────────────────────────────
  const layoutBtn = shadow.getElementById('layout-btn');
  let isHorizontal = false;
  let lastVertTop = '20px';
  let lastVertLeft = 'auto';
  let lastVertRight = '20px';
  let lastVertBottom = 'auto';

  function applyLayout(horiz) {
    isHorizontal = horiz;
    layoutBtn.textContent = horiz ? '☰' : '⊟';
    layoutBtn.title = horiz ? 'Switch to vertical layout' : 'Switch to horizontal subtitle layout';
    
    if (horiz) {
      // Save current vertical position before switching
      if (!panel.classList.contains('horizontal')) {
        lastVertTop = host.style.top;
        lastVertLeft = host.style.left;
        lastVertRight = host.style.right;
        lastVertBottom = host.style.bottom;
      }
      panel.classList.add('horizontal');
      Object.assign(host.style, { bottom: '30px', left: '50%', transform: 'translateX(-50%)', top: 'auto', right: 'auto' });
    } else {
      panel.classList.remove('horizontal');
      Object.assign(host.style, { bottom: lastVertBottom, left: lastVertLeft, transform: 'none', top: lastVertTop, right: lastVertRight });
    }
    chrome.storage.local.set({ overlayLayout: horiz ? 'horizontal' : 'vertical' });
  }

  // Load saved layout
  chrome.storage.local.get('overlayLayout', ({ overlayLayout }) => {
    applyLayout(overlayLayout === 'horizontal');
  });

  layoutBtn.addEventListener('click', () => applyLayout(!isHorizontal));

  // Listen for the keyboard shortcut from background script
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'TOGGLE_LAYOUT') {
      applyLayout(!isHorizontal);
    }
  });

  // ── State ────────────────────────────────────────────────────────────────────
  let currentSong = '';
  let lines = [];
  let activeIdx = -1;
  let isSeeking = false;
  let wasPlayingBeforeSeek = false;

  const lyricsEl   = shadow.getElementById('lyrics');
  const titleEl    = shadow.getElementById('title');
  const artistEl   = shadow.getElementById('artist');
  const sliderEl   = shadow.getElementById('slider');
  const timeCurEl  = shadow.getElementById('time-cur');
  const timeDurEl  = shadow.getElementById('time-dur');
  const playPauseEl = shadow.getElementById('play-pause');

  const playIcon  = '<svg viewBox="0 0 24 24"><polygon points="6,4 20,12 6,20"/></svg>';
  const pauseIcon = '<svg viewBox="0 0 24 24"><rect x="5" y="4" width="4" height="16"/><rect x="15" y="4" width="4" height="16"/></svg>';

  function formatTime(s) {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  // Slider seek logic
  sliderEl.addEventListener('input', () => { 
    if (!isSeeking) {
      isSeeking = true;
      chrome.storage.local.get('nowPlaying', ({ nowPlaying }) => {
        if (nowPlaying && nowPlaying.isPlaying) {
          wasPlayingBeforeSeek = true;
          chrome.storage.local.set({ explicitPause: Date.now() });
        } else {
          wasPlayingBeforeSeek = false;
        }
      });
    }
  });

  sliderEl.addEventListener('change', () => {
    const seekTime = parseFloat(sliderEl.value);
    chrome.storage.local.set({ seekTo: seekTime });
    isSeeking = false;
    
    if (wasPlayingBeforeSeek) {
      chrome.storage.local.set({ explicitPlay: Date.now() });
      wasPlayingBeforeSeek = false;
    }
  });

  playPauseEl.addEventListener('click', () => {
    chrome.storage.local.set({ togglePause: Date.now() });
  });

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
  const poller = setInterval(() => {
    try {
      if (!chrome.runtime.id) throw new Error('invalidated');

      chrome.storage.local.get('nowPlaying', ({ nowPlaying }) => {
        if (!nowPlaying || !nowPlaying.title) return;

        const { title, artist, currentTime, duration, isPlaying } = nowPlaying;

        if (!isSeeking && duration) {
          sliderEl.max = duration;
          sliderEl.value = currentTime;
        }
        timeCurEl.textContent = formatTime(currentTime);
        timeDurEl.textContent = formatTime(duration);

        playPauseEl.innerHTML = isPlaying ? pauseIcon : playIcon;
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

        if (lines.length) {
          let idx = -1;
          for (let i = 0; i < lines.length; i++) {
            if (currentTime >= lines[i].time) idx = i; else break;
          }
          if (idx >= 0) updateActive(idx);
        }
      });
    } catch (err) {
      clearInterval(poller);
      abortCtrl.abort();
      host.remove();
    }
  }, 500);
})();
