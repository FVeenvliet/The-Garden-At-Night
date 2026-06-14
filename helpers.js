// helpers.js - utility functions: gustyWind(), gp(), easeOut3(), easeOut2(), cbv(), pc()

// ---Helpers---

// Four additive sine waves at different frequencies so nearby elements share the same
// general wind field but each responds slightly differently (pass a unique phase per element).
// Returns 0 when windStrength smaller or equal to 1 (calm), positive otherwise.
// Source for layering sine waves at different frequencies for turbulence: https://dr-nick-nagel.github.io/blog/billow-effect.html
function gustyWind(phase) {
  let base = windStrength - 1;
  if (base <= 0) return 0;
  let g = 0.40 * Math.sin(sceneT * 0.85 + phase)
        + 0.28 * Math.sin(sceneT * 2.20 + phase * 1.5 + 1.2)
        + 0.18 * Math.sin(sceneT * 5.30 + phase * 0.9 + 2.6)
        + 0.14 * Math.sin(sceneT * 12.10 + phase * 1.3 + 0.9);
  // shift so the output is mostly positive with occasional lulls near 0
  g = 0.75 + g * 0.72;
  return base * Math.max(g, 0.02); // floor at 0.02 so elements don't completely freeze in a lull
}

// linear progress 0 to 1; starts at t=delay, reaches 1 after dur seconds
function gp(t, delay, dur) {
  return constrain((t - delay) / dur, 0, 1);
}

function easeOut3(x) { return 1 - pow(1 - x, 3); } // fast start, slow finish: good for organic growth
function easeOut2(x) { return 1 - pow(1 - x, 2); } // gentler version of the above

// bezierVertex() broke in p5.js v2, so this samples the cubic Bezier formula manually.
// Call from inside a beginShape()/endShape() block after a vertex(sx, sy).
// Source for cubic Bezier manual sampling formula B(t): https://pomax.github.io/bezierinfo/ and https://javascript.info/bezier-curve
function cbv(sx, sy, cx1, cy1, cx2, cy2, ex, ey, steps) {
  steps = steps || 12;
  for (let i = 1; i <= steps; i++) {
    let t  = i / steps;
    let u  = 1 - t;
    // standard cubic Bezier: B(t) = (1-t)^3 P0 + 3(1-t)^2 tP1 + 3(1-t)t^2 P2 + t^3 P3
    let x  = u*u*u*sx + 3*u*u*t*cx1 + 3*u*t*t*cx2 + t*t*t*ex;
    let y  = u*u*u*sy + 3*u*u*t*cy1 + 3*u*t*t*cy2 + t*t*t*ey;
    vertex(x, y);
  }
}

// Blends between a night colour and day colour based on timeOfDay (0=night, 1=day).
// Pass da to also interpolate the alpha channel; omit it to keep alpha fixed at a.
// ~~ is Math.floor for positive numbers: slightly faster in tight gradient loops.
// Source for linear interpolation for colour transitions: https://www.alanzucconi.com/2016/01/06/colour-interpolation/ and https://p5js.org/reference/p5/lerpColor/
function pc(nr, ng, nb, dr, dg, db, a, da) {
  let d  = timeOfDay;
  let fa = da !== undefined ? +(a + (da - a) * d).toFixed(3) : a;
  return `rgba(${~~(nr+(dr-nr)*d)},${~~(ng+(dg-ng)*d)},${~~(nb+(db-nb)*d)},${fa})`;
}
