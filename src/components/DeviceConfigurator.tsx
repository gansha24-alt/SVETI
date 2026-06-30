import React, { useState } from 'react';
import { LayoutGrid, Sliders, Plus, Trash2, ShieldAlert } from 'lucide-react';
import type { DeviceConfig, Segment, DeviceType } from '../types/led';

interface DeviceConfiguratorProps {
  config: DeviceConfig;
  onChangeConfig: (config: DeviceConfig) => void;
  segments: Segment[];
  onChangeSegments: (segments: Segment[]) => void;
  t: (key: any) => string;
}

export const DeviceConfigurator: React.FC<DeviceConfiguratorProps> = ({
  config,
  onChangeConfig,
  segments,
  onChangeSegments,
  t,
}) => {
  const [segName, setSegName] = useState('');
  const [segStart, setSegStart] = useState(0);
  const [segEnd, setSegEnd] = useState(10);

  const getMaxLEDCount = () => {
    if (config.type === 'strip') return config.length;
    if (config.type === 'matrix') return config.width * config.height;
    return config.ringCount;
  };

  const handleTypeChange = (type: DeviceType) => {
    const nextConfig: DeviceConfig = { ...config, type };
    if (type === 'strip') {
      nextConfig.length = 60;
    } else if (type === 'matrix') {
      nextConfig.width = 16;
      nextConfig.height = 16;
      nextConfig.matrixLayout = 'serpentine';
    } else if (type === 'ring') {
      nextConfig.ringCount = 24;
    }
    onChangeConfig(nextConfig);
    onChangeSegments([]);
  };

  const addSegment = () => {
    if (!segName.trim()) return;
    const max = getMaxLEDCount();
    const start = Math.max(0, Math.min(max - 1, Number(segStart)));
    const end = Math.max(start, Math.min(max - 1, Number(segEnd)));

    const newSeg: Segment = {
      id: Math.random().toString(36).substring(2, 9),
      name: segName,
      start,
      end,
    };

    onChangeSegments([...segments, newSeg]);
    setSegName('');
  };

  const deleteSegment = (id: string) => {
    onChangeSegments(segments.filter(s => s.id !== id));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start w-full">
      {/* Left Column: Device Type Selector & Geometry Configuration */}
      <div className="flex flex-col gap-4 w-full">
        {/* Device Type Select */}
        <div className="p-4 rounded-2xl bg-zinc-900/40 border border-white/5 backdrop-blur-md">
          <h4 className="flex items-center gap-2 mb-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            <Sliders size={14} className="text-primary" />
            {t('selectLightLayout')}
          </h4>
          <div className="grid grid-cols-3 gap-1.5 p-0.5 bg-black/40 border border-white/5 rounded-xl">
            {(['strip', 'matrix', 'ring'] as DeviceType[]).map(tName => (
              <button
                key={tName}
                onClick={() => handleTypeChange(tName)}
                className={`py-2 text-xs font-bold rounded-lg transition-all capitalize ${
                  config.type === tName 
                  ? 'bg-primary text-white shadow-md shadow-purple-500/10' 
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tName === 'strip' ? t('strips') : tName === 'matrix' ? t('matrices') : t('rings')}
              </button>
            ))}
          </div>
        </div>

        {/* Geometry Configurations */}
        <div className="p-4 rounded-2xl bg-zinc-900/40 border border-white/5 backdrop-blur-md">
          <h4 className="flex items-center gap-2 mb-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            <LayoutGrid size={14} className="text-primary" />
            {t('layoutParameters')}
          </h4>
          
          {config.type === 'strip' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-400 font-medium">{t('totalLedCount')}</label>
              <input
                type="number"
                min={1}
                max={150}
                value={config.length}
                onChange={(e) => onChangeConfig({ ...config, length: Number(e.target.value) })}
                className="w-full bg-zinc-950/60 border border-white/5 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          )}

          {config.type === 'matrix' && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-400 font-medium">{t('widthCols')}</label>
                  <input
                    type="number"
                    min={2}
                    max={32}
                    value={config.width}
                    onChange={(e) => onChangeConfig({ ...config, width: Number(e.target.value) })}
                    className="w-full bg-zinc-950/60 border border-white/5 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-400 font-medium">{t('heightRows')}</label>
                  <input
                    type="number"
                    min={2}
                    max={32}
                    value={config.height}
                    onChange={(e) => onChangeConfig({ ...config, height: Number(e.target.value) })}
                    className="w-full bg-zinc-950/60 border border-white/5 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400 font-medium">{t('matrixWiring')}</label>
                <select
                  value={config.matrixLayout}
                  onChange={(e) => onChangeConfig({ ...config, matrixLayout: e.target.value as 'serpentine' | 'grid' })}
                  className="w-full bg-zinc-950/60 border border-white/5 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors cursor-pointer"
                >
                  <option value="serpentine">{t('serpentine')}</option>
                  <option value="grid">{t('grid')}</option>
                </select>
              </div>
            </div>
          )}

          {config.type === 'ring' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-400 font-medium">{t('ringLedCount')}</label>
              <input
                type="number"
                min={4}
                max={100}
                value={config.ringCount}
                onChange={(e) => onChangeConfig({ ...config, ringCount: Number(e.target.value) })}
                className="w-full bg-zinc-950/60 border border-white/5 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Custom LED Segment Allocation */}
      <div className="p-4 rounded-2xl bg-zinc-900/40 border border-white/5 backdrop-blur-md w-full">
        <h4 className="flex items-center gap-2 mb-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          <ShieldAlert size={14} className="text-secondary" />
          {t('customLedSegments')}
        </h4>

        {/* List segments */}
        {segments.length === 0 ? (
          <p className="text-xs text-zinc-500 mb-3 italic">
            {t('noSegments')}
          </p>
        ) : (
          <div className="flex flex-col gap-2 mb-3 max-h-[160px] overflow-y-auto pr-1">
            {segments.map(seg => (
              <div
                key={seg.id}
                className="flex justify-between items-center bg-black/40 border border-white/5 px-3 py-2 rounded-xl"
              >
                <div>
                  <div className="text-xs font-bold text-white">{seg.name}</div>
                  <div className="text-[10px] text-zinc-500 font-mono">
                    LEDs {seg.start} - {seg.end}
                  </div>
                </div>
                <button
                  onClick={() => deleteSegment(seg.id)}
                  className="text-zinc-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add segment form */}
        <div className="flex flex-col gap-2.5 border-t border-white/5 pt-3">
          <input
            type="text"
            placeholder={t('segmentNamePlaceholder')}
            value={segName}
            onChange={(e) => setSegName(e.target.value)}
            className="w-full bg-zinc-950/60 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary transition-colors"
          />

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-500 font-medium">{t('startIndex')}</label>
              <input
                type="number"
                min={0}
                max={getMaxLEDCount() - 1}
                value={segStart}
                onChange={(e) => setSegStart(Number(e.target.value))}
                className="w-full bg-zinc-950/60 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-500 font-medium">{t('endIndex')}</label>
              <input
                type="number"
                min={segStart}
                max={getMaxLEDCount() - 1}
                value={segEnd}
                onChange={(e) => setSegEnd(Number(e.target.value))}
                className="w-full bg-zinc-950/60 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <button
            onClick={addSegment}
            disabled={!segName.trim()}
            className="w-full py-2 bg-purple-600/10 border border-purple-500/20 hover:bg-purple-500/20 text-primary hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-[0_0_10px_rgba(139,92,246,0.1)]"
          >
            <Plus size={13} /> {t('addSegment')}
          </button>
        </div>
      </div>
    </div>
  );
};
