// flowers_draw.js - flower rendering: drawFlower(), drawStem(), drawStemLeaves(), stemLeaf(), drawBloom(), _petalDraw(), drawBackMiddlePetal(), drawBackPetal(), drawMiddlePetal(), drawSidePetal()
// Sources: 
// - Flower design inspiration: https://codepen.io/mdusmanansari/pen/BamepLe (Md Usman Ansari — animated flower in p5.js, used as reference for petal structure and bloom layout)
// - Linear gradients for stem and petal fills: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/createLinearGradient
// - Radial gradients for bloom glow disc: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/createRadialGradient

// ---Flower---

function drawFlower(t, ms, fl, idx) {
  push();
  translate(fl.dx, 0);

  // idx * 1.4 gives each flower a different sway phase so they don't all lean together
  let sway = sin(ms * 0.001 * 0.8 + idx * 1.4) * 1.5 + gustyWind(idx * 1.1) * 1.4;
  rotate(radians(fl.rot + sway));

  let stemP = easeOut3(gp(t, fl.stemDelay, 1.4));
  let stemH = fl.h * stemP;

  drawStem(stemH);
  drawStemLeaves(t, fl, stemH);

  push();
  translate(0, -stemH);
  drawBloom(easeOut3(gp(t, fl.bloomDelay, 0.7)));
  pop();

  pop();
}

// p5 doesn't support per-vertex stroke gradients, so the stem is split into short
// segments and each one is stroked at the interpolated colour for that height.
function drawStem(h) {
  noFill();
  let steps = max(2, floor(h / 3));
  for (let i = 0; i < steps; i++) {
    let y0 = -(i / steps) * h;
    let y1 = -((i + 1) / steps) * h;
    let frac = i / max(1, steps - 1);
    stroke(lerpColor(color(...C.stemBot), color(...C.stemTop), frac));
    strokeWeight(5.5);
    line(0, y0, 0, y1);
  }
  // thin white highlight offset to the right gives the stem a slightly cylindrical look
  stroke(255, 255, 255, 35);
  strokeWeight(1.5);
  line(1.5, -2, 1.5, -h + 4);
}

function drawStemLeaves(t, fl, stemH) {
  // fracL is always slightly above fracR — left leaves sit a little higher on the stem
  let leafData = [
    { fracR: 0.50, fracL: 0.58, delay: fl.stemDelay + 0.3, sc: 1.00, rotDeg: 48 },
    { fracR: 0.30, fracL: 0.37, delay: fl.stemDelay + 0.5, sc: 0.88, rotDeg: 56 },
    { fracR: 0.67, fracL: 0.75, delay: fl.stemDelay + 0.7, sc: 1.10, rotDeg: 40 },
    { fracR: 0.16, fracL: 0.23, delay: fl.stemDelay + 0.9, sc: 0.82, rotDeg: 62 },
  ];
  let count = floor(fl.leaves / 2);
  for (let i = 0; i < count; i++) {
    let ld = leafData[i];
    let lp = easeOut3(gp(t, ld.delay, 0.8));
    if (lp <= 0) continue;

    push();
    translate(0, -fl.h * ld.fracR * (stemH / fl.h));
    scale(lp); // scale from the attachment point so it grows outward
    stemLeaf(false, ld.sc, ld.rotDeg);
    pop();

    push();
    translate(0, -fl.h * ld.fracL * (stemH / fl.h));
    scale(lp);
    stemLeaf(true, ld.sc, ld.rotDeg);
    pop();
  }
}

// lens-shaped leaf using two opposing Bezier arcs. flip=true mirrors it for the left side.
function stemLeaf(flip, sc, rotDeg) {
  let ctx = drawingContext;
  push();
  if (flip) scale(-1, 1); // mirror before rotation so the shape reflects correctly
  rotate(radians(rotDeg));
  scale(sc);

  let lw = 14, lh = 40;
  let tipX = 1, tipY = -lh; // slightly off-centre tip so it doesn't look perfectly symmetric

  function path() {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(lw, -lh * 0.10, lw, -lh * 0.90, tipX, tipY); // convex outer edge
    ctx.bezierCurveTo(-lw * 0.65, -lh * 0.90, -lw * 0.65, -lh * 0.10, 0, 0); // concave inner edge
    ctx.closePath();
  }

  // gradient fades from almost transparent at the base to opaque at the tip
  let grad = ctx.createLinearGradient(0, 0, tipX, tipY);
  grad.addColorStop(0,    pc(57,198,214, 80,160,70, 0.04));
  grad.addColorStop(0.28, pc(57,198,214, 80,160,70, 0.26));
  grad.addColorStop(0.62, pc(57,198,214, 80,160,70, 0.60));
  grad.addColorStop(1,    pc(57,198,214, 80,160,70, 0.85));

  ctx.save();
  ctx.fillStyle = grad;
  path();
  ctx.fill();
  ctx.restore();

  pop();
}

