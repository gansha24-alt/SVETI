import type { BleDevice } from './bleDevice';

export interface LedProtocol {
  device: BleDevice;
  onTraffic?: TrafficCallback;
  turnOn(): Promise<void>;
  turnOff(): Promise<void>;
  setBrightness(percent: number): Promise<void>;
  setRGB(r: number, g: number, b: number): Promise<void>;
  setRGBW(r: number, g: number, b: number, w: number): Promise<void>;
  setColorTemperature(kelvin: number): Promise<void>;
  setEffect(effectId: string): Promise<void>;
  setSpeed(speed: number): Promise<void>;
  setMusicMode(enabled: boolean): Promise<void>;
}

export type TrafficCallback = (
  direction: 'TX' | 'RX',
  serviceUuid: string,
  charUuid: string,
  data: Uint8Array
) => void;

// Helper to calculate Govee XOR checksum
function calculateGoveeChecksum(bytes: number[]): number {
  let checksum = 0;
  for (let i = 0; i < bytes.length; i++) {
    checksum ^= bytes[i];
  }
  return checksum;
}

// 1. DuoCo / ELK-BLEDOM Protocol Implementation
export class DuoCoProtocol implements LedProtocol {
  device: BleDevice;
  private srv = '0000fff0-0000-1000-8000-00805f9b34fb';
  private chr = '0000ffd9-0000-1000-8000-00805f9b34fb'; // or fff3
  onTraffic: TrafficCallback;

  constructor(device: BleDevice, onTraffic: TrafficCallback) {
    this.device = device;
    this.onTraffic = onTraffic;
    this.detectServiceAndChar();
  }

  private detectServiceAndChar() {
    // Attempt to locate fff0 or ffd0 service in the device's GATT tree
    const s = this.device.gattServices.find(
      g => g.uuid.includes('fff0') || g.uuid.includes('ffd0')
    );
    if (s) {
      this.srv = s.uuid;
      const c = s.characteristics.find(
        ch => ch.uuid.includes('ffd9') || ch.uuid.includes('fff3') || ch.properties.write
      );
      if (c) this.chr = c.uuid;
    }
  }

  private async writeCommand(cmd: number[]): Promise<void> {
    const bytes = new Uint8Array(cmd);
    await this.device.write(this.srv, this.chr, bytes, true);
    this.onTraffic('TX', this.srv, this.chr, bytes);
  }

  async turnOn(): Promise<void> {
    // 7e 00 04 f0 00 01 ff 00 ef
    await this.writeCommand([0x7e, 0x00, 0x04, 0xf0, 0x00, 0x01, 0xff, 0x00, 0xef]);
  }

  async turnOff(): Promise<void> {
    // 7e 00 04 00 00 00 ff 00 ef
    await this.writeCommand([0x7e, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0x00, 0xef]);
  }

  async setBrightness(percent: number): Promise<void> {
    // 7e 00 01 [pct] 00 00 00 00 ef
    const val = Math.max(0, Math.min(100, percent));
    await this.writeCommand([0x7e, 0x00, 0x01, val, 0x00, 0x00, 0x00, 0x00, 0xef]);
  }

  async setRGB(r: number, g: number, b: number): Promise<void> {
    // 7e 00 05 03 r g b 00 ef
    await this.writeCommand([0x7e, 0x00, 0x05, 0x03, r, g, b, 0x00, 0xef]);
  }

  async setRGBW(r: number, g: number, b: number, _w: number): Promise<void> {
    await this.setRGB(r, g, b);
  }

  async setColorTemperature(kelvin: number): Promise<void> {
    // 7e 00 02 [val] 00 00 00 00 ef
    const ratio = Math.max(0, Math.min(255, Math.floor(((kelvin - 2700) / 3800) * 255)));
    await this.writeCommand([0x7e, 0x00, 0x02, ratio, 0x00, 0x00, 0x00, 0x00, 0xef]);
  }

  async setEffect(effectId: string): Promise<void> {
    // 7e 00 03 [effect] [speed] 00 00 00 ef
    const effNum = parseInt(effectId) || 0x80;
    await this.writeCommand([0x7e, 0x00, 0x03, effNum, 0x06, 0x00, 0x00, 0x00, 0xef]);
  }

