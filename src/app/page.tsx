"use client";

import React, { useState, useMemo } from 'react';
import { Waves, Printer, Plus, Minus, Zap, Baby, Activity, User } from 'lucide-react';

// --- 类型与配置 (保持你的核心逻辑) ---
type StrokeKey = 'Free' | 'Back' | 'Fly' | 'Breast';
type PoolKey = '25' | '50';
type IntensityKey = 'SP' | 'TSP' | 'ANP' | 'ANE' | 'AES' | 'AEN' | 'BAE';

const DISTANCES = [25, 50, 100, 200, 400];
const POOL_FACTORS = { '25': 1.0, '50': 1.035 };
const ERROR_MARGIN = 0.02;

const STROKE_FACTORS = {
  'Free': { name: '自由泳 (FR)', factor: 1.0, color: '#10b981', maxDist: 400 },
  'Back': { name: '仰泳 (BK)', factor: 1.06, color: '#3b82f6', maxDist: 400 },
  'Fly': { name: '蝶泳 (FLY)', factor: 1.12, color: '#ec4899', maxDist: 200 },
  'Breast': { name: '蛙泳 (BR)', factor: 1.18, color: '#f59e0b', maxDist: 200 }
};

const INTENSITY_CONFIG = {
  SP: { name: 'SP', label: '绝对速度', color: '#ff4d4f', hrPct: 0.98, allowedDists: [25, 50] },
  TSP: { name: 'TSP', label: '技术冲刺', color: '#ff7a45', hrPct: 0.95, allowedDists: [25, 50] },
  ANP: { name: 'ANP', label: '无氧功率', color: '#ffc53d', hrPct: 0.92, allowedDists: [25, 50] },
  ANE: { name: 'ANE', label: '无氧耐力', color: '#b37feb', hrPct: 0.88, allowedDists: [25, 50, 100, 200] },
  AES: { name: 'AES', label: '有氧动力', color: '#40a9ff', hrPct: 0.82, allowedDists: [25, 50, 100, 200, 400] },
  AEN: { name: 'AEN', label: '有氧耐力', color: '#73d13d', hrPct: 0.75, allowedDists: [25, 50, 100, 200, 400] },
  BAE: { name: 'BAE', label: '基础有氧', color: '#8c8c8c', hrPct: 0.65, allowedDists: [25, 50, 100, 200, 400] }
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
    const results: any = {};
    const strokeInfo = STROKE_FACTORS[stroke];
    Object.keys(INTENSITY_CONFIG).forEach((id) => {
      const cfg = (INTENSITY_CONFIG as any)[id];
      const pace25 = calculatePace(id, tValue, cssValue, (POOL_FACTORS as any)[poolType], phvStage, strokeInfo.factor);
      results[id] = DISTANCES.map(d => {
        const isValid = cfg.allowedDists.includes(d) && d <= strokeInfo.maxDist;
        const target = pace25 * (d / 25);
        return { 
          dist: d, val: isValid ? target : null, 
          min: isValid ? target * (1 - ERROR_MARGIN) : null,
          max: isValid ? target * (1 + ERROR_MARGIN) : null,
          isNA: !isValid 
        };
      });
    });
    return results;
  }, [tValue, cssValue, poolType, phvStage, stroke]);

  return (
    <div className="mcds-container">
      <style>{`
        .mcds-container { background: #0a0c10; color: #e2e8f0; min-height: 100vh; padding: 20px; font-family: sans-serif; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .card { background: #141923; border: 1px solid #2d3748; border-radius: 16px; padding: 20px; margin-bottom: 20px; }
        .grid-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
        .input-box { background: #000; padding: 12px; border-radius: 12px; border: 1px solid #333; }
        .label { font-size: 10px; color: #718096; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; }
        .big-number { font-size: 28px; font-weight: 900; color: #fff; }
        .btn-group { display: flex; gap: 8px; }
        .btn { background: #2d3748; border: none; color: white; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: bold; }
        .btn-active { background: #10b981; color: black; }
        
        /* 强制水平表格 */
        .table-container { overflow-x: auto; background: #141923; border-radius: 16px; border: 1px solid #2d3748; }
        table { width: 100%; border-collapse: collapse; min-width: 600px; }
        th { background: #1a202c; color: #718096; font-size: 10px; padding: 12px; text-align: center; text-transform: uppercase; }
        td { padding: 16px 8px; border-bottom: 1px solid #1a202c; text-align: center; }
        .zone-name { display: flex; align-items: center; gap: 8px; text-align: left; }
        .color-bar { width: 4px; height: 24px; border-radius: 2px; }
        .pace-main { font-size: 16px; font-weight: bold; color: #10b981; display: block; }
        .pace-range { font-size: 9px; color: #4a5568; display: block; }
        .hr-val { font-size: 18px; font-weight: bold; color: #f56565; }

        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; color: black !important; background: white !important; }
        }
        .print-only { display: none; }
      `}</style>

      <div className="no-print">
        <header className="header">
          <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
            <Waves color="#10b981" size={24} />
            <h1 style={{fontSize: '20px', fontWeight: '900', margin: 0}}>M-CDS <span style={{color: '#10b981'}}>ELITE</span></h1>
          </div>
          <button className="btn" onClick={() => window.print()}>打印</button>
        </header>

        <div className="grid-inputs">
          <div className="input-box">
            <div className="label">运动员</div>
            <input value={name} onChange={e=>setName(e.target.value)} style={{background: 'none', border: 'none', color: 'white', fontWeight: 'bold', width: '100%'}} placeholder="姓名" />
          </div>
          <div className="input-box">
            <div className="label">年龄</div>
            <input type="number" value={age} onChange={e=>setAge(parseInt(e.target.value)||0)} style={{background: 'none', border: 'none', color: 'white', fontWeight: 'bold', width: '100%'}} />
          </div>
        </div>

        <div className="card" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div>
            <div className="label" style={{color: '#10b981'}}>T-Value (25m Max)</div>
            <div className="big-number">{tValue}s</div>
          </div>
          <div className="btn-group">
            <button className="btn" onClick={()=>setTValue(v=>Math.max(0,+(v-0.1).toFixed(1)))}>-</button>
            <button className="btn" style={{background: '#10b981', color: 'black'}} onClick={()=>setTValue(v=>+(v+0.1).toFixed(1))}>+</button>
          </div>
        </div>

        <div className="card" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div>
            <div className="label" style={{color: '#3b82f6'}}>CSS (100m Endurance)</div>
            <div className="big-number">{cssValue}s</div>
          </div>
          <div className="btn-group">
            <button className="btn" onClick={()=>setCssValue(v=>Math.max(0,+(v-0.5).toFixed(1)))}>-</button>
            <button className="btn" style={{background: '#3b82f6'}} onClick={()=>setCssValue(v=>+(v+0.5).toFixed(1))}>+</button>
          </div>
        </div>

        <div className="btn-group" style={{marginBottom: '20px'}}>
          <button className={`btn ${phvStage === 'pre' ? 'btn-active' : ''}`} style={{flex: 1}} onClick={()=>setPhvStage('pre')}>PRE-PHV</button>
          <button className={`btn ${phvStage === 'post' ? 'btn-active' : ''}`} style={{flex: 1}} onClick={()=>setPhvStage('post')}>POST-PHV</button>
        </div>

        <div className="grid-inputs">
          <select value={stroke} onChange={e=>setStroke(e.target.value as any)} className="btn" style={{width: '100%', textAlign: 'left'}}>
            {Object.keys(STROKE_FACTORS).map(k=><option key={k} value={k}>{(STROKE_FACTORS as any)[k].name}</option>)}
          </select>
          <select value={poolType} onChange={e=>setPoolType(e.target.value as any)} className="btn" style={{width: '100%', textAlign: 'left'}}>
            <option value="25">25M 短池</option>
            <option value="50">50M 长池</option>
          </select>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{textAlign: 'left'}}>强度区域</th>
                {DISTANCES.map(d=><th key={d}>{d}M</th>)}
                <th>HR/10S</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(INTENSITY_CONFIG).map(([id, cfg]: any) => (
                <tr key={id}>
                  <td>
                    <div className="zone-name">
                      <div className="color-bar" style={{background: cfg.color}}></div>
                      <div style={{fontWeight: 'bold'}}>{id}</div>
                    </div>
                  </td>
                  {matrixData[id].map((cell: any, i: number) => (
                    <td key={i}>
                      {cell.isNA ? '--' : (
                        <>
                          <span className="pace-main">{formatTime(cell.val)}</span>
                          <span className="pace-range">{formatTime(cell.min)}-{formatTime(cell.max)}</span>
                        </>
                      )}
                    </td>
                  ))}
                  <td>
                    <div className="hr-val">{Math.round(maxHR * cfg.hrPct / 6)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="print-only">
        <h1>M-CDS PERFORMANCE MATRIX</h1>
        <p>运动员: {name} | 基准: T-{tValue}s / CSS-{cssValue}s</p>
        <hr />
        {/* 这里可以放打印专用的简化表格 */}
      </div>
    </div>
  );
}