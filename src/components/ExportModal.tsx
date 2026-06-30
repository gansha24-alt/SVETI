import React, { useState } from 'react';
import { X, Copy, Check, Download, Code, Terminal, Settings } from 'lucide-react';
import type { DeviceConfig, Layer } from '../types/led';
import { exportToFastLED, exportToWLED } from '../utils/ledRenderer';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  presetTitle: string;
  deviceConfig: DeviceConfig;
  layers: Layer[];
  t: (key: any) => string;
}

type ExportTab = 'json' | 'fastled' | 'wled';

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  presetTitle,
  deviceConfig,
  layers,
  t,
}) => {
  const [activeTab, setActiveTab] = useState<ExportTab>('json');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const getCode = () => {
    switch (activeTab) {
      case 'fastled':
        return exportToFastLED(presetTitle, deviceConfig, layers);
      case 'wled':
        return exportToWLED(presetTitle, deviceConfig, layers);
      case 'json':
      default:
        return JSON.stringify({ presetTitle, deviceConfig, layers }, null, 2);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const code = getCode();
    let fileExtension = 'json';
    let mimeType = 'application/json';
    if (activeTab === 'fastled') {
      fileExtension = 'ino';
      mimeType = 'text/plain';
    }

    const blob = new Blob([code], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${presetTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_preset.${fileExtension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center animate-fade-in">
      <div className="w-full max-w-md sm:max-w-[420px] bg-[#07070d] border-t border-white/5 rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh] border-x border-white/5">
        
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Code className="text-primary" size={16} />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">{t('exportTitle').slice(0, 20)}...</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-black/45 border-b border-white/5">
          <button
            className={`py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
              activeTab === 'json' ? 'bg-primary text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            onClick={() => setActiveTab('json')}
          >
            <Settings size={11} /> {t('jsonTitle').split(' ')[0]}
          </button>
          <button
            className={`py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
              activeTab === 'fastled' ? 'bg-primary text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            onClick={() => setActiveTab('fastled')}
          >
            <Terminal size={11} /> {t('fastledTitle').split(' ')[0]}
          </button>
          <button
            className={`py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
              activeTab === 'wled' ? 'bg-primary text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            onClick={() => setActiveTab('wled')}
          >
            <Code size={11} /> {t('wledTitle').split(' ')[0]}
          </button>
        </div>

        {/* Info Alert */}
        <div className="px-5 py-3 text-[11px] text-zinc-500 border-b border-white/5 bg-black/20">
          {activeTab === 'json' && <p>{t('jsonInfo')}</p>}
          {activeTab === 'fastled' && <p>{t('fastledInfo')}</p>}
          {activeTab === 'wled' && <p>{t('wledInfo')}</p>}
        </div>

        {/* Code Block Container */}
        <div className="p-4 flex flex-col gap-3 flex-1 overflow-hidden">
          
          <div className="flex gap-2 justify-end">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-xl border border-white/5 bg-zinc-950/60 hover:bg-zinc-950 text-zinc-400 hover:text-white text-[11px] font-bold flex items-center gap-1.5 transition-all"
            >
              {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
              {copied ? t('copied') : t('copy')}
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-xl bg-primary hover:bg-purple-500 text-white text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-[0_0_10px_var(--primary-glow)]"
            >
              <Download size={12} />
              {t('download')}
            </button>
          </div>

          <pre className="w-full h-64 overflow-auto bg-black/60 border border-white/5 rounded-xl p-4 font-mono text-[11px] text-emerald-400 scrollbar-none">
            <code>{getCode()}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
