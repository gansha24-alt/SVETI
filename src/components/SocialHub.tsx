import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageSquare, FolderGit2, Search, Share2, Sparkles, X, Send, User } from 'lucide-react';
import type { Preset, DeviceConfig, Layer, Comment, Segment } from '../types/led';
import { renderLEDs } from '../utils/ledRenderer';

// Pre-seeded community presets to populate the social network immediately
const INITIAL_COMMUNITY_PRESETS: Preset[] = [
  {
    id: 'cyberpunk-neon-1',
    title: 'Cyberpunk Neon Pulse',
    description: 'Dynamic pink and cyan overlays simulating neon cityscapes. Uses difference blends and speed multipliers.',
    author: 'NeoPixel_Coder',
    authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80',
    likes: 142,
    likedByUser: false,
    forks: 38,
    tags: ['cyberpunk', 'ambient', 'gradient'],
    createdAt: '2 hours ago',
    deviceConfig: { type: 'strip', length: 60, width: 16, height: 16, matrixLayout: 'serpentine', ringCount: 24 },
    segments: [],
    layers: [
      {
        id: 'bg',
        name: 'Pink Backlight',
        visible: true,
        opacity: 0.8,
        blendMode: 'normal',
        effectType: 'solid',
        segmentId: 'all',
        params: { solid: { color: '#ec4899' } }
      },
      {
        id: 'cyan-wave',
        name: 'Cyan Wave',
        visible: true,
        opacity: 0.9,
        blendMode: 'difference',
        effectType: 'gradient',
        segmentId: 'all',
        params: {
          gradient: {
            stops: [
              { offset: 0, color: '#06b6d4' },
              { offset: 0.5, color: '#000000' },
              { offset: 1, color: '#06b6d4' }
            ],
            speed: 0.6,
            frequency: 1.5,
            direction: 0
          }
        }
      }
    ],
    comments: [
      { id: 'c1', author: 'FastLED_Fanatic', avatar: '', content: 'Wow! This difference blending works incredibly well on actual WS2812Bs!', createdAt: '1 hour ago' },
      { id: 'c2', author: 'WLED_Builder', avatar: '', content: 'Stunning colors. Imported to WLED ceiling strip instantly.', createdAt: '45 mins ago' }
    ]
  },
  {
    id: 'matrix-rain-2',
    title: 'Matrix Rain Simulation',
    description: 'Simulates the classic green code rain using a custom JavaScript math script. Perfect for grids/matrices.',
    author: 'Trinity_99',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&h=80',
    likes: 219,
    likedByUser: false,
    forks: 82,
    tags: ['matrix', 'scripts', 'green'],
    createdAt: '1 day ago',
    deviceConfig: { type: 'matrix', length: 30, width: 16, height: 16, matrixLayout: 'serpentine', ringCount: 24 },
    segments: [],
    layers: [
      {
        id: 'rain-script',
        name: 'Code Rain',
        visible: true,
        opacity: 1,
        blendMode: 'normal',
        effectType: 'script',
        segmentId: 'all',
        params: {
          script: {
            code: `// Falling binary codes\nfloat col = x;\nfloat row = y;\nfloat fall = fract(t * 0.45 + col * 0.17);\nfloat glow = 1.0 - fract((row / h) + fall);\nif (glow > 0.85) {\n  r = 180; g = 255; b = 180;\n} else if (glow > 0.45) {\n  r = 0; g = 220; b = 0;\n} else {\n  r = 0; g = 0; b = 0;\n}`
          }
        }
      }
    ],
    comments: [
      { id: 'c3', author: 'Neo', avatar: '', content: 'I see code. I see the construct. Great script.', createdAt: '12 hours ago' }
    ]
  },
  {
    id: 'lava-lamp-3',
    title: 'Organic Fire & Lava',
    description: 'Slow-evolving value noise palette mimicking molten lava and volcanic glows. High density warmth.',
    author: 'CozySpace',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&h=80',
    likes: 98,
    likedByUser: false,
    forks: 14,
    tags: ['noise', 'cozy', 'fire'],
    createdAt: '3 days ago',
    deviceConfig: { type: 'ring', length: 30, width: 16, height: 16, matrixLayout: 'serpentine', ringCount: 24 },
    segments: [],
    layers: [
      {
        id: 'fire-noise',
        name: 'Lava Evolution',
        visible: true,
        opacity: 0.95,
        blendMode: 'normal',
        effectType: 'noise',
        segmentId: 'all',
        params: {
          noise: {
            scale: 2.2,
            speed: 0.15,
            palette: 'fire',
            colorStart: '#000000',
            colorEnd: '#000000'
          }
        }
      }
    ],
    comments: []
  }
];

