# The Garden at Night

**Author:** Femke Veenvliet
**Course:** DBB100 Creative Programming
**Credentials:** Department of Industrial Design, Eindhoven University of Technology
**Date:** March 2026

An animated bioluminescent night garden built in p5.js. Three teal flowers grow from the ground, surrounded by reeds, ferns, mushrooms and mossy stones. The sky transitions between deep night and full daytime. Moths drift and orbit the blooms. Rain falls, fireflies rise. Everything responds to a live Arduino sensor board.

---

## How to run

1. Open `index.html` in **Chrome or Edge** (Web Serial is not supported in Firefox or Safari)
2. The intro screen plays automatically, no interaction needed
3. Once the hardware guide appears, click **Connect to Arduino** and select the correct port
4. Click the arrow button to enter the garden
5. The sensor bar minimises to the bottom-left corner and the installation is live

No build step or local server is required. All files are plain HTML, CSS and JavaScript.

---

## Controls

| Input | Effect |
|---|---|
| Arduino potentiometer | Wind strength (calm - storm) |
| Arduino LDR | Time of day (dark room = night, bright room = day) |
| Arduino button | Toggle rain on / off |
| Spacebar | Toggle rain on / off (same as button) |

---

## Hardware

### Components

- Arduino Uno
- Potentiometer
- LDR (light dependent resistor)
- Pushbutton
- 3x LED
- 3x 220 Ω resistor (for LEDs)
- 1x 10 kΩ resistor (voltage divider for LDR)

### Pin layout

| Pin | Component |
|---|---|
| A0 | Potentiometer (middle leg) |
| A1 | LDR (with 10 kΩ to GND) |
| D2 | Button (INPUT_PULLUP - other leg to GND) |
| D6 | LED - wind indicator (PWM, mirrors pot value) |
| D7 | LED - rain indicator (on = rain active) |
| D3 | LED - day/night indicator (PWM, mirrors LDR) |

### LDR wiring

The LDR needs a voltage divider to produce a readable range:

```
5V, to LDR, to A1, to 10kΩ resistor, to GND
```

Without the 10 kΩ resistor to GND the pin floats near 5V and always reads 1023.

### LED wiring (same for all three)

```
Arduino pin to 220Ω resistor, to LED anode (long leg), to LED cathode (short leg), to GND
```

### Serial protocol

The Arduino sends one comma-separated line at 9600 baud, 30 ms interval:

```
pot,button,ldr\n
```

All three values are raw ADC readings (0-1023). The browser reads these via the Web Serial API and maps them to wind strength, rain toggle and time of day.

---

## File structure

```
index.html - entry point, HTML shell, CSS, intro and hardware guide
helpers.js - shared utilities: gustyWind(), pc(), gp(), easeOut(), cbv()
flowers_draw.js - all flower drawing: stem, leaves, bloom, petals
background.js - sky, stars, moon, sun, trees, ground, shooting stars
environment.js - fog, mushrooms, rain, reeds, ferns, grass, stones
creatures.js - GlowLight (firefly particles) and Moth classes
sketch.js - setup(), draw(), Arduino serial connection
gardenSensors.ino - Arduino sketch (reads sensors, drives LEDs, sends serial)
```

---

## Dependencies

- [p5.js 1.7.0](https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/p5.min.js) - loaded from CDN, no install needed
- Web Serial API - built into Chrome and Edge, no extension needed