  async setSpeed(speed: number): Promise<void> {
    // 7e 00 03 25 [speed] 00 00 00 ef
    const val = Math.max(1, Math.min(10, Math.floor(speed * 5)));
    await this.writeCommand([0x7e, 0x00, 0x03, 0x25, val, 0x00, 0x00, 0x00, 0xef]);
  }

  async setMusicMode(enabled: boolean): Promise<void> {
    const val = enabled ? 0x0c : 0xf0;
    await this.writeCommand([0x7e, 0x00, 0x04, val, 0x00, 0x01, 0xff, 0x00, 0xef]);
  }
}

// 2. HappyLighting Protocol Implementation
export class HappyLightingProtocol implements LedProtocol {
  device: BleDevice;
  private srv = '0000ffd0-0000-1000-8000-00805f9b34fb';
  private chr = '0000ffd9-0000-1000-8000-00805f9b34fb';
  onTraffic: TrafficCallback;
  
  private lastR = 255;
  private lastG = 255;
  private lastB = 255;

  constructor(device: BleDevice, onTraffic: TrafficCallback) {
    this.device = device;
    this.onTraffic = onTraffic;
    this.detectServiceAndChar();
  }

  private detectServiceAndChar() {
    const s = this.device.gattServices.find(g => g.uuid.includes('ffd0'));
    if (s) {
      this.srv = s.uuid;
      const c = s.characteristics.find(ch => ch.uuid.includes('ffd9') || ch.properties.write);
      if (c) this.chr = c.uuid;
    }
  }

  private async writeCommand(cmd: number[]): Promise<void> {
    const bytes = new Uint8Array(cmd);
    await this.device.write(this.srv, this.chr, bytes, true);
    this.onTraffic('TX', this.srv, this.chr, bytes);
  }

  async turnOn(): Promise<void> {
    // cc 23 33
    await this.writeCommand([0xcc, 0x23, 0x33]);
  }

  async turnOff(): Promise<void> {
    // cc 24 33
    await this.writeCommand([0xcc, 0x24, 0x33]);
  }

  async setBrightness(percent: number): Promise<void> {
    // HappyLighting controls brightness by scaling the active RGB colors
    const scale = percent / 100;
    const r = Math.round(this.lastR * scale);
    const g = Math.round(this.lastG * scale);
    const b = Math.round(this.lastB * scale);
    await this.writeCommand([0x56, r, g, b, 0x00, 0xf0, 0xaa]);
  }

  async setRGB(r: number, g: number, b: number): Promise<void> {
    this.lastR = r;
    this.lastG = g;
    this.lastB = b;
    // 56 r g b 00 f0 aa
    await this.writeCommand([0x56, r, g, b, 0x00, 0xf0, 0xaa]);
  }

  async setRGBW(r: number, g: number, b: number, w: number): Promise<void> {
    // Write W to separate white pin if supported: 56 00 00 00 w 0f aa
    await this.setRGB(r, g, b);
    if (w > 0) {
      await this.writeCommand([0x56, 0x00, 0x00, 0x00, w, 0x0f, 0xaa]);
    }
  }

  async setColorTemperature(kelvin: number): Promise<void> {
    // Map Kelvin scale cold-white (e.g. 56 00 00 00 warm Cold aa)
    const val = Math.max(0, Math.min(255, Math.floor(((kelvin - 2700) / 3800) * 255)));
    await this.writeCommand([0x56, 0x00, 0x00, 0x00, val, 0x0f, 0xaa]);
  }

  async setEffect(effectId: string): Promise<void> {
    // bb [effectId] [speed] 44
    const effNum = parseInt(effectId) || 0x25;
    await this.writeCommand([0xbb, effNum, 0x05, 0x44]);
  }

  async setSpeed(speed: number): Promise<void> {
    // Speed range 1-10
    const val = Math.max(1, Math.min(10, Math.floor(speed * 5)));
    await this.writeCommand([0xbb, 0x25, val, 0x44]);
  }

  async setMusicMode(enabled: boolean): Promise<void> {
    // cc 25 33 is typical mic-react
    if (enabled) {
      await this.writeCommand([0xcc, 0x25, 0x33]);
    } else {
      await this.turnOn();
    }
  }
}

