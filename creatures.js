// creatures.js - animated creatures: GlowLight class, Moth class
// Sources:
// - shadowBlur for bioluminescent glow on moths and fireflies: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/shadowBlur
// - Accessing raw Canvas 2D API from p5.js via drawingContext: https://p5js.org/reference/p5/drawingContext/

// ---Light particles---

// GlowLight: a single bioluminescent particle that rises from a flower head,
// drifts on the wind, and fades in/out over a randomised lifetime.
// 24 instances total (8 per flower) created in setup().
class GlowLight {
  // flowerIdx picks which flower this particle rises from; lightIdx is just an identity index
  constructor(flowerIdx, lightIdx) {
    this.fi = flowerIdx;
    this.li = lightIdx;
    this._reset(0);
  }

  // randomises all dynamic properties and sets the next activation time
  // stagger delay (up to 4 s) keeps particles from respawning all at once
  _reset(nowMs) {
    let fl = FLOWERS[this.fi];
    // sin/cos of the stem rotation puts the spawn point at the bloom head
    let rot = fl.rot * Math.PI / 180;
    this.bx = fl.dx + fl.h * Math.sin(rot) + random(-10, 10);
    this.by = -fl.h * Math.cos(rot) - random(8, 20);
    this.riseSpd = random(35, 70);
    this.driftVel = random(-55, 55);
    this.lifeMs = random(3000, 5500);
    this.startMs = nowMs + random(0, 4000);
    this.isCyan = random() > 0.4; // 60% cyan, 40% yellow
    this.sz = random(3, 5.5);
    this.phase = random(TWO_PI); // unique seed for gustyWind() so each particle drifts differently
  }

  // draws the particle if active; resets it when its lifetime expires
  // called inside the flower transform block so coordinates are already in scaled flower-space
  draw(nowMs, t) {
    let fl = FLOWERS[this.fi];
    if (t < fl.bloomDelay) return; // don't emit before the bloom has opened

    let elapsed = nowMs - this.startMs;
    if (elapsed < 0) return; // still in activation delay
    if (elapsed > this.lifeMs) { this._reset(nowMs); return; }

    let sec = elapsed / 1000;
    let frac = elapsed / this.lifeMs;
    let alpha = sin(frac * PI) * 255; // sine envelope: fades in then out, peaks at mid-life

    // wind contribution grows with sec so the particle drifts further the longer it floats
    let px = this.bx + sec * this.driftVel + gustyWind(this.phase) * sec * 4;
    let py = this.by - sec * this.riseSpd;
    let col = this.isCyan ? C.cyan : C.yellow;

    // glowMultiplier comes from the LDR: dark room causes larger, brighter fireflies
    let gm = glowMultiplier;
    let szM = min(0.5 + gm * 0.5, 2.5);

    // three concentric ellipses: large faint halo, then mid glow, then bright core
    // the layering is what makes it read as a bioluminescent point light
    noStroke();
    fill(...col, min(alpha * 0.12 * gm, 255));
    ellipse(px, py, this.sz * 5 * szM, this.sz * 5 * szM);
    fill(...col, min(alpha * 0.35 * gm, 255));
    ellipse(px, py, this.sz * 2.5 * szM, this.sz * 2.5 * szM);
    fill(...col, min(alpha * 1.4 * gm, 255)); // can exceed 255 - clamped by min()
    ellipse(px, py, this.sz * szM, this.sz * szM);
  }
}

// ---Moth---

// Moth, two behaviours:
// - 'orbit': circles a flower head; spirals out and fades during rain
// - 'drift': crosses the scene slowly; flies off-screen during rain and returns after
// Wind drift accumulates in this.windX across frames so moths gradually blow downwind.
class Moth {
  constructor(cfg) {
    this.type = cfg.type;
    this.sc = cfg.sc || 1.0;
    this.spd = cfg.spd || 1.0;
    this.phase = random(TWO_PI); // unique phase keeps moths out of sync with each other
    this.windX = 0; // accumulated wind drift, persists across frames
    this.fleeOffset = 0; // rain-flee displacement, drives moth to screen edge and back

    if (this.type === 'orbit') {
      this.fi = cfg.fi;
      this.orbR = cfg.orbR || 90;
    } else {
      this.dir = cfg.dir;
      this.yFrac = cfg.yFrac;
      this.driftSpd = cfg.driftSpd;
      this.waveAmp = cfg.waveAmp;
      this.waveFreq = cfg.waveFreq;
      this.phaseOff = random(1); // start anywhere in the crossing cycle so they don't all enter at the same x
    }
  }

  // returns { mx, my, facing, flap } - screen position and facing direction for this frame
  _pos(t, scl, groundY) {
    let ri = rainIntensity;
    if (this.type === 'orbit') {
      let fl = FLOWERS[this.fi];
      let rot = fl.rot * Math.PI / 180;
      // mirrors the translation in draw()'s flower block to put the head in screen space
      let headX = width / 2 + fl.dx * scl + fl.h * scl * Math.sin(rot);
      let headY = groundY - fl.h * scl * Math.cos(rot);

      let ang = t * 0.44 * this.spd + this.phase;
      // orbit breathes slowly (aproximately 16 px) and expands dramatically with rain (7x)
      let r = (this.orbR + 16 * Math.sin(t * 0.13)) * (1 + ri * 7);
      return {
        mx: headX + Math.cos(ang) * r + this.windX,
        my: headY - 14 + Math.sin(ang * 1.8) * 32 * (1 + ri * 3), // y uses different multiplier: becomes elliptical path
        facing: Math.cos(ang) >= 0 ? 1 : -1,
        flap: Math.abs(Math.sin(t * 7.8)),
      };
    } else {
      let span = width + 160; // total crossing distance with approximately 80 px off-screen margin

      // steady rate regardless of rain: changing speed during rain caused the "crossing screen on return" bug
      let pos = ((t * this.driftSpd + this.phaseOff) % 1 + 1) % 1;
      let mx = this.dir > 0 ? -80 + pos * span : (width + 80) - pos * span;
      mx += this.windX + this.fleeOffset;

      let my = groundY * this.yFrac + Math.sin(t * this.waveFreq + this.phase) * this.waveAmp;
      return { mx, my, facing: this.dir, flap: Math.abs(Math.sin(t * 6.5)) };
    }
  }

