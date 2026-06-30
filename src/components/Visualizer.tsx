import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, SkipForward, Volume2, VolumeX, Radio } from 'lucide-react';
import type { DeviceConfig, Segment, Layer } from '../types/led';
import { renderLEDs } from '../utils/ledRenderer';

interface VisualizerProps {
  deviceConfig: DeviceConfig;
  segments: Segment[];
  layers: Layer[];
  globalBrightness: number; // 0 to 100
  globalSpeed: number; // 0 to 2
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  onColorsUpdate?: (colors: [number, number, number][]) => void;
  t: (key: any) => string;
}

export type ViewMode = 'device' | 'desk' | 'tv' | 'cove';

export const Visualizer: React.FC<VisualizerProps> = ({
  deviceConfig,
  segments,
  layers,
  globalBrightness,
  globalSpeed,
  isPlaying,
  setIsPlaying,
  onColorsUpdate,
  t,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glowCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [viewMode, setViewMode] = useState<ViewMode>('desk');
  const [micActive, setMicActive] = useState(false);
  const [time, setTime] = useState(0);

  // Audio refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioDataArrayRef = useRef<Uint8Array | null>(null);
  
  // High-performance animation frame variables
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const accumulatedTimeRef = useRef<number>(0);

  // Toggle Microphone
  const toggleMicrophone = async () => {
    if (micActive) {
      if (sourceRef.current) sourceRef.current.disconnect();
      if (audioContextRef.current) audioContextRef.current.close();
      audioContextRef.current = null;
      analyserRef.current = null;
      sourceRef.current = null;
      setMicActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);
        
        audioContextRef.current = ctx;
        analyserRef.current = analyser;
        sourceRef.current = source;
        audioDataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
        setMicActive(true);
      } catch (err) {
        alert('Could not access microphone. Using simulated audio pulse instead.');
      }
    }
  };

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  // Frame simulation and canvas drawing
  useEffect(() => {
    const loop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = (timestamp - lastTimeRef.current) / 1000.0;
      lastTimeRef.current = timestamp;

      // Update simulated time if playing
      if (isPlaying) {
        accumulatedTimeRef.current += delta * globalSpeed;
        setTime(accumulatedTimeRef.current);
      }

      // 1. Gather audio spectrum values
      let bass = 0;
      let mid = 0;
      let treble = 0;
      let waveform: number[] = Array(32).fill(0);

      if (micActive && analyserRef.current && audioDataArrayRef.current) {
        const analyser = analyserRef.current;
        const dataArray = audioDataArrayRef.current;
        analyser.getByteFrequencyData(dataArray as any);

        // Calculate frequency bands
        let bassSum = 0;
        for (let i = 0; i < 4; i++) bassSum += dataArray[i];
        bass = bassSum / 4 / 255;

        let midSum = 0;
        for (let i = 4; i < 13; i++) midSum += dataArray[i];
        mid = midSum / 9 / 255;

        let trebleSum = 0;
        for (let i = 13; i < 30; i++) trebleSum += dataArray[i];
        treble = trebleSum / 17 / 255;

        const timeData = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(timeData as any);
        waveform = Array.from(timeData).slice(0, 32).map(v => (v - 128) / 128);
      } else {
        // Mock spectrum: procedural waves that react to time
        const t = accumulatedTimeRef.current;
        bass = Math.max(0.05, 0.4 + 0.3 * Math.sin(t * 8) + 0.2 * Math.sin(t * 15 + 1));
        mid = Math.max(0.05, 0.3 + 0.2 * Math.sin(t * 12 + 2) + 0.1 * Math.cos(t * 22));
        treble = Math.max(0.05, 0.2 + 0.15 * Math.sin(t * 26 + 3) + 0.15 * Math.cos(t * 40));
        
        for (let i = 0; i < 32; i++) {
          waveform[i] = Math.sin(i * 0.5 + t * 15) * bass * 0.8 + Math.cos(i * 1.2 - t * 25) * treble * 0.2;
        }
      }

      // 2. Render pixel colors
      const colors = renderLEDs(
        deviceConfig,
        segments,
        layers,
        accumulatedTimeRef.current,
        { bass, mid, treble, waveform }
      );

      // Trigger color update callback for parent dashboard glow
      if (onColorsUpdate) {
        onColorsUpdate(colors);
      }

      // 3. Render Canvas Drawing
      drawCanvas(colors);

      requestRef.current = requestAnimationFrame(loop);
    };

    const drawCanvas = (colors: [number, number, number][]) => {
      const canvas = canvasRef.current;
      const glowCanvas = glowCanvasRef.current;
      if (!canvas || !glowCanvas) return;

      const ctx = canvas.getContext('2d');
      const glowCtx = glowCanvas.getContext('2d');
      if (!ctx || !glowCtx) return;

      const width = canvas.width;
      const height = canvas.height;

      // Clear Canvas
      ctx.clearRect(0, 0, width, height);
      glowCtx.clearRect(0, 0, width, height);

      // Draw custom background based on ViewMode
      if (viewMode === 'desk') {
        glowCtx.fillStyle = '#060608';
        glowCtx.fillRect(0, 0, width, height);
        
        glowCtx.strokeStyle = 'rgba(255,255,255,0.05)';
        glowCtx.lineWidth = 4;
        glowCtx.beginPath();
        glowCtx.moveTo(0, height * 0.85);
        glowCtx.lineTo(width, height * 0.85);
        glowCtx.stroke();
        
        glowCtx.fillStyle = 'rgba(0,0,0,0.85)';
        glowCtx.fillRect(0, height * 0.85, width, height * 0.15);
      } else if (viewMode === 'tv') {
        glowCtx.fillStyle = '#040405';
        glowCtx.fillRect(0, 0, width, height);
        
        glowCtx.fillStyle = 'rgba(20, 20, 25, 0.95)';
        glowCtx.strokeStyle = 'rgba(255,255,255,0.05)';
        glowCtx.lineWidth = 3;
        glowCtx.beginPath();
        glowCtx.roundRect(width * 0.2, height * 0.2, width * 0.6, height * 0.5, 8);
        glowCtx.fill();
        glowCtx.stroke();

        glowCtx.fillStyle = 'rgba(10, 10, 12, 0.98)';
        glowCtx.fillRect(width * 0.47, height * 0.7, width * 0.06, height * 0.08);
        glowCtx.fillRect(width * 0.42, height * 0.77, width * 0.16, height * 0.02);

        glowCtx.fillStyle = 'rgba(255,255,255,0.01)';
        glowCtx.fillRect(width * 0.22, height * 0.22, width * 0.56, height * 0.46);
      } else if (viewMode === 'cove') {
        glowCtx.fillStyle = '#050508';
        glowCtx.fillRect(0, 0, width, height);
        
        glowCtx.fillStyle = 'rgba(15,15,20,0.98)';
        glowCtx.fillRect(0, 0, width, height * 0.2);
        glowCtx.fillStyle = 'rgba(0,0,0,0.6)';
        glowCtx.fillRect(0, height * 0.2, width, height * 0.05);
      } else {
        glowCtx.fillStyle = '#030305';
        glowCtx.fillRect(0, 0, width, height);
      }

      const sizeFactor = globalBrightness / 100.5;

      if (deviceConfig.type === 'strip') {
        const total = colors.length;
        const startX = width * 0.1;
        const endX = width * 0.9;
        const segmentLen = (endX - startX) / (total - 1 || 1);
        let yPos = height * 0.5;

        if (viewMode === 'desk') yPos = height * 0.83;
        else if (viewMode === 'tv') yPos = height * 0.16;
        else if (viewMode === 'cove') yPos = height * 0.18;

        colors.forEach((color, idx) => {
          const cx = total === 1 ? (width / 2) : (startX + idx * segmentLen);
          const cy = yPos;
          const [r, g, b] = color;
          const rgbString = `rgb(${r},${g},${b})`;

          if (viewMode !== 'device') {
            const radGlow = glowCtx.createRadialGradient(cx, cy, 2, cx, cy, 75 * sizeFactor);
            radGlow.addColorStop(0, `rgba(${r},${g},${b},0.4)`);
            radGlow.addColorStop(0.3, `rgba(${r},${g},${b},0.15)`);
            radGlow.addColorStop(1, 'transparent');
            glowCtx.fillStyle = radGlow;
            glowCtx.fillRect(cx - 80, cy - 80, 160, 160);
          } else {
            const radGlow = glowCtx.createRadialGradient(cx, cy, 2, cx, cy, 25 * sizeFactor);
            radGlow.addColorStop(0, `rgba(${r},${g},${b},0.5)`);
            radGlow.addColorStop(1, 'transparent');
            glowCtx.fillStyle = radGlow;
            glowCtx.fillRect(cx - 30, cy - 30, 60, 60);
          }

          ctx.beginPath();
          ctx.arc(cx, cy, 4, 0, 2 * Math.PI);
          ctx.fillStyle = '#ffffff';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
          ctx.strokeStyle = rgbString;
          ctx.lineWidth = 2.5;
          ctx.stroke();
        });
      } else if (deviceConfig.type === 'matrix') {
        const w = deviceConfig.width;
        const h = deviceConfig.height;
        const isSerpentine = deviceConfig.matrixLayout === 'serpentine';
        const startX = width * 0.22;
        const endX = width * 0.78;
        const startY = height * 0.22;
        const endY = height * 0.78;

        const cellW = (endX - startX) / (w - 1 || 1);
        const cellH = (endY - startY) / (h - 1 || 1);

        colors.forEach((color, idx) => {
          let col = idx % w;
          const row = Math.floor(idx / w);
          if (isSerpentine && row % 2 === 1) {
            col = w - 1 - col;
          }

          const cx = startX + col * cellW;
          const cy = startY + row * cellH;
          const [r, g, b] = color;
          const rgbString = `rgb(${r},${g},${b})`;

          if (viewMode !== 'device') {
            const radGlow = glowCtx.createRadialGradient(cx, cy, 1, cx, cy, 40 * sizeFactor);
            radGlow.addColorStop(0, `rgba(${r},${g},${b},0.3)`);
            radGlow.addColorStop(1, 'transparent');
            glowCtx.fillStyle = radGlow;
            glowCtx.fillRect(cx - 40, cy - 40, 80, 80);
          } else {
            const radGlow = glowCtx.createRadialGradient(cx, cy, 1, cx, cy, 14 * sizeFactor);
            radGlow.addColorStop(0, `rgba(${r},${g},${b},0.45)`);
            radGlow.addColorStop(1, 'transparent');
            glowCtx.fillStyle = radGlow;
            glowCtx.fillRect(cx - 15, cy - 15, 30, 30);
          }

          ctx.beginPath();
          ctx.arc(cx, cy, 3.5, 0, 2 * Math.PI);
          ctx.fillStyle = rgbString;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(cx, cy, 1.5, 0, 2 * Math.PI);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        });
      } else if (deviceConfig.type === 'ring') {
        const count = deviceConfig.ringCount;
        const cx = width / 2;
        const cy = height / 2;
        const rSize = Math.min(width, height) * 0.32;

        colors.forEach((color, idx) => {
          const angle = (idx / count) * 2 * Math.PI - Math.PI / 2;
          const ledX = cx + rSize * Math.cos(angle);
          const ledY = cy + rSize * Math.sin(angle);
          const [r, g, b] = color;
          const rgbString = `rgb(${r},${g},${b})`;

          if (viewMode !== 'device') {
            const radGlow = glowCtx.createRadialGradient(ledX, ledY, 2, ledX, ledY, 60 * sizeFactor);
            radGlow.addColorStop(0, `rgba(${r},${g},${b},0.4)`);
            radGlow.addColorStop(1, 'transparent');
            glowCtx.fillStyle = radGlow;
            glowCtx.fillRect(ledX - 60, ledY - 60, 120, 120);
          } else {
            const radGlow = glowCtx.createRadialGradient(ledX, ledY, 2, ledX, ledY, 20 * sizeFactor);
            radGlow.addColorStop(0, `rgba(${r},${g},${b},0.5)`);
            radGlow.addColorStop(1, 'transparent');
            glowCtx.fillStyle = radGlow;
            glowCtx.fillRect(ledX - 20, ledY - 20, 40, 40);
          }

          ctx.beginPath();
          ctx.arc(ledX, ledY, 5, 0, 2 * Math.PI);
          ctx.fillStyle = rgbString;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(ledX, ledY, 2, 0, 2 * Math.PI);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        });
      }
    };

    requestRef.current = requestAnimationFrame(loop);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [deviceConfig, segments, layers, globalBrightness, globalSpeed, isPlaying, viewMode, micActive]);

  const stepFrame = () => {
    setIsPlaying(false);
    accumulatedTimeRef.current += 0.05;
    setTime(accumulatedTimeRef.current);
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Simulation Header */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-white/5 bg-zinc-950/30">
        <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
          <Radio size={12} className={isPlaying ? 'text-primary animate-pulse' : 'text-zinc-600'} />
          {t('simulatedAmbient').slice(0, 15)}...
        </h4>
        
        {/* View Mode controls */}
        <div className="flex gap-2 shrink-0">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as ViewMode)}
            className="bg-zinc-950/60 border border-white/5 rounded-xl px-2 py-1 text-[10px] text-zinc-300 font-bold focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value="desk">{t('cozyDesk').slice(0, 12)}</option>
            <option value="tv">{t('tvBacklight').slice(0, 12)}</option>
            <option value="cove">{t('ceilingCove').slice(0, 12)}</option>
            <option value="device">{t('deviceOnly').slice(0, 12)}</option>
          </select>

          <button
            onClick={toggleMicrophone}
            className={`px-2 py-1 rounded-xl border text-[10px] font-bold flex items-center gap-1 transition-all ${
              micActive 
              ? 'bg-pink-500/15 border-pink-500/35 text-pink-400 shadow-sm' 
              : 'bg-black/35 border-white/5 text-zinc-400'
            }`}
          >
            {micActive ? <Volume2 size={11} /> : <VolumeX size={11} />}
            {micActive ? 'Mic' : 'Beats'}
          </button>
        </div>
      </div>

      {/* Simulator canvas body */}
      <div className="relative w-full aspect-video bg-[#030304] overflow-hidden">
        {/* Layer 1: Ambient Wall (blurred) */}
        <canvas
          ref={glowCanvasRef}
          width={650}
          height={380}
          className="absolute inset-0 w-full h-full opacity-90"
          style={{
            filter: 'blur(28px)',
            zIndex: 1,
          }}
        />

        {/* Layer 2: LED Bulbs (sharp) */}
        <canvas
          ref={canvasRef}
          width={650}
          height={380}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            zIndex: 2,
          }}
        />
      </div>

      {/* Playback Controls */}
      <div className="flex justify-between items-center px-4 py-2.5 bg-black/40 border-t border-white/5">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
              isPlaying ? 'bg-zinc-800 text-white' : 'bg-primary text-white shadow-[0_0_10px_var(--primary-glow)]'
            }`}
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
          </button>
          <button
            onClick={stepFrame}
            title="Step 1 Frame (50ms)"
            className="w-7 h-7 rounded-full flex items-center justify-center bg-zinc-900/60 border border-white/5 text-zinc-500 hover:text-white transition-all"
          >
            <SkipForward size={12} />
          </button>
          <span className="text-[10px] font-semibold font-mono text-zinc-500">
            {time.toFixed(2)}s
          </span>
        </div>

        <div className="text-[9px] font-bold text-zinc-500 bg-black/25 border border-white/5 rounded px-2 py-0.5 uppercase tracking-wide">
          {deviceConfig.type === 'matrix'
            ? `${deviceConfig.width}x${deviceConfig.height} Matrix`
            : deviceConfig.type === 'ring'
            ? `${deviceConfig.ringCount} Ring`
            : `${deviceConfig.length} Strip`}
        </div>
      </div>
    </div>
  );
};
