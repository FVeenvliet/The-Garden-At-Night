// sketch.js - main entry point. Globals, constants, setup(), draw(), and Arduino serial.

// Author: Femke Veenvliet, 1701452
// Course: DBB100 Creative Programming
// Date: 09/03/2026
//
// Animated bioluminescent night garden in p5.js. Three teal flowers grow from the ground,
// surrounded by reeds, ferns, mushrooms and mossy stones. The sky transitions between
// deep night and full daytime, driven by an Arduino LDR sensor.
//
// Controls:
// - SPACE bar: toggle rain on/off
// - Arduino potmeter: wind strength (0-1023 becomes 1-10)
// - Arduino LDR: time-of-day (dark = night, bright = day)
// - Arduino button: toggle rain (same as SPACE)
//
// All coordinates are designed at 900x680 px (REF_WxREF_H) and scaled at runtime.

// ---Top-level state variables---

let startMs; // ms timestamp from setup(); everything measures elapsed time from here
let glowLights = []; // GlowLight instances: 8 per flower, 24 total
let STARS = [];
let SHOOTING_STARS = [];
let moths        = []; // 2 orbit + 4 drift moths
let RAIN_DROPS   = [];
let SPLASHES     = []; // short-lived splash rings spawned when rain drops hit the ground
let timeOfDay     = 0; // smoothed 0-1 blend: 0 = night, 1 = full day
let todTarget     = 0; // raw LDR target, timeOfDay lerps toward this each frame
let sceneT        = 0; // exposed copy of t so gustyWind() can read it without a parameter
let rainTarget    = 0; // toggled by SPACE/button; rainIntensity smoothly follows this
let rainIntensity = 0;
let windStrength  = 1.0; // 1.0 = calm; driven by potmeter + rain turbulence
let glowMultiplier = 1.0; // higher in darkness (from LDR); boosts bioluminescent brightness
let prevT         = 0; // last frame's t, used to compute dt

// ---Serial (Arduino)---
// Expects "pot,button,ldr\n" lines over Web Serial (Chrome only).
// Falls back to calm-night defaults if no Arduino is connected.
// Sources:
// - Web Serial API - reading Arduino data in the browser: https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API
// - Step-by-step Web Serial + microcontroller tutorial: https://codelabs.developers.google.com/codelabs/web-serial/
// - Web Serial with p5.js specifically: https://makeabilitylab.github.io/physcomp/communication/web-serial.html
let serialPort       = null;
let serialConnected  = false;
let potValue         = 0; // ADC 0-1023: windStrength
let lightValue       = 512; // ADC 0-1023: timeOfDay and glowMultiplier
let buttonState      = 0; // 0 = released, 1 = pressed
let prevButtonState  = 0; // previous frame + used to detect rising edge

// ---Color palette---
// RGB triples spread into p5's fill/stroke. Hex values match the original CSS by 
// https://codepen.io/mdusmanansari/pen/BamepLe (Md Usman Ansari - animated flower in p5.js, used as reference for petal structure and bloom layout)
const C = {
  petalLight: [167, 255, 238], // #a7ffee
  petalMid: [84, 184, 170], // #54b8aa
  petalDark: [57, 198, 214], // #39c6d6
  stemTop: [57, 198, 214], // matches petalDark so stem and petal hues connect
  stemBot: [20, 117, 122], // #14757a: darkens toward the root
  leaf: [57, 198, 214],
  leafDark: [7, 144, 151], // #079097
  white: [255, 255, 255],
  yellow: [255, 252, 0], // stamen + some firefly particles
  cyan: [35, 240, 255], // firefly glow colour
  glow: [107, 240, 255], // softer cyan for halos
  grass: [21, 159, 170], // reed and grass stroke colour
};

