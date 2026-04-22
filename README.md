# Jefrix Global Data Analysis

A 3D interactive Earth explorer built as a military-intelligence briefing dashboard. Toggle data layers over a rotatable WebGL globe: geologic, geographic, climate, news, logistics, flights, cyber, satellites, conflicts — each with its own opacity slider so you can stack and emphasize.

![Screenshot placeholder — open `Global Data.html` to see the live dashboard.]

## Quick start

This is a static site — no build step, no dependencies to install.

```bash
# Clone
git clone https://github.com/jefrix/globaldata.git
cd globaldata

# Serve locally (any static server works)
python3 -m http.server 8000
# or:
npx serve .
```

Then open **http://localhost:8000/Global Data.html** in your browser.

> You can also just double-click `Global Data.html` to open it directly — but some browsers block loading the local `data/` and `globe/` scripts from `file://` URLs, so a local server is safer.

## Features

### 3D globe
- WebGL-rendered (Three.js), fully rotatable and zoomable
- Drag to rotate, scroll or on-screen `+` / `−` to zoom
- Auto-spin that pauses on interaction
- Bearing indicator, corner crosshairs, scanline overlay

### 9 toggleable data layers
Each layer has an independent **on/off toggle** and **opacity slider**, so you can dim background layers while highlighting focal data.

| Key | Layer       | What it shows                                              |
|----|-------------|------------------------------------------------------------|
| 1  | Geologic    | Rivers, mountain ranges with peak markers                  |
| 2  | Geographic  | Major cities, sized by population                          |
| 3  | Climate     | Rotating storm systems (hurricane/typhoon/cyclone) + wind  |
| 4  | News        | Events colored yellow→orange→red by source count (heat)    |
| 5  | Logistics   | Shipping lanes + container/oil/LNG vessels + truck routes  |
| 6  | Flights     | ~140 aircraft moving on great-circle routes between hubs   |
| 7  | Cyber       | Attack arcs origin→target, severity-colored                |
| 8  | Satellites  | LEO, MEO, GEO orbits with inclination                      |
| 9  | Conflicts   | Country-level threat shading (light red → dark red)        |

### Dashboard chrome
- **Top bar:** logo, classification banner, DTG (date-time-group) UTC clock, OP tag, reset-view button
- **Left rail:** 9 layer controls with hotkeys + heat-scale legend
- **Right rail:** inspector card + live event feed (filters by active layers)
- **Bottom bar:** live stats (flights tracked, vessels, satellites, news, cyber, conflicts, camera coords, zoom)
- **Click any globe point** → inspector opens with full detail

### Tweaks panel (press **T**)
- **Theme:** Tactical (cobalt) / Situation Room (amber) / HUD (cyan)
- **Data density:** sparse / normal / dense
- **Projection:** pure wireframe / +outlines / stipple
- Toggle grid, labels, auto-spin

## Hotkeys

| Key       | Action                 |
|-----------|------------------------|
| `1`–`9`   | Toggle layer 1–9       |
| `R`       | Reset camera           |
| `+` / `−` | Zoom in / out          |
| `T`       | Open Tweaks panel      |
| `Esc`     | Close inspector        |

## File structure

```
globaldata/
├── Global Data.html       # Entry point
├── app.jsx                # React UI (rails, chrome, tweaks, inspector)
├── style.css              # All styling + theme variables
├── README.md
├── data/
│   ├── coastlines.js      # Simplified world landmass polygons (window.COASTLINES)
│   ├── coastlines.json    # Source data
│   └── mockData.js        # All simulated feeds (window.MOCK_DATA)
└── globe/
    └── engine.js          # Three.js globe engine + layer builders
```

## Wiring in real data

All feeds are **simulated** out of the box. To plug in live sources, replace the generators in `data/mockData.js`:

| Layer      | Suggested free sources                                            |
|-----------|--------------------------------------------------------------------|
| Flights    | OpenSky Network API, ADSB.lol                                      |
| Logistics  | MarineTraffic (limited), AIS Hub, GlobalFishingWatch               |
| Climate    | NOAA GFS, Windy API, Open-Meteo, USGS earthquake feed              |
| News       | GDELT, NewsAPI, Common Crawl                                       |
| Cyber      | AbuseIPDB, Shadowserver, CERT feeds                                |
| Satellites | CelesTrak TLE data                                                 |
| Conflicts  | ACLED, GDELT event coding                                          |

Most of these need an API key and a CORS-safe proxy — you'll want a lightweight backend (Node/Python/Go) to fetch and normalize, then have the front-end poll your own endpoint.

The layer-building functions in `globe/engine.js` (`buildFlights`, `buildLogistics`, etc.) each read from `window.MOCK_DATA.<layerKey>` — swap that source and the globe will render it.

## Tech

- **Three.js r160** — WebGL globe rendering
- **React 18** — UI layer (in-browser Babel for `app.jsx`)
- **No bundler** — everything loads directly from CDN + local files
- Pure static hosting friendly (works on GitHub Pages, Netlify, Vercel drop, etc.)

## Deploying to GitHub Pages

1. In your repo, **Settings → Pages**
2. Source: **Deploy from a branch** → `main` → `/ (root)` → Save
3. Your site will be live at `https://jefrix.github.io/globaldata/Global Data.html` after a minute

## License

MIT — do what you want.

---

*Classification banner in the UI is a simulation prop. No real intelligence data is transmitted or displayed.*