// 3. BanlanX / SPxxx (SP110E, SP107E, etc.) Implementation
export class BanlanXProtocol implements LedProtocol {
  device: BleDevice;
  private srv = '0000ffe0-0000-1000-8000-00805f9b34fb';
  private chr = '0000ffe1-0000-1000-8000-00805f9b34fb';
  onTraffic: TrafficCallback;

  constructor(device: BleDevice, onTraffic: TrafficCallback) {
    this.device = device;
    this.onTraffic = onTraffic;
    this.detectServiceAndChar();
  }

  private detectServiceAndChar() {
    const s = this.device.gattServices.find(g => g.uuid.includes('ffe0'));
    if (s) {
      this.srv = s.uuid;
      const c = s.characteristics.find(ch => ch.uuid.includes('ffe1') || ch.properties.write);
      if (c) this.chr = c.uuid;
    }
  }

  private async writeCommand(cmd: number[]): Promise<void> {
    const bytes = new Uint8Array(cmd);
    await this.device.write(this.srv, this.chr, bytes, true);
    this.onTraffic('TX', this.srv, this.chr, bytes);
  }

  async turnOn(): Promise<void> {
    // aa 55 02 01 01 ff aa
    await this.writeCommand([0xaa, 0x55, 0x02, 0x01, 0x01, 0xff, 0xaa]);
  }

  async turnOff(): Promise<void> {
    // aa 55 02 01 00 ff aa
    await this.writeCommand([0xaa, 0x55, 0x02, 0x01, 0x00, 0xff, 0xaa]);
  }

  async setBrightness(percent: number): Promise<void> {
    // aa 55 03 02 [val] ff aa
    const val = Math.max(0, Math.min(255, Math.floor(percent * 2.55)));
    await this.writeCommand([0xaa, 0x55, 0x03, 0x02, val, 0xff, 0xaa]);
  }

  async setRGB(r: number, g: number, b: number): Promise<void> {
    // aa 55 05 03 r g b ff aa
    await this.writeCommand([0xaa, 0x55, 0x05, 0x03, r, g, b, 0xff, 0xaa]);
  }

  async setRGBW(r: number, g: number, b: number, _w: number): Promise<void> {
    await this.setRGB(r, g, b);
  }

  async setColorTemperature(kelvin: number): Promise<void> {
    // Cold white ratio mapping
    const ratio = Math.max(0, Math.min(255, Math.floor(((kelvin - 2700) / 3800) * 255)));
    await this.writeCommand([0xaa, 0x55, 0x04, 0x0b, ratio, 0xff, 0xaa]);
  }

  async setEffect(effectId: string): Promise<void> {
    // aa 55 03 04 [effect] ff aa
    const effNum = parseInt(effectId) || 1;
    await this.writeCommand([0xaa, 0x55, 0x03, 0x04, effNum, 0xff, 0xaa]);
  }

  async setSpeed(speed: number): Promise<void> {
    // aa 55 03 05 [speed] ff aa
    const val = Math.max(1, Math.min(255, Math.floor(speed * 127)));
    await this.writeCommand([0xaa, 0x55, 0x03, 0x05, val, 0xff, 0xaa]);
  }

  async setMusicMode(enabled: boolean): Promise<void> {
    // aa 55 03 06 [1=on/0=off] ff aa
    await this.writeCommand([0xaa, 0x55, 0x03, 0x06, enabled ? 1 : 0, 0xff, 0xaa]);
  }
}

// 4. Govee Protocol Implementation
export class GoveeProtocol implements LedProtocol {
  device: BleDevice;
  private srv = '00010203-0405-0607-0809-0a0b0c0d1910';
  private chr = '00010203-0405-0607-0809-0a0b0c0d2b11';
  onTraffic: TrafficCallback;

  constructor(device: BleDevice, onTraffic: TrafficCallback) {
    this.device = device;
    this.onTraffic = onTraffic;
    this.detectServiceAndChar();
  }

  private detectServiceAndChar() {
    const s = this.device.gattServices.find(g => g.uuid.includes('1910') || g.uuid.includes('1901'));
    if (s) {
      this.srv = s.uuid;
      const c = s.characteristics.find(ch => ch.uuid.includes('2b11') || ch.properties.write);
      if (c) this.chr = c.uuid;
    }
  }

