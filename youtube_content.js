// youtube_content.js — robust polling approach (handles YouTube SPA navigation)

let lastVideo = null;
let lastWrite = 0;

function getMeta() {
  if (location.hostname === 'music.youtube.com') {
    return {
      title:  document.querySelector('.title.ytmusic-player-bar')?.textContent?.trim() || '',
      artist: document.querySelector('.byline.ytmusic-player-bar a')?.textContent?.trim() || ''
    };
  }

  const heading =
    document.querySelector('h1.ytd-watch-metadata yt-formatted-string')?.textContent?.trim() ||
    document.querySelector('#title h1 yt-formatted-string')?.textContent?.trim() ||
    document.title.replace(' - YouTube', '').trim();

  const m = heading.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  return {
    title:  m ? m[2].trim() : heading,
    artist: m ? m[1].trim() : (document.querySelector('#channel-name #text a')?.textContent?.trim() || '')
  };
}

function writeState(video) {
  const now = Date.now();
  if (now - lastWrite < 400) return; // throttle to ~2.5Hz
  lastWrite = now;
  const { title, artist } = getMeta();
  if (!title) return;
  chrome.storage.local.set({
    nowPlaying: { title, artist, currentTime: video.currentTime }
  });
}

// Poll every 1s: always grab the current <video> and re-attach if it changed
setInterval(() => {
  const video = document.querySelector('video');
  if (!video) { lastVideo = null; return; }

  if (video !== lastVideo) {
    lastVideo = video;
    video.addEventListener('timeupdate', () => writeState(video));
  }
}, 1000);
