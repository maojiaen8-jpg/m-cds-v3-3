"use client";

import React, { useEffect, useMemo, useState } from "react";
import { 
  Printer, Save, Waves, Plus, Zap, Baby, 
  Share2, Eye, X, Calculator, User, Lock, Users
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// --- 核心计算引擎 (保持 Golden Version 逻辑) ---
const calculateMCDS = (t: number, css: number, stage: string, age: number) => {
  const DISTANCES = [25, 50, 100, 200, 400];
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
    hr: Math.round((maxHR * (zone === 'SP' ? 0.98 : 0.85)) / 6)
  }));
};

export default function Page() {
  const [role, setRole] = useState<"guest" | "coach" | "parent" | null>(null);
  const [pass, setPass] = useState("");
  const [athletes, setAthletes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAthlete, setActiveAthlete] = useState<any>(null);
  const [drafts, setDrafts] = useState<Record<string, any>>({});

  // 1. 自动识别身份
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (token) {
      setRole("parent");
      loadParentData(token);
    } else {
      setRole("guest"); // 默认显示选择入口
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase.from("athletes").select("*").order("name");
    if (data) setAthletes(data);
    setLoading(false);
  };

  const loadParentData = async (token: string) => {
    const { data } = await supabase.from("athletes").select("*").eq("share_token", token).single();
    if (data) setActiveAthlete(data);
    setLoading(false);
  };

  const handleCoachLogin = () => {
    if (pass === "8888") { // 这里可以设置你的教练密码
      setRole("coach");
      loadData();
    } else {
      alert("密码错误");
    }
  };

  const saveAthlete = async (id: string) => {
    const edit = drafts[id];
    await supabase.from("athletes").update(edit).eq("id", id);
    await loadData();
    setDrafts({});
    alert("同步成功");
  };

  const addAthlete = async () => {
    const name = prompt("运动员姓名:");
    if (!name) return;
    await supabase.from("athletes").insert([{ name, age:14, t_value:15, css:80, phv_stage:'post', share_token: Math.random().toString(36).substring(7) }]);
    loadData();
  };

  // --- UI 组件渲染 ---
  if (role === "guest") return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#05070a] p-6 text-white font-sans">
      <Waves size={60} color="#facc15" className="mb-6" />
      <h1 className="text-3xl font-black italic mb-8 tracking-tighter">M-CDS ELITE V3.3</h1>
      <div className="grid gap-4 w-full max-w-xs">
        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 text-center hover:bg-white/10 transition-all cursor-pointer" onClick={() => setRole("coach_login" as any)}>
          <Users size={32} className="mx-auto mb-3 text-emerald-400" />
          <h3 className="font-bold uppercase">教练入口</h3>
          <p className="text-[10px] text-slate-500 mt-1">管理队员及导出计划</p>
        </div>
        <p className="text-[10px] text-slate-600 text-center px-4 mt-4">家长端请通过教练分享的专属链接进入</p>
      </div>
    </div>
  );

  if (role === ("coach_login" as any)) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#05070a] p-6 text-white">
      <div className="glass p-8 rounded-3xl w-full max-w-xs border border-white/10 text-center">
        <Lock size={32} className="mx-auto mb-4 text-[#facc15]" />
        <h2 className="mb-6 font-bold">请输入教练认证码</h2>
        <input type="password" autoFocus className="w-full bg-black border border-white/20 rounded-xl p-4 text-center text-xl tracking-widest text-[#facc15]" value={pass} onChange={e=>setPass(e.target.value)} />
        <button className="w-full bg-[#facc15] text-black font-black p-4 rounded-xl mt-4" onClick={handleCoachLogin}>进入系统</button>
        <button className="mt-4 text-xs text-slate-500" onClick={() => setRole("guest")}>返回选择</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#05070a] text-white p-4 font-sans">
      <style>{`
        .glass { background: rgba(15, 20, 28, 0.9); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; }
        .input-dark { background: #000; border: 1px solid #333; color: #facc15; padding: 6px; border-radius: 8px; width: 60px; text-align: center; font-weight: bold; }
        .btn-gold { background: #facc15; color: #000; padding: 10px 20px; border-radius: 12px; font-weight: 900; border: none; cursor: pointer; }
        .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 100; padding: 20px; overflow-y: auto; }
        .pace-val { color: #34d399; font-weight: bold; font-family: monospace; }
        @media print { .no-print { display: none !important; } }
      `}</style>

      {/* 教练工作台 */}
      {role === 'coach' && (
        <div className="no-print">
          <header className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Waves color="#facc15" size={24} />
              <h2 className="font-black italic tracking-tight">M-CDS <span className="text-[#facc15]">COACH</span></h2>
            </div>
            <button className="btn-gold" onClick={addAthlete}>+ 新增</button>
          </header>

          <div className="glass p-4 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] text-slate-500 uppercase border-b border-white/5">
                  <th className="p-3">姓名</th>
                  <th className="p-3 text-center">T-Val</th>
                  <th className="p-3 text-center">CSS</th>
                  <th className="p-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {athletes.map(a => (
                  <tr key={a.id} className="border-b border-white/5">
                    <td className="p-3 font-bold">{a.name}</td>
                    <td className="p-3 text-center"><input className="input-dark" type="number" step="0.1" defaultValue={a.t_value} onChange={e=>setDrafts({...drafts, [a.id]:{...drafts[a.id], t_value:parseFloat(e.target.value)}})} /></td>
                    <td className="p-3 text-center"><input className="input-dark" type="number" step="0.1" defaultValue={a.css} onChange={e=>setDrafts({...drafts, [a.id]:{...drafts[a.id], css:parseFloat(e.target.value)}})} /></td>
                    <td className="p-3">
                      <div className="flex justify-end gap-3">
                        <button className="text-[#facc15] opacity-50" onClick={() => saveAthlete(a.id)} disabled={!drafts[a.id]}><Save size={18}/></button>
                        <button className="text-white" onClick={() => setActiveAthlete(a)}><Calculator size={18}/></button>
                        <button className="text-blue-400" onClick={() => {
                          const url = `${window.location.origin}?token=${a.share_token}`;
                          navigator.clipboard.writeText(url);
                          alert("专属分享链接已复制到剪贴板！");
                        }}><Share2 size={18}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 家长端或计算器弹窗 */}
      {(activeAthlete || role === 'parent') && (
        <div className={role === 'coach' ? "modal" : "p-2"}>
          {role === 'coach' && <button className="absolute top-6 right-6 text-white" onClick={() => setActiveAthlete(null)}><X size={32}/></button>}
          <div className="max-w-4xl mx-auto">
             <div className="text-center mb-8">
                <p className="text-[#facc15] text-[10px] font-black uppercase tracking-widest mb-1">M-CDS Elite Athlete</p>
                <h1 className="text-4xl font-black uppercase tracking-tighter italic">{activeAthlete?.name}</h1>
                <div className="flex justify-center gap-4 mt-4">
                   <div className="glass px-4 py-2 text-center"><p className="text-[8px] text-slate-500 uppercase">T-Value</p><p className="text-xl font-bold text-emerald-400">{activeAthlete?.t_value}s</p></div>
                   <div className="glass px-4 py-2 text-center"><p className="text-[8px] text-slate-500 uppercase">CSS</p><p className="text-xl font-bold text-blue-400">{activeAthlete?.css}s</p></div>
                </div>
             </div>

             <div className="glass overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-white/5 text-[9px] text-slate-500 uppercase">
                        <th className="p-4 text-left">Zone</th><th>25M</th><th>50M</th><th>100M</th><th>200M</th><th>400M</th><th>10S HR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeAthlete && calculateMCDS(activeAthlete.t_value, activeAthlete.css, activeAthlete.phv_stage, activeAthlete.age).map(r => (
                        <tr key={r.zone} className="border-b border-white/5 text-center">
                          <td className="p-4 text-left font-black text-sm">{r.zone}</td>
                          {r.paces.map((p, i) => (
                            <td key={i} className="p-2">
                              <div className="pace-val text-sm">{p.val}</div>
                              <div className="text-[8px] text-slate-600 tracking-tighter">{p.range}</div>
                            </td>
                          ))}
                          <td className="text-rose-500 font-bold text-lg">{r.hr}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             </div>
             <button className="btn-gold w-full mt-6 no-print" onClick={() => window.print()}><Printer size={18} className="inline mr-2"/>打印今日训练单</button>
          </div>
        </div>
      )}
    </div>
  );
}