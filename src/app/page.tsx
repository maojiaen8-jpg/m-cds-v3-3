"use client";

import React, { useState, useMemo } from 'react';
import { 
  Waves, Printer, Plus, Minus, Zap, Baby, Settings2, Activity, User, Target
} from 'lucide-react';

// --- 类型定义 ---
type StrokeKey = 'Free' | 'Back' | 'Fly' | 'Breast';
type PoolKey = '25' | '50';
type IntensityKey = 'SP' | 'TSP' | 'ANP' | 'ANE' | 'AES' | 'AEN' | 'BAE';

interface MatrixCell {
  dist: number;
  val: number | null;
  min: number | null;
  max: number | null;
  ri: string;
  isNA: boolean;
}

// --- 配置与算法 (保持你的逻辑不变) ---
const DISTANCES = [25, 50, 100, 200, 400];
const POOL_FACTORS: Record<PoolKey, number> = { '25': 1.0, '50': 1.035 };
const ERROR_MARGIN = 0.02;

const STROKE_FACTORS: Record<StrokeKey, { name: string; factor: number; color: string; maxDist: number }> = {
  'Free': { name: '自由泳 (FR)', factor: 1.0, color: '#10b981', maxDist: 400 },
  'Back': { name: '仰泳 (BK)', factor: 1.06, color: '#3b82f6', maxDist: 400 },
  'Fly': { name: '蝶泳 (FLY)', factor: 1.12, color: '#ec4899', maxDist: 200 },
  'Breast': { name: '蛙泳 (BR)', factor: 1.18, color: '#f59e0b', maxDist: 200 }
};

const INTENSITY_CONFIG: Record<IntensityKey, { name: string; label: string; color: string; hrPct: number; allowedDists: number[]; getRI: (d: number) => string }> = {
  SP: { name: 'SP', label: '绝对速度', color: '#ff4d4f', hrPct: 0.98, allowedDists: [25, 50], getRI: (d) => d <= 25 ? '3min' : '5min' },
  TSP: { name: 'TSP', label: '技术冲刺', color: '#ff7a45', hrPct: 0.95, allowedDists: [25, 50], getRI: (d) => d <= 25 ? '60s' : '90s' },
  ANP: { name: 'ANP', label: '无氧功率', color: '#ffc53d', hrPct: 0.92, allowedDists: [25, 50], getRI: (d) => d <= 25 ? '45s' : '60s' },
  ANE: { name: 'ANE', label: '无氧耐力', color: '#b37feb', hrPct: 0.88, allowedDists: [25, 50, 100, 200], getRI: (d) => d <= 50 ? '20s' : (d <= 100 ? '30s' : '45s') },
  AES: { name: 'AES', label: '有氧动力', color: '#40a9ff', hrPct: 0.82, allowedDists: [25, 50, 100, 200, 400], getRI: (d) => d <= 100 ? '20s' : (d <= 200 ? '30s' : '40s') },
  AEN: { name: 'AEN', label: '有氧耐力', color: '#73d13d', hrPct: 0.75, allowedDists: [25, 50, 100, 200, 400], getRI: (d) => d <= 100 ? '15s' : (d <= 200 ? '20s' : '30s') },
  BAE: { name: 'BAE', label: '基础有氧', color: '#8c8c8c', hrPct: 0.65, allowedDists: [25, 50, 100, 200, 400], getRI: (d) => d <= 100 ? '10s' : '15s' }
};

const formatTime = (seconds: number | null) => {
  if (seconds === null || isNaN(seconds)) return '--';
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1);
  return `${mins}:${secs.padStart(4, '0')}`;
};

const calculatePace = (id: string, t: number, css: number, poolFactor: number, stage: string, strokeFactor: number) => {
  let base25 = 0;
  switch(id) {
    case 'SP': base25 = t * poolFactor; break;
    case 'TSP': base25 = (t + 0.8) * poolFactor; break;
    case 'ANP': base25 = (t + 2.5) * poolFactor; break;
    case 'ANE': base25 = (t * 1.18) * poolFactor; break;
    case 'AES': base25 = (stage === 'pre' ? (css / 4 * 1.015) : (t * 1.28)) * poolFactor; break;
    case 'AEN': base25 = (stage === 'pre' ? (css / 4 * 1.055) : (t * 1.38)) * poolFactor; break;
    case 'BAE': base25 = (stage === 'pre' ? (css / 4 * 1.18) : (t * 1.55)) * poolFactor; break;
    default: base25 = t;
  }
  return base25 * strokeFactor;
};