// ---Flower definitions---
// All stems root at the same point; rot fans them out like a bouquet.
// leaves must be even - they're always drawn in left/right pairs.
const FLOWERS = [
  { dx: 0, rot: -22, h: 240, stemDelay: 0.5, bloomDelay: 1.3, leaves: 6 }, // left
  { dx: 0, rot: 0, h: 300, stemDelay: 0.3, bloomDelay: 1.0, leaves: 8 }, // centre — tallest, blooms first
  { dx: 0, rot: 22, h: 252, stemDelay: 0.7, bloomDelay: 1.6, leaves: 6 }, // right
];

// ---Lifecycle---
// Reference dimensions - scl is derived from REF_H so the bouquet fills the canvas consistently.
const REF_W = 900, REF_H = 680;

function setup() {
  let cnv = createCanvas(windowWidth, windowHeight);
  cnv.elt.style.zIndex = '0';  // keep canvas behind any HTML overlay elements
  colorMode(RGB, 255, 255, 255, 255);

  // -Stars-
  randomSeed(42); // fixed seed = same star field every load
  for (let i = 0; i < 180; i++) {
    STARS.push({
      x:     random(width),
      y:     random(height * 0.72), // sky region only
      r:     random(0.4, 2.0),
      phase: random(TWO_PI), // individual twinkle offset
      spd:   random(0.4, 1.8)
    });
  }
  randomSeed();

  startMs = millis();

  // -Glow lights-
  // 8 firefly particles per flower; staggered start times handled in GlowLight._reset()
  for (let fi = 0; fi < FLOWERS.length; fi++) {
    for (let i = 0; i < 8; i++) glowLights.push(new GlowLight(fi, i));
  }

  // -Shooting stars-
  randomSeed(55); // fixed seed for reproducible trajectories
  for (let i = 0; i < 5; i++) {
    SHOOTING_STARS.push({
      x0:       random(width * 0.08, width * 0.88),
      y0:       random(8, height * 0.30),
      ang:      (i % 2 === 0) ? random(0.42, 0.72) : random(Math.PI - 0.72, Math.PI - 0.42), // alternate travel directions
      len:      random(130, 260),
      tailLen:  random(70, 130),
      activeMs: random(650, 1150),
      period:   random(7000, 20000),
      offset:   random(0, 18000),   // phase offset so they don't all fire at once
    });
  }

  // -Rain drops-
  // Pre-scatter above the canvas so they're ready the moment rain turns on
  for (let i = 0; i < 280; i++) {
    RAIN_DROPS.push({
      x:     random(-60, width + 60),
      y:     random(-height, 0),
      spd:   random(380, 680),
      len:   random(9, 22),
      alpha: random(0.22, 0.52),
    });
  }
  randomSeed(); // release fixed seed before creating moths

  // -Moths-
  // Two orbit moths circle the side flowers; four drift moths cross the scene slowly
  moths.push(new Moth({ type: 'orbit', fi: 0, orbR: 68, sc: 0.78, spd: 1.25 }));
  moths.push(new Moth({ type: 'orbit', fi: 2, orbR: 72, sc: 0.82, spd: 0.85 }));

  // dir: 1 = left to right, -1 = right to left
  moths.push(new Moth({ type: 'drift', dir:  1, sc: 0.62, yFrac: 0.52, driftSpd: 0.016, waveAmp: 26, waveFreq: 0.52 }));
  moths.push(new Moth({ type: 'drift', dir: -1, sc: 0.70, yFrac: 0.38, driftSpd: 0.013, waveAmp: 20, waveFreq: 0.68 }));
  moths.push(new Moth({ type: 'drift', dir:  1, sc: 0.50, yFrac: 0.65, driftSpd: 0.020, waveAmp: 15, waveFreq: 0.44 }));
  moths.push(new Moth({ type: 'drift', dir: -1, sc: 0.58, yFrac: 0.28, driftSpd: 0.011, waveAmp: 30, waveFreq: 0.60 }));
}

