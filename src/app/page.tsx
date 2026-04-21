"use client";

import React, { useEffect, useMemo, useState } from "react";
import { 
  Printer, Save, Waves, Plus, Zap, Baby, 
  Share2, Eye, X, Calculator, User
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// --- 严格定义的类型 ---
type PhvStage = "pre" | "post";
type Athlete = {
  id: string; name: string; age: number; phv_stage: PhvStage;
  t_value: number; css: number; height: number; weight: number;
  dps: number; share_token: string;
};

const DISTANCES = [25, 50, 100, 200, 400];

// --- 核心计算引擎 ---
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
      return { val: val.toFixed(1) + 's', range: `${(val * 0.98).toFixed(1)}~${(val * 1.02).toFixed(1)}` };
    }),
    hr: Math.round((maxHR * (zone === 'SP' ? 0.98 : zone.startsWith('A') ? 0.85 : 0.75)) / 6)
  }));
};

export default function Page() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Partial<Athlete>>>({});
  const [loading, setLoading] = useState(true);
  const [activeAthlete, setActiveAthlete] = useState<Athlete | null>(null);

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase.from("athletes").select("*").order("name");
    if (data) setAthletes(data as Athlete[]);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const saveAthlete = async (id: string) => {
    const edit = drafts[id];
    if (!edit) return;
    const { error: upError } = await supabase.from("athletes").update(edit).eq("id", id);
    if (!upError) {
      await supabase.from("measurements").insert({ athlete_id: id, ...edit });
      loadData();
      const newDrafts = { ...drafts }; delete newDrafts[id]; setDrafts(newDrafts);
      alert("同步成功");
    }
  };

  const addAthlete = async () => {
    const name = prompt("姓名:");
    if (!name) return;
    const { error } = await supabase.from("athletes").insert([{ 
      name, age: 14, t_value: 15.0, css: 80.0, phv_stage: 'post', 
      share_token: Math.random().toString(36).substring(2),
      height: 170, weight: 60, dps: 1.0
    }]);
    if (error) alert("失败: " + error.message);
    else loadData();
  };

  return (
    <div className="app-shell">
      <style>{`
        .app-shell { background: #05070a; color: #fff; min-height: 100vh; padding: 20px; font-family: sans-serif; }
        .nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .glass-box { background: rgba(20,25,35,0.8); border: 1px solid #2d3748; border-radius: 16px; padding: 20px; overflow-x: auto; }
        .main-table { width: 100%; border-collapse: collapse; min-width: 800px; }
        .main-table th { color: #718096; font-size: 11px; text-align: left; padding: 10px; text-transform: uppercase; border-bottom: 1px solid #2d3748; }
        .main-table td { padding: 12px 10px; border-bottom: 1px solid #1a202c; }
        .in-dark { background: #000; border: 1px solid #333; color: #facc15; padding: 5px; border-radius: 4px; width: 50px; text-align: center; }
        .btn-gold { background: #facc15; color: #000; border: none; padding: 8px 16px; border-radius: 8px; font-weight: bold; cursor: pointer; }
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal { background: #0a0c10; border: 1px solid #333; width: 100%; max-width: 800px; border-radius: 20px; padding: 20px; position: relative; }
        .pace-cell { color: #34d399; font-family: monospace; font-weight: bold; }
        @media print { .no-print { display: none; } }
      `}</style>

      <div className="no-print">
        <header className="nav">
          <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
            <Waves color="#facc15" />
            <h1 style={{fontSize:'20px'}}>M-CDS <span style={{color:'#facc15'}}>ELITE</span></h1>
          </div>
          <button className="btn-gold" onClick={addAthlete}>+ 新增运动员</button>
        </header>

        <div className="glass-box">
          <table className="main-table">
            <thead>
              <tr>
                <th>姓名</th><th>年龄</th><th>T-VAL</th><th>CSS</th><th>操作</th>
              </tr>
            </thead>
            <tbody>
              {athletes.map(a => (
                <tr key={a.id}>
                  <td style={{fontWeight:'bold'}}>{a.name}</td>
                  <td><input className="in-dark" type="number" defaultValue={a.age} onChange={e=>setDrafts({...drafts, [a.id]:{...drafts[a.id], age:parseInt(e.target.value)}})} /></td>
                  <td><input className="in-dark" type="number" step="0.1" defaultValue={a.t_value} onChange={e=>setDrafts({...drafts, [a.id]:{...drafts[a.id], t_value:parseFloat(e.target.value)}})} /></td>
                  <td><input className="in-dark" type="number" step="0.1" defaultValue={a.css} onChange={e=>setDrafts({...drafts, [a.id]:{...drafts[a.id], css:parseFloat(e.target.value)}})} /></td>
                  <td>
                    <div style={{display:'flex', gap:'10px'}}>
                      <button style={{background:'none', border:'1px solid #444', color:'#fff', padding:'4px 8px', borderRadius:'4px'}} onClick={()=>setActiveAthlete(a)}><Eye size={14}/></button>
                      <button style={{background:'none', border:'1px solid #facc15', color:'#facc15', padding:'4px 8px', borderRadius:'4px'}} onClick={()=>saveAthlete(a.id)} disabled={!drafts[a.id]}><Save size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {activeAthlete && (
        <div className="overlay">
          <div className="modal">
            <button style={{position:'absolute', top:20, right:20, color:'#fff', background:'none', border:'none'}} onClick={()=>setActiveAthlete(null)}><X /></button>
            <h2 style={{marginTop:0}}>{activeAthlete.name} 训练矩阵</h2>
            <div style={{overflowX:'auto'}}>
               <table style={{width:'100%', borderCollapse:'collapse'}}>
                 <thead>
                   <tr style={{background:'#111'}}>
                     <th style={{padding:'10px'}}>Zone</th>{DISTANCES.map(d=><th key={d}>{d}M</th>)}<th>10S HR</th>
                   </tr>
                 </thead>
                 <tbody>
                   {calculateMCDS(activeAthlete.t_value, activeAthlete.css, activeAthlete.phv_stage, activeAthlete.age).map(r => (
                     <tr key={r.zone} style={{textAlign:'center', borderBottom:'1px solid #1a202c'}}>
                       <td style={{padding:'15px 5px', textAlign:'left'}}>{r.zone}</td>
                       {r.paces.map((p, i) => (
                         <td key={i}>
                           <div className="pace-cell">{p.val}</div>
                           <div style={{fontSize:'9px', color:'#4a5568'}}>{p.range}</div>
                         </td>
                       ))}
                       <td style={{color:'#f87171'}}>{r.hr}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
            <button className="btn-gold" style={{width:'100%', marginTop:'20px'}} onClick={()=>window.print()}>打印报告</button>
          </div>
        </div>
      )}
    </div>
  );
}