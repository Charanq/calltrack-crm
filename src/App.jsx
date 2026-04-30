import { useState, useEffect, useRef } from "react";

const STATUS_COLORS_DARK = {
  New:    { bg: "#1a2a3a", text: "#7ec8f7", border: "#2a4a6a" },
  Warm:   { bg: "#2a2010", text: "#f7c875", border: "#5a4010" },
  Hot:    { bg: "#2a1510", text: "#f7875a", border: "#5a2510" },
  Booked: { bg: "#102a15", text: "#75c87a", border: "#105a20" },
  Dead:   { bg: "#1a1a1a", text: "#888",    border: "#333" },
};
const STATUS_COLORS_LIGHT = {
  New:    { bg: "#E6F1FB", text: "#0C447C", border: "#85B7EB" },
  Warm:   { bg: "#FAEEDA", text: "#633806", border: "#EF9F27" },
  Hot:    { bg: "#FAECE7", text: "#712B13", border: "#D85A30" },
  Booked: { bg: "#EAF3DE", text: "#27500A", border: "#639922" },
  Dead:   { bg: "#F1EFE8", text: "#444441", border: "#B4B2A9" },
};

const APP_PASSWORD = "charan123"; // 🔑 Change this to your own password

const PROJECT_OPTIONS = ["Godrej Eternal Palms", "Other Project"];

const SAMPLE_CLIENTS = [
  { id: 1, name: "Rahul Sharma", phone: "9876543210", project: "Godrej Eternal Palms", status: "Hot",
    followUpDate: new Date(Date.now() - 86400000).toISOString().slice(0,16),
    logs: [{ date: new Date(Date.now()-3*86400000).toISOString(), note: "Interested in 3BHK, budget 1.8Cr. Wife needs to visit site." }] },
  { id: 2, name: "Priya Mehta", phone: "9123456789", project: "Godrej Eternal Palms", status: "Warm",
    followUpDate: new Date(Date.now()+2*86400000).toISOString().slice(0,16),
    logs: [{ date: new Date(Date.now()-86400000).toISOString(), note: "Looking for 2BHK, prefers lower floor." }] },
  { id: 3, name: "Amit Joshi", phone: "9988776655", project: "Godrej Eternal Palms", status: "New",
    followUpDate: new Date(Date.now()+86400000).toISOString().slice(0,16), logs: [] },
];

function initClients() {
  try { const s = localStorage.getItem("crm_clients_v3"); return s ? JSON.parse(s) : SAMPLE_CLIENTS; } catch { return SAMPLE_CLIENTS; }
}
function saveClients(c) { try { localStorage.setItem("crm_clients_v3", JSON.stringify(c)); } catch {} }
function initDark() { try { return localStorage.getItem("crm_dark") !== "0"; } catch { return true; } }

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})+" "+d.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
}
function isOverdue(iso) { return iso && new Date(iso) < new Date(); }
function isToday(iso) { if (!iso) return false; return new Date(iso).toDateString()===new Date().toDateString(); }

