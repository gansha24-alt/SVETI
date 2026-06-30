export type DeviceType = 'strip' | 'matrix' | 'ring';

export interface DeviceConfig {
  type: DeviceType;
  // For strip
  length: number;
  // For matrix
  width: number;
  height: number;
  matrixLayout: 'serpentine' | 'grid';
  // For ring
  ringCount: number;
}

export interface Segment {
  id: string;
  name: string;
  start: number;
  end: number;
}

export type BlendMode = 'normal' | 'add' | 'multiply' | 'screen' | 'overlay' | 'difference';

export type EffectType = 'solid' | 'gradient' | 'noise' | 'chase' | 'script' | 'audio';

export interface SolidParams {
  color: string;
}

export interface GradientStop {
  offset: number; // 0 to 1
  color: string;
}

export interface GradientParams {
  stops: GradientStop[];
  speed: number;
  frequency: number; // repeats across the strip
  direction: number; // in degrees, relevant for matrix
}

export interface NoiseParams {
  scale: number;
  speed: number;
  colorStart: string;
  colorEnd: string;
  palette: 'rainbow' | 'fire' | 'ocean' | 'forest' | 'custom';
}

export interface ChaseParams {
  color: string;
  bgColor: string;
  speed: number;
  size: number;
  spacing: number;
}

export interface ScriptParams {
  code: string; // mathematical formula like "r = sin(i/10 + t) * 127 + 128"
}

export interface AudioParams {
  mode: 'bass' | 'mid' | 'treble' | 'spectrum';
  color: string;
  bgColor: string;
  sensitivity: number;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number; // 0 to 1
  blendMode: BlendMode;
  effectType: EffectType;
  segmentId: string; // 'all' or specific segment ID
  params: {
    solid?: SolidParams;
    gradient?: GradientParams;
    noise?: NoiseParams;
    chase?: ChaseParams;
    script?: ScriptParams;
    audio?: AudioParams;
  };
}

export interface Comment {
  id: string;
  author: string;
  avatar: string;
  content: string;
  createdAt: string;
}

export interface Preset {
  id: string;
  title: string;
  description: string;
  author: string;
  authorAvatar: string;
  likes: number;
  likedByUser?: boolean;
  forks: number;
  comments: Comment[];
  tags: string[];
  deviceConfig: DeviceConfig;
  segments: Segment[];
  layers: Layer[];
  createdAt: string;
  isCustom?: boolean; // locally edited or created by user
}
