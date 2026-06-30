import type { DeviceConfig, Segment, Layer, BlendMode, GradientStop } from '../types/led';
import { compileScript } from './mathParser';

// Helper to convert HEX to RGB
export function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
  return [r, g, b];
}

// Helper to convert RGB to HEX
export function rgbToHex(r: number, g: number, b: number): string {
  const clampR = Math.max(0, Math.min(255, Math.floor(r)));
  const clampG = Math.max(0, Math.min(255, Math.floor(g)));
  const clampB = Math.max(0, Math.min(255, Math.floor(b)));
  return '#' + ((1 << 24) + (clampR << 16) + (clampG << 8) + clampB).toString(16).slice(1);
}

// HSL to RGB helper for rainbow cycles
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = h % 360;
  s = s / 100;
  l = l / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  ];
}

// Interpolate between two stops
function interpolateColor(color1: string, color2: string, factor: number): [number, number, number] {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  return [
    Math.round(rgb1[0] + factor * (rgb2[0] - rgb1[0])),
    Math.round(rgb1[1] + factor * (rgb2[1] - rgb1[1])),
    Math.round(rgb1[2] + factor * (rgb2[2] - rgb1[2]))
  ];
}

// Evaluate gradient Stops
export function evaluateGradient(stops: GradientStop[], offset: number): [number, number, number] {
  if (stops.length === 0) return [0, 0, 0];
  if (stops.length === 1) return hexToRgb(stops[0].color);

  // Normalize offset to 0-1
  let norm = ((offset % 1) + 1) % 1;

  // Sort stops by offset
  const sorted = [...stops].sort((a, b) => a.offset - b.offset);

  // If before first or after last
  if (norm <= sorted[0].offset) return hexToRgb(sorted[0].color);
  if (norm >= sorted[sorted.length - 1].offset) return hexToRgb(sorted[sorted.length - 1].color);

  // Find surrounding stops
  for (let i = 0; i < sorted.length - 1; i++) {
    const left = sorted[i];
    const right = sorted[i + 1];
    if (norm >= left.offset && norm <= right.offset) {
      const factor = (norm - left.offset) / (right.offset - left.offset);
      return interpolateColor(left.color, right.color, factor);
    }
  }

  return hexToRgb(sorted[0].color);
}

// Basic 2D Perlin-like noise function for gradients/noise-mapping
// Source: simplified value noise
function valueNoise2D(x: number, y: number): number {
  const X = Math.floor(x);
  const Y = Math.floor(y);
  const fx = x - X;
  const fy = y - Y;
  const ux = fx * fx * (3.0 - 2.0 * fx);
  const uy = fy * fy * (3.0 - 2.0 * fy);

  const hash = (p1: number, p2: number) => {
    const h = p1 * 59 + p2 * 113;
    return (Math.sin(h) * 43758.5453123) % 1;
  };

  const n00 = Math.abs(hash(X, Y));
  const n10 = Math.abs(hash(X + 1, Y));
  const n01 = Math.abs(hash(X, Y + 1));
  const n11 = Math.abs(hash(X + 1, Y + 1));

  return n00 * (1 - ux) * (1 - uy) +
         n10 * ux * (1 - uy) +
         n01 * (1 - ux) * uy +
         n11 * ux * uy;
}

// Map noise value (0-1) to palette
export function samplePalette(palette: string, val: number, cStart = '#ff0000', cEnd = '#0000ff'): [number, number, number] {
  val = Math.max(0, Math.min(1, val));
  switch (palette) {
    case 'rainbow':
      return hslToRgb(val * 360, 100, 50);
    case 'fire':
      // Black -> Red -> Orange -> Yellow -> White
      if (val < 0.25) return interpolateColor('#000000', '#ff0000', val / 0.25);
      if (val < 0.5) return interpolateColor('#ff0000', '#ff8800', (val - 0.25) / 0.25);
      if (val < 0.75) return interpolateColor('#ff8800', '#ffff00', (val - 0.5) / 0.25);
      return interpolateColor('#ffff00', '#ffffff', (val - 0.75) / 0.25);
    case 'ocean':
      // Black -> Deep Blue -> Teal -> Cyan -> White
      if (val < 0.25) return interpolateColor('#000000', '#000088', val / 0.25);
      if (val < 0.5) return interpolateColor('#000088', '#008080', (val - 0.25) / 0.25);
      if (val < 0.75) return interpolateColor('#008080', '#00ffff', (val - 0.5) / 0.25);
      return interpolateColor('#00ffff', '#ffffff', (val - 0.75) / 0.25);
    case 'forest':
      // Black -> Dark Green -> Lime Green -> Yellow
      if (val < 0.3) return interpolateColor('#000000', '#004d00', val / 0.3);
      if (val < 0.7) return interpolateColor('#004d00', '#00ff00', (val - 0.3) / 0.4);
      return interpolateColor('#00ff00', '#ffff00', (val - 0.7) / 0.3);
    case 'custom':
    default:
      return interpolateColor(cStart, cEnd, val);
  }
}

