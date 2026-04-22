"use client";
import React, { useEffect, useState, useMemo } from "react";
import { Printer, Save, Waves, Share2, Eye, X, Calculator, Lock, Activity, LogOut, Trash2, Calendar, Bell, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

// --- 核心计算与格式化 (锁定不动) ---
const formatPace = (s: number) => {
  if (s >= 3600) return "59:59";
  let t = Math.round(s * 10) / 10;
  if (t < 60) return t.toFixed(1) + 's';
  let m = Math.floor(t / 60), r = t % 60;
  if (r >= 59.95) { m += 1; r = 0; }
  return `${m}:${r.toFixed(1).padStart(4, '0')}`;
};

const calculateMCDS = (a: any) => {
  if (!a) return [];
  const DIST = [25, 50, 100, 200, 400], Z = { SP:0.98, TSP:0.95, ANP:0.92, ANE:0.88, AES:0.82, AEN:0.75, BAE:0.65 };
  const SF: any = { Free:1, Back:1.06, Fly:1.12, Breast:1.18 }, DF: any = { Free:{100:1.01,200:1.02,400:1.03}, Back:{100:1.01,200:1.02,400:1.03}, Fly:{100:1.03,200:1.07,400:1.15}, Breast:{100:1.025,200:1.06,400:1.12} };
  return Object.keys(Z).map(z => {
    const b25 = (z==='SP'?a.t_value: z==='TSP'?a.t_value+0.8: z==='ANP'?a.t_value+2.5: z==='ANE'?a.t_value*1.18: a.phv_stage==='pre'?(a.css/4*(z==='AES'?1.015:z==='AEN'?1.055:1.18)):(a.t_value*(z==='AES'?1.28:z==='AEN'?1.38:1.55))) * (SF[a.stroke]||1) * (a.pool_type==='50'?1.035:1);
    return { zone: z, paces: DIST.map(d => {
      if ((['SP','TSP','ANP','ANE'].includes(z) && d>100) || (['Fly','Breast'].includes(a.stroke) && d>200)) return { v:'N/A', r:'--' };
      const s = b25 * (d/25) * ((DF[a.stroke]||DF.Free)[d] || 1);
      return { v: formatPace(s), r: `${formatPace(s*0.98)}~${formatPace(s*1.02)}` };
    }), hr: Math.round(((220-a.age)*(Z as any)[z])/6) };
  });
};

export default function Page() {
  const [role, setRole] = useState<any>("guest");
  const [user, setUser] = useState<any>(null);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [calData, setCalData] = useState<string[]>(new Array(28).fill(""));
  const [updatedAt, setUpdatedAt] = useState("");
  const [activeA, setActiveA] = useState<any>(null);
  const [email, setEm] = useState(""); const [pass, setPw] = useState("");
  const [showCal, setShowCal] = useState(false);
  const [selDay, setSelDay] = useState<number | null>(null);

  const isRecent = useMemo(() => {
    if (!updatedAt) return false;
    return (new Date().getTime() - new Date(updatedAt).getTime()) < 24*60*60*1000;
  }, [updatedAt]);

  useEffect(() => {
    const init = async () => {
      const t = new URLSearchParams(window.location.search).get("token");
      if (t) {
        const { data: a } = await supabase.from("athletes").select("*").eq("share_token", t).single();
        if (a) { setRole("parent"); setActiveA(a); loadS(a.coach_id); }
      } else {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (s) { setUser(s.user); setRole("coach"); loadD(); loadS(s.user.id); }
      }
    }; init();
  }, []);

  const loadD = async () => { const { data } = await supabase.from("athletes").select("*").order("age", { ascending: false }); if (data) setAthletes(data); };
  const loadS = async (id: string) => { 
    const { data } = await supabase.from("schedules").select("*").eq("coach_id", id).single(); 
    if (data) { setCalData(data.calendar_data); setUpdatedAt(data.updated_at); } 
  };
  const handleSaveS = async () => { 
    await supabase.from("schedules").upsert({ coach_id: user.id, calendar_data: calData, updated_at: new Date() }); 
    alert("日历计划已发布！"); setSelDay(null);
  };

  return (
    <div className="app-root">
      <style>{`
        .app-root { background: #05070a; color: #e2e8f0; min-height: 100vh; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; padding: 15px; }
        .glass { width: 100%; max-width: 1000px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 18px; backdrop-filter: blur(10px); }
        .btn-gold { background: #facc15; color: #000; padding: 10px 16px; border-radius: 10px; font-weight: 800; border: none; cursor: pointer; display: flex; align-items: center; gap: 6px; }
        .input-dark { background: #000; border: 1px solid #333; color: #fff; padding: 10px; border-radius: 10px; width: 100%; outline: none; }
        .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; margin: 10px 0; }
        .cal-day { aspect-ratio: 1; border: 1px solid #222; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 10px; cursor: pointer; position: relative; background: #0d0d0d; }
        .cal-day.has-data { border-color: #facc1555; }
        .cal-day.active { background: #facc15; color: #000; }
        .cal-day.today { border: 2px solid #10b981; }
        .indicator { width: 4px; height: 4px; border-radius: 50%; background: #10b981; position: absolute; bottom: 4px; }
        .pace { color: #10b981; font-family: monospace; font-weight: bold; font-size: 15px; }
        .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 100; display: flex; justify-content: center; padding: 10px; overflow-y: auto; }
        .banner { background: #10b98122; color: #10b981; border: 1px solid #10b98144; padding: 8px 15px; border-radius: 10px; margin-bottom: 12px; font-size: 11px; width: 100%; text-align: center; }
        @media print { .no-print { display: none !important; } }
      `}</style>

      {role === "guest" && <div className="glass" style={{marginTop:'20vh', textAlign:'center'}}><Waves size={50} color="#facc15" style={{margin:'0 auto 20px'}}/><h2>M-CDS ELITE</h2><button className="btn-gold" style={{width:'100%'}} onClick={()=>setRole("coach_login")}>教练员入口</button></div>}
      
      {role === "coach_login" && <div className="glass" style={{marginTop:'15vh', width:300}}><input className="input-dark" placeholder="邮箱" onChange={e=>setEm(e.target.value)} style={{marginBottom:10}}/><input className="input-dark" type="password" placeholder="密码" onChange={e=>setPw(e.target.value)} style={{marginBottom:20}}/><button className="btn-gold" style={{width:'100%'}} onClick={async()=>{const {error}=await supabase.auth.signInWithPassword({email,password:pass}); if(error)alert("失败"); else window.location.reload();}}>进入系统</button></div>}

      {role === "coach" && (
        <div className="glass no-print">
          <div style={{display:'flex', justifyBetween:'center', alignItems:'center', marginBottom:15}}>
            <h3 style={{margin:0}}>队内管理 (年龄排序)</h3>
            <div style={{display:'flex', gap:8}}>
              <button className="btn-gold" style={{background:'#3b82f6', color:'#fff'}} onClick={()=>setShowCal(!showCal)}><Calendar size={18}/></button>
              <button className="btn-gold" onClick={async ()=>{const n=prompt("姓名:"); if(n) await supabase.from("athletes").insert([{name:n, age:14, t_value:15, css:80, stroke:'Free', phv_stage:'post', share_token:Math.random().toString(36).substring(2), coach_id:user.id}]); loadD();}}>+ 新增</button>
            </div>
          </div>

          {showCal && <div style={{padding:15, background:'#000', borderRadius:15, border:'1px solid #facc15', marginBottom:20}}>
            <h4 style={{margin:0}}>大周期日历计划录入 (28天)</h4>
            <div className="cal-grid">
              {calData.map((d, i) => (
                <div key={i} className={`cal-day ${selDay===i?'active':''} ${d?'has-data':''}`} onClick={()=>setSelDay(i)}>
                  D{i+1}
                  {d && <div className="indicator" style={{background: selDay===i?'#000':'#10b981'}}></div>}
                </div>
              ))}
            </div>
            {selDay !== null && (
              <div style={{marginTop:10}}>
                <label style={{fontSize:10, color:'#facc15'}}>正在编辑第 {selDay+1} 天内容:</label>
                <textarea className="input-dark" style={{height:60, marginTop:5}} value={calData[selDay]} onChange={e=>{const next=[...calData]; next[selDay]=e.target.value; setCalData(next);}} />
                <button className="btn-gold" style={{width:'100%', marginTop:10}} onClick={handleSaveS}><Save size={16}/> 保存并发布日历</button>
              </div>
            )}
          </div>}

          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead><tr style={{color:'#4a5568', fontSize:10, textAlign:'left'}}><th className="p-3">姓名</th><th>年龄</th><th>T-VAL</th><th style={{textAlign:'right'}}>操作</th></tr></thead>
            <tbody>{athletes.map(a=>(<tr key={a.id} style={{borderBottom:'1px solid #111'}}><td className="p-3"><b>{a.name}</b></td><td>{a.age}岁</td><td>{a.t_value}s</td><td style={{textAlign:'right'}}><div style={{display:'flex', gap:10, justifyContent:'flex-end'}}><Eye size={18} onClick={()=>setActiveA(a)} style={{cursor:'pointer'}}/><Trash2 size={18} color="#f87171" onClick={async()=>{if(confirm('彻底删除?')){await supabase.from("athletes").delete().eq("id",a.id); loadD();}}} style={{cursor:'pointer'}}/></div></td></tr>))}</tbody>
          </table>
        </div>
      )}

      {activeA && (
        <div className={role==='coach'?'modal':'glass'}>
          <div style={{width:'100%', maxWidth:850, background:'#0a0c10', padding:20, borderRadius:24, position:'relative', height:'fit-content'}}>
            {role==='coach' && <div style={{textAlign:'right'}}><X size={30} onClick={()=>setActiveA(null)} /></div>}
            {role==='parent' && isRecent && <div className="banner"><Bell size={14} style={{display:'inline', marginRight:5}}/>教练已更新周期计划，请查收</div>}
            
            <div style={{textAlign:'center', marginBottom:15}}>
              <h1 style={{margin:0}}>{activeA.name}</h1>
              <p style={{color:'#facc15', fontSize:12, marginTop:5}}>{activeA.age}岁 | {activeA.stroke} | {activeA.pool_type}M池</p>
            </div>

            {/* 日历展示区 */}
            <div style={{marginBottom:20}}>
              <h4 style={{fontSize:12, marginBottom:10, display:'flex', alignItems:'center', gap:5}}><Calendar size={14} color="#facc15"/> 28天训练周期日历</h4>
              <div className="cal-grid">
                {calData.map((d, i) => (
                  <div key={i} className={`cal-day ${d?'has-data':''} ${isRecent && d ? 'breathing' : ''}`} title={d} onClick={()=>{if(d) alert(`第 ${i+1} 天计划：\n${d}`)}}>
                    D{i+1}
                    {d && <div className="indicator"></div>}
                  </div>
                ))}
              </div>
              <p style={{fontSize:9, color:'#4a5568'}}>* 点击带有绿点的日期查看具体安排</p>
            </div>

            <div style={{overflowX:'auto', background:'#000', borderRadius:16, padding:8, border:'1px solid #222'}}>
              <table style={{width:'100%', minWidth:600, borderCollapse:'collapse'}}>
                <thead><tr style={{color:'#718096', fontSize:9}}><th>ZONE</th><th>25M</th><th>50M</th><th>100M</th><th>200M</th><th>400M</th><th>HR</th></tr></thead>
                <tbody>{calculateMCDS(activeA).map(r => (
                  <tr key={r.zone} style={{textAlign:'center', borderBottom:'1px solid #111'}}>
                    <td style={{padding:10, textAlign:'left', fontWeight:'bold', fontSize:11}}>{r.zone}</td>
                    {r.paces.map((p, i) => (<td key={i}>{p.v==='N/A'?'--':<> <div className="pace">{p.v}</div><div style={{fontSize:8, color:'#444'}}>{p.r}</div></>}</td>))}
                    <td style={{color:'#f87171', fontWeight:900, fontSize:16}}>{r.hr}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <button className="btn-gold no-print" style={{width:'100%', marginTop:20}} onClick={()=>window.print()}>打印今日报告</button>
          </div>
        </div>
      )}
    </div>
  );
}