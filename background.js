// background.js — fetches lyrics and caches them in storage

const cache = {};

function parseLrc(lrc) {
  return lrc.split('\n').reduce((acc, line) => {
    const m = line.match(/\[(\d{2}):(\d{2})[.:](\d{2,3})\](.*)/);
    if (m) {
      const t = +m[1] * 60 + +m[2] + +m[3] / (m[3].length === 2 ? 100 : 1000);
      acc.push({ time: t, text: m[4].trim() });
    }
    return acc;
  }, []);
}

async function fetchLyrics(title, artist) {
  const key = `${title}|||${artist}`;
  if (cache[key] !== undefined) return cache[key];

  try {
    const url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`;
    const res = await fetch(url);
    if (!res.ok) { cache[key] = []; return []; }
    const data = await res.json();
    const lines = data.syncedLyrics ? parseLrc(data.syncedLyrics) : [];
    cache[key] = lines;
    return lines;
  } catch {
    cache[key] = [];
    return [];
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'GET_LYRICS') {
    fetchLyrics(msg.title, msg.artist).then(lines => sendResponse({ lines }));
    return true; // keep channel open for async
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-lyrics') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['overlay_content.js']
      }).catch(err => console.error("Could not inject:", err));
    }
  }
});

chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['overlay_content.js']
  }).catch(err => console.error("Could not inject:", err));
});
