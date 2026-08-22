/**
 * Analog SVG gauges for the economic control room.
 * Tachometer / RPM-meter faces. No external chart library.
 *
 * API: ECRGauges.draw(container, { value, min, max, major, minor, bands, status, label })
 */
(function (global) {
  "use strict";

  // SVG y-down: 0° = 3 o'clock, 90° = 6 o'clock, 180° = 9 o'clock, 270° = 12 o'clock.
  // 270° clockwise sweep from 7:30 to 4:30, hub at bottom-center, scale across the top.
  const START = (135 * Math.PI) / 180;
  const SWEEP = (270 * Math.PI) / 180;

  const VB_W = 288;
  const VB_H = 252;

  let gid = 0;

  function clamp(n, a, b) {
    return Math.min(b, Math.max(a, n));
  }

  function angleOf(value, min, max) {
    const t = clamp((value - min) / (max - min || 1), 0, 1);
    return START + t * SWEEP;
  }

  function pt(cx, cy, r, ang) {
    return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
  }

  function arc(cx, cy, r, a0, a1) {
    // Clockwise in SVG (sweep-flag 1) from a0 to a1.
    let delta = a1 - a0;
    while (delta < 0) delta += Math.PI * 2;
    while (delta >= Math.PI * 2) delta -= Math.PI * 2;
    const large = delta > Math.PI ? 1 : 0;
    const [x0, y0] = pt(cx, cy, r, a0);
    const [x1, y1] = pt(cx, cy, r, a1);
    return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  }

  function statusColor(status) {
    if (status === "alarm") return "#e23b2f";
    if (status === "watch") return "#ffe14a";
    return "#3dcc6f";
  }

  function mixHex(hex, toward, t) {
    const h = String(hex || "").replace("#", "");
    if (h.length !== 6) return hex;
    const o = toward === "w" ? 255 : 0;
    const n = (i) => {
      const v = parseInt(h.slice(i, i + 2), 16);
      return Math.round(v + (o - v) * t);
    };
    const r = n(0), gv = n(2), b = n(4);
    return "#" + [r, gv, b].map((x) => x.toString(16).padStart(2, "0")).join("");
  }

  function formatLabel(v, major) {
    const n = Number(v.toFixed(6));
    const majorWhole = Math.abs(major - Math.round(major)) < 1e-9;
    const valueWhole = Math.abs(n - Math.round(n)) < 1e-6;
    let body;
    if (majorWhole && valueWhole) {
      body = String(Math.abs(Math.round(n)));
    } else {
      body = Math.abs(n).toFixed(1);
    }
    return n < 0 ? "\u2212" + body : body;
  }

  function draw(container, opts) {
    const min = opts.min ?? 0;
    const max = opts.max ?? 10;
    const value = Number(opts.value);
    const bands = opts.bands || [];
    const status = opts.status || "ok";
    const major = opts.major ?? 2;
    const minor = opts.minor ?? 0.5;
    const needleColor = opts.needleColor || statusColor(status);
    const needleHi = mixHex(needleColor, "w", 0.45);
    const needleLo = mixHex(needleColor, "k", 0.35);

    const cx = 144;
    const cy = 140;

    const rBezel = 124;
    const rFace = 119;
    const rBand = 114;
    const rLabel = 100;
    const rTickOut = 86;
    const rTickMajorIn = 70;
    const rTickMinorIn = 78;
    const rTrack = 87;
    const rNeedle = 96;

    const uid = ++gid;
    const faceId = "ecr-face-" + uid;
    const hubId = "ecr-hub-" + uid;
    const needleId = "ecr-ndl-" + uid;
    const haloId = "ecr-halo-" + uid;

    const ticks = [];
    const labels = [];
    const nSteps = Math.round((max - min) / minor);
    for (let i = 0; i <= nSteps; i++) {
      const v = min + i * minor;
      const dist = v - min;
      const isMajor = Math.abs(Math.round(dist / major) * major - dist) < 1e-6;
      const ang = angleOf(v, min, max);
      const r0 = isMajor ? rTickMajorIn : rTickMinorIn;
      const [x0, y0] = pt(cx, cy, r0, ang);
      const [x1, y1] = pt(cx, cy, rTickOut, ang);
      ticks.push(
        `<line class="${isMajor ? "ecr-tick-major" : "ecr-tick-minor"}" x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="${isMajor ? "#ddd6c6" : "#6a6458"}" stroke-width="${isMajor ? 2.2 : 1}" stroke-linecap="butt"/>`
      );
      if (isMajor) {
        const [tx, ty] = pt(cx, cy, rLabel, ang);
        labels.push(
          `<text class="ecr-scale" x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" fill="#e8e2d2" stroke="#070809" stroke-width="3.8" paint-order="stroke fill" stroke-linejoin="round" font-size="16" font-weight="600" font-family="IBM Plex Mono, ui-monospace, monospace" filter="url(#${haloId})">${formatLabel(v, major)}</text>`
        );
      }
    }

    const bandPaths = bands.map((b) => {
      const a0 = angleOf(b.from, min, max);
      const a1 = angleOf(b.to, min, max);
      return `<path d="${arc(cx, cy, rBand, a0, a1)}" fill="none" stroke="${b.color}" stroke-width="6.5" stroke-linecap="butt" opacity="0.95"/>`;
    });

    let needle = "";
    if (Number.isFinite(value)) {
      const ang = angleOf(value, min, max);
      const perp = ang + Math.PI / 2;
      const tip = pt(cx, cy, rNeedle, ang);
      const shoulderR = 18;
      const shoulderW = 3.6;
      const tailR = -20;
      const tailW = 5.4;
      const shL = [
        cx + shoulderR * Math.cos(ang) + shoulderW * Math.cos(perp),
        cy + shoulderR * Math.sin(ang) + shoulderW * Math.sin(perp),
      ];
      const shR = [
        cx + shoulderR * Math.cos(ang) - shoulderW * Math.cos(perp),
        cy + shoulderR * Math.sin(ang) - shoulderW * Math.sin(perp),
      ];
      const tlL = [
        cx + tailR * Math.cos(ang) + tailW * Math.cos(perp),
        cy + tailR * Math.sin(ang) + tailW * Math.sin(perp),
      ];
      const tlR = [
        cx + tailR * Math.cos(ang) - tailW * Math.cos(perp),
        cy + tailR * Math.sin(ang) - tailW * Math.sin(perp),
      ];
      const hi = pt(cx, cy, rNeedle * 0.58, ang);
      needle = `
        <polygon class="ecr-needle" points="${tip[0].toFixed(1)},${tip[1].toFixed(1)} ${shL[0].toFixed(1)},${shL[1].toFixed(1)} ${tlL[0].toFixed(1)},${tlL[1].toFixed(1)} ${tlR[0].toFixed(1)},${tlR[1].toFixed(1)} ${shR[0].toFixed(1)},${shR[1].toFixed(1)}" fill="url(#${needleId})" stroke="#1a1208" stroke-width="0.55" stroke-linejoin="round"/>
        <line x1="${cx}" y1="${cy}" x2="${hi[0].toFixed(1)}" y2="${hi[1].toFixed(1)}" stroke="${needleHi}" stroke-opacity="0.55" stroke-width="1.1"/>`;
    }

    const svg = `
      <svg class="ecr-gauge-svg" viewBox="0 0 ${VB_W} ${VB_H}" role="img" aria-label="${escapeAttr(opts.label || "gauge")}">
        <defs>
          <radialGradient id="${faceId}" cx="46%" cy="38%" r="68%">
            <stop offset="0%" stop-color="#222830"/>
            <stop offset="55%" stop-color="#101418"/>
            <stop offset="100%" stop-color="#07090b"/>
          </radialGradient>
          <radialGradient id="${hubId}" cx="38%" cy="32%" r="70%">
            <stop offset="0%" stop-color="#f4efe4"/>
            <stop offset="28%" stop-color="#c8c0b0"/>
            <stop offset="62%" stop-color="#7a7264"/>
            <stop offset="100%" stop-color="#2a2418"/>
          </radialGradient>
          <linearGradient id="${needleId}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${needleHi}"/>
            <stop offset="50%" stop-color="${needleColor}"/>
            <stop offset="100%" stop-color="${needleLo}"/>
          </linearGradient>
          <filter id="${haloId}" x="-50%" y="-50%" width="200%" height="200%">
            <feMorphology in="SourceAlpha" operator="dilate" radius="1.25" result="wide"/>
            <feFlood flood-color="#070809" flood-opacity="0.92" result="ink"/>
            <feComposite in="ink" in2="wide" operator="in" result="halo"/>
            <feMerge>
              <feMergeNode in="halo"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <circle cx="${cx}" cy="${cy}" r="${rBezel}" fill="#1b1712" stroke="#4a4030" stroke-width="3.5"/>
        <circle cx="${cx}" cy="${cy}" r="${rFace}" fill="url(#${faceId})" stroke="#2a2620" stroke-width="1"/>
        <path d="${arc(cx, cy, rTrack, START, START + SWEEP)}" fill="none" stroke="#2e2a22" stroke-width="8" stroke-linecap="butt"/>
        ${bandPaths.join("")}
        ${ticks.join("")}
        ${labels.join("")}
        ${needle}
        <circle cx="${cx}" cy="${cy}" r="13.5" fill="url(#${hubId})" stroke="#d4cbb8" stroke-width="1.5"/>
        <circle cx="${cx}" cy="${cy}" r="8.6" fill="#1c140c" stroke="${needleColor}" stroke-width="1.8"/>
        <circle cx="${cx}" cy="${cy}" r="4.1" fill="${needleColor}"/>
        <circle cx="${cx}" cy="${cy}" r="1.6" fill="#ffe9b0"/>
      </svg>`;

    container.innerHTML = svg;
  }

  function escapeAttr(s) {
    return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  global.ECRGauges = { draw, angleOf, START, SWEEP };
})(typeof window !== "undefined" ? window : globalThis);