// Color Blending Modes
export function blendColors(base: [number, number, number], blend: [number, number, number], opacity: number, mode: BlendMode): [number, number, number] {
  const rB = base[0], gB = base[1], bB = base[2];
  const rL = blend[0], gL = blend[1], bL = blend[2];

  let rF = rL, gF = gL, bF = bL;

  switch (mode) {
    case 'add':
      rF = rB + rL;
      gF = gB + gL;
      bF = bB + bL;
      break;
    case 'multiply':
      rF = (rB / 255) * (rL / 255) * 255;
      gF = (gB / 255) * (gL / 255) * 255;
      bF = (bB / 255) * (bL / 255) * 255;
      break;
    case 'screen':
      rF = 255 - ((255 - rB) * (255 - rL)) / 255;
      gF = 255 - ((255 - gB) * (255 - gL)) / 255;
      bF = 255 - ((255 - bB) * (255 - bL)) / 255;
      break;
    case 'difference':
      rF = Math.abs(rB - rL);
      gF = Math.abs(gB - gL);
      bF = Math.abs(bB - bL);
      break;
    case 'overlay':
      const blendCh = (b: number, l: number) => {
        return b < 128
          ? (2 * b * l) / 255
          : 255 - (2 * (255 - b) * (255 - l)) / 255;
      };
      rF = blendCh(rB, rL);
      gF = blendCh(gB, gL);
      bF = blendCh(bB, bL);
      break;
    case 'normal':
    default:
      rF = rL;
      gF = gL;
      bF = bL;
      break;
  }

  // Clamp values and apply opacity
  const clampedRF = Math.max(0, Math.min(255, Math.floor(rF)));
  const clampedGF = Math.max(0, Math.min(255, Math.floor(gF)));
  const clampedBF = Math.max(0, Math.min(255, Math.floor(bF)));

  return [
    Math.round(rB * (1 - opacity) + clampedRF * opacity),
    Math.round(gB * (1 - opacity) + clampedGF * opacity),
    Math.round(bB * (1 - opacity) + clampedBF * opacity)
  ];
}

// Compute the layout positions of LEDs
export interface PixelCoord {
  index: number;
  x: number; // raw x
  y: number; // raw y
  nx: number; // normalized x (0 to 1)
  ny: number; // normalized y (0 to 1)
}

export function getLEDCoordinates(config: DeviceConfig): PixelCoord[] {
  const coords: PixelCoord[] = [];

  if (config.type === 'strip') {
    for (let i = 0; i < config.length; i++) {
      coords.push({
        index: i,
        x: i,
        y: 0,
        nx: config.length > 1 ? i / (config.length - 1) : 0.5,
        ny: 0.5
      });
    }
  } else if (config.type === 'matrix') {
    const w = config.width;
    const h = config.height;
    const isSerpentine = config.matrixLayout === 'serpentine';
    const total = w * h;

    for (let i = 0; i < total; i++) {
      let col = i % w;
      const row = Math.floor(i / w);

      // Handle serpentine layout: alternate rows go reverse direction
      if (isSerpentine && row % 2 === 1) {
        col = w - 1 - col;
      }

      coords.push({
        index: i,
        x: col,
        y: row,
        nx: w > 1 ? col / (w - 1) : 0.5,
        ny: h > 1 ? row / (h - 1) : 0.5
      });
    }
  } else if (config.type === 'ring') {
    const count = config.ringCount;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 2 * Math.PI - Math.PI / 2; // Start from top
      const cx = 0.5 + 0.45 * Math.cos(angle);
      const cy = 0.5 + 0.45 * Math.sin(angle);
      coords.push({
        index: i,
        x: Math.cos(angle),
        y: Math.sin(angle),
        nx: cx,
        ny: cy
      });
    }
  }

  return coords;
}