// ---Bloom (flower head)---
// drawn in five layers (back-to-front) using Canvas 2D API directly:
// 1. inner glow disc
// 2. back petals (left, right, centre-back)
// 3. white oval + yellow stamen ring (covers back petal tips)
// 4. front petals (left, right, centre-front)
// 5. stamen dot

function drawBloom(p) {
  if (p <= 0.01) return;
  push();
  scale(p);

  let ctx = drawingContext;
  ctx.save();

  // 1. bioluminescent glow disc — only visible at night
  ctx.fillStyle = `rgba(107,240,255,${0.18 * (1 - timeOfDay)})`;
  ctx.beginPath();
  ctx.arc(0, 0, 30, 0, Math.PI * 2);
  ctx.fill();

  // 2. back petals — the oval painted next will cover their bases
  push(); rotate(radians(18)); drawBackPetal(); pop();
  push(); scale(-1, 1); rotate(radians(18)); drawBackPetal(); pop();
  drawBackMiddlePetal();

  // 3. white oval + stamen ring
  ctx.fillStyle = 'rgba(255,255,255,1)';
  ctx.beginPath();
  ctx.ellipse(0, 5, 22, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,228,0,1)';
  ctx.beginPath();
  ctx.ellipse(0, 5, 14, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // 4. front petals — overlap the oval at their bases, drawn in front of it
  push(); scale(-1, 1); drawSidePetal(); pop();
  drawSidePetal();
  drawMiddlePetal(); // last = on top

  // 5. inner stamen dot
  ctx.save();
  ctx.fillStyle = 'rgba(255,200,0,0.82)';
  ctx.beginPath();
  ctx.ellipse(0, 5, 7, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  pop();
}

// shared gradient fill+stroke for the front petals: keeps drawMiddlePetal and drawSidePetal DRY
// night: cyan-mint; day: warm blush/mauve: pc() handles that transition
function _petalDraw(ctx, pathFn, tipY, topY) {
  let fill_ = ctx.createLinearGradient(0, tipY, 0, topY);
  fill_.addColorStop(0,    pc(167,255,238, 210,168,175, 0.08, 0.70));
  fill_.addColorStop(0.28, pc(167,255,238, 210,168,175, 0.40, 0.88));
  fill_.addColorStop(0.68, pc(167,255,238, 210,168,175, 0.72, 0.97));
  fill_.addColorStop(1,    pc(167,255,238, 210,168,175, 0.92, 1.00));

  let stroke_ = ctx.createLinearGradient(0, tipY, 0, topY);
  stroke_.addColorStop(0,    pc(167,255,238, 210,168,175, 0.00));
  stroke_.addColorStop(0.48, pc(210,255,248, 215,195,198, 0.55, 0.85));
  stroke_.addColorStop(1,    pc(245,255,254, 220,205,208, 1.00));

  ctx.save();
  ctx.fillStyle = fill_;
  pathFn();
  ctx.fill();

  ctx.strokeStyle = stroke_;
  ctx.lineWidth = 1.8;
  pathFn(); // Canvas paths aren't retained after fill, so rebuild before stroke
  ctx.stroke();
  ctx.restore();
}

// back centre petal: tip hidden behind the oval, only the dome is visible
// lower opacity than front petals so it reads as being further back
function drawBackMiddlePetal() {
  let ctx = drawingContext;
  let tipY = 10, rimY = -52, domeY = -68, rimX = 24;

  function path() {
    ctx.beginPath();
    ctx.moveTo(0, tipY);
    ctx.bezierCurveTo( 26, tipY - 8, rimX + 4, -26, rimX, rimY);
    ctx.bezierCurveTo( rimX - 4, domeY, -rimX + 4, domeY, -rimX, rimY);
    ctx.bezierCurveTo(-rimX - 4, -26, -26, tipY - 8, 0, tipY);
    ctx.closePath();
  }

  let fill_ = ctx.createLinearGradient(0, tipY, 0, rimY);
  fill_.addColorStop(0,    pc(167,255,238, 210,168,175, 0.04, 0.65));
  fill_.addColorStop(0.28, pc(167,255,238, 210,168,175, 0.24, 0.85));
  fill_.addColorStop(0.68, pc(167,255,238, 210,168,175, 0.54, 0.95));
  fill_.addColorStop(1,    pc(167,255,238, 210,168,175, 0.72, 1.00));

  let stroke_ = ctx.createLinearGradient(0, tipY, 0, rimY);
  stroke_.addColorStop(0,    pc(167,255,238, 210,168,175, 0.00));
  stroke_.addColorStop(0.48, pc(210,255,248, 215,195,198, 0.38, 0.80));
  stroke_.addColorStop(1,    pc(245,255,254, 220,205,208, 0.80, 1.00));

  ctx.save();
  ctx.fillStyle = fill_; path(); ctx.fill();
  ctx.strokeStyle = stroke_; ctx.lineWidth = 1.5; path(); ctx.stroke();
  ctx.restore();
}

// right angled back petal: tip tucked behind the white oval so it appears to emerge from it
// mirror with scale(-1, 1) to get the left version
function drawBackPetal() {
  let ctx = drawingContext;
  let tipX = 8, tipY = 10;
  let outerRimX = 54, innerRimX = 16, rimY = -48, domeY = -64;

  function path() {
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.bezierCurveTo(tipX + 34, tipY - 2, 58, -22, outerRimX, rimY);
    ctx.bezierCurveTo(outerRimX - 4, domeY, innerRimX + 4, domeY, innerRimX, rimY);
    ctx.bezierCurveTo(innerRimX - 2, -20, tipX + 2, tipY - 8, tipX, tipY);
    ctx.closePath();
  }

  // lower opacity than front petals: reinforces the depth hierarchy
  let fill_ = ctx.createLinearGradient(0, tipY, 0, rimY);
  fill_.addColorStop(0,    pc(167,255,238, 210,168,175, 0.04, 0.65));
  fill_.addColorStop(0.28, pc(167,255,238, 210,168,175, 0.24, 0.85));
  fill_.addColorStop(0.68, pc(167,255,238, 210,168,175, 0.54, 0.95));
  fill_.addColorStop(1,    pc(167,255,238, 210,168,175, 0.72, 1.00));

  let stroke_ = ctx.createLinearGradient(0, tipY, 0, rimY);
  stroke_.addColorStop(0,    pc(167,255,238, 210,168,175, 0.00));
  stroke_.addColorStop(0.48, pc(210,255,248, 215,195,198, 0.38, 0.80));
  stroke_.addColorStop(1,    pc(245,255,254, 220,205,208, 0.80, 1.00));

  ctx.save();
  ctx.fillStyle = fill_; path(); ctx.fill();
  ctx.strokeStyle = stroke_; ctx.lineWidth = 1.5; path(); ctx.stroke();
  ctx.restore();
}

// centre front petal: drawn last in drawBloom() so it sits on top of everything
function drawMiddlePetal() {
  let ctx = drawingContext;
  let tipY = 26, rimY = -46, domeY = -60, rimX = 22;

  function path() {
    ctx.beginPath();
    ctx.moveTo(0, tipY);
    ctx.bezierCurveTo( 24, tipY - 10, rimX + 4, -28, rimX, rimY);
    ctx.bezierCurveTo( rimX - 4, domeY, -rimX + 4, domeY, -rimX, rimY);
    ctx.bezierCurveTo(-rimX - 4, -28, -24, tipY - 10, 0, tipY);
    ctx.closePath();
  }

  _petalDraw(ctx, path, tipY, rimY);
}

// right front side petal: tip emerges from the oval edge; mirror with scale(-1,1) for left
// tipX=13 aligns the tip with the white oval ellipse edge at tipY=16
function drawSidePetal() {
  let ctx = drawingContext;
  let tipX = 13, tipY = 16;
  let outerRimX = 52, innerRimX = 14, rimY = -46, domeY = -60;

  function path() {
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.bezierCurveTo(tipX + 36, tipY - 2, 58, -26, outerRimX, rimY);
    ctx.bezierCurveTo(outerRimX - 4, domeY, innerRimX + 4, domeY, innerRimX, rimY);
    ctx.bezierCurveTo(innerRimX - 1, -22, tipX + 1, tipY - 10, tipX, tipY);
    ctx.closePath();
  }

  _petalDraw(ctx, path, tipY, rimY);
}