  private async writeCommand(cmd: number[]): Promise<void> {
    // Govee packets are strictly 20 bytes. Zero pad + add XOR checksum as last byte
    const payload = Array(20).fill(0);
    for (let i = 0; i < Math.min(19, cmd.length); i++) {
      payload[i] = cmd[i];
    }
    payload[19] = calculateGoveeChecksum(payload.slice(0, 19));
    
    const bytes = new Uint8Array(payload);
    await this.device.write(this.srv, this.chr, bytes, true);
    this.onTraffic('TX', this.srv, this.chr, bytes);
  }

  async turnOn(): Promise<void> {
    // 33 01 01
    await this.writeCommand([0x33, 0x01, 0x01]);
  }

  async turnOff(): Promise<void> {
    // 33 01 00
    await this.writeCommand([0x33, 0x01, 0x00]);
  }

  async setBrightness(percent: number): Promise<void> {
    // 33 04 [val]
    const val = Math.max(0, Math.min(255, Math.floor(percent * 2.55)));
    await this.writeCommand([0x33, 0x04, val]);
  }

  async setRGB(r: number, g: number, b: number): Promise<void> {
    // 33 05 02 r g b
    await this.writeCommand([0x33, 0x05, 0x02, r, g, b]);
  }

  async setRGBW(r: number, g: number, b: number, _w: number): Promise<void> {
    await this.setRGB(r, g, b);
  }

  async setColorTemperature(kelvin: number): Promise<void> {
    // 33 05 05 [temp MSB] [temp LSB]
    const tempHex = Math.max(2000, Math.min(9000, kelvin));
    const msb = (tempHex >> 8) & 0xff;
    const lsb = tempHex & 0xff;
    await this.writeCommand([0x33, 0x05, 0x05, msb, lsb]);
  }

  async setEffect(effectId: string): Promise<void> {
    // 33 05 04 [effectId]
    const val = parseInt(effectId) || 1;
    await this.writeCommand([0x33, 0x05, 0x04, val]);
  }

  async setSpeed(_speed: number): Promise<void> {
    // speed is not directly supported on Govee standard, usually mapped in effects
  }

  async setMusicMode(enabled: boolean): Promise<void> {
    // 33 05 01 [enabled]
    await this.writeCommand([0x33, 0x05, 0x01, enabled ? 1 : 0]);
  }
}

// 5. Generic BLE LED Protocol Implementation
export class GenericBleProtocol implements LedProtocol {
  device: BleDevice;
  private srv = '';
  private chr = '';
  onTraffic: TrafficCallback;

  constructor(device: BleDevice, onTraffic: TrafficCallback) {
    this.device = device;
    this.onTraffic = onTraffic;
    this.detectServiceAndChar();
  }

  private detectServiceAndChar() {
    // Fall back to first writeable characteristic in the GATT tree
    for (const service of this.device.gattServices) {
      // Ignore Generic Access
      if (service.uuid.includes('1800') || service.uuid.includes('1801')) continue;
      
      const char = service.characteristics.find(
        c => c.properties.write || c.properties.writeWithoutResponse
      );
      if (char) {
        this.srv = service.uuid;
        this.chr = char.uuid;
        break;
      }
    }
  }

  private async writeCommand(cmd: number[]): Promise<void> {
    if (!this.srv || !this.chr) throw new Error('No writeable characteristic discovered.');
    const bytes = new Uint8Array(cmd);
    await this.device.write(this.srv, this.chr, bytes, true);
    this.onTraffic('TX', this.srv, this.chr, bytes);
  }

  async turnOn(): Promise<void> {
    await this.writeCommand([0x01]);
  }

  async turnOff(): Promise<void> {
    await this.writeCommand([0x00]);
  }

  async setBrightness(percent: number): Promise<void> {
    await this.writeCommand([percent]);
  }

  async setRGB(r: number, g: number, b: number): Promise<void> {
    await this.writeCommand([r, g, b]);
  }

  async setRGBW(r: number, g: number, b: number, w: number): Promise<void> {
    await this.writeCommand([r, g, b, w]);
  }

  async setColorTemperature(kelvin: number): Promise<void> {
    const val = Math.max(0, Math.min(255, Math.floor(((kelvin - 2700) / 3800) * 255)));
    await this.writeCommand([val]);
  }