// Render the colors of all pixels
// Cache compiled scripts to avoid recompiling every frame
const scriptCache: { [code: string]: (i: number, t: number, x: number, y: number, w: number, h: number) => [number, number, number] } = {};

export function renderLEDs(
  config: DeviceConfig,
  segments: Segment[],
  layers: Layer[],
  time: number,
  audioSpectrum: { bass: number; mid: number; treble: number; waveform: number[] }
): [number, number, number][] {
  const coords = getLEDCoordinates(config);
  const totalLEDs = coords.length;
  const pixels: [number, number, number][] = Array(totalLEDs).fill(null).map(() => [0, 0, 0]);

  // Matrix layout sizes for formulas
  const w = config.type === 'matrix' ? config.width : totalLEDs;
  const h = config.type === 'matrix' ? config.height : 1;

  // Process layer by layer (bottom to top)
  for (const layer of layers) {
    if (!layer.visible || layer.opacity === 0) continue;

    // Resolve target segment LEDs
    let isLEDInSegment = (_idx: number) => true;
    if (layer.segmentId !== 'all') {
      const seg = segments.find(s => s.id === layer.segmentId);
      if (seg) {
        isLEDInSegment = (idx: number) => idx >= seg.start && idx <= seg.end;
      }
    }

    // Prepare variables if script type
    let scriptFn: any = null;
    if (layer.effectType === 'script' && layer.params.script) {
      const code = layer.params.script.code;
      if (!scriptCache[code]) {
        const compiled = compileScript(code);
        scriptCache[code] = compiled.fn;
      }
      scriptFn = scriptCache[code];
    }

    for (let idx = 0; idx < totalLEDs; idx++) {
      if (!isLEDInSegment(idx)) continue;

      const coord = coords[idx];
      let layerColor: [number, number, number] = [0, 0, 0];

      switch (layer.effectType) {
        case 'solid':
          if (layer.params.solid) {
            layerColor = hexToRgb(layer.params.solid.color);
          }
          break;

        case 'gradient':
          if (layer.params.gradient) {
            const p = layer.params.gradient;
            let offset = 0;
            if (config.type === 'matrix') {
              const rad = (p.direction * Math.PI) / 180;
              const proj = coord.nx * Math.cos(rad) + coord.ny * Math.sin(rad);
              offset = proj * p.frequency + time * p.speed;
            } else {
              offset = coord.nx * p.frequency + time * p.speed;
            }
            layerColor = evaluateGradient(p.stops, offset);
          }
          break;

        case 'noise':
          if (layer.params.noise) {
            const p = layer.params.noise;
            let nVal = 0;
            if (config.type === 'matrix') {
              nVal = valueNoise2D(coord.nx * p.scale, coord.ny * p.scale + time * p.speed);
            } else {
              nVal = valueNoise2D(coord.nx * p.scale, time * p.speed);
            }
            layerColor = samplePalette(p.palette, nVal, p.colorStart, p.colorEnd);
          }
          break;

        case 'chase':
          if (layer.params.chase) {
            const p = layer.params.chase;
            const cycle = (coord.index - time * p.speed * totalLEDs) % p.spacing;
            const positiveCycle = (cycle + p.spacing) % p.spacing;
            if (positiveCycle < p.size) {
              layerColor = hexToRgb(p.color);
            } else {
              layerColor = hexToRgb(p.bgColor);
            }
          }
          break;

        case 'script':
          if (scriptFn) {
            try {
              layerColor = scriptFn(coord.index, time, coord.x, coord.y, w, h);
            } catch {
              layerColor = [0, 0, 0];
            }
          }
          break;

        case 'audio':
          if (layer.params.audio) {
            const p = layer.params.audio;
            let amplitude = 0.1;
            if (p.mode === 'bass') amplitude = audioSpectrum.bass;
            else if (p.mode === 'mid') amplitude = audioSpectrum.mid;
            else if (p.mode === 'treble') amplitude = audioSpectrum.treble;
            else {
              // spectrum - spread the waveform index across LEDs
              const waveIdx = Math.floor(coord.nx * (audioSpectrum.waveform.length - 1));
              amplitude = (audioSpectrum.waveform[waveIdx] + 1) / 2; // map [-1,1] to [0,1]
            }

            // Scale amplitude by sensitivity
            const response = Math.max(0, Math.min(1, amplitude * p.sensitivity));

            if (p.mode === 'spectrum') {
              // Waveform representation: light up if within the response envelope
              const distFromCenter = Math.abs(coord.ny - 0.5);
              if (distFromCenter < response / 2) {
                layerColor = hexToRgb(p.color);
              } else {
                layerColor = hexToRgb(p.bgColor);
              }
            } else {
              // Pulse color based on volume
              layerColor = interpolateColor(p.bgColor, p.color, response);
            }
          }
          break;
      }

      // Blend onto existing pixel base
      pixels[idx] = blendColors(pixels[idx], layerColor, layer.opacity, layer.blendMode);
    }
  }

  return pixels;
}

