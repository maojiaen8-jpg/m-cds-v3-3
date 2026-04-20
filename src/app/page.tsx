"use client";

import React, { useState, useMemo } from 'react';
import { 
  Waves, 
  Printer, 
  Plus, 
  Minus, 
  Zap, 
  Baby, 
  Settings2
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
  'Free': { name: '自由泳 (FR)', factor: 1.0, color: '#22c55e', maxDist: 400 },
  'Back': { name: '仰泳 (BK)', factor: 1.06, color: '#3b82f6', maxDist: 400 },
  'Fly': { name: '蝶泳 (FLY)', factor: 1.12, color: '#f43f5e', maxDist: 200 },
  'Breast': { name: '蛙泳 (BR)', factor: 1.18, color: '#eab308', maxDist: 200 }
};

const INTENSITY_CONFIG: Record<IntensityKey, { name: string; color: string; hrPct: number; allowedDists: number[]; getRI: (d: number) => string }> = {
  SP: { name: '绝对速度 (Sprint)', color: '#ef4444', hrPct: 0.98, allowedDists: [25, 50], getRI: (d) => d <= 25 ? '3min' : '5min' },
  TSP: { name: '技术冲刺 (Tech-Sprint)', color: '#f97316', hrPct: 0.95, allowedDists: [25, 50], getRI: (d) => d <= 25 ? '60s' : '90s' },
  ANP: { name: '无氧功率 (Anaerobic)', color: '#eab308', hrPct: 0.92, allowedDists: [25, 50], getRI: (d) => d <= 25 ? '45s' : '60s' },
  ANE: { name: '无氧耐力 (An-Endurance)', color: '#a855f7', hrPct: 0.88, allowedDists: [25, 50, 100, 200], getRI: (d) => d <= 50 ? '20s' : (d <= 100 ? '30s' : '45s') },
  AES: { name: '有氧动力 (Aerobic Power)', color: '#3b82f6', hrPct: 0.82, allowedDists: [25, 50, 100, 200, 400], getRI: (d) => d <= 100 ? '20s' : (d <= 200 ? '30s' : '40s') },
  AEN: { name: '有氧耐力 (Aerobic Endu)', color: '#10b981', hrPct: 0.75, allowedDists: [25, 50, 100, 200, 400], getRI: (d) => d <= 100 ? '15s' : (d <= 200 ? '20s' : '30s') },
  BAE: { name: '基础有氧 (Base Aerobic)', color: '#94a3b8', hrPct: 0.65, allowedDists: [25, 50, 100, 200, 400], getRI: (d) => d <= 100 ? '10s' : '15s' }
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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans antialiased">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { background: white !important; color: black !important; margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .print-container { padding: 15mm; height: 100vh; position: relative; overflow: hidden; }
          .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 150px; opacity: 0.03; font-weight: 900; z-index: -1; pointer-events: none; }
        }
      `}</style>

      {/* Web 交互界面 */}
      <div className="no-print max-w-6xl mx-auto space-y-8 pb-20">
        <header className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Waves className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none">M-CDS <span className="text-emerald-500">Elite</span></h1>
              <p className="text-[10px] font-bold text-slate-500 mt-1 tracking-widest uppercase">Professional Swimming Matrix V3.3</p>
            </div>
          </div>
          <button onClick={() => window.print()} className="group bg-white text-black px-6 py-3 rounded-xl font-black text-sm flex items-center gap-2 hover:bg-emerald-500 hover:text-white transition-all shadow-xl">
            导出训练课表
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 border border-white/10 p-6 rounded-[2rem] shadow-2xl space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                    <Settings2 size={12}/> 系统配置 / Setup
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2 bg-black/50 p-1.5 rounded-xl">
                  <button onClick={() => setPhvStage('pre')} className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black transition-all ${phvStage === 'pre' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}>
                    <Baby size={14} /> Pre-PHV
                  </button>
                  <button onClick={() => setPhvStage('post')} className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black transition-all ${phvStage === 'post' ? 'bg-amber-500 text-black shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}>
                    <Zap size={14} /> Post-PHV
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase px-1">运动员</label>
                    <input value={name} onChange={e=>setName(e.target.value)} placeholder="姓名" className="w-full bg-black/30 border border-white/5 rounded-xl p-3 text-sm font-bold focus:ring-1 ring-emerald-500 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase px-1">年龄</label>
                    <input type="number" value={age} onChange={e=>setAge(parseInt(e.target.value)||0)} className="w-full bg-black/30 border border-white/5 rounded-xl p-3 text-sm font-bold focus:ring-1 ring-emerald-500 outline-none" />
                  </div>
                </div>

                <div className="p-4 bg-black/30 rounded-2xl border border-white/5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase">T-Value (25m)</p>
                    <p className="text-xl font-mono font-black text-emerald-500">{tValue}s</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>setTValue(v=>Math.max(0,+(v-0.1).toFixed(1)))} className="w-8 h-8 flex items-center justify-center bg-white/5 rounded-lg hover:text-emerald-500"><Minus size={16}/></button>
                    <button onClick={()=>setTValue(v=>+(v+0.1).toFixed(1))} className="w-8 h-8 flex items-center justify-center bg-white/5 rounded-lg hover:text-emerald-500"><Plus size={16}/></button>
                  </div>
                </div>

                <div className="p-4 bg-black/30 rounded-2xl border border-white/5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase">CSS (100m)</p>
                    <p className="text-xl font-mono font-black text-emerald-500">{cssValue}s</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>setCssValue(v=>Math.max(0,+(v-0.5).toFixed(1)))} className="w-8 h-8 flex items-center justify-center bg-white/5 rounded-lg hover:text-emerald-500"><Minus size={16}/></button>
                    <button onClick={()=>setCssValue(v=>+(v+0.5).toFixed(1))} className="w-8 h-8 flex items-center justify-center bg-white/5 rounded-lg hover:text-emerald-500"><Plus size={16}/></button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <select value={stroke} onChange={e=>setStroke(e.target.value as StrokeKey)} className="bg-black/50 border border-white/5 rounded-xl p-3 text-xs font-bold outline-none">
                  {(Object.keys(STROKE_FACTORS) as StrokeKey[]).map(k=><option key={k} value={k}>{STROKE_FACTORS[k].name}</option>)}
                </select>
                <select value={poolType} onChange={e=>setPoolType(e.target.value as PoolKey)} className="bg-black/50 border border-white/5 rounded-xl p-3 text-xs font-bold outline-none">
                  <option value="25">25M 短池</option>
                  <option value="50">50M 长池</option>
                </select>
              </div>
            </div>
          </aside>

          <section className="lg:col-span-8 bg-slate-900 border border-white/10 rounded-[2rem] p-6 overflow-x-auto shadow-2xl">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/10">
                  <th className="pb-4 text-left pl-4">强度 / Zone</th>
                  {DISTANCES.map(d=><th key={d} className="pb-4">{d}M</th>)}
                  <th className="pb-4 text-right pr-4">10S 心率</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(Object.keys(INTENSITY_CONFIG) as IntensityKey[]).map((id) => {
                  const cfg = INTENSITY_CONFIG[id];
                  return (
                    <tr key={id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 pl-4">
                        <div className="flex items-center gap-3">
                          <div className="w-1 h-8 rounded-full" style={{backgroundColor: cfg.color}}></div>
                          <div>
                            <div className="text-base font-black tracking-tighter">{id}</div>
                            <div className="text-[7px] text-slate-600 font-bold uppercase leading-none">{cfg.name}</div>
                          </div>
                        </div>
                      </td>
                      {matrixData[id].map((cell: MatrixCell, i: number) => (
                        <td key={i} className="py-4 text-center">
                          {cell.isNA ? <span className="text-slate-800 text-xs font-bold">—</span> : (
                            <div className="space-y-0.5">
                              <div className="text-sm font-mono font-black text-emerald-400">{formatTime(cell.val)}</div>
                              <div className="text-[9px] text-slate-600 font-medium tracking-tighter italic">
                                {formatTime(cell.min)}~{formatTime(cell.max)}
                              </div>
                              <div className="text-[7px] text-slate-500 font-bold">RI:{cell.ri}</div>
                            </div>
                          )}
                        </td>
                      ))}
                      <td className="py-4 text-right pr-4">
                        <div className="text-base font-black text-red-500/80">{(maxHR * cfg.hrPct / 6).toFixed(1)}</div>
                        <div className="text-[7px] text-slate-600 font-bold uppercase">BPM/10S</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </div>
      </div>

      {/* 打印模板 */}
      <div className="hidden print-only print-container">
        <div className="watermark uppercase text-gray-100">M-CDS ELITE</div>
        <div className="flex justify-between items-start border-b-4 border-black pb-4 mb-6">
          <div>
            <h1 className="text-3xl font-black italic tracking-tighter">M-CDS PERFORMANCE MATRIX</h1>
            <div className="flex gap-4 mt-2">
              <p className="text-[10px] font-black uppercase">姓名: {name || "————"} | 年龄: {age} | PHV: {phvStage.toUpperCase()}</p>
              <p className="text-[10px] font-black uppercase" suppressHydrationWarning>
                T-Val: {tValue}s | CSS: {cssValue}s | {STROKE_FACTORS[stroke].name}
              </p>
            </div>
          </div>
          <div className="text-right">
             <p className="text-[10px] font-black uppercase" suppressHydrationWarning>日期: {new Date().toLocaleDateString()}</p>
             <p className="text-[10px] font-black uppercase">{poolType}M Pool</p>
          </div>
        </div>

        <table className="w-full border-2 border-black mb-6">
          <thead>
            <tr className="bg-black text-white text-[10px] font-black uppercase">
              <th className="py-2 pl-2 text-left">Zone</th>
              {DISTANCES.map(d=><th key={d} className="py-2">{d}M PACE</th>)}
              <th className="py-2 text-right pr-2">HR/10S</th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(INTENSITY_CONFIG) as IntensityKey[]).map((id) => {
              const cfg = INTENSITY_CONFIG[id];
              return (
                <tr key={id} className="border-b border-gray-200">
                  <td className="py-2 pl-2 font-black text-sm">{id}</td>
                  {matrixData[id].map((cell: MatrixCell, i: number) => (
                    <td key={i} className="py-2 text-center">
                      {cell.isNA ? "—" : (
                        <div>
                          <div className="text-base font-black font-mono">{formatTime(cell.val)}</div>
                          <div className="text-[8px] text-gray-500 font-bold italic">{formatTime(cell.min)}-{formatTime(cell.max)}</div>
                          <div className="text-[7px] font-bold">RI:{cell.ri}</div>
                        </div>
                      )}
                    </td>
                  ))}
                  <td className="py-2 text-right pr-2 font-black text-sm text-red-600">
                     {(maxHR * cfg.hrPct / 6).toFixed(1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}