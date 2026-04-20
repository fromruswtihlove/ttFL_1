#include <FastLED.h>

#define LED_PIN 4
#define MATRIX_WIDTH 16
#define MATRIX_HEIGHT 16
#define NUM_LEDS (MATRIX_WIDTH * MATRIX_HEIGHT)

CRGB leds[NUM_LEDS];
uint8_t heat[NUM_LEDS];

void setup() {
  Serial.begin(115200);
  FastLED.addLeds<WS2812B, LED_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(150);
  FastLED.clear();
  FastLED.show();
}

void loop() {
  // Раскомментируйте нужную анимацию для тестирования

  //rainbowWave();
  //pulsingCenter();
  //movingSquare();
  //fireEffect();
  //rainbowSpectrum();
  //randomFlashes();
  //waveFromCenter();

  FastLED.delay(30);
}

// Пример 1: Радужная волна
void rainbowWave() {
  static uint8_t offset = 0;

  for (int y = 0; y < MATRIX_HEIGHT; y++) {
    for (int x = 0; x < MATRIX_WIDTH; x++) {
      int index = y * MATRIX_WIDTH + x;
      uint8_t hue = (x * 16 + y * 16 + offset) % 256;
      leds[index] = CHSV(hue, 255, 255);
    }
  }

  offset++;
  FastLED.show();
}

// Пример 2: Пульсирующий центр
void pulsingCenter() {
  static uint8_t pulse = 0;

  int centerX = MATRIX_WIDTH / 2;
  int centerY = MATRIX_HEIGHT / 2;

  for (int y = 0; y < MATRIX_HEIGHT; y++) {
    for (int x = 0; x < MATRIX_WIDTH; x++) {
      int index = y * MATRIX_WIDTH + x;

      int dx = x - centerX;
      int dy = y - centerY;
      int distance = sqrt(dx * dx + dy * dy);

      uint8_t brightness = max(0, 255 - distance * 20 - pulse);
      leds[index] = CRGB(brightness, brightness / 2, 0);
    }
  }

  pulse = (pulse + 5) % 256;
  FastLED.show();
}

// Пример 3: Движущийся по диагонали квадрат
void movingSquare() {
  static int pos = 0;
  FastLED.clear();

  int squareSize = 4;
  int x = pos;
  int y = pos;

  for (int dy = 0; dy < squareSize; dy++) {
    for (int dx = 0; dx < squareSize; dx++) {
      int px = x + dx;
      int py = y + dy;

      if (px >= 0 && px < MATRIX_WIDTH && py >= 0 && py < MATRIX_HEIGHT) {
        int index = py * MATRIX_WIDTH + px;
        leds[index] = CRGB(0, 255, 100);
      }
    }
  }

  pos = (pos + 1) % (MATRIX_WIDTH + squareSize);
  FastLED.show();
}

// Пример 4: Эффект огня
void fireEffect() {
  // Охлаждение
  for (int i = 0; i < NUM_LEDS; i++) {
    heat[i] = qsub8(heat[i], random8(0, 25));
  }

  // Добавление тепла внизу матрицы
  for (int x = 0; x < MATRIX_WIDTH; x++) {
    int index = (MATRIX_HEIGHT - 1) * MATRIX_WIDTH + x;
    heat[index] = qadd8(heat[index], random8(160, 255));
  }

  // Распространение тепла вверх
  for (int y = MATRIX_HEIGHT - 1; y > 0; y--) {
    for (int x = 0; x < MATRIX_WIDTH; x++) {
      int index = y * MATRIX_WIDTH + x;
      int indexBelow = (y - 1) * MATRIX_WIDTH + x;
      heat[index] = (heat[index] + heat[indexBelow] + heat[indexBelow]) / 3;
    }
  }

  // Отрисовка пламени
  for (int i = 0; i < NUM_LEDS; i++) {
    leds[i] = HeatColor(heat[i]);
  }

  FastLED.show();
}

// Пример 5: Радужный спектр с движением
void rainbowSpectrum() {
  static uint8_t hueOffset = 0;

  for (int y = 0; y < MATRIX_HEIGHT; y++) {
    for (int x = 0; x < MATRIX_WIDTH; x++) {
      int index = y * MATRIX_WIDTH + x;
      uint8_t hue = (x * 16 + hueOffset) % 256;
      leds[index] = CHSV(hue, 255, 255);
    }
  }

  hueOffset += 2;
  FastLED.show();
}

// Пример 6: Случайные вспышки (звёздный дождь)
void randomFlashes() {
  fadeToBlackBy(leds, NUM_LEDS, 20);

  for (int i = 0; i < 5; i++) {
    int randomIndex = random16(NUM_LEDS);
    leds[randomIndex] = CRGB(random8(150, 255), random8(150, 255), random8(150, 255));
  }

  FastLED.show();
}

// Пример 7: Волна от центра
void waveFromCenter() {
  static uint8_t wave = 0;

  int centerX = MATRIX_WIDTH / 2;
  int centerY = MATRIX_HEIGHT / 2;

  for (int y = 0; y < MATRIX_HEIGHT; y++) {
    for (int x = 0; x < MATRIX_WIDTH; x++) {
      int index = y * MATRIX_WIDTH + x;

      int dx = x - centerX;
      int dy = y - centerY;
      int distance = sqrt(dx * dx + dy * dy) * 8;

      uint8_t brightness = 255 * sin8(distance - wave) / 256;
      leds[index] = CHSV(200, 255, brightness);
    }
  }

  wave += 8;
  FastLED.show();
}
