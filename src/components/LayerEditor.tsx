import React, { useState, useEffect } from 'react';
import { Sliders, Plus, Trash2, Layers, Sparkles, Activity, Code, Volume2, Info, Check } from 'lucide-react';
import type { Layer, EffectType, BlendMode, Segment, GradientStop } from '../types/led';
import { compileScript } from '../utils/mathParser';

interface LayerEditorProps {
  layer: Layer | null;
  segments: Segment[];
  onUpdateLayer: (layer: Layer) => void;
  t: (key: any) => string;
}

export const LayerEditor: React.FC<LayerEditorProps> = ({
  layer,
  segments,
  onUpdateLayer,
  t,
}) => {
  const [scriptError, setScriptError] = useState<string | null>(null);

  useEffect(() => {
    if (layer?.effectType === 'script' && layer.params.script) {
      const res = compileScript(layer.params.script.code);
      setScriptError(res.error);
    } else {
      setScriptError(null);
    }
  }, [layer?.effectType, layer?.params.script?.code]);

  if (!layer) {
    return (
      <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/5 text-center text-zinc-500 backdrop-blur-md">
        <Layers size={32} className="mx-auto mb-3 opacity-30" />
        {t('selectLayerPlaceholder')}
      </div>
    );
  }

  const updateParam = (type: EffectType, key: string, value: any) => {
    const nextParams = { ...layer.params };
    const effectKey = type as keyof typeof layer.params;
    
    nextParams[effectKey] = {
      ...(nextParams[effectKey] as any),
      [key]: value,
    };

    onUpdateLayer({
      ...layer,
      params: nextParams,
    });
  };

  const setEffectType = (type: EffectType) => {
    const nextParams = { ...layer.params };
    if (type === 'solid' && !nextParams.solid) {
      nextParams.solid = { color: '#8b5cf6' };
    } else if (type === 'gradient' && !nextParams.gradient) {
      nextParams.gradient = {
        stops: [
          { offset: 0, color: '#ec4899' },
          { offset: 0.5, color: '#8b5cf6' },
          { offset: 1, color: '#06b6d4' },
        ],
        speed: 0.3,
        frequency: 1,
        direction: 0,
      };
    } else if (type === 'noise' && !nextParams.noise) {
      nextParams.noise = {
        scale: 5,
        speed: 0.5,
        colorStart: '#3b82f6',
        colorEnd: '#ef4444',
        palette: 'rainbow',
      };
    } else if (type === 'chase' && !nextParams.chase) {
      nextParams.chase = {
        color: '#f43f5e',
        bgColor: '#09090b',
        speed: 0.5,
        size: 3,
        spacing: 12,
      };
    } else if (type === 'script' && !nextParams.script) {
      nextParams.script = {
        code: `// Write formula or assignment to r, g, b\n// Available: i, t, x, y, w, h, noise(nx, ny), dist(x1, y1, x2, y2)\n\nr = sin(i / 4.0 - t * 4.0) * 127 + 128;\ng = cos(i / 8.0 + t * 2.0) * 127 + 128;\nb = sin(t * 3.0) * 127 + 128;`,
      };
    } else if (type === 'audio' && !nextParams.audio) {
      nextParams.audio = {
        mode: 'bass',
        color: '#f59e0b',
        bgColor: '#020617',
        sensitivity: 2,
      };
    }

    onUpdateLayer({
      ...layer,
      effectType: type,
      params: nextParams,
    });
  };

  const handleAddStop = () => {
    if (!layer.params.gradient) return;
    const stops = [...layer.params.gradient.stops];
    if (stops.length >= 8) return;
    
    stops.push({ offset: 0.8, color: '#ffffff' });
    updateParam('gradient', 'stops', stops.sort((a, b) => a.offset - b.offset));
  };

  const handleUpdateStop = (index: number, key: keyof GradientStop, val: any) => {
    if (!layer.params.gradient) return;
    const stops = [...layer.params.gradient.stops];
    stops[index] = {
      ...stops[index],
      [key]: val,
    };
    updateParam('gradient', 'stops', stops);
  };

  const handleRemoveStop = (index: number) => {
    if (!layer.params.gradient) return;
    const stops = layer.params.gradient.stops.filter((_, i) => i !== index);
    if (stops.length < 2) return;
    updateParam('gradient', 'stops', stops);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start w-full">
      
      {/* Left Column: Properties Setup and Effect Type Select */}
      <div className="flex flex-col gap-4 w-full">
        {/* Basic layer properties: blend, opacity, masking */}
        <div className="p-4 rounded-2xl bg-zinc-900/40 border border-white/5 backdrop-blur-md">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Sliders size={14} className="text-primary" />
            {t('layerSetup')}: <span className="text-white font-bold">{layer.name}</span>
          </h3>

          <div className="grid grid-cols-2 gap-3 mb-3.5">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-500 font-medium">{t('blendMode')}</label>
              <select
                value={layer.blendMode}
                onChange={(e) => onUpdateLayer({ ...layer, blendMode: e.target.value as BlendMode })}
                className="w-full bg-zinc-950/60 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary transition-colors cursor-pointer"
              >
                <option value="normal">Normal (Overwrite)</option>
                <option value="add">Add (Additive)</option>
                <option value="multiply">Multiply (Filter)</option>
                <option value="screen">Screen (Lighten)</option>
                <option value="difference">Difference</option>
                <option value="overlay">Overlay</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-500 font-medium">{t('targetSegment')}</label>
              <select
                value={layer.segmentId}
                onChange={(e) => onUpdateLayer({ ...layer, segmentId: e.target.value })}
                className="w-full bg-zinc-950/60 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary transition-colors cursor-pointer"
              >
                <option value="all">{t('applyGlobally')}</option>
                {segments.map(seg => (
                  <option key={seg.id} value={seg.id}>
                    {seg.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400 font-medium">{t('layerOpacity')}</span>
              <span className="text-primary font-bold font-mono">{Math.round(layer.opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={layer.opacity}
              onChange={(e) => onUpdateLayer({ ...layer, opacity: Number(e.target.value) })}
              className="w-full accent-primary bg-zinc-950 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Effect Select Tab bar */}
        <div className="p-4 rounded-2xl bg-zinc-900/40 border border-white/5 backdrop-blur-md">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2.5">{t('selectEffectType')}</h3>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'solid', label: t('solid'), icon: <Sparkles size={12} /> },
              { id: 'gradient', label: t('gradient'), icon: <Sliders size={12} /> },
              { id: 'noise', label: t('noise'), icon: <Activity size={12} /> },
              { id: 'chase', label: t('chase'), icon: <Sliders size={12} /> },
              { id: 'script', label: t('mathScript'), icon: <Code size={12} /> },
              { id: 'audio', label: t('audioReact'), icon: <Volume2 size={12} /> },
            ].map(eff => (
              <button
                key={eff.id}
                onClick={() => setEffectType(eff.id as EffectType)}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-[11px] font-bold transition-all ${
                  layer.effectType === eff.id 
                  ? 'bg-primary border-primary text-white shadow-md shadow-purple-500/10' 
                  : 'bg-black/35 border-white/5 text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {eff.icon}
                {eff.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Effect Parameters Contextual Forms */}
      <div className="p-4 rounded-2xl bg-zinc-900/40 border border-white/5 backdrop-blur-md w-full">
        
        {/* 1. SOLID EFFECT */}
        {layer.effectType === 'solid' && layer.params.solid && (
          <div className="flex flex-col gap-2 animate-fade-in">
            <label className="text-xs text-zinc-400 font-semibold">{t('colorSelector')}</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={layer.params.solid.color}
                onChange={(e) => updateParam('solid', 'color', e.target.value)}
                className="w-14 h-10 border-none rounded-xl cursor-pointer bg-transparent shrink-0"
              />
              <input
                type="text"
                value={layer.params.solid.color}
                onChange={(e) => updateParam('solid', 'color', e.target.value)}
                className="w-full bg-zinc-950/60 border border-white/5 rounded-xl px-3 py-2 text-sm text-white font-mono uppercase tracking-wider focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Quick solid color presets */}
            <div className="flex flex-col gap-1.5 mt-2 border-t border-white/5 pt-2">
              <span className="text-[9px] text-zinc-500 font-bold uppercase font-mono tracking-wider">Quick Colors</span>
              <div className="flex gap-2 flex-wrap">
                {[
                  { name: 'Red', color: '#ef4444' },
                  { name: 'Green', color: '#10b981' },
                  { name: 'Blue', color: '#3b82f6' },
                  { name: 'Cyan', color: '#06b6d4' },
                  { name: 'Purple', color: '#8b5cf6' },
                  { name: 'Magenta', color: '#d946ef' },
                  { name: 'Yellow', color: '#eab308' },
                  { name: 'Orange', color: '#f97316' }
                ].map(preset => (
                  <button
                    key={preset.color}
                    type="button"
                    onClick={() => updateParam('solid', 'color', preset.color)}
                    className="w-6 h-6 rounded-full border border-white/10 cursor-pointer transition-all hover:scale-110 active:scale-95 shadow-inner"
                    style={{ backgroundColor: preset.color }}
                    title={preset.name}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. GRADIENT EFFECT */}
        {layer.effectType === 'gradient' && layer.params.gradient && (
          <div className="flex flex-col gap-4">
            {/* Color Stops Manager */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-zinc-400 font-semibold">{t('gradientStops')}</label>
                <button
                  onClick={handleAddStop}
                  disabled={layer.params.gradient.stops.length >= 8}
                  className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold flex items-center gap-1 hover:bg-primary/20 transition-all shadow-[0_0_10px_rgba(139,92,246,0.1)] disabled:opacity-35"
                >
                  <Plus size={10} /> {t('addStop')}
                </button>
              </div>

              {/* Gradient Preview Bar */}
              <div
                className="h-6 rounded-xl border border-white/10 shadow-inner mb-3"
                style={{
                  background: `linear-gradient(to right, ${layer.params.gradient.stops
                    .map(st => `${st.color} ${st.offset * 100}%`)
                    .join(', ')})`,
                }}
              />

              {/* Stop input fields list */}
              <div className="flex flex-col gap-2 max-h-32 overflow-y-auto pr-1">
                {layer.params.gradient.stops.map((st, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-black/40 border border-white/5 px-2.5 py-1.5 rounded-xl">
                    <input
                      type="color"
                      value={st.color}
                      onChange={(e) => handleUpdateStop(idx, 'color', e.target.value)}
                      className="w-7 h-6 border-none bg-transparent cursor-pointer shrink-0"
                    />
                    <div className="flex items-center gap-1.5 flex-1">
                      <span className="text-[10px] text-zinc-500 font-bold">Pos:</span>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.05"
                        value={st.offset}
                        onChange={(e) => handleUpdateStop(idx, 'offset', Number(e.target.value))}
                        className="w-16 bg-zinc-950/60 border border-white/5 rounded-lg px-1.5 py-0.5 text-xs text-white font-mono text-center focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => handleRemoveStop(idx)}
                      disabled={(layer.params.gradient?.stops?.length || 0) <= 2}
                      className="text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-30"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Quick preset gradient options */}
              <div className="flex flex-col gap-1.5 mt-3 border-t border-white/5 pt-2">
                <span className="text-[9px] text-zinc-500 font-bold uppercase font-mono tracking-wider">Quick Gradients</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      name: 'Cyberpunk',
                      colors: ['#db2777', '#8b5cf6', '#06b6d4'],
                      stops: [
                        { offset: 0, color: '#db2777' },
                        { offset: 0.5, color: '#8b5cf6' },
                        { offset: 1, color: '#06b6d4' }
                      ]
                    },
                    {
                      name: 'Sunset Glow',
                      colors: ['#f43f5e', '#f97316', '#eab308'],
                      stops: [
                        { offset: 0, color: '#f43f5e' },
                        { offset: 0.5, color: '#f97316' },
                        { offset: 1, color: '#eab308' }
                      ]
                    },
                    {
                      name: 'Ocean Ripple',
                      colors: ['#3b82f6', '#06b6d4', '#10b981'],
                      stops: [
                        { offset: 0, color: '#3b82f6' },
                        { offset: 0.5, color: '#06b6d4' },
                        { offset: 1, color: '#10b981' }
                      ]
                    },
                    {
                      name: 'Forest Aurora',
                      colors: ['#10b981', '#6366f1', '#ec4899'],
                      stops: [
                        { offset: 0, color: '#10b981' },
                        { offset: 0.5, color: '#6366f1' },
                        { offset: 1, color: '#ec4899' }
                      ]
                    }
                  ].map(preset => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => updateParam('gradient', 'stops', preset.stops)}
                      className="flex flex-col gap-1 p-2 bg-black/40 border border-white/5 rounded-xl hover:border-purple-500/20 transition-all text-left group"
                    >
                      <span className="text-[9px] font-bold text-zinc-400 group-hover:text-white transition-colors">{preset.name}</span>
                      <div
                        className="h-1.5 w-full rounded-md"
                        style={{
                          background: `linear-gradient(to right, ${preset.colors.join(', ')})`
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Speeds and geometry settings */}
            <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-3">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-400 font-medium">{t('shiftSpeed')}</span>
                  <span className="text-primary font-bold font-mono">{layer.params.gradient.speed.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="-2"
                  max="2"
                  step="0.05"
                  value={layer.params.gradient.speed}
                  onChange={(e) => updateParam('gradient', 'speed', Number(e.target.value))}
                  className="w-full accent-primary bg-zinc-950 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-400 font-medium">{t('waveFreq')}</span>
                  <span className="text-primary font-bold font-mono">{layer.params.gradient.frequency.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="5"
                  step="0.1"
                  value={layer.params.gradient.frequency}
                  onChange={(e) => updateParam('gradient', 'frequency', Number(e.target.value))}
                  className="w-full accent-primary bg-zinc-950 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-400 font-medium">{t('gradientDirection')}</span>
                <span className="text-primary font-bold font-mono">{layer.params.gradient.direction}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="5"
                value={layer.params.gradient.direction}
                onChange={(e) => updateParam('gradient', 'direction', Number(e.target.value))}
                className="w-full accent-primary bg-zinc-950 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* 3. NOISE EFFECT */}
        {layer.effectType === 'noise' && layer.params.noise && (
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-400 font-semibold">{t('noisePalette')}</label>
              <select
                value={layer.params.noise.palette}
                onChange={(e) => updateParam('noise', 'palette', e.target.value)}
                className="w-full bg-zinc-950/60 border border-white/5 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors cursor-pointer"
              >
                <option value="rainbow">{t('rainbowSpectrums')}</option>
                <option value="fire">{t('fireSimulation')}</option>
                <option value="ocean">{t('oceanRipples')}</option>
                <option value="forest">{t('forestMoss')}</option>
                <option value="custom">{t('customColorBounds')}</option>
              </select>
            </div>

            {layer.params.noise.palette === 'custom' && (
              <div className="grid grid-cols-2 gap-3 bg-black/40 border border-white/5 p-2 rounded-xl">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-zinc-500 font-semibold">{t('lowBound')}</label>
                  <input
                    type="color"
                    value={layer.params.noise.colorStart}
                    onChange={(e) => updateParam('noise', 'colorStart', e.target.value)}
                    className="w-full h-8 border-none bg-transparent cursor-pointer"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-zinc-500 font-semibold">{t('highBound')}</label>
                  <input
                    type="color"
                    value={layer.params.noise.colorEnd}
                    onChange={(e) => updateParam('noise', 'colorEnd', e.target.value)}
                    className="w-full h-8 border-none bg-transparent cursor-pointer"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-3">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-400 font-medium">{t('noiseScale')}</span>
                  <span className="text-primary font-bold font-mono">{layer.params.noise.scale.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="10"
                  step="0.1"
                  value={layer.params.noise.scale}
                  onChange={(e) => updateParam('noise', 'scale', Number(e.target.value))}
                  className="w-full accent-primary bg-zinc-950 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-400 font-medium">{t('evolutionSpeed')}</span>
                  <span className="text-primary font-bold font-mono">{layer.params.noise.speed.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="2.5"
                  step="0.05"
                  value={layer.params.noise.speed}
                  onChange={(e) => updateParam('noise', 'speed', Number(e.target.value))}
                  className="w-full accent-primary bg-zinc-950 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* 4. CHASE EFFECT */}
        {layer.effectType === 'chase' && layer.params.chase && (
          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-2 gap-3 bg-black/40 border border-white/5 p-2 rounded-xl">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-500 font-semibold">{t('dotColor')}</label>
                <input
                  type="color"
                  value={layer.params.chase.color}
                  onChange={(e) => updateParam('chase', 'color', e.target.value)}
                  className="w-full h-8 border-none bg-transparent cursor-pointer"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-500 font-semibold">{t('background')}</label>
                <input
                  type="color"
                  value={layer.params.chase.bgColor}
                  onChange={(e) => updateParam('chase', 'bgColor', e.target.value)}
                  className="w-full h-8 border-none bg-transparent cursor-pointer"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-400 font-medium">{t('chaseSpeed')}</span>
                <span className="text-primary font-bold font-mono">{layer.params.chase.speed.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="-2"
                max="2"
                step="0.05"
                value={layer.params.chase.speed}
                onChange={(e) => updateParam('chase', 'speed', Number(e.target.value))}
                className="w-full accent-primary bg-zinc-950 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-3">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-400 font-medium">{t('sizeLedCount')}</span>
                  <span className="text-primary font-bold font-mono">{layer.params.chase.size}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="15"
                  step="1"
                  value={layer.params.chase.size}
                  onChange={(e) => updateParam('chase', 'size', Number(e.target.value))}
                  className="w-full accent-primary bg-zinc-950 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-400 font-medium">{t('spacing')}</span>
                  <span className="text-primary font-bold font-mono">{layer.params.chase.spacing}</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="40"
                  step="1"
                  value={layer.params.chase.spacing}
                  onChange={(e) => updateParam('chase', 'spacing', Number(e.target.value))}
                  className="w-full accent-primary bg-zinc-950 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* 5. MATH SCRIPT EFFECT */}
        {layer.effectType === 'script' && layer.params.script && (
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <label className="text-xs text-zinc-400 font-semibold">{t('mathExpressionScript')}</label>
              {scriptError ? (
                <span className="text-[10px] text-red-400 font-bold bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">⚠️ Error</span>
              ) : (
                <span className="text-[10px] text-green-400 font-bold bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Check size={10} /> OK
                </span>
              )}
            </div>

            <textarea
              value={layer.params.script.code}
              onChange={(e) => updateParam('script', 'code', e.target.value)}
              className="w-full font-mono bg-black/60 border border-white/5 rounded-xl p-3 text-[11px] leading-relaxed text-sky-400 focus:outline-none focus:border-primary focus:shadow-[0_0_15px_rgba(139,92,246,0.15)] transition-all min-h-[160px]"
              rows={6}
              spellCheck="false"
            />

            {/* Quick Math Script Formula Snippets */}
            <div className="flex flex-col gap-1.5 border-t border-white/5 pt-2">
              <span className="text-[9px] text-zinc-500 font-bold uppercase font-mono tracking-wider">Formula Snippets</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    name: 'Sine Wave',
                    code: `// Sine wave pulse\nr = sin(i / 4.0 - t * 4.0) * 127 + 128;\ng = cos(i / 8.0 + t * 2.0) * 127 + 128;\nb = sin(t * 3.0) * 127 + 128;`
                  },
                  {
                    name: 'Interference',
                    code: `// Wave interference\nfloat w1 = sin(x * 0.3 - t * 5.0);\nfloat w2 = cos(y * 0.3 + t * 3.0);\nr = int((w1 + w2 + 2.0) * 60.0);\ng = int((w1 - w2 + 2.0) * 60.0);\nb = int(255.0 * abs(w1 * w2));`
                  },
                  {
                    name: 'Vortex',
                    code: `// Spinning vortex spiral\nfloat dx = x - w/2.0;\nfloat dy = y - h/2.0;\nfloat dist = sqrt(dx*dx + dy*dy);\nfloat angle = atan2(dy, dx);\nfloat spiral = sin(dist * 0.8 - angle * 2.0 + t * 4.0);\nr = int(127.0 + 127.0 * sin(spiral + t));\ng = int(127.0 + 127.0 * sin(spiral + t + 2.0));\nb = int(255.0 * (1.0 - dist/(w*0.7)));`
                  }
                ].map(preset => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => updateParam('script', 'code', preset.code)}
                    className="p-1.5 bg-black/40 border border-white/5 rounded-xl text-[9px] text-zinc-400 hover:text-white hover:border-purple-500/20 transition-all font-semibold text-center"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {scriptError && (
              <div className="bg-red-950/20 border border-red-500/20 p-2.5 rounded-xl text-[10px] text-red-300 font-mono">
                {scriptError}
              </div>
            )}

            {/* Quick documentation box */}
            <div className="bg-black/30 border border-white/5 p-3 rounded-xl text-[10px] leading-relaxed flex flex-col gap-1.5">
              <div className="flex gap-1.5 text-zinc-400 font-semibold">
                <Info size={12} className="text-primary shrink-0" />
                <span>{t('scriptingQuickRef')}</span>
              </div>
              <p className="text-zinc-500 text-[10px]">
                {t('scriptingDetails')}
              </p>
            </div>
          </div>
        )}

        {/* 6. AUDIO REACT EFFECT */}
        {layer.effectType === 'audio' && layer.params.audio && (
          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-2 gap-3 bg-black/40 border border-white/5 p-2 rounded-xl">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-500 font-semibold">{t('pulseColor')}</label>
                <input
                  type="color"
                  value={layer.params.audio.color}
                  onChange={(e) => updateParam('audio', 'color', e.target.value)}
                  className="w-full h-8 border-none bg-transparent cursor-pointer"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-500 font-semibold">{t('bgColor')}</label>
                <input
                  type="color"
                  value={layer.params.audio.bgColor}
                  onChange={(e) => updateParam('audio', 'bgColor', e.target.value)}
                  className="w-full h-8 border-none bg-transparent cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-zinc-500 font-semibold">{t('frequencyBand')}</label>
                <select
                  value={layer.params.audio.mode}
                  onChange={(e) => updateParam('audio', 'mode', e.target.value)}
                  className="w-full bg-zinc-950/60 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary transition-colors cursor-pointer"
                >
                  <option value="bass">Bass Beat</option>
                  <option value="mid">Mids Vocal</option>
                  <option value="treble">Treble Crash</option>
                  <option value="spectrum">Envelope Wave</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-400 font-medium">{t('sensitivityGain')}</span>
                  <span className="text-primary font-bold font-mono">{layer.params.audio.sensitivity.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="6"
                  step="0.1"
                  value={layer.params.audio.sensitivity}
                  onChange={(e) => updateParam('audio', 'sensitivity', Number(e.target.value))}
                  className="w-full accent-primary bg-zinc-950 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
