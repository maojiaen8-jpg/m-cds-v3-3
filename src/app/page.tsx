"use client";

import React, { useEffect, useMemo, useState } from "react";
import { 
  Printer, Save, ShieldCheck, Waves, Plus, UserPlus, 
  TrendingUp, Activity, Zap, Baby, LayoutDashboard, Share2 
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

// --- 核心配置 (用于 PDF 和计算) ---
const DISTANCES = [25, 50, 100, 200, 400];
const STROKE_FACTOR = 1.0; // 默认自由泳

const calculateMCDS = (athlete: Athlete) => {
  const t = athlete.t_value;
  const css = athlete.css;
  const stage = athlete.phv_stage;
  
  const getPace = (id: string) => {
    let base25 = 0;
    if (id === 'SP') base25 = t;
    else if (id === 'TSP') base25 = t + 0.8;
    else if (id === 'ANP') base25 = t + 2.5;
    else if (id === 'ANE') base25 = t * 1.18;
    else if (id === 'AES') base25 = (stage === 'pre' ? (css / 4 * 1.015) : (t * 1.28));
    else if (id === 'AEN') base25 = (stage === 'pre' ? (css / 4 * 1.055) : (t * 1.38));
    else if (id === 'BAE') base25 = (stage === 'pre' ? (css / 4 * 1.18) : (t * 1.55));
    return base25;
  };

  return ['SP', 'TSP', 'ANP', 'ANE', 'AES', 'AEN', 'BAE'].map(zone => ({
    zone,
    paces: DISTANCES.map(d => (getPace(zone) * (d / 25)).toFixed(1) + 's'),
    hr: Math.round(((220 - athlete.age) * (zone === 'SP' ? 0.98 : 0.85)) / 6)
  }));
};

export default function Page() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Partial<Athlete>>>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'coach' | 'parent'>('coach');
  const [activeToken, setActiveToken] = useState("");

  // --- 加载数据 ---
  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase.from("athletes").select("*").order("created_at");
    if (data) setAthletes(data);
    setLoading(false);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      setActiveToken(token);
      setView('parent');
    }
    loadData();
  }, []);

  // --- 潜力值分析核心逻辑 ---
  const getGapAnalysis = (t: number, css: number) => {
    if (!t || !css) return { label: "--", color: "#666" };
    const aabi = (css / 4) / t;
    if (aabi < 1.15) return { label: "耐力缺口", color: "#ff4d4f", aabi };
    if (aabi > 1.25) return { label: "速度缺口", color: "#ffa940", aabi };
    return { label: "平衡", color: "#52c41a", aabi };
  };

  // --- 批量保存 ---
  const saveAthlete = async (id: string) => {
    const edit = drafts[id];
    if (!edit) return;
    const { error } = await supabase.from("athletes").update(edit).eq("id", id);
    if (!error) {
      await supabase.from("measurements").insert({
        athlete_id: id, ...edit
      });
      loadData();
      const newDrafts = { ...drafts };
      delete newDrafts[id];
      setDrafts(newDrafts);
    }
  };

  // --- 新增运动员 ---
  const addAthlete = async () => {
    const name = prompt("请输入运动员姓名:");
    if (!name) return;
    await supabase.from("athletes").insert({ name, t_value: 15, css: 80, age: 12 });
    loadData();
  };

  // --- 核心功能：批量生成多页 PDF ---
  const generateBatchPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    athletes.forEach((athlete, index) => {
      if (index !== 0) doc.addPage();
      
      // 页眉
      doc.setFontSize(20);
      doc.setTextColor(0, 0, 0);
      doc.text("M-CDS PERFORMANCE REPORT", 14, 20);
      
      doc.setFontSize(10);
      doc.text(`ATHLETE: ${athlete.name} | AGE: ${athlete.age} | T-VAL: ${athlete.t_value}s | CSS: ${athlete.css}s`, 14, 28);
      
      const matrix = calculateMCDS(athlete);
      autoTable(doc, {
        startY: 35,
        head: [['ZONE', '25M', '50M', '100M', '200M', '400M', 'HR/10S']],
        body: matrix.map(row => [row.zone, ...row.paces, row.hr]),
        theme: 'striped',
        headStyles: { fillStyle: 'DF', fillColor: [0, 0, 0] }
      });
    });
    doc.save(`M-CDS_Batch_Report_${new Date().toLocaleDateString()}.pdf`);
  };

  const currentAthlete = athletes.find(a => a.share_token === activeToken);

  return (
    <div className="system-container">
      <style>{`
        .system-container { background: #05070a; color: #e2e8f0; min-height: 100vh; font-family: 'Inter', sans-serif; }
        .glass-card { background: rgba(15, 20, 28, 0.8); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; }
        .neon-text { color: #10b981; text-shadow: 0 0 10px rgba(16,185,129,0.3); }
        .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .data-table th { background: #0d1117; color: #718096; padding: 12px; text-align: left; font-size: 10px; text-transform: uppercase; }
        .data-table td { padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.03); }
        .input-dark { background: #000; border: 1px solid #2d3748; color: #10b981; padding: 5px; border-radius: 6px; width: 60px; font-weight: bold; text-align: center; }
        .badge { padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold; }
        .btn-primary { background: #10b981; color: #000; font-weight: 800; padding: 8px 16px; border-radius: 12px; display: flex; align-items: center; gap: 8px; }
      `}</style>

      {view === 'coach' ? (
        <div className="p-6 space-y-6">
          <header className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Waves className="neon-text" size={32} />
              <h1 className="text-2xl font-black italic uppercase tracking-tighter">M-CDS <span className="neon-text">Cloud Coach</span></h1>
            </div>
            <div className="flex gap-3">
              <button onClick={addAthlete} className="btn-primary" style={{background: '#3b82f6'}}><UserPlus size={18}/>新增运动员</button>
              <button onClick={generateBatchPDF} className="btn-primary"><Printer size={18}/>批量生成 PDF</button>
            </div>
          </header>

          <div className="glass-card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>姓名</th>
                  <th>年龄</th>
                  <th>PHV</th>
                  <th>T-Value</th>
                  <th>CSS</th>
                  <th>身高</th>
                  <th>体重</th>
                  <th>DPS</th>
                  <th>潜力分析 (AABI)</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {athletes.map(athlete => {
                  const draft = drafts[athlete.id] || {};
                  const analysis = getGapAnalysis(draft.t_value || athlete.t_value, draft.css || athlete.css);
                  return (
                    <tr key={athlete.id} className="hover:bg-white/[0.02]">
                      <td className="font-bold">{athlete.name}</td>
                      <td><input className="input-dark" type="number" defaultValue={athlete.age} onChange={e => setDrafts({...drafts, [athlete.id]: {...draft, age: parseInt(e.target.value)}})} /></td>
                      <td>
                        <select className="input-dark" style={{width: '80px'}} defaultValue={athlete.phv_stage} onChange={e => setDrafts({...drafts, [athlete.id]: {...draft, phv_stage: e.target.value as any}})}>
                          <option value="pre">Pre</option>
                          <option value="post">Post</option>
                        </select>
                      </td>
                      <td><input className="input-dark" type="number" step="0.1" defaultValue={athlete.t_value} onChange={e => setDrafts({...drafts, [athlete.id]: {...draft, t_value: parseFloat(e.target.value)}})} /></td>
                      <td><input className="input-dark" type="number" step="0.1" defaultValue={athlete.css} onChange={e => setDrafts({...drafts, [athlete.id]: {...draft, css: parseFloat(e.target.value)}})} /></td>
                      <td><input className="input-dark" type="number" defaultValue={athlete.height} /></td>
                      <td><input className="input-dark" type="number" defaultValue={athlete.weight} /></td>
                      <td><input className="input-dark" type="number" step="0.01" defaultValue={athlete.dps} /></td>
                      <td>
                        <div className="flex flex-col gap-1">
                          <span className="badge" style={{background: analysis.color + '22', color: analysis.color}}>{analysis.label}</span>
                          <span className="text-[10px] text-slate-500 font-mono">AABI: {analysis.aabi?.toFixed(2)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button onClick={() => saveAthlete(athlete.id)} className="p-2 hover:text-emerald-400" title="同步云端"><Save size={18}/></button>
                          <button onClick={() => window.open(`?token=${athlete.share_token}`)} className="p-2 hover:text-blue-400" title="分享链接"><Share2 size={18}/></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-6 max-w-lg mx-auto space-y-6">
          <header className="flex items-center gap-3 border-b border-white/10 pb-4">
             <ShieldCheck className="text-emerald-500" />
             <h2 className="text-lg font-bold">运动员家长端看板</h2>
          </header>
          {currentAthlete ? (
            <div className="space-y-4">
              <div className="glass-card p-6 text-center">
                <p className="text-slate-500 text-xs uppercase tracking-widest mb-1">运动员姓名</p>
                <h3 className="text-3xl font-black text-white">{currentAthlete.name}</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card p-4 text-center">
                   <p className="text-[10px] text-slate-500 uppercase">T-Value</p>
                   <p className="text-2xl font-bold text-emerald-400">{currentAthlete.t_value}s</p>
                </div>
                <div className="glass-card p-4 text-center">
                   <p className="text-[10px] text-slate-500 uppercase">CSS</p>
                   <p className="text-2xl font-bold text-blue-400">{currentAthlete.css}s</p>
                </div>
              </div>
              {/* 这里可以继续复用你之前的黑色配速矩阵显示组件 */}
              <div className="text-xs text-slate-500 text-center italic">
                数据更新时间: {new Date().toLocaleDateString()}
              </div>
            </div>
          ) : <p>加载中...</p>}
        </div>
      )}
    </div>
  );
}