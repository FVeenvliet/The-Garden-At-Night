/*
  Arduino sketch: Challenge 2
  Author: Femke Veenvliet, 1701452
  Course: DBB100 Creative Programming

  Reads three inputs and sends them to Processing over serial as a
  comma-separated string, one line per loop:
    potValue,buttonState,lightValue

  Wiring:
  - Potentiometer: analog pin A0  (outer legs to 5V and GND, wiper to A0)
  - Push button: digital pin 2  (one leg to pin 2, opposite leg to GND)
  - Light sensor: analog pin A1  (in series with a 10kΩ resistor to GND, junction to A1)
  - LED potentiometer: digital PWM pin 6  (with 220Ω resistor to pin)
  - LED button: digital pin 7  (with 220Ω resistor to pin)
  - LED LDR: digital PWM pin 9  (with 220Ω resistor to pin)

  Sources: 
  - INPUT_PULLUP for the button (inverted logic, no external resistor needed): https://www.arduino.cc/en/Tutorial/DigitalInputPullup
  - analogWrite() PWM for LED brightness control: https://docs.arduino.cc/language-reference/en/functions/analog-io/analogWrite/
  - How Arduino PWM timers actually work: https://www.arduino.cc/en/Tutorial/SecretsOfArduinoPWM
  - LDR voltage divider wiring and analogRead(): https://maker.pro/arduino/tutorial/how-to-use-an-ldr-sensor-with-arduino
*/

const int POT_PIN    = A0;
const int BUTTON_PIN = 2;
const int LIGHT_PIN  = A1;
const int LED_POT    = 6;
const int LED_BUTTON = 7;
const int LED_LDR    = 3;

bool rainActive   = false;
bool prevBtnState = false;

void setup() {
  Serial.begin(9600);
  analogReference(DEFAULT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(LED_POT,    OUTPUT);
  pinMode(LED_BUTTON, OUTPUT);
  pinMode(LED_LDR,    OUTPUT);
}

void loop() {
  // read each analog pin twice — first read lets the ADC settle after switching channels
  analogRead(POT_PIN);
  int potValue = analogRead(POT_PIN);

  analogRead(LIGHT_PIN);
  int lightValue = analogRead(LIGHT_PIN);

  bool btnNow = digitalRead(BUTTON_PIN);

  // rising edge toggle — same logic as sketch.js
  if (btnNow && !prevBtnState) {
    rainActive = !rainActive;
  }
  prevBtnState = btnNow;

  // send all three values over serial
  Serial.print(potValue);
  Serial.print(",");
  Serial.print(btnNow);
  Serial.print(",");
  Serial.println(lightValue);

  // pot LED mirrors wind strength
  int ledBrightness = map(potValue, 0, 1023, 0, 255);
  analogWrite(LED_POT, ledBrightness);

  // button LED stays on while rain is active
  digitalWrite(LED_BUTTON, rainActive ? HIGH : LOW);

  // LDR LED mirrors day/night - brighter light = brighter LED
  int ldrBrightness = map(lightValue, 200, 800, 0, 255);
  ldrBrightness = constrain(ldrBrightness, 0, 255);
  analogWrite(LED_LDR, ldrBrightness);

  delay(30);
}
