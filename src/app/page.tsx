"use client";

import React, { useEffect, useMemo, useState } from "react";
import { 
  Printer, Save, ShieldCheck, Waves, Plus, UserPlus, 
  TrendingUp, Activity, Zap, Baby, LayoutDashboard, Share2, Search
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

// --- 核心计算 (用于 PDF) ---
const calculateMCDS = (athlete: Athlete) => {
  const t = athlete.t_value;
  const css = athlete.css;
  const stage = athlete.phv_stage;
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
  return ['SP', 'TSP', 'ANP', 'ANE', 'AES', 'AEN', 'BAE'].map(zone => ({
    zone, paces: DISTANCES.map(d => (getPace(zone) * (d / 25)).toFixed(1) + 's'),
    hr: Math.round(((220 - athlete.age) * (zone === 'SP' ? 0.98 : 0.85)) / 6)
  }));
};

export default function Page() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Partial<Athlete>>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase.from("athletes").select("*").order("name");
    if (data) setAthletes(data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const getGapAnalysis = (t: number, css: number) => {
    if (!t || !css) return { label: "--", color: "#4a5568", aabi: 0 };
    const aabi = (css / 4) / t;
    if (aabi < 1.15) return { label: "耐力缺口", color: "#f87171", aabi };
    if (aabi > 1.25) return { label: "速度缺口", color: "#fb923c", aabi };
    return { label: "平衡", color: "#34d399", aabi };
  };

  const saveAthlete = async (id: string) => {
    const edit = drafts[id];
    if (!edit) return;
    setSavingId(id);
    const { error } = await supabase.from("athletes").update(edit).eq("id", id);
    if (!error) {
      await supabase.from("measurements").insert({ athlete_id: id, ...edit });
      await loadData();
      const newDrafts = { ...drafts };
      delete newDrafts[id];
      setDrafts(newDrafts);
    }
    setSavingId(null);
  };

  const addAthlete = async () => {
    const name = prompt("请输入新运动员姓名:");
    if (!name) return;
    await supabase.from("athletes").insert({ 
      name, age: 14, t_value: 15, css: 80, phv_stage: 'post', share_token: crypto.randomUUID() 
    });
    loadData();
  };

  const generateBatchPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    athletes.forEach((athlete, index) => {
      if (index !== 0) doc.addPage();
      doc.setFontSize(22); doc.text("M-CDS PERFORMANCE REPORT", 14, 20);
      doc.setFontSize(10); doc.text(`NAME: ${athlete.name} | T-VAL: ${athlete.t_value}s | CSS: ${athlete.css}s`, 14, 28);
      autoTable(doc, {
        startY: 35,
        head: [['ZONE', '25M', '50M', '100M', '200M', '400M', 'HR/10S']],
        body: calculateMCDS(athlete).map(r => [r.zone, ...r.paces, r.hr]),
        theme: 'striped', headStyles: { fillColor: [0, 0, 0] }
      });
    });
    doc.save(`M-CDS_Coach_Export.pdf`);
  };

  return (
    <div className="coach-dashboard">
      <style>{`
        .coach-dashboard { background: #080a0f; color: #e2e8f0; min-height: 100vh; padding: 20px; font-family: 'Inter', sans-serif; }
        .top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .logo-box { display: flex; align-items: center; gap: 12px; }
        .main-card { background: rgba(17, 25, 40, 0.75); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 24px; }
        .table-container { overflow-x: auto; margin-top: 20px; border-radius: 12px; }
        .admin-table { width: 100%; border-collapse: collapse; min-width: 1000px; }
        .admin-table th { text-align: left; padding: 16px; color: #718096; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #1a202c; }
        .admin-table td { padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.05); vertical-align: middle; }
        .admin-table tr:hover { background: rgba(255,255,255,0.02); }
        .input-minimal { background: #000; border: 1px solid #2d3748; color: #facc15; padding: 8px; border-radius: 8px; width: 65px; font-weight: bold; text-align: center; outline: none; }
        .input-minimal:focus { border-color: #facc15; box-shadow: 0 0 10px rgba(250,204,21,0.2); }
        .name-cell { font-weight: 800; color: #fff; font-size: 15px; }
        .badge-gap { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 900; }
        .btn-action { padding: 10px 20px; border-radius: 12px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 8px; border: none; transition: 0.2s; }
        .btn-blue { background: #3b82f6; color: white; }
        .btn-gold { background: #facc15; color: black; }
        .btn-save { background: none; color: #10b981; border: 1px solid #10b981; padding: 5px 10px; border-radius: 6px; }
        .btn-save:disabled { opacity: 0.3; }
        .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-item { background: #111827; padding: 20px; border-radius: 20px; border: 1px solid #1f2937; }
        .stat-label { color: #6b7280; font-size: 12px; font-weight: bold; text-transform: uppercase; }
        .stat-value { font-size: 24px; font-weight: 900; color: #fff; margin-top: 5px; }
      `}</style>

      <header className="top-bar">
        <div className="logo-box">
          <div style={{background: '#facc15', padding: '10px', borderRadius: '14px'}}>
            <Waves color="black" size={28} />
          </div>
          <div>
            <h1 style={{margin: 0, fontSize: '24px', fontWeight: 900, italic: 'italic'}}>M-CDS <span style={{color: '#facc15'}}>CLOUD</span></h1>
            <p style={{margin: 0, fontSize: '10px', color: '#4a5568', fontWeight: 'bold'}}>Elite Athlete Management System</p>
          </div>
        </div>
        <div style={{display: 'flex', gap: '12px'}}>
          <button className="btn-action btn-blue" onClick={addAthlete}><Plus size={18}/> 新增运动员</button>
          <button className="btn-action btn-gold" onClick={generateBatchPDF}><Printer size={18}/> 批量生成 PDF</button>
        </div>
      </header>

      <div className="stat-grid">
        <div className="stat-item">
          <div className="stat-label">全队运动员</div>
          <div className="stat-value">{athletes.length} <span style={{fontSize: '14px', color: '#4a5568'}}>PERSONS</span></div>
        </div>
        <div className="stat-item">
          <div className="stat-label">最新同步时间</div>
          <div className="stat-value" style={{fontSize: '18px'}}>{new Date().toLocaleTimeString()}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">系统状态</div>
          <div className="stat-value" style={{fontSize: '18px', color: '#10b981'}}>● ENCRYPTED</div>
        </div>
      </div>

      <main className="main-card">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h2 style={{margin: 0, fontSize: '18px'}}>全队动态数据监控表</h2>
          <div style={{fontSize: '12px', color: '#4a5568'}}>提示：修改数据后请点击右侧保存按钮同步云端</div>
        </div>

        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>姓名</th>
                <th>年龄</th>
                <th>PHV</th>
                <th>T-Value(25m)</th>
                <th>CSS(100m)</th>
                <th>身高(cm)</th>
                <th>体重(kg)</th>
                <th>DPS</th>
                <th>潜力分析 (AABI)</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {athletes.map(athlete => {
                const draft = drafts[athlete.id] || {};
                const currentT = draft.t_value ?? athlete.t_value;
                const currentCSS = draft.css ?? athlete.css;
                const analysis = getGapAnalysis(currentT, currentCSS);
                const hasChanges = Object.keys(draft).length > 0;

                return (
                  <tr key={athlete.id}>
                    <td className="name-cell">{athlete.name}</td>
                    <td>
                      <input className="input-minimal" type="number" defaultValue={athlete.age} 
                        onChange={e => setDrafts({...drafts, [athlete.id]: {...draft, age: parseInt(e.target.value)}})} />
                    </td>
                    <td>
                      <select className="input-minimal" style={{width: '85px'}} defaultValue={athlete.phv_stage}
                        onChange={e => setDrafts({...drafts, [athlete.id]: {...draft, phv_stage: e.target.value as any}})}>
                        <option value="pre">Pre-PHV</option>
                        <option value="post">Post-PHV</option>
                      </select>
                    </td>
                    <td>
                      <input className="input-minimal" type="number" step="0.1" defaultValue={athlete.t_value}
                        onChange={e => setDrafts({...drafts, [athlete.id]: {...draft, t_value: parseFloat(e.target.value)}})} />
                    </td>
                    <td>
                      <input className="input-minimal" type="number" step="0.1" defaultValue={athlete.css}
                        onChange={e => setDrafts({...drafts, [athlete.id]: {...draft, css: parseFloat(e.target.value)}})} />
                    </td>
                    <td>
                      <input className="input-minimal" type="number" defaultValue={athlete.height} 
                        onChange={e => setDrafts({...drafts, [athlete.id]: {...draft, height: parseFloat(e.target.value)}})} />
                    </td>
                    <td>
                      <input className="input-minimal" type="number" defaultValue={athlete.weight}
                        onChange={e => setDrafts({...drafts, [athlete.id]: {...draft, weight: parseFloat(e.target.value)}})} />
                    </td>
                    <td>
                      <input className="input-minimal" type="number" step="0.01" defaultValue={athlete.dps}
                        onChange={e => setDrafts({...drafts, [athlete.id]: {...draft, dps: parseFloat(e.target.value)}})} />
                    </td>
                    <td>
                      <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                        <span className="badge-gap" style={{background: analysis.color + '22', color: analysis.color}}>{analysis.label}</span>
                        <span style={{fontSize: '10px', color: '#4a5568'}}>INDEX: {analysis.aabi?.toFixed(2)}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{display: 'flex', gap: '10px'}}>
                        <button className="btn-save" disabled={!hasChanges || savingId === athlete.id} onClick={() => saveAthlete(athlete.id)}>
                          {savingId === athlete.id ? "..." : <Save size={16}/>}
                        </button>
                        <button className="btn-save" style={{color: '#3b82f6', borderColor: '#3b82f6'}} 
                          onClick={() => window.open(`/share?token=${athlete.share_token}`)}>
                          <Share2 size={16}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </main>

      {loading && <div style={{textAlign: 'center', marginTop: '40px', color: '#facc15'}}>正在同步云端数据...</div>}
    </div>
  );
}