export default function App() {
  const [clients, setClients] = useState(initClients);
  const [dark, setDark] = useState(initDark);
  const [view, setView] = useState("dashboard");
  const [selectedId, setSelectedId] = useState(null);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddLog, setShowAddLog] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [notifPerm, setNotifPerm] = useState(typeof Notification!=="undefined"?Notification.permission:"denied");
  const [form, setForm] = useState({name:"",phone:"",project:"Godrej Eternal Palms",status:"New",followUpDate:"",note:""});
  const [logForm, setLogForm] = useState({note:"",followUpDate:""});
  const [loggedIn, setLoggedIn] = useState(() => sessionStorage.getItem("crm_auth")==="1");
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);
  const reminderRef = useRef(null);

  function handleLogin() {
    if (pwInput === APP_PASSWORD) { sessionStorage.setItem("crm_auth","1"); setLoggedIn(true); setPwError(false); }
    else { setPwError(true); setPwInput(""); }
  }

  const SC = dark ? STATUS_COLORS_DARK : STATUS_COLORS_LIGHT;

  if (!loggedIn) return (
    <div style={{minHeight:"100vh",background:"#0f1117",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"}}>
      <div style={{background:"#1e2330",border:"0.5px solid #2a2f3d",borderRadius:16,padding:"32px 24px",width:"100%",maxWidth:340,textAlign:"center"}}>
        <div style={{fontSize:32,marginBottom:8}}>🏢</div>
        <div style={{fontWeight:600,fontSize:18,color:"#e8eaf0",marginBottom:4}}>CallTrack CRM</div>
        <div style={{fontSize:13,color:"#7a8099",marginBottom:24}}>Godrej Eternal Palms</div>
        <input
          type="password" placeholder="Enter password"
          value={pwInput} onChange={e=>{setPwInput(e.target.value);setPwError(false);}}
          onKeyDown={e=>e.key==="Enter"&&handleLogin()}
          style={{width:"100%",boxSizing:"border-box",background:"#181c24",color:"#e8eaf0",border:`1px solid ${pwError?"#f76a6a":"#2a2f3d"}`,borderRadius:8,padding:"10px 12px",fontSize:15,marginBottom:8,fontFamily:"inherit",textAlign:"center",letterSpacing:2}}
          autoFocus
        />
        {pwError&&<div style={{fontSize:12,color:"#f76a6a",marginBottom:8}}>Incorrect password. Try again.</div>}
        <button onClick={handleLogin} style={{width:"100%",background:"#4f8ef7",color:"#fff",border:"none",borderRadius:8,padding:"10px",fontSize:14,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>
          Login
        </button>
      </div>
    </div>
  );

  useEffect(() => { saveClients(clients); }, [clients]);
  useEffect(() => { try { localStorage.setItem("crm_dark", dark?"1":"0"); } catch {} }, [dark]);

  useEffect(() => {
    if (reminderRef.current) clearInterval(reminderRef.current);
    reminderRef.current = setInterval(() => {
      clients.forEach(c => {
        if (!c.followUpDate) return;
        const diff = new Date(c.followUpDate) - new Date();
        if (diff > 0 && diff < 60000 && notifPerm === "granted")
          new Notification("CallTrack CRM", { body: `Follow up with ${c.name} now!` });
      });
    }, 30000);
    return () => clearInterval(reminderRef.current);
  }, [clients, notifPerm]);

  function requestNotif() {
    if (typeof Notification !== "undefined") Notification.requestPermission().then(p => setNotifPerm(p));
  }

  const T = dark ? {
    bg:"#0f1117",surface:"#181c24",card:"#1e2330",border:"#2a2f3d",
    text:"#e8eaf0",muted:"#7a8099",accent:"#4f8ef7",accentBg:"#1a2240",
    danger:"#f76a6a",dangerBg:"#2a1515",warn:"#f7c75a",warnBg:"#2a2010",
    btnBg:"#252a38",btnBorder:"#3a3f50",input:"#181c24",wa:"#25d366",waBg:"#0d2320"
  } : {
    bg:"#f5f6fa",surface:"#ffffff",card:"#ffffff",border:"#e0e3eb",
    text:"#1a1d2e",muted:"#6b7280",accent:"#185FA5",accentBg:"#E6F1FB",
    danger:"#A32D2D",dangerBg:"#FCEBEB",warn:"#854F0B",warnBg:"#FAEEDA",
    btnBg:"#f0f2f8",btnBorder:"#d0d4e0",input:"#ffffff",wa:"#128c7e",waBg:"#e7f7f4"
  };

  const styles = {
    wrap: { background:T.bg, minHeight:"100vh", padding:"0 0 3rem", color:T.text, fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
    card: { background:T.card, border:`0.5px solid ${T.border}`, borderRadius:12, padding:"12px 14px", marginBottom:10, cursor:"pointer" },
    input: { width:"100%", boxSizing:"border-box", marginBottom:8, background:T.input, color:T.text, border:`0.5px solid ${T.border}`, borderRadius:8, padding:"8px 10px", fontSize:14, fontFamily:"inherit" },
    btn: { background:T.btnBg, color:T.text, border:`0.5px solid ${T.btnBorder}`, borderRadius:8, padding:"8px 14px", cursor:"pointer", fontSize:13, fontWeight:500, fontFamily:"inherit" },
    btnPrimary: { background:T.accent, color:"#fff", border:"none", borderRadius:8, padding:"8px 14px", cursor:"pointer", fontSize:13, fontWeight:500, fontFamily:"inherit" },
    label: { fontSize:12, color:T.muted, marginBottom:4, display:"block" },
    section: { fontWeight:500, fontSize:14, marginBottom:8, color:T.text },
  };

  function Avatar({ name }) {
    const initials = name.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();
    return <div style={{width:38,height:38,borderRadius:"50%",background:T.accentBg,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:500,fontSize:13,color:T.accent,flexShrink:0}}>{initials}</div>;
  }

  function StatusBadge({ status }) {
    const c = SC[status]||SC.New;
    return <span style={{background:c.bg,color:c.text,border:`0.5px solid ${c.border}`,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:500}}>{status}</span>;
  }

  function FollowUpBadge({ iso }) {
    if (!iso) return null;
    if (isOverdue(iso)&&!isToday(iso)) return <span style={{background:T.dangerBg,color:T.danger,border:`0.5px solid ${T.danger}`,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:500}}>Overdue</span>;
    if (isToday(iso)) return <span style={{background:T.warnBg,color:T.warn,border:`0.5px solid ${T.warn}`,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:500}}>Today</span>;
    return null;
  }

  function WaButton({ phone, name }) {
    const clean = phone.replace(/\D/g,"");
    const num = clean.startsWith("91") ? clean : "91"+clean;
    const msg = encodeURIComponent(`Hi ${name}, this is Charan from Godrej Properties. Following up regarding Godrej Eternal Palms. When would be a good time to connect?`);
    return (
      <a href={`https://wa.me/${num}?text=${msg}`} target="_blank" rel="noopener noreferrer"
        style={{display:"flex",alignItems:"center",gap:6,background:T.waBg,color:T.wa,border:`0.5px solid ${T.wa}`,borderRadius:8,padding:"7px 12px",fontSize:13,fontWeight:500,textDecoration:"none",flexShrink:0}}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill={T.wa}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        WhatsApp
      </a>
    );
  }

  function addClient() {
    if (!form.name||!form.phone) return;
    const newClient = { id:Date.now(), ...form, logs:form.note?[{date:new Date().toISOString(),note:form.note}]:[] };
    setClients([newClient,...clients]);
    setForm({name:"",phone:"",project:"Godrej Eternal Palms",status:"New",followUpDate:"",note:""});
    setShowAddClient(false);
  }

  function addLog() {
    if (!logForm.note) return;
    setClients(clients.map(c=>c.id===selectedId?{...c,followUpDate:logForm.followUpDate||c.followUpDate,logs:[{date:new Date().toISOString(),note:logForm.note},...c.logs]}:c));
    setLogForm({note:"",followUpDate:""}); setShowAddLog(false);
  }

  function deleteClient(id) { setClients(clients.filter(c=>c.id!==id)); setView("clients"); setSelectedId(null); }

  const todayFU = clients.filter(c=>isToday(c.followUpDate));
  const overdueFU = clients.filter(c=>isOverdue(c.followUpDate)&&!isToday(c.followUpDate));
  const selectedClient = clients.find(c=>c.id===selectedId);
  const filteredClients = clients.filter(c=>
    (c.name.toLowerCase().includes(search.toLowerCase())||c.phone.includes(search)) &&
    (filterStatus==="All"||c.status===filterStatus)
  );
  const statusCounts = Object.keys(STATUS_COLORS_DARK).reduce((a,s)=>{a[s]=clients.filter(c=>c.status===s).length;return a},{});

  function Nav() {
    return (
      <div style={{display:"flex",borderBottom:`0.5px solid ${T.border}`,marginBottom:16}}>
        {[{id:"dashboard",label:"Dashboard"},{id:"clients",label:"Clients"},{id:"reminders",label:"Reminders"}].map(t=>(
          <button key={t.id} onClick={()=>setView(t.id)} style={{flex:1,padding:"10px 0",fontSize:13,fontWeight:view===t.id?500:400,background:"transparent",border:"none",borderBottom:view===t.id?`2px solid ${T.accent}`:"2px solid transparent",color:view===t.id?T.accent:T.muted,cursor:"pointer",fontFamily:"inherit"}}>{t.label}</button>
        ))}
      </div>
    );
  }

  // CLIENT DETAIL
  if (view==="client_detail"&&selectedClient) return (
    <div style={styles.wrap}>
      <div style={{padding:"14px 14px 0"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <button onClick={()=>setView("clients")} style={{...styles.btn,padding:"6px 10px"}}>← Back</button>
          <Avatar name={selectedClient.name}/>
          <div style={{flex:1}}><div style={{fontWeight:500,fontSize:15}}>{selectedClient.name}</div><div style={{fontSize:12,color:T.muted}}>{selectedClient.phone}</div></div>
          <StatusBadge status={selectedClient.status}/>
        </div>

        <div style={{...styles.card,cursor:"default",marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
            <div>
              <div style={styles.label}>Project</div>
              <div style={{fontSize:14,marginBottom:8}}>{selectedClient.project}</div>
              <div style={styles.label}>Next follow-up</div>
              <div style={{fontSize:14,display:"flex",alignItems:"center",gap:8}}>
                {selectedClient.followUpDate?formatDate(selectedClient.followUpDate):"Not set"}
                <FollowUpBadge iso={selectedClient.followUpDate}/>
              </div>
            </div>
            <WaButton phone={selectedClient.phone} name={selectedClient.name}/>
          </div>
        </div>

        <div style={{display:"flex",gap:8,marginBottom:12}}>
          <button onClick={()=>setShowAddLog(true)} style={{...styles.btnPrimary,flex:1}}>+ Log Call</button>
          <button onClick={()=>deleteClient(selectedClient.id)} style={{background:T.dangerBg,color:T.danger,border:`0.5px solid ${T.danger}`,borderRadius:8,padding:"8px 14px",cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>Delete</button>
        </div>

        {showAddLog&&(
          <div style={{...styles.card,cursor:"default",border:`1px solid ${T.accent}`,marginBottom:12}}>
            <div style={{fontWeight:500,fontSize:14,marginBottom:10}}>Log this call</div>
            <textarea placeholder="What did the client say? Objections, interests, budget…" rows={4} value={logForm.note} onChange={e=>setLogForm({...logForm,note:e.target.value})} style={{...styles.input,resize:"vertical"}}/>
            <label style={styles.label}>Next follow-up date & time</label>
            <input type="datetime-local" value={logForm.followUpDate} onChange={e=>setLogForm({...logForm,followUpDate:e.target.value})} style={styles.input}/>
            <div style={{display:"flex",gap:8}}>
              <button onClick={addLog} style={{...styles.btnPrimary,flex:1}}>Save Log</button>
              <button onClick={()=>setShowAddLog(false)} style={{...styles.btn,flex:1}}>Cancel</button>
            </div>
          </div>
        )}

        <div style={styles.section}>Call History</div>
        {selectedClient.logs.length===0&&<div style={{fontSize:13,color:T.muted,padding:"8px 0"}}>No calls logged yet. Tap "+ Log Call" after your next call.</div>}
        {selectedClient.logs.map((log,i)=>(
          <div key={i} style={{...styles.card,cursor:"default"}}>
            <div style={{fontSize:11,color:T.muted,marginBottom:6}}>{formatDate(log.date)}</div>
            <div style={{fontSize:13,lineHeight:1.6}}>{log.note}</div>
          </div>
        ))}
      </div>
    </div>
  );

  // MAIN VIEWS
  return (
    <div style={styles.wrap}>
      <div style={{padding:"14px 14px 0"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <div>
            <div style={{fontWeight:600,fontSize:17}}>CallTrack CRM</div>
            <div style={{fontSize:12,color:T.muted}}>Godrej Eternal Palms</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button onClick={()=>setDark(!dark)} style={{...styles.btn,padding:"6px 10px",fontSize:16}}>{dark?"☀️":"🌙"}</button>
            <button onClick={()=>{sessionStorage.removeItem("crm_auth");setLoggedIn(false);}} style={{...styles.btn,padding:"6px 10px",fontSize:12,color:"#f76a6a"}}>Logout</button>
            <button onClick={()=>{setShowAddClient(true);setView("clients");}} style={styles.btnPrimary}>+ Add</button>
          </div>
        </div>

        <Nav/>

        {/* DASHBOARD */}
        {view==="dashboard"&&<>
          {notifPerm!=="granted"&&(
            <div style={{background:T.warnBg,border:`0.5px solid ${T.warn}`,borderRadius:8,padding:"10px 12px",marginBottom:12,fontSize:13,color:T.warn,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span>Enable follow-up reminders</span>
              <button onClick={requestNotif} style={{...styles.btn,fontSize:12,padding:"4px 10px"}}>Enable</button>
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10,marginBottom:14}}>
            {[{label:"Total clients",value:clients.length},{label:"Today's calls",value:todayFU.length},{label:"Overdue",value:overdueFU.length},{label:"Hot leads",value:statusCounts.Hot}].map(m=>(
              <div key={m.label} style={{background:T.surface,borderRadius:8,padding:"12px 14px",border:`0.5px solid ${T.border}`}}>
                <div style={{fontSize:12,color:T.muted,marginBottom:4}}>{m.label}</div>
                <div style={{fontSize:24,fontWeight:600,color:T.text}}>{m.value}</div>
              </div>
            ))}
          </div>

          <div style={styles.section}>Pipeline</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
            {Object.keys(SC).map(s=><div key={s} style={{background:SC[s].bg,border:`0.5px solid ${SC[s].border}`,borderRadius:8,padding:"6px 12px",fontSize:12,color:SC[s].text}}>{s}: <strong>{statusCounts[s]}</strong></div>)}
          </div>

          {overdueFU.length>0&&<>
            <div style={{...styles.section,color:T.danger}}>⚠️ Overdue callbacks</div>
            {overdueFU.map(c=>(
              <div key={c.id} style={{...styles.card,borderColor:T.danger}} onClick={()=>{setSelectedId(c.id);setView("client_detail");}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <Avatar name={c.name}/><div style={{flex:1}}><div style={{fontWeight:500,fontSize:14}}>{c.name}</div><div style={{fontSize:12,color:T.muted}}>{c.phone}</div></div>
                  <FollowUpBadge iso={c.followUpDate}/>
                </div>
              </div>
            ))}
          </>}

          {todayFU.length>0&&<>
            <div style={{...styles.section,marginTop:8}}>📅 Today's follow-ups</div>
            {todayFU.map(c=>(
              <div key={c.id} style={{...styles.card,borderColor:T.warn}} onClick={()=>{setSelectedId(c.id);setView("client_detail");}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <Avatar name={c.name}/><div style={{flex:1}}><div style={{fontWeight:500,fontSize:14}}>{c.name}</div><div style={{fontSize:12,color:T.muted}}>{formatDate(c.followUpDate)}</div></div>
                  <StatusBadge status={c.status}/>
                </div>
              </div>
            ))}
          </>}

          {overdueFU.length===0&&todayFU.length===0&&(
            <div style={{textAlign:"center",padding:"32px 0",color:T.muted,fontSize:14}}>✅ All caught up! No overdue or today's callbacks.</div>
          )}
        </>}

        {/* CLIENTS */}
        {view==="clients"&&<>
          {showAddClient&&(
            <div style={{...styles.card,cursor:"default",border:`1px solid ${T.accent}`,marginBottom:14}}>
              <div style={{fontWeight:500,fontSize:14,marginBottom:10}}>New Client</div>
              <input placeholder="Full name *" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={styles.input}/>
              <input placeholder="Phone number *" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} style={styles.input}/>
              <select value={form.project} onChange={e=>setForm({...form,project:e.target.value})} style={styles.input}>{PROJECT_OPTIONS.map(p=><option key={p}>{p}</option>)}</select>
              <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} style={styles.input}>{Object.keys(SC).map(s=><option key={s}>{s}</option>)}</select>
              <label style={styles.label}>Follow-up date & time</label>
              <input type="datetime-local" value={form.followUpDate} onChange={e=>setForm({...form,followUpDate:e.target.value})} style={styles.input}/>
              <label style={styles.label}>Initial remarks / call notes</label>
              <textarea placeholder="What did the client say? Budget, requirements, objections…" rows={3} value={form.note} onChange={e=>setForm({...form,note:e.target.value})} style={{...styles.input,resize:"vertical"}}/>
              <div style={{display:"flex",gap:8}}>
                <button onClick={addClient} style={{...styles.btnPrimary,flex:1}}>Save Client</button>
                <button onClick={()=>setShowAddClient(false)} style={{...styles.btn,flex:1}}>Cancel</button>
              </div>
            </div>
          )}

          <input placeholder="🔍 Search by name or number…" value={search} onChange={e=>setSearch(e.target.value)} style={{...styles.input,marginBottom:8}}/>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
            {["All",...Object.keys(SC)].map(s=>(
              <button key={s} onClick={()=>setFilterStatus(s)} style={{padding:"4px 10px",fontSize:12,borderRadius:6,background:filterStatus===s?T.accentBg:T.surface,color:filterStatus===s?T.accent:T.muted,border:`0.5px solid ${T.border}`,cursor:"pointer",fontFamily:"inherit"}}>{s}</button>
            ))}
          </div>

          {filteredClients.length===0&&<div style={{fontSize:13,color:T.muted,padding:"16px 0"}}>No clients found.</div>}
          {filteredClients.map(c=>(
            <div key={c.id} style={styles.card} onClick={()=>{setSelectedId(c.id);setView("client_detail");}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <Avatar name={c.name}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:500,fontSize:14}}>{c.name}</div>
                  <div style={{fontSize:12,color:T.muted}}>{c.phone} · {c.project}</div>
                  <div style={{fontSize:12,color:T.muted,marginTop:2}}>{c.followUpDate?"📅 "+formatDate(c.followUpDate):"No follow-up set"}</div>
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                  <StatusBadge status={c.status}/>
                  <FollowUpBadge iso={c.followUpDate}/>
                </div>
              </div>
            </div>
          ))}
        </>}

        {/* REMINDERS */}
        {view==="reminders"&&<>
          {notifPerm!=="granted"&&(
            <div style={{...styles.card,cursor:"default",background:T.warnBg,borderColor:T.warn,marginBottom:14}}>
              <div style={{fontWeight:500,fontSize:14,color:T.warn,marginBottom:6}}>🔔 Browser notifications off</div>
              <div style={{fontSize:13,color:T.muted,marginBottom:10}}>Enable to get pop-up alerts exactly when follow-up time arrives.</div>
              <button onClick={requestNotif} style={styles.btnPrimary}>Enable Notifications</button>
            </div>
          )}

          <div style={{...styles.section,color:T.danger}}>⚠️ Overdue ({overdueFU.length})</div>
          {overdueFU.length===0&&<div style={{fontSize:13,color:T.muted,marginBottom:14}}>None overdue. Great job!</div>}
          {overdueFU.map(c=>(
            <div key={c.id} style={{...styles.card,borderColor:T.danger}} onClick={()=>{setSelectedId(c.id);setView("client_detail");}}>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <Avatar name={c.name}/>
                <div style={{flex:1}}><div style={{fontWeight:500,fontSize:14}}>{c.name}</div><div style={{fontSize:12,color:T.muted}}>Due: {formatDate(c.followUpDate)}</div></div>
                <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end"}}><StatusBadge status={c.status}/><WaButton phone={c.phone} name={c.name}/></div>
              </div>
            </div>
          ))}

          <div style={{...styles.section,marginTop:4}}>📅 Today ({todayFU.length})</div>
          {todayFU.length===0&&<div style={{fontSize:13,color:T.muted,marginBottom:14}}>Nothing scheduled today.</div>}
          {todayFU.map(c=>(
            <div key={c.id} style={{...styles.card,borderColor:T.warn}} onClick={()=>{setSelectedId(c.id);setView("client_detail");}}>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <Avatar name={c.name}/>
                <div style={{flex:1}}><div style={{fontWeight:500,fontSize:14}}>{c.name}</div><div style={{fontSize:12,color:T.muted}}>{formatDate(c.followUpDate)}</div></div>
                <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end"}}><StatusBadge status={c.status}/><WaButton phone={c.phone} name={c.name}/></div>
              </div>
            </div>
          ))}

          <div style={{...styles.section,marginTop:4}}>🗓️ Upcoming</div>
          {clients.filter(c=>c.followUpDate&&new Date(c.followUpDate)>new Date()&&!isToday(c.followUpDate))
            .sort((a,b)=>new Date(a.followUpDate)-new Date(b.followUpDate))
            .map(c=>(
              <div key={c.id} style={styles.card} onClick={()=>{setSelectedId(c.id);setView("client_detail");}}>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <Avatar name={c.name}/>
                  <div style={{flex:1}}><div style={{fontWeight:500,fontSize:14}}>{c.name}</div><div style={{fontSize:12,color:T.muted}}>{formatDate(c.followUpDate)}</div></div>
                  <StatusBadge status={c.status}/>
                </div>
              </div>
          ))}
        </>}
      </div>
    </div>
  );
}
