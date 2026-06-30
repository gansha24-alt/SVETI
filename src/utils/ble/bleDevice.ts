export interface GattDescriptor {
  uuid: string;
  value?: string;
}

export interface GattCharacteristic {
  uuid: string;
  properties: {
    read: boolean;
    write: boolean;
    writeWithoutResponse: boolean;
    notify: boolean;
  };
  descriptors: GattDescriptor[];
  value?: string; // HEX representation of last read/notify
}

export interface GattService {
  uuid: string;
  characteristics: GattCharacteristic[];
}

export interface BleDevice {
  id: string;
  name: string;
  connected: boolean;
  mac?: string;
  rssi?: number;
  manufacturerData?: string;
  serviceUuids?: string[];
  connectable?: boolean;
  gattServices: GattService[];
  
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  read(serviceUuid: string, charUuid: string): Promise<Uint8Array>;
  write(serviceUuid: string, charUuid: string, data: Uint8Array, withoutResponse?: boolean): Promise<void>;
  subscribe(serviceUuid: string, charUuid: string, callback: (data: Uint8Array) => void): Promise<void>;
  unsubscribe(serviceUuid: string, charUuid: string): Promise<void>;
}

// 1. WebBleDevice wrapping standard Browser Web Bluetooth API
export class WebBleDevice implements BleDevice {
  id: string;
  name: string;
  connected: boolean = false;
  mac?: string;
  rssi?: number;
  manufacturerData?: string;
  serviceUuids?: string[];
  connectable?: boolean = true;
  gattServices: GattService[] = [];

  private device: any = null; // BluetoothDevice
  private server: any = null; // BluetoothRemoteGATTServer
  private activeSubscribers: Map<string, (data: Uint8Array) => void> = new Map();
  private activeWritePromise: Promise<void> | null = null;
  private pendingWrite: { serviceUuid: string, charUuid: string, data: Uint8Array, withoutResponse: boolean } | null = null;

  constructor(nativeDevice: any) {
    this.device = nativeDevice;
    this.id = nativeDevice.id;
    this.name = nativeDevice.name || 'Unknown Device';
    this.serviceUuids = nativeDevice.uuids || [];
    this.rssi = -60 - Math.floor(Math.random() * 30); // RSSI is usually not directly accessible in standard Web BLE
  }

  private async ensureConnected(): Promise<void> {
    if (!this.device) throw new Error('No native device wrapper.');
    if (!this.device.gatt.connected) {
      console.log('GATT Server disconnected. Attempting auto-reconnection...');
      this.server = await this.device.gatt.connect();
      this.connected = true;
    }
  }

  async connect(): Promise<void> {
    if (!this.device) throw new Error('No native device wrapper.');
    
    this.server = await this.device.gatt.connect();
    this.connected = true;

    // Listen to physical disconnection event from browser
    this.device.addEventListener('gattserverdisconnected', () => {
      this.connected = false;
      this.server = null;
      window.dispatchEvent(new CustomEvent('sveti_ble_disconnected', { detail: { deviceId: this.id } }));
    });
    
    // Discover Services
    const services = await this.server.getPrimaryServices();
    const gattTree: GattService[] = [];

    for (const service of services) {
      const chars = await service.getCharacteristics();
      const charTree: GattCharacteristic[] = [];

      for (const char of chars) {
        charTree.push({
          uuid: char.uuid,
          properties: {
            read: char.properties.read,
            write: char.properties.write,
            writeWithoutResponse: char.properties.writeWithoutResponse,
            notify: char.properties.notify
          },
          descriptors: [] // Standard Web BLE doesn't query descriptors easily unless requested
        });
      }

      gattTree.push({
        uuid: service.uuid,
        characteristics: charTree
      });
    }

    this.gattServices = gattTree;
  }