// --- HARDWARE EXPORTERS ---

// 1. FastLED Exporter
export function exportToFastLED(presetTitle: string, config: DeviceConfig, layers: Layer[]): string {
  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_');
  const title = sanitize(presetTitle) || 'MyLEDAnimation';
  const totalPixels = config.type === 'matrix' ? config.width * config.height : (config.type === 'ring' ? config.ringCount : config.length);

  let ledSetup = '';
  if (config.type === 'matrix') {
    ledSetup = `
#define LED_PIN     6
#define COLOR_ORDER GRB
#define CHIPSET     WS2812B
#define MATRIX_WIDTH  ${config.width}
#define MATRIX_HEIGHT ${config.height}
#define NUM_LEDS    (MATRIX_WIDTH * MATRIX_HEIGHT)

CRGB leds[NUM_LEDS];
`;
  } else {
    ledSetup = `
#define LED_PIN     6
#define COLOR_ORDER GRB
#define CHIPSET     WS2812B
#define NUM_LEDS    ${totalPixels}

CRGB leds[NUM_LEDS];
`;
  }

  // Compile individual layers into descriptive comments or basic static functions
  let animationLogic = `// Procedural patterns for FastLED
void drawFrame(uint32_t ms) {
  float t = ms / 1000.0;
  
  // Accumulated colors for each pixel
  for (int i = 0; i < NUM_LEDS; i++) {
    float nx = (float)i / (NUM_LEDS - 1);
    int r_acc = 0;
    int g_acc = 0;
    int b_acc = 0;

`;

  layers.forEach((layer, idx) => {
    if (!layer.visible) return;
    animationLogic += `    // Layer ${idx + 1}: ${layer.name} (${layer.effectType})\n`;

    if (layer.effectType === 'solid' && layer.params.solid) {
      const rgb = hexToRgb(layer.params.solid.color);
      animationLogic += `    {\n`;
      animationLogic += `      int r = ${rgb[0]}; int g = ${rgb[1]}; int b = ${rgb[2]};\n`;
      animationLogic += `      r_acc = (r_acc * ${1 - layer.opacity}) + (r * ${layer.opacity});\n`;
      animationLogic += `      g_acc = (g_acc * ${1 - layer.opacity}) + (g * ${layer.opacity});\n`;
      animationLogic += `      b_acc = (b_acc * ${1 - layer.opacity}) + (b * ${layer.opacity});\n`;
      animationLogic += `    }\n\n`;
    } else if (layer.effectType === 'gradient' && layer.params.gradient) {
      const p = layer.params.gradient;
      const firstStop = p.stops[0]?.color || '#ff0000';
      const secondStop = p.stops[p.stops.length - 1]?.color || '#0000ff';
      const rgb1 = hexToRgb(firstStop);
      const rgb2 = hexToRgb(secondStop);

      animationLogic += `    {\n`;
      animationLogic += `      // Approximated linear gradient wave\n`;
      animationLogic += `      float wave = sin(nx * ${p.frequency * 2.0 * Math.PI} + t * ${p.speed * 2.0 * Math.PI}) * 0.5 + 0.5;\n`;
      animationLogic += `      int r = ${rgb1[0]} + wave * (${rgb2[0]} - ${rgb1[0]});\n`;
      animationLogic += `      int g = ${rgb1[1]} + wave * (${rgb2[1]} - ${rgb1[1]});\n`;
      animationLogic += `      int b = ${rgb1[2]} + wave * (${rgb2[2]} - ${rgb1[2]});\n`;
      animationLogic += `      r_acc = (r_acc * ${1 - layer.opacity}) + (r * ${layer.opacity});\n`;
      animationLogic += `      g_acc = (g_acc * ${1 - layer.opacity}) + (g * ${layer.opacity});\n`;
      animationLogic += `      b_acc = (b_acc * ${1 - layer.opacity}) + (b * ${layer.opacity});\n`;
      animationLogic += `    }\n\n`;
    } else if (layer.effectType === 'chase' && layer.params.chase) {
      const p = layer.params.chase;
      const rgb = hexToRgb(p.color);
      const bgRgb = hexToRgb(p.bgColor);

      animationLogic += `    {\n`;
      animationLogic += `      int chaseIndex = (int)(t * ${p.speed * totalPixels}) % ${p.spacing};\n`;
      animationLogic += `      int localIndex = i % ${p.spacing};\n`;
      animationLogic += `      int r = ${bgRgb[0]}; int g = ${bgRgb[1]}; int b = ${bgRgb[2]};\n`;
      animationLogic += `      if (localIndex >= chaseIndex && localIndex < chaseIndex + ${p.size}) {\n`;
      animationLogic += `        r = ${rgb[0]}; g = ${rgb[1]}; b = ${rgb[2]};\n`;
      animationLogic += `      }\n`;
      animationLogic += `      r_acc = (r_acc * ${1 - layer.opacity}) + (r * ${layer.opacity});\n`;
      animationLogic += `      g_acc = (g_acc * ${1 - layer.opacity}) + (g * ${layer.opacity});\n`;
      animationLogic += `      b_acc = (b_acc * ${1 - layer.opacity}) + (b * ${layer.opacity});\n`;
      animationLogic += `    }\n\n`;
    } else if (layer.effectType === 'script' && layer.params.script) {
      // Export custom math script by translating it into C/C++ syntax
      let cppCode = layer.params.script.code
        .replace(/Math\.sin/g, 'sin')
        .replace(/Math\.cos/g, 'cos')
        .replace(/Math\.tan/g, 'tan')
        .replace(/Math\.abs/g, 'abs')
        .replace(/Math\.min/g, 'min')
        .replace(/Math\.max/g, 'max')
        .replace(/Math\.sqrt/g, 'sqrt')
        .replace(/Math\.pow/g, 'pow')
        .replace(/Math\.PI/g, '3.14159')
        .replace(/\bnoise\((.*?)\)/g, 'inoise8($1 * 255)') // approximate with FastLED inoise8
        .replace(/dist\((.*?)\)/g, 'sqrt(pow($1))');

      animationLogic += `    {\n`;
      animationLogic += `      // User Script compiled into FastLED code\n`;
      animationLogic += `      // Note: float variables t (seconds), i (led index), x/y coordinates available\n`;
      animationLogic += `      float i = (float)i;\n`;
      if (config.type === 'matrix') {
        animationLogic += `      float x = i % MATRIX_WIDTH;\n`;
        animationLogic += `      float y = i / MATRIX_WIDTH;\n`;
        animationLogic += `      float w = MATRIX_WIDTH;\n`;
        animationLogic += `      float h = MATRIX_HEIGHT;\n`;
      } else {
        animationLogic += `      float x = i; float y = 0;\n`;
        animationLogic += `      float w = NUM_LEDS; float h = 1;\n`;
      }
      animationLogic += `      ${cppCode.trim()}\n`;
      animationLogic += `      r_acc = (r_acc * ${1 - layer.opacity}) + (r * ${layer.opacity});\n`;
      animationLogic += `      g_acc = (g_acc * ${1 - layer.opacity}) + (g * ${layer.opacity});\n`;
      animationLogic += `      b_acc = (b_acc * ${1 - layer.opacity}) + (b * ${layer.opacity});\n`;
      animationLogic += `    }\n\n`;
    } else {
      animationLogic += `      // Effect type: ${layer.effectType} requires custom FastLED recreation.\n`;
    }
  });

  animationLogic += `    leds[i] = CRGB(constrain(r_acc, 0, 255), constrain(g_acc, 0, 255), constrain(b_acc, 0, 255));\n  }\n}`;

  return `
/*
 * SVETI Exported FastLED Preset Code
 * Preset: ${title}
 * Layout: ${config.type.toUpperCase()} (${totalPixels} Pixels)
 */

#include <FastLED.h>

${ledSetup.trim()}

${animationLogic.trim()}

void setup() {
  delay(3000); // safety startup delay
  FastLED.addLeds<CHIPSET, LED_PIN, COLOR_ORDER>(leds, NUM_LEDS).setCorrection(TypicalLEDStrip);
  FastLED.setBrightness(128);
}

void loop() {
  drawFrame(millis());
  FastLED.show();
  FastLED.delay(1000 / 60); // 60 FPS
}
`;
}

