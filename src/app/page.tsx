"use client";

import React, { useState, useMemo } from 'react';
import { 
  Waves, 
  Printer, 
  Plus, 
  Minus, 
  Zap, 
  Baby, 
  Settings2,
  ChevronRight,
  TrendingUp,
  Activity
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

// --- 核心配置 ---
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

// --- 工具函数 ---
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
          dist: d, 
          val: isValid ? target : null, 
          min: isValid ? target * (1 - ERROR_MARGIN) : null,
          max: isValid ? target * (1 + ERROR_MARGIN) : null,
          ri: cfg.getRI(d), 
          isNA: !isValid 
        };
      });
    });
    return results;
  }, [tValue, cssValue, poolType, phvStage, stroke]);

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-200 p-4 md:p-6 font-sans selection:bg-emerald-500/30">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=JetBrains+Mono:wght@700&display=swap');
        body { font-family: 'Inter', sans-serif; }
        .font-mono-elite { font-family: 'JetBrains Mono', monospace; }
        .glass-panel { background: rgba(15, 20, 28, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.08); }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-only { display: block !important; padding: 20mm; }
        }
      `}</style>

      <div className="no-print max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex justify-between items-center px-2">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <Waves className="text-black" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-[900] tracking-tight uppercase italic text-white flex items-center gap-2">
                M-CDS <span className="text-emerald-400">V3.3</span>
              </h1>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                <Activity size={10} className="text-emerald-500" /> Professional Lab Performance
              </div>
            </div>
          </div>
          <button 
            onClick={() => window.print()}
            className="px-5 py-2.5 bg-white text-black rounded-xl text-xs font-black flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          >
            <Printer size={14} /> 导出课表
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Dashboard Left: Inputs */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="glass-panel p-6 rounded-[2rem] space-y-8">
              {/* Profile Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-2">
                  <TrendingUp size={12} /> 运动员参数 / Baseline
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input 
                    value={name} onChange={e=>setName(e.target.value)}
                    placeholder="运动员姓名" 
                    className="col-span-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold focus:border-emerald-500/50 outline-none transition-all placeholder:text-slate-700"
                  />
                </div>
              </div>

              {/* T-Value & CSS Big Gauges */}
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-black/40 border border-white/5 rounded-2xl p-5 relative overflow-hidden group">
                  <div className="relative z-10 flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1">T-Value (25m Max)</p>
                      <span className="text-4xl font-mono-elite font-black text-white leading-none tracking-tighter">
                        {tValue.toFixed(1)}<span className="text-sm text-emerald-500 ml-1">s</span>
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={()=>setTValue(v=>Math.max(0,+(v-0.1).toFixed(1)))} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 active:scale-90 transition-all"><Minus size={16}/></button>
                      <button onClick={()=>setTValue(v=>+(v+0.1).toFixed(1))} className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-all"><Plus size={16}/></button>
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 p-2 opacity-5">
                    <Zap size={60} className="text-emerald-500" />
                  </div>
                </div>

                <div className="bg-black/40 border border-white/5 rounded-2xl p-5 relative overflow-hidden group">
                  <div className="relative z-10 flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1">CSS (100m Endurance)</p>
                      <span className="text-4xl font-mono-elite font-black text-white leading-none tracking-tighter">
                        {cssValue.toFixed(1)}<span className="text-sm text-blue-500 ml-1">s</span>
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={()=>setCssValue(v=>Math.max(0,+(v-0.5).toFixed(1)))} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-all"><Minus size={16}/></button>
                      <button onClick={()=>setCssValue(v=>+(v+0.5).toFixed(1))} className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all"><Plus size={16}/></button>
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 p-2 opacity-5">
                    <TrendingUp size={60} className="text-blue-500" />
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-4 pt-2">
                <div className="flex bg-black/60 p-1 rounded-xl">
                  <button onClick={() => setPhvStage('pre')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black transition-all ${phvStage === 'pre' ? 'bg-white text-black shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                    <Baby size={14} /> PRE-PHV
                  </button>
                  <button onClick={() => setPhvStage('post')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black transition-all ${phvStage === 'post' ? 'bg-emerald-500 text-black shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                    <Zap size={14} /> POST-PHV
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <select value={stroke} onChange={e=>setStroke(e.target.value as StrokeKey)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-xs font-bold outline-none cursor-pointer">
                    {(Object.keys(STROKE_FACTORS) as StrokeKey[]).map(k=><option key={k} value={k} className="bg-slate-900">{STROKE_FACTORS[k].name}</option>)}
                  </select>
                  <select value={poolType} onChange={e=>setPoolType(e.target.value as PoolKey)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-xs font-bold outline-none cursor-pointer">
                    <option value="25" className="bg-slate-900">短池 25M</option>
                    <option value="50" className="bg-slate-900">长池 50M</option>
                  </select>
                </div>
              </div>
            </div>
          </aside>

          {/* Dashboard Right: Matrix Grid */}
          <section className="lg:col-span-8 space-y-4">
            <div className="glass-panel rounded-[2rem] overflow-hidden">
              <div className="grid grid-cols-7 border-b border-white/5 bg-white/5 px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                <div className="col-span-2">强度区域 / Intensity</div>
                {DISTANCES.map(d=><div key={d} className="text-center">{d}M</div>)}
                <div className="text-right">心率参考</div>
              </div>
              <div className="divide-y divide-white/[0.03]">
                {(Object.keys(INTENSITY_CONFIG) as IntensityKey[]).map((id) => {
                  const cfg = INTENSITY_CONFIG[id];
                  return (
                    <div key={id} className="grid grid-cols-7 px-6 py-5 group hover:bg-white/[0.02] transition-all items-center">
                      <div className="col-span-2 flex items-center gap-4">
                        <div className="w-1.5 h-10 rounded-full shadow-lg" style={{backgroundColor: cfg.color, boxShadow: `0 0 12px ${cfg.color}55`}}></div>
                        <div>
                          <div className="text-lg font-black tracking-tight text-white">{cfg.name}</div>
                          <div className="text-[8px] font-bold text-slate-500 uppercase leading-none">{cfg.label}</div>
                        </div>
                      </div>
                      {matrixData[id].map((cell: MatrixCell, i: number) => (
                        <div key={i} className="text-center">
                          {cell.isNA ? <span className="text-slate-800 text-[10px] font-black">—</span> : (
                            <div className="flex flex-col items-center">
                              <span className="text-[15px] font-mono-elite font-black text-white group-hover:text-emerald-400 transition-colors tracking-tighter">
                                {formatTime(cell.val)}
                              </span>
                              <div className="text-[8px] text-slate-600 font-bold tracking-tighter bg-white/5 px-1 rounded mt-1 opacity-60">
                                {formatTime(cell.min)} - {formatTime(cell.max)}
                              </div>
                              <div className="text-[7px] text-slate-500 font-black mt-1 uppercase">RI:{cell.ri}</div>
                            </div>
                          )}
                        </div>
                      ))}
                      <div className="text-right flex flex-col">
                        <span className="text-xl font-mono-elite font-black text-rose-500 leading-none">
                          {Math.round(maxHR * cfg.hrPct / 6)}
                        </span>
                        <span className="text-[8px] font-bold text-slate-600 uppercase">次/10S</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* 打印模板 - 保持极致简约专业 */}
      <div className="hidden print-only print-container">
        <div className="flex justify-between items-center border-b-4 border-black pb-4 mb-8">
           <div>
              <h1 className="text-4xl font-black italic uppercase tracking-tighter">M-CDS PERFORMANCE MATRIX</h1>
              <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-widest">Protocol V3.3 // Athlete Data System</p>
           </div>
           <div className="text-right">
              <p className="text-sm font-black uppercase tracking-widest">日期: {new Date().toLocaleDateString()}</p>
           </div>
        </div>
        
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="border-l-4 border-black pl-4">
             <h2 className="text-[10px] font-black text-gray-400 uppercase">运动员信息 / Profile</h2>
             <p className="text-lg font-black uppercase mt-1">{name || "待输入"} / {age}岁 / {phvStage.toUpperCase()}-PHV</p>
          </div>
          <div className="border-l-4 border-black pl-4">
             <h2 className="text-[10px] font-black text-gray-400 uppercase">测试基底 / Baseline</h2>
             <p className="text-lg font-black uppercase mt-1">T-VAL: {tValue}s / CSS: {cssValue}s / {STROKE_FACTORS[stroke].name}</p>
          </div>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-black text-white text-[10px] font-black uppercase tracking-widest">
              <th className="py-3 px-4 text-left">Intensity Zone</th>
              {DISTANCES.map(d=><th key={d} className="py-3">{d}M PACE</th>)}
              <th className="py-3 px-4 text-right">HR/10S</th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(INTENSITY_CONFIG) as IntensityKey[]).map((id) => {
              const cfg = INTENSITY_CONFIG[id];
              return (
                <tr key={id} className="border-b-2 border-gray-100">
                  <td className="py-4 px-4 bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-8" style={{backgroundColor: cfg.color}}></div>
                      <div>
                        <div className="text-lg font-black leading-none">{id}</div>
                        <div className="text-[8px] font-bold text-gray-400 uppercase">{cfg.label}</div>
                      </div>
                    </div>
                  </td>
                  {matrixData[id].map((cell: MatrixCell, i: number) => (
                    <td key={i} className="py-4 text-center">
                      {cell.isNA ? "—" : (
                        <div>
                          <div className="text-xl font-black font-mono tracking-tighter">{formatTime(cell.val)}</div>
                          <div className="text-[9px] font-black text-gray-300 italic">{formatTime(cell.min)}-{formatTime(cell.max)}</div>
                          <div className="text-[7px] font-bold bg-gray-100 px-1 inline-block mt-1">RI:{cell.ri}</div>
                        </div>
                      )}
                    </td>
                  ))}
                  <td className="py-4 px-4 text-right bg-gray-50">
                     <div className="text-2xl font-black">{Math.round(maxHR * cfg.hrPct / 6)}</div>
                     <div className="text-[8px] font-bold text-gray-400 uppercase">BPM/10S</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-8 pt-6 border-t-2 border-gray-100 flex justify-between items-start">
           <div className="text-[9px] font-bold text-gray-400 space-y-1 uppercase leading-relaxed">
             <p>1. 动态间歇(RI)必须严格遵守，以维持生理刺激目标。</p>
             <p>2. ±2% 误差范围用于应对水温、生理状态及技术完成度的合理波动。</p>
             <p>3. 到边3秒内即刻测量10秒心率，反映能量系统的即时募集水平。</p>
           </div>
           <div className="text-right">
              <div className="w-32 h-16 border-2 border-dashed border-gray-200 rounded-xl mb-2 flex items-end justify-center pb-1 text-[8px] font-bold text-gray-300">签字确认 / SIGNATURE</div>
              <p className="text-[8px] font-black text-gray-200 uppercase">M-CDS PERFORMANCE LAB SYSTEM v3.3</p>
           </div>
        </div>
      </div>
    </div>
  );
}