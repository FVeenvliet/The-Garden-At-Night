// background.js - scene background: drawBackground(), drawMistLayer(), drawForegroundTrunk(), drawSilTree(), drawBushRow(), drawGround(), drawMoon(), drawSun(), drawShootingStars()
// Sources:
// - Radial gradients for moon and sun glow: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/createRadialGradient
// - Canvas 2D shear matrix for wind-leaning trees (ctx.transform): https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/transform

// ---Background---

function drawBackground(t, ms, groundY) {
  let ctx = drawingContext;

  // -Sky gradient-
  // sk3 blends across three waypoints: night to dawn (d<0.5), dawn to day (d is bigger or equal to 0.5)
  function skyC(a, b, f) {
    return `rgba(${Math.round(a[0]+(b[0]-a[0])*f)},${Math.round(a[1]+(b[1]-a[1])*f)},${Math.round(a[2]+(b[2]-a[2])*f)},1)`;
  }
  function sk3(night, dawn, day, d) {
    return d < 0.5 ? skyC(night, dawn, d * 2) : skyC(dawn, day, (d - 0.5) * 2);
  }
  let d = timeOfDay;
  ctx.save();
  let sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0,    sk3([0,2,10],   [12,6,35],   [38,100,195], d)); // zenith
  sky.addColorStop(0.45, sk3([1,8,20],   [22,14,55],  [72,150,215], d));
  sky.addColorStop(0.75, sk3([2,16,32],  [42,22,62],  [130,190,228],d));
  sky.addColorStop(1,    sk3([4,30,46],  [75,30,58],  [218,158,58], d)); // horizon
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, groundY);
  ctx.restore();

  // -Horizon blush-
  // only appears after d > 0.04 so the pure night sky stays unaffected
  if (d > 0.04) {
    ctx.save();
    let hr = Math.round(90  + (220-90)  * Math.min(d * 2, 1));
    let hg = Math.round(28  + (140-28)  * Math.min(d * 2, 1));
    let hb = Math.round(55  + (40 -55)  * Math.min(d * 2, 1));
    let blush = ctx.createLinearGradient(0, groundY * 0.55, 0, groundY);
    blush.addColorStop(0, `rgba(${hr},${hg},${hb},0)`);
    blush.addColorStop(1, `rgba(${hr},${hg},${hb},${Math.min(d * 0.55, 0.55)})`);
    ctx.fillStyle = blush;
    ctx.fillRect(0, groundY * 0.55, width, groundY * 0.45);
    ctx.restore();
  }

  // -Moonlight glow-
  ctx.save();
  let mglow = ctx.createRadialGradient(width*0.5, groundY*0.18, 0, width*0.5, groundY*0.18, width*0.42);
  mglow.addColorStop(0,   `rgba(30,140,175,${0.10*(1-d*0.9)})`);
  mglow.addColorStop(0.4, `rgba(15, 80,115,${0.06*(1-d*0.9)})`);
  mglow.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = mglow;
  ctx.fillRect(0, 0, width, groundY);
  ctx.restore();

  drawSun(groundY);
  drawMoon(groundY);

  // -Stars-
  // glowMultiplier (from LDR) amplifies star brightness in a dark room
  noStroke();
  for (let s of STARS) {
    let tw = 0.5 + 0.5 * sin(ms * 0.001 * s.spd + s.phase);
    let starA = min((tw * 150 + 40) * (1 - d * 0.92) * min(glowMultiplier * 0.55 + 0.45, 2.0), 255);
    fill(190, 225, 255, starA);
    ellipse(s.x, s.y, s.r * 2, s.r * 2);
  }
  if (d < 0.35) drawShootingStars(ms); // only draw shooting stars at night

  // -Tree silhouette layers (back to front)-
  // Five layers of conifers build atmospheric depth; lighter teal colours suggest aerial haze on far layers.
  // Each layer clears the canvas centre so the bouquet has space. Mist bands between layers add depth.

  // Layer 1: farthest, teal-tinted
  let l1 = 'rgba(7, 34, 52, 1)';
  drawSilTree(width*0.04,  groundY, 400, 78,  0.42, false, l1);
  drawSilTree(width*0.15,  groundY, 375, 72,  0.39, true,  l1);
  drawSilTree(width*0.26,  groundY, 340, 66,  0.37, false, l1);
  drawSilTree(width*0.36,  groundY, 310, 60,  0.35, true,  l1);
  drawSilTree(width*0.64,  groundY, 315, 61,  0.35, false, l1);
  drawSilTree(width*0.74,  groundY, 345, 67,  0.38, true,  l1);
  drawSilTree(width*0.85,  groundY, 380, 73,  0.40, false, l1);
  drawSilTree(width*0.96,  groundY, 405, 79,  0.43, true,  l1);

  drawMistLayer(groundY, 0.60, 0.78, 'rgba(12, 68, 95, 0.09)');

  // Layer 2
  let l2 = 'rgba(5, 24, 38, 1)';
  drawSilTree(width*0.01,  groundY, 470, 90,  0.53, false, l2);
  drawSilTree(width*0.13,  groundY, 440, 84,  0.49, true,  l2);
  drawSilTree(width*0.23,  groundY, 395, 76,  0.45, false, l2);
  drawSilTree(width*0.33,  groundY, 355, 69,  0.41, true,  l2);
  drawSilTree(width*0.67,  groundY, 360, 70,  0.42, false, l2);
  drawSilTree(width*0.77,  groundY, 400, 77,  0.46, true,  l2);
  drawSilTree(width*0.87,  groundY, 445, 85,  0.50, false, l2);
  drawSilTree(width*0.99,  groundY, 475, 91,  0.54, true,  l2);

  drawMistLayer(groundY, 0.50, 0.72, 'rgba(10, 55, 80, 0.10)');

  // Layer 3
  let l3 = 'rgba(3, 16, 26, 1)';
  drawSilTree(width*-0.01, groundY, 545, 104, 0.68, false, l3);
  drawSilTree(width*0.11,  groundY, 505, 96,  0.64, true,  l3);
  drawSilTree(width*0.23,  groundY, 445, 86,  0.59, false, l3);
  drawSilTree(width*0.34,  groundY, 385, 74,  0.54, true,  l3);
  drawSilTree(width*0.66,  groundY, 390, 75,  0.55, false, l3);
  drawSilTree(width*0.77,  groundY, 450, 87,  0.60, true,  l3);
  drawSilTree(width*0.89,  groundY, 510, 98,  0.65, false, l3);
  drawSilTree(width*1.01,  groundY, 550, 106, 0.69, true,  l3);

  drawMistLayer(groundY, 0.40, 0.65, 'rgba(8, 46, 68, 0.11)');

  // Layer 4
  let l4 = 'rgba(3, 12, 19, 1)';
  drawSilTree(width*-0.04, groundY, 630, 122, 0.94, false, l4);
  drawSilTree(width*0.12,  groundY, 565, 108, 0.84, true,  l4);
  drawSilTree(width*0.28,  groundY, 485, 92,  0.74, false, l4);
  drawSilTree(width*0.72,  groundY, 490, 94,  0.75, true,  l4);
  drawSilTree(width*0.88,  groundY, 570, 110, 0.86, false, l4);
  drawSilTree(width*1.04,  groundY, 635, 124, 0.96, true,  l4);

  drawMistLayer(groundY, 0.28, 0.58, 'rgba(6, 38, 58, 0.12)');

  // Layer 5: closest, near-black; only outer pairs so the centre stays open for the flowers
  let l5 = 'rgba(2, 8, 13, 1)';
  drawSilTree(width*-0.06, groundY, 720, 138, 1.10, false, l5);
  drawSilTree(width*0.10,  groundY, 650, 126, 0.99, true,  l5);
  drawSilTree(width*0.90,  groundY, 655, 127, 1.00, false, l5);
  drawSilTree(width*1.06,  groundY, 725, 140, 1.12, true,  l5);

  drawMistLayer(groundY, 0.14, 0.50, 'rgba(5, 30, 48, 0.13)');

  // -Foreground trunks-
  // So close that the canopy goes above the canvas — only the lower trunk is visible
  drawForegroundTrunk(width*-0.01, groundY, 48, 'rgba(1, 5,  8, 1)');
  drawForegroundTrunk(width*0.08,  groundY, 34, 'rgba(1, 6,  9, 1)');
  drawForegroundTrunk(width*0.92,  groundY, 36, 'rgba(1, 6,  9, 1)');
  drawForegroundTrunk(width*1.01,  groundY, 50, 'rgba(1, 5,  8, 1)');

  drawBushRow(groundY);

  // -Horizon mist-
  // Softens the hard edge where tree bases meet the ground
  ctx.save();
  let hmist = ctx.createLinearGradient(0, groundY - 90, 0, groundY);
  hmist.addColorStop(0, 'rgba(14, 80, 110, 0)');
  hmist.addColorStop(1, 'rgba(14, 80, 110, 0.13)');
  ctx.fillStyle = hmist;
  ctx.fillRect(0, groundY - 90, width, 90);
  ctx.restore();
}