  async setEffect(effectId: string): Promise<void> {
    const val = parseInt(effectId) || 0;
    await this.writeCommand([val]);
  }

  async setSpeed(speed: number): Promise<void> {
    const val = Math.max(0, Math.min(255, Math.floor(speed * 127)));
    await this.writeCommand([val]);
  }

  async setMusicMode(enabled: boolean): Promise<void> {
    await this.writeCommand([enabled ? 1 : 0]);
  }
}

// 5. Wifi WLED Protocol Implementation
export class WifiWledProtocol implements LedProtocol {
  device: BleDevice;
  onTraffic?: TrafficCallback;

  constructor(device: BleDevice, onTraffic?: TrafficCallback) {
    this.device = device;
    this.onTraffic = onTraffic;
  }

  private async postJson(state: any): Promise<void> {
    const ip = (this.device as any).ip || '192.168.1.100';
    console.log(`[WledProtocol] Post WLED JSON to http://${ip}/json/state`, state);
    
    try {
      await fetch(`http://${ip}/json/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
        mode: 'cors'
      });
    } catch (err) {
      console.warn(`[WledProtocol] HTTP request failed (offline simulation):`, err);
    }
  }

  async turnOn(): Promise<void> {
    await this.postJson({ on: true });
  }

  async turnOff(): Promise<void> {
    await this.postJson({ on: false });
  }

  async setBrightness(percent: number): Promise<void> {
    const bri = Math.round((percent / 100) * 255);
    await this.postJson({ bri });
  }

  async setRGB(r: number, g: number, b: number): Promise<void> {
    await this.postJson({
      seg: [{ id: 0, col: [[r, g, b]] }]
    });
  }

  async setRGBW(r: number, g: number, b: number, w: number): Promise<void> {
    await this.postJson({
      seg: [{ id: 0, col: [[r, g, b, w]] }]
    });
  }

  async setColorTemperature(kelvin: number): Promise<void> {
    const ct = Math.round(1000000 / kelvin);
    await this.postJson({
      seg: [{ id: 0, cct: ct }]
    });
  }

  async setEffect(effectId: string): Promise<void> {
    const effectIndex = parseInt(effectId) || 0;
    await this.postJson({
      seg: [{ id: 0, fx: effectIndex }]
    });
  }

  async setSpeed(speed: number): Promise<void> {
    const sx = Math.round(speed * 255);
    await this.postJson({
      seg: [{ id: 0, sx }]
    });
  }

  async setMusicMode(enabled: boolean): Promise<void> {
    await this.postJson({
      seg: [{ id: 0, fx: enabled ? 110 : 0 }]
    });
  }
}

// 6. Protocol Profiler Engine
export function identifyProtocol(device: BleDevice, onTraffic: TrafficCallback): LedProtocol {
  const name = device.name.toLowerCase();
  
  if (device.id.startsWith('wifi-') || name.includes('wifi') || name.includes('wled')) {
    return new WifiWledProtocol(device, onTraffic);
  }
  
  if (name.includes('elk') || name.includes('duoco') || name.includes('strip')) {
    return new DuoCoProtocol(device, onTraffic);
  }
  if (name.includes('happy') || name.includes('triones')) {
    return new HappyLightingProtocol(device, onTraffic);
  }
  if (name.includes('banlan') || name.includes('sp110') || name.includes('sp107')) {
    return new BanlanXProtocol(device, onTraffic);
  }
  if (name.includes('govee') || name.includes('h61')) {
    return new GoveeProtocol(device, onTraffic);
  }
  
  // Also check Service UUIDs
  if (device.serviceUuids) {
    const uuids = device.serviceUuids.map(u => u.toLowerCase());
    if (uuids.some(u => u.includes('fff0'))) {
      return new DuoCoProtocol(device, onTraffic);
    }
    if (uuids.some(u => u.includes('ffd0'))) {
      return new HappyLightingProtocol(device, onTraffic);
    }
    if (uuids.some(u => u.includes('ffe0'))) {
      return new BanlanXProtocol(device, onTraffic);
    }
  }

  // Fallback
  return new GenericBleProtocol(device, onTraffic);
}
