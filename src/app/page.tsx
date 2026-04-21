"use client";

import React, { useEffect, useMemo, useState } from "react";
import { 
  Printer, Save, Waves, Plus, Zap, Baby, 
  Share2, Eye, X, Calculator, User
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// --- 类型定义 ---
type PhvStage = "pre" | "post";
type Athlete = {
  id: string; name: string; age: number; phv_stage: PhvStage;
  t_value: number; css: number; height: number; weight: number;
  dps: number; share_token: string;
};

const DISTANCES = [25, 50, 100, 200, 400];

// --- 核心计算逻辑 (Golden Version) ---
const calculateMCDS = (t: number, css: number, stage: string, age: number) => {
  const getPace = (id: string) => {
    let b25 = 0;
    if (id === 'SP') b25 = t;
    else if (id === 'TSP') b25 = t + 0.8;
    else if (id === 'ANP') b25 = t + 2.5;
    else if (id === 'ANE') b25 = t * 1.18;
    else if (id === 'AES') b25 = (stage === 'pre' ? (css / 4 * 1.015) : (t * 1.28));
    else if (id === 'AEN') b25 = (stage === 'pre' ? (css / 4 * 1.055) : (t * 1.38));
    else if (id === 'BAE') b25 = (stage === 'pre' ? (css / 4 * 1.18) : (t * 1.55));
    return b25;
  };
  const maxHR = 220 - age;
  return ['SP', 'TSP', 'ANP', 'ANE', 'AES', 'AEN', 'BAE'].map(zone => ({
    zone,
    label: zone === 'SP' ? '绝对速度' : zone === 'TSP' ? '技术冲刺' : zone === 'ANP' ? '无氧功率' : zone === 'ANE' ? '无氧耐力' : zone === 'AES' ? '有氧动力' : zone === 'AEN' ? '有氧耐力' : '基础有氧',
    paces: DISTANCES.map(d => {
      const val = getPace(zone) * (d / 25);
      const min = (val * 0.98).toFixed(1);
      const max = (val * 1.02).toFixed(1);
      return { val: val.toFixed(1) + 's', range: `${min}~${max}` };
    }),
    hr: Math.round((maxHR * (zone === 'SP' ? 0.98 : zone.startsWith('A') ? 0.85 : 0.75)) / 6)
  }));
};

export default function Page() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Partial<Athlete>>>({});
  const [loading, setLoading] = useState(true);
  const [activeAthlete, setActiveAthlete] = useState<Athlete | null>(null);
  const [showStandaloneCalc, setShowStandaloneCalc] = useState(false);

  // --- 加载数据 ---
  const loadData = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("athletes").select("*").order("name");
    if (error) console.error(error);
    if (data) setAthletes(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- 潜力分析 ---
  const getGapAnalysis = (t: number, css: number) => {
    if (!t || !css) return { label: "--", color: "#4a5568", aabi: 0 };
    const aabi = (css / 4) / t;
    if (aabi < 1.15) return { label: "耐力缺口", color: "#f87171", aabi };
    if (aabi > 1.25) return { label: "速度缺口", color: "#fb923c", aabi };
    return { label: "平衡", color: "#34d399", aabi };
  };

  // --- 保存数据 ---
  const saveAthlete = async (id: string) => {
    const edit = drafts[id];
    if (!edit) return;
    const { error } = await supabase.from("athletes").update(edit).eq("id", id);
    if (!error) {
      await supabase.from("measurements").insert({ athlete_id: id, ...edit });
      await loadData();
      const newDrafts = { ...drafts };
      delete newDrafts[id];
      setDrafts(newDrafts);
      alert("同步成功！");
    }
  };

  // --- 新增运动员 ---
  const addAthlete = async () => {
    const name = prompt("请输入新运动员姓名:");
    if (!name) return;
    const { error } = await supabase.from("athletes").insert({ 
      name, age: 14, t_value: 15.0, css: 80.0, phv_stage: 'post', 
      share_token: Math.random().toString(36).substring(2) 
    });
    if (error) alert("新增失败: " + error.message);
    else loadData();
  };

  // --- 渲染页面 ---
  return (
    <div className="app-container">
      <style>{`
        .app-container { background: #05070a; color: #e2e8f0; min-height: 100vh; padding: 20px; font-family: sans-serif; }
        .glass { background: rgba(15, 20, 28, 0.9); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 24px; }
        .top-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .btn { padding: 10px 18px; border-radius: 12px; font-weight: 800; cursor: pointer; border: none; display: flex; align-items: center; gap: 8px; transition: 0.2s; }
        .btn-gold { background: #facc15; color: #000; }
        .btn-outline { background: none; border: 1px solid #2d3748; color: #718096; }
        .admin-table { width: 100%; border-collapse: collapse; min-width: 900px; margin-top: 15px; }
        .admin-table th { text-align: left; color: #4a5568; font-size: 10px; text-transform: uppercase; padding: 12px; }
        .admin-table td { padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.03); }
        .input-mini { background: #000; border: 1px solid #2d3748; color: #facc15; padding: 6px; border-radius: 6px; width: 55px; text-align: center; font-weight: bold; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; }
        .modal-content { width: 100%; max-width: 900px; max-height: 90vh; overflow-y: auto; position: relative; }
        .matrix-grid { width: 100%; overflow-x: auto; border-radius: 12px; background: #000; }
        .matrix-table { width: 100%; border-collapse: collapse; min-width: 600px; }
        .matrix-table th { padding: 12px; font-size: 10px; color: #444; }
        .matrix-table td { padding: 15px 10px; text-align: center; border-bottom: 1px solid #111; }
        .pace-box { font-family: monospace; font-size: 14px; color: #34d399; font-weight: bold; }
        .range-box { font-size: 9px; color: #4a5568; }
        @media print { .no-print { display: none; } .print-only { display: block; } }
      `}</style>

      <div className="no-print">
        {/* 顶部导航 */}
        <nav className="top-nav">
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <Waves color="#facc15" size={32} />
            <div>
              <h1 style={{margin: 0, fontSize: '22px', fontWeight: 900}}>M-CDS <span style={{color:'#facc15'}}>ELITE</span></h1>
              <span style={{fontSize: '10px', color: '#4a5568'}}>CLOUD MANAGEMENT V3.3</span>
            </div>
          </div>
          <div style={{display: 'flex', gap: '10px'}}>
            <button className="btn btn-outline" onClick={() => setShowStandaloneCalc(true)}><Calculator size={18}/> 实时计算</button>
            <button className="btn btn-gold" onClick={addAthlete}><Plus size={18}/> 新增运动员</button>
          </div>
        </nav>

        {/* 管理员大表格 */}
        <main className="glass">
          <div style={{overflowX: 'auto'}}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>姓名</th>
                  <th>年龄</th>
                  <th>T-Value</th>
                  <th>CSS</th>
                  <th>潜力分析</th>
                  <th>计算器</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {athletes.map(a => {
                  const draft = drafts[a.id] || {};
                  const t = draft.t_value ?? a.t_value;
                  const c = draft.css ?? a.css;
                  const analysis = getGapAnalysis(t, c);
                  return (
                    <tr key={a.id}>
                      <td style={{fontWeight: 'bold'}}>{a.name}</td>
                      <td><input className="input-mini" type="number" defaultValue={a.age} onChange={e=>setDrafts({...drafts, [a.id]: {...draft, age: parseInt(e.target.value)}})} /></td>
                      <td><input className="input-mini" type="number" step="0.1" defaultValue={a.t_value} onChange={e=>setDrafts({...drafts, [a.id]: {...draft, t_value: parseFloat(e.target.value)}})} /></td>
                      <td><input className="input-mini" type="number" step="0.1" defaultValue={a.css} onChange={e=>setDrafts({...drafts, [a.id]: {...draft, css: parseFloat(e.target.value)}})} /></td>
                      <td>
                        <span style={{color: analysis.color, fontSize: '11px', fontWeight: 'bold'}}>{analysis.label} ({analysis.aabi?.toFixed(2)})</span>
                      </td>
                      <td>
                        <button className="btn-outline" style={{padding: '5px 10px'}} onClick={() => setActiveAthlete(a)}><Eye size={16}/></button>
                      </td>
                      <td>
                        <div style={{display: 'flex', gap: '8px'}}>
                          <button className="btn-outline" onClick={() => saveAthlete(a.id)} disabled={!drafts[a.id]}><Save size={16} color={drafts[a.id] ? "#facc15" : "#333"}/></button>
                          <button className="btn-outline" onClick={() => window.open(`?token=${a.share_token}`)}><Share2 size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* 弹窗：运动员计算面板 */}
      {activeAthlete && (
        <div className="modal-overlay">
          <div className="modal-content glass">
            <button style={{position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: '#fff', cursor: 'pointer'}} onClick={() => setActiveAthlete(null)}><X size={24}/></button>
            <h2 style={{marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px'}}><User size={24}/> {activeAthlete.name} 训练矩阵</h2>
            <div className="matrix-grid">
              <table className="matrix-table">
                <thead>
                  <tr style={{background: '#111'}}>
                    <th>强度</th>{DISTANCES.map(d=><th key={d}>{d}M</th>)}<th>10S心率</th>
                  </tr>
                </thead>
                <tbody>
                  {calculateMCDS(activeAthlete.t_value, activeAthlete.css, activeAthlete.phv_stage, activeAthlete.age).map(row => (
                    <tr key={row.zone}>
                      <td style={{textAlign: 'left', fontWeight: 'bold'}}>{row.zone} <span style={{fontSize: '8px', color: '#4a5568'}}>{row.label}</span></td>
                      {row.paces.map((p, i) => (
                        <td key={i}>
                          <div className="pace-box">{p.val}</div>
                          <div className="range-box">{p.range}</div>
                        </td>
                      ))}
                      <td style={{color: '#f87171', fontWeight: 'bold'}}>{row.hr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="btn btn-gold" style={{marginTop: '20px', width: '100%', justifyContent: 'center'}} onClick={() => window.print()}><Printer size={18}/> 打印</button>
          </div>
        </div>
      )}

      {loading && <div style={{position: 'fixed', top: 20, right: 20, color: '#facc15', fontSize: '12px'}}>同步中...</div>}
    </div>
  );
}