// Mist band between tree layers: fades in and out at both edges to blend cleanly
function drawMistLayer(groundY, yTopFrac, yBotFrac, col) {
  let ctx = drawingContext;
  let yTop = groundY * yTopFrac;
  let yBot = groundY * yBotFrac;
  ctx.save();
  let g = ctx.createLinearGradient(0, yTop, 0, yBot);
  g.addColorStop(0,   'rgba(0,0,0,0)');
  g.addColorStop(0.3, col);
  g.addColorStop(0.7, col);
  g.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, yTop, width, yBot - yTop);
  ctx.restore();
}

function drawForegroundTrunk(x, groundY, tw, col) {
  let ctx = drawingContext;
  let h = groundY * 1.35;  // extends well above the canvas top
  let lean = tw * 1.2;
  ctx.save();
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x - tw, groundY);
  ctx.bezierCurveTo(x - tw*1.1, groundY - h*0.4,  x + lean*0.3, groundY - h*0.7,  x + lean, groundY - h);
  ctx.lineTo(x + lean + tw*0.8, groundY - h);
  ctx.bezierCurveTo(x + lean*0.6 + tw, groundY - h*0.7,  x + tw*1.1, groundY - h*0.4,  x + tw, groundY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// flip=true mirrors the shape horizontally to break repetition between trees.
// Wind shear is applied in screen space (ctx.transform) so both flip variants lean the same way.
function drawSilTree(x, groundY, h, cr, sc, flip, col) {
  let ctx = drawingContext;
  ctx.save();
  ctx.translate(x, groundY);

  // horizontal shear matrix: x' = x - wl*y:  leans the whole tree rightward with the wind
  let wl = gustyWind(x * 0.005) * 0.008; // x*0.005 gives each tree a unique gust phase
  ctx.transform(1, 0, -wl, 1, 0, 0);
  ctx.scale(sc * (flip ? -1 : 1), sc);

  let tw   = h * 0.030;
  let lean = h * 0.06;

  ctx.fillStyle = col;

  // trunk
  ctx.beginPath();
  ctx.moveTo(-tw, 0);
  ctx.bezierCurveTo(-tw*1.1, -h*0.3,  lean*0.4, -h*0.6,  lean,        -h*0.72);
  ctx.lineTo(lean + tw*0.8,  -h*0.72);
  ctx.bezierCurveTo(lean*0.8+tw, -h*0.6,  tw*1.1, -h*0.3,  tw, 0);
  ctx.closePath();
  ctx.fill();

  // branches
  let bx = lean*0.9, by = -h*0.70;
  let bw = tw*0.62;

  function branch(cx1,cy1,cx2,cy2,ex,ey) {
    ctx.beginPath();
    ctx.moveTo(bx-bw, by);
    ctx.bezierCurveTo(cx1, cy1, cx2, cy2, ex, ey);
    ctx.bezierCurveTo(cx2, cy2+bw, cx1, cy1+bw, bx+bw, by);
    ctx.closePath(); ctx.fill();
  }
  branch(-cr*0.8,-h*0.80,-cr*1.5,-h*0.88,-cr*1.3,-h*0.94);
  branch( cr*0.7,-h*0.78, cr*1.4,-h*0.86, cr*1.2,-h*0.92);
  branch(-cr*0.1,-h*0.82,-cr*0.2,-h*1.00,-cr*0.1,-h*1.04);

  // canopy: 23 overlapping blobs give an organic rounded crown
  let canY = -h * 0.88;
  let blobs = [
    [ 0.00,  0.00, 1.00], [-0.48,  0.16, 0.84], [ 0.50,  0.13, 0.80], // central + first ring
    [-0.24, -0.40, 0.75], [ 0.26, -0.36, 0.70], [-0.70, -0.12, 0.68], // upper and side bulges
    [ 0.72, -0.10, 0.65], [-0.36,  0.38, 0.62], [ 0.40,  0.35, 0.60], // mid-ring
    [-0.58, -0.44, 0.57], [ 0.60, -0.40, 0.54], [ 0.00, -0.58, 0.68], // upper corners and apex
    [-0.84,  0.08, 0.52], [ 0.86,  0.06, 0.50], [ 0.00,  0.60, 0.46], // outer sides and lower skirt
    [-0.92, -0.28, 0.46], [ 0.94, -0.24, 0.44], [-0.44, -0.68, 0.50], // wide outer ring
    [ 0.46, -0.65, 0.48], [-0.20,  0.72, 0.42], [ 0.22,  0.70, 0.40], // lower outer ring
    [-1.00,  0.30, 0.40], [ 1.02,  0.28, 0.38],                        // extreme left and right edges
  ];
  for (let [ox, oy, r] of blobs) {
    ctx.beginPath();
    ctx.arc(ox*cr, canY + oy*cr, cr*r, 0, Math.PI*2);
    ctx.fill();
  }

  ctx.restore();
}

function drawBushRow(groundY) {
  let ctx = drawingContext;
  let bushes = [
    { xf: 0.07, r: 50 }, { xf: 0.17, r: 38 },
    { xf: 0.29, r: 58 }, { xf: 0.41, r: 32 },
    { xf: 0.59, r: 34 }, { xf: 0.71, r: 55 },
    { xf: 0.83, r: 40 }, { xf: 0.93, r: 48 },
  ];
  ctx.fillStyle = 'rgba(3, 20, 28, 1)';
  for (let b of bushes) {
    let bx = b.xf * width, r = b.r;
    ctx.beginPath(); ctx.arc(bx,           groundY - r*0.38, r,       0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(bx - r*0.60,  groundY - r*0.14, r*0.72,  0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(bx + r*0.62,  groundY - r*0.12, r*0.68,  0, Math.PI*2); ctx.fill();
  }
}

// ---Ground---

// draws the soil body below the ground line
// must be called with the canvas origin already translated to (width/2, groundY)
function drawGround(t, ms) {
  let ctx = drawingContext;
  let hw = width / 2;
  let depth = height * 0.25;

  ctx.save();

  // two Bezier curves create a gently undulating surface: makes the ground feel natural rather than flat
  ctx.beginPath();
  ctx.moveTo(-hw, depth);
  ctx.lineTo( hw, depth);
  ctx.lineTo( hw, -8);
  ctx.bezierCurveTo( hw * 0.55, -18,  hw * 0.20, -6,   0,   -14);
  ctx.bezierCurveTo(-hw * 0.22, -22, -hw * 0.58, -4,  -hw,  -10);
  ctx.closePath();

  // bright teal at the surface catches reflected bioluminescent light; fades to near-black at depth
  let bodyGrad = ctx.createLinearGradient(0, -20, 0, depth);
  bodyGrad.addColorStop(0,   'rgba(12, 58, 66, 1.0)');
  bodyGrad.addColorStop(0.3, 'rgba(6, 32, 38, 1.0)');
  bodyGrad.addColorStop(1,   'rgba(2, 12, 15, 1.0)');
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  ctx.restore();
}

// ---Moon---

// moon arcs from upper-right toward the horizon as timeOfDay increases, fading as dawn breaks
// two gradients: a large soft halo (5.5x radius) and a smaller off-centre disc for a 3D look
function drawMoon(groundY) {
  let d = timeOfDay;
  let vis = 1 - d * 0.80; // retains 20% visibility at full day so the transition isn't abrupt
  if (vis <= 0) return;
  let mx = width  * (0.72 + d * 0.14);
  let my = groundY * (0.21 + d * 0.52);
  let mr = 26;
  let ctx = drawingContext;
  ctx.save();
  ctx.globalAlpha = vis;

  // large faint halo - simulates moonlight scattering through atmosphere
  let halo = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 5.5);
  halo.addColorStop(0,    'rgba(180, 235, 255, 0.20)');
  halo.addColorStop(0.20, 'rgba(130, 205, 240, 0.12)');
  halo.addColorStop(0.50, 'rgba(60, 150, 200, 0.05)');
  halo.addColorStop(1,    'rgba(0, 0, 0, 0.00)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(mx, my, mr * 5.5, 0, Math.PI * 2); ctx.fill();

  // off-centre highlight simulates the moon being lit from the upper-left
  let disc = ctx.createRadialGradient(mx - mr * 0.22, my - mr * 0.22, 0, mx, my, mr);
  disc.addColorStop(0,    'rgba(225, 248, 255, 1.0)');
  disc.addColorStop(0.55, 'rgba(160, 225, 248, 1.0)');
  disc.addColorStop(1,    'rgba(110, 190, 225, 1.0)');
  ctx.fillStyle = disc;
  ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();

  ctx.globalAlpha = 1; // reset before restore: belt-and-suspenders in case restore doesn't catch it
  ctx.restore();
}

// ---Sun---

// sun appears at d>0.25, fades in to d=0.55, rises from just below horizon to upper-left sky
// near the horizon: large orange disc; high up: smaller bright yellow disc
// four elements: outer halo, inner corona, disc, full-canvas warm wash
function drawSun(groundY) {
  let d = timeOfDay;
  if (d < 0.25) return;

  let vis = constrain(map(d, 0.25, 0.55, 0, 1), 0, 1);
  let sx = width * 0.26;
  let sy = constrain(map(d, 0.30, 1.0, groundY + 40, groundY * 0.14), groundY * 0.14, groundY + 40);
  let sr = constrain(map(sy, groundY * 0.14, groundY, 28, 52), 28, 52);

  // rise=1 means high in sky (yellow), rise=0 means at horizon (orange)
  let rise = constrain(map(sy, groundY * 0.14, groundY, 1, 0), 0, 1);
  let ir = Math.round(255), ig = Math.round(200 + rise * 40), ib = Math.round(rise * 120);
  let or_ = Math.round(255), og = Math.round(110 + rise * 80), ob = Math.round(rise * 20);

  let ctx = drawingContext;
  ctx.save();
  ctx.globalAlpha = vis;

  // outer halo - 9x radius; this is what tints the surrounding sky amber in daylight
  let outerH = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 9);
  outerH.addColorStop(0,   `rgba(255, 200, 80, 0.22)`);
  outerH.addColorStop(0.3, `rgba(255, 160, 40, 0.12)`);
  outerH.addColorStop(0.6, `rgba(220, 120, 20, 0.05)`);
  outerH.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = outerH;
  ctx.beginPath(); ctx.arc(sx, sy, sr * 9, 0, Math.PI * 2); ctx.fill();

  // inner corona: tighter glow ring between the disc edge and the outer halo
  let corona = ctx.createRadialGradient(sx, sy, sr * 0.6, sx, sy, sr * 2.8);
  corona.addColorStop(0,   `rgba(${or_},${og},${ob}, 0.40)`);
  corona.addColorStop(0.5, `rgba(${or_},${og},${ob}, 0.16)`);
  corona.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = corona;
  ctx.beginPath(); ctx.arc(sx, sy, sr * 2.8, 0, Math.PI * 2); ctx.fill();

  // disc: off-centre highlight (upper-left) simulates directional lighting from above
  let disc = ctx.createRadialGradient(sx - sr*0.25, sy - sr*0.25, 0, sx, sy, sr);
  disc.addColorStop(0,   `rgba(${ir},${ig},${ib}, 1.0)`);
  disc.addColorStop(0.6, `rgba(${or_},${og},${ob}, 1.0)`);
  disc.addColorStop(1,   `rgba(${Math.round(or_*0.85)},${Math.round(og*0.7)},0, 1.0)`);
  ctx.fillStyle = disc;
  ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();

  // warm wash over the whole scene: critical for the bioluminescent-to-daytime colour shift
  // strongest near the horizon; proportional to both fade-in and time of day
  ctx.globalAlpha = vis * d * 0.45;
  let wash = ctx.createLinearGradient(0, 0, 0, groundY);
  wash.addColorStop(0,   'rgba(255, 200, 80, 0.0)');
  wash.addColorStop(0.5, 'rgba(255, 180, 60, 0.08)');
  wash.addColorStop(1,   'rgba(255, 160, 40, 0.22)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, groundY);

  ctx.globalAlpha = 1;
  ctx.restore();
}

// ---Shooting stars---

// each star has its own period and offset; a modulo on ms determines when it's active
// the sine envelope fades the star in and out to avoid abrupt pop-in at the start of each pass
function drawShootingStars(ms) {
  let ctx = drawingContext;
  for (let s of SHOOTING_STARS) {
    let phase = ((ms + s.offset) % s.period + s.period) % s.period; // double modulo keeps value positive
    if (phase > s.activeMs) continue;

    let frac = phase / s.activeMs;
    let dist = frac * s.len;
    let alpha = Math.sin(frac * Math.PI);

    let sx = s.x0 + Math.cos(s.ang) * dist;
    let sy = s.y0 + Math.sin(s.ang) * dist;

    // tail can't be longer than the distance actually travelled yet: grows from zero at the start
    let tail = Math.min(s.tailLen, dist);
    let tx = sx - Math.cos(s.ang) * tail;
    let ty = sy - Math.sin(s.ang) * tail;

    ctx.save();
    // gradient tail: transparent at the far end, bright at the head
    let grad = ctx.createLinearGradient(tx, ty, sx, sy);
    grad.addColorStop(0, 'rgba(210, 245, 255, 0)');
    grad.addColorStop(1, `rgba(230, 250, 255, ${alpha * 0.92})`);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(sx, sy); ctx.stroke();

    ctx.fillStyle = `rgba(245, 255, 255, ${alpha})`;
    ctx.beginPath(); ctx.arc(sx, sy, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}