export default function App() {
  const [name, setName] = useState('');
  const [age, setAge] = useState(14);
  const [tValue, setTValue] = useState(15.2);
  const [cssValue, setCssValue] = useState(84.5);
  const [phvStage, setPhvStage] = useState<'pre' | 'post'>('post');
  const [poolType, setPoolType] = useState<PoolKey>('25');
  const [stroke, setStroke] = useState<StrokeKey>('Free');

  const maxHR = 220 - age;

  const matrixData = useMemo(() => {
    const results: Record<string, MatrixCell[]> = {};
    const strokeInfo = STROKE_FACTORS[stroke];
    Object.keys(INTENSITY_CONFIG).forEach((id) => {
      const cfg = INTENSITY_CONFIG[id as IntensityKey];
      const pace25 = calculatePace(id, tValue, cssValue, POOL_FACTORS[poolType], phvStage, strokeInfo.factor);
      results[id] = DISTANCES.map(d => {
        const isValid = cfg.allowedDists.includes(d) && d <= strokeInfo.maxDist;
        const target = pace25 * (d / 25);
        return { 
          dist: d, val: isValid ? target : null, 
          min: isValid ? target * (1 - ERROR_MARGIN) : null,
          max: isValid ? target * (1 + ERROR_MARGIN) : null,
          ri: cfg.getRI(d), isNA: !isValid 
        };
      });
    });
    return results;
  }, [tValue, cssValue, poolType, phvStage, stroke]);

  return (
    <div className="min-h-screen bg-[#0a0c10] text-slate-200 font-sans antialiased">
      <style>{`
        .glass { background: rgba(20, 25, 35, 0.8); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.05); }
        .neon-border { border: 1px solid rgba(16, 185, 129, 0.2); box-shadow: 0 0 15px rgba(16, 185, 129, 0.05); }
        @media print { .no-print { display: none !important; } .print-only { display: block !important; } }
      `}</style>

      {/* 手机/电脑 Web 交互界面 */}
      <div className="no-print max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        {/* Top Header */}
        <header className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/20">
              <Waves className="text-black" size={20} />
            </div>
            <h1 className="text-xl font-black italic tracking-tighter text-white uppercase">M-CDS <span className="text-emerald-500">Elite</span></h1>
          </div>
          <button onClick={() => window.print()} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
            <Printer size={20} className="text-white" />
          </button>
        </header>

        {/* Input Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-4 space-y-4">
            <div className="glass p-5 rounded-3xl space-y-5 neon-border">
              {/* User Identity */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-black/40 p-3 rounded-2xl border border-white/5">
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-1 flex items-center gap-1"><User size={10}/> 运动员</p>
                  <input value={name} onChange={e=>setName(e.target.value)} placeholder="姓名" className="bg-transparent text-sm font-bold text-white outline-none w-full" />
                </div>
                <div className="bg-black/40 p-3 rounded-2xl border border-white/5">
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-1 flex items-center gap-1"><Activity size={10}/> 年龄</p>
                  <input type="number" value={age} onChange={e=>setAge(parseInt(e.target.value)||0)} className="bg-transparent text-sm font-bold text-white outline-none w-full" />
                </div>
              </div>

              {/* T-Value Gauge */}
              <div className="bg-black/60 p-4 rounded-2xl flex justify-between items-center border border-emerald-500/10">
                <div>
                  <p className="text-[9px] font-black text-emerald-500/70 uppercase tracking-widest mb-1">T-Value (25m Max)</p>
                  <p className="text-3xl font-black text-white font-mono tracking-tighter">{tValue.toFixed(1)}<span className="text-xs text-emerald-500 ml-1">s</span></p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={()=>setTValue(v=>Math.max(0,+(v-0.1).toFixed(1)))} className="p-2 bg-white/5 rounded-lg active:scale-90 transition-all"><Minus size={18}/></button>
                  <button onClick={()=>setTValue(v=>+(v+0.1).toFixed(1))} className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg active:scale-90 transition-all"><Plus size={18}/></button>
                </div>
              </div>

              {/* CSS Gauge */}
              <div className="bg-black/60 p-4 rounded-2xl flex justify-between items-center border border-blue-500/10">
                <div>
                  <p className="text-[9px] font-black text-blue-500/70 uppercase tracking-widest mb-1">CSS (100m Endurance)</p>
                  <p className="text-3xl font-black text-white font-mono tracking-tighter">{cssValue.toFixed(1)}<span className="text-xs text-blue-500 ml-1">s</span></p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={()=>setCssValue(v=>Math.max(0,+(v-0.5).toFixed(1)))} className="p-2 bg-white/5 rounded-lg active:scale-90 transition-all"><Minus size={18}/></button>
                  <button onClick={()=>setCssValue(v=>+(v+0.5).toFixed(1))} className="p-2 bg-blue-500/20 text-blue-400 rounded-lg active:scale-90 transition-all"><Plus size={18}/></button>
                </div>
              </div>

              {/* Settings Toggle */}
              <div className="space-y-3">
                <div className="flex bg-black/60 p-1 rounded-xl">
                  <button onClick={() => setPhvStage('pre')} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${phvStage === 'pre' ? 'bg-white text-black' : 'text-slate-500'}`}>PRE-PHV</button>
                  <button onClick={() => setPhvStage('post')} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${phvStage === 'post' ? 'bg-emerald-500 text-black' : 'text-slate-500'}`}>POST-PHV</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select value={stroke} onChange={e=>setStroke(e.target.value as StrokeKey)} className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs font-bold outline-none">{Object.keys(STROKE_FACTORS).map(k=><option key={k} value={k} className="bg-slate-900">{STROKE_FACTORS[k as StrokeKey].name}</option>)}</select>
                  <select value={poolType} onChange={e=>setPoolType(e.target.value as PoolKey)} className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs font-bold outline-none"><option value="25" className="bg-slate-900">25M 短池</option><option value="50" className="bg-slate-900">50M 长池</option></select>
                </div>
              </div>
            </div>
          </aside>

          {/* Matrix Grid */}
          <section className="lg:col-span-8 overflow-hidden">
            <div className="glass rounded-3xl overflow-hidden">
              <div className="grid grid-cols-7 bg-white/5 px-4 py-3 text-[8px] font-black uppercase text-slate-500 border-b border-white/5">
                <div className="col-span-2">强度区域</div>
                {DISTANCES.map(d=><div key={d} className="text-center">{d}M</div>)}
                <div className="text-right pr-2">HR/10S</div>
              </div>
              <div className="divide-y divide-white/[0.03]">
                {(Object.keys(INTENSITY_CONFIG) as IntensityKey[]).map((id) => {
                  const cfg = INTENSITY_CONFIG[id];
                  return (
                    <div key={id} className="grid grid-cols-7 px-4 py-4 items-center group">
                      <div className="col-span-2 flex items-center gap-2.5">
                        <div className="w-1 h-8 rounded-full" style={{backgroundColor: cfg.color}}></div>
                        <div>
                          <div className="text-sm font-black text-white">{id}</div>
                          <div className="text-[7px] font-bold text-slate-600 uppercase leading-none">{cfg.label}</div>
                        </div>
                      </div>
                      {matrixData[id].map((cell: MatrixCell, i: number) => (
                        <div key={i} className="text-center">
                          {cell.isNA ? <span className="text-slate-800 text-[10px]">—</span> : (
                            <div className="flex flex-col items-center">
                              <span className="text-[13px] font-mono font-black text-emerald-400 leading-none">{formatTime(cell.val)}</span>
                              <span className="text-[7px] text-slate-600 font-bold mt-1 tracking-tighter opacity-70">
                                {formatTime(cell.min)}-{formatTime(cell.max)}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                      <div className="text-right pr-2">
                        <span className="text-base font-black text-rose-500">{Math.round(maxHR * cfg.hrPct / 6)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* 打印专用模板 - 完全独立且平时隐藏 */}
      <div className="hidden print-only bg-white text-black p-10 min-h-screen">
        <div className="border-b-4 border-black pb-4 mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black italic tracking-tighter">M-CDS PERFORMANCE MATRIX</h1>
            <p className="text-[10px] font-black uppercase text-gray-500">运动员: {name || "---"} | T-VAL: {tValue}s | CSS: {cssValue}s | {STROKE_FACTORS[stroke].name}</p>
          </div>
          <div className="text-right text-[10px] font-black uppercase" suppressHydrationWarning>日期: {new Date().toLocaleDateString()}</div>
        </div>
        <table className="w-full border-2 border-black">
          <thead className="bg-black text-white text-[10px] font-black uppercase">
            <tr><th className="py-2 pl-2 text-left">ZONE</th>{DISTANCES.map(d=><th key={d}>{d}M PACE</th>)}<th className="py-2 pr-2 text-right">HR/10S</th></tr>
          </thead>
          <tbody>
            {(Object.keys(INTENSITY_CONFIG) as IntensityKey[]).map((id) => (
              <tr key={id} className="border-b border-gray-200">
                <td className="py-3 pl-2 font-black">{id}</td>
                {matrixData[id].map((cell: MatrixCell, i: number) => (
                  <td key={i} className="text-center py-2">
                    {cell.isNA ? "—" : (
                      <div>
                        <div className="text-lg font-black font-mono leading-none">{formatTime(cell.val)}</div>
                        <div className="text-[8px] text-gray-400">{formatTime(cell.min)}-{formatTime(cell.max)}</div>
                        <div className="text-[7px] font-bold">RI:{cell.ri}</div>
                      </div>
                    )}
                  </td>
                ))}
                <td className="py-2 pr-2 text-right font-black text-lg text-red-600">{Math.round(maxHR * INTENSITY_CONFIG[id].hrPct / 6)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}