  async disconnect(): Promise<void> {
    if (this.device && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
    this.connected = false;
    this.server = null;
  }

  async read(serviceUuid: string, charUuid: string): Promise<Uint8Array> {
    await this.ensureConnected();
    const service = await this.server.getPrimaryService(serviceUuid);
    const characteristic = await service.getCharacteristic(charUuid);
    const dataView = await characteristic.readValue();
    return new Uint8Array(dataView.buffer);
  }

  async write(serviceUuid: string, charUuid: string, data: Uint8Array, withoutResponse = false): Promise<void> {
    if (this.activeWritePromise) {
      this.pendingWrite = { serviceUuid, charUuid, data, withoutResponse };
      return;
    }

    this.activeWritePromise = this.performWrite(serviceUuid, charUuid, data, withoutResponse);
    await this.activeWritePromise;
  }

  private async performWrite(serviceUuid: string, charUuid: string, data: Uint8Array, withoutResponse: boolean): Promise<void> {
    try {
      await this.ensureConnected();
      const service = await this.server.getPrimaryService(serviceUuid);
      const characteristic = await service.getCharacteristic(charUuid);
      
      const props = characteristic.properties || {};
      if (withoutResponse && props.writeWithoutResponse) {
        await characteristic.writeValueWithoutResponse(data);
      } else if (props.write) {
        await characteristic.writeValueWithResponse(data);
      } else if (props.writeWithoutResponse) {
        await characteristic.writeValueWithoutResponse(data);
      } else {
        await characteristic.writeValueWithResponse(data);
      }
    } catch (err) {
      console.warn('GATT Write failed:', err);
    } finally {
      this.activeWritePromise = null;
      if (this.pendingWrite) {
        const next = this.pendingWrite;
        this.pendingWrite = null;
        this.write(next.serviceUuid, next.charUuid, next.data, next.withoutResponse);
      }
    }
  }

  async subscribe(serviceUuid: string, charUuid: string, callback: (data: Uint8Array) => void): Promise<void> {
    await this.ensureConnected();
    const service = await this.server.getPrimaryService(serviceUuid);
    const characteristic = await service.getCharacteristic(charUuid);
    await characteristic.startNotifications();

    const key = `${serviceUuid}:${charUuid}`;
    
    const listener = (event: any) => {
      const dataView = event.target.value;
      callback(new Uint8Array(dataView.buffer));
    };

    characteristic.addEventListener('characteristicvaluechanged', listener);
    this.activeSubscribers.set(key, listener);
  }

  async unsubscribe(serviceUuid: string, charUuid: string): Promise<void> {
    if (!this.server) return;
    const key = `${serviceUuid}:${charUuid}`;
    const listener = this.activeSubscribers.get(key);
    if (listener) {
      const service = await this.server.getPrimaryService(serviceUuid);
      const characteristic = await service.getCharacteristic(charUuid);
      characteristic.removeEventListener('characteristicvaluechanged', listener);
      await characteristic.stopNotifications();
      this.activeSubscribers.delete(key);
    }
  }
}

// 2. MockBleDevice mimicking actual BLE GATT operations
export class MockBleDevice implements BleDevice {
  id: string;
  name: string;
  connected: boolean = false;
  mac?: string;
  rssi?: number;
  manufacturerData?: string;
  serviceUuids?: string[];
  connectable?: boolean = true;
  gattServices: GattService[] = [];

  private activeIntervals: number[] = [];

  constructor(id: string, name: string, protocolUuids: string[], mac?: string, mfgData?: string) {
    this.id = id;
    this.name = name;
    this.mac = mac || this.generateRandomMac();
    this.rssi = -40 - Math.floor(Math.random() * 45);
    this.manufacturerData = mfgData || '0x4300A1B2C3';
    this.serviceUuids = protocolUuids;
    this.connectable = Math.random() > 0.1;
    
    // Seed GATT tree based on mock device profile
    this.gattServices = [
      {
        uuid: '00001800-0000-1000-8000-00805f9b34fb', // Generic Access
        characteristics: [
          {
            uuid: '00002a00-0000-1000-8000-00805f9b34fb', // Device Name
            properties: { read: true, write: false, writeWithoutResponse: false, notify: false },
            descriptors: [],
            value: this.stringToHex(this.name)
          }
        ]
      },
      {
        uuid: protocolUuids[0] || '0000ffe0-0000-1000-8000-00805f9b34fb', // Main custom service
        characteristics: [
          {
            uuid: protocolUuids[1] || '0000ffe1-0000-1000-8000-00805f9b34fb', // Main Write Char
            properties: { read: true, write: true, writeWithoutResponse: true, notify: true },
            descriptors: [{ uuid: '00002902-0000-1000-8000-00805f9b34fb', value: '0000' }], // Client Config Desc
            value: '00'
          }
        ]
      }
    ];
  }

