// youtube_content.js — robust polling + seek support

let lastVideo = null;
let lastWrite = 0;
let lastMetaKey = '';

function getMeta() {
  if (location.hostname === 'music.youtube.com') {
    return {
      title: document.querySelector('.title.ytmusic-player-bar')?.textContent?.trim() || '',
      artist: document.querySelector('.byline.ytmusic-player-bar a')?.textContent?.trim() || ''
    };
  }

  const heading =
    document.querySelector('h1.ytd-watch-metadata yt-formatted-string')?.textContent?.trim() ||
    document.querySelector('#title h1 yt-formatted-string')?.textContent?.trim() ||
    document.title.replace(' - YouTube', '').trim();

  const m = heading.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  return {
    title: m ? m[2].trim() : heading,
    artist: m ? m[1].trim() : (document.querySelector('#channel-name #text a')?.textContent?.trim() || '')
  };
}

// `force` bypasses the 400ms write throttle — used when we already know the
// song changed (poll-detected) or a manual resync was requested, so we don't
// end up waiting on the throttle window before the correct data goes out.
function writeState(video, force = false) {
  const now = Date.now();
  if (!force && now - lastWrite < 400) return;
  lastWrite = now;
  const { title, artist } = getMeta();
  if (!title) return;
  lastMetaKey = `${title}|||${artist}`;
  chrome.storage.local.set({
    nowPlaying: {
      title,
      artist,
      currentTime: video.currentTime,
      duration: video.duration || 0,
      isPlaying: !video.paused
    }
  });
}

// Listen for seek + pause commands from the overlay
chrome.storage.onChanged.addListener((changes) => {
  if (changes.seekTo && changes.seekTo.newValue !== undefined && lastVideo) {
    lastVideo.currentTime = changes.seekTo.newValue;
    chrome.storage.local.remove('seekTo');
  }
  if (changes.togglePause && changes.togglePause.newValue !== undefined && lastVideo) {
    if (lastVideo.paused) lastVideo.play();
    else lastVideo.pause();
    chrome.storage.local.remove('togglePause');
  }
  if (changes.explicitPause && changes.explicitPause.newValue !== undefined && lastVideo) {
    lastVideo.pause();
    chrome.storage.local.remove('explicitPause');
  }
  if (changes.explicitPlay && changes.explicitPlay.newValue !== undefined && lastVideo) {
    lastVideo.play();
    chrome.storage.local.remove('explicitPlay');
  }
});

// Force an immediate resync on request (e.g. the overlay's reload button).
// This is the real equivalent of "close + reopen": it re-reads the page's
// current title/artist right now instead of waiting for the next timeupdate.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'FORCE_RESYNC') {
    const video = lastVideo || document.querySelector('video');
    if (video) {
      lastVideo = video;
      writeState(video, true);
      sendResponse({ ok: true });
    } else {
      sendResponse({ ok: false, reason: 'no-video' });
    }
    return false; // handled synchronously
  }
});

// Poll every 1s: grab the current <video> and re-attach if it changed.
// Also compare the on-page title/artist every tick and write immediately if
// it changed — this is what actually catches track changes reliably, since
// `timeupdate` can stall or lag during a transition between songs.
setInterval(() => {
  const video = document.querySelector('video');
  if (!video) { lastVideo = null; return; }

  if (video !== lastVideo) {
    lastVideo = video;
    video.addEventListener('timeupdate', () => writeState(video));
  }

  const { title, artist } = getMeta();
  if (title) {
    const metaKey = `${title}|||${artist}`;
    if (metaKey !== lastMetaKey) {
      writeState(video, true); // song actually changed — resync now, no throttle
    }
  }
}, 1000);