interface SocialHubProps {
  onForkPreset: (preset: Preset) => void;
  activePresetData: {
    title: string;
    deviceConfig: DeviceConfig;
    segments: Segment[];
    layers: Layer[];
  };
  t: (key: any) => string;
}

const MiniaturePreview: React.FC<{ preset: Preset }> = ({ preset }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    const previewConfig = { ...preset.deviceConfig };
    if (previewConfig.type === 'strip') previewConfig.length = Math.min(25, previewConfig.length);
    if (previewConfig.type === 'matrix') {
      previewConfig.width = 12;
      previewConfig.height = 12;
    }

    const start = Date.now();

    const draw = () => {
      const elapsed = (Date.now() - start) / 1000.0;
      
      const colors = renderLEDs(
        previewConfig,
        preset.segments,
        preset.layers,
        elapsed,
        { bass: 0.5, mid: 0.5, treble: 0.5, waveform: Array(32).fill(0) }
      );

      ctx.fillStyle = '#060609';
      ctx.fillRect(0, 0, width, height);

      const total = colors.length;
      const spacing = width / (total + 1);

      colors.forEach((color, idx) => {
        const [r, g, b] = color;
        const cx = spacing * (idx + 1);
        const cy = height / 2;

        const radial = ctx.createRadialGradient(cx, cy, 1, cx, cy, 10);
        radial.addColorStop(0, `rgba(${r},${g},${b},0.6)`);
        radial.addColorStop(1, 'transparent');
        ctx.fillStyle = radial;
        ctx.fillRect(cx - 10, cy - 10, 20, 20);

        ctx.beginPath();
        ctx.arc(cx, cy, 2, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [preset]);

  return (
    <canvas
      ref={canvasRef}
      width={180}
      height={48}
      className="rounded-lg border border-white/5 bg-[#060609]"
    />
  );
};

export const SocialHub: React.FC<SocialHubProps> = ({ onForkPreset, activePresetData, t }) => {
  const [presets, setPresets] = useState<Preset[]>(() => {
    const saved = localStorage.getItem('sveti_community_presets');
    return saved ? JSON.parse(saved) : INITIAL_COMMUNITY_PRESETS;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'strip' | 'matrix' | 'ring'>('all');
  
  // Modals state
  const [commentModalPreset, setCommentModalPreset] = useState<Preset | null>(null);
  const [newComment, setNewComment] = useState('');
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  
  // Publish form state
  const [pubTitle, setPubTitle] = useState(activePresetData.title || '');
  const [pubDesc, setPubDesc] = useState('');
  const [pubTags, setPubTags] = useState('');

  useEffect(() => {
    localStorage.setItem('sveti_community_presets', JSON.stringify(presets));
  }, [presets]);

  useEffect(() => {
    setPubTitle(activePresetData.title);
  }, [activePresetData.title]);

  const handleLike = (id: string) => {
    setPresets(presets.map(p => {
      if (p.id === id) {
        const liked = !p.likedByUser;
        return {
          ...p,
          likes: liked ? p.likes + 1 : p.likes - 1,
          likedByUser: liked
        };
      }
      return p;
    }));
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pubTitle.trim()) return;

    const tagsArr = pubTags
      .split(',')
      .map(t => t.trim().toLowerCase().replace('#', ''))
      .filter(t => t.length > 0);

    const newPreset: Preset = {
      id: Math.random().toString(36).substring(2, 9),
      title: pubTitle,
      description: pubDesc || 'Custom procedural wave scenario created in editor.',
      author: 'You (Creator)',
      authorAvatar: '',
      likes: 0,
      likedByUser: false,
      forks: 0,
      comments: [],
      tags: tagsArr.length > 0 ? tagsArr : ['custom'],
      createdAt: 'Just now',
      deviceConfig: activePresetData.deviceConfig,
      segments: activePresetData.segments,
      layers: activePresetData.layers
    };

    setPresets([newPreset, ...presets]);
    setPublishModalOpen(false);
    setPubDesc('');
    setPubTags('');
  };

  const submitComment = () => {
    if (!commentModalPreset || !newComment.trim()) return;

    const added: Comment = {
      id: Math.random().toString(36).substring(2, 9),
      author: 'AnonymousMaker',
      avatar: '',
      content: newComment,
      createdAt: 'Just now'
    };

    setPresets(presets.map(p => {
      if (p.id === commentModalPreset.id) {
        const updated = {
          ...p,
          comments: [...p.comments, added]
        };
        setCommentModalPreset(updated);
        return updated;
      }
      return p;
    }));

    setNewComment('');
  };

  const filteredPresets = presets.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = filterType === 'all' ? true : p.deviceConfig.type === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex flex-col gap-4">
      
      {/* Top Banner & Publish Trigger */}
      <div className="p-4 rounded-2xl bg-zinc-900/40 border border-white/5 backdrop-blur-md flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase tracking-wide">
            <Sparkles size={14} className="text-primary" />
            {t('socialExchangeHub').slice(0, 18)}
          </h2>
          <p className="text-[11px] text-zinc-500 mt-1">
            {t('socialSubTitle').slice(0, 75)}...
          </p>
        </div>
        <button
          onClick={() => setPublishModalOpen(true)}
          className="w-full py-2 bg-primary hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_var(--primary-glow)]"
        >
          <Share2 size={13} /> {t('publishCurrent').slice(0, 18)}
        </button>
      </div>

      {/* Filter and search panel */}
      <div className="flex flex-col gap-3">
        <div className="relative w-full">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950/60 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div className="grid grid-cols-4 gap-1 p-0.5 bg-black/45 border border-white/5 rounded-xl">
          {[
            { id: 'all', label: t('allLayouts').slice(0, 3) },
            { id: 'strip', label: t('strips').slice(0, 5) },
            { id: 'matrix', label: t('matrices').slice(0, 4) },
            { id: 'ring', label: t('rings').slice(0, 4) }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setFilterType(opt.id as any)}
              className={`py-1.5 text-[11px] font-bold rounded-lg transition-all capitalize ${
                filterType === opt.id 
                ? 'bg-primary text-white shadow-sm' 
                : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredPresets.map(p => (
          <div key={p.id} className="p-4 rounded-2xl bg-zinc-900/40 border border-white/5 backdrop-blur-md flex flex-col gap-3">
            
            {/* Header info */}
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xs font-bold text-white">{p.title}</h3>
                <span className="text-[10px] text-zinc-500 mt-0.5 block">
                  by @{p.author} • {p.createdAt}
                </span>
              </div>
              <span className="text-[9px] bg-black/40 border border-white/5 px-2 py-0.5 rounded text-zinc-400 font-mono uppercase font-semibold">
                {p.deviceConfig.type}
              </span>
            </div>

            {/* Preview Animation Canvas */}
            <div className="flex justify-center bg-black/35 py-2.5 rounded-xl border border-white/5 overflow-hidden">
              <MiniaturePreview preset={p} />
            </div>

            {/* Description */}
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              {p.description}
            </p>

            {/* Tags */}
            <div className="flex gap-2 flex-wrap">
              {p.tags.map(tName => (
                <span key={tName} className="text-[10px] text-primary font-semibold">
                  #{tName}
                </span>
              ))}
            </div>

            {/* Interactive footer */}
            <div className="flex justify-between items-center border-t border-white/5 pt-3 mt-1 shrink-0">
              <div className="flex gap-4">
                <button
                  onClick={() => handleLike(p.id)}
                  className={`flex items-center gap-1 text-xs transition-colors ${
                    p.likedByUser ? 'text-secondary' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Heart size={14} fill={p.likedByUser ? 'var(--secondary)' : 'none'} />
                  <span className="font-bold font-mono text-[11px]">{p.likes}</span>
                </button>

                <button
                  onClick={() => setCommentModalPreset(p)}
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <MessageSquare size={14} />
                  <span className="font-bold font-mono text-[11px]">{p.comments.length}</span>
                </button>
              </div>

              <button
                onClick={() => onForkPreset(p)}
                className="px-2.5 py-1.5 rounded-xl border border-primary/20 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(139,92,246,0.1)]"
              >
                <FolderGit2 size={12} />
                {t('forkToEditor')}
              </button>
            </div>

          </div>
        ))}
      </div>

      {/* COMMENTS MODAL (Native Drawer Style) */}
      {commentModalPreset && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center animate-fade-in">
          <div className="w-full max-w-md sm:max-w-[420px] bg-[#07070d] border-t border-white/5 rounded-t-3xl shadow-2xl flex flex-col max-h-[70vh] border-x border-white/5">
            <div className="flex justify-between items-center px-5 py-4 border-b border-white/5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                {t('commentsTitle')}: {commentModalPreset.title.slice(0, 18)}...
              </h3>
              <button
                onClick={() => setCommentModalPreset(null)}
                className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Comments List */}
            <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-3 scrollbar-none">
              {commentModalPreset.comments.length === 0 ? (
                <p className="text-xs text-zinc-600 text-center py-10 italic">{t('reviewsEmpty')}</p>
              ) : (
                commentModalPreset.comments.map(c => (
                  <div key={c.id} className="flex gap-2.5 bg-black/30 border border-white/5 p-3 rounded-xl">
                    <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <User size={12} className="text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-[10px] mb-1 font-semibold">
                        <span className="text-zinc-300">@{c.author}</span>
                        <span className="text-zinc-600">{c.createdAt}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-normal">{c.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment Form */}
            <div className="p-4 border-t border-white/5 bg-zinc-950/40 flex gap-2">
              <input
                type="text"
                placeholder={t('commentsPlaceholder')}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 bg-zinc-950/60 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && submitComment()}
              />
              <button
                onClick={submitComment}
                className="w-9 h-9 rounded-xl bg-primary hover:bg-purple-500 text-white flex items-center justify-center transition-all shadow-[0_0_10px_var(--primary-glow)] shrink-0"
              >
                <Send size={12} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PUBLISH PRESET FORM MODAL (Native Drawer Style) */}
      {publishModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center animate-fade-in">
          <div className="w-full max-w-md sm:max-w-[420px] bg-[#07070d] border-t border-white/5 rounded-t-3xl shadow-2xl flex flex-col max-h-[90vh] border-x border-white/5">
            <div className="flex justify-between items-center px-5 py-4 border-b border-white/5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">{t('publishActiveConfig')}</h3>
              <button
                onClick={() => setPublishModalOpen(false)}
                className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handlePublish} className="p-4 flex flex-col gap-4 overflow-y-auto scrollbar-none">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-500 font-bold uppercase">{t('presetTitleLabel')}</label>
                <input
                  type="text"
                  required
                  value={pubTitle}
                  onChange={(e) => setPubTitle(e.target.value)}
                  className="w-full bg-zinc-950/60 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary transition-colors"
                  placeholder="e.g. Aurora Borealis wave"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-500 font-bold uppercase">{t('descriptionLabel')}</label>
                <textarea
                  required
                  rows={3}
                  value={pubDesc}
                  onChange={(e) => setPubDesc(e.target.value)}
                  className="w-full bg-zinc-950/60 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary transition-colors resize-none"
                  placeholder="Briefly describe the blend modes and effect stack you designed."
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-500 font-bold uppercase">{t('tagsLabel')}</label>
                <input
                  type="text"
                  value={pubTags}
                  onChange={(e) => setPubTags(e.target.value)}
                  className="w-full bg-zinc-950/60 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary transition-colors"
                  placeholder="e.g. cozy, ambient, wave, matrix"
                />
              </div>

              <div className="bg-black/30 border border-white/5 p-3 rounded-xl text-[10px] leading-relaxed text-zinc-500">
                {t('publishWarning')}
              </div>

              <button 
                type="submit" 
                className="w-full py-2.5 bg-primary hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_rgba(139,92,246,0.2)]"
              >
                {t('shareToCommunity')}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