// star positions are fixed from setup() and won't redistribute on resize
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  let ms  = millis();
  let t   = (ms - startMs) / 1000;
  let dt  = min(t - prevT, 0.05); prevT = t; // cap at 50 ms so physics don't explode if the tab was backgrounded
  sceneT = t; // module-level copy so gustyWind() can read it without a parameter

  let scl     = (height / REF_H) * 0.5;
  let groundY = height * 0.83;

  // ---Rain physics---
  // ramps up fast (0.9), fades out slowly (0.25): feels more natural
  let rainRate   = rainTarget > rainIntensity ? 0.9 : 0.25;
  rainIntensity += (rainTarget - rainIntensity) * dt * rainRate;

  // ---Arduino sensor mapping---
  if (serialConnected) {
    windStrength   = map(potValue,   0, 1023, 1.0, 10.0) + rainIntensity * 1.2;
    todTarget      = map(lightValue, 0, 1023, 0, 1);
    glowMultiplier = map(lightValue, 0, 1023, 5.0, 0.40); // dark room causes stronger bioluminescence
    if (buttonState === 1 && prevButtonState === 0)
      rainTarget = rainTarget > 0.5 ? 0 : 1; // rising edge = toggle rain
    prevButtonState = buttonState;
  } else {
    windStrength   = 1.0 + rainIntensity * 1.2;
    todTarget      = 0;
    glowMultiplier = 1.0;
  }

  timeOfDay += (todTarget - timeOfDay) * dt * 1.5; // smooth so LDR changes don't pop

  // back-to-front draw order
  drawBackground(t, ms, groundY);

  // ground spans full canvas width, so draw without the content scale
  push(); translate(width / 2, groundY); drawGround(t, ms); pop();

  drawStones(groundY);
  drawGroundFog(t, groundY);
  if (rainIntensity > 0.01) drawRain(dt, groundY);
  drawGroundPlants(t, groundY);
  drawMushrooms(t, ms, groundY);

  // order [0, 2, 1] paints the centre flower last so it sits on top of the side flowers
  push();
  translate(width / 2, groundY);
  scale(scl);
  for (let idx of [0, 2, 1]) drawFlower(t, ms, FLOWERS[idx], idx);
  for (let l of glowLights) l.draw(ms, t);
  pop();

  for (let m of moths) m.draw(t, dt, scl, groundY); // moths in screen space, not flower transform
}

function keyPressed() {
  if (key === ' ') rainTarget = rainTarget > 0.5 ? 0 : 1;
}

// Web Serial API - Chrome only
async function connectSerial() {
  if (!navigator.serial) {
    alert('Web Serial not supported. Open in Chrome or Edge.');
    return;
  }
  try {
    serialPort = await navigator.serial.requestPort();
    await serialPort.open({ baudRate: 9600 });
    serialConnected = true;
    const btn = document.getElementById('connect-btn');
    if (btn) { btn.textContent = 'Arduino Connected'; btn.classList.add('connected'); }
    const enter = document.getElementById('enter-btn');
    if (enter) enter.style.display = 'flex';
    readSerial();
  } catch (e) {
    console.warn('Serial connection failed:', e); // In case the user dismissed the dialog
  }
}

// Reads "pot,button,ldr\n" lines from the serial port continuously
async function readSerial() {
  const decoder = new TextDecoderStream();
  serialPort.readable.pipeTo(decoder.writable);
  const reader = decoder.readable.getReader();
  let buf = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += value;
      let lines = buf.split('\n');
      buf = lines.pop(); // last element may be an incomplete line: hold it for next chunk
      for (let line of lines) {
        let p = line.trim().split(',');
        if (p.length === 3) {
          potValue    = parseInt(p[0]) || 0;
          buttonState = parseInt(p[1]) || 0;
          lightValue  = parseInt(p[2]) || 0;
        }
      }
    }
  } catch (e) {
    console.warn('Serial read error:', e);
    serialConnected = false;
    const btn = document.getElementById('connect-btn');
    if (btn) { btn.textContent = 'Connect to Arduino'; btn.classList.remove('connected'); }
  }
}
