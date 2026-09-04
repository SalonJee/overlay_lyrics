# Lyrics Overlay Extension 🎵

A Manifest V3 Chromium extension that fetches synced lyrics for whatever you are playing on YouTube or YouTube Music. It displays them in a premium, Spotify-style floating, draggable overlay on **any active tab**!

## ✨ Features
* **Zero Backend:** Runs entirely locally using the open `lrclib.net` API.
* **Universal Overlay:** Play music in the background on YouTube, and open the lyrics overlay on whatever tab you're currently browsing (Reddit, GitHub, etc).
* **Spotify-style Aesthetics:** Smooth scrolling, blurred backgrounds, and bold active-line highlighting.
* **Dynamic Injection:** Keeps your browser fast by only injecting the UI when you explicitly toggle it.

---

## 🛠️ How to Install

Since this is a custom local extension, you need to load it manually into Chrome or Brave:

1. Open your browser and navigate to **`chrome://extensions/`** (or **`brave://extensions/`** if you use Brave).
2. In the top right corner, toggle **Developer mode** to ON.
3. Click the **Load unpacked** button in the top left.
4. Select this `lyrics_overlay` folder.
5. *(Recommended)* Click the puzzle piece icon 🧩 in your top right toolbar and "Pin" the Lyrics Overlay extension so it's always visible.

---

## 🎧 How to Use It

1. **Start the Music:** Open a tab with [YouTube Music](https://music.youtube.com) or a regular [YouTube](https://youtube.com) video.
2. **Go Anywhere:** Navigate to any normal webpage or stay on the YouTube tab.
3. **Toggle the Lyrics:** Simply **click the Lyrics Overlay icon** in your toolbar. The lyrics panel will appear (or disappear if it's already showing). That's it — one click!

---

## ⌨️ Optional: Keyboard Shortcut

You can also set up a keyboard shortcut so you never have to click at all:

1. Go to **`chrome://extensions/shortcuts`** (or **`brave://extensions/shortcuts`**).
2. Scroll down to **"Lyrics Overlay"**.
3. Next to **"Toggle lyrics overlay on active tab"**, click the pencil icon ✏️ and press your desired key combo (e.g., `Ctrl+Shift+L`).
4. Done! Now that shortcut will show/hide the lyrics instantly.

---

## ⚠️ Troubleshooting

* **"Waiting for music..." is stuck:** You must **refresh your YouTube tab** (`Ctrl+R`) after installing or updating the extension, so the tracking script can load.
* **Nothing happens when I click:** Chrome/Brave **forbids** extensions from injecting into system pages (`chrome://`, `brave://`, the Web Store, empty New Tab). You must be on a regular website.
* **Lyrics not found:** On regular YouTube, the extension parses the video title (e.g. "Artist - Title"). Odd titles may not match. YouTube Music works perfectly since it has structured metadata.