  // updates wind/rain physics then renders the full moth anatomy
  draw(t, dt, scl, groundY) {
    // phase * 1.3 gives each moth a slightly different wind experience
    this.windX += gustyWind(this.phase * 1.3) * 10 * dt;

    let ri = rainIntensity;

    let visible;
    if (this.type === 'drift') {
      let fleeing = ri > 0.08;
      let fleeTarget = fleeing ? this.dir * (width + 420) : 0;
      let rate = fleeing ? 0.18 * dt : 0.06 * dt; // flee faster than return so it looks like genuine escape
      this.fleeOffset += (fleeTarget - this.fleeOffset) * rate;
      // fade only once fully off-screen so the flight-to-edge is visible
      visible = Math.max(1 - Math.abs(this.fleeOffset) / (width + 420), 0);
    } else {
      visible = 1 - ri * 1.15; // fully hidden at 87% rain intensity
    }
    if (visible <= 0) return;

    let { mx, my, facing } = this._pos(t, scl, groundY);
    let sc = this.sc;
    let ctx = drawingContext;

    // wind-fighting effects: tilt body into wind, jitter position, speed up wingbeat
    let gw = gustyWind(this.phase);
    let bodyTilt = -gw * 0.30;
    let struggleX = gw * Math.sin(t * 14.0 + this.phase) * 3.5;
    let struggleY = gw * Math.sin(t * 9.7 + this.phase * 1.5) * 2.5;
    let flapRate = 6.5 + gw * 4.5;
    let wingFlap = Math.abs(Math.sin(t * flapRate + this.phase));

    ctx.save();
    ctx.globalAlpha = visible;
    ctx.translate(mx + struggleX, my + struggleY);
    ctx.rotate(bodyTilt); // tilt before mirror so both facing dirs lean into the same wind
    ctx.scale(facing, 1);

    // wing span/height scale with flap so folded wings are narrower than spread ones
    let ws = (20 + wingFlap * 13) * sc;
    let wh = (13 + wingFlap * 5) * sc;

    // canvas shadow gives the bioluminescent halo without extra draw calls
    ctx.shadowColor = 'rgba(57, 198, 214, 0.85)';
    ctx.shadowBlur = 14 * sc;

    // upper wings: semi-transparent teal, two bezier arcs each
    ctx.fillStyle = 'rgba(38, 182, 205, 0.52)';
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-ws*0.38, -wh*0.55, -ws, -wh, -ws*0.82, wh*0.38);
    ctx.bezierCurveTo(-ws*0.38, wh*0.55, -4*sc, wh*0.20, 0, 0);
    ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.bezierCurveTo(ws*0.38, -wh*0.55, ws, -wh, ws*0.82, wh*0.38);
    ctx.bezierCurveTo(ws*0.38, wh*0.55, 4*sc, wh*0.20, 0, 0);
    ctx.closePath(); ctx.fill();

    // lower hindwings: smaller and darker, hang below the body
    let lws = ws * 0.68, lwh = wh * 0.88;
    ctx.fillStyle = 'rgba(26, 150, 172, 0.42)';
    ctx.beginPath(); ctx.moveTo(-2*sc, 2*sc);
    ctx.bezierCurveTo(-lws*0.32, lwh*0.42, -lws, lwh*1.12, -lws*0.58, lwh*1.52);
    ctx.bezierCurveTo(-lws*0.18, lwh*1.28, -3*sc, lwh*0.48, -2*sc, 2*sc);
    ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(2*sc, 2*sc);
    ctx.bezierCurveTo(lws*0.32, lwh*0.42, lws, lwh*1.12, lws*0.58, lwh*1.52);
    ctx.bezierCurveTo(lws*0.18, lwh*1.28, 3*sc, lwh*0.48, 2*sc, 2*sc);
    ctx.closePath(); ctx.fill();

    // body: bright cyan elongated ellipse, glows most intensely
    ctx.shadowBlur = 8 * sc;
    ctx.fillStyle = 'rgba(92, 228, 242, 0.94)';
    ctx.beginPath(); ctx.ellipse(0, 3*sc, 2.4*sc, 8*sc, 0, 0, Math.PI*2); ctx.fill();

    // antennae: hair-thin curved lines with knobbed tips
    ctx.shadowBlur = 5 * sc;
    ctx.strokeStyle = 'rgba(62, 212, 232, 0.78)';
    ctx.lineWidth = 0.9 * sc;
    ctx.beginPath(); ctx.moveTo(-2*sc, -4*sc);
    ctx.bezierCurveTo(-7*sc, -13*sc, -14*sc, -17*sc, -17*sc, -13*sc); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2*sc, -4*sc);
    ctx.bezierCurveTo(7*sc, -13*sc, 14*sc, -17*sc, 17*sc, -13*sc); ctx.stroke();
    ctx.fillStyle = 'rgba(140, 252, 255, 0.96)';
    ctx.beginPath(); ctx.arc(-17*sc, -13*sc, 1.7*sc, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(17*sc, -13*sc, 1.7*sc, 0, Math.PI*2); ctx.fill();

    ctx.shadowBlur = 0; // must reset: a leftover shadow would bleed into subsequent draw calls
    ctx.restore();
  }
}
