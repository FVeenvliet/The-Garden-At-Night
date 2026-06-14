// environment.js - ground-level environment: drawGroundFog(), drawMushrooms(), drawRain(), drawGroundPlants(), drawStones()

// ---Ground fog---
// four overlapping animated mist layers that breathe and drift at ground level
// fog density is boosted by rain and burns off completely in full daylight
function drawGroundFog(t, groundY) {
  let ctx = drawingContext;
  // each layer: yOff above ground, halfH = band half-height, phase = bobbing offset, alpha = max night opacity
  let layers = [
    { yOff:  0,  halfH: 48, phase: 0.0, alpha: 0.42 }, // dense base fog sitting right on the ground
    { yOff: -22, halfH: 32, phase: 2.0, alpha: 0.28 }, // lighter wisp above
    { yOff: -46, halfH: 20, phase: 4.2, alpha: 0.16 }, // faint upper tendril
    { yOff: -68, halfH: 14, phase: 1.1, alpha: 0.09 }, // barely-visible trace near the tree bases
  ];
  // rain thickens the fog (up to 1.9x); timeOfDay burns it off
  let fogBoost = (1.0 + rainIntensity * 0.9) * (1 - timeOfDay);
  ctx.save();
  for (let ly of layers) {
    let bob = Math.sin(t * 0.28 + ly.phase) * 5;
    let yt = groundY + ly.yOff + bob - ly.halfH;
    let yb = groundY + ly.yOff + bob + ly.halfH * 0.7; // shorter below centre: fog sits low
    let a = Math.min(ly.alpha * fogBoost, 0.85); // cap at 0.85 so it never fully opaques
    // transparent top to opaque core to slightly dimmer lower core to transparent bottom
    let g = ctx.createLinearGradient(0, yt, 0, yb);
    g.addColorStop(0,    `rgba(14, 84, 114, 0)`);
    g.addColorStop(0.32, `rgba(14, 84, 114, ${a})`);
    g.addColorStop(0.68, `rgba(11, 68, 95, ${a * 0.85})`);
    g.addColorStop(1,    `rgba(8, 52, 76, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, yt, width, yb - yt);
  }
  ctx.restore();
}

// ---Mushrooms---

// six clusters of bioluminescent mushrooms; each mushroom pulses on its own phase
// in daytime the pulse disappears and mushrooms render at flat solid opacity
function drawMushrooms(t, ms, groundY) {
  let ctx = drawingContext;
  // xf = cluster centre fraction; each mushroom: dx = offset from centre, s = size scale
  let clusters = [
    { xf: 0.09, mush: [{ dx: -12, s: 0.90 }, { dx: 1,  s: 1.20 }, { dx: 14, s: 0.78 }] },
    { xf: 0.21, mush: [{ dx:  -7, s: 1.00 }, { dx: 7,  s: 0.72 }] },
    { xf: 0.38, mush: [{ dx: -15, s: 1.10 }, { dx: -1, s: 0.82 }, { dx: 11, s: 1.30 }, { dx: 23, s: 0.70 }] },
    { xf: 0.62, mush: [{ dx:  -9, s: 1.00 }, { dx: 5,  s: 1.25 }, { dx: 17, s: 0.80 }] },
    { xf: 0.79, mush: [{ dx:  -8, s: 1.05 }, { dx: 8,  s: 0.88 }] },
    { xf: 0.91, mush: [{ dx: -13, s: 0.82 }, { dx: 1,  s: 1.15 }, { dx: 13, s: 0.95 }] },
  ];
  for (let cl of clusters) {
    let cx = cl.xf * width;
    for (let mi = 0; mi < cl.mush.length; mi++) {
      let m = cl.mush[mi];
      let mx = cx + m.dx;
      let capR = 9 * m.s;
      let stemH = 11 * m.s;

      // mx position seeds the pulse phase so each mushroom glows on its own cycle
      let pulse = (0.68 + 0.32 * Math.sin(ms * 0.0018 + mx * 0.06)) * glowMultiplier;
      let d = timeOfDay;

      // lerp between night (animated pulse) and day (flat 1.0) for smooth transitions
      let capA = pulse * (1 - d) + 1.0 * d;
      let haloA = pulse * 0.24 * (1 - d); // halo only exists at night
      let stemA = pulse * 0.65 * (1 - d) + 1.0 * d;

      // cl.xf + mi gives each mushroom a unique wind phase within its cluster
      let sway = Math.sin(t * 0.90 + cl.xf * 5.2 + mi * 0.8) * 1.8 + gustyWind(cl.xf * 4 + mi * 0.6) * 1.2;

      ctx.save();
      ctx.translate(mx, groundY);
      ctx.rotate(sway * Math.PI / 180);

      // skip shadow in full daylight: it's invisible
      if (d < 0.85) { ctx.shadowColor = pc(57,198,214, 230,130,170, 0.7); ctx.shadowBlur = 8 * m.s * (1 - d); }

      // stem: trapezoid slightly wider at base; gradient from invisible at root to glowing at top
      let sg = ctx.createLinearGradient(0, 0, 0, -stemH);
      sg.addColorStop(0, pc(18,130,152, 130,62,52, 0));
      sg.addColorStop(1, pc(45,195,218, 168,82,68, stemA));
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.moveTo(-3 * m.s, 0);
      ctx.lineTo(-2.4 * m.s, -stemH);
      ctx.lineTo( 2.4 * m.s, -stemH);
      ctx.lineTo( 3   * m.s,  0);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0; // reset before cap so shadow doesn't double-apply

      // cap halo: glow corona behind the cap, night-only
      let cy = -stemH - capR * 0.42;
      let halo = ctx.createRadialGradient(0, cy, 0, 0, cy, capR * 2.4);
      halo.addColorStop(0,   pc(57,198,214, 165,78,68, haloA));
      halo.addColorStop(0.5, pc(30,155,178, 138,58,52, haloA * 0.42));
      halo.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(0, cy, capR * 2.4, 0, Math.PI * 2); ctx.fill();

      // cap disc: off-centre radial gradient creates a dome lit from upper-left
      let cap = ctx.createRadialGradient(-capR * 0.28, cy - capR * 0.4, 0, 0, cy, capR);
      cap.addColorStop(0,   pc(130,245,255, 188,105, 92, capA));
      cap.addColorStop(0.5, pc( 57,198,214, 158, 78, 72, capA * 0.82));
      cap.addColorStop(1,   pc( 18,118,140, 118, 55, 55, capA * 0.60));
      ctx.fillStyle = cap;
      ctx.beginPath(); ctx.arc(0, cy, capR, 0, Math.PI * 2); ctx.fill();

      // three Amanita-style spots on the cap
      ctx.fillStyle = pc(200,255,255, 215,190,182, capA * 0.72);
      for (let [ddx, ddy, dr] of [[-3.2*m.s, -2.8*m.s, 1.1], [2.4*m.s, -0.8*m.s, 0.85], [-0.8*m.s, 1.0*m.s, 0.65]]) {
        ctx.beginPath(); ctx.arc(ddx, cy + ddy, dr * m.s, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }
}

// ---Rain---

// updates and draws all 280 rain drops, spawns ground splashes, and darkens the sky overlay
// only called when rainIntensity > 0.01 (guarded in draw())
function drawRain(dt, groundY) {
  let ri = rainIntensity;
  let ctx = drawingContext;
  ctx.save();

  for (let drop of RAIN_DROPS) {
    drop.y += drop.spd * dt * ri;
    // same phase (0.42) for all drops so they share a unified wind direction
    let lean = 0.06 + gustyWind(0.42) * 0.05;
    drop.x += drop.spd * lean * dt * ri;

    if (drop.y >= groundY) {
      // probabilistic splash spawn: heavy rain produces more splashes per drop
      if (random() < ri)
        SPLASHES.push({ x: drop.x, y: groundY, r: 0, maxR: random(4, 11), a: random(0.35, 0.55) * ri });
      drop.y = random(-120, -8);
      drop.x = random(-60, width + 60);
    }
    let ex = drop.x - drop.len * lean;
    let ey = drop.y - drop.len;

    ctx.strokeStyle = `rgba(140, 215, 235, ${drop.alpha * ri})`;
    ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(drop.x, drop.y); ctx.lineTo(ex, ey); ctx.stroke();
  }

  // traverse in reverse so splice() during iteration doesn't skip entries
  for (let i = SPLASHES.length - 1; i >= 0; i--) {
    let sp = SPLASHES[i];
    sp.r += 55 * dt; // expand at 55 px/s: snappy but still visible
    sp.a -= 1.4 * dt; // typical life ~0.25-0.4 s
    if (sp.a <= 0 || sp.r > sp.maxR) { SPLASHES.splice(i, 1); continue; }
    ctx.strokeStyle = `rgba(120, 200, 225, ${sp.a})`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.ellipse(sp.x, sp.y, sp.r, sp.r * 0.30, 0, 0, Math.PI * 2); // flat ellipse - perspective compression
    ctx.stroke();
  }

  // gradient overlay darkens the sky during heavy rain, strongest at the zenith
  let overlay = ctx.createLinearGradient(0, 0, 0, groundY);
  overlay.addColorStop(0, `rgba(5, 18, 35, ${0.18 * ri})`);
  overlay.addColorStop(1, `rgba(5, 18, 35, ${0.08 * ri})`);
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, width, groundY);

  ctx.restore();
}

// ---Ground plants (reeds + ferns + grass)---

// reeds, ferns and grass blades - all driven by gustyWind() + a sine wave
// each element type has a different sway frequency so they respond to wind differently
function drawGroundPlants(t, groundY) {
  let ctx = drawingContext;

  // -Reeds-
  // xf = cluster position fraction, ph = cluster wind phase
  // each stem: dx = offset from cluster centre, h = height, a = rest lean angle in degrees
  let reedClusters = [
    { xf: 0.14, ph: 0.0, stems: [{ dx: -8, h: 55, a: -8 }, { dx: 1,  h: 70, a:  2 }, { dx: 11, h: 48, a: 10 }] },
    { xf: 0.35, ph: 1.2, stems: [{ dx: -5, h: 46, a: -6 }, { dx: 6,  h: 62, a:  5 }] },
    { xf: 0.50, ph: 2.5, stems: [{ dx:-10, h: 54, a:-11 }, { dx: 2,  h: 72, a:  0 }, { dx: 13, h: 50, a: 13 }] },
    { xf: 0.65, ph: 0.8, stems: [{ dx: -4, h: 44, a: -5 }, { dx: 8,  h: 64, a:  7 }] },
    { xf: 0.86, ph: 3.1, stems: [{ dx: -9, h: 60, a: -9 }, { dx: 3,  h: 74, a:  1 }, { dx: 13, h: 47, a: 12 }] },
  ];
  for (let rc of reedClusters) {
    let cx = rc.xf * width;
    for (let si = 0; si < rc.stems.length; si++) {
      let s = rc.stems[si];
      // si * 0.7 staggers stems within the cluster so they don't all lean identically
      let sway = Math.sin(t * 0.85 + rc.ph + si * 0.7) * 2.2 + gustyWind(rc.ph + si * 0.5) * 1.8;
      let ar = (s.a + sway) * Math.PI / 180;
      let sx = cx + s.dx;
      let tipX = sx + Math.sin(ar) * s.h;
      let tipY = groundY - Math.cos(ar) * s.h;

      ctx.save();
      ctx.strokeStyle = 'rgba(22, 132, 150, 0.72)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(sx, groundY);
      // Bezier control points create a natural curve, stem bends in the wind direction
      ctx.bezierCurveTo(
        sx + Math.sin(ar) * s.h * 0.38, groundY - s.h * 0.38,
        tipX - Math.sin(ar) * 4, tipY + 7,
        tipX, tipY
      );
      ctx.stroke();

      // seed head: small elongated ellipse at the tip, aligned to the stem angle
      ctx.fillStyle = 'rgba(44, 185, 205, 0.78)';
      ctx.save();
      ctx.translate(tipX, tipY);
      ctx.rotate(ar);
      ctx.beginPath();
      ctx.ellipse(0, -4, 2, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.restore();
    }
  }

  // -Ferns-
  // whole cluster rotates together on a single sway value: heavier than reeds
  let fernSpots = [
    { xf: 0.19, sc: 1.00, ph: 0.3 }, { xf: 0.44, sc: 0.88, ph: 1.8 },
    { xf: 0.56, sc: 0.92, ph: 3.0 }, { xf: 0.82, sc: 1.00, ph: 1.1 },
  ];
  // 6 fronds in a symmetric fan; side = +/- 1 controls which way each frond curves
  let frondDefs = [
    { a: -68, len: 38, side: -1 },
    { a: -44, len: 46, side: -1 },
    { a: -18, len: 41, side: -1 },
    { a:  18, len: 41, side:  1 },
    { a:  44, len: 46, side:  1 },
    { a:  68, len: 38, side:  1 },
  ];

  for (let fe of fernSpots) {
    let fx = fe.xf * width;
    let sway = Math.sin(t * 0.78 + fe.ph) * 2.0 + gustyWind(fe.ph) * 2.2;
    ctx.save();
    ctx.translate(fx, groundY);
    ctx.rotate(sway * Math.PI / 180);
    for (let fr of frondDefs) {
      let ar = fr.a * Math.PI / 180;
      let sc = fe.sc;
      let ex = Math.sin(ar) * fr.len * sc;
      let ey = -Math.cos(ar) * fr.len * sc;

      // pointed lens shape drawn with two opposing Bezier curves: same technique as stemLeaf
      ctx.fillStyle = 'rgba(14, 118, 136, 0.58)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      // forward edge: bulges outward (fr.side controls direction)
      ctx.bezierCurveTo(
        fr.side * 4 * sc, -9 * sc,
        ex * 0.48 + fr.side * 8 * sc, ey * 0.48 - 4 * sc,
        ex, ey
      );
      // return edge: curves inward to close the lens
      ctx.bezierCurveTo(
        ex * 0.55 - fr.side * 6 * sc, ey * 0.55 + 5 * sc,
        fr.side * 2 * sc, -5 * sc,
        0, 0
      );
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // -Grass blades-
  // 14 patches across the full width; faster sway frequency than reeds: they're lighter
  let grassPatches = [
    { xf: 0.03, ph: 0.0, blades: [{dx:-6,h:18,a:-12},{dx:-2,h:22,a:-4},{dx:3,h:16,a:8},{dx:8,h:20,a:15},{dx:12,h:14,a:4}] },
    { xf: 0.10, ph: 1.3, blades: [{dx:-5,h:20,a:-8},{dx:1,h:26,a:2},{dx:7,h:18,a:11},{dx:12,h:22,a:-3}] },
    { xf: 0.16, ph: 2.7, blades: [{dx:-8,h:16,a:-15},{dx:-3,h:23,a:-5},{dx:2,h:25,a:3},{dx:8,h:17,a:12}] },
    { xf: 0.25, ph: 0.5, blades: [{dx:-4,h:22,a:-7},{dx:2,h:18,a:5},{dx:7,h:27,a:-2},{dx:13,h:14,a:10},{dx:-9,h:19,a:-11}] },
    { xf: 0.32, ph: 3.2, blades: [{dx:-7,h:19,a:-11},{dx:-1,h:24,a:1},{dx:5,h:17,a:7},{dx:10,h:21,a:-4}] },
    { xf: 0.40, ph: 1.8, blades: [{dx:-9,h:21,a:-9},{dx:-3,h:16,a:-3},{dx:3,h:25,a:6},{dx:9,h:19,a:13}] },
    { xf: 0.48, ph: 0.9, blades: [{dx:-5,h:17,a:-6},{dx:1,h:23,a:4},{dx:6,h:15,a:11},{dx:11,h:20,a:-5}] },
    { xf: 0.54, ph: 2.1, blades: [{dx:-6,h:20,a:-8},{dx:0,h:26,a:0},{dx:5,h:18,a:7},{dx:11,h:23,a:-4},{dx:-11,h:15,a:-13}] },
    { xf: 0.61, ph: 4.0, blades: [{dx:-4,h:16,a:-12},{dx:2,h:22,a:3},{dx:7,h:18,a:9},{dx:13,h:25,a:-2}] },
    { xf: 0.68, ph: 1.5, blades: [{dx:-8,h:22,a:-7},{dx:-2,h:17,a:-1},{dx:4,h:26,a:5},{dx:10,h:20,a:14}] },
    { xf: 0.76, ph: 2.8, blades: [{dx:-5,h:19,a:-10},{dx:1,h:25,a:2},{dx:7,h:16,a:8},{dx:12,h:21,a:-5}] },
    { xf: 0.84, ph: 0.2, blades: [{dx:-7,h:23,a:-5},{dx:-1,h:18,a:4},{dx:5,h:21,a:10},{dx:10,h:15,a:-3},{dx:15,h:19,a:7}] },
    { xf: 0.91, ph: 3.5, blades: [{dx:-6,h:20,a:-9},{dx:0,h:16,a:2},{dx:6,h:25,a:7},{dx:12,h:17,a:13}] },
    { xf: 0.97, ph: 1.0, blades: [{dx:-4,h:21,a:-6},{dx:2,h:17,a:5},{dx:8,h:19,a:11},{dx:-9,h:23,a:-11}] },
  ];
  for (let gp of grassPatches) {
    let cx = gp.xf * width;
    for (let bi = 0; bi < gp.blades.length; bi++) {
      let b = gp.blades[bi];
      let sway = Math.sin(t * 1.1 + gp.ph + bi * 0.5) * 2.5 + gustyWind(gp.ph + bi * 0.3) * 2.5;
      let ar = (b.a + sway) * Math.PI / 180;
      let bx = cx + b.dx;
      let tipX = bx + Math.sin(ar) * b.h;
      let tipY = groundY - Math.cos(ar) * b.h;
      // control point offset perpendicular to the blade direction for a natural bend
      let cpX = bx + Math.sin(ar) * b.h * 0.48 + Math.cos(ar) * 3;
      let cpY = groundY - b.h * 0.52;

      ctx.save();
      // bi % 3 cycles opacity slightly so adjacent blades don't look identical
      ctx.strokeStyle = `rgba(20, 142, 162, ${0.52 + (bi % 3) * 0.09})`;
      ctx.lineWidth = 0.85 + (bi % 2) * 0.35; // alternates 0.85 / 1.20 px for subtle width variation
      ctx.beginPath();
      ctx.moveTo(bx, groundY);
      ctx.quadraticCurveTo(cpX, cpY, tipX, tipY); // quadratic is sufficient for short blades
      ctx.stroke();
      ctx.restore();
    }
  }
}

// ---Stones---

// 14 mossy stones along the ground; each is partially buried (bury controls depth)
// two gradient passes: dark radial body + teal linear moss on the upper face
function drawStones(groundY) {
  let ctx = drawingContext;
  // xf = position fraction, rx/ry = semi-axes, ang = tilt, bury = fraction of ry buried below groundY
  let stones = [
    { xf: 0.06, rx: 18, ry: 11, ang:  0.12, bury: 0.30 },
    { xf: 0.13, rx: 11, ry:  6, ang: -0.20, bury: 0.22 },
    { xf: 0.20, rx:  8, ry:  5, ang:  0.05, bury: 0.18 },
    { xf: 0.28, rx: 23, ry: 13, ang:  0.16, bury: 0.34 }, // largest left-centre stone
    { xf: 0.37, rx:  9, ry:  5, ang: -0.10, bury: 0.20 },
    { xf: 0.44, rx: 14, ry:  8, ang:  0.08, bury: 0.26 },
    { xf: 0.53, rx:  7, ry:  4, ang: -0.18, bury: 0.16 }, // barely protruding
    { xf: 0.59, rx: 11, ry:  6, ang:  0.14, bury: 0.24 },
    { xf: 0.64, rx: 21, ry: 12, ang:  0.22, bury: 0.32 },
    { xf: 0.72, rx: 13, ry:  7, ang: -0.08, bury: 0.24 },
    { xf: 0.80, rx:  9, ry:  5, ang:  0.10, bury: 0.20 },
    { xf: 0.85, rx: 25, ry: 14, ang:  0.14, bury: 0.38 }, // largest stone in the scene
    { xf: 0.91, rx: 10, ry:  6, ang: -0.22, bury: 0.20 },
    { xf: 0.96, rx: 16, ry:  9, ang:  0.06, bury: 0.28 },
  ];
  for (let s of stones) {
    let sx = s.xf * width;
    let sy = groundY + s.ry * s.bury; // bury sinks the centre below the ground line
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(s.ang);

    // off-centre radial gradient: highlight upper-left to suggest ambient light from above
    let body = ctx.createRadialGradient(
      -s.rx * 0.22, -s.ry * 0.30, 0,
       s.rx * 0.10,  s.ry * 0.10, Math.max(s.rx, s.ry) * 1.25
    );
    body.addColorStop(0,   'rgba(30, 65, 76, 1)');
    body.addColorStop(0.5, 'rgba(17, 44, 54, 1)');
    body.addColorStop(1,   'rgba(8, 22, 28, 1)');
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.ellipse(0, 0, s.rx, s.ry, 0, 0, Math.PI * 2); ctx.fill();

    // mossy teal overlay on the upper face only: simulates algae growth in a moist environment
    let hl = ctx.createLinearGradient(0, -s.ry, 0, s.ry * 0.3);
    hl.addColorStop(0,    'rgba(42, 152, 172, 0.30)');
    hl.addColorStop(0.45, 'rgba(24, 108, 128, 0.14)');
    hl.addColorStop(1,    'rgba(0, 0, 0, 0.00)');
    ctx.fillStyle = hl;
    ctx.beginPath(); ctx.ellipse(0, 0, s.rx, s.ry, 0, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }
}
