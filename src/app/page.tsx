"use client";
import React, { useEffect, useState, useMemo } from "react";
import { Printer, Save, Waves, Plus, Zap, Share2, Eye, X, Calculator, Lock, Activity, LogOut, Trash2, Calendar, Bell } from "lucide-react";
import { supabase } from "@/lib/supabase";

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
  const [sched, setSched] = useState<any>({ week_1:'', week_2:'', week_3:'', week_4:'', updated_at:'' });
  const [activeA, setActiveA] = useState<any>(null);
  const [email, setEm] = useState(""); const [pass, setPw] = useState("");
  const [showSc, setShowSc] = useState(false);

  const isRecent = useMemo(() => {
    if (!sched.updated_at) return false;
    return (new Date().getTime() - new Date(sched.updated_at).getTime()) < 24*60*60*1000;
  }, [sched.updated_at]);

  useEffect(() => {
    const init = async () => {
      const t = new URLSearchParams(window.location.search).get("token");
      if (t) {
        const { data: a } = await supabase.from("athletes").select("*").eq("share_token", t).single();
        if (a) { setRole("parent"); setActiveA(a); const { data: s } = await supabase.from("schedules").select("*").eq("coach_id", a.coach_id).single(); if(s) setSched(s); }
      } else {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (s) { setUser(s.user); setRole("coach"); loadD(); loadS(s.user.id); }
      }
    }; init();
  }, []);

  const loadD = async () => { const { data } = await supabase.from("athletes").select("*").order("age", { ascending: false }); if (data) setAthletes(data); };
  const loadS = async (id: string) => { const { data } = await supabase.from("schedules").select("*").eq("coach_id", id).single(); if (data) setSched(data); };
  const handleSaveS = async () => { await supabase.from("schedules").upsert({ coach_id: user.id, ...sched, updated_at: new Date() }); alert("已发布！"); };

  return (
    <div className="app-root">
      <style>{`
        .app-root { background: #05070a; color: #e2e8f0; min-height: 100vh; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; padding: 15px; }
        .glass { width: 100%; max-width: 1000px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 20px; backdrop-filter: blur(10px); }
        .btn-gold { background: #facc15; color: #000; padding: 12px 20px; border-radius: 12px; font-weight: 900; border: none; cursor: pointer; }
        .input-dark { background: #000; border: 1px solid #333; color: #fff; padding: 10px; border-radius: 10px; width: 100%; outline: none; }
        .pace { color: #10b981; font-family: monospace; font-weight: bold; font-size: 15px; }
        .sched-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 15px 0; }
        .sched-card { background: #111; padding: 12px; border-radius: 12px; border: 1px solid #222; position: relative; }
        .breathing { border-color: #10b981; box-shadow: 0 0 10px rgba(16,185,129,0.2); animation: breathe 2s infinite; }
        @keyframes breathe { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
        .banner { background: #f87171; color: white; padding: 8px 20px; border-radius: 10px; margin-bottom: 15px; font-size: 12px; font-weight: bold; display: flex; align-items: center; gap: 8px; }
        @media print { .no-print { display: none !important; } }
      `}</style>

      {role === "guest" && <div className="glass" style={{marginTop:'20vh', textAlign:'center'}}><Waves size={60} color="#facc15" style={{margin:'0 auto 20px'}}/><h1>M-CDS ELITE</h1><button className="btn-gold" onClick={()=>setRole("coach_login")}>教练登录</button></div>}
      {role === "coach_login" && <div className="glass" style={{marginTop:'15vh', width:300}}><input className="input-dark" placeholder="邮箱" onChange={e=>setEm(e.target.value)} style={{marginBottom:10}}/><input className="input-dark" type="password" placeholder="密码" onChange={e=>setPw(e.target.value)} style={{marginBottom:20}}/><button className="btn-gold" style={{width:'100%'}} onClick={async()=>{const {error}=await supabase.auth.signInWithPassword({email,password:pass}); if(error)alert("失败"); else window.location.reload();}}>进入</button></div>}

      {role === "coach" && (
        <div className="glass no-print">
          <div style={{display:'flex', justifyContent:'space-between', marginBottom:20}}>
            <h2>我的泳队 ({athletes.length})</h2>
            <div style={{display:'flex', gap:10}}><button className="btn-gold" style={{background:'#3b82f6', color:'#fff'}} onClick={()=>setShowSc(!showSc)}><Calendar size={18}/></button><button className="btn-gold" onClick={async ()=>{const n=prompt("姓名:"); if(n) await supabase.from("athletes").insert([{name:n, age:14, t_value:15, css:80, share_token:Math.random().toString(36).substring(2), coach_id:user.id}]); loadD();}}>+ 新增</button></div>
          </div>
          {showSc && <div style={{padding:15, background:'#000', borderRadius:15, border:'1px solid #facc15', marginBottom:20}}>
            <h4>4周周期计划录入</h4>
            <div className="sched-grid">{[1,2,3,4].map(i=>(<div key={i} className="sched-card"><label style={{fontSize:9, color:'#facc15'}}>WEEK {i}</label><textarea className="input-dark" style={{height:60, fontSize:11}} value={(sched as any)[`week_${i}`]} onChange={e=>setSched({...sched, [`week_${i}`]:e.target.value})}/></div>))}</div>
            <button className="btn-gold" style={{width:'100%'}} onClick={handleSaveS}><Save size={16}/> 发布计划</button>
          </div>}
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead><tr style={{color:'#4a5568', fontSize:10, textAlign:'left'}}><th className="p-3">姓名</th><th>年龄</th><th>T-VAL</th><th>操作</th></tr></thead>
            <tbody>{athletes.map(a=>(<tr key={a.id} style={{borderBottom:'1px solid #111'}}><td className="p-3"><b>{a.name}</b></td><td>{a.age}岁</td><td>{a.t_value}s</td><td style={{textAlign:'right'}}><Eye size={18} style={{marginRight:15, cursor:'pointer'}} onClick={()=>setActiveA(a)}/><Trash2 size={18} color="#f87171" style={{cursor:'pointer'}} onClick={async()=>{if(confirm('删?')){await supabase.from("athletes").delete().eq("id",a.id); loadD();}}}/></td></tr>))}</tbody>
          </table>
        </div>
      )}

      {activeA && (
        <div className={role==='coach'?'modal':'glass'}>
          <div style={{width:'100%', maxWidth:850, background:'#0a0c10', padding:20, borderRadius:24, position:'relative'}}>
            {role==='coach' && <X size={30} style={{position:'absolute', top:20, right:20, cursor:'pointer'}} onClick={()=>setActiveA(null)} />}
            {role==='parent' && isRecent && <div className="banner"><Bell size={14}/> 教练更新了新的训练计划</div>}
            <div style={{textAlign:'center', marginBottom:15}}><h1>{activeA.name}</h1><p style={{color:'#facc15'}}>{activeA.age}岁 | {activeA.stroke} | {activeA.pool_type}M池</p></div>
            
            <div className="sched-grid">
              {[1,2,3,4].map(i => (
                <div key={i} className={`sched-card ${(isRecent && (sched as any)[`week_${i}`]) ? 'breathing' : ''}`}>
                  <div style={{fontSize:9, color:'#718096'}}>WEEK {i}</div>
                  <div style={{fontSize:11, marginTop:5, minHeight:30}}>{(sched as any)[`week_${i}`] || '正常训练'}</div>
                </div>
              ))}
            </div>

            <div style={{overflowX:'auto', background:'#000', borderRadius:20, padding:10, border:'1px solid #222'}}>
              <table style={{width:'100%', minWidth:600, borderCollapse:'collapse'}}>
                <thead><tr style={{color:'#718096', fontSize:10}}><th>ZONE</th><th>25M</th><th>50M</th><th>100M</th><th>200M</th><th>400M</th><th>HR</th></tr></thead>
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
            <button onClick={()=>{supabase.auth.signOut(); window.location.reload();}} style={{background:'none', border:'none', color:'#4a5568', marginTop:20, fontSize:10, width:'100%'}}>退出</button>
          </div>
        </div>
      )}
    </div>
  );
}