  private generateRandomMac(): string {
    return Array(6)
      .fill(null)
      .map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase())
      .join(':');
  }

  private stringToHex(str: string): string {
    return Array.from(str)
      .map(c => c.charCodeAt(0).toString(16))
      .join('');
  }

  async connect(): Promise<void> {
    await new Promise(r => setTimeout(r, 600)); // simulate connection delay
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.activeIntervals.forEach(clearInterval);
    this.activeIntervals = [];
  }

  async read(serviceUuid: string, charUuid: string): Promise<Uint8Array> {
    const s = this.gattServices.find(srv => srv.uuid.toLowerCase() === serviceUuid.toLowerCase());
    const c = s?.characteristics.find(ch => ch.uuid.toLowerCase() === charUuid.toLowerCase());
    if (!c) throw new Error('Service or characteristic not found.');
    
    // Return dummy response
    const hex = c.value || '00';
    return new Uint8Array(hex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
  }

  async write(serviceUuid: string, charUuid: string, data: Uint8Array, _withoutResponse = false): Promise<void> {
    const s = this.gattServices.find(srv => srv.uuid.toLowerCase() === serviceUuid.toLowerCase());
    const c = s?.characteristics.find(ch => ch.uuid.toLowerCase() === charUuid.toLowerCase());
    if (!c) throw new Error('Service or characteristic not found.');

    const hex = Array.from(data).map(b => b.toString(16).padStart(2, '0')).join('');
    c.value = hex; // update mock state
  }

  async subscribe(serviceUuid: string, charUuid: string, callback: (data: Uint8Array) => void): Promise<void> {
    // Start periodic notification updates to simulate sensor/ack pulses
    const intervalId = window.setInterval(() => {
      if (!this.connected) return;
      
      const mockAck = new Uint8Array([0x5A, 0x01, Math.floor(Math.random() * 256)]);
      callback(mockAck);
      
      // Update value in tree
      const s = this.gattServices.find(srv => srv.uuid.toLowerCase() === serviceUuid.toLowerCase());
      const c = s?.characteristics.find(ch => ch.uuid.toLowerCase() === charUuid.toLowerCase());
      if (c) {
        c.value = Array.from(mockAck).map(b => b.toString(16).padStart(2, '0')).join('');
      }
    }, 4000);

    this.activeIntervals.push(intervalId);
  }

  async unsubscribe(_serviceUuid: string, _charUuid: string): Promise<void> {
    // In mock, we clear all intervals
    this.activeIntervals.forEach(clearInterval);
    this.activeIntervals = [];
  }
}

// 3. WifiDevice mimicking BLE interface but routing commands via HTTP API
export class WifiDevice implements BleDevice {
  id: string;
  name: string;
  connected: boolean = false;
  ip: string;
  gattServices: GattService[] = [];

  constructor(id: string, name: string, ip: string) {
    this.id = id;
    this.name = name;
    this.ip = ip;
  }

  async connect(): Promise<void> {
    await new Promise(r => setTimeout(r, 600)); // simulate network delay
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async read(_serviceUuid: string, _charUuid: string): Promise<Uint8Array> {
    return new Uint8Array([0]);
  }

  async write(_serviceUuid: string, _charUuid: string, _data: Uint8Array, _withoutResponse?: boolean): Promise<void> {
    // Handled in LedProtocol
  }

  async subscribe(_serviceUuid: string, _charUuid: string, _callback: (data: Uint8Array) => void): Promise<void> {
    // No GATT notifications over network
  }

  async unsubscribe(_serviceUuid: string, _charUuid: string): Promise<void> {
    // No GATT notifications over network
  }
}