// 2. WLED JSON Preset Exporter
export function exportToWLED(_presetTitle: string, config: DeviceConfig, layers: Layer[]): string {
  // WLED supports segments, primary/secondary colors, and standard effects.
  // We export an approximate state or segment map that WLED can load.
  const wledObj: any = {
    on: true,
    bri: 128,
    transition: 7,
    mainseg: 0,
    seg: []
  };

  // Build segments matching active layers or default
  layers.forEach((layer, idx) => {
    if (!layer.visible) return;

    let fx = 0; // WLED FX ID. 0 is Solid, 9 is Gradient, 16 is Noise, etc.
    let speed = 128;
    let intensity = 128;
    let col = [[255, 255, 255], [0, 0, 0], [0, 0, 0]];

    if (layer.effectType === 'solid' && layer.params.solid) {
      fx = 0;
      col[0] = hexToRgb(layer.params.solid.color);
    } else if (layer.effectType === 'gradient' && layer.params.gradient) {
      fx = 9; // Rainbow
      const p = layer.params.gradient;
      speed = Math.floor(Math.max(0, Math.min(255, Math.abs(p.speed) * 128)));
      intensity = Math.floor(Math.max(0, Math.min(255, p.frequency * 32)));
      if (p.stops.length > 0) col[0] = hexToRgb(p.stops[0].color);
      if (p.stops.length > 1) col[1] = hexToRgb(p.stops[1].color);
    } else if (layer.effectType === 'noise' && layer.params.noise) {
      fx = 16; // Noise
      const p = layer.params.noise;
      speed = Math.floor(Math.max(0, Math.min(255, p.speed * 128)));
      intensity = Math.floor(Math.max(0, Math.min(255, p.scale * 32)));
      col[0] = hexToRgb(p.colorStart);
      col[1] = hexToRgb(p.colorEnd);
    } else if (layer.effectType === 'chase' && layer.params.chase) {
      fx = 28; // Chase Rainbow or standard Chase
      const p = layer.params.chase;
      speed = Math.floor(Math.max(0, Math.min(255, p.speed * 128)));
      col[0] = hexToRgb(p.color);
      col[1] = hexToRgb(p.bgColor);
    }

    wledObj.seg.push({
      id: idx,
      start: 0,
      stop: config.type === 'matrix' ? config.width * config.height : (config.type === 'ring' ? config.ringCount : config.length),
      len: config.type === 'matrix' ? config.width * config.height : (config.type === 'ring' ? config.ringCount : config.length),
      grp: 1,
      spc: 0,
      of: 0,
      on: true,
      frz: false,
      bri: Math.floor(layer.opacity * 255),
      col: col,
      fx: fx,
      sx: speed,
      ix: intensity,
      pal: 0
    });
  });

  // If no layers, put a fallback
  if (wledObj.seg.length === 0) {
    wledObj.seg.push({
      id: 0,
      start: 0,
      stop: config.length || 30,
      col: [[255, 100, 0]],
      fx: 0
    });
  }

  return JSON.stringify(wledObj, null, 2);
}
