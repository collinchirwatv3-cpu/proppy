/* eslint-disable */
import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import jsQRLib from "jsqr";
import QRCodeLib from "qrcode";

// ─── SUPABASE ─────────────────────────────────────────────────────────────────
const SUPABASE_URL  = "https://sqyfmohkfxsnrrynwdnr.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxeWZtb2hrZnhzbnJyeW53ZG5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0Njk3OTMsImV4cCI6MjA5NTA0NTc5M30.UEdLGDhidftm3tvmHjcuGbK6_-DCvp-OYr2KNc-jSu8";
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

// ─── FONTS ────────────────────────────────────────────────────────────────────
const _fl = document.createElement("link");
_fl.rel = "stylesheet";
_fl.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap";
document.head.appendChild(_fl);
const F = "'Plus Jakarta Sans', system-ui, sans-serif";

// ─── TOKENS ───────────────────────────────────────────────────────────────────
const T = {
  bg:"#F5F5F5", white:"#FFFFFF", border:"#EBEBEB",
  muted:"#AAAAAA", body:"#666666", ink:"#1A1A1A",
  green:"#22C55E", greenBg:"#F0FDF4", greenBd:"#BBF7D0", greenDk:"#16A34A",
  amber:"#F59E0B", amberBg:"#FFFBEB", amberBd:"#FDE68A", amberDk:"#D97706",
  red:"#EF4444",   redBg:"#FEF2F2",   redBd:"#FECACA",   redDk:"#DC2626",
  blue:"#3B82F6",  blueBg:"#EFF6FF",  blueBd:"#BFDBFE",  blueDk:"#2563EB",
  purple:"#8B5CF6",purpleBg:"#F5F3FF",purpleBd:"#DDD6FE",purpleDk:"#6D28D9",
};
const S_META = {
  HERO:    {c:T.greenDk,bg:T.greenBg,bd:T.greenBd,dot:T.green, label:"Hero"},
  STANDBY: {c:T.amberDk,bg:T.amberBg,bd:T.amberBd,dot:T.amber, label:"Standby"},
  DAMAGED: {c:T.redDk,  bg:T.redBg,  bd:T.redBd,  dot:T.red,   label:"Damaged"},
  WRAPPED: {c:"#64748B", bg:"#F8FAFC", bd:"#E2E8F0", dot:"#94A3B8", label:"Wrapped"},
};
const TITLES = ["Props Master","Prop Standby","Prop Buyer","Set Decorator","Set Dec Standby","Assistant Props","Trainee Props","Other"];
const LS_USER = "proppy_user_v2";

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const tsNow    = () => new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
const initials = n  => (n||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
const getUser  = () => { try { const u=localStorage.getItem(LS_USER); return u?JSON.parse(u):null; } catch { return null; } };
const saveUser = u  => { try { localStorage.setItem(LS_USER,JSON.stringify(u)); } catch {} };

// Upload image file to Supabase Storage, return public URL
async function uploadImage(file, bucket="proppy-images") {
  const ext  = file.name.split(".").pop();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await sb.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = sb.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// ─── TINY UI ──────────────────────────────────────────────────────────────────
const Dot   = ({color,size=6}) => <span style={{width:size,height:size,borderRadius:"50%",background:color,display:"inline-block",flexShrink:0}}/>;
const Badge = ({label,c,bg,bd,dot,sz=11}) => (
  <span style={{fontFamily:F,fontSize:sz,fontWeight:600,color:c,background:bg,border:`1px solid ${bd}`,borderRadius:20,padding:"2px 9px",display:"inline-flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}>
    {dot&&<Dot color={dot} size={5}/>}{label}
  </span>
);
const SBadge = ({s}) => { const m=S_META[s]; return m?<Badge label={m.label} c={m.c} bg={m.bg} bd={m.bd} dot={m.dot}/>:null; };

function Spinner() {
  return <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:40}}><div style={{width:28,height:28,border:`3px solid ${T.border}`,borderTop:`3px solid ${T.ink}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
}

function Toast({msg,color,onDone}) {
  useEffect(()=>{ const t=setTimeout(onDone,2500); return()=>clearTimeout(t); },[]);
  return <div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:color,color:"#fff",fontFamily:F,fontSize:13,fontWeight:700,borderRadius:20,padding:"10px 20px",zIndex:999,boxShadow:"0 4px 20px rgba(0,0,0,0.2)",whiteSpace:"nowrap",pointerEvents:"none"}}>{msg}</div>;
}

function Drawer({children,onClose,title}) {
  return (
    <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.28)",backdropFilter:"blur(2px)"}} onClick={onClose}/>
      <div style={{position:"relative",background:T.white,borderRadius:"20px 20px 0 0",maxHeight:"92vh",display:"flex",flexDirection:"column",boxShadow:"0 -4px 40px rgba(0,0,0,0.14)"}}>
        <div style={{padding:"10px 0 0",display:"flex",justifyContent:"center",flexShrink:0}}>
          <div style={{width:36,height:4,background:T.border,borderRadius:2}}/>
        </div>
        {title&&(
          <div style={{padding:"12px 20px 4px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
            <span style={{fontFamily:F,fontSize:17,fontWeight:700,color:T.ink}}>{title}</span>
            <button onClick={onClose} style={{background:T.bg,border:"none",borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:T.body}}>✕</button>
          </div>
        )}
        <div style={{overflowY:"auto",padding:"0 20px 32px",flex:1}}>{children}</div>
      </div>
    </div>
  );
}

// ─── SIGNUP ───────────────────────────────────────────────────────────────────
// ─── MOVIE QUOTES ─────────────────────────────────────────────────────────────
const QUOTES = [
  // ── Classic Cinema ──
  { text: "Every frame is a painting.", film: "Cinema" },
  { text: "Details make perfection, and perfection is not a detail.", film: "Leonardo da Vinci" },
  { text: "I'm going to make him an offer he can't refuse.", film: "The Godfather" },
  { text: "Get busy living, or get busy dying.", film: "The Shawshank Redemption" },
  { text: "Why so serious?", film: "The Dark Knight" },
  { text: "You can't handle the truth!", film: "A Few Good Men" },
  { text: "After all this time? Always.", film: "Harry Potter" },
  { text: "The stuff that dreams are made of.", film: "The Maltese Falcon" },
  { text: "I'll be back.", film: "The Terminator" },
  { text: "May the Force be with you.", film: "Star Wars" },
  { text: "Here's looking at you, kid.", film: "Casablanca" },
  { text: "With great power comes great responsibility.", film: "Spider-Man" },
  { text: "I am inevitable.", film: "Avengers: Endgame" },
  { text: "It's not who I am underneath, but what I do that defines me.", film: "Batman Begins" },
  { text: "The greatest trick the devil ever pulled was convincing the world he didn't exist.", film: "The Usual Suspects" },

  // ── One Piece ──
  { text: "I'm going to be King of the Pirates!", film: "One Piece — Monkey D. Luffy" },
  { text: "Nothing happened.", film: "One Piece — Roronoa Zoro" },
  { text: "Power isn't determined by your size, but the size of your heart and dreams!", film: "One Piece — Monkey D. Luffy" },
  { text: "I don't want to conquer anything. I just think the guy with the most freedom in this whole ocean is the Pirate King!", film: "One Piece — Monkey D. Luffy" },
  { text: "Bring on the hardship. It's preferred in a path of carnage.", film: "One Piece — Roronoa Zoro" },
  { text: "When do you think people die? When they are shot through the heart by the bullet of a pistol? No. When they are ravaged by an incurable disease? No. When they drink a soup made from a poisonous mushroom? No! It's when they are forgotten!", film: "One Piece — Dr. Hiluluk" },
  { text: "A person's dreams never die!", film: "One Piece — Dr. Hiluluk" },
  { text: "I want to live!", film: "One Piece — Nico Robin" },
  { text: "Only those who have suffered long can see the light within the shadows.", film: "One Piece — Roronoa Zoro" },
  { text: "There is someone that I must meet again. And until that day... not even death itself can take my life away!", film: "One Piece — Roronoa Zoro" },

  // ── Apex Legends ──
  { text: "Bleed, patch, and keep moving.", film: "Apex Legends — Lifeline" },
  { text: "Perceptive, resourceful, relentless. You must be all these things and more.", film: "Apex Legends — Ash" },
  { text: "No breath to steady, no heart to calm. Perfection.", film: "Apex Legends — Ash" },
  { text: "A mind is like a blade. Keep it honed.", film: "Apex Legends — Ash" },
  { text: "I am the master of my fate. And yours.", film: "Apex Legends — Ash" },
  { text: "The voices are real. Listen to them.", film: "Apex Legends — Wraith" },
  { text: "You show promise. I hope you can deliver.", film: "Apex Legends — Ash" },
  { text: "Feel free to breathe... if you have a respiratory system.", film: "Apex Legends — Pathfinder" },

  // ── Proppy Originals ──
  { text: "Every prop tells a story. Make it count.", film: "Proppy" },
  { text: "The set is yours. Own it.", film: "Proppy" },
  { text: "Good props don't just sit there. They act.", film: "Proppy" },
  { text: "Track it. Move it. Own it.", film: "Proppy" },
  { text: "No prop left behind.", film: "Proppy" },
  { text: "The difference between chaos and continuity is a great props team.", film: "Proppy" },
];

const ACCENT_COLORS = ["#F59E0B","#EF4444","#8B5CF6","#3B82F6","#16A34A","#EC4899","#0891B2"];

function LandingPage({ onEnter }) {
  const quote = useRef(QUOTES[Math.floor(Math.random() * QUOTES.length)]).current;
  const color = useRef(ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)]).current;

  return (
    <div style={{ minHeight:"100vh", background:"#0F0F0F", fontFamily:F, display:"flex", flexDirection:"column", padding:28, position:"relative", overflow:"hidden" }}>

      {/* Background colour blob */}
      <div style={{ position:"absolute", top:-120, right:-80, width:340, height:340, borderRadius:"50%", background:color, opacity:0.12, filter:"blur(80px)", pointerEvents:"none" }}/>
      <div style={{ position:"absolute", bottom:-100, left:-60, width:260, height:260, borderRadius:"50%", background:color, opacity:0.08, filter:"blur(60px)", pointerEvents:"none" }}/>

      {/* Top — Logo + project */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"auto" }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:38, height:38, background:color, borderRadius:11, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ color:"#fff", fontFamily:F, fontSize:16, fontWeight:900 }}>P</span>
            </div>
            <span style={{ fontFamily:F, fontSize:20, fontWeight:900, color:"#fff", letterSpacing:"-0.02em" }}>Proppy</span>
          </div>
        </div>
        <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:20, padding:"5px 12px" }}>
          <span style={{ fontFamily:F, fontSize:11, color:"rgba(255,255,255,0.5)", fontWeight:600 }}>Project Utopia</span>
        </div>
      </div>

      {/* Middle — Big headline */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", paddingTop:40, paddingBottom:20 }}>
        <div style={{ fontFamily:F, fontSize:13, fontWeight:700, color:color, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:16 }}>
          Props Management
        </div>
        <div style={{ fontFamily:F, fontSize:44, fontWeight:900, color:"#fff", lineHeight:1.1, letterSpacing:"-0.03em", marginBottom:32 }}>
          Track every<br/>
          <span style={{ color:color }}>prop.</span><br/>
          Every scene.
        </div>

        {/* Quote card */}
        <div style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderLeft:`3px solid ${color}`, borderRadius:12, padding:"16px 18px", marginBottom:40 }}>
          <div style={{ fontFamily:F, fontSize:15, fontWeight:600, color:"rgba(255,255,255,0.9)", lineHeight:1.5, marginBottom:8, fontStyle:"italic" }}>
            "{quote.text}"
          </div>
          <div style={{ fontFamily:F, fontSize:11, color:"rgba(255,255,255,0.35)", fontWeight:600, letterSpacing:"0.05em" }}>
            — {quote.film}
          </div>
        </div>


      </div>

      {/* Bottom — CTA */}
      <div>
        <button onClick={onEnter}
          style={{ width:"100%", fontFamily:F, fontSize:16, fontWeight:800, color:"#0F0F0F", background:color, border:"none", borderRadius:16, padding:"16px 0", cursor:"pointer", letterSpacing:"-0.01em", marginBottom:16 }}>
          Enter Proppy →
        </button>

      </div>
    </div>
  );
}

function SignupScreen({locs, onSignup}) {
  const units = locs.filter(l=>l.type==="Unit");
  // Three views: landing → crew list (login) → signup form (first time only)
  const [view,        setView]       = useState("landing");
  const [crew,        setCrew]       = useState([]);
  const [loadingCrew, setLoadingCrew]= useState(false);
  const [firstName,   setFirstName]  = useState("");
  const [surname,     setSurname]    = useState("");
  const [title,       setTitle]      = useState("");
  const [unitId,      setUnitId]     = useState(units[0]?.id||"");
  const [err,         setErr]        = useState("");
  const [saving,      setSaving]     = useState(false);

  const [loginFirst,   setLoginFirst]   = useState("");
  const [loginSurname, setLoginSurname] = useState("");
  const [loginErr,     setLoginErr]     = useState("");

  const loadCrew = async () => {
    setLoadingCrew(true);
    const {data} = await sb.from("proppy_users").select("*, unit:locations(id,name,color,bg,bd)").order("first_name");
    setCrew(data||[]);
    setLoadingCrew(false);
  };

  const handleNameLogin = async () => {
    if(!loginFirst.trim()||!loginSurname.trim()){ setLoginErr("Please enter your first name and surname"); return; }
    setLoadingCrew(true);
    setLoginErr("");
    const {data} = await sb.from("proppy_users")
      .select("*, unit:locations(id,name,color,bg,bd)")
      .ilike("first_name", loginFirst.trim())
      .ilike("surname",    loginSurname.trim())
      .limit(1);
    setLoadingCrew(false);
    if(data&&data.length>0){
      handleLogin(data[0]);
    } else {
      setLoginErr("No profile found. Check your name or create a new profile below.");
    }
  };

  const handleLogin = (u) => {
    const user = { id:u.id, name:`${u.first_name} ${u.surname}`, firstName:u.first_name, surname:u.surname, title:u.title, unitId:u.unit_id };
    saveUser(user);
    onSignup(user);
  };

  const handleSignup = async () => {
    if(!firstName.trim()||!surname.trim()) { setErr("Please enter your name and surname"); return; }
    if(!title)  { setErr("Please select your title"); return; }
    if(!unitId) { setErr("Please select your unit"); return; }
    setSaving(true);
    const { data, error } = await sb.from("proppy_users").insert({
      first_name: firstName.trim(), surname: surname.trim(), title, unit_id: unitId,
    }).select().single();
    if (error) { setErr("Could not save — check your connection"); setSaving(false); return; }
    const user = { id:data.id, name:`${firstName.trim()} ${surname.trim()}`, firstName:firstName.trim(), surname:surname.trim(), title, unitId };
    saveUser(user);
    onSignup(user);
  };

  // ── LANDING ──
  if (view==="landing") return <LandingPage onEnter={()=>{ setView("login"); loadCrew(); }}/>;

  // ── LOGIN — tap your name ──
  if (view==="login") return (
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:F,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:"100%",maxWidth:380}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:52,height:52,background:T.ink,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
            <span style={{color:"#fff",fontFamily:F,fontSize:20,fontWeight:800}}>P</span>
          </div>
          <div style={{fontFamily:F,fontSize:22,fontWeight:800,color:T.ink,letterSpacing:"-0.02em"}}>Sign in</div>
          <div style={{fontFamily:F,fontSize:13,color:T.muted,marginTop:4}}>Enter your name to continue</div>
        </div>

        <div style={{background:T.white,borderRadius:20,padding:"22px 22px 26px",boxShadow:"0 2px 20px rgba(0,0,0,0.07)",marginBottom:14}}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",gap:10}}>
              {[["First name",loginFirst,setLoginFirst,"First name"],["Surname",loginSurname,setLoginSurname,"Surname"]].map(([label,val,set,ph])=>(
                <div key={label} style={{flex:1}}>
                  <div style={{fontFamily:F,fontSize:12,fontWeight:600,color:T.body,marginBottom:5}}>{label}</div>
                  <input value={val} onChange={e=>set(e.target.value)} placeholder={ph}
                    style={{fontFamily:F,fontSize:13,color:T.ink,background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:10,padding:"9px 11px",outline:"none",width:"100%",boxSizing:"border-box"}}/>
                </div>
              ))}
            </div>
            {loginErr&&<div style={{fontFamily:F,fontSize:12,color:T.redDk,background:T.redBg,border:`1px solid ${T.redBd}`,borderRadius:8,padding:"8px 12px"}}>{loginErr}</div>}
            <button onClick={handleNameLogin} disabled={loadingCrew}
              style={{width:"100%",fontFamily:F,fontSize:14,fontWeight:700,color:"#fff",background:loadingCrew?"#888":T.ink,border:"none",borderRadius:12,padding:"13px 0",cursor:loadingCrew?"not-allowed":"pointer"}}>
              {loadingCrew?"Checking…":"Sign in →"}
            </button>
          </div>
        </div>

        <div style={{textAlign:"center",marginBottom:10}}>
          <span style={{fontFamily:F,fontSize:12,color:T.muted}}>New to Proppy? </span>
          <button onClick={()=>setView("signup")} style={{fontFamily:F,fontSize:12,fontWeight:700,color:T.ink,background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>
            Create profile
          </button>
        </div>
        <button onClick={()=>setView("landing")}
          style={{display:"block",margin:"0 auto",fontFamily:F,fontSize:12,color:T.muted,background:"none",border:"none",cursor:"pointer"}}>
          ← Back
        </button>
      </div>
    </div>
  );

  // ── SIGNUP — new crew member only ──
  return (
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:F,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:"100%",maxWidth:380}}>
        <div style={{textAlign:"center",marginBottom:22}}>
          <div style={{fontFamily:F,fontSize:22,fontWeight:800,color:T.ink,letterSpacing:"-0.02em"}}>New crew member</div>
          <div style={{fontFamily:F,fontSize:13,color:T.muted,marginTop:4}}>One-time setup — no email needed</div>
        </div>
        <div style={{background:T.white,borderRadius:20,padding:"22px 22px 26px",boxShadow:"0 2px 20px rgba(0,0,0,0.07)"}}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{display:"flex",gap:10}}>
              {[["First name",firstName,setFirstName,"First name"],["Surname",surname,setSurname,"Surname"]].map(([label,val,set,ph])=>(
                <div key={label} style={{flex:1}}>
                  <div style={{fontFamily:F,fontSize:12,fontWeight:600,color:T.body,marginBottom:5}}>{label}</div>
                  <input value={val} onChange={e=>set(e.target.value)} placeholder={ph}
                    style={{fontFamily:F,fontSize:13,color:T.ink,background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:10,padding:"9px 11px",outline:"none",width:"100%",boxSizing:"border-box"}}/>
                </div>
              ))}
            </div>
            <div>
              <div style={{fontFamily:F,fontSize:12,fontWeight:600,color:T.body,marginBottom:6}}>Your title</div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {TITLES.map(t=>{ const a=title===t; return (
                  <button key={t} onClick={()=>setTitle(t)}
                    style={{fontFamily:F,fontSize:11,fontWeight:a?700:500,color:a?"#fff":T.body,background:a?T.ink:T.bg,border:`1.5px solid ${a?T.ink:T.border}`,borderRadius:20,padding:"5px 12px",cursor:"pointer"}}>
                    {t}
                  </button>
                ); })}
              </div>
            </div>
            <div>
              <div style={{fontFamily:F,fontSize:12,fontWeight:600,color:T.body,marginBottom:6}}>Your unit</div>
              <div style={{display:"flex",gap:8}}>
                {units.map(loc=>{ const a=unitId===loc.id; return (
                  <button key={loc.id} onClick={()=>setUnitId(loc.id)}
                    style={{flex:1,fontFamily:F,fontSize:14,fontWeight:a?800:500,color:a?loc.color:T.body,background:a?loc.bg:T.bg,border:`2px solid ${a?loc.bd:T.border}`,borderRadius:14,padding:"14px 0",cursor:"pointer",transition:"all 0.15s"}}>
                    <div style={{fontSize:20,marginBottom:4}}>{loc.name==="Paramecia"?"🌊":"🐉"}</div>
                    {loc.name}
                  </button>
                ); })}
              </div>
            </div>
            {err&&<div style={{fontFamily:F,fontSize:12,color:T.redDk,background:T.redBg,border:`1px solid ${T.redBd}`,borderRadius:8,padding:"8px 12px"}}>{err}</div>}
            <button onClick={handleSignup} disabled={saving}
              style={{width:"100%",fontFamily:F,fontSize:14,fontWeight:700,color:"#fff",background:saving?"#888":T.ink,border:"none",borderRadius:12,padding:"13px 0",cursor:saving?"not-allowed":"pointer",marginTop:4}}>
              {saving?"Saving…":"Join the crew →"}
            </button>
          </div>
        </div>
        <button onClick={()=>setView("login")}
          style={{display:"block",margin:"14px auto 0",fontFamily:F,fontSize:12,color:T.muted,background:"none",border:"none",cursor:"pointer"}}>
          ← Back to crew list
        </button>
      </div>
    </div>
  );
}


// ─── PROP TIMELINE ────────────────────────────────────────────────────────────
function PropTimeline({prop, locs, onClose}) {
  const [log,  setLog]  = useState([]);
  const [busy, setBusy] = useState(true);

  useEffect(()=>{
    sb.from("prop_logs")
      .select("*")
      .eq("prop_id", prop.id)
      .order("timestamp", {ascending:false})
      .then(({data})=>{ setLog(data||[]); setBusy(false); });
  },[prop.id]);

  const actionMeta = {
    "ADDED":     {icon:"✦", c:T.blueDk,  bg:T.blueBg,  bd:T.blueBd},
    "SCAN OUT":  {icon:"📤", c:T.amberDk, bg:T.amberBg, bd:T.amberBd},
    "SCAN IN":   {icon:"📥", c:T.greenDk, bg:T.greenBg, bd:T.greenBd},
    "BULK MOVE": {icon:"📦", c:T.purpleDk,bg:T.purpleBg,bd:T.purpleBd},
    "EDITED":    {icon:"✏️",  c:T.muted,   bg:T.bg,      bd:T.border},
  };

  return (
    <Drawer onClose={onClose} title={null}>
      <div style={{margin:"8px 0 16px",paddingBottom:14,borderBottom:`1px solid ${T.border}`}}>
        <div style={{fontFamily:F,fontSize:18,fontWeight:800,color:T.ink,marginBottom:6}}>{prop.name}</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <SBadge s={prop.status}/>
          <Badge label={prop.in_box?"In box":"Out of box"} c={prop.in_box?T.greenDk:T.amberDk} bg={prop.in_box?T.greenBg:T.amberBg} bd={prop.in_box?T.greenBd:T.amberBd} sz={10}/>
        </div>
      </div>
      <div style={{fontFamily:F,fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:12}}>Movement History</div>
      {busy ? <Spinner/> : log.length===0
        ? <div style={{textAlign:"center",padding:"30px 0",fontFamily:F,fontSize:13,color:T.muted}}>No history yet</div>
        : (
          <div style={{position:"relative"}}>
            <div style={{position:"absolute",left:19,top:24,bottom:8,width:2,background:T.border,zIndex:0}}/>
            {log.map((entry,i)=>{
              const loc  = locs.find(l=>l.id===entry.location_id);
              const meta = actionMeta[entry.action]||actionMeta["EDITED"];
              const isLatest = i===0;
              const time = new Date(entry.timestamp).toLocaleString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
              return (
                <div key={entry.id} style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:16,position:"relative",zIndex:1}}>
                  <div style={{width:40,height:40,borderRadius:12,background:isLatest?meta.bg:T.white,border:`2px solid ${isLatest?meta.bd:T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0,boxShadow:isLatest?"0 2px 8px rgba(0,0,0,0.08)":"none"}}>
                    {meta.icon}
                  </div>
                  <div style={{flex:1,background:isLatest?meta.bg:T.bg,border:`1px solid ${isLatest?meta.bd:T.border}`,borderRadius:12,padding:"10px 14px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                      <span style={{fontFamily:F,fontSize:13,fontWeight:700,color:isLatest?meta.c:T.ink}}>{entry.action}</span>
                      <span style={{fontFamily:F,fontSize:10,color:T.muted,flexShrink:0,marginLeft:8}}>{time}</span>
                    </div>
                    <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
                      {loc&&<Badge label={loc.name} c={loc.color} bg={loc.bg} bd={loc.bd} sz={10}/>}
                      {entry.scene&&<span style={{fontFamily:F,fontSize:10,color:T.muted}}>Sc {entry.scene}</span>}
                    </div>
                    {entry.user_name&&(
                      <div style={{display:"flex",alignItems:"center",gap:6,marginTop:6}}>
                        <div style={{width:20,height:20,borderRadius:6,background:T.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:T.body,flexShrink:0}}>
                          {initials(entry.user_name)}
                        </div>
                        <span style={{fontFamily:F,fontSize:11,color:T.body}}>{entry.user_name}</span>
                        {entry.user_title&&<span style={{fontFamily:F,fontSize:10,color:T.muted}}>· {entry.user_title}</span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      }
    </Drawer>
  );
}

// ─── REAL QR ──────────────────────────────────────────────────────────────────
function RealQR({value,size=140}){
  const ref=useRef();
  useEffect(()=>{
    if(!value||!ref.current)return;
    QRCodeLib.toCanvas(ref.current,value,{width:size,margin:2,color:{dark:"#1A1A1A",light:"#FFFFFF"}},err=>{if(err)console.error(err);});
  },[value,size]);
  return <div style={{width:size,height:size,background:"#fff",borderRadius:8,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center"}}><canvas ref={ref}/></div>;
}

function QRLabelDrawer({item,type,onClose}){
  const val=`PROPPY:${type}:${item.id}:${(item.name||item.box_label||"").replace(/\s/g,"_")}`;
  const ref=useRef();
  const print=()=>{
    const canvas=ref.current?.querySelector("canvas");
    const src=canvas?canvas.toDataURL("image/png"):"";
    const w=window.open("","_blank");
    w.document.write(`<html><head><title>PROPPY Label</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fff}.card{border:1px solid #ddd;border-radius:12px;padding:20px 24px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px}</style></head><body><div class="card"><p style="font-size:9px;letter-spacing:0.12em;color:#aaa">PROPPY · PROJECT UTOPIA</p>${src?`<img alt="" src="${src}" width="140" height="140" style="border-radius:6px"/>`:""}  <p style="font-size:15px;font-weight:700">${item.name||""}</p>${item.box_label?`<p style="font-size:12px;color:#888">${item.box_label}</p>`:""}${item.scene?`<p style="font-size:12px;color:#888">Sc ${item.scene}</p>`:""}<p style="font-size:8px;color:#bbb;margin-top:4px;word-break:break-all">${val}</p></div></body></html>`);
    w.document.close();setTimeout(()=>{w.print();w.close();},500);
  };
  return (
    <div style={{paddingTop:4}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <span style={{fontFamily:F,fontSize:17,fontWeight:700,color:T.ink}}>QR Label</span>
        <button onClick={onClose} style={{background:T.bg,border:"none",borderRadius:"50%",width:28,height:28,cursor:"pointer",color:T.body}}>✕</button>
      </div>
      <div ref={ref} style={{background:T.white,border:`1.5px solid ${T.border}`,borderRadius:16,padding:"20px 24px",display:"flex",flexDirection:"column",alignItems:"center",gap:12,marginBottom:16}}>
        <span style={{fontFamily:F,fontSize:9,fontWeight:700,color:T.muted,letterSpacing:"0.14em"}}>PROPPY · PROJECT UTOPIA</span>
        <RealQR value={val} size={140}/>
        <div style={{textAlign:"center"}}>
          <div style={{fontFamily:F,fontSize:15,fontWeight:700,color:T.ink}}>{item.name}</div>
          {item.box_label&&<div style={{fontFamily:F,fontSize:12,color:T.muted,marginTop:2}}>{item.box_label}</div>}
          {item.scene&&<div style={{fontFamily:F,fontSize:12,color:T.muted}}>Sc {item.scene}</div>}
          {item.status&&<div style={{marginTop:8}}><SBadge s={item.status}/></div>}
          <div style={{fontFamily:F,fontSize:8,color:T.muted,marginTop:8,wordBreak:"break-all"}}>{val}</div>
        </div>
      </div>
      <div style={{display:"flex",gap:10}}>
        <button onClick={print} style={{flex:1,fontFamily:F,fontSize:13,fontWeight:700,color:"#fff",background:T.ink,border:"none",borderRadius:12,padding:"11px 0",cursor:"pointer"}}>🖨 Print</button>
        <button onClick={onClose} style={{flex:1,fontFamily:F,fontSize:13,fontWeight:600,color:T.body,background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:12,padding:"11px 0",cursor:"pointer"}}>Close</button>
      </div>
    </div>
  );
}

// ─── CAMERA SCANNER ───────────────────────────────────────────────────────────
function CameraScanner({onScan}){
  const videoRef=useRef(),canvasRef=useRef(),rafRef=useRef(),streamRef=useRef();
  const [status,setStatus]=useState("loading");
  const [errMsg,setErrMsg]=useState("");
  const [torch,setTorch]=useState(false);
  useEffect(()=>{
    navigator.mediaDevices?.getUserMedia({video:{facingMode:"environment",width:{ideal:1280},height:{ideal:720}}})
      .then(stream=>{streamRef.current=stream;if(videoRef.current){videoRef.current.srcObject=stream;videoRef.current.play();}setStatus("ready");})
      .catch(err=>{setStatus("error");setErrMsg(err.name==="NotAllowedError"?"Camera permission denied.":"Camera unavailable.");});
    return()=>{cancelAnimationFrame(rafRef.current);streamRef.current?.getTracks().forEach(t=>t.stop());};
  },[]);
  useEffect(()=>{
    if(status!=="ready")return;
    const tick=()=>{
      const video=videoRef.current,canvas=canvasRef.current;
      if(video&&canvas&&video.readyState===video.HAVE_ENOUGH_DATA){
        canvas.width=video.videoWidth;canvas.height=video.videoHeight;
        const ctx=canvas.getContext("2d");ctx.drawImage(video,0,0);
        const d=ctx.getImageData(0,0,canvas.width,canvas.height);
        const code=jsQRLib(d.data,d.width,d.height,{inversionAttempts:"dontInvert"});
        if(code){onScan(code.data);return;}
      }
      rafRef.current=requestAnimationFrame(tick);
    };
    rafRef.current=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(rafRef.current);
  },[status,onScan]);
  const toggleTorch=async()=>{const track=streamRef.current?.getVideoTracks()[0];if(!track)return;try{await track.applyConstraints({advanced:[{torch:!torch}]});setTorch(t=>!t);}catch(_){}};
  return (
    <div style={{width:"100%",borderRadius:16,overflow:"hidden",background:"#111",position:"relative",aspectRatio:"4/3",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <video ref={videoRef} style={{width:"100%",height:"100%",objectFit:"cover",display:status==="ready"?"block":"none"}} playsInline muted/>
      <canvas ref={canvasRef} style={{display:"none"}}/>
      {status==="loading"&&<div style={{color:"#fff",fontFamily:F,fontSize:13,textAlign:"center"}}><div style={{fontSize:30,marginBottom:8}}>📷</div>Starting camera…</div>}
      {status==="error"&&<div style={{color:"#fff",fontFamily:F,fontSize:12,textAlign:"center",padding:20,lineHeight:1.6}}><div style={{fontSize:28,marginBottom:8}}>⚠️</div>{errMsg}</div>}
      {status==="ready"&&(
        <>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
            <div style={{width:170,height:170,position:"relative"}}>
              {[{t:0,l:0,bT:"3px",bL:"3px",r:"6px 0 0 0"},{t:0,right:0,bT:"3px",bR:"3px",r:"0 6px 0 0"},{b:0,l:0,bB:"3px",bL:"3px",r:"0 0 0 6px"},{b:0,right:0,bB:"3px",bR:"3px",r:"0 0 6px 0"}].map((c,i)=>(
                <div key={i} style={{position:"absolute",width:22,height:22,top:c.t,bottom:c.b,left:c.l,right:c.right,borderTop:c.bT?`${c.bT} solid ${T.green}`:"none",borderLeft:c.bL?`${c.bL} solid ${T.green}`:"none",borderRight:c.bR?`${c.bR} solid ${T.green}`:"none",borderBottom:c.bB?`${c.bB} solid ${T.green}`:"none",borderRadius:c.r}}/>
              ))}
              <div style={{position:"absolute",inset:-2000,boxShadow:"inset 0 0 0 2000px rgba(0,0,0,0.45)",pointerEvents:"none"}}/>
            </div>
          </div>
          <button onClick={toggleTorch} style={{position:"absolute",bottom:10,right:10,background:"rgba(0,0,0,0.5)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:8,padding:"5px 10px",color:torch?"#FFD60A":"#fff",fontFamily:F,fontSize:11,cursor:"pointer"}}>{torch?"🔦 On":"🔦 Off"}</button>
        </>
      )}
    </div>
  );
}

// ─── BULK QR UPLOAD ───────────────────────────────────────────────────────────
function BulkQRUpload({props,locs,user,onBulkMove,onClose}){
  const [results, setResults] = useState([]);
  const [toLoc,   setToLoc]   = useState(locs[0]?.id||"");
  const [scene,   setScene]   = useState("");
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const fileRef = useRef();

  const decodeImage = (file) => new Promise(resolve=>{
    const img=new Image(),url=URL.createObjectURL(file);
    img.onload=()=>{
      const c=document.createElement("canvas");
      c.width=img.width;c.height=img.height;
      const ctx=c.getContext("2d");ctx.drawImage(img,0,0);
      const d=ctx.getImageData(0,0,c.width,c.height);
      const code=jsQRLib(d.data,d.width,d.height,{inversionAttempts:"attemptBoth"});
      URL.revokeObjectURL(url);resolve(code?.data||null);
    };
    img.onerror=()=>{URL.revokeObjectURL(url);resolve(null);};
    img.src=url;
  });

  const handleFiles=async(files)=>{
    setLoading(true);
    const found=[];
    for(const file of files){
      const raw=await decodeImage(file);
      if(!raw){found.push({file:file.name,propId:null,propName:null,status:"unreadable"});continue;}
      const parts=raw.split(":");
      if(parts[0]==="PROPPY"&&parts[1]==="PROP"){
        const prop=props.find(p=>p.id===parts[2]);
        if(prop) found.push({file:file.name,propId:prop.id,propName:prop.name,status:"found",checked:true});
        else     found.push({file:file.name,propId:null,propName:parts[3]?.replace(/_/g," ")||"Unknown",status:"not_found"});
      } else {
        found.push({file:file.name,propId:null,propName:null,status:"unreadable"});
      }
    }
    setResults(found);setLoading(false);
  };

  const readyCount=results.filter(r=>r.status==="found"&&r.checked!==false).length;
  const destLoc=locs.find(l=>l.id===toLoc);

  if(done) return (
    <div style={{textAlign:"center",padding:"30px 0"}}>
      <div style={{fontSize:44,marginBottom:12}}>✅</div>
      <div style={{fontFamily:F,fontSize:16,fontWeight:700,color:T.ink,marginBottom:4}}>{readyCount} props moved</div>
      <div style={{fontFamily:F,fontSize:13,color:T.muted,marginBottom:20}}>All moved to {destLoc?.name}</div>
      <button onClick={onClose} style={{fontFamily:F,fontSize:13,fontWeight:700,color:"#fff",background:T.ink,border:"none",borderRadius:12,padding:"10px 24px",cursor:"pointer"}}>Done</button>
    </div>
  );

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div>
          <div style={{fontFamily:F,fontSize:17,fontWeight:700,color:T.ink}}>Bulk QR Transfer</div>
          <div style={{fontFamily:F,fontSize:12,color:T.muted,marginTop:2}}>Upload multiple QR photos at once</div>
        </div>
        <button onClick={onClose} style={{background:T.bg,border:"none",borderRadius:"50%",width:28,height:28,cursor:"pointer",color:T.body}}>✕</button>
      </div>
      {results.length===0&&!loading&&(
        <div onClick={()=>fileRef.current.click()}
          style={{border:`2px dashed ${T.border}`,borderRadius:16,padding:"32px 20px",textAlign:"center",cursor:"pointer",marginBottom:16}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=T.ink;e.currentTarget.style.background=T.bg;}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.background="transparent";}}>
          <div style={{fontSize:36,marginBottom:8}}>📸</div>
          <div style={{fontFamily:F,fontSize:14,fontWeight:700,color:T.ink,marginBottom:4}}>Upload QR code images</div>
          <div style={{fontFamily:F,fontSize:12,color:T.muted}}>Select multiple photos of prop QR labels</div>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>handleFiles([...e.target.files])}/>
        </div>
      )}
      {loading&&<div style={{textAlign:"center",padding:"30px 0"}}><div style={{fontSize:32,marginBottom:8}}>🔍</div><div style={{fontFamily:F,fontSize:14,color:T.body}}>Reading QR codes…</div></div>}
      {results.length>0&&(
        <>
          <div style={{marginBottom:12}}>
            {results.map((r,i)=>{
              const statusIcon=r.status==="found"?"✓":r.status==="not_found"?"?":"✕";
              const statusColor=r.status==="found"?T.greenDk:r.status==="not_found"?T.amberDk:T.redDk;
              const statusBg=r.status==="found"?T.greenBg:r.status==="not_found"?T.amberBg:T.redBg;
              return(
                <div key={i} style={{display:"flex",gap:10,alignItems:"center",padding:"9px 12px",background:statusBg,borderRadius:10,marginBottom:4}}>
                  <span style={{fontSize:14,color:statusColor,flexShrink:0}}>{statusIcon}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:F,fontSize:12,fontWeight:600,color:T.ink}}>{r.propName||r.file}</div>
                    <div style={{fontFamily:F,fontSize:10,color:T.muted}}>{r.status==="found"?"Ready to move":r.status==="not_found"?"Not in database":"QR unreadable"}</div>
                  </div>
                  {r.status==="found"&&(
                    <button onClick={()=>setResults(rs=>rs.map((x,j)=>j===i?{...x,checked:!x.checked}:x))}
                      style={{width:22,height:22,borderRadius:6,background:r.checked!==false?T.greenDk:"#fff",border:`2px solid ${r.checked!==false?T.greenDk:T.border}`,cursor:"pointer",color:"#fff",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      {r.checked!==false?"✓":""}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <button onClick={()=>setResults([])} style={{fontFamily:F,fontSize:12,color:T.muted,background:"none",border:`1px solid ${T.border}`,borderRadius:20,padding:"4px 12px",cursor:"pointer",marginBottom:14}}>↩ Re-scan</button>
          {readyCount>0&&(
            <>
              <div style={{fontFamily:F,fontSize:12,fontWeight:600,color:T.body,marginBottom:6}}>Move {readyCount} prop{readyCount!==1?"s":""} to</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
                {locs.map(l=>{const a=toLoc===l.id;return(
                  <button key={l.id} onClick={()=>setToLoc(l.id)} style={{fontFamily:F,fontSize:12,fontWeight:a?700:500,color:a?l.color:T.body,background:a?l.bg:T.bg,border:`1.5px solid ${a?l.bd:T.border}`,borderRadius:20,padding:"5px 14px",cursor:"pointer"}}>{l.name}</button>
                );})}
              </div>
              <div style={{marginBottom:14}}>
                <div style={{fontFamily:F,fontSize:12,fontWeight:600,color:T.body,marginBottom:5}}>Scene (optional)</div>
                <input value={scene} onChange={e=>setScene(e.target.value)} placeholder="e.g. 12"
                  style={{fontFamily:F,fontSize:13,color:T.ink,background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:10,padding:"9px 12px",outline:"none",width:"100%",boxSizing:"border-box"}}/>
              </div>
              <button onClick={()=>{onBulkMove(results.filter(r=>r.status==="found"&&r.checked!==false).map(r=>r.propId),toLoc,scene);setDone(true);}}
                style={{width:"100%",fontFamily:F,fontSize:14,fontWeight:700,color:"#fff",background:T.purpleDk,border:"none",borderRadius:12,padding:"13px 0",cursor:"pointer"}}>
                📦 Move {readyCount} props → {destLoc?.name}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── SCAN ACTION ──────────────────────────────────────────────────────────────
function ScanAction({prop,locs,onScanOut,onScanIn,onClose}){
  const [toLoc,setToLoc]=useState(locs[0]?.id||"");
  const [scene,setScene]=useState(prop?.scene||"");
  const isOut=prop?.in_box;
  const dest=locs.find(l=>l.id===toLoc);
  return(
    <div style={{paddingTop:8}}>
      <div style={{display:"flex",gap:12,alignItems:"center",paddingBottom:14,borderBottom:`1px solid ${T.border}`,marginBottom:16}}>
        <div style={{width:48,height:48,borderRadius:12,background:T.bg,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:prop.image_url?0:22}}>
          {prop.image_url?<img src={prop.image_url} alt={prop.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:"📦"}
        </div>
        <div>
          <div style={{fontFamily:F,fontSize:16,fontWeight:700,color:T.ink,marginBottom:4}}>{prop?.name}</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            <SBadge s={prop?.status}/>
            <Badge label={isOut?"In box":"Out of box"} c={isOut?T.greenDk:T.amberDk} bg={isOut?T.greenBg:T.amberBg} bd={isOut?T.greenBd:T.amberBd} sz={10}/>
          </div>
        </div>
      </div>
      {isOut?(
        <div>
          <div style={{fontFamily:F,fontSize:15,fontWeight:700,color:T.ink,marginBottom:14}}>Where is this going?</div>
          <div style={{marginBottom:12}}>
            <div style={{fontFamily:F,fontSize:12,fontWeight:600,color:T.body,marginBottom:6}}>Going to</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {locs.map(l=>{const a=toLoc===l.id;return(
                <button key={l.id} onClick={()=>setToLoc(l.id)} style={{fontFamily:F,fontSize:12,fontWeight:a?700:500,color:a?l.color:T.body,background:a?l.bg:T.bg,border:`1.5px solid ${a?l.bd:T.border}`,borderRadius:20,padding:"5px 14px",cursor:"pointer"}}>{l.name}</button>
              );})}
            </div>
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontFamily:F,fontSize:12,fontWeight:600,color:T.body,marginBottom:5}}>Scene</div>
            <input value={scene} onChange={e=>setScene(e.target.value)} placeholder="e.g. 12"
              style={{fontFamily:F,fontSize:13,color:T.ink,background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:10,padding:"9px 12px",outline:"none",width:"100%",boxSizing:"border-box"}}/>
          </div>
          <button onClick={()=>onScanOut(prop.id,toLoc,scene)} style={{width:"100%",fontFamily:F,fontSize:14,fontWeight:700,color:"#fff",background:T.amberDk,border:"none",borderRadius:12,padding:"13px 0",cursor:"pointer"}}>
            📤 Scan Out → {dest?.name}
          </button>
        </div>
      ):(
        <div>
          <div style={{fontFamily:F,fontSize:15,fontWeight:700,color:T.ink,marginBottom:12}}>Scan in — returning to box</div>
          <div style={{background:T.greenBg,border:`1px solid ${T.greenBd}`,borderRadius:12,padding:"12px 14px",marginBottom:16}}>
            <span style={{fontFamily:F,fontSize:13,color:T.greenDk,fontWeight:600}}>✓ This will mark the prop as back in box.</span>
          </div>
          <button onClick={()=>onScanIn(prop.id)} style={{width:"100%",fontFamily:F,fontSize:14,fontWeight:700,color:"#fff",background:T.greenDk,border:"none",borderRadius:12,padding:"13px 0",cursor:"pointer"}}>
            📥 Confirm Scan In
          </button>
        </div>
      )}
      <button onClick={onClose} style={{width:"100%",fontFamily:F,fontSize:13,fontWeight:500,color:T.muted,background:"none",border:"none",padding:"12px 0",cursor:"pointer",marginTop:4}}>Cancel</button>
    </div>
  );
}

// ─── SCANNER SCREEN ───────────────────────────────────────────────────────────
function ScannerScreen({props,chars,locs,user,onScanOut,onScanIn,onBulkMove,onClose}){
  const [scanned,setScanned]=useState(null);
  const [search, setSearch] =useState("");
  const [toast,  setToast]  =useState(null);
  const [mode,   setMode]   =useState("camera");
  const showToast=(msg,color)=>{setToast({msg,color});setTimeout(()=>setToast(null),2500);};
  const handleRaw=useCallback(raw=>{
    const parts=raw.split(":");
    if(parts[0]==="PROPPY"&&parts[1]==="PROP"){const found=props.find(p=>p.id===parts[2]);if(found){setScanned(found);return;}}
    showToast("Unknown QR code",T.redDk);
  },[props]);
  const handleScanOut=(id,loc,scene)=>{onScanOut(id,loc,scene);setScanned(null);showToast(`📤 Scanned out → ${locs.find(l=>l.id===loc)?.name}`,T.amberDk);};
  const handleScanIn=(id)=>{onScanIn(id);setScanned(null);showToast("📥 Back in box",T.greenDk);};
  const results=search.length>1?props.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())||chars.find(c=>c.id===p.character_id)?.name.toLowerCase().includes(search.toLowerCase())):[];
  return(
    <div style={{position:"fixed",inset:0,background:T.white,zIndex:300,display:"flex",flexDirection:"column",maxWidth:480,margin:"0 auto"}}>
      <div style={{background:T.white,borderBottom:`1px solid ${T.border}`,padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <div>
          <span style={{fontFamily:F,fontSize:17,fontWeight:800,color:T.ink}}>Scan</span>
          {user&&<span style={{fontFamily:F,fontSize:11,color:T.muted,marginLeft:8}}>as {user.name}</span>}
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setMode(m=>m==="camera"?"bulk":"camera")}
            style={{fontFamily:F,fontSize:11,fontWeight:600,color:mode==="bulk"?T.purpleDk:T.body,background:mode==="bulk"?T.purpleBg:T.bg,border:`1.5px solid ${mode==="bulk"?T.purpleBd:T.border}`,borderRadius:20,padding:"5px 12px",cursor:"pointer"}}>
            📦 Bulk
          </button>
          <button onClick={onClose} style={{background:T.bg,border:"none",borderRadius:"50%",width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:16,color:T.body}}>✕</button>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"16px 20px 40px"}}>
        {mode==="bulk"?(
          <BulkQRUpload props={props} locs={locs} user={user} onBulkMove={onBulkMove} onClose={onClose}/>
        ):(
          <>
            <div style={{marginBottom:18}}>
              <div style={{fontFamily:F,fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Camera</div>
              <CameraScanner onScan={handleRaw}/>
              <p style={{fontFamily:F,fontSize:11,color:T.muted,textAlign:"center",marginTop:8}}>Point at any Proppy QR code</p>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <div style={{flex:1,height:1,background:T.border}}/>
              <span style={{fontFamily:F,fontSize:11,color:T.muted,fontWeight:600}}>OR SEARCH</span>
              <div style={{flex:1,height:1,background:T.border}}/>
            </div>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search prop or character…"
              style={{fontFamily:F,fontSize:13,color:T.ink,background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:12,padding:"11px 14px",outline:"none",width:"100%",boxSizing:"border-box",marginBottom:10}}/>
            {results.map(p=>{
              const ch=chars.find(c=>c.id===p.character_id);
              const pLoc=locs.find(l=>l.id===p.location_id);
              return(
                <button key={p.id} onClick={()=>setScanned(p)}
                  style={{width:"100%",display:"flex",gap:10,alignItems:"center",background:T.bg,border:"none",borderRadius:12,padding:"10px 12px",cursor:"pointer",marginBottom:4,textAlign:"left"}}
                  onMouseEnter={e=>e.currentTarget.style.background="#EEEEEE"}
                  onMouseLeave={e=>e.currentTarget.style.background=T.bg}>
                  <div style={{width:36,height:36,borderRadius:9,background:T.white,border:`1px solid ${T.border}`,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:16}}>
                    {p.image_url?<img src={p.image_url} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:"📦"}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:F,fontSize:13,fontWeight:600,color:T.ink,marginBottom:2}}>{p.name}</div>
                    <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                      {ch&&<span style={{fontFamily:F,fontSize:10,color:T.muted}}>{ch.name}</span>}
                      <SBadge s={p.status}/>
                      {pLoc&&<Badge label={pLoc.name} c={pLoc.color} bg={pLoc.bg} bd={pLoc.bd} sz={9}/>}
                      {!p.in_box&&<Badge label="out" c={T.amberDk} bg={T.amberBg} bd={T.amberBd} sz={9}/>}
                    </div>
                  </div>
                  <span style={{fontFamily:F,fontSize:12,fontWeight:700,color:p.in_box?T.amberDk:T.greenDk,flexShrink:0}}>{p.in_box?"📤":"📥"}</span>
                </button>
              );
            })}
            {search.length>1&&results.length===0&&<div style={{textAlign:"center",padding:"12px 0",fontFamily:F,fontSize:13,color:T.muted}}>No props found</div>}
          </>
        )}
      </div>
      {scanned&&(
        <div style={{position:"absolute",inset:0,zIndex:10,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.3)"}} onClick={()=>setScanned(null)}/>
          <div style={{position:"relative",background:T.white,borderRadius:"20px 20px 0 0",padding:"8px 20px 32px",boxShadow:"0 -4px 40px rgba(0,0,0,0.14)",maxHeight:"85vh",overflowY:"auto"}}>
            <div style={{width:36,height:4,background:T.border,borderRadius:2,margin:"0 auto 8px"}}/>
            <ScanAction prop={scanned} locs={locs} onScanOut={handleScanOut} onScanIn={handleScanIn} onClose={()=>setScanned(null)}/>
          </div>
        </div>
      )}
      {toast&&<Toast msg={toast.msg} color={toast.color} onDone={()=>setToast(null)}/> }

    </div>
  );
}

// ─── CHARACTER POPUP ─────────────────────────────────────────────────────────
function CharPopup({char,allProps,locs,onClose,onAddProp,onEditProp,onScanProp,onViewTimeline}){
  const cp=allProps.filter(p=>p.character_id===char.id);
  const out=cp.filter(p=>!p.in_box);
  const [qrProp,setQrProp]=useState(null);
  return(
    <Drawer onClose={onClose} title={null}>
      <div style={{display:"flex",gap:14,alignItems:"center",margin:"8px 0 14px",paddingBottom:14,borderBottom:`1px solid ${T.border}`}}>
        <div style={{width:52,height:52,borderRadius:14,background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:800,color:T.ink,fontFamily:F,flexShrink:0,overflow:"hidden"}}>
          {char.image_url?<img src={char.image_url} alt={char.name} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:14}}/>:initials(char.name)}
        </div>
        <div style={{flex:1}}>
          <div style={{fontFamily:F,fontSize:18,fontWeight:800,color:T.ink,marginBottom:2}}>{char.name}</div>
          <div style={{fontFamily:F,fontSize:12,color:T.muted}}>{char.box_label}{char.scenes?` · Sc ${char.scenes}`:""}</div>
        </div>
        <button onClick={onClose} style={{background:T.bg,border:"none",borderRadius:"50%",width:28,height:28,cursor:"pointer",fontSize:14,color:T.body,flexShrink:0}}>✕</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
        {[
          {n:cp.length,label:"Props",c:T.blueDk,bg:T.blueBg},
          {n:cp.filter(p=>p.status==="HERO").length,label:"Hero",c:T.greenDk,bg:T.greenBg},
          {n:out.length,label:"Out",c:out.length>0?T.amberDk:T.muted,bg:out.length>0?T.amberBg:T.bg},
        ].map(s=>(
          <div key={s.label} style={{background:s.bg,borderRadius:12,padding:"10px 0",textAlign:"center"}}>
            <div style={{fontFamily:F,fontSize:20,fontWeight:800,color:s.c,lineHeight:1}}>{s.n}</div>
            <div style={{fontFamily:F,fontSize:10,fontWeight:600,color:s.c,marginTop:3}}>{s.label}</div>
          </div>
        ))}
      </div>
      {out.length>0&&(
        <div style={{background:T.amberBg,border:`1px solid ${T.amberBd}`,borderRadius:12,padding:"10px 14px",marginBottom:12}}>
          <div style={{fontFamily:F,fontSize:11,fontWeight:700,color:T.amberDk,marginBottom:6}}>Out of box</div>
          {out.map(p=>{
            const pLoc=locs.find(l=>l.id===p.location_id);
            return(
              <div key={p.id} style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                <Dot color={T.amber}/>
                <span style={{fontFamily:F,fontSize:13,color:T.ink,flex:1}}>{p.name}</span>
                {pLoc&&<Badge label={pLoc.name} c={pLoc.color} bg={pLoc.bg} bd={pLoc.bd} sz={10}/>}
              </div>
            );
          })}
        </div>
      )}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <span style={{fontFamily:F,fontSize:13,fontWeight:700,color:T.ink}}>Props ({cp.length})</span>
        <button onClick={onAddProp} style={{fontFamily:F,fontSize:12,fontWeight:600,color:"#fff",background:T.ink,border:"none",borderRadius:20,padding:"4px 12px",cursor:"pointer"}}>+ Add</button>
      </div>
      {cp.length===0&&<div style={{textAlign:"center",padding:"20px 0",fontFamily:F,fontSize:13,color:T.muted}}>No props yet</div>}
      {cp.map(p=>{
        const pLoc=locs.find(l=>l.id===p.location_id);
        return(
          <div key={p.id} style={{marginBottom:3}}>
            <div style={{display:"flex",gap:10,alignItems:"center",padding:"10px 10px",background:T.bg,borderRadius:12,cursor:"pointer"}}
              onMouseEnter={e=>e.currentTarget.style.background="#EEEEEE"}
              onMouseLeave={e=>e.currentTarget.style.background=T.bg}
              onClick={()=>onEditProp(p)}>
              <div style={{width:40,height:40,borderRadius:10,background:T.white,border:`1px solid ${T.border}`,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:16}}>
                {p.image_url?<img src={p.image_url} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:"📦"}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:F,fontSize:13,fontWeight:600,color:T.ink,marginBottom:3,display:"flex",gap:5,alignItems:"center"}}>
                  {p.name}
                  {!p.in_box&&<Badge label="out" c={T.amberDk} bg={T.amberBg} bd={T.amberBd} sz={9}/>}
                </div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  <SBadge s={p.status}/>
                  {pLoc&&<Badge label={pLoc.name} c={pLoc.color} bg={pLoc.bg} bd={pLoc.bd} sz={9}/>}
                  {p.scene&&<span style={{fontFamily:F,fontSize:10,color:T.muted}}>Sc {p.scene}</span>}
                </div>
              </div>
              <div style={{display:"flex",gap:4,flexShrink:0}} onClick={e=>e.stopPropagation()}>
                <button onClick={()=>setQrProp(p)} style={{fontFamily:F,fontSize:10,fontWeight:600,color:T.body,background:T.white,border:`1px solid ${T.border}`,borderRadius:8,padding:"4px 7px",cursor:"pointer"}}>QR</button>
                <button onClick={()=>onScanProp(p)} style={{fontFamily:F,fontSize:11,fontWeight:700,color:"#fff",background:p.in_box?T.amberDk:T.greenDk,border:"none",borderRadius:8,padding:"5px 9px",cursor:"pointer"}}>{p.in_box?"📤":"📥"}</button>
                <button onClick={()=>onViewTimeline(p)} style={{fontFamily:F,fontSize:10,fontWeight:600,color:T.blueDk,background:T.blueBg,border:`1px solid ${T.blueBd}`,borderRadius:8,padding:"4px 7px",cursor:"pointer"}}>⏱</button>
              </div>
            </div>
            {qrProp?.id===p.id&&(
              <div style={{background:T.bg,border:`1px solid ${T.border}`,borderTop:"none",borderRadius:"0 0 12px 12px",padding:"14px"}}>
                <QRLabelDrawer item={p} type="PROP" onClose={()=>setQrProp(null)}/>
              </div>
            )}
          </div>
        );
      })}
    </Drawer>
  );
}

// ─── PROP EDIT DRAWER ─────────────────────────────────────────────────────────
function PropDrawer({prop,chars,locs,user,onClose,onSave}){
  const [f,setF]=useState({...prop});
  const [imgFile,setImgFile]=useState(null);
  const [saving,setSaving]=useState(false);
  const fileRef=useRef();
  const pickImg=e=>{
    const file=e.target.files[0];if(!file)return;
    setImgFile(file);
    const r=new FileReader();r.onload=ev=>setF(x=>({...x,image_url:ev.target.result}));r.readAsDataURL(file);
  };
  const handleSave=async()=>{
    setSaving(true);
    let imageUrl=f.image_url;
    // Upload new image if selected
    if(imgFile){
      try{ imageUrl=await uploadImage(imgFile); }
      catch(e){ console.error("Image upload failed",e); }
    }
    await onSave({...f,image_url:imageUrl});
    setSaving(false);
  };
  return(
    <Drawer onClose={onClose} title={prop.id?"Edit prop":"Add prop"}>
      <div onClick={()=>fileRef.current.click()} style={{height:90,background:T.bg,borderRadius:12,border:`1.5px dashed ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",overflow:"hidden",marginBottom:14}}>
        {f.image_url?<img src={f.image_url} alt="prop" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{textAlign:"center"}}><div style={{fontSize:22}}>📷</div><div style={{fontFamily:F,fontSize:11,color:T.muted}}>Tap to add photo</div></div>}
        <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={pickImg}/>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div>
          <div style={{fontFamily:F,fontSize:12,fontWeight:600,color:T.body,marginBottom:5}}>Character</div>
          <select value={f.character_id||""} onChange={e=>setF(x=>({...x,character_id:e.target.value}))} style={{fontFamily:F,fontSize:13,color:T.ink,background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:10,padding:"9px 12px",outline:"none",width:"100%"}}>
            <option value="">— Unassigned —</option>
            {chars.map(c=><option key={c.id} value={c.id}>{c.name} ({c.box_label})</option>)}
          </select>
        </div>
        {[["Prop name","name","e.g. Straw Hat"],["Scene(s)","scene","e.g. 1, 3, 5"]].map(([label,key,ph])=>(
          <div key={key}>
            <div style={{fontFamily:F,fontSize:12,fontWeight:600,color:T.body,marginBottom:5}}>{label}</div>
            <input value={f[key]||""} onChange={e=>setF(x=>({...x,[key]:e.target.value}))} placeholder={ph}
              style={{fontFamily:F,fontSize:13,color:T.ink,background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:10,padding:"9px 12px",outline:"none",width:"100%",boxSizing:"border-box"}}/>
          </div>
        ))}
        <div>
          <div style={{fontFamily:F,fontSize:12,fontWeight:600,color:T.body,marginBottom:6}}>Location</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {locs.map(l=>{const a=f.location_id===l.id;return(
              <button key={l.id} onClick={()=>setF(x=>({...x,location_id:l.id}))} style={{fontFamily:F,fontSize:11,fontWeight:a?700:500,color:a?l.color:T.body,background:a?l.bg:T.bg,border:`1.5px solid ${a?l.bd:T.border}`,borderRadius:20,padding:"4px 12px",cursor:"pointer"}}>{l.name}</button>
            );})}
          </div>
        </div>
        <div>
          <div style={{fontFamily:F,fontSize:12,fontWeight:600,color:T.body,marginBottom:6}}>Status</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {["HERO","STANDBY","DAMAGED","WRAPPED"].map(s=>{const a=f.status===s;const m=S_META[s];return(
              <button key={s} onClick={()=>setF(x=>({...x,status:s}))} style={{fontFamily:F,fontSize:11,fontWeight:a?700:500,color:a?m.c:T.body,background:a?m.bg:T.bg,border:`1.5px solid ${a?m.bd:T.border}`,borderRadius:20,padding:"4px 12px",cursor:"pointer"}}>{m.label}</button>
            );})}
          </div>
        </div>
        <div onClick={()=>setF(x=>({...x,in_box:!x.in_box}))} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:f.in_box?T.bg:T.amberBg,border:`1.5px solid ${f.in_box?T.border:T.amberBd}`,borderRadius:12,cursor:"pointer"}}>
          <div style={{width:40,height:22,borderRadius:11,background:f.in_box?T.border:T.amber,position:"relative",flexShrink:0,transition:"background 0.2s"}}>
            <div style={{position:"absolute",top:2,left:f.in_box?2:20,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
          </div>
          <span style={{fontFamily:F,fontSize:13,fontWeight:600,color:f.in_box?T.body:T.amberDk}}>{f.in_box?"In box":"Out of box"}</span>
        </div>
        <div>
          <div style={{fontFamily:F,fontSize:12,fontWeight:600,color:T.body,marginBottom:5}}>Notes</div>
          <input value={f.notes||""} onChange={e=>setF(x=>({...x,notes:e.target.value}))} placeholder="Any notes…"
            style={{fontFamily:F,fontSize:13,color:T.ink,background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:10,padding:"9px 12px",outline:"none",width:"100%",boxSizing:"border-box"}}/>
        </div>
      </div>
      <div style={{display:"flex",gap:8,marginTop:18}}>
        <button onClick={onClose} style={{flex:1,fontFamily:F,fontSize:13,fontWeight:600,color:T.body,background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:12,padding:"10px 0",cursor:"pointer"}}>Cancel</button>
        <button onClick={handleSave} disabled={saving} style={{flex:2,fontFamily:F,fontSize:13,fontWeight:700,color:"#fff",background:saving?"#888":T.ink,border:"none",borderRadius:12,padding:"10px 0",cursor:saving?"not-allowed":"pointer"}}>{saving?"Saving…":"Save prop"}</button>
      </div>
    </Drawer>
  );
}

// ─── ADD CHAR DRAWER ──────────────────────────────────────────────────────────
function AddCharDrawer({onClose,onSave}){
  const [f,setF]=useState({name:"",box_label:"",scenes:"",image_url:null,main_cast:false});
  const [imgFile,setImgFile]=useState(null);
  const [saving,setSaving]=useState(false);
  const fileRef=useRef();
  const pickImg=e=>{const file=e.target.files[0];if(!file)return;setImgFile(file);const r=new FileReader();r.onload=ev=>setF(x=>({...x,image_url:ev.target.result}));r.readAsDataURL(file);};
  const handleSave=async()=>{
    if(!f.name.trim())return;
    setSaving(true);
    let imageUrl=null;
    if(imgFile){ try{imageUrl=await uploadImage(imgFile);}catch(e){console.error(e);} }
    await onSave({...f,image_url:imageUrl});
    setSaving(false);onClose();
  };
  return(
    <Drawer onClose={onClose} title="Add character">
      <div onClick={()=>fileRef.current.click()} style={{width:64,height:64,borderRadius:16,background:T.bg,border:`1.5px dashed ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",overflow:"hidden",margin:"0 auto 16px"}}>
        {f.image_url?<img alt="" src={f.image_url} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{textAlign:"center"}}><div style={{fontSize:20}}>👤</div><div style={{fontFamily:F,fontSize:9,color:T.muted}}>Photo</div></div>}
        <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={pickImg}/>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {[["Character name","name","e.g. Luffy"],["Box label","box_label","e.g. Box A"],["Scenes","scenes","e.g. 1, 3, 5"]].map(([label,key,ph])=>(
          <div key={key}>
            <div style={{fontFamily:F,fontSize:12,fontWeight:600,color:T.body,marginBottom:5}}>{label}</div>
            <input value={f[key]||""} onChange={e=>setF(x=>({...x,[key]:e.target.value}))} placeholder={ph}
              style={{fontFamily:F,fontSize:13,color:T.ink,background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:10,padding:"9px 12px",outline:"none",width:"100%",boxSizing:"border-box"}}/>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:8,marginTop:18}}>
        <button onClick={onClose} style={{flex:1,fontFamily:F,fontSize:13,fontWeight:600,color:T.body,background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:12,padding:"10px 0",cursor:"pointer"}}>Cancel</button>
        <button onClick={handleSave} disabled={saving} style={{flex:2,fontFamily:F,fontSize:13,fontWeight:700,color:"#fff",background:saving?"#888":T.ink,border:"none",borderRadius:12,padding:"10px 0",cursor:saving?"not-allowed":"pointer"}}>{saving?"Saving…":"Save"}</button>
      </div>
    </Drawer>
  );
}

function LocDrawer({loc,onClose,onSave,onDelete}){
  const COLORS=[{color:"#16A34A",bg:"#F0FDF4",bd:"#BBF7D0"},{color:"#2563EB",bg:"#EFF6FF",bd:"#BFDBFE"},{color:"#D97706",bg:"#FFFBEB",bd:"#FDE68A"},{color:"#7C3AED",bg:"#F5F3FF",bd:"#DDD6FE"},{color:"#DC2626",bg:"#FEF2F2",bd:"#FECACA"},{color:"#0891B2",bg:"#ECFEFF",bd:"#CFFAFE"},{color:"#BE185D",bg:"#FDF2F8",bd:"#FBCFE8"}];
  const [f,setF]=useState(loc?{...loc}:{name:"",type:"Unit",description:"",...COLORS[0]});
  const [saving,setSaving]=useState(false);
  return(
    <Drawer onClose={onClose} title={loc?"Edit location":"Add location"}>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {COLORS.map((p,i)=>{const sel=f.color===p.color;return(<button key={i} onClick={()=>setF(x=>({...x,...p}))} style={{flex:1,height:28,background:p.color,borderRadius:8,border:sel?`3px solid ${T.ink}`:`2px solid transparent`,cursor:"pointer",transform:sel?"scale(1.1)":"scale(1)",transition:"transform 0.1s"}}/>);})}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {[["Name","name","e.g. Paramecia"],["Description","description","Short description"]].map(([label,key,ph])=>(
          <div key={key}>
            <div style={{fontFamily:F,fontSize:12,fontWeight:600,color:T.body,marginBottom:5}}>{label}</div>
            <input value={f[key]||""} onChange={e=>setF(x=>({...x,[key]:e.target.value}))} placeholder={ph}
              style={{fontFamily:F,fontSize:13,color:T.ink,background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:10,padding:"9px 12px",outline:"none",width:"100%",boxSizing:"border-box"}}/>
          </div>
        ))}
        <div>
          <div style={{fontFamily:F,fontSize:12,fontWeight:600,color:T.body,marginBottom:6}}>Type</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {["Unit","Facility","Storage","External","Other"].map(t=>{const a=f.type===t;return(
              <button key={t} onClick={()=>setF(x=>({...x,type:t}))} style={{fontFamily:F,fontSize:11,fontWeight:a?700:500,color:a?"#fff":T.body,background:a?T.ink:T.bg,border:`1.5px solid ${a?T.ink:T.border}`,borderRadius:20,padding:"4px 12px",cursor:"pointer"}}>{t}</button>
            );})}
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:8,marginTop:18,justifyContent:"space-between"}}>
        {loc&&<button onClick={()=>onDelete(loc.id)} style={{fontFamily:F,fontSize:13,fontWeight:600,color:T.redDk,background:T.redBg,border:`1.5px solid ${T.redBd}`,borderRadius:12,padding:"10px 16px",cursor:"pointer"}}>Delete</button>}
        <div style={{display:"flex",gap:8,marginLeft:"auto"}}>
          <button onClick={onClose} style={{fontFamily:F,fontSize:13,fontWeight:600,color:T.body,background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:12,padding:"10px 16px",cursor:"pointer"}}>Cancel</button>
          <button onClick={async()=>{if(!f.name.trim())return;setSaving(true);await onSave(f);setSaving(false);onClose();}} disabled={saving}
            style={{fontFamily:F,fontSize:13,fontWeight:700,color:"#fff",background:saving?"#888":T.ink,border:"none",borderRadius:12,padding:"10px 20px",cursor:saving?"not-allowed":"pointer"}}>{saving?"Saving…":"Save"}</button>
        </div>
      </div>
    </Drawer>
  );
}

// ─── USER BADGE ───────────────────────────────────────────────────────────────


// ─── CALENDAR & SCHEDULE ──────────────────────────────────────────────────────

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function CalendarTab({user, locs, allProps, allChars}) {
  const [view,        setView]        = useState("week");   // week | month
  const [schedule,    setSchedule]    = useState([]);
  const [orders,      setOrders]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [today]                       = useState(new Date());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showOrder,   setShowOrder]   = useState(false);
  const [showUpload,  setShowUpload]  = useState(false);
  const [openDay,     setOpenDay]     = useState(null);   // date string clicked
  const fileRef = useRef();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, o] = await Promise.all([
        sb.from("schedule").select("*").order("shoot_date"),
        sb.from("prop_orders").select("*").order("needed_date"),
      ]);
      setSchedule(s.data || []);
      setOrders(o.data || []);
    } catch(e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Helper — get items for a specific date
  const getDateStr = (d) => d.toISOString().split("T")[0];
  const scenesOn   = (ds) => schedule.filter(s => s.shoot_date === ds);
  const ordersOn   = (ds) => orders.filter(o => o.needed_date === ds);

  // ── WEEK VIEW ──
  const getWeekDays = () => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({length:7}, (_,i) => { const d=new Date(start); d.setDate(d.getDate()+i); return d; });
  };

  // ── MONTH VIEW ──
  const getMonthDays = () => {
    const year  = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const first = new Date(year, month, 1);
    const last  = new Date(year, month+1, 0);
    const days  = [];
    // Pad start
    for(let i=0; i<first.getDay(); i++) days.push(null);
    for(let d=1; d<=last.getDate(); d++) days.push(new Date(year, month, d));
    return days;
  };

  const prevPeriod = () => {
    const d = new Date(currentDate);
    if(view==="week") d.setDate(d.getDate()-7);
    else d.setMonth(d.getMonth()-1);
    setCurrentDate(d);
  };
  const nextPeriod = () => {
    const d = new Date(currentDate);
    if(view==="week") d.setDate(d.getDate()+7);
    else d.setMonth(d.getMonth()+1);
    setCurrentDate(d);
  };
  const goToday = () => setCurrentDate(new Date());

  // ── PARSE SCHEDULE UPLOAD ──
  const [parseStatus, setParseStatus] = useState(null); // null | "parsing" | {found, failed}

  // Load PDF.js from CDN
  const loadPDFJS = () => new Promise((resolve, reject) => {
    if(window.pdfjsLib) { resolve(window.pdfjsLib); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      resolve(window.pdfjsLib);
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });

  // Smart parser — finds scene numbers and dates from raw PDF text
  const parseScheduleText = (text) => {
    const lines  = text.split("\n").map(l=>l.trim()).filter(Boolean);
    const parsed = [];

    // Date patterns: "Monday 5 June 2024", "05/06/2024", "2024-06-05", "Mon 5 Jun"
    const dateRe = /(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})|(\d{4}-\d{2}-\d{2})|((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*\.?\s+\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{0,4})/gi;
    // Scene patterns: "Sc 1", "Scene 1A", "1/2", "INT.", "EXT."
    const sceneRe = /(?:SC(?:ENE)?\.?\s*)?(\d+[A-Z]?(?:\/\d+[A-Z]?)?)\s*[-–]?\s*((?:INT|EXT)\.?\s+[^\n]{0,60})/gi;

    let currentDate = null;

    lines.forEach(line => {
      // Check if this line contains a date
      const dateMatch = line.match(dateRe);
      if(dateMatch) {
        const d = new Date(dateMatch[0]);
        if(!isNaN(d)) currentDate = getDateStr(d);
      }

      // Check if line contains a scene
      const sceneMatches = [...line.matchAll(sceneRe)];
      sceneMatches.forEach(m => {
        const sceneNum = m[1];
        const desc     = m[2]?.trim() || "";
        if(sceneNum && currentDate) {
          // Avoid duplicates
          if(!parsed.find(p=>p.scene===sceneNum&&p.shoot_date===currentDate)) {
            parsed.push({ scene:sceneNum, shoot_date:currentDate, description:desc, location:"" });
          }
        }
      });

      // Also catch simpler "Sc X" patterns without INT/EXT
      const simpleScene = line.match(/^(?:SC(?:ENE)?\.?\s+)?(\d+[A-Z]?)\s*$/i);
      if(simpleScene && currentDate) {
        const sceneNum = simpleScene[1];
        if(!parsed.find(p=>p.scene===sceneNum&&p.shoot_date===currentDate)) {
          parsed.push({ scene:sceneNum, shoot_date:currentDate, description:line, location:"" });
        }
      }
    });

    return parsed;
  };

  const handleScheduleFile = async (file) => {
    setShowUpload(false);
    const ext = file.name.split(".").pop().toLowerCase();

    if(ext === "csv" || ext === "tsv" || ext === "txt") {
      // ── CSV / TSV ──
      const text  = await file.text();
      const lines = text.split("\n").filter(l=>l.trim());
      const parsed = [];
      lines.forEach((line, i) => {
        if(i===0) return;
        const cols = line.split(/[,\t]/);
        if(cols.length >= 2) {
          const scene   = cols[0]?.trim().replace(/"/g,"");
          const dateStr = cols[1]?.trim().replace(/"/g,"");
          const desc    = cols[2]?.trim().replace(/"/g,"") || "";
          const loc     = cols[3]?.trim().replace(/"/g,"") || "";
          const d = new Date(dateStr);
          if(scene && !isNaN(d)) parsed.push({ scene, shoot_date:getDateStr(d), description:desc, location:loc });
        }
      });
      if(parsed.length > 0) {
        await sb.from("schedule").insert(parsed);
        setParseStatus({found:parsed.length, failed:0});
        await load();
      } else {
        setParseStatus({found:0, failed:lines.length});
      }
      setTimeout(()=>setParseStatus(null), 4000);

    } else if(ext === "pdf") {
      // ── PDF — auto convert via PDF.js ──
      setParseStatus("parsing");
      try {
        const pdfjs   = await loadPDFJS();
        const buffer  = await file.arrayBuffer();
        const pdf     = await pdfjs.getDocument({data:buffer}).promise;
        let fullText  = "";

        // Extract text from all pages
        for(let p=1; p<=pdf.numPages; p++) {
          const page    = await pdf.getPage(p);
          const content = await page.getTextContent();
          const pageText = content.items.map(i=>i.str).join(" ");
          fullText += pageText + "\n";
        }

        // Parse extracted text
        const parsed = parseScheduleText(fullText);

        if(parsed.length > 0) {
          await sb.from("schedule").insert(parsed);
          await load();
          setParseStatus({found:parsed.length, failed:0});
        } else {
          setParseStatus({found:0, failed:1});
        }
        setTimeout(()=>setParseStatus(null), 5000);

      } catch(e) {
        console.error("PDF parse error:", e);
        setParseStatus({found:0, failed:1, error:"Could not read PDF. Try exporting as CSV."});
        setTimeout(()=>setParseStatus(null), 5000);
      }
    }
  };

  const weekDays  = getWeekDays();
  const monthDays = getMonthDays();
  const todayStr  = getDateStr(today);

  return (
    <div style={{flex:1, display:"flex", flexDirection:"column", overflow:"hidden"}}>

      {/* Header */}
      <div style={{background:T.white, borderBottom:`1px solid ${T.border}`, padding:"10px 16px", flexShrink:0}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10}}>
          <div style={{display:"flex", gap:8, alignItems:"center"}}>
            <button onClick={prevPeriod} style={{background:T.bg, border:`1px solid ${T.border}`, borderRadius:8, width:30, height:30, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center"}}>‹</button>
            <span style={{fontFamily:F, fontSize:14, fontWeight:700, color:T.ink, minWidth:120, textAlign:"center"}}>
              {view==="week"
                ? `${weekDays[0].toLocaleDateString("en-GB",{day:"numeric",month:"short"})} – ${weekDays[6].toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}`
                : `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
              }
            </span>
            <button onClick={nextPeriod} style={{background:T.bg, border:`1px solid ${T.border}`, borderRadius:8, width:30, height:30, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center"}}>›</button>
          </div>
          <button onClick={goToday} style={{fontFamily:F, fontSize:11, fontWeight:600, color:T.blueDk, background:T.blueBg, border:`1px solid ${T.blueBd}`, borderRadius:20, padding:"4px 10px", cursor:"pointer"}}>Today</button>
        </div>
        {/* Week / Month toggle */}
        <div style={{display:"flex", gap:2, background:T.bg, borderRadius:10, padding:3}}>
          {["week","month"].map(v => { const a=view===v; return (
            <button key={v} onClick={()=>setView(v)}
              style={{flex:1, fontFamily:F, fontSize:12, fontWeight:a?700:500, color:a?T.ink:T.muted, background:a?T.white:"transparent", border:"none", borderRadius:8, padding:"6px 0", cursor:"pointer", boxShadow:a?"0 1px 4px rgba(0,0,0,0.08)":"none", textTransform:"capitalize"}}>
              {v}
            </button>
          ); })}
        </div>
      </div>

      {/* Calendar grid */}
      <div style={{flex:1, overflowY:"auto", padding:"10px 12px 80px"}}>
        {loading ? <Spinner/> : (

          view==="week" ? (
            // ── WEEK VIEW ──
            <div style={{display:"flex", flexDirection:"column", gap:8}}>
              {weekDays.map(day => {
                const ds       = getDateStr(day);
                const isToday  = ds===todayStr;
                const scenes   = scenesOn(ds);
                const dayOrds  = ordersOn(ds);
                const hasItems = scenes.length>0 || dayOrds.length>0;
                return (
                  <div key={ds} style={{background:isToday?T.blueBg:T.white, border:`1.5px solid ${isToday?T.blueBd:T.border}`, borderRadius:14, overflow:"hidden"}}>
                    {/* Day header */}
                    <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", borderBottom:hasItems?`1px solid ${T.border}`:"none"}}>
                      <div style={{display:"flex", gap:10, alignItems:"center"}}>
                        <div style={{textAlign:"center"}}>
                          <div style={{fontFamily:F, fontSize:10, fontWeight:600, color:isToday?T.blueDk:T.muted, textTransform:"uppercase"}}>{DAYS[day.getDay()]}</div>
                          <div style={{fontFamily:F, fontSize:20, fontWeight:800, color:isToday?T.blueDk:T.ink, lineHeight:1}}>{day.getDate()}</div>
                        </div>
                        {isToday && <span style={{fontFamily:F, fontSize:10, fontWeight:700, color:T.blueDk, background:T.blueBg, border:`1px solid ${T.blueBd}`, borderRadius:20, padding:"2px 8px"}}>Today</span>}
                      </div>
                      <button onClick={()=>{ setOpenDay(ds); setShowOrder(true); }}
                        style={{fontFamily:F, fontSize:11, fontWeight:600, color:"#fff", background:T.ink, border:"none", borderRadius:20, padding:"4px 10px", cursor:"pointer"}}>
                        + Order
                      </button>
                    </div>
                    {/* Scenes */}
                    {scenes.map(s => (
                      <div key={s.id} style={{display:"flex", gap:8, alignItems:"center", padding:"8px 14px", borderBottom:`1px solid ${T.border}`, background:"#FFFBEB"}}>
                        <span style={{fontSize:14}}>🎬</span>
                        <div style={{flex:1}}>
                          <div style={{fontFamily:F, fontSize:12, fontWeight:700, color:T.ink}}>Sc {s.scene} {s.description?`— ${s.description}`:""}</div>
                          {s.location && <div style={{fontFamily:F, fontSize:10, color:T.muted}}>{s.location}</div>}
                        </div>
                        <span style={{fontFamily:F, fontSize:10, fontWeight:700, color:T.amberDk, background:T.amberBg, border:`1px solid ${T.amberBd}`, borderRadius:20, padding:"2px 7px"}}>Scene</span>
                      </div>
                    ))}
                    {/* Prop orders */}
                    {dayOrds.map(o => {
                      const fromLoc = locs.find(l=>l.id===o.from_loc);
                      const toLoc   = locs.find(l=>l.id===o.to_loc);
                      const statusColor = o.status==="Confirmed"?T.greenDk:o.status==="Dispatched"?T.blueDk:o.status==="Cancelled"?T.redDk:T.amberDk;
                      const statusBg    = o.status==="Confirmed"?T.greenBg:o.status==="Dispatched"?T.blueBg:o.status==="Cancelled"?T.redBg:T.amberBg;
                      const statusBd    = o.status==="Confirmed"?T.greenBd:o.status==="Dispatched"?T.blueBd:o.status==="Cancelled"?T.redBd:T.amberBd;
                      return (
                        <div key={o.id} style={{display:"flex", gap:8, alignItems:"center", padding:"8px 14px", borderBottom:`1px solid ${T.border}`}}>
                          <span style={{fontSize:14}}>📦</span>
                          <div style={{flex:1, minWidth:0}}>
                            <div style={{fontFamily:F, fontSize:12, fontWeight:700, color:T.ink, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{o.prop_name}</div>
                            <div style={{fontFamily:F, fontSize:10, color:T.muted}}>
                              {fromLoc?.name||"?"} → {toLoc?.name||"?"}
                              {o.scene ? ` · Sc ${o.scene}` : ""}
                            </div>
                          </div>
                          <span style={{fontFamily:F, fontSize:10, fontWeight:700, color:statusColor, background:statusBg, border:`1px solid ${statusBd}`, borderRadius:20, padding:"2px 7px", flexShrink:0}}>{o.status}</span>
                        </div>
                      );
                    })}
                    {!hasItems && (
                      <div style={{padding:"8px 14px"}}>
                        <span style={{fontFamily:F, fontSize:11, color:T.muted}}>Nothing scheduled</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          ) : (
            // ── MONTH VIEW ──
            <div>
              {/* Day labels */}
              <div style={{display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:4}}>
                {DAYS.map(d => <div key={d} style={{fontFamily:F, fontSize:10, fontWeight:700, color:T.muted, textAlign:"center", padding:"4px 0"}}>{d}</div>)}
              </div>
              {/* Day cells */}
              <div style={{display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2}}>
                {monthDays.map((day, i) => {
                  if(!day) return <div key={`empty-${i}`}/>;
                  const ds      = getDateStr(day);
                  const isToday = ds===todayStr;
                  const scenes  = scenesOn(ds);
                  const ords    = ordersOn(ds);
                  return (
                    <div key={ds} onClick={()=>{ setOpenDay(ds); setShowOrder(true); }}
                      style={{background:isToday?T.blueBg:T.white, border:`1.5px solid ${isToday?T.blueDk:T.border}`, borderRadius:10, padding:"6px 4px", minHeight:60, cursor:"pointer", position:"relative"}}
                      onMouseEnter={e=>e.currentTarget.style.background=isToday?T.blueBg:"#F8F8F8"}
                      onMouseLeave={e=>e.currentTarget.style.background=isToday?T.blueBg:T.white}>
                      <div style={{fontFamily:F, fontSize:12, fontWeight:isToday?800:600, color:isToday?T.blueDk:T.ink, textAlign:"center", marginBottom:3}}>{day.getDate()}</div>
                      {scenes.length>0 && <div style={{background:"#FEF9C3", borderRadius:4, padding:"1px 4px", marginBottom:2}}><span style={{fontFamily:F, fontSize:9, fontWeight:700, color:T.amberDk}}>🎬 {scenes.length}</span></div>}
                      {ords.length>0   && <div style={{background:T.greenBg, borderRadius:4, padding:"1px 4px"}}><span style={{fontFamily:F, fontSize:9, fontWeight:700, color:T.greenDk}}>📦 {ords.length}</span></div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}
      </div>

      {/* Bottom action buttons */}
      <div style={{position:"fixed", bottom:0, left:0, right:0, maxWidth:480, margin:"0 auto", background:T.white, borderTop:`1px solid ${T.border}`, padding:"10px 16px 24px", display:"flex", gap:8}}>
        <button onClick={()=>{ setOpenDay(getDateStr(today)); setShowOrder(true); }}
          style={{flex:2, fontFamily:F, fontSize:13, fontWeight:700, color:"#fff", background:T.ink, border:"none", borderRadius:12, padding:"11px 0", cursor:"pointer"}}>
          📦 Pre-order prop
        </button>
        <button onClick={()=>setShowUpload(true)}
          style={{flex:1, fontFamily:F, fontSize:12, fontWeight:600, color:T.body, background:T.bg, border:`1.5px solid ${T.border}`, borderRadius:12, padding:"11px 0", cursor:"pointer"}}>
          📄 Schedule
        </button>
      </div>

      {/* Parse status toast */}
      {parseStatus==="parsing"&&(
        <div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:T.ink,color:"#fff",fontFamily:F,fontSize:13,fontWeight:700,borderRadius:20,padding:"10px 20px",zIndex:999,boxShadow:"0 4px 20px rgba(0,0,0,0.2)",display:"flex",gap:8,alignItems:"center"}}>
          <div style={{width:14,height:14,border:"2px solid rgba(255,255,255,0.3)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
          Reading schedule PDF…
        </div>
      )}
      {parseStatus&&parseStatus!=="parsing"&&(
        <div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:parseStatus.found>0?T.greenDk:T.redDk,color:"#fff",fontFamily:F,fontSize:13,fontWeight:700,borderRadius:20,padding:"10px 20px",zIndex:999,boxShadow:"0 4px 20px rgba(0,0,0,0.2)",whiteSpace:"nowrap"}}>
          {parseStatus.found>0 ? `✓ ${parseStatus.found} scenes imported` : parseStatus.error||"Could not parse schedule — try CSV"}
        </div>
      )}

      {/* Pre-order drawer */}
      {showOrder && (
        <PropOrderDrawer
          user={user} locs={locs} allProps={allProps} allChars={allChars}
          defaultDate={openDay||getDateStr(today)}
          onClose={()=>{ setShowOrder(false); setOpenDay(null); }}
          onSaved={()=>{ setShowOrder(false); setOpenDay(null); load(); }}
        />
      )}

      {/* Schedule upload drawer */}
      {showUpload && (
        <Drawer onClose={()=>setShowUpload(false)} title="Upload Schedule">
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{background:T.blueBg,border:`1px solid ${T.blueBd}`,borderRadius:12,padding:"12px 14px"}}>
              <div style={{fontFamily:F,fontSize:13,fontWeight:700,color:T.blueDk,marginBottom:4}}>Upload your shooting schedule</div>
              <div style={{fontFamily:F,fontSize:12,color:T.body,lineHeight:1.6}}>Supports <b>PDF</b>, <b>CSV</b> and <b>Excel CSV</b>.<br/>PDF is auto-converted — works best with text-based schedules.</div>
            </div>
            <button onClick={()=>fileRef.current.click()}
              style={{width:"100%",fontFamily:F,fontSize:14,fontWeight:700,color:"#fff",background:T.ink,border:"none",borderRadius:12,padding:"13px 0",cursor:"pointer"}}>
              📄 Choose CSV file
            </button>
            <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,.pdf" style={{display:"none"}} onChange={e=>{ if(e.target.files[0]) handleScheduleFile(e.target.files[0]); setShowUpload(false); }}/>
            <div style={{fontFamily:F,fontSize:12,fontWeight:700,color:T.body,marginTop:4}}>Or add a scene manually:</div>
            <ManualSceneEntry onSaved={()=>{ setShowUpload(false); load(); }}/>
          </div>
        </Drawer>
      )}
    </div>
  );
}

function ManualSceneEntry({onSaved}) {
  const [scene,    setScene]    = useState("");
  const [date,     setDate]     = useState("");
  const [desc,     setDesc]     = useState("");
  const [location, setLocation] = useState("");
  const [saving,   setSaving]   = useState(false);

  const save = async () => {
    if(!scene.trim()||!date) return;
    setSaving(true);
    await sb.from("schedule").insert({scene:scene.trim(), shoot_date:date, description:desc.trim(), location:location.trim()});
    setSaving(false);
    onSaved();
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",gap:8}}>
        <div style={{flex:1}}>
          <div style={{fontFamily:F,fontSize:12,fontWeight:600,color:T.body,marginBottom:4}}>Scene</div>
          <input value={scene} onChange={e=>setScene(e.target.value)} placeholder="e.g. 1A"
            style={{fontFamily:F,fontSize:13,color:T.ink,background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:10,padding:"8px 11px",outline:"none",width:"100%",boxSizing:"border-box"}}/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontFamily:F,fontSize:12,fontWeight:600,color:T.body,marginBottom:4}}>Date</div>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)}
            style={{fontFamily:F,fontSize:13,color:T.ink,background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:10,padding:"8px 11px",outline:"none",width:"100%",boxSizing:"border-box"}}/>
        </div>
      </div>
      <div>
        <div style={{fontFamily:F,fontSize:12,fontWeight:600,color:T.body,marginBottom:4}}>Description</div>
        <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="e.g. INT. SHIP CABIN"
          style={{fontFamily:F,fontSize:13,color:T.ink,background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:10,padding:"8px 11px",outline:"none",width:"100%",boxSizing:"border-box"}}/>
      </div>
      <div>
        <div style={{fontFamily:F,fontSize:12,fontWeight:600,color:T.body,marginBottom:4}}>Shooting Location</div>
        <input value={location} onChange={e=>setLocation(e.target.value)} placeholder="e.g. Paramecia"
          style={{fontFamily:F,fontSize:13,color:T.ink,background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:10,padding:"8px 11px",outline:"none",width:"100%",boxSizing:"border-box"}}/>
      </div>
      <button onClick={save} disabled={!scene.trim()||!date||saving}
        style={{width:"100%",fontFamily:F,fontSize:13,fontWeight:700,color:"#fff",background:!scene.trim()||!date?"#ccc":T.greenDk,border:"none",borderRadius:12,padding:"11px 0",cursor:!scene.trim()||!date?"not-allowed":"pointer"}}>
        {saving?"Saving…":"+ Add Scene"}
      </button>
    </div>
  );
}

function PropOrderDrawer({user, locs, allProps, allChars, defaultDate, onClose, onSaved}) {
  const [prop,    setProp]    = useState(null);
  const [fromLoc, setFromLoc] = useState("");
  const [toLoc,   setToLoc]   = useState("");
  const [date,    setDate]    = useState(defaultDate||"");
  const [scene,   setScene]   = useState("");
  const [notes,   setNotes]   = useState("");
  const [search,  setSearch]  = useState("");
  const [saving,  setSaving]  = useState(false);

  const results = search.length>1
    ? allProps.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())||allChars.find(c=>c.id===p.character_id)?.name.toLowerCase().includes(search.toLowerCase()))
    : [];

  const save = async () => {
    if(!prop||!toLoc||!date) return;
    setSaving(true);
    const {data} = await sb.from("prop_orders").insert({
      prop_id: prop.id, prop_name: prop.name,
      from_loc: fromLoc||null, to_loc: toLoc,
      requested_by: user.id, needed_date: date,
      scene, notes, status:"Pending"
    }).select().single();
    // Notify all crew at destination location
    if(data) {
      const destLoc = locs.find(l=>l.id===toLoc);
      const {data:destCrew} = await sb.from("proppy_users").select("id").eq("unit_id", toLoc);
      const allCrew = (await sb.from("proppy_users").select("id")).data || [];
      const targets = (destCrew&&destCrew.length>0) ? destCrew : allCrew;
      await Promise.all(targets.filter(c=>c.id!==user.id).map(c=>
        sb.from("notifications").insert({
          user_id:c.id, type:"prop_request",
          title:`📅 Prop needed ${new Date(date).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}`,
          body:`${user.name} needs ${prop.name}${destLoc?` at ${destLoc.name}`:""}${scene?` · Sc ${scene}`:""}`,
          read:false
        })
      ));
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Drawer onClose={onClose} title="Pre-order Prop">
      <div style={{display:"flex",flexDirection:"column",gap:12}}>

        {/* Prop picker */}
        <div>
          <div style={{fontFamily:F,fontSize:12,fontWeight:600,color:T.body,marginBottom:6}}>Which prop?</div>
          {prop ? (
            <div style={{display:"flex",gap:10,alignItems:"center",background:T.greenBg,border:`1.5px solid ${T.greenBd}`,borderRadius:12,padding:"10px 14px"}}>
              <span style={{fontSize:18}}>📦</span>
              <div style={{flex:1}}>
                <div style={{fontFamily:F,fontSize:13,fontWeight:700,color:T.ink}}>{prop.name}</div>
                {allChars.find(c=>c.id===prop.character_id) && <div style={{fontFamily:F,fontSize:11,color:T.muted}}>{allChars.find(c=>c.id===prop.character_id).name}</div>}
              </div>
              <button onClick={()=>setProp(null)} style={{background:"none",border:"none",color:T.muted,fontSize:16,cursor:"pointer"}}>✕</button>
            </div>
          ) : (
            <>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search prop or character…"
                style={{fontFamily:F,fontSize:13,color:T.ink,background:T.white,border:`1.5px solid ${T.border}`,borderRadius:12,padding:"10px 14px",outline:"none",width:"100%",boxSizing:"border-box",marginBottom:6}}/>
              {results.slice(0,5).map(p=>(
                <button key={p.id} onClick={()=>{setProp(p);setSearch("");}}
                  style={{width:"100%",display:"flex",gap:10,alignItems:"center",background:T.white,border:`1px solid ${T.border}`,borderRadius:10,padding:"9px 12px",cursor:"pointer",marginBottom:4,textAlign:"left"}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.bg}
                  onMouseLeave={e=>e.currentTarget.style.background=T.white}>
                  <span style={{fontSize:16}}>📦</span>
                  <div>
                    <div style={{fontFamily:F,fontSize:13,fontWeight:600,color:T.ink}}>{p.name}</div>
                    {allChars.find(c=>c.id===p.character_id)&&<div style={{fontFamily:F,fontSize:11,color:T.muted}}>{allChars.find(c=>c.id===p.character_id).name}</div>}
                  </div>
                </button>
              ))}
            </>
          )}
        </div>

        {/* From → To */}
        <div style={{display:"flex",gap:8}}>
          <div style={{flex:1}}>
            <div style={{fontFamily:F,fontSize:12,fontWeight:600,color:T.body,marginBottom:5}}>From</div>
            <select value={fromLoc} onChange={e=>setFromLoc(e.target.value)}
              style={{fontFamily:F,fontSize:12,color:T.ink,background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:10,padding:"9px 10px",outline:"none",width:"100%"}}>
              <option value="">Any</option>
              {locs.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div style={{display:"flex",alignItems:"flex-end",paddingBottom:10}}>→</div>
          <div style={{flex:1}}>
            <div style={{fontFamily:F,fontSize:12,fontWeight:600,color:T.body,marginBottom:5}}>To</div>
            <select value={toLoc} onChange={e=>setToLoc(e.target.value)}
              style={{fontFamily:F,fontSize:12,color:T.ink,background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:10,padding:"9px 10px",outline:"none",width:"100%"}}>
              <option value="">Select…</option>
              {locs.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        </div>

        {/* Date + Scene */}
        <div style={{display:"flex",gap:8}}>
          <div style={{flex:1}}>
            <div style={{fontFamily:F,fontSize:12,fontWeight:600,color:T.body,marginBottom:5}}>Date needed</div>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)}
              style={{fontFamily:F,fontSize:13,color:T.ink,background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:10,padding:"9px 11px",outline:"none",width:"100%",boxSizing:"border-box"}}/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontFamily:F,fontSize:12,fontWeight:600,color:T.body,marginBottom:5}}>Scene</div>
            <input value={scene} onChange={e=>setScene(e.target.value)} placeholder="e.g. 12"
              style={{fontFamily:F,fontSize:13,color:T.ink,background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:10,padding:"9px 11px",outline:"none",width:"100%",boxSizing:"border-box"}}/>
          </div>
        </div>

        {/* Notes */}
        <div>
          <div style={{fontFamily:F,fontSize:12,fontWeight:600,color:T.body,marginBottom:5}}>Notes</div>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Any special instructions…" rows={3}
            style={{fontFamily:F,fontSize:13,color:T.ink,background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:10,padding:"9px 11px",outline:"none",width:"100%",boxSizing:"border-box",resize:"none"}}/>
        </div>

        <div style={{display:"flex",gap:8,marginTop:4}}>
          <button onClick={onClose} style={{flex:1,fontFamily:F,fontSize:13,fontWeight:600,color:T.body,background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:12,padding:"11px 0",cursor:"pointer"}}>Cancel</button>
          <button onClick={save} disabled={!prop||!toLoc||!date||saving}
            style={{flex:2,fontFamily:F,fontSize:13,fontWeight:700,color:"#fff",background:!prop||!toLoc||!date?"#ccc":T.ink,border:"none",borderRadius:12,padding:"11px 0",cursor:!prop||!toLoc||!date?"not-allowed":"pointer"}}>
            {saving?"Saving…":"📅 Schedule order"}
          </button>
        </div>
      </div>
    </Drawer>
  );
}

// ─── MESSAGING COMPONENTS ─────────────────────────────────────────────────────

function MessagesTab({user, locs, allProps, allChars}) {
  const [view,       setView]       = useState("inbox"); // inbox | dm | request | newDM | newRequest
  const [dms,        setDms]        = useState([]);
  const [requests,   setRequests]   = useState([]);
  const [crew,       setCrew]       = useState([]);
  const [openDM,     setOpenDM]     = useState(null);
  const [openReq,    setOpenReq]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [unreadDMs,  setUnreadDMs]  = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const [d, r, c] = await Promise.all([
        sb.from("messages").select("*").or(`from_user.eq.${user.id},to_user.eq.${user.id}`).order("created_at",{ascending:false}),
        sb.from("prop_requests").select("*").or(`from_user.eq.${user.id},to_unit.eq.${locs.find(l=>l.id===user.unitId)?.id||""}`).order("created_at",{ascending:false}),
        sb.from("proppy_users").select("*").order("first_name"),
      ]);
      const allCrew = c.data || [];
      setCrew(allCrew.filter(u=>u.id!==user.id));
      // Enrich messages with user objects
      const msgs = (d.data||[]).map(m=>({
        ...m,
        from_user: allCrew.find(u=>u.id===m.from_user) || {id:m.from_user},
        to_user:   allCrew.find(u=>u.id===m.to_user)   || {id:m.to_user},
      }));
      setDms(msgs);
      // Enrich requests with user + location objects
      const reqs = (r.data||[]).map(req=>({
        ...req,
        from_user: allCrew.find(u=>u.id===req.from_user) || {id:req.from_user},
        to_unit:   locs.find(l=>l.id===req.to_unit)      || {id:req.to_unit},
      }));
      setRequests(reqs);
      const unread = msgs.filter(m=>m.to_user?.id===user.id&&!m.read).length;
      setUnreadDMs(unread);
    } catch(e) {
      console.error("Messages load error:", e);
    }
    setLoading(false);
  };

  useEffect(()=>{ load(); },[]);

  // Realtime
  useEffect(()=>{
    const ch = sb.channel("messages-realtime")
      .on("postgres_changes",{event:"*",schema:"public",table:"messages"},()=>load())
      .on("postgres_changes",{event:"*",schema:"public",table:"prop_requests"},()=>load())
      .on("postgres_changes",{event:"*",schema:"public",table:"request_messages"},()=>load())
      .subscribe();
    return ()=>sb.removeChannel(ch);
  },[]);

  // Group DMs by conversation partner
  const conversations = [];
  const seen = new Set();
  dms.forEach(m=>{
    const partner = m.from_user?.id===user.id ? m.to_user : m.from_user;
    if(!partner||seen.has(partner.id)) return;
    seen.add(partner.id);
    const msgs = dms.filter(x=>(x.from_user?.id===user.id&&x.to_user?.id===partner.id)||(x.from_user?.id===partner.id&&x.to_user?.id===user.id));
    const unread = msgs.filter(x=>x.to_user?.id===user.id&&!x.read).length;
    conversations.push({partner, latest:msgs[0], unread, msgs});
  });

  if(openDM) return <DMThread conv={openDM} user={user} locs={locs} onClose={()=>{setOpenDM(null);load();}} onBack={()=>{setOpenDM(null);load();}}/>;
  if(openReq) return <RequestThread req={openReq} user={user} locs={locs} allProps={allProps} onClose={()=>{setOpenReq(null);load();}} onBack={()=>{setOpenReq(null);load();}}/>;

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {/* Sub tabs */}
      <div style={{background:T.white,borderBottom:`1px solid ${T.border}`,display:"flex",padding:"0 16px",flexShrink:0}}>
        {[["inbox","Inbox"],["requests","Prop Requests"]].map(([k,label])=>{
          const a=view===k;
          const badge = k==="inbox"?unreadDMs:requests.filter(r=>r.status==="Pending"&&r.to_unit?.id===locs.find(l=>l.id===user.unitId)?.id).length;
          return(
            <button key={k} onClick={()=>setView(k)}
              style={{fontFamily:F,fontSize:12,fontWeight:a?700:500,color:a?T.ink:T.muted,padding:"10px 14px",background:"transparent",border:"none",borderBottom:`2px solid ${a?T.ink:"transparent"}`,cursor:"pointer",display:"flex",gap:5,alignItems:"center"}}>
              {label}
              {badge>0&&<span style={{background:T.redDk,color:"#fff",borderRadius:"50%",width:16,height:16,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700}}>{badge}</span>}
            </button>
          );
        })}
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",paddingRight:4}}>
          <button onClick={()=>setView(view==="inbox"?"newDM":"newRequest")}
            style={{fontFamily:F,fontSize:12,fontWeight:700,color:"#fff",background:T.ink,border:"none",borderRadius:20,padding:"5px 14px",cursor:"pointer"}}>
            + {view==="inbox"?"Message":"Request"}
          </button>
        </div>
      </div>

      {/* New DM */}
      {view==="newDM"&&(
        <NewDM user={user} crew={crew} locs={locs} onSent={()=>{setView("inbox");load();}} onBack={()=>setView("inbox")}/>
      )}

      {/* New Prop Request */}
      {view==="newRequest"&&(
        <NewPropRequest user={user} locs={locs} allProps={allProps} allChars={allChars} onSent={()=>{setView("requests");load();}} onBack={()=>setView("requests")}/>
      )}

      {/* Inbox */}
      {view==="inbox"&&(
        <div style={{flex:1,overflowY:"auto",padding:"10px 16px 80px"}}>
          {loading?<Spinner/>:conversations.length===0?(
            <div style={{textAlign:"center",padding:"60px 20px"}}>
              <div style={{fontSize:40,marginBottom:10}}>💬</div>
              <div style={{fontFamily:F,fontSize:15,fontWeight:600,color:T.body,marginBottom:4}}>No messages yet</div>
              <div style={{fontFamily:F,fontSize:12,color:T.muted}}>Tap + Message to start a conversation</div>
            </div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:2}}>
              {conversations.map(conv=>{
                const unit=locs.find(l=>l.id===conv.partner.unit_id);
                return(
                  <button key={conv.partner.id} onClick={()=>setOpenDM(conv)}
                    style={{display:"flex",gap:12,alignItems:"center",background:conv.unread>0?T.greenBg:T.white,border:`1.5px solid ${conv.unread>0?T.greenBd:T.border}`,borderRadius:14,padding:"12px 14px",cursor:"pointer",width:"100%",textAlign:"left",marginBottom:2}}
                    onMouseEnter={e=>e.currentTarget.style.background=conv.unread>0?T.greenBg:"#F8F8F8"}
                    onMouseLeave={e=>e.currentTarget.style.background=conv.unread>0?T.greenBg:T.white}>
                    <div style={{width:44,height:44,borderRadius:12,background:unit?.bg||T.bg,border:`1.5px solid ${unit?.bd||T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:F,fontSize:15,fontWeight:700,color:unit?.color||T.body,flexShrink:0}}>
                      {initials(`${conv.partner.first_name} ${conv.partner.surname}`)}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                        <span style={{fontFamily:F,fontSize:14,fontWeight:conv.unread>0?800:600,color:T.ink}}>{conv.partner.first_name} {conv.partner.surname}</span>
                        <span style={{fontFamily:F,fontSize:10,color:T.muted,flexShrink:0}}>{new Date(conv.latest.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{fontFamily:F,fontSize:12,color:T.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{conv.latest.body}</span>
                        {conv.unread>0&&<span style={{background:T.greenDk,color:"#fff",borderRadius:"50%",width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0,marginLeft:6}}>{conv.unread}</span>}
                      </div>
                      {unit&&<div style={{marginTop:3}}><span style={{fontFamily:F,fontSize:9,fontWeight:700,color:unit.color,background:unit.bg,border:`1px solid ${unit.bd}`,borderRadius:20,padding:"1px 7px"}}>{unit.name}</span></div>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Prop Requests */}
      {view==="requests"&&(
        <div style={{flex:1,overflowY:"auto",padding:"10px 16px 80px"}}>
          {loading?<Spinner/>:requests.length===0?(
            <div style={{textAlign:"center",padding:"60px 20px"}}>
              <div style={{fontSize:40,marginBottom:10}}>📦</div>
              <div style={{fontFamily:F,fontSize:15,fontWeight:600,color:T.body,marginBottom:4}}>No requests yet</div>
              <div style={{fontFamily:F,fontSize:12,color:T.muted}}>Tap + Request to request a prop from another unit</div>
            </div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:2}}>
              {requests.map(req=>{
                const isIncoming = req.to_unit?.id===locs.find(l=>l.id===user.unitId)?.id;
                const statusColor = req.status==="Approved"?T.greenDk:req.status==="Declined"?T.redDk:req.status==="Collected"?T.blueDk:T.amberDk;
                const statusBg    = req.status==="Approved"?T.greenBg:req.status==="Declined"?T.redBg:req.status==="Collected"?T.blueBg:T.amberBg;
                const statusBd    = req.status==="Approved"?T.greenBd:req.status==="Declined"?T.redBd:req.status==="Collected"?T.blueBd:T.amberBd;
                return(
                  <button key={req.id} onClick={()=>setOpenReq(req)}
                    style={{display:"flex",gap:12,alignItems:"center",background:T.white,border:`1.5px solid ${req.status==="Pending"&&isIncoming?T.amberBd:T.border}`,borderRadius:14,padding:"12px 14px",cursor:"pointer",width:"100%",textAlign:"left",marginBottom:2}}
                    onMouseEnter={e=>e.currentTarget.style.background="#F8F8F8"}
                    onMouseLeave={e=>e.currentTarget.style.background=T.white}>
                    <div style={{width:44,height:44,borderRadius:12,background:statusBg,border:`1.5px solid ${statusBd}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>📦</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:3}}>
                        <span style={{fontFamily:F,fontSize:14,fontWeight:600,color:T.ink,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{req.prop_name}</span>
                        <span style={{fontFamily:F,fontSize:10,fontWeight:700,color:statusColor,background:statusBg,border:`1px solid ${statusBd}`,borderRadius:20,padding:"2px 8px",flexShrink:0,marginLeft:6}}>{req.status}</span>
                      </div>
                      <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                        <span style={{fontFamily:F,fontSize:11,color:T.muted}}>{isIncoming?"From":"To"}: {isIncoming?`${req.from_user?.first_name} ${req.from_user?.surname}`:req.to_unit?.name}</span>
                        {req.scene&&<span style={{fontFamily:F,fontSize:11,color:T.muted}}>· Sc {req.scene}</span>}
                        <span style={{fontFamily:F,fontSize:10,fontWeight:700,color:req.urgency==="Critical"?T.redDk:req.urgency==="Urgent"?T.amberDk:T.blueDk}}>{req.urgency}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NewDM({user, crew, locs, onSent, onBack}) {
  const [toUser, setToUser] = useState(null);
  const [body,   setBody]   = useState("");
  const [sending,setSending]= useState(false);

  const send = async () => {
    if(!toUser||!body.trim()) return;
    setSending(true);
    await sb.from("messages").insert({from_user:user.id, to_user:toUser.id, body:body.trim()});
    // Notify recipient
    await sb.from("notifications").insert({user_id:toUser.id, type:"dm", title:`New message from ${user.name}`, body:body.trim().slice(0,80), read:false});
    setSending(false);
    onSent();
  };

  return (
    <div style={{flex:1,overflowY:"auto",padding:"16px 16px 80px"}}>
      <button onClick={onBack} style={{fontFamily:F,fontSize:12,color:T.muted,background:"none",border:"none",cursor:"pointer",marginBottom:16}}>← Back</button>
      <div style={{fontFamily:F,fontSize:17,fontWeight:700,color:T.ink,marginBottom:4}}>New Message</div>
      <div style={{fontFamily:F,fontSize:12,color:T.muted,marginBottom:16}}>Send a direct message to a crew member</div>

      <div style={{fontFamily:F,fontSize:12,fontWeight:600,color:T.body,marginBottom:8}}>To</div>
      <div style={{display:"flex",flexDirection:"column",gap:2,marginBottom:16,background:T.white,borderRadius:14,overflow:"hidden",border:`1px solid ${T.border}`}}>
        {crew.map((c,i)=>{
          const unit=locs.find(l=>l.id===c.unit_id);
          const sel=toUser?.id===c.id;
          return(
            <button key={c.id} onClick={()=>setToUser(sel?null:c)}
              style={{display:"flex",gap:10,alignItems:"center",padding:"11px 14px",background:sel?T.greenBg:"transparent",border:"none",borderBottom:i<crew.length-1?`1px solid ${T.border}`:"none",cursor:"pointer",textAlign:"left"}}
              onMouseEnter={e=>e.currentTarget.style.background=sel?T.greenBg:T.bg}
              onMouseLeave={e=>e.currentTarget.style.background=sel?T.greenBg:"transparent"}>
              <div style={{width:36,height:36,borderRadius:10,background:unit?.bg||T.bg,border:`1.5px solid ${unit?.bd||T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:F,fontSize:12,fontWeight:700,color:unit?.color||T.body,flexShrink:0}}>
                {initials(`${c.first_name} ${c.surname}`)}
              </div>
              <div style={{flex:1}}>
                <div style={{fontFamily:F,fontSize:13,fontWeight:600,color:T.ink}}>{c.first_name} {c.surname}</div>
                <div style={{fontFamily:F,fontSize:11,color:T.muted}}>{c.title}{unit?` · ${unit.name}`:""}</div>
              </div>
              {sel&&<span style={{color:T.greenDk,fontSize:16}}>✓</span>}
            </button>
          );
        })}
      </div>

      <div style={{fontFamily:F,fontSize:12,fontWeight:600,color:T.body,marginBottom:6}}>Message</div>
      <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="Type your message…" rows={4}
        style={{fontFamily:F,fontSize:13,color:T.ink,background:T.white,border:`1.5px solid ${T.border}`,borderRadius:12,padding:"11px 14px",outline:"none",width:"100%",boxSizing:"border-box",resize:"none",marginBottom:14}}/>

      <button onClick={send} disabled={!toUser||!body.trim()||sending}
        style={{width:"100%",fontFamily:F,fontSize:14,fontWeight:700,color:"#fff",background:!toUser||!body.trim()?"#ccc":T.ink,border:"none",borderRadius:12,padding:"13px 0",cursor:!toUser||!body.trim()?"not-allowed":"pointer"}}>
        {sending?"Sending…":"Send message →"}
      </button>
    </div>
  );
}

function DMThread({conv, user, locs, onBack}) {
  const [msgs,      setMsgs]     = useState(conv.msgs||[]);
  const [body,      setBody]     = useState("");
  const [sending,   setSending]  = useState(false);
  const [selected,  setSelected] = useState(null); // message id selected for delete
  const endRef = useRef();

  const deleteMsg = async (msgId) => {
    await sb.from("messages").delete().eq("id", msgId);
    setMsgs(ms => ms.filter(m => m.id !== msgId));
    setSelected(null);
  };

  useEffect(()=>{
    // Mark as read
    sb.from("messages").update({read:true}).eq("to_user",user.id).eq("from_user",conv.partner.id);
    endRef.current?.scrollIntoView({behavior:"smooth"});
  },[msgs]);

  // Realtime for this thread
  useEffect(()=>{
    const ch = sb.channel("dm-thread")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"messages"},payload=>{
        const m=payload.new;
        if((m.from_user===user.id&&m.to_user===conv.partner.id)||(m.from_user===conv.partner.id&&m.to_user===user.id)){
          sb.from("messages").select("*").eq("id",m.id).single()
            .then(({data})=>{ if(data) setMsgs(ms=>[...ms,data]); });
        }
      }).subscribe();
    return ()=>sb.removeChannel(ch);
  },[]);

  const send = async () => {
    if(!body.trim()) return;
    setSending(true);
    await sb.from("messages").insert({from_user:user.id, to_user:conv.partner.id, body:body.trim(), read:false});
    setBody("");
    setSending(false);
  };

  const unit=locs.find(l=>l.id===conv.partner.unit_id);

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {/* Header */}
      <div style={{background:T.white,borderBottom:`1px solid ${T.border}`,padding:"12px 16px",display:"flex",gap:12,alignItems:"center",flexShrink:0}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:T.ink,fontSize:20,cursor:"pointer",padding:0,lineHeight:1}}>‹</button>
        <div style={{width:36,height:36,borderRadius:10,background:unit?.bg||T.bg,border:`1.5px solid ${unit?.bd||T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:F,fontSize:13,fontWeight:700,color:unit?.color||T.body,flexShrink:0}}>
          {initials(`${conv.partner.first_name} ${conv.partner.surname}`)}
        </div>
        <div>
          <div style={{fontFamily:F,fontSize:14,fontWeight:700,color:T.ink}}>{conv.partner.first_name} {conv.partner.surname}</div>
          <div style={{fontFamily:F,fontSize:11,color:T.muted}}>{conv.partner.title}{unit?` · ${unit.name}`:""}</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{flex:1,overflowY:"auto",padding:"14px 16px",background:T.bg,display:"flex",flexDirection:"column",gap:8}}>
        {[...msgs].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)).map(m=>{
          const isMe=m.from_user?.id===user.id||m.from_user===user.id;
          const time=new Date(m.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
          return(
            <div key={m.id} style={{display:"flex",flexDirection:"column",alignItems:isMe?"flex-end":"flex-start",gap:2}}>
              <div
                onContextMenu={e=>{e.preventDefault();if(isMe)setSelected(m.id);}}
                onTouchStart={()=>{ if(!isMe)return; const t=setTimeout(()=>setSelected(m.id),500); return()=>clearTimeout(t); }}
                onClick={()=>{ if(selected===m.id)setSelected(null); }}
                style={{background:selected===m.id?"#FF4444":isMe?T.ink:T.white,color:isMe?"#fff":T.ink,borderRadius:isMe?"16px 4px 16px 16px":"4px 16px 16px 16px",padding:"10px 14px",maxWidth:"78%",fontFamily:F,fontSize:13,lineHeight:1.5,cursor:isMe?"pointer":"default",transition:"background 0.2s",position:"relative"}}>
                {m.body}
              </div>
              {selected===m.id&&(
                <div style={{display:"flex",gap:6,marginTop:2}}>
                  <button onClick={()=>deleteMsg(m.id)}
                    style={{fontFamily:F,fontSize:11,fontWeight:700,color:"#fff",background:T.redDk,border:"none",borderRadius:20,padding:"4px 12px",cursor:"pointer"}}>
                    🗑 Delete
                  </button>
                  <button onClick={()=>setSelected(null)}
                    style={{fontFamily:F,fontSize:11,fontWeight:600,color:T.body,background:T.bg,border:`1px solid ${T.border}`,borderRadius:20,padding:"4px 10px",cursor:"pointer"}}>
                    Cancel
                  </button>
                </div>
              )}
              <span style={{fontFamily:F,fontSize:9,color:T.muted,paddingLeft:isMe?0:4,paddingRight:isMe?4:0}}>{time}</span>
            </div>
          );
        })}
        <div ref={endRef}/>
      </div>

      {/* Input */}
      <div style={{background:T.white,borderTop:`1px solid ${T.border}`,padding:"10px 14px",display:"flex",gap:8,flexShrink:0}}>
        <input value={body} onChange={e=>setBody(e.target.value)} placeholder="Message…"
          onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}
          style={{flex:1,fontFamily:F,fontSize:13,color:T.ink,background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:22,padding:"9px 14px",outline:"none"}}/>
        <button onClick={send} disabled={!body.trim()||sending}
          style={{width:40,height:40,borderRadius:"50%",background:body.trim()?T.ink:"#ddd",border:"none",color:"#fff",fontSize:16,cursor:body.trim()?"pointer":"not-allowed",flexShrink:0}}>
          ↑
        </button>
      </div>
    </div>
  );
}

function NewPropRequest({user, locs, allProps, allChars, onSent, onBack}) {
  const [prop,    setProp]    = useState(null);
  const [toLoc,   setToLoc]   = useState("");
  const [scene,   setScene]   = useState("");
  const [urgency, setUrgency] = useState("Normal");
  const [note,    setNote]    = useState("");
  const [search,  setSearch]  = useState("");
  const [sending, setSending] = useState(false);

  const units = locs.filter(l=>l.id!==user.unitId); // all locations, not just units
  const results = search.length>1 ? allProps.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())||allChars.find(c=>c.id===p.character_id)?.name.toLowerCase().includes(search.toLowerCase())) : [];

  const send = async () => {
    if(!prop||!toLoc) return;
    setSending(true);
    const {data} = await sb.from("prop_requests").insert({
      prop_id:prop.id, prop_name:prop.name, from_user:user.id, to_unit:toLoc, scene, urgency, status:"Pending"
    }).select().single();
    if(data&&note.trim()){
      await sb.from("request_messages").insert({request_id:data.id, from_user:user.id, body:note.trim()});
    }
    // Notify all crew (so Workshop/Store requests are always seen)
    if(data){
      const destLoc = locs.find(l=>l.id===toLoc);
      const urgencyLabel = urgency==="Critical"?"🚨 CRITICAL":urgency==="Urgent"?"⚡ Urgent":"";
      const notifTitle = `${urgencyLabel?urgencyLabel+" ":""}Prop request: ${prop.name}`;
      const notifBody  = `${user.name} → ${destLoc?.name}${scene?` · Sc ${scene}`:""}`;
      // Try to notify destination unit crew first; if none, notify everyone
      const {data:destCrew} = await sb.from("proppy_users").select("id").eq("unit_id",toLoc);
      const targetCrew = (destCrew&&destCrew.length>0)
        ? destCrew
        : (await sb.from("proppy_users").select("id")).data || [];
      await Promise.all(
        targetCrew.filter(c=>c.id!==user.id).map(c=>
          sb.from("notifications").insert({user_id:c.id,type:"prop_request",title:notifTitle,body:notifBody,read:false})
        )
      );
    }
    setSending(false);
    onSent();
  };

  return (
    <div style={{flex:1,overflowY:"auto",padding:"16px 16px 80px"}}>
      <button onClick={onBack} style={{fontFamily:F,fontSize:12,color:T.muted,background:"none",border:"none",cursor:"pointer",marginBottom:16}}>← Back</button>
      <div style={{fontFamily:F,fontSize:17,fontWeight:700,color:T.ink,marginBottom:4}}>Request a Prop</div>
      <div style={{fontFamily:F,fontSize:12,color:T.muted,marginBottom:16}}>Request a prop from another unit</div>

      {/* Prop search */}
      <div style={{fontFamily:F,fontSize:12,fontWeight:600,color:T.body,marginBottom:6}}>Which prop?</div>
      {prop ? (
        <div style={{display:"flex",gap:10,alignItems:"center",background:T.greenBg,border:`1.5px solid ${T.greenBd}`,borderRadius:12,padding:"10px 14px",marginBottom:14}}>
          <span style={{fontSize:20}}>📦</span>
          <div style={{flex:1}}>
            <div style={{fontFamily:F,fontSize:13,fontWeight:700,color:T.ink}}>{prop.name}</div>
            {prop.scene&&<div style={{fontFamily:F,fontSize:11,color:T.muted}}>Sc {prop.scene}</div>}
          </div>
          <button onClick={()=>setProp(null)} style={{background:"none",border:"none",color:T.muted,fontSize:16,cursor:"pointer"}}>✕</button>
        </div>
      ) : (
        <>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search prop name or character…"
            style={{fontFamily:F,fontSize:13,color:T.ink,background:T.white,border:`1.5px solid ${T.border}`,borderRadius:12,padding:"10px 14px",outline:"none",width:"100%",boxSizing:"border-box",marginBottom:8}}/>
          {results.slice(0,6).map(p=>{
            const ch=allChars.find(c=>c.id===p.character_id);
            return(
              <button key={p.id} onClick={()=>{setProp(p);setSearch("");}}
                style={{width:"100%",display:"flex",gap:10,alignItems:"center",background:T.white,border:`1px solid ${T.border}`,borderRadius:10,padding:"9px 12px",cursor:"pointer",marginBottom:4,textAlign:"left"}}
                onMouseEnter={e=>e.currentTarget.style.background=T.bg}
                onMouseLeave={e=>e.currentTarget.style.background=T.white}>
                <span style={{fontSize:16}}>📦</span>
                <div>
                  <div style={{fontFamily:F,fontSize:13,fontWeight:600,color:T.ink}}>{p.name}</div>
                  {ch&&<div style={{fontFamily:F,fontSize:11,color:T.muted}}>{ch.name}</div>}
                </div>
              </button>
            );
          })}
        </>
      )}

      {/* To unit */}
      <div style={{fontFamily:F,fontSize:12,fontWeight:600,color:T.body,marginBottom:6,marginTop:4}}>Request from</div>
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        {units.map(loc=>{const a=toLoc===loc.id;return(
          <button key={loc.id} onClick={()=>setToLoc(loc.id)}
            style={{flex:1,fontFamily:F,fontSize:13,fontWeight:a?700:500,color:a?loc.color:T.body,background:a?loc.bg:T.bg,border:`2px solid ${a?loc.bd:T.border}`,borderRadius:12,padding:"12px 0",cursor:"pointer"}}>
            {loc.name}
          </button>
        );})}
      </div>

      {/* Scene + urgency */}
      <div style={{display:"flex",gap:10,marginBottom:14}}>
        <div style={{flex:1}}>
          <div style={{fontFamily:F,fontSize:12,fontWeight:600,color:T.body,marginBottom:5}}>Scene</div>
          <input value={scene} onChange={e=>setScene(e.target.value)} placeholder="e.g. 12"
            style={{fontFamily:F,fontSize:13,color:T.ink,background:T.white,border:`1.5px solid ${T.border}`,borderRadius:10,padding:"9px 12px",outline:"none",width:"100%",boxSizing:"border-box"}}/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontFamily:F,fontSize:12,fontWeight:600,color:T.body,marginBottom:5}}>Urgency</div>
          <div style={{display:"flex",gap:5}}>
            {["Normal","Urgent","Critical"].map(u=>{
              const a=urgency===u;
              const c=u==="Critical"?T.redDk:u==="Urgent"?T.amberDk:T.blueDk;
              const bg=u==="Critical"?T.redBg:u==="Urgent"?T.amberBg:T.blueBg;
              const bd=u==="Critical"?T.redBd:u==="Urgent"?T.amberBd:T.blueBd;
              return(
                <button key={u} onClick={()=>setUrgency(u)}
                  style={{flex:1,fontFamily:F,fontSize:10,fontWeight:a?700:500,color:a?c:T.muted,background:a?bg:T.bg,border:`1.5px solid ${a?bd:T.border}`,borderRadius:8,padding:"7px 0",cursor:"pointer"}}>
                  {u}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{fontFamily:F,fontSize:12,fontWeight:600,color:T.body,marginBottom:5}}>Note (optional)</div>
      <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Add context for the other unit…" rows={3}
        style={{fontFamily:F,fontSize:13,color:T.ink,background:T.white,border:`1.5px solid ${T.border}`,borderRadius:12,padding:"10px 14px",outline:"none",width:"100%",boxSizing:"border-box",resize:"none",marginBottom:16}}/>

      <button onClick={send} disabled={!prop||!toLoc||sending}
        style={{width:"100%",fontFamily:F,fontSize:14,fontWeight:700,color:"#fff",background:!prop||!toLoc?"#ccc":T.ink,border:"none",borderRadius:12,padding:"13px 0",cursor:!prop||!toLoc?"not-allowed":"pointer"}}>
        {sending?"Sending…":"Send request →"}
      </button>
    </div>
  );
}

function RequestThread({req, user, locs, allProps, onBack}) {
  const [msgs,    setMsgs]   = useState([]);
  const [body,    setBody]   = useState("");
  const [sending, setSending]= useState(false);
  const [status,  setStatus] = useState(req.status);
  const endRef = useRef();
  const isReceiver = req.to_unit?.id===locs.find(l=>l.id===user.unitId)?.id;

  useEffect(()=>{
    sb.from("request_messages").select("*").eq("request_id",req.id).order("created_at")
      .then(({data})=>setMsgs(data||[]));
  },[req.id]);

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs]);

  const send = async () => {
    if(!body.trim()) return;
    setSending(true);
    await sb.from("request_messages").insert({request_id:req.id, from_user:user.id, body:body.trim()});
    setMsgs(ms=>[...ms,{id:Date.now(),from_user:{id:user.id,first_name:user.firstName,surname:user.surname},body:body.trim(),created_at:new Date().toISOString()}]);
    setBody("");
    setSending(false);
  };

  const updateStatus = async (s) => {
    await sb.from("prop_requests").update({status:s}).eq("id",req.id);
    const msg = `${s==="Approved"?"✓ Approved":s==="Declined"?"✕ Declined":"✓ Marked as collected"} — ${user.name}`;
    await sb.from("request_messages").insert({request_id:req.id, from_user:user.id, body:msg});
    setStatus(s);
    setMsgs(ms=>[...ms,{id:Date.now(),from_user:{id:user.id,first_name:user.firstName,surname:user.surname},body:msg,created_at:new Date().toISOString()}]);
    // Notify the requester
    await sb.from("notifications").insert({user_id:req.from_user?.id||req.from_user, type:"request_update", title:`Request ${s}: ${req.prop_name}`, body:`${user.name} ${s.toLowerCase()} your prop request`, read:false});
  };

  const statusColor = status==="Approved"?T.greenDk:status==="Declined"?T.redDk:status==="Collected"?T.blueDk:T.amberDk;
  const statusBg    = status==="Approved"?T.greenBg:status==="Declined"?T.redBg:status==="Collected"?T.blueBg:T.amberBg;
  const statusBd    = status==="Approved"?T.greenBd:status==="Declined"?T.redBd:status==="Collected"?T.blueBd:T.amberBd;

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {/* Header */}
      <div style={{background:T.white,borderBottom:`1px solid ${T.border}`,padding:"12px 16px",flexShrink:0}}>
        <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:8}}>
          <button onClick={onBack} style={{background:"none",border:"none",color:T.ink,fontSize:20,cursor:"pointer",padding:0,lineHeight:1}}>‹</button>
          <div style={{flex:1}}>
            <div style={{fontFamily:F,fontSize:14,fontWeight:700,color:T.ink}}>{req.prop_name}</div>
            <div style={{fontFamily:F,fontSize:11,color:T.muted}}>
              {isReceiver?`From ${req.from_user?.first_name} ${req.from_user?.surname}`:`To ${req.to_unit?.name}`}
              {req.scene&&` · Sc ${req.scene}`}
            </div>
          </div>
          <span style={{fontFamily:F,fontSize:11,fontWeight:700,color:statusColor,background:statusBg,border:`1px solid ${statusBd}`,borderRadius:20,padding:"3px 10px"}}>{status}</span>
        </div>
        <div style={{display:"flex",gap:5}}>
          <span style={{fontFamily:F,fontSize:10,fontWeight:700,color:req.urgency==="Critical"?T.redDk:req.urgency==="Urgent"?T.amberDk:T.blueDk,background:req.urgency==="Critical"?T.redBg:req.urgency==="Urgent"?T.amberBg:T.blueBg,border:`1px solid ${req.urgency==="Critical"?T.redBd:req.urgency==="Urgent"?T.amberBd:T.blueBd}`,borderRadius:20,padding:"2px 8px"}}>{req.urgency}</span>
        </div>
      </div>

      {/* Thread */}
      <div style={{flex:1,overflowY:"auto",padding:"14px 16px",background:T.bg,display:"flex",flexDirection:"column",gap:8}}>
        {msgs.map(m=>{
          const isMe=m.from_user?.id===user.id;
          const unit=locs.find(l=>l.id===m.from_user?.unit_id);
          return(
            <div key={m.id} style={{display:"flex",flexDirection:"column",alignItems:isMe?"flex-end":"flex-start",gap:2}}>
              {!isMe&&<span style={{fontFamily:F,fontSize:10,color:T.muted,paddingLeft:4}}>{m.from_user?.first_name}</span>}
              <div style={{background:isMe?T.ink:T.white,color:isMe?"#fff":T.ink,borderRadius:isMe?"16px 4px 16px 16px":"4px 16px 16px 16px",padding:"10px 14px",maxWidth:"78%",fontFamily:F,fontSize:13,lineHeight:1.5,boxShadow:T.s1}}>
                {m.body}
              </div>
              <span style={{fontFamily:F,fontSize:9,color:T.muted,paddingLeft:isMe?0:4,paddingRight:isMe?4:0}}>{new Date(m.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
            </div>
          );
        })}
        <div ref={endRef}/>
      </div>

      {/* Action buttons for receiver */}
      {isReceiver&&status==="Pending"&&(
        <div style={{background:T.white,borderTop:`1px solid ${T.border}`,padding:"10px 14px",display:"flex",gap:8,flexShrink:0}}>
          <button onClick={()=>updateStatus("Declined")} style={{flex:1,fontFamily:F,fontSize:13,fontWeight:700,color:T.redDk,background:T.redBg,border:`1.5px solid ${T.redBd}`,borderRadius:10,padding:"10px 0",cursor:"pointer"}}>Decline</button>
          <button onClick={()=>updateStatus("Approved")} style={{flex:2,fontFamily:F,fontSize:13,fontWeight:700,color:T.greenDk,background:T.greenBg,border:`1.5px solid ${T.greenBd}`,borderRadius:10,padding:"10px 0",cursor:"pointer"}}>✓ Approve</button>
        </div>
      )}
      {isReceiver&&status==="Approved"&&(
        <div style={{background:T.white,borderTop:`1px solid ${T.border}`,padding:"10px 14px",flexShrink:0}}>
          <button onClick={()=>updateStatus("Collected")} style={{width:"100%",fontFamily:F,fontSize:13,fontWeight:700,color:T.blueDk,background:T.blueBg,border:`1.5px solid ${T.blueBd}`,borderRadius:10,padding:"10px 0",cursor:"pointer"}}>Mark as collected</button>
        </div>
      )}

      {/* Reply input */}
      <div style={{background:T.white,borderTop:`1px solid ${T.border}`,padding:"10px 14px",display:"flex",gap:8,flexShrink:0}}>
        <input value={body} onChange={e=>setBody(e.target.value)} placeholder="Reply…"
          onKeyDown={e=>e.key==="Enter"&&send()}
          style={{flex:1,fontFamily:F,fontSize:13,color:T.ink,background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:22,padding:"9px 14px",outline:"none"}}/>
        <button onClick={send} disabled={!body.trim()||sending}
          style={{width:40,height:40,borderRadius:"50%",background:body.trim()?T.ink:"#ddd",border:"none",color:"#fff",fontSize:16,cursor:body.trim()?"pointer":"not-allowed",flexShrink:0}}>↑</button>
      </div>
    </div>
  );
}


// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

const vibrate = (pattern=[100]) => {
  try { if(navigator.vibrate) navigator.vibrate(pattern); } catch(_) {}
};

const NOTIF_ICONS = {
  prop_request:   "📦",
  request_update: "✅",
  dm:             "💬",
  scan_out:       "📤",
  scan_in:        "📥",
  general:        "🔔",
};


function NotificationBell({user, onOpen, count}) {
  return (
    <button onClick={onOpen}
      style={{position:"relative",background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:"50%",width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
      <span style={{fontSize:16}}>🔔</span>
      {count>0&&(
        <span style={{position:"absolute",top:-4,right:-4,background:T.redDk,color:"#fff",borderRadius:"50%",width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,border:"2px solid #fff"}}>
          {count>9?"9+":count}
        </span>
      )}
    </button>
  );
}

function NotificationTray({user, locs, onClose}) {
  const [notifs,  setNotifs]  = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const {data} = await sb.from("notifications")
      .select("*").eq("user_id", user.id)
      .order("created_at",{ascending:false}).limit(40);
    setNotifs(data||[]);
    setLoading(false);
  };

  useEffect(()=>{ load(); },[]);

  const markAllRead = async () => {
    await sb.from("notifications").update({read:true}).eq("user_id",user.id).eq("read",false);
    setNotifs(ns=>ns.map(n=>({...n,read:true})));
  };

  const unread = notifs.filter(n=>!n.read).length;

  return (
    <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.3)",backdropFilter:"blur(2px)"}} onClick={onClose}/>
      <div style={{position:"relative",background:T.white,borderRadius:"20px 20px 0 0",maxHeight:"80vh",display:"flex",flexDirection:"column",boxShadow:"0 -4px 40px rgba(0,0,0,0.15)"}}>
        {/* Handle */}
        <div style={{padding:"10px 0 0",display:"flex",justifyContent:"center",flexShrink:0}}>
          <div style={{width:36,height:4,background:T.border,borderRadius:2}}/>
        </div>
        {/* Header */}
        <div style={{padding:"12px 20px 10px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,borderBottom:`1px solid ${T.border}`}}>
          <div>
            <span style={{fontFamily:F,fontSize:17,fontWeight:700,color:T.ink}}>Notifications</span>
            {unread>0&&<span style={{fontFamily:F,fontSize:11,color:T.redDk,fontWeight:600,marginLeft:8}}>{unread} new</span>}
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            {unread>0&&(
              <button onClick={markAllRead}
                style={{fontFamily:F,fontSize:11,fontWeight:600,color:T.blueDk,background:T.blueBg,border:`1px solid ${T.blueBd}`,borderRadius:20,padding:"4px 10px",cursor:"pointer"}}>
                Mark all read
              </button>
            )}
            <button onClick={onClose} style={{background:T.bg,border:"none",borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:T.body}}>✕</button>
          </div>
        </div>
        {/* List */}
        <div style={{overflowY:"auto",flex:1,padding:"6px 0 24px"}}>
          {loading ? (
            <div style={{textAlign:"center",padding:"30px 0"}}><Spinner/></div>
          ) : notifs.length===0 ? (
            <div style={{textAlign:"center",padding:"50px 20px"}}>
              <div style={{fontSize:40,marginBottom:10}}>🔔</div>
              <div style={{fontFamily:F,fontSize:14,fontWeight:600,color:T.body}}>All clear</div>
              <div style={{fontFamily:F,fontSize:12,color:T.muted,marginTop:4}}>No notifications yet</div>
            </div>
          ) : notifs.map((n,i)=>{
            const icon = NOTIF_ICONS[n.type]||NOTIF_ICONS.general;
            const time = new Date(n.created_at);
            const timeStr = time.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
            const dateStr = time.toLocaleDateString("en-GB",{day:"numeric",month:"short"});
            const isToday = new Date().toDateString()===time.toDateString();
            return (
              <div key={n.id}
                style={{display:"flex",gap:12,alignItems:"flex-start",padding:"12px 20px",background:n.read?"transparent":"#FFFBEB",borderBottom:`1px solid ${T.border}`,cursor:"pointer"}}
                onClick={async()=>{
                  if(!n.read) await sb.from("notifications").update({read:true}).eq("id",n.id);
                  setNotifs(ns=>ns.map(x=>x.id===n.id?{...x,read:true}:x));
                }}>
                {/* Icon */}
                <div style={{width:40,height:40,borderRadius:12,background:n.read?T.bg:"#FEF9C3",border:`1.5px solid ${n.read?T.border:"#FDE68A"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>
                  {icon}
                </div>
                {/* Content */}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:2}}>
                    <span style={{fontFamily:F,fontSize:13,fontWeight:n.read?600:700,color:T.ink,flex:1,paddingRight:8,lineHeight:1.3}}>{n.title}</span>
                    <span style={{fontFamily:F,fontSize:10,color:T.muted,flexShrink:0}}>{isToday?timeStr:dateStr}</span>
                  </div>
                  {n.body&&<div style={{fontFamily:F,fontSize:12,color:T.body,lineHeight:1.4}}>{n.body}</div>}
                </div>
                {!n.read&&<div style={{width:8,height:8,borderRadius:"50%",background:T.amberDk,flexShrink:0,marginTop:6}}/>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


function UserBadge({user,locs,onSwitch}){
  const [open,setOpen]=useState(false);
  const unit=locs.find(l=>l.id===user.unitId);
  return(
    <div style={{position:"relative"}}>
      <button onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:6,background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:20,padding:"5px 10px 5px 6px",cursor:"pointer"}}>
        <div style={{width:22,height:22,borderRadius:7,background:unit?.bg||T.bg,border:`1.5px solid ${unit?.bd||T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:unit?.color||T.body}}>{initials(user.name)}</div>
        <span style={{fontFamily:F,fontSize:11,fontWeight:600,color:T.body}}>{user.firstName}</span>
        {unit&&<span style={{fontFamily:F,fontSize:9,fontWeight:700,color:unit.color,background:unit.bg,border:`1px solid ${unit.bd}`,borderRadius:20,padding:"1px 6px"}}>{unit.name}</span>}
      </button>
      {open&&(
        <div style={{position:"absolute",top:"110%",right:0,background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 14px",minWidth:180,boxShadow:"0 4px 20px rgba(0,0,0,0.1)",zIndex:100}}>
          <div style={{fontFamily:F,fontSize:13,fontWeight:700,color:T.ink,marginBottom:2}}>{user.name}</div>
          <div style={{fontFamily:F,fontSize:11,color:T.muted,marginBottom:10}}>{user.title}{unit?` · ${unit.name}`:""}</div>
          <button onClick={()=>{setOpen(false);onSwitch();}} style={{width:"100%",fontFamily:F,fontSize:12,fontWeight:600,color:T.redDk,background:T.redBg,border:`1px solid ${T.redBd}`,borderRadius:8,padding:"7px 0",cursor:"pointer"}}>Log out</button>
        </div>
      )}
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function Proppy(){
  const [user,       setUser]       = useState(()=>getUser());
  const [locs,       setLocs]       = useState([]);
  const [chars,      setChars]      = useState([]);
  const [props,      setProps]      = useState([]);
  const [loading,    setLoading]    = useState(true);

  const [tab,        setTab]        = useState("Characters");
  const [openChar,   setOpenChar]   = useState(null);
  const [editProp,   setEditProp]   = useState(null);
  const [scanProp,   setScanProp]   = useState(null);
  const [timeline,   setTimeline]   = useState(null);
  const [addChar,    setAddChar]    = useState(false);
  const [addLoc,     setAddLoc]     = useState(false);
  const [editLoc,    setEditLoc]    = useState(null);
  const [showScanner,setShowScanner]= useState(false);
  const [toast,      setToast]      = useState(null);
  const [editProj,   setEditProj]   = useState(false);
  const [project,    setProject]    = useState("Project Utopia");

  const showToast=(msg,color)=>{setToast({msg,color});setTimeout(()=>setToast(null),2500);};

  // ── LOAD DATA ──
  const loadAll = useCallback(async()=>{
    setLoading(true);
    const [l,c,p] = await Promise.all([
      sb.from("locations").select("*").order("created_at"),
      sb.from("characters").select("*").order("created_at"),
      sb.from("props").select("*").order("created_at"),
    ]);
    if(l.data) setLocs(l.data);
    if(c.data) setChars(c.data);
    if(p.data) setProps(p.data);
    setLoading(false);
  },[]);

  useEffect(()=>{ loadAll(); },[loadAll]);

  // ── REALTIME ──
  useEffect(()=>{
    const ch = sb.channel("proppy-realtime")
      .on("postgres_changes",{event:"*",schema:"public",table:"props"},     ()=>loadAll())
      .on("postgres_changes",{event:"*",schema:"public",table:"characters"},()=>loadAll())
      .on("postgres_changes",{event:"*",schema:"public",table:"locations"}, ()=>loadAll())
      .subscribe();
    return ()=>sb.removeChannel(ch);
  },[loadAll]);

  // ── LOG HELPER ──
  const addLog = async(propId,action,locationId,scene)=>{
    await sb.from("prop_logs").insert({
      prop_id:propId, action, location_id:locationId, scene:scene||"",
      user_name:user?.name||null, user_title:user?.title||null,
    });
  };

  // ── SCAN OUT / IN ──
  const doScanOut = async(propId,toLocId,scene)=>{
    await sb.from("props").update({in_box:false,location_id:toLocId,updated_at:new Date().toISOString()}).eq("id",propId);
    await addLog(propId,"SCAN OUT",toLocId,scene);
    showToast(`📤 Scanned out → ${locs.find(l=>l.id===toLocId)?.name}`,T.amberDk);
    // Notify all crew in destination unit
    const destUnit = locs.find(l=>l.id===toLocId);
    const prop = props.find(p=>p.id===propId);
    const {data:destCrew} = await sb.from("proppy_users").select("id").eq("unit_id",toLocId);
    if(destCrew) await Promise.all(destCrew.filter(c=>c.id!==user.id).map(c=>
      sb.from("notifications").insert({user_id:c.id,type:"scan_out",title:`Prop incoming: ${prop?.name||"Prop"}`,body:`${user.name} scanned out to ${destUnit?.name}${scene?` · Sc ${scene}`:""}`,read:false})
    ));
  };
  const doScanIn = async(propId)=>{
    const prop=props.find(p=>p.id===propId);
    await sb.from("props").update({in_box:true,updated_at:new Date().toISOString()}).eq("id",propId);
    await addLog(propId,"SCAN IN",prop?.location_id,"");
    showToast("📥 Back in box",T.greenDk);
  };
  const doBulkMove = async(propIds,toLocId,scene)=>{
    await sb.from("props").update({in_box:false,location_id:toLocId,updated_at:new Date().toISOString()}).in("id",propIds);
    await Promise.all(propIds.map(id=>addLog(id,"BULK MOVE",toLocId,scene)));
    showToast(`📦 ${propIds.length} props → ${locs.find(l=>l.id===toLocId)?.name}`,T.purpleDk);
  };

  // ── SAVE PROP ──
  const saveProp = async(p)=>{
    const isNew = !p.id;
    const payload = {name:p.name,scene:p.scene,status:p.status,in_box:p.in_box,notes:p.notes,image_url:p.image_url,character_id:p.character_id||null,location_id:p.location_id||null,updated_at:new Date().toISOString()};
    if(isNew){
      const {data}=await sb.from("props").insert(payload).select().single();
      if(data) await addLog(data.id,"ADDED",data.location_id,"");
    } else {
      await sb.from("props").update(payload).eq("id",p.id);
      await addLog(p.id,"EDITED",p.location_id,"");
    }
    setEditProp(null);
  };

  // ── SAVE CHARACTER ──
  const saveChar = async(c)=>{
    const payload={name:c.name,box_label:c.box_label,scenes:c.scenes,image_url:c.image_url||null};
    if(c.id) await sb.from("characters").update(payload).eq("id",c.id);
    else     await sb.from("characters").insert(payload);
  };

  // ── SAVE LOCATION ──
  const saveLoc = async(l)=>{
    const payload={name:l.name,type:l.type,description:l.description,color:l.color,bg:l.bg,bd:l.bd};
    if(l.id) await sb.from("locations").update(payload).eq("id",l.id);
    else     await sb.from("locations").insert(payload);
  };
  const delLoc = async(id)=>{
    await sb.from("locations").delete().eq("id",id);
  };

  const handleSignup = (u)=>{ setUser(u); };

  // ── NOTIFICATIONS ──
  const [showNotifTray, setShowNotifTray] = useState(false);
  const [notifToast,    setNotifToast]    = useState(null);
  const [notifCount,    setNotifCount]    = useState(0);

  const handleNewNotif = useCallback((n) => {
    setNotifToast(n);
    setNotifCount(c=>c+1);
    setTimeout(()=>setNotifToast(null), 3500);
  },[]);

  // Load unread count
  useEffect(()=>{
    if(!user) return;
    sb.from("notifications").select("id",{count:"exact"}).eq("user_id",user.id).eq("read",false)
      .then(({count:c})=>setNotifCount(c||0));
  },[user]);

  // Realtime notifications listener
  useEffect(()=>{
    if(!user) return;
    const ch = sb.channel("notifs-"+user.id)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"notifications",filter:`user_id=eq.${user.id}`},
        payload=>{
          const n=payload.new;
          if(n.type==="prop_request")        vibrate([200,100,200]);
          else if(n.type==="dm")             vibrate([100]);
          else if(n.type==="request_update") vibrate([300]);
          else                               vibrate([100,50,100]);
          handleNewNotif(n);
        }
      ).subscribe();
    return()=>sb.removeChannel(ch);
  },[user, handleNewNotif]);

  const [showCrewPicker, setShowCrewPicker] = useState(false);
  const handleSwitch = ()=>{ saveUser(null); setUser(null); };
  const handlePickCrew = (u)=>{
    const picked = { id:u.id, name:`${u.first_name} ${u.surname}`, firstName:u.first_name, surname:u.surname, title:u.title, unitId:u.unit_id };
    saveUser(picked); setUser(picked); setShowCrewPicker(false);
  };

  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(()=>{
    if(!user) return;
    sb.from("messages").select("id",{count:"exact"}).eq("to_user",user.id).eq("read",false)
      .then(({count})=>setUnreadCount(count||0));
  },[props, user]);

  const totalOut  = props.filter(p=>!p.in_box).length;
  const vfxLoc    = locs.find(l=>l.name==="VFX Scan");
  const vfxProps  = props.filter(p=>p.location_id===vfxLoc?.id);

  // First time only — no user in localStorage -> show landing + signup
  if(!user) return <SignupScreen locs={locs.length?locs:[{id:"l1",name:"Paramecia",type:"Unit",color:"#16A34A",bg:"#F0FDF4",bd:"#BBF7D0"},{id:"l2",name:"Zoan",type:"Unit",color:"#2563EB",bg:"#EFF6FF",bd:"#BFDBFE"}]} onSignup={handleSignup}/>;
  if(loading) return <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}><Spinner/><div style={{fontFamily:F,fontSize:13,color:T.muted}}>Loading Proppy...</div></div>;

  return(
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:F,maxWidth:480,margin:"0 auto",display:"flex",flexDirection:"column"}}>
      {/* HEADER */}
      <div style={{background:T.white,borderBottom:`1px solid ${T.border}`,padding:"14px 18px 12px",position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
          <div>
            {editProj
              ?<input autoFocus value={project} onChange={e=>setProject(e.target.value)} onBlur={()=>setEditProj(false)} onKeyDown={e=>e.key==="Enter"&&setEditProj(false)}
                  style={{fontFamily:F,fontSize:19,fontWeight:800,color:T.ink,background:"transparent",border:"none",outline:"none",letterSpacing:"-0.02em"}}/>
              :<button onClick={()=>setEditProj(true)} style={{fontFamily:F,fontSize:19,fontWeight:800,color:T.ink,background:"none",border:"none",cursor:"pointer",padding:0,letterSpacing:"-0.02em"}}>{project}</button>
            }
            <div style={{fontFamily:F,fontSize:11,color:T.muted,marginTop:1}}>Props tracking</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button onClick={()=>setShowScanner(true)}
              style={{display:"flex",alignItems:"center",gap:5,fontFamily:F,fontSize:12,fontWeight:700,color:"#fff",background:T.ink,border:"none",borderRadius:20,padding:"7px 14px",cursor:"pointer"}}>
              ⊡ Scan
              {totalOut>0&&<span style={{background:T.amber,color:"#fff",borderRadius:"50%",width:15,height:15,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:800}}>{totalOut}</span>}
            </button>
            <NotificationBell user={user} count={notifCount} onOpen={()=>{setShowNotifTray(true);setNotifCount(0);sb.from("notifications").update({read:true}).eq("user_id",user.id).eq("read",false);}}/>
            <UserBadge user={user} locs={locs} onSwitch={handleSwitch}/>
          </div>
        </div>
        <div style={{display:"flex",gap:2,background:T.bg,borderRadius:10,padding:3}}>
          {["Characters","Locations","VFX","Messages","Calendar"].map(t=>{const a=tab===t;return(
            <button key={t} onClick={()=>setTab(t)}
              style={{flex:1,fontFamily:F,fontSize:13,fontWeight:a?700:500,color:a?T.ink:T.muted,background:a?T.white:"transparent",border:"none",borderRadius:8,padding:"7px 0",cursor:"pointer",boxShadow:a?"0 1px 4px rgba(0,0,0,0.08)":"none",transition:"all 0.15s"}}>
              {t}
              {t==="VFX"&&vfxProps.length>0&&<span style={{marginLeft:4,background:T.purpleDk,color:"#fff",borderRadius:"50%",width:14,height:14,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:8}}>{vfxProps.length}</span>}
              {t==="Messages"&&unreadCount>0&&<span style={{marginLeft:4,background:T.redDk,color:"#fff",borderRadius:"50%",width:14,height:14,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:8}}>{unreadCount}</span>}
            </button>
          );})}
        </div>
      </div>

      {/* CHARACTERS */}
      {tab==="Characters"&&(
        <div style={{flex:1,padding:"12px 16px 80px"}}>
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}>
            <button onClick={()=>setAddChar(true)} style={{fontFamily:F,fontSize:12,fontWeight:600,color:"#fff",background:T.ink,border:"none",borderRadius:20,padding:"5px 14px",cursor:"pointer"}}>+ Character</button>
          </div>
          {chars.length===0
            ?<div style={{textAlign:"center",padding:"60px 0"}}><div style={{fontSize:40,marginBottom:10}}>👤</div><div style={{fontFamily:F,fontSize:15,fontWeight:600,color:T.body}}>No characters yet</div></div>
            :<div style={{display:"flex",flexDirection:"column",gap:2}}>
              {[...chars].sort((a,b)=>(b.main_cast?1:0)-(a.main_cast?1:0)).map((ch,i)=>{
                const cp=props.filter(p=>p.character_id===ch.id);
                const out=cp.filter(p=>!p.in_box);
                const dmg=cp.filter(p=>p.status==="DAMAGED");
                const spreadLids=[...new Set(cp.map(p=>p.location_id).filter(Boolean))];
                const spreadLocs=locs.filter(l=>spreadLids.includes(l.id));
                const primaryLoc=spreadLocs.length>0?spreadLocs.reduce((a,b)=>cp.filter(p=>p.location_id===b.id).length>cp.filter(p=>p.location_id===a.id).length?b:a):null;
                return(
                  <button key={ch.id} onClick={()=>setOpenChar(ch)}
                    style={{display:"flex",gap:14,alignItems:"center",background:T.white,border:"none",borderRadius:14,padding:"13px 16px",cursor:"pointer",width:"100%",textAlign:"left",marginBottom:2,boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#F8F8F8"}
                    onMouseLeave={e=>e.currentTarget.style.background=T.white}>
                    <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
                      <span style={{fontFamily:F,fontSize:12,fontWeight:500,color:T.muted,width:16,textAlign:"right"}}>{i+1}.</span>
                      <div style={{position:"relative"}}>
                        <div style={{width:44,height:44,borderRadius:12,background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",fontSize:15,fontWeight:800,color:T.ink}}>
                          {ch.image_url?<img src={ch.image_url} alt={ch.name||""} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:initials(ch.name)}
                        </div>
                        {primaryLoc&&<div style={{position:"absolute",bottom:-2,right:-2,width:12,height:12,borderRadius:"50%",background:primaryLoc.color,border:"2px solid #fff"}}/>}
                      </div>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:F,fontSize:15,fontWeight:700,color:T.ink,marginBottom:4,display:"flex",gap:6,alignItems:"center"}}>
                        {ch.name}
                        {ch.main_cast&&<span style={{fontSize:12}}>⭐</span>}
                      </div>
                      <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}>
                        {primaryLoc&&<span style={{fontFamily:F,fontSize:11,fontWeight:700,color:primaryLoc.color,background:primaryLoc.bg,border:`1px solid ${primaryLoc.bd}`,borderRadius:20,padding:"1px 8px"}}>{primaryLoc.name}</span>}
                        {spreadLocs.length>1&&<span style={{fontFamily:F,fontSize:10,color:T.muted}}>+{spreadLocs.length-1} more</span>}
                        <span style={{fontFamily:F,fontSize:11,color:T.muted}}>{ch.box_label}</span>
                        {ch.scenes&&<span style={{fontFamily:F,fontSize:11,color:T.muted}}>· Sc {ch.scenes}</span>}
                      </div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end",flexShrink:0}}>
                      <span style={{fontFamily:F,fontSize:11,color:T.muted}}>{cp.length} props</span>
                      {out.length>0&&<Badge label={`${out.length} out`} c={T.amberDk} bg={T.amberBg} bd={T.amberBd} dot={T.amber} sz={10}/>}
                      {dmg.length>0&&<Badge label={`${dmg.length} dmg`} c={T.redDk} bg={T.redBg} bd={T.redBd} sz={10}/>}
                    </div>
                    <span style={{color:T.muted,fontSize:16,flexShrink:0}}>›</span>
                  </button>
                );
              })}
            </div>
          }
        </div>
      )}

      {/* LOCATIONS */}
      {tab==="Locations"&&(
        <div style={{flex:1,padding:"12px 16px 80px"}}>
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}>
            <button onClick={()=>setAddLoc(true)} style={{fontFamily:F,fontSize:12,fontWeight:600,color:"#fff",background:T.ink,border:"none",borderRadius:20,padding:"5px 14px",cursor:"pointer"}}>+ Location</button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:2}}>
            {locs.map(loc=>{
              const lp=props.filter(p=>p.location_id===loc.id);
              const out=lp.filter(p=>!p.in_box);
              return(
                <div key={loc.id} style={{background:T.white,borderRadius:14,padding:"13px 16px",display:"flex",gap:12,alignItems:"center",marginBottom:2,boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
                  <div style={{width:44,height:44,borderRadius:12,background:loc.bg,border:`1.5px solid ${loc.bd}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{fontFamily:F,fontSize:12,fontWeight:800,color:loc.color}}>{(loc.name||"").slice(0,2).toUpperCase()}</span>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:F,fontSize:14,fontWeight:700,color:T.ink,marginBottom:2}}>{loc.name}</div>
                    <div style={{fontFamily:F,fontSize:11,color:T.muted,marginBottom:5}}>{loc.description}</div>
                    <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                      <Badge label={`${lp.length} props`} c={T.blueDk} bg={T.blueBg} bd={T.blueBd} sz={10}/>
                      {out.length>0&&<Badge label={`${out.length} out`} c={T.amberDk} bg={T.amberBg} bd={T.amberBd} dot={T.amber} sz={10}/>}
                    </div>
                  </div>
                  <button onClick={()=>setEditLoc(loc)} style={{background:"none",border:"none",color:T.muted,fontSize:18,cursor:"pointer",padding:"0 4px"}}>⋯</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VFX */}
      {tab==="VFX"&&(
        <div style={{flex:1,padding:"12px 16px 80px"}}>
          <div style={{fontFamily:F,fontSize:13,fontWeight:600,color:T.body,marginBottom:12}}>Props at VFX Scan ({vfxProps.length})</div>
          {vfxProps.length===0
            ?<div style={{textAlign:"center",padding:"60px 0"}}><div style={{fontSize:36,marginBottom:10}}>🎬</div><div style={{fontFamily:F,fontSize:14,fontWeight:600,color:T.body}}>No props at VFX Scan</div></div>
            :<div style={{display:"flex",flexDirection:"column",gap:2}}>
              {vfxProps.map(p=>{
                const ch=chars.find(c=>c.id===p.character_id);
                return(
                  <div key={p.id} style={{background:T.white,borderRadius:14,padding:"12px 14px",display:"flex",gap:12,alignItems:"center",marginBottom:2,boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
                    <div style={{width:44,height:44,borderRadius:12,background:T.bg,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:p.image_url?0:20}}>
                      {p.image_url?<img src={p.image_url} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:"📦"}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:F,fontSize:13,fontWeight:700,color:T.ink,marginBottom:3}}>{p.name}</div>
                      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                        <SBadge s={p.status}/>
                        {ch&&<span style={{fontFamily:F,fontSize:10,color:T.muted}}>{ch.name}</span>}
                        {p.scene&&<span style={{fontFamily:F,fontSize:10,color:T.muted}}>Sc {p.scene}</span>}
                      </div>
                      {p.notes&&<div style={{fontFamily:F,fontSize:11,color:T.muted,marginTop:2}}>{p.notes}</div>}
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:5,alignItems:"flex-end"}}>
                      <button onClick={()=>setTimeline(p)} style={{fontFamily:F,fontSize:10,fontWeight:600,color:T.blueDk,background:T.blueBg,border:`1px solid ${T.blueBd}`,borderRadius:8,padding:"4px 8px",cursor:"pointer"}}>⏱ History</button>
                      <button onClick={()=>doScanIn(p.id)} style={{fontFamily:F,fontSize:11,fontWeight:700,color:"#fff",background:T.greenDk,border:"none",borderRadius:8,padding:"5px 10px",cursor:"pointer"}}>📥 Return</button>
                    </div>
                  </div>
                );
              })}
            </div>
          }
        </div>
      )}

      {/* MESSAGES */}
      {tab==="Messages"&&(
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <MessagesTab user={user} locs={locs} allProps={props} allChars={chars}/>
        </div>
      )}

      {/* CALENDAR */}
      {tab==="Calendar"&&(
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <CalendarTab user={user} locs={locs} allProps={props} allChars={chars}/>
        </div>
      )}

      {/* SCANNER */}
      {showScanner&&<ScannerScreen props={props} chars={chars} locs={locs} user={user} onScanOut={doScanOut} onScanIn={doScanIn} onBulkMove={doBulkMove} onClose={()=>setShowScanner(false)}/>}

      {/* DRAWERS */}
      {openChar&&<CharPopup char={openChar} allProps={props} locs={locs} onClose={()=>setOpenChar(null)} onAddProp={()=>setEditProp({character_id:openChar.id,name:"",scene:"",location_id:locs[0]?.id||"",status:"STANDBY",in_box:true,notes:"",image_url:null})} onEditProp={p=>setEditProp(p)} onScanProp={p=>setScanProp(p)} onViewTimeline={p=>setTimeline(p)}/>}
      {editProp&&<PropDrawer prop={editProp} chars={chars} locs={locs} user={user} onClose={()=>setEditProp(null)} onSave={saveProp}/>}
      {scanProp&&<Drawer onClose={()=>setScanProp(null)} title={null}><ScanAction prop={scanProp} locs={locs} onScanOut={(id,loc,scene)=>{doScanOut(id,loc,scene);setScanProp(null);}} onScanIn={(id)=>{doScanIn(id);setScanProp(null);}} onClose={()=>setScanProp(null)}/></Drawer>}
      {timeline&&<PropTimeline prop={timeline} locs={locs} onClose={()=>setTimeline(null)}/>}
      {addChar&&<AddCharDrawer onClose={()=>setAddChar(false)} onSave={saveChar}/>}
      {addLoc&&<LocDrawer onClose={()=>setAddLoc(false)} onSave={saveLoc}/>}
      {editLoc&&<LocDrawer loc={editLoc} onClose={()=>setEditLoc(null)} onSave={saveLoc} onDelete={id=>{delLoc(id);setEditLoc(null);}}/>}

      {/* NOTIFICATION TOAST */}
      {notifToast&&(
        <div style={{position:"fixed",top:70,left:"50%",transform:"translateX(-50%)",zIndex:998,maxWidth:340,width:"90%",background:T.white,border:`1.5px solid ${T.border}`,borderRadius:16,padding:"12px 14px",boxShadow:"0 8px 30px rgba(0,0,0,0.15)",display:"flex",gap:10,alignItems:"flex-start",animation:"slideDown 0.3s ease"}}>
          <style>{`@keyframes slideDown{from{opacity:0;transform:translateX(-50%) translateY(-10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
          <span style={{fontSize:22,flexShrink:0}}>{NOTIF_ICONS[notifToast.type]||"🔔"}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:F,fontSize:13,fontWeight:700,color:T.ink,marginBottom:2}}>{notifToast.title}</div>
            {notifToast.body&&<div style={{fontFamily:F,fontSize:11,color:T.body,lineHeight:1.4}}>{notifToast.body}</div>}
          </div>
          <button onClick={()=>setNotifToast(null)} style={{background:"none",border:"none",color:T.muted,fontSize:14,cursor:"pointer",flexShrink:0,padding:0}}>✕</button>
        </div>
      )}

      {/* NOTIFICATION TRAY */}
      {showNotifTray&&<NotificationTray user={user} locs={locs} onClose={()=>setShowNotifTray(false)}/>}

      {toast&&<Toast msg={toast.msg} color={toast.color} onDone={()=>setToast(null)}/>}

      {/* CREW PICKER — switch user without re-signing up */}
      {showCrewPicker&&(
        <div style={{position:"fixed",inset:0,zIndex:400,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.3)",backdropFilter:"blur(2px)"}} onClick={()=>setShowCrewPicker(false)}/>
          <div style={{position:"relative",background:T.white,borderRadius:"20px 20px 0 0",maxHeight:"70vh",display:"flex",flexDirection:"column",boxShadow:"0 -4px 40px rgba(0,0,0,0.14)"}}>
            <div style={{padding:"10px 0 0",display:"flex",justifyContent:"center",flexShrink:0}}>
              <div style={{width:36,height:4,background:T.border,borderRadius:2}}/>
            </div>
            <div style={{padding:"12px 20px 8px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
              <span style={{fontFamily:F,fontSize:16,fontWeight:700,color:T.ink}}>Who's using this device?</span>
              <button onClick={()=>setShowCrewPicker(false)} style={{background:T.bg,border:"none",borderRadius:"50%",width:28,height:28,cursor:"pointer",color:T.body}}>✕</button>
            </div>
            <div style={{overflowY:"auto",padding:"0 0 24px",flex:1}}>
              {crewLoading
                ? <div style={{textAlign:"center",padding:"30px 0",fontFamily:F,fontSize:13,color:T.muted}}>Loading crew...</div>
                : crewList.map((u,i)=>{
                    const unit=locs.find(l=>l.id===u.unit_id);
                    const isMe=user?.id===u.id;
                    return(
                      <button key={u.id} onClick={()=>handlePickCrew(u)}
                        style={{width:"100%",display:"flex",gap:12,alignItems:"center",background:isMe?T.bg:"transparent",border:"none",borderBottom:i<crewList.length-1?`1px solid ${T.border}`:"none",padding:"13px 20px",cursor:"pointer",textAlign:"left"}}
                        onMouseEnter={e=>e.currentTarget.style.background=T.bg}
                        onMouseLeave={e=>e.currentTarget.style.background=isMe?T.bg:"transparent"}>
                        <div style={{width:40,height:40,borderRadius:11,background:unit?.bg||T.bg,border:`1.5px solid ${unit?.bd||T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:F,fontSize:13,fontWeight:700,color:unit?.color||T.body,flexShrink:0}}>
                          {initials(`${u.first_name} ${u.surname}`)}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:2}}>
                            <span style={{fontFamily:F,fontSize:14,fontWeight:700,color:T.ink}}>{u.first_name} {u.surname}</span>
                            {isMe&&<span style={{fontFamily:F,fontSize:9,fontWeight:700,color:T.greenDk,background:T.greenBg,border:`1px solid ${T.greenBd}`,borderRadius:20,padding:"1px 6px"}}>YOU</span>}
                          </div>
                          <div style={{display:"flex",gap:6,alignItems:"center"}}>
                            <span style={{fontFamily:F,fontSize:11,color:T.muted}}>{u.title}</span>
                            {unit&&<span style={{fontFamily:F,fontSize:10,fontWeight:700,color:unit.color,background:unit.bg,border:`1px solid ${unit.bd}`,borderRadius:20,padding:"1px 7px"}}>{unit.name}</span>}
                          </div>
                        </div>
                        {isMe&&<span style={{fontFamily:F,fontSize:11,color:T.greenDk,fontWeight:600,flexShrink:0}}>Active</span>}
                      </button>
                    );
                  })
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
