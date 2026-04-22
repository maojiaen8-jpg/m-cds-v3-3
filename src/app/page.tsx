"use client";
import React, { useEffect, useState, useMemo } from "react";
import { Printer, Save, Waves, Share2, Eye, X, Calculator, Lock, Trash2, Calendar, Bell } from "lucide-react";
import { supabase } from "@/lib/supabase";

// --- 1. 核心计算与格式化 (锁死 Golden Version) ---
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
    return { zone: z, label: z, paces: DIST.map(d => {
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

  const isRecent = useMemo(() => updatedAt ? (new Date().getTime() - new Date(updatedAt).getTime()) < 24*60*60*1000 : false, [updatedAt]);

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
  const loadS = async (id: string) => { const { data } = await supabase.from("schedules").select("*").eq("coach_id", id).single(); if (data) { setCalData(data.calendar_data); setUpdatedAt(data.updated_at); } };
  const handleUpdate = async (id: string, up: any) => { await supabase.from("athletes").update(up).eq("id", id); loadD(); };

  return (
    <div className="app-root">
      <style>{`
        .app-root { background: #05070a; color: #e2e8f0; min-height: 100vh; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; padding: 15px; }
        .glass { width: 100%; max-width: 1100px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 15px; overflow-x: auto; backdrop-filter: blur(10px); }
        .btn-gold { background: #facc15; color: #000; padding: 10px 16px; border-radius: 10px; font-weight: 800; border: none; cursor: pointer; display: flex; align-items: center; gap: 6px; }
        .input-dark { background: #000; border: 1px solid #333; color: #fff; padding: 8px; border-radius: 8px; width: 100%; outline: none; }
        .in-gold { background: #000; border: 1px solid #333; color: #facc15; padding: 6px; border-radius: 6px; width: 52px; text-align: center; font-weight: bold; }
        .sel-dark { background: #000; border: 1px solid #333; color: #e2e8f0; padding: 6px; border-radius: 6px; font-size: 11px; }
        .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; margin: 10px 0; }
        .cal-day { aspect-ratio: 1; border: 1px solid #222; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 10px; cursor: pointer; position: relative; background: #0d0d0d; }
        .cal-day.active { background: #facc15; color: #000; }
        .indicator { width: 4px; height: 4px; border-radius: 50%; background: #10b981; position: absolute; bottom: 3px; }
        .pace-tag { color: #10b981; font-family: monospace; font-weight: bold; font-size: 15px; }
        .breathing { border-color: #10b981; animation: breathe 2s infinite; }
        @keyframes breathe { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 100; display: flex; justify-content: center; padding: 10px; overflow-y: auto; }
        @media print { .no-print { display: none !important; } .mcds-app-root { background: white !important; color: black !important; } }
      `}</style>

      {role === "guest" && <div className="glass" style={{marginTop:'20vh', textAlign:'center'}}><Waves size={50} color="#facc15" style={{margin:'0 auto 20px'}}/><h2>M-CDS ELITE V3.3</h2><button className="btn-gold" style={{width:'100%'}} onClick={()=>setRole("coach_login")}>教练员入口</button></div>}
      
      {role === "coach_login" && <div className="glass" style={{marginTop:'15vh', width:320}}><input className="input-dark" placeholder="邮箱" onChange={e=>setEm(e.target.value)} style={{marginBottom:10}}/><input className="input-dark" type="password" placeholder="密码" onChange={e=>setPw(e.target.value)} style={{marginBottom:20}}/><button className="btn-gold" style={{width:'100%'}} onClick={async()=>{const {error}=await supabase.auth.signInWithPassword({email,password:pass}); if(error)alert("失败"); else window.location.reload();}}>登录</button></div>}

      {role === "coach" && (
        <div className="glass no-print">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:15}}>
            <h3 style={{margin:0}}>泳队管理 (年龄倒序)</h3>
            <div style={{display:'flex', gap:8}}><button className="btn-gold" style={{background:'#3b82f6', color:'#fff'}} onClick={()=>setShowCal(!showCal)}><Calendar size={18}/></button><button className="btn-gold" onClick={async ()=>{const n=prompt("姓名:"); if(n) await supabase.from("athletes").insert([{name:n, age:14, t_value:15, css:80, stroke:'Free', phv_stage:'post', pool_type:'25', share_token:Math.random().toString(36).substring(2), coach_id:user.id}]); loadD();}}>+ 新增</button></div>
          </div>

          {showCal && <div style={{padding:15, background:'#000', borderRadius:15, border:'1px solid #facc15', marginBottom:20}}>
            <div className="cal-grid">{calData.map((d, i) => (<div key={i} className={`cal-day ${selDay===i?'active':''} ${d?'has-data':''}`} onClick={()=>setSelDay(i)}>D{i+1}{d && <div className="indicator"></div>}</div>))}</div>
            {selDay !== null && <div style={{marginTop:10}}><textarea className="input-dark" style={{height:60}} value={calData[selDay]} onChange={e=>{const n=[...calData]; n[selDay]=e.target.value; setCalData(n);}} /><button className="btn-gold" style={{width:'100%', marginTop:10}} onClick={async()=>{await supabase.from("schedules").upsert({coach_id:user.id, calendar_data:calData, updated_at:new Date()}); alert("发布成功"); setSelDay(null);}}><Save size={16}/> 保存发布日历</button></div>}
          </div>}

          <table style={{width:'100%', borderCollapse:'collapse', minWidth:850}}>
            <thead><tr style={{color:'#4a5568', fontSize:10, textAlign:'left'}}><th>姓名</th><th>年龄</th><th>PHV</th><th>泳姿</th><th>池长</th><th>T-VAL</th><th>CSS</th><th style={{textAlign:'right'}}>操作</th></tr></thead>
            <tbody>{athletes.map(a=>(<tr key={a.id} style={{borderBottom:'1px solid #111'}}><td style={{fontWeight:'bold'}}>{a.name}</td>
              <td><input className="in-gold" type="number" defaultValue={a.age} onBlur={e=>handleUpdate(a.id,{age:parseInt(e.target.value)})} /></td>
              <td><select className="sel-dark" defaultValue={a.phv_stage} onChange={e=>handleUpdate(a.id,{phv_stage:e.target.value})}><option value="pre">Pre</option><option value="post">Post</option></select></td>
              <td><select className="sel-dark" defaultValue={a.stroke} onChange={e=>handleUpdate(a.id,{stroke:e.target.value})}><option value="Free">自</option><option value="Back">仰</option><option value="Fly">蝶</option><option value="Breast">蛙</option></select></td>
              <td><select className="sel-dark" defaultValue={a.pool_type} onChange={e=>handleUpdate(a.id,{pool_type:e.target.value})}><option value="25">25m</option><option value="50">50m</option></select></td>
              <td><input className="in-gold" defaultValue={a.t_value} onBlur={e=>handleUpdate(a.id,{t_value:parseFloat(e.target.value)})} /></td>
              <td><input className="in-gold" style={{color:'#3b82f6'}} defaultValue={a.css} onBlur={e=>handleUpdate(a.id,{css:parseFloat(e.target.value)})} /></td>
              <td style={{textAlign:'right'}}><div style={{display:'flex', gap:10, justifyContent:'flex-end'}}><Eye size={20} onClick={()=>setActiveA(a)} style={{cursor:'pointer'}}/><Trash2 size={20} color="#f87171" onClick={async()=>{if(confirm('删?')){await supabase.from("athletes").delete().eq("id",a.id); loadD();}}} style={{cursor:'pointer'}}/></div></td></tr>))}
            </tbody>
          </table>
        </div>
      )}

      {activeA && (
        <div className={role==='coach'?'modal':'glass'}>
          <div style={{width:'100%', maxWidth:850, background:'#0a0c10', padding:20, borderRadius:24, position:'relative'}}>
            {role==='coach' && <div style={{textAlign:'right'}}><X size={32} style={{cursor:'pointer'}} onClick={()=>setActiveA(null)} /></div>}
            {role==='parent' && isRecent && <div style={{background:'#10b98122', color:'#10b981', padding:8, borderRadius:8, marginBottom:12, fontSize:11, textAlign:'center'}}><Bell size={12} style={{display:'inline', marginRight:5}}/>教练已更新计划</div>}
            <div style={{textAlign:'center', marginBottom:15}}><h2>{activeA.name}</h2><p style={{fontSize:12, color:'#facc15'}} suppressHydrationWarning>{activeA.age}岁 | {activeA.stroke} | {activeA.pool_type}M池 | {new Date().toLocaleDateString()}</p></div>
            
            <div className="cal-grid">{calData.map((d, i) => (<div key={i} className={`cal-day ${d?'has-data':''} ${isRecent && d ? 'breathing' : ''}`} onClick={()=>{if(d) alert(`D${i+1}计划：${d}`)}}>D{i+1}{d && <div className="indicator"></div>}</div>))}</div>

            <div style={{overflowX:'auto', background:'#000', borderRadius:16, padding:10, border:'1px solid #222'}}>
              <table style={{width:'100%', minWidth:600, borderCollapse:'collapse'}}>
                <thead><tr style={{color:'#718096', fontSize:9}}><th>ZONE</th><th>25M</th><th>50M</th><th>100M</th><th>200M</th><th>400M</th><th>HR</th></tr></thead>
                <tbody>{calculateMCDS(activeA).map(r => (
                  <tr key={r.zone} style={{textAlign:'center', borderBottom:'1px solid #111'}}>
                    <td style={{padding:12, textAlign:'left', fontWeight:'bold', fontSize:12}}>{r.zone}</td>
                    {r.paces.map((p, i) => (<td key={i}>{p.v==='N/A'?'--':<> <div className="pace">{p.v}</div><div style={{fontSize:8, color:'#4a5568'}}>{p.r}</div></>}</td>))}
                    <td style={{color:'#f87171', fontWeight:900, fontSize:18}}>{r.hr}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <button className="btn-gold no-print" style={{width:'100%', marginTop:20}} onClick={()=>window.print()}>打印报告</button>
          </div>
        </div>
      )}
    </div>
  );
}