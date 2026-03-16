import{useState,useMemo,useRef,useEffect}from"react";

// ── CONSTANTS ──────────────────────────────────────────────────
const C={
bg:"#0a0f1e",card:"#0f172a",border:"#1e293b",
green:"#6ee7b7",red:"#fb7185",amber:"#fbbf24",purple:"#a78bfa",cyan:"#06b6d4",
t1:"#f1f5f9",t2:"#94a3b8",t3:"#64748b",t4:"#475569",t5:"#334155",
inc:"rgba(110,231,183,.08)",exp:"rgba(251,113,133,.08)",
incDk:"#0d2420",expDk:"#1f0d12",
};
const F={mono:"‘JetBrains Mono’,monospace",sans:"‘DM Sans’,sans-serif"};
const s=(extra={})=>({...extra});

const INCOME_CATS=["Salary","Freelance","Rental Income","Investment Returns","Benefits","Other Income"];
const EXPENSE_CATS=["Mortgage/Rent","Utilities","Food","Transport","Insurance","Rates","Subscriptions","Health","Entertainment","Clothing","House Maintenance","Savings Goal","Investments","Other"];
const SAVINGS_CATS=new Set(["Savings Goal","Investments"]);
const CAT_COLORS={"Mortgage/Rent":"#fb7185","Utilities":"#fbbf24","Food":"#6ee7b7","Transport":"#67e8f9","Insurance":"#a78bfa","Rates":"#f472b6","Subscriptions":"#818cf8","Health":"#34d399","Entertainment":"#e879f9","Clothing":"#38bdf8","House Maintenance":"#fb923c","Savings Goal":"#4ade80","Investments":"#06b6d4","Other":"#94a3b8","Salary":"#6ee7b7","Freelance":"#67e8f9","Rental Income":"#a78bfa","Investment Returns":"#06b6d4","Benefits":"#fbbf24","Other Income":"#f472b6"};
const PERIODS=[{key:"weekly",label:"Weekly",days:7},{key:"fortnightly",label:"Fortnightly",days:14},{key:"monthly",label:"Monthly",days:30.44},{key:"yearly",label:"Yearly",days:365}];
const RECUR_OPT=["One-off","Weekly","Fortnightly","Monthly","Yearly","Variable"];
const DAYS_SHORT=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MON_SHORT=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const RECURDAYS={Weekly:7,Fortnightly:14,Monthly:30.44,Yearly:365};
const PWORD={weekly:"week",fortnightly:"fortnight",monthly:"month",yearly:"year"};

// ── HELPERS ────────────────────────────────────────────────────
const today=new Date();
const fmt=n=>`$${Math.abs(n).toLocaleString("en-NZ",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fmtS=n=>`$${Math.abs(n).toLocaleString("en-NZ",{minimumFractionDigits:0,maximumFractionDigits:0})}`;
const pad=n=>String(n).padStart(2,"0");
const dateKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const todayStr=dateKey(today);
const parseDt=s=>{const[y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d);};

function varActual(e,mk){
if(!e.actuals||!e.actuals.length)return e.amount;
const f=e.actuals.find(a=>a.date===mk);
return f!=null?f.amount:e.amount;
}
function varRecent(e){
if(!e.actuals||!e.actuals.length)return e.amount;
return[...e.actuals].sort((a,b)=>b.date.localeCompare(a.date))[0].amount;
}
const periodAmt=(e,pDays)=>{
if(e.recur==="One-off")return e.amount;
if(e.recur==="Variable")return varRecent(e)*(pDays/30.44);
return e.amount*(pDays/(RECURDAYS[e.recur]||30.44));
};
function occursOn(e,date){
const start=parseDt(e.startDate);start.setHours(0,0,0,0);
const d=new Date(date);d.setHours(0,0,0,0);
if(d<start)return false;
if(e.recur==="One-off")return dateKey(d)===e.startDate;
const diff=Math.round((d-start)/86400000);
if(e.recur==="Weekly")return diff%7===0;
if(e.recur==="Fortnightly")return diff%14===0;
if(e.recur==="Monthly"||e.recur==="Variable")return d.getDate()===start.getDate();
if(e.recur==="Yearly")return d.getDate()===start.getDate()&&d.getMonth()===start.getMonth();
return false;
}
function datesInRange(from,to){
const out=[],cur=new Date(from);cur.setHours(0,0,0,0);
const end=new Date(to);end.setHours(0,0,0,0);
while(cur<=end){out.push(new Date(cur));cur.setDate(cur.getDate()+1);}
return out;
}
function dailyTotal(entries,date,type){
return entries.filter(e=>e.type===type&&occursOn(e,date)).reduce((s,e)=>{
if(e.recur==="Variable"){const mk=`${date.getFullYear()}-${pad(date.getMonth()+1)}`;return s+varActual(e,mk);}
return s+e.amount;
},0);
}

function buildSchedule(principal,annualRate,termYears,startDateStr,rateChanges,lumpSums){
if(!principal||!annualRate||!termYears)return[];
const rateAt=mi=>{let r=annualRate;rateChanges.slice().sort((a,b)=>a.month-b.month).forEach(rc=>{if(mi>=rc.month)r=rc.rate;});return r;};
let bal=principal;const schedule=[];const start=parseDt(startDateStr);
for(let mi=0;mi<termYears*12&&bal>0;mi++){
const ar=rateAt(mi),mo=ar/100/12,n=termYears*12-mi;
const payment=bal*mo*Math.pow(1+mo,n)/(Math.pow(1+mo,n)-1);
const lump=(lumpSums.find(l=>l.month===mi)||{amount:0}).amount;
const interest=bal*mo,principalPart=Math.min(payment-interest,bal);
bal=Math.max(0,bal-principalPart-lump);
const date=new Date(start);date.setMonth(date.getMonth()+mi);
schedule.push({mi,date,label:`${MON_SHORT[date.getMonth()]} ${date.getFullYear()}`,payment:payment+lump,interest,principal:principalPart+lump,lump,balance:bal,rate:ar});
}
return schedule;
}

// ── CSS ────────────────────────────────────────────────────────
const CSS=`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&family=JetBrains+Mono:wght@400;600;700&display=swap'); *{box-sizing:border-box;margin:0;padding:0;} input,select,textarea{outline:none;} .fi,.fi-16{font-size:16px;} input[type="date"]{-webkit-appearance:none;appearance:none;max-width:100%;min-width:0;} input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(.5);} input[type="range"]{accent-color:#6ee7b7;} .hscroll{display:flex;overflow-x:auto;-webkit-overflow-scrolling:touch;gap:12px;padding-bottom:8px;scrollbar-width:none;} .hscroll::-webkit-scrollbar{display:none;} .hscroll>*{flex-shrink:0;} .card{background:#0f172a;border:1px solid #1e293b;border-radius:16px;padding:20px;margin-bottom:20px;} .fi{background:#1e293b;border:1px solid #334155;border-radius:10px;padding:11px 14px;color:#f1f5f9;font-family:'DM Sans',sans-serif;font-size:16px;width:100%;box-sizing:border-box;} .fi:focus{border-color:#6ee7b7;} .tab-btn{background:none;border:none;cursor:pointer;padding:8px 14px;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;transition:all .2s;white-space:nowrap;color:#64748b;} .tab-btn.active{background:#1e293b;color:#f1f5f9;} .period-btn{border:1px solid #1e293b;cursor:pointer;padding:8px 14px;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;color:#64748b;background:none;white-space:nowrap;} .period-btn.active{background:rgba(110,231,183,.1);border-color:#6ee7b7;color:#6ee7b7;} .add-btn{background:linear-gradient(135deg,#6ee7b7,#3b82f6);border:none;border-radius:10px;padding:13px 28px;color:#0a0f1e;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:700;cursor:pointer;} .tt{display:flex;background:#1e293b;border-radius:10px;padding:4px;gap:4px;} .tb{flex:1;border:none;border-radius:7px;padding:9px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;} .tb.inc{background:rgba(110,231,183,.2);color:#6ee7b7;} .tb.exp{background:rgba(251,113,133,.2);color:#fb7185;} .tb.off{background:transparent;color:#475569;} .rb{border:1px solid #1e293b;cursor:pointer;padding:7px 10px;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:600;color:#64748b;background:none;white-space:nowrap;} .rb.on{background:rgba(110,231,183,.1);border-color:#6ee7b7;color:#6ee7b7;} .rb.oo{background:rgba(251,191,36,.1);border-color:#fbbf24;color:#fbbf24;} .cc{background:#0a0f1e;border:1px solid #1e293b;border-radius:12px;padding:14px 12px;cursor:pointer;text-align:center;} .cc.active{background:rgba(110,231,183,.07);border-color:#6ee7b7;}`;

// ── SMALL HELPERS ──────────────────────────────────────────────
const Mono=({children,color,size=14})=><span style={{fontFamily:F.mono,fontSize:size,fontWeight:700,color}}>{children}</span>;
const Label=({children,color=C.t3,size=11,mb=4})=><div style={{fontSize:size,color,marginBottom:mb,textTransform:"uppercase",letterSpacing:".07em",fontWeight:700}}>{children}</div>;
const Row=({children,mb=0})=><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:mb}}>{children}</div>;
const Btn=({children,onClick,bg="#1e293b",border="#334155",color=C.t2,style={}})=>(
<button onClick={onClick} style={{background:bg,border:`1px solid ${border}`,borderRadius:8,padding:"6px 12px",color,fontSize:11,fontWeight:600,cursor:"pointer",...style}}>{children}</button>
);
const GradBtn=({children,onClick,style={}})=>(
<button onClick={onClick} style={{background:"linear-gradient(135deg,#6ee7b7,#3b82f6)",border:"none",borderRadius:8,padding:"9px 20px",color:C.bg,fontWeight:700,fontSize:13,cursor:"pointer",width:"100%",...style}}>{children}</button>
);
const StatCard=({label,value,color,sub,bg=C.card,border=C.border,labelColor=C.t3})=>(

  <div style={{background:bg,border:`1px solid ${border}`,borderRadius:16,padding:"18px 16px",minWidth:160,width:"calc(50% - 6px)"}}>
    <div style={{fontSize:10,color:labelColor,marginBottom:8,textTransform:"uppercase",letterSpacing:".05em",lineHeight:1.4,whiteSpace:"nowrap"}}>{label}</div>
    <Mono color={color} size={14}>{value}</Mono>
    {sub&&<div style={{fontSize:10,color:C.t4,marginTop:4}}>{sub}</div>}
  </div>
);

// ── HISTOGRAM ─────────────────────────────────────────────────
function Histogram({entries,displayPeriod}){
const isYearly=displayPeriod==="yearly";
const[catFilter,setCatFilter]=useState("All Expenses");
const[showStacked,setShowStacked]=useState(false);
const[showAvg,setShowAvg]=useState(true);
const[showCumul,setShowCumul]=useState(false);
const[showProj,setShowProj]=useState(false);
const[openCat,setOpenCat]=useState(false);
const expCats=Object.keys(CAT_COLORS).filter(c=>EXPENSE_CATS.includes(c));
const allExpEntries=useMemo(()=>entries.filter(e=>e.type==="expense"),[entries]);
const filteredEntries=useMemo(()=>catFilter==="All Expenses"?allExpEntries:allExpEntries.filter(e=>e.category===catFilter),[allExpEntries,catFilter]);
const stackCats=useMemo(()=>[...new Set(allExpEntries.map(e=>e.category))],[allExpEntries]);
const bars=useMemo(()=>{
const now=new Date();
if(isYearly){
return Array.from({length:12},(_,m)=>{
const from=new Date(now.getFullYear(),m,1),to=new Date(now.getFullYear(),m+1,0);
const bycat={};stackCats.forEach(c=>{bycat[c]=0;});
datesInRange(from,to).forEach(d=>{allExpEntries.filter(e=>occursOn(e,d)).forEach(e=>{bycat[e.category]=(bycat[e.category]||0)+e.amount;});});
const val=Object.values(bycat).reduce((s,v)=>s+v,0);
return{label:MON_SHORT[m],val,bycat,isFuture:m>now.getMonth()};
});
}else{
const days=PERIODS.find(p=>p.key===displayPeriod).days;
return Array.from({length:Math.round(days)},(_,di)=>{
const d=new Date(now);d.setDate(d.getDate()-Math.round(days)+di+1);
const bycat={};stackCats.forEach(c=>{bycat[c]=0;});
allExpEntries.filter(e=>occursOn(e,d)).forEach(e=>{bycat[e.category]=(bycat[e.category]||0)+e.amount;});
const val=Object.values(bycat).reduce((s,v)=>s+v,0);
return{label:pad(d.getDate()),val,bycat,isFuture:false,date:d};
});
}
},[filteredEntries,allExpEntries,displayPeriod,isYearly,stackCats]);

const rollingAvg=useMemo(()=>{
const pDays=PERIODS.find(p=>p.key===displayPeriod).days;
const from=new Date();from.setFullYear(from.getFullYear()-1);
const to=new Date();
let total=0;
datesInRange(from,to).forEach(d=>{
filteredEntries.filter(e=>occursOn(e,d)).forEach(e=>{total+=e.amount;});
});
return total*(pDays/365);
},[filteredEntries,displayPeriod]);

const cumulativeData=useMemo(()=>{let sum=0;return bars.map(b=>{sum+=b.val;return sum;});},[bars]);
const projection=useMemo(()=>{
if(!showProj||isYearly)return null;
const pDays=PERIODS.find(p=>p.key===displayPeriod).days;
const relevantEntries=entries.filter(e=>e.type==="expense");
let val=0;
const periodStart=new Date();periodStart.setDate(periodStart.getDate()-Math.round(pDays)+1);
const periodEnd=new Date(periodStart);periodEnd.setDate(periodEnd.getDate()+Math.round(pDays)-1);
datesInRange(periodStart,periodEnd).forEach(d=>{
if(catFilter==="All Expenses")relevantEntries.filter(e=>occursOn(e,d)).forEach(e=>{val+=e.amount;});
else relevantEntries.filter(e=>e.category===catFilter&&occursOn(e,d)).forEach(e=>{val+=e.amount;});
});
return val;
},[showProj,entries,displayPeriod,catFilter,isYearly]);

const maxVal=Math.max(...bars.map(b=>b.val),rollingAvg,projection||0,1);
const mostVal=Math.max(...bars.map(b=>b.val));
const mostBar=bars.find(b=>b.val===mostVal&&b.val>0);
const leastBar=bars.filter(b=>b.val>0).sort((a,b)=>a.val-b.val)[0];
const W=320,H=120,PAD=20,barW=Math.max(1,(W-PAD*2)/bars.length-1);
const xOf=i=>PAD+i*(W-PAD*2)/bars.length;
const yOf=v=>H-PAD-(v/maxVal)*(H-PAD*2);
const avgY=yOf(rollingAvg);
const cumulativePts=useMemo(()=>bars.map((b,i)=>({x:xOf(i)+barW/2,y:yOf(cumulativeData[i])})),[bars,cumulativeData]);

const toggles=[
{label:"Stack",active:showStacked,set:setShowStacked},
{label:"Avg",active:showAvg,set:setShowAvg},
{label:"Cumul.",active:showCumul,set:setShowCumul},
{label:"Proj.",active:showProj,set:setShowProj},
];

return(
<div className="card">
<Row mb={12}>
<div style={{fontSize:12,fontWeight:700,color:C.t2}}>{isYearly?"Monthly":"Daily"} Expenses</div>
<div style={{fontFamily:F.mono,fontSize:18,fontWeight:700,color:C.red}}>{fmt(bars.reduce((s,b)=>s+b.val,0))}</div>
</Row>
<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10,alignItems:"center"}}>
{toggles.map(t=><button key={t.label} onClick={()=>t.set(v=>!v)} className={`rb ${t.active?"on":""}`}>{t.label}</button>)}
<div style={{position:"relative",marginLeft:"auto"}}>
<button onClick={e=>{e.stopPropagation();setOpenCat(o=>!o);}} className={`rb ${catFilter!=="All Expenses"?"on":""}`} style={{color:catFilter!=="All Expenses"?CAT_COLORS[catFilter]:undefined}}>
{catFilter==="All Expenses"?"All":catFilter} <span style={{fontSize:9}}>{openCat?"▲":"▼"}</span>
</button>
{openCat&&(
<div onClick={e=>e.stopPropagation()} style={{position:"absolute",right:0,top:"110%",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:6,zIndex:50,minWidth:160,maxHeight:220,overflowY:"auto"}}>
{["All Expenses",...expCats].map(c=>(
<button key={c} onClick={()=>{setCatFilter(c);setOpenCat(false);}} style={{display:"block",width:"100%",background:catFilter===c?`${CAT_COLORS[c]||C.green}18`:C.bg,border:"none",borderRadius:6,padding:"6px 10px",fontSize:12,cursor:"pointer",color:catFilter===c?CAT_COLORS[c]||C.green:C.t2,fontWeight:catFilter===c?700:400,textAlign:"left",marginBottom:2,whiteSpace:"nowrap"}}>
{c}
</button>
))}
</div>
)}
</div>
</div>
{openCat&&<div style={{position:"fixed",inset:0,zIndex:40}} onClick={()=>setOpenCat(false)}/>}
{(mostBar||leastBar)&&(
<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
{mostBar&&<div style={{background:C.border,borderRadius:8,padding:"4px 9px",fontSize:11}}><span style={{color:C.t3}}>↑ </span><Mono color={C.red} size={11}>{fmtS(mostBar.val)}</Mono><span style={{color:C.t4,marginLeft:4}}>{mostBar.label}</span></div>}
{leastBar&&<div style={{background:C.border,borderRadius:8,padding:"4px 9px",fontSize:11}}><span style={{color:C.t3}}>↓ </span><Mono color={C.green} size={11}>{fmtS(leastBar.val)}</Mono><span style={{color:C.t4,marginLeft:4}}>{leastBar.label}</span></div>}
{showAvg&&rollingAvg>0&&<div style={{background:C.border,borderRadius:8,padding:"4px 9px",fontSize:11}}><span style={{color:C.t3}}>1-yr avg </span><Mono color={C.green} size={11}>{fmtS(rollingAvg)}</Mono></div>}
</div>
)}
<div style={{overflowX:"auto",paddingBottom:6}}>
<svg width={Math.max(W,bars.length*22)} height={H+20} style={{display:"block"}}>
{showAvg&&rollingAvg>0&&<>
<rect x={PAD} y={avgY-(H-PAD*2)*.1} width={W-PAD*2} height={(H-PAD*2)*.2} fill={`${C.green}12`}/>
<line x1={PAD} y1={avgY} x2={W-PAD} y2={avgY} stroke={C.green} strokeWidth={1} strokeDasharray="4 2"/>
<text x={PAD+6} y={avgY} fill={C.green} fontSize={8} fontWeight="700" dominantBaseline="middle" textAnchor="start">avg</text>
</>}
{showProj&&projection!=null&&<line x1={PAD} y1={yOf(projection)} x2={W-PAD} y2={yOf(projection)} stroke={C.amber} strokeWidth={1} strokeDasharray="4 2"/>}
{showCumul&&cumulativePts.length>1&&<polyline points={cumulativePts.map(p=>`${p.x},${p.y}`).join(" ")} fill="none" stroke={C.cyan} strokeWidth={1.5} opacity={.7}/>}
{bars.map((b,i)=>{
const x=xOf(i);
if(showStacked&&catFilter==="All Expenses"){
let yStack=H-PAD;
return(
<g key={i}>
{stackCats.filter(c=>b.bycat[c]>0).map(c=>{
const ch=(b.bycat[c]/maxVal)*(H-PAD*2);yStack-=ch;
return <rect key={c} x={x} y={yStack} width={barW} height={ch} rx={1} fill={CAT_COLORS[c]||C.t2} opacity={b.isFuture?.4:.8}/>;
})}
{bars.length<=32&&(i%2===0||displayPeriod!=="monthly")&&<text x={x+barW/2} y={H+16} textAnchor="middle" fill={C.t5} fontSize={9}>{b.label}</text>}
</g>
);
}else{
const bh=Math.max(2,(b.val/maxVal)*(H-PAD*2));
const by=H-PAD-bh;
return(
<g key={i}>
<rect x={x} y={by} width={barW} height={bh} rx={2} fill={showAvg&&rollingAvg>0&&b.val>rollingAvg*1.1?C.red:CAT_COLORS[catFilter]||C.red} opacity={b.val===0?.12:b.isFuture?.3:b.val===mostVal?1:.65}/>
{bars.length<=32&&(i%2===0||displayPeriod!=="monthly")&&<text x={x+barW/2} y={H+16} textAnchor="middle" fill={C.t5} fontSize={9}>{b.label}</text>}
</g>
);
}
})}
{showProj&&projection!=null&&<text x={W-PAD-4} y={yOf(projection)} fill={C.amber} fontSize={8} fontWeight="700" textAnchor="end" dominantBaseline="middle">proj</text>}
</svg>
</div>
<div style={{display:"flex",gap:8,flexWrap:"wrap",fontSize:10,color:C.t3}}>
{showStacked&&stackCats.map(c=><div key={c} style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,background:CAT_COLORS[c]||C.t2,borderRadius:2,display:"inline-block"}}/>{c}</div>)}
</div>
</div>
);
}

// ── CALENDAR ──────────────────────────────────────────────────
function CalendarWidget({entries,displayPeriod}){
const isYearly=displayPeriod==="yearly";
const[calYear,setCalYear]=useState(today.getFullYear());
const[calMonth,setCalMonth]=useState(today.getMonth());
const[sel,setSel]=useState(null);
const prev=()=>{setSel(null);if(isYearly)setCalYear(y=>y-1);else if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1);};
const next=()=>{setSel(null);if(isYearly)setCalYear(y=>y+1);else if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1);};
if(isYearly){
return(
<div className="card" style={{padding:16}}>
<Row mb={14}><span style={{fontSize:14,fontWeight:700,color:C.t2}}>Monthly Overview</span>
<div style={{display:"flex",alignItems:"center",gap:10}}>
<button onClick={prev} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:18}}>‹</button>
<span style={{fontSize:13,fontWeight:700,color:C.t1}}>{calYear}</span>
<button onClick={next} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:18}}>›</button>
</div>
</Row>
<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
{Array.from({length:12},(_,m)=>{
const from=new Date(calYear,m,1),to=new Date(calYear,m+1,0);
let inc=0,exp=0;
datesInRange(from,to).forEach(d=>{inc+=dailyTotal(entries,d,"income");exp+=dailyTotal(entries,d,"expense");});
return(
<div key={m} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px 10px"}}>
<div style={{fontSize:11,fontWeight:700,color:C.t3,marginBottom:4}}>{MON_SHORT[m]}</div>
{inc>0&&<div style={{fontSize:11,fontFamily:F.mono,color:C.green}}>+{fmtS(inc)}</div>}
{exp>0&&<div style={{fontSize:11,fontFamily:F.mono,color:C.red}}>−{fmtS(exp)}</div>}
{!inc&&!exp&&<div style={{fontSize:10,color:C.t5}}>—</div>}
</div>
);
})}
</div>
</div>
);
}
const firstDay=new Date(calYear,calMonth,1).getDay();
const daysInMonth=new Date(calYear,calMonth+1,0).getDate();
const cells=[];
for(let i=0;i<firstDay;i++)cells.push(null);
for(let d=1;d<=daysInMonth;d++)cells.push(d);
const selEntries=sel?entries.filter(e=>occursOn(e,sel)):[];
const selInc=selEntries.filter(e=>e.type==="income");
const selExp=selEntries.filter(e=>e.type==="expense");
const selTotalIn=selInc.reduce((s,e)=>s+e.amount,0);
const selTotalOut=selExp.reduce((s,e)=>s+e.amount,0);
return(
<div className="card" style={{padding:16}}>
<Row mb={12}><span style={{fontSize:14,fontWeight:700,color:C.t2}}>Daily View</span>
<div style={{display:"flex",alignItems:"center",gap:10}}>
<button onClick={prev} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:18}}>‹</button>
<span style={{fontSize:13,fontWeight:700,color:C.t1}}>{MON_SHORT[calMonth]} {calYear}</span>
<button onClick={next} style={{background:"none",border:"none",color:C.t3,cursor:"pointer",fontSize:18}}>›</button>
</div>
</Row>
<div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
{DAYS_SHORT.map(d=><div key={d} style={{textAlign:"center",fontSize:9,color:C.t4,fontWeight:700,padding:"2px 0"}}>{d}</div>)}
</div>
<div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:sel?14:0}}>
{cells.map((day,i)=>{
if(!day)return <div key={`e${i}`}/>;
const date=new Date(calYear,calMonth,day);
const inc=dailyTotal(entries,date,"income");
const exp=dailyTotal(entries,date,"expense");
const isToday=dateKey(date)===todayStr;
const isSel=sel&&dateKey(date)===dateKey(sel);
const hasAct=inc>0||exp>0;
return(
<div key={`${calYear}-${calMonth}-${day}`} onClick={()=>setSel(isSel?null:date)}
style={{background:isSel?"rgba(110,231,183,.18)":isToday?"rgba(110,231,183,.08)":C.bg,border:`1px solid ${isSel?C.green:isToday?"rgba(110,231,183,.4)":hasAct?"#1e3a2e":C.border}`,borderRadius:6,padding:"4px 3px",minHeight:44,cursor:"pointer"}}>
<div style={{fontSize:10,fontWeight:isToday||isSel?700:500,color:isSel||isToday?C.green:C.t3,textAlign:"center",marginBottom:2}}>
{day}{isToday&&<span style={{display:"inline-block",width:4,height:4,borderRadius:"50%",background:C.green,marginLeft:2,verticalAlign:"middle"}}/>}
</div>
{inc>0&&<div style={{fontSize:9,fontFamily:F.mono,color:C.green,textAlign:"center"}}>+{fmtS(inc)}</div>}
{exp>0&&<div style={{fontSize:9,fontFamily:F.mono,color:C.red,textAlign:"center"}}>−{fmtS(exp)}</div>}
</div>
);
})}
</div>
{sel&&(
<div style={{borderTop:`1px solid ${C.border}`,paddingTop:14}}>
<Row mb={12}>
<div>
<span style={{fontSize:13,fontWeight:700,color:C.t1}}>{DAYS_SHORT[sel.getDay()]} {sel.getDate()} {MON_SHORT[sel.getMonth()]}</span>
{dateKey(sel)===todayStr&&<span style={{marginLeft:8,fontSize:10,background:"rgba(110,231,183,.15)",color:C.green,borderRadius:6,padding:"2px 7px",fontWeight:700}}>Today</span>}
{sel>today&&<span style={{marginLeft:8,fontSize:10,background:"rgba(167,139,250,.12)",color:C.purple,borderRadius:6,padding:"2px 7px",fontWeight:700}}>Upcoming</span>}
</div>
<button onClick={()=>setSel(null)} style={{background:"none",border:"none",color:C.t4,fontSize:18,cursor:"pointer"}}>×</button>
</Row>
{selEntries.length===0&&<div style={{textAlign:"center",padding:"16px 0",color:C.t5,fontSize:13}}>No payments on this day</div>}
{selInc.length>0&&<>
<Label color={C.green} mb={6}>Incoming</Label>
{selInc.map(e=>(
<div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",background:"rgba(110,231,183,.06)",borderRadius:8,marginBottom:4,borderLeft:`2px solid ${C.green}`}}>
<div><div style={{fontSize:12,fontWeight:600,color:C.t1}}>{e.label}</div><div style={{fontSize:10,color:C.t4}}>{e.category}{e.recur!=="One-off"?` · ${e.recur}`:""}</div></div>
<Mono color={C.green} size={13}>+{fmt(e.amount)}</Mono>
</div>
))}
</>}
{selExp.length>0&&<>
<Label color={C.red} mb={6}>Outgoings</Label>
{selExp.map(e=>(
<div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",background:"rgba(251,113,133,.06)",borderRadius:8,marginBottom:4,borderLeft:`2px solid ${C.red}`}}>
<div><div style={{fontSize:12,fontWeight:600,color:C.t1}}>{e.label}</div><div style={{fontSize:10,color:C.t4}}>{e.category}{e.recur!=="One-off"?` · ${e.recur}`:""}</div></div>
<Mono color={C.red} size={13}>−{fmt(e.amount)}</Mono>
</div>
))}
</>}
{selEntries.length>0&&(
<div style={{display:"flex",justifyContent:"space-between",borderTop:`1px solid ${C.border}`,paddingTop:10,marginTop:4}}>
{selTotalIn>0&&<Mono color={C.green} size={12}>+{fmt(selTotalIn)} in</Mono>}
{selTotalOut>0&&<Mono color={C.red} size={12}>−{fmt(selTotalOut)} out</Mono>}
{selTotalIn>0&&selTotalOut>0&&<Mono color={selTotalIn-selTotalOut>=0?C.green:C.red} size={12}>{selTotalIn-selTotalOut>=0?"+":"−"}{fmt(Math.abs(selTotalIn-selTotalOut))} net</Mono>}
</div>
)}
</div>
)}
</div>
);
}

// ── MORTGAGE ──────────────────────────────────────────────────
const DEFAULT_MORT={principal:500000,annualRate:6.5,termYears:30,startDate:"2025-01-01",fixedUntil:""};

function MortgageWidget({cfg,setCfg,rateChanges,setRateChanges,lumpSums,setLumpSums,displayPeriod="monthly"}){
const[cfgD,setCfgD]=useState(cfg);
useEffect(()=>{setCfgD(cfg);},[cfg]);
const[showSetup,setShowSetup]=useState(false);
const[showRF,setShowRF]=useState(false);
const[showLF,setShowLF]=useState(false);
const[chartView,setChartView]=useState("balance");
const[hoverIdx,setHoverIdx]=useState(null);
const[scenario,setScenario]=useState({active:false,extraMonthly:0,lumpAtStart:0});
const[showRefi,setShowRefi]=useState(false);
const[refi,setRefi]=useState({rate:"",termYears:"",costs:""});
const[newRate,setNewRate]=useState({month:12,rate:6.0});
const[newLump,setNewLump]=useState({month:12,amount:10000,note:""});
const schedule=useMemo(()=>buildSchedule(cfg.principal,cfg.annualRate,cfg.termYears,cfg.startDate,rateChanges,lumpSums),[cfg,rateChanges,lumpSums]);
const monthlyPmt=schedule.length?schedule[0].payment:0;
const pDays=PERIODS.find(p=>p.key===displayPeriod).days;
const periodPmt=monthlyPmt*(pDays/30.44);
const pmtLabel=({weekly:"Weekly",fortnightly:"Fortnightly",monthly:"Monthly",yearly:"Yearly"})[displayPeriod]+" Payment";
const totalInterest=schedule.reduce((s,m)=>s+m.interest,0);
const totalCost=cfg.principal+totalInterest;
const paidOff=schedule.length?schedule[schedule.length-1].date:null;
const W=400,H=260,LPAD=52,RPAD=8,PAD=LPAD;
const xScale=i=>LPAD+i*(W-LPAD-RPAD)/(Math.max(schedule.length/12-1,1));
const data=useMemo(()=>schedule.filter((_,i)=>i%12===0).map((m,yi)=>({year:m.date.getFullYear(),balance:m.balance,interest:schedule.slice(yi*12,(yi+1)*12).reduce((s,x)=>s+x.interest,0),principal:schedule.slice(yi*12,(yi+1)*12).reduce((s,x)=>s+x.principal,0),lump:schedule.slice(yi*12,(yi+1)*12).reduce((s,x)=>s+x.lump,0)})),[schedule]);
const maxStack=Math.max(...data.map(d=>d.interest+d.principal+d.lump),1);
const minV=Math.min(...data.map(d=>d.balance),0),maxV=Math.max(...data.map(d=>d.balance),1);
const yScale=v=>H-LPAD-(v-minV)/(maxV-minV)*(H-LPAD-RPAD*4);
const balPath=data.map((d,i)=>`${i===0?"M":"L"}${xScale(i)},${yScale(d.balance)}`).join(" ");
const barW=Math.max(1,(W-LPAD-RPAD)/data.length-1);
const scenarioYearly=useMemo(()=>{
if(!scenario.active)return null;
const sc=buildSchedule(cfg.principal+scenario.lumpAtStart>cfg.principal?cfg.principal-scenario.lumpAtStart:cfg.principal,cfg.annualRate,cfg.termYears,cfg.startDate,rateChanges,[...lumpSums,...(scenario.lumpAtStart>0?[{month:0,amount:scenario.lumpAtStart,id:"sc"}]:[])]);
const monthly=sc.filter((_,i)=>i%12===0).map((m,yi)=>({year:m.date.getFullYear(),balance:m.balance-scenario.extraMonthly*12*yi}));
return monthly;
},[scenario,cfg,rateChanges,lumpSums]);
const scenPath=scenarioYearly?scenarioYearly.map((d,i)=>`${i===0?"M":"L"}${xScale(i)},${yScale(Math.max(0,d.balance))}`).join(" "):null;
const refiComparison=useMemo(()=>{
if(!showRefi)return null;
const nr=Number(refi.rate)||cfg.annualRate,nt=Number(refi.termYears)||cfg.termYears,nc=Number(refi.costs)||0;
const curBal=schedule.length?schedule[0].balance:cfg.principal;
const curMo=cfg.annualRate/100/12,curN=schedule.length;
const curM=curBal*curMo*Math.pow(1+curMo,curN)/(Math.pow(1+curMo,curN)-1);
const nMo=nr/100/12,nN=nt*12;
const nM=(curBal+nc)*nMo*Math.pow(1+nMo,nN)/(Math.pow(1+nMo,nN)-1);
const curTotalInterest=curM*curN-curBal;
const nTotalInterest=nM*nN-(curBal+nc);
const monthlySaving=curM-nM;
return{currentMonthly:curM,refiMonthly:nM,monthlySaving,interestSaved:curTotalInterest-nTotalInterest,breakEven:monthlySaving>0?nc/monthlySaving:null};
},[showRefi,refi,schedule,cfg]);

const rateAlert=(()=>{
if(!cfg.fixedUntil)return null;
const expiry=new Date(cfg.fixedUntil),daysLeft=Math.round((expiry-new Date(todayStr))/(1000*60*60*24));
if(daysLeft<0)return{color:C.red,icon:"⚠️",title:"Fixed rate has expired",msg:`Expired ${Math.abs(daysLeft)} days ago`};
if(daysLeft<=90)return{color:C.red,icon:"🔔",title:"Fixed rate expiring soon",msg:`${daysLeft} days left · ${cfg.fixedUntil}`};
if(daysLeft<=180)return{color:C.amber,icon:"📅",title:`Fixed rate expiring in ${daysLeft} days`,msg:`Expires ${cfg.fixedUntil}`};
return null;
})();

return(
<div style={{background:C.card,borderRadius:16,overflow:"hidden",marginBottom:16}}>
<div style={{background:"linear-gradient(135deg,#0f172a,#111827)",borderBottom:`1px solid ${C.border}`,padding:"16px 20px"}}>
<Row mb={12}>
<div>
<Label color={C.t3} mb={2}>Mortgage Tracker</Label>
{schedule.length>0?(()=>{const cur=schedule.find(m=>new Date(m.date)>=new Date(todayStr));const bal=cur?cur.balance:schedule[schedule.length-1].balance;return <><Mono color={C.t1} size={22}>{fmt(bal)}</Mono><div style={{fontSize:11,color:C.t3,marginTop:2}}>Original loan: <span style={{color:C.t2}}>{fmt(cfg.principal)}</span></div></>;})():<Mono color={C.t1} size={22}>{fmt(cfg.principal)}</Mono>}
<div style={{fontSize:12,color:C.t3,marginTop:2}}>{cfg.annualRate}% p.a. · {cfg.termYears} yr · from {cfg.startDate}</div>
</div>
<Btn onClick={()=>{setCfgD(cfg);setShowSetup(s=>!s);}} bg={showSetup?"rgba(110,231,183,.15)":C.border} border={showSetup?C.green:C.t5} color={showSetup?C.green:C.t2}>⚙ Setup</Btn>
</Row>
<div className="hscroll" style={{gap:10}}>
{[{label:pmtLabel,val:fmt(periodPmt),color:C.t1},{label:"Total Interest",val:fmt(totalInterest),color:C.red},{label:"Total Cost",val:fmt(totalCost),color:C.amber},{label:"Paid Off",val:paidOff?`${MON_SHORT[paidOff.getMonth()]} ${paidOff.getFullYear()}`:"—",color:C.green},{label:"Years Left",val:`${(schedule.length/12).toFixed(1)} yrs`,color:C.cyan}].map(s=>(
<div key={s.label} style={{background:"rgba(255,255,255,.03)",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",minWidth:130,flexShrink:0}}>
<div style={{fontSize:10,color:C.t4,marginBottom:4,textTransform:"uppercase",letterSpacing:".06em"}}>{s.label}</div>
<Mono color={s.color} size={14}>{s.val}</Mono>
</div>
))}
</div>
</div>
{showSetup&&(
<div style={{background:C.bg,borderBottom:`1px solid ${C.border}`,padding:"16px 20px"}}>
<div style={{fontSize:13,fontWeight:700,color:C.t2,marginBottom:14}}>Mortgage Details</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
{[{label:"Loan Amount ($)",key:"principal",type:"number"},{label:"Annual Rate (%)",key:"annualRate",type:"number"},{label:"Term (years)",key:"termYears",type:"number"},{label:"Start Date",key:"startDate",type:"date"},{label:"Fixed Rate Expiry",key:"fixedUntil",type:"date"}].map(f=>(
<div key={f.key}>
<label style={{fontSize:11,color:C.t3,display:"block",marginBottom:5}}>{f.label}</label>
<input className="fi" type={f.type==="number"?"text":f.type} inputMode={f.type==="number"?"decimal":undefined} value={cfgD[f.key]} onFocus={e=>e.target.select()} onChange={e=>setCfgD(d=>({...d,[f.key]:e.target.value}))} style={{padding:"9px 12px"}}/>
</div>
))}
</div>
<GradBtn onClick={()=>{setCfg({...cfgD,principal:Number(cfgD.principal)||0,annualRate:Number(cfgD.annualRate)||0,termYears:Number(cfgD.termYears)||0});setShowSetup(false);}}>Apply Changes</GradBtn>
</div>
)}
{rateAlert&&(
<div style={{background:`rgba(${rateAlert.color==="#fb7185"?"251,113,133":"251,191,36"},.1)`,borderBottom:`1px solid rgba(${rateAlert.color==="#fb7185"?"251,113,133":"251,191,36"},.25)`,padding:"10px 20px",display:"flex",alignItems:"center",gap:10}}>
<span style={{fontSize:16}}>{rateAlert.icon}</span>
<div><div style={{fontSize:12,fontWeight:700,color:rateAlert.color}}>{rateAlert.title}</div><div style={{fontSize:11,color:C.t2}}>{rateAlert.msg}</div></div>
</div>
)}
<div style={{padding:"16px 20px"}}>
<div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center",flexWrap:"wrap"}}>
{[{k:"balance",l:"Balance"},{k:"split",l:"Interest vs Principal"}].map(o=>(
<button key={o.k} onClick={()=>setChartView(o.k)} className={`rb ${chartView===o.k?"on":""}`}>{o.l}</button>
))}
<button onClick={()=>setScenario(s=>({...s,active:!s.active}))} className={`rb ${scenario.active?"on":""}`} style={{marginLeft:"auto",color:scenario.active?C.purple:undefined,borderColor:scenario.active?C.purple:undefined,background:scenario.active?"rgba(167,139,250,.15)":undefined}}>{scenario.active?"✓ ":""}What-if</button>
<button onClick={()=>setShowRefi(v=>!v)} className={`rb ${showRefi?"oo":""}`}>{showRefi?"✓ ":""}Refinance</button>
</div>
{scenario.active&&(
<div style={{background:"rgba(167,139,250,.07)",border:`1px solid rgba(167,139,250,.2)`,borderRadius:12,padding:14,marginBottom:14}}>
<div style={{fontSize:12,fontWeight:700,color:C.purple,marginBottom:10}}>What-if Scenario</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
<div><label style={{fontSize:11,color:C.t3,display:"block",marginBottom:4}}>Extra monthly ($)</label><input className="fi" type="text" inputMode="decimal" value={scenario.extraMonthly===0?"":scenario.extraMonthly} onFocus={e=>e.target.select()} onChange={e=>setScenario(s=>({...s,extraMonthly:e.target.value}))} style={{padding:"8px 12px"}}/></div>
<div><label style={{fontSize:11,color:C.t3,display:"block",marginBottom:4}}>Lump sum now ($)</label><input className="fi" type="text" inputMode="decimal" value={scenario.lumpAtStart===0?"":scenario.lumpAtStart} onFocus={e=>e.target.select()} onChange={e=>setScenario(s=>({...s,lumpAtStart:e.target.value}))} style={{padding:"8px 12px"}}/></div>
</div>
</div>
)}
{showRefi&&(
<div style={{background:"rgba(251,191,36,.06)",border:`1px solid rgba(251,191,36,.3)`,borderRadius:12,padding:14,marginBottom:14}}>
<div style={{fontSize:12,fontWeight:700,color:C.amber,marginBottom:12}}>Refinance Comparison</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
{[{label:"New Rate (%)",key:"rate",ph:String(cfg.annualRate)},{label:"New Term (yrs)",key:"termYears",ph:String(cfg.termYears)},{label:"Refi Costs ($)",key:"costs",ph:"0"}].map(f=>(
<div key={f.key}><label style={{fontSize:11,color:C.t3,display:"block",marginBottom:4}}>{f.label}</label><input className="fi" type="text" inputMode="decimal" placeholder={f.ph} value={refi[f.key]} onFocus={e=>e.target.select()} onChange={e=>setRefi(r=>({...r,[f.key]:e.target.value}))} style={{padding:"8px 10px"}}/></div>
))}
</div>
{refiComparison&&<>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
{[{label:"Current monthly",val:fmt(refiComparison.currentMonthly),color:C.t2},{label:"New monthly",val:fmt(refiComparison.refiMonthly),color:refiComparison.refiMonthly<refiComparison.currentMonthly?C.green:C.red},{label:"Monthly saving",val:(refiComparison.monthlySaving>=0?"+":"")+fmt(refiComparison.monthlySaving),color:refiComparison.monthlySaving>=0?C.green:C.red},{label:"Interest saved",val:(refiComparison.interestSaved>=0?"+":"-")+fmtS(Math.abs(refiComparison.interestSaved)),color:refiComparison.interestSaved>=0?C.green:C.red}].map(s=>(
<div key={s.label} style={{background:C.bg,borderRadius:8,padding:"8px 10px"}}><div style={{fontSize:10,color:C.t3,marginBottom:3}}>{s.label}</div><Mono color={s.color} size={13}>{s.val}</Mono></div>
))}
</div>
{refiComparison.breakEven!=null&&<div style={{fontSize:12,color:C.t2}}>💡 Break-even in <strong>{Math.ceil(refiComparison.breakEven)} months</strong></div>}
</>}
</div>
)}
<div style={{margin:"0 -20px",marginBottom:6}} onMouseLeave={()=>setHoverIdx(null)}>
<svg width="100%" height="260" viewBox={`0 0 ${W} ${H+36}`} style={{display:"block",cursor:"crosshair"}}
onMouseMove={e=>{const rect=e.currentTarget.getBoundingClientRect();const mx=(e.clientX-rect.left)*(W/rect.width);const idx=Math.round((mx-PAD)/(W-PAD*2)*(data.length-1));setHoverIdx(Math.max(0,Math.min(data.length-1,idx)));}}>
{chartView==="balance"&&<>
<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.green} stopOpacity=".18"/><stop offset="100%" stopColor={C.green} stopOpacity=".01"/></linearGradient></defs>
<path d={`${balPath} L${xScale(data.length-1)},${H-LPAD} L${xScale(0)},${H-LPAD} Z`} fill="url(#bg)"/>
<path d={balPath} fill="none" stroke={C.green} strokeWidth={2}/>
{scenPath&&<path d={scenPath} fill="none" stroke={C.purple} strokeWidth={2} strokeDasharray="5 3"/>}
{rateChanges.map((rc,i)=>{const yi=Math.floor(rc.month/12);if(yi>=data.length)return null;return <line key={i} x1={xScale(yi)} y1={RPAD*2} x2={xScale(yi)} y2={H-LPAD} stroke={C.amber} strokeWidth={1} strokeDasharray="3 2" opacity={.7}/>;}) }
{lumpSums.map((l,i)=>{const yi=Math.floor(l.month/12);if(yi>=data.length)return null;return <circle key={i} cx={xScale(yi)} cy={yScale((data[yi]&&data[yi].balance)||0)} r={4} fill={C.purple} stroke={C.bg} strokeWidth={1.5}/>;}) }
{[0,.25,.5,.75,1].map(f=><text key={f} x={LPAD-4} y={yScale(cfg.principal*f)+4} fill={C.t5} fontSize={9} textAnchor="end">{fmtS(cfg.principal*f)}</text>)}
{hoverIdx!==null&&data[hoverIdx]&&<circle cx={xScale(hoverIdx)} cy={yScale(data[hoverIdx].balance)} r={4} fill={C.green} stroke={C.bg} strokeWidth={2}/>}
</>}
{chartView==="split"&&data.map((d,i)=>{
const x=LPAD+i*(barW+1),chartH=H-LPAD-RPAD*2,intH=(d.interest/maxStack)*chartH,prinH=(d.principal/maxStack)*chartH,lumpH=(d.lump/maxStack)*chartH;
return <g key={i}><rect x={x} y={H-LPAD-intH-prinH-lumpH} width={barW} height={intH} rx={1} fill={C.red} opacity={.8}/><rect x={x} y={H-LPAD-prinH-lumpH} width={barW} height={prinH} rx={1} fill={C.green} opacity={.8}/>{d.lump>0&&<rect x={x} y={H-LPAD-lumpH} width={barW} height={lumpH} rx={1} fill={C.purple} opacity={.9}/>}</g>;
})}
{data.map((d,i)=>i%5===0?<text key={i} x={xScale(i)} y={H+18} textAnchor="middle" fill={C.t5} fontSize={9}>{d.year}</text>:null)}
{hoverIdx!==null&&data[hoverIdx]&&<line x1={xScale(hoverIdx)} y1={RPAD*2} x2={xScale(hoverIdx)} y2={H-LPAD} stroke={C.t4} strokeWidth={1} strokeDasharray="2 2"/>}
</svg>
</div>
{hoverIdx!==null&&data[hoverIdx]&&(
<div style={{background:C.border,border:`1px solid ${C.t5}`,borderRadius:10,padding:"10px 14px",marginTop:8,display:"flex",gap:16,flexWrap:"wrap"}}>
<div style={{fontSize:12,fontWeight:700,color:C.t1,minWidth:"100%"}}>{data[hoverIdx].year}</div>
{[{l:"Balance",v:fmt(data[hoverIdx].balance),c:C.green},{l:"Interest",v:fmt(data[hoverIdx].interest),c:C.red},{l:"Principal",v:fmt(data[hoverIdx].principal),c:C.green},...(data[hoverIdx].lump>0?[{l:"Lump sum",v:fmt(data[hoverIdx].lump),c:C.purple}]:[]),...(scenarioYearly&&scenarioYearly[hoverIdx]?[{l:"Scenario balance",v:fmt(scenarioYearly[hoverIdx].balance),c:C.purple}]:[])].map(s=>(
<div key={s.l}><div style={{fontSize:10,color:C.t3}}>{s.l}</div><Mono color={s.c} size={12}>{s.v}</Mono></div>
))}
</div>
)}
<div style={{display:"flex",gap:12,marginTop:10,flexWrap:"wrap",fontSize:10,color:C.t3}}>
{chartView==="balance"&&<><div style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:16,height:2,background:C.green,display:"inline-block",borderRadius:1}}/>Balance</div>{scenario.active&&<div style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:16,height:2,background:C.purple,display:"inline-block",borderRadius:1}}/>Scenario</div>}<div style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:8,height:8,background:C.amber,display:"inline-block",borderRadius:"50%"}}/>Rate change</div><div style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:8,height:8,background:C.purple,display:"inline-block",borderRadius:"50%"}}/>Lump sum</div></>}
{chartView==="split"&&<><div style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:10,height:10,background:C.red,display:"inline-block",borderRadius:2}}/>Interest</div><div style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:10,height:10,background:C.green,display:"inline-block",borderRadius:2}}/>Principal</div><div style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:10,height:10,background:C.purple,display:"inline-block",borderRadius:2}}/>Lump sum</div></>}
</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:16}}>
{[{label:"Interest over life",val:fmt(totalInterest),color:C.red,pct:(totalInterest/totalCost*100).toFixed(1),barColor:C.red},{label:"Principal",val:fmt(cfg.principal),color:C.green,pct:(cfg.principal/totalCost*100).toFixed(1),barColor:C.green}].map(s=>(
<div key={s.label} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 14px"}}>
<div style={{fontSize:10,color:C.t3,marginBottom:6,textTransform:"uppercase",letterSpacing:".06em"}}>{s.label}</div>
<Mono color={s.color} size={16}>{s.val}</Mono>
<div style={{fontSize:11,color:C.t4,marginTop:3}}>{s.pct}% of total cost</div>
<div style={{height:4,background:C.border,borderRadius:2,marginTop:8,overflow:"hidden"}}><div style={{height:"100%",width:`${s.pct}%`,background:s.barColor,borderRadius:2}}/></div>
</div>
))}
</div>
<div style={{marginTop:16}}>
<Row mb={10}><div style={{fontSize:12,fontWeight:700,color:C.t2}}>Rate Changes</div><button onClick={()=>setShowRF(s=>!s)} className={`rb ${showRF?"oo":""}`}>+ Add</button></Row>
{showRF&&(
<div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:14,marginBottom:10}}>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
<div><label style={{fontSize:11,color:C.t3,display:"block",marginBottom:4}}>Date of rate change</label><input className="fi" type="date" value={newRate.date||cfg.startDate} onChange={e=>{const d=parseDt(e.target.value),s=parseDt(cfg.startDate);const mo=Math.max(0,Math.round((d-s)/86400000/30.44));setNewRate(r=>({...r,date:e.target.value,month:mo}));}} style={{padding:"8px 12px"}}/></div>
<div><label style={{fontSize:11,color:C.t3,display:"block",marginBottom:4}}>New rate (%)</label><input className="fi" type="text" inputMode="decimal" value={newRate.rate===0?"":newRate.rate} onFocus={e=>e.target.select()} onChange={e=>setNewRate(r=>({...r,rate:e.target.value}))} style={{padding:"8px 12px"}}/></div>
</div>
<GradBtn onClick={()=>{setRateChanges(rc=>[...rc,{...newRate,id:Date.now()}].sort((a,b)=>a.month-b.month));setShowRF(false);}}>Add Rate Change</GradBtn>
</div>
)}
{rateChanges.length===0&&<div style={{fontSize:12,color:C.t5,fontStyle:"italic"}}>No rate changes — running at {cfg.annualRate}% for full term.</div>}
{rateChanges.map((rc,i)=>{const d=new Date(parseDt(cfg.startDate));d.setMonth(d.getMonth()+rc.month);return(
<div key={rc.id||i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",marginBottom:6}}>
<div><span style={{fontSize:12,fontWeight:600,color:C.amber}}>{rc.rate}% p.a.</span><span style={{fontSize:11,color:C.t4,marginLeft:8}}>from {MON_SHORT[d.getMonth()]} {d.getFullYear()}</span></div>
<button onClick={()=>setRateChanges(rc2=>rc2.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:C.t4,cursor:"pointer",fontSize:16}}>×</button>
</div>
);})}
</div>
<div style={{marginTop:16}}>
<Row mb={10}><div style={{fontSize:12,fontWeight:700,color:C.t2}}>Lump Sum Payments</div><button onClick={()=>setShowLF(s=>!s)} className={`rb ${showLF?"on":""}`} style={showLF?{color:C.purple,borderColor:C.purple,background:"rgba(167,139,250,.15)"}:{}}>+ Add</button></Row>
{showLF&&(
<div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:14,marginBottom:10}}>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
<div><label style={{fontSize:11,color:C.t3,display:"block",marginBottom:4}}>Date of payment</label><input className="fi" type="date" value={newLump.date||cfg.startDate} onChange={e=>{const d=parseDt(e.target.value),s=parseDt(cfg.startDate);const mo=Math.max(0,Math.round((d-s)/86400000/30.44));setNewLump(l=>({...l,date:e.target.value,month:mo}));}} style={{padding:"8px 12px"}}/></div>
<div><label style={{fontSize:11,color:C.t3,display:"block",marginBottom:4}}>Amount ($)</label><input className="fi" type="text" inputMode="decimal" value={newLump.amount===0?"":newLump.amount} onFocus={e=>e.target.select()} onChange={e=>setNewLump(l=>({...l,amount:e.target.value}))} style={{padding:"8px 12px"}}/></div>
</div>
<div style={{marginBottom:10}}><label style={{fontSize:11,color:C.t3,display:"block",marginBottom:4}}>Note (optional)</label><input className="fi" placeholder="e.g. Tax refund" value={newLump.note} onChange={e=>setNewLump(l=>({...l,note:e.target.value}))} style={{padding:"8px 12px"}}/></div>
<GradBtn onClick={()=>{setLumpSums(ls=>[...ls,{...newLump,id:Date.now()}]);setShowLF(false);}}>Add Lump Sum</GradBtn>
</div>
)}
{lumpSums.length===0&&<div style={{fontSize:12,color:C.t5,fontStyle:"italic"}}>No lump sums recorded yet.</div>}
{lumpSums.map((l,i)=>{const d=new Date(parseDt(cfg.startDate));d.setMonth(d.getMonth()+l.month);return(
<div key={l.id||i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",marginBottom:6}}>
<div><Mono color={C.purple} size={12}>{fmt(l.amount)}</Mono><span style={{fontSize:11,color:C.t4,marginLeft:8}}>{MON_SHORT[d.getMonth()]} {d.getFullYear()}</span>{l.note&&<span style={{fontSize:11,color:C.t3,marginLeft:6}}>· {l.note}</span>}</div>
<button onClick={()=>setLumpSums(ls=>ls.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:C.t4,cursor:"pointer",fontSize:16}}>×</button>
</div>
);})}
</div>
</div>
</div>
);
}

// ── NET WORTH ─────────────────────────────────────────────────
function NetWorthWidget({mortgageSchedule,mortgagePrincipal,assets,setAssets,liabilities,setLiabilities,snapshots,setSnapshots}){
const[editMode,setEditMode]=useState(false);
const[hoverSnap,setHoverSnap]=useState(null);
const liveBal=useMemo(()=>{
if(!mortgageSchedule||!mortgageSchedule.length) return mortgagePrincipal;
const today=new Date();
const current=mortgageSchedule.find(m=>new Date(m.date)>=today);
return current?current.balance:mortgageSchedule[mortgageSchedule.length-1].balance;
},[mortgageSchedule,mortgagePrincipal]);
const totalAssets=assets.reduce((s,a)=>s+Number(a.value),0);
const totalLiabs=liabilities.reduce((s,l)=>s+(l.linkMortgage?liveBal:Number(l.value)),0);
const netWorth=totalAssets-totalLiabs;
const equityPct=totalAssets>0?(totalAssets-totalLiabs)/totalAssets*100:0;
const updateAsset=(id,field,val)=>setAssets(as=>as.map(a=>a.id===id?{...a,[field]:val}:a));
const updateLiab=(id,field,val)=>setLiabilities(ls=>ls.map(l=>l.id===id?{...l,[field]:val}:l));
const chartSnaps=snapshots.length>=2?snapshots:[...snapshots];
const W=360,H=120,PAD=28,RPAD=10;
const allVals=chartSnaps.map(s=>s.netWorth);
const minV=Math.min(...allVals,0),maxV=Math.max(...allVals,1);
const range=maxV-minV||1;
const xS=i=>PAD+i*(W-PAD-RPAD)/(Math.max(chartSnaps.length-1,1));
const yS=v=>H-PAD-((v-minV)/range)*(H-PAD*2);
const linePts=chartSnaps.map((s,i)=>`${xS(i)},${yS(s.netWorth)}`).join(" ");
return(
<div>
<div className="card">
<Row mb={16}>
<div>
<Label color={C.t3} mb={2}>Net Worth</Label>
<Mono color={netWorth>=0?C.green:C.red} size={26}>{netWorth<0?"−":""}{fmt(netWorth)}</Mono>
</div>
<Btn onClick={()=>setEditMode(e=>!e)} bg={editMode?"rgba(110,231,183,.15)":C.border} border={editMode?C.green:C.t5} color={editMode?C.green:C.t2}>{editMode?"✓ Done":"✏ Edit"}</Btn>
</Row>
<div style={{marginBottom:18}}>
<div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.t3,marginBottom:6}}><span>Equity {equityPct.toFixed(1)}%</span><span>Liabilities {(100-equityPct).toFixed(1)}%</span></div>
<div style={{height:10,background:C.border,borderRadius:5,overflow:"hidden",display:"flex"}}>
<div style={{height:"100%",width:`${equityPct}%`,background:`linear-gradient(90deg,${C.green},#3b82f6)`,borderRadius:5,transition:"width .6s ease"}}/>
</div>
</div>
{editMode?(
<div style={{marginBottom:16}}>
<div style={{background:"rgba(110,231,183,.06)",border:`1px solid rgba(110,231,183,.15)`,borderRadius:12,padding:"12px 14px",marginBottom:10}}>
<div style={{fontSize:12,color:C.t3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>Assets <Mono color={C.green} size={14}>{fmt(totalAssets)}</Mono></div>
{assets.map(a=>(
<div key={a.id} style={{display:"flex",alignItems:"center",gap:6,marginTop:6}}>
<input className="ci" value={a.label} placeholder="Asset name" onChange={e=>updateAsset(a.id,"label",e.target.value)} style={{flex:1,minWidth:0,background:C.bg,border:`1px solid ${C.t5}`,borderRadius:6,padding:"6px 8px",color:C.t1,fontSize:16,boxSizing:"border-box"}}/>
<input className="ci" type="text" inputMode="decimal" value={a.value===0?"":a.value} placeholder="0" onFocus={e=>e.target.select()} onChange={e=>updateAsset(a.id,"value",e.target.value)} style={{width:88,flexShrink:0,background:C.bg,border:`1px solid ${C.t5}`,borderRadius:6,padding:"6px 8px",color:C.green,fontSize:16,fontFamily:F.mono,textAlign:"right",boxSizing:"border-box"}}/>
<button onClick={()=>setAssets(as=>as.filter(x=>x.id!==a.id))} style={{background:"none",border:"none",color:C.t4,cursor:"pointer",fontSize:16,lineHeight:1,flexShrink:0}}>×</button>
</div>
))}
<button onClick={()=>setAssets(as=>[...as,{id:Date.now(),label:"New Asset",value:0}])} style={{marginTop:10,background:"none",border:`1px solid ${C.border}`,borderRadius:6,padding:"5px 10px",color:C.t3,fontSize:11,cursor:"pointer",width:"100%"}}>+ Add Asset</button>
</div>
<div style={{background:"rgba(251,113,133,.06)",border:`1px solid rgba(251,113,133,.15)`,borderRadius:12,padding:"12px 14px"}}>
<div style={{fontSize:12,color:C.t3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>Liabilities <Mono color={C.red} size={14}>{fmt(totalLiabs)}</Mono></div>
{liabilities.map(l=>(
<div key={l.id} style={{display:"flex",alignItems:"center",gap:6,marginTop:6}}>
<input className="ci" value={l.label} placeholder="Liability name" onChange={e=>updateLiab(l.id,"label",e.target.value)} style={{flex:1,minWidth:0,background:C.bg,border:`1px solid ${C.t5}`,borderRadius:6,padding:"6px 8px",color:C.t1,fontSize:16,boxSizing:"border-box"}}/>
<input className="ci" type="text" inputMode="decimal" value={l.linkMortgage?Math.round(liveBal):(l.value===0?"":l.value)} placeholder="0" onFocus={e=>e.target.select()} disabled={l.linkMortgage} onChange={e=>updateLiab(l.id,"value",e.target.value)} style={{width:88,flexShrink:0,background:C.bg,border:`1px solid ${C.t5}`,borderRadius:6,padding:"6px 8px",color:C.red,fontSize:16,fontFamily:F.mono,textAlign:"right",opacity:l.linkMortgage?.7:1,boxSizing:"border-box"}}/>
<button onClick={()=>setLiabilities(ls=>ls.filter(x=>x.id!==l.id))} style={{background:"none",border:"none",color:C.t4,cursor:"pointer",fontSize:16,lineHeight:1,flexShrink:0}}>×</button>
</div>
))}
<button onClick={()=>setLiabilities(ls=>[...ls,{id:Date.now(),label:"New Liability",value:0}])} style={{marginTop:10,background:"none",border:`1px solid ${C.border}`,borderRadius:6,padding:"5px 10px",color:C.t3,fontSize:11,cursor:"pointer",width:"100%"}}>+ Add Liability</button>
</div>
</div>
):(
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
<div style={{background:"rgba(110,231,183,.06)",border:`1px solid rgba(110,231,183,.15)`,borderRadius:12,padding:"12px 14px"}}>
<div style={{fontSize:10,color:C.t3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>Total Assets</div>
<Mono color={C.green} size={16}>{fmt(totalAssets)}</Mono>
<div style={{marginTop:8}}>
{assets.map(a=>(
<div key={a.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:6}}>
<span style={{fontSize:11,color:C.t3}}>{a.label}</span>
<span style={{fontFamily:F.mono,fontSize:11,color:C.green}}>{fmtS(a.value)}</span>
</div>
))}
</div>
</div>
<div style={{background:"rgba(251,113,133,.06)",border:`1px solid rgba(251,113,133,.15)`,borderRadius:12,padding:"12px 14px"}}>
<div style={{fontSize:10,color:C.t3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>Total Liabilities</div>
<Mono color={C.red} size={16}>{fmt(totalLiabs)}</Mono>
<div style={{marginTop:8}}>
{liabilities.map(l=>(
<div key={l.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:6}}>
<span style={{fontSize:11,color:C.t3}}>{l.label}</span>
<span style={{fontFamily:F.mono,fontSize:11,color:C.red}}>{fmtS(l.linkMortgage?liveBal:l.value)}</span>
</div>
))}
</div>
</div>
</div>
)}
</div>
<div className="card" style={{marginTop:-12}}>
<Row mb={14}>
<div><div style={{fontSize:13,fontWeight:700,marginBottom:2}}>Net Worth History</div><div style={{fontSize:11,color:C.t4}}>Auto-saved monthly</div></div>
<div style={{display:"flex",alignItems:"center",gap:8}}>
{snapshots.length>0&&<span style={{fontSize:11,color:C.t3}}>{snapshots.length} snapshot{snapshots.length!==1?"s":""}</span>}
{snapshots.length>0&&<button onClick={()=>{const snap={id:Date.now(),date:todayStr,netWorth,totalAssets,totalLiabs,auto:false};setSnapshots(prev=>[...prev.filter(s=>s.date!==todayStr),snap].sort((a,b)=>a.date.localeCompare(b.date)));}} style={{background:"none",border:`1px solid ${C.t5}`,borderRadius:6,padding:"3px 8px",color:C.t4,fontSize:10,cursor:"pointer"}}>↻ Update</button>}
</div>
</Row>
{snapshots.length===0&&<div style={{textAlign:"center",padding:"32px 0",color:C.t5}}><div style={{fontSize:28,marginBottom:8}}>📈</div><div style={{fontSize:13,color:C.t4,marginBottom:4}}>First snapshot coming soon</div><div style={{fontSize:11,color:C.t5}}>Recorded automatically each month</div></div>}
{snapshots.length===1&&<div style={{textAlign:"center",padding:"20px 0",color:C.t4,fontSize:12}}><Mono color={C.green} size={18}>{fmt(snapshots[0].netWorth)}</Mono><div style={{color:C.t3,marginTop:4}}>{snapshots[0].date}</div><div style={{marginTop:8,fontSize:11,color:C.t5}}>Next month unlocks the chart</div></div>}
{snapshots.length>=2&&<>
<div style={{position:"relative"}} onMouseLeave={()=>setHoverSnap(null)}>
<svg width={W} height={H} style={{display:"block",width:"100%"}}>
<defs><linearGradient id="nwg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.green} stopOpacity=".2"/><stop offset="100%" stopColor={C.green} stopOpacity=".01"/></linearGradient></defs>
{minV<0&&<line x1={PAD} y1={yS(0)} x2={W-RPAD} y2={yS(0)} stroke={C.t5} strokeWidth={1} strokeDasharray="3 2"/>}
<path d={`${chartSnaps.map((s,i)=>`${i===0?"M":"L"}${xS(i)},${yS(s.netWorth)}`).join(" ")} L${xS(chartSnaps.length-1)},${H-PAD} L${xS(0)},${H-PAD} Z`} fill="url(#nwg)"/>
<polyline points={linePts} fill="none" stroke={C.green} strokeWidth={2}/>
{chartSnaps.map((s,i)=>(
<text key={i} x={xS(i)} y={H-2} fill={C.t5} fontSize={7} textAnchor={i===0?"start":i===chartSnaps.length-1?"end":"middle"}>{s.date.slice(0,7)}</text>
))}
{chartSnaps.map((s,i)=>(
<circle key={i} cx={xS(i)} cy={yS(s.netWorth)} r={hoverSnap===i?5:3} fill={hoverSnap===i?C.green:C.bg} stroke={C.green} strokeWidth={1.5} style={{cursor:"pointer"}} onClick={()=>setHoverSnap(hoverSnap===i?null:i)}/>
))}
{hoverSnap!==null&&chartSnaps[hoverSnap]&&(()=>{
const s=chartSnaps[hoverSnap],cx=xS(hoverSnap),cy=yS(s.netWorth);
const tx=cx>W*.7?cx-108:cx+8,ty=cy<40?cy+8:cy-52;
return <g><rect x={tx} y={ty} width={100} height={40} rx={6} fill={C.card} stroke={C.border}/><text x={tx+8} y={ty+14} fill={C.t3} fontSize={9}>{s.date}</text><text x={tx+8} y={ty+30} fill={C.green} fontSize={12} fontWeight="700">{fmt(s.netWorth)}</text></g>;
})()}
</svg>
</div>
{(()=>{
const first=snapshots[0],last=snapshots[snapshots.length-1];
const change=last.netWorth-first.netWorth,pct=first.netWorth!==0?(change/Math.abs(first.netWorth))*100:0;
return <div style={{display:"flex",gap:12,marginTop:8,flexWrap:"wrap"}}>
<div style={{background:C.bg,borderRadius:8,padding:"6px 12px"}}><div style={{fontSize:9,color:C.t3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:2}}>Change</div><Mono color={change>=0?C.green:C.red} size={12}>{change>=0?"+":"−"}{fmt(Math.abs(change))}</Mono></div>
<div style={{background:C.bg,borderRadius:8,padding:"6px 12px"}}><div style={{fontSize:9,color:C.t3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:2}}>% Change</div><Mono color={pct>=0?C.green:C.red} size={12}>{pct>=0?"+":""}{pct.toFixed(1)}%</Mono></div>
</div>;
})()}
<div style={{marginTop:14}}>
<div style={{fontSize:11,color:C.t4,marginBottom:8}}>All snapshots</div>
<div style={{maxHeight:160,overflowY:"auto"}}>
{[...snapshots].reverse().map((s,i)=>(
<div key={s.id||i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>
<div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:11,color:C.t3}}>{s.date}</span>{s.auto&&<span style={{fontSize:9,color:C.t5,background:C.border,borderRadius:4,padding:"1px 5px"}}>auto</span>}</div>
<Mono color={s.netWorth>=0?C.green:C.red} size={12}>{s.netWorth>=0?"":"-"}{fmt(Math.abs(s.netWorth))}</Mono>
<button onClick={()=>setSnapshots(prev=>prev.filter(x=>(x.id||x.date)!==(s.id||s.date)))} style={{background:"none",border:"none",color:C.t5,cursor:"pointer",fontSize:14}}>×</button>
</div>
))}
</div>
</div>
</>}
</div>
</div>
);
}

// ── GOALS ─────────────────────────────────────────────────────
function GoalsWidget({entries,displayPeriod,goals,setGoals}){
const[showAdd,setShowAdd]=useState(false);
const[editingId,setEditingId]=useState(null);
const[editDraft,setEditDraft]=useState(null);
const[draft,setDraft]=useState({name:"",target:1000,saved:0,color:C.purple,emoji:"🎯",linkedEntryId:""});
const pDays=PERIODS.find(p=>p.key===displayPeriod).days;
const pWord=PWORD[displayPeriod];
const fundEntries=useMemo(()=>entries.filter(e=>e.type==="expense"&&e.recur!=="One-off"&&(e.category==="Savings Goal"||e.category==="Investments"||e.category==="House Maintenance")),[entries]);
const savingsContrib=useMemo(()=>fundEntries.filter(e=>e.category==="Savings Goal").reduce((s,e)=>s+periodAmt(e,pDays),0),[fundEntries,pDays]);
const investContrib=useMemo(()=>fundEntries.filter(e=>e.category==="Investments").reduce((s,e)=>s+periodAmt(e,pDays),0),[fundEntries,pDays]);
const getContrib=g=>{if(!g.linkedEntryId)return null;const e=entries.find(x=>x.id===Number(g.linkedEntryId)||x.id===g.linkedEntryId);return e?periodAmt(e,pDays):null;};
const ttr=g=>{const c=getContrib(g);if(!c||c<=0)return null;const r=Math.max(0,g.target-g.saved);if(r<=0)return"Reached! 🎉";const p=r/c;return displayPeriod==="weekly"?`~${Math.ceil(p)} weeks`:displayPeriod==="fortnightly"?`~${Math.ceil(p)} fortnights`:displayPeriod==="monthly"?`~${Math.ceil(p)} months`:`~${p.toFixed(1)} years`;};
const GoalForm=({value,onChange,onSubmit,onCancel,submitLabel})=>(
<div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:12,padding:14,marginBottom:16}}>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
<div><label style={{fontSize:11,color:C.t3,display:"block",marginBottom:4}}>Goal name</label><input className="fi" placeholder="e.g. Holiday Fund" value={value.name} onChange={e=>onChange(d=>({...d,name:e.target.value}))} style={{padding:"8px 12px"}}/></div>
<div><label style={{fontSize:11,color:C.t3,display:"block",marginBottom:4}}>Target ($)</label><input className="fi" type="text" inputMode="decimal" value={value.target===0?"":value.target} onFocus={e=>e.target.select()} onChange={e=>onChange(d=>({...d,target:e.target.value}))} style={{padding:"8px 12px"}}/></div>
<div><label style={{fontSize:11,color:C.t3,display:"block",marginBottom:4}}>Already saved ($)</label><input className="fi" type="text" inputMode="decimal" value={value.saved===0?"":value.saved} onFocus={e=>e.target.select()} onChange={e=>onChange(d=>({...d,saved:e.target.value}))} style={{padding:"8px 12px"}}/></div>
<div><label style={{fontSize:11,color:C.t3,display:"block",marginBottom:4}}>Emoji</label><input className="fi" value={value.emoji} onChange={e=>onChange(d=>({...d,emoji:e.target.value}))} style={{padding:"6px 12px"}}/></div>
</div>
<div style={{marginBottom:12}}><label style={{fontSize:11,color:C.t3,display:"block",marginBottom:4}}>Link to entry</label><select className="fi" value={value.linkedEntryId||""} onChange={e=>onChange(d=>({...d,linkedEntryId:e.target.value}))} style={{padding:"8px 12px"}}><option value="">— not linked —</option>{fundEntries.map(e=><option key={e.id} value={e.id}>{e.label} ({e.category})</option>)}</select></div>
<div style={{display:"flex",gap:8}}><GradBtn onClick={onSubmit} style={{flex:1,width:"auto"}}>{submitLabel}</GradBtn><Btn onClick={onCancel} style={{padding:"9px 16px"}}>Cancel</Btn></div>
</div>
);
return(
<div className="card">
<Row mb={4}><div style={{fontSize:14,fontWeight:700,color:C.t1}}>Savings Goals</div><button onClick={()=>setShowAdd(s=>!s)} className={`rb ${showAdd?"on":""}`}>+ New Goal</button></Row>
<div style={{fontSize:12,color:C.t4,marginBottom:16}}>Contributing <span style={{color:C.green,fontWeight:700}}>{fmt(savingsContrib)}</span> to savings & <span style={{color:C.cyan,fontWeight:700}}>{fmt(investContrib)}</span> to investments per {pWord}</div>
{showAdd&&<GoalForm value={draft} onChange={setDraft} onSubmit={()=>{if(!draft.name)return;setGoals(g=>[...g,{...draft,id:Date.now(),target:Number(draft.target)||0,saved:Number(draft.saved)||0}]);setShowAdd(false);setDraft({name:"",target:1000,saved:0,color:C.purple,emoji:"🎯",linkedEntryId:""});}} onCancel={()=>setShowAdd(false)} submitLabel="Add Goal"/>}
<div style={{display:"flex",flexDirection:"column",gap:14}}>
{goals.map(g=>{
const pct=Math.min(100,(g.saved/g.target)*100);
const remaining=Math.max(0,g.target-g.saved);
const contrib=getContrib(g);
const t=ttr(g);
const linked=g.linkedEntryId?entries.find(e=>e.id===Number(g.linkedEntryId)||e.id===g.linkedEntryId):null;
if(editingId===g.id)return <GoalForm key={g.id} value={editDraft} onChange={setEditDraft} onSubmit={()=>{setGoals(gs=>gs.map(x=>x.id===g.id?{...editDraft,id:g.id,target:Number(editDraft.target)||0,saved:Number(editDraft.saved)||0}:x));setEditingId(null);}} onCancel={()=>setEditingId(null)} submitLabel="Save Changes"/>;
return(
<div key={g.id} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px"}}>
<Row mb={10}>
<div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:20}}>{g.emoji}</span><div><div style={{fontSize:13,fontWeight:700,color:C.t1}}>{g.name}</div>{t&&<div style={{fontSize:11,color:C.t4,marginTop:1}}>{t}</div>}{!linked&&<div style={{fontSize:10,color:C.t5,marginTop:1}}>No entry linked</div>}</div></div>
<div style={{textAlign:"right"}}><Mono color={g.color||C.green} size={13}>{fmtS(g.saved)}</Mono><div style={{fontSize:10,color:C.t4}}>of {fmtS(g.target)}</div></div>
</Row>
<div style={{height:8,background:C.border,borderRadius:4,overflow:"hidden",marginBottom:8}}><div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${g.color||C.green},${g.color||C.green}88)`,borderRadius:4,transition:"width .6s ease"}}/></div>
{linked&&<div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8,padding:"6px 10px",background:"rgba(110,231,183,.05)",borderRadius:8,border:`1px solid rgba(110,231,183,.1)`}}><span style={{fontSize:10,color:C.t4}}>Contributing</span><Mono color={C.green} size={11}>{fmt(contrib)}</Mono><span style={{fontSize:10,color:C.t4}}>per {pWord} via</span><span style={{fontSize:10,color:C.t2,fontWeight:600}}>{linked.label}</span></div>}
<div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.t4,alignItems:"center"}}>
<span>{pct.toFixed(0)}% · {fmtS(remaining)} to go</span>
<div style={{display:"flex",gap:6}}>
<button onClick={()=>{const amt=Number(prompt(`Add to "${g.name}" ($):`));if(amt>0)setGoals(gs=>gs.map(x=>x.id===g.id?{...x,saved:x.saved+amt}:x));}} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:5,padding:"2px 7px",color:C.t3,fontSize:10,cursor:"pointer"}}>+ Add</button>
<button onClick={()=>{setEditDraft({...g});setEditingId(g.id);setShowAdd(false);}} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:5,padding:"2px 7px",color:C.t3,fontSize:10,cursor:"pointer"}}>✎ Edit</button>
<button onClick={()=>setGoals(gs=>gs.filter(x=>x.id!==g.id))} style={{background:"none",border:"none",color:C.t5,cursor:"pointer",fontSize:13}}>×</button>
</div>
</div>
</div>
);
})}
</div>
</div>
);
}

// ── ENTRY ROW ─────────────────────────────────────────────────
function EntryRow({entry,onDelete,onEdit,displayPeriod,swipeable}){
const[editing,setEditing]=useState(false);
const[draft,setDraft]=useState(entry);
const[swipeX,setSwipeX]=useState(0);
const[swiping,setSwiping]=useState(false);
const[showLog,setShowLog]=useState(false);
const[logAmt,setLogAmt]=useState("");
const[logMonth,setLogMonth]=useState(todayStr.slice(0,7));
const txStart=useRef(null),tyStart=useRef(null);
const REVEAL=72;
const isOneOff=entry.recur==="One-off";
const isVar=entry.recur==="Variable";
const pDays=PERIODS.find(p=>p.key===displayPeriod).days;
const displayed=isOneOff?entry.amount:periodAmt(entry,pDays);
const thisMonthActual=isVar&&entry.actuals?entry.actuals.find(a=>a.date===todayStr.slice(0,7)):null;
const save=()=>{onEdit({...draft,amount:Number(draft.amount)||0});setEditing(false);};
const logBill=()=>{const amt=Number(logAmt);if(!amt)return;const actuals=[...(entry.actuals||[]).filter(a=>a.date!==logMonth),{date:logMonth,amount:amt}].sort((a,b)=>a.date.localeCompare(b.date));onEdit({...entry,actuals});setLogAmt("");setShowLog(false);};
const onTS=e=>{if(!swipeable)return;txStart.current=e.touches[0].clientX;tyStart.current=e.touches[0].clientY;setSwiping(false);};
const onTM=e=>{if(!swipeable||txStart.current===null)return;const dx=e.touches[0].clientX-txStart.current,dy=e.touches[0].clientY-tyStart.current;if(!swiping&&Math.abs(dy)>Math.abs(dx))return;setSwiping(true);setSwipeX(Math.max(-REVEAL,Math.min(0,dx+(swipeX===-REVEAL?-REVEAL:0))));};
const onTE=()=>{if(!swipeable)return;if(swipeX<-REVEAL/2)setSwipeX(-REVEAL);else setSwipeX(0);setSwiping(false);txStart.current=null;};
const onClick=()=>{if(swipeX!==0){setSwipeX(0);return;}setEditing(true);};
if(editing)return(
<div style={{background:C.card,border:`1px solid ${C.green}`,borderRadius:12,padding:14,marginBottom:8}}>
<div style={{fontSize:12,fontWeight:700,color:C.green,marginBottom:12}}>Edit Entry</div>
<div className="tt" style={{marginBottom:10}}>
<button className={`tb ${draft.type==="income"?"inc":"off"}`} onClick={()=>setDraft(d=>({...d,type:"income",category:INCOME_CATS[0]}))}>Income</button>
<button className={`tb ${draft.type==="expense"?"exp":"off"}`} onClick={()=>setDraft(d=>({...d,type:"expense",category:EXPENSE_CATS[0]}))}>Expense</button>
</div>
<label style={{fontSize:11,color:C.t3,display:"block",marginBottom:4}}>Description</label>
<input className="fi" value={draft.label} onChange={e=>setDraft(d=>({...d,label:e.target.value}))} style={{marginBottom:8}}/>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
<div><label style={{fontSize:11,color:C.t3,display:"block",marginBottom:4}}>Category</label><select className="fi" value={draft.category} onChange={e=>setDraft(d=>({...d,category:e.target.value}))}>{(draft.type==="income"?INCOME_CATS:EXPENSE_CATS).map(c=><option key={c}>{c}</option>)}</select></div>
<div><label style={{fontSize:11,color:C.t3,display:"block",marginBottom:4}}>{draft.recur==="Variable"?"Estimate ($)":"Amount ($)"}</label><input className="fi" type="text" inputMode="decimal" value={draft.amount} onFocus={e=>e.target.select()} onChange={e=>setDraft(d=>({...d,amount:e.target.value}))}/></div>
</div>
<div style={{marginBottom:8}}><label style={{fontSize:11,color:C.t3,display:"block",marginBottom:4}}>Frequency</label><div className="hscroll">{RECUR_OPT.map(r=><button key={r} className={`rb ${draft.recur===r?(r==="One-off"||r==="Variable"?"oo":"on"):""}`} onClick={()=>setDraft(d=>({...d,recur:r}))}>{r}</button>)}</div>{draft.recur==="Variable"&&<div style={{fontSize:10,color:C.amber,marginTop:5}}>Monthly estimate — log actual bills via the Entries tab.</div>}</div>
<div><label style={{fontSize:11,color:C.t3,display:"block",marginBottom:4}}>{draft.recur==="One-off"?"Date":"Start Date"}</label><input className="fi" type="date" value={draft.startDate} onChange={e=>setDraft(d=>({...d,startDate:e.target.value}))}/></div>
<div style={{display:"flex",gap:8,marginTop:10}}>
<GradBtn onClick={save} style={{flex:1,width:"auto",padding:"9px"}}>Save</GradBtn>
<Btn onClick={()=>{setDraft(entry);setEditing(false);}} style={{flex:1,padding:"9px"}}>Cancel</Btn>
<Btn onClick={()=>{onDelete(entry.id);setEditing(false);}} bg="rgba(251,113,133,.12)" border={C.red} color={C.red} style={{padding:"9px 12px"}}>Delete</Btn>
</div>
</div>
);
if(isVar&&showLog)return(
<div style={{background:C.card,border:`1px solid ${C.amber}`,borderRadius:12,padding:14,marginBottom:8}}>
<Row mb={12}><div style={{fontSize:12,fontWeight:700,color:C.amber}}>Log Bill — {entry.label}</div><button onClick={()=>setShowLog(false)} style={{background:"none",border:"none",color:C.t4,fontSize:18,cursor:"pointer"}}>×</button></Row>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
<div><label style={{fontSize:11,color:C.t3,display:"block",marginBottom:4}}>Month (YYYY-MM)</label><input className="fi" type="text" placeholder="e.g. 2025-07" value={logMonth} onChange={e=>setLogMonth(e.target.value)} style={{padding:"8px 12px"}}/></div>
<div><label style={{fontSize:11,color:C.t3,display:"block",marginBottom:4}}>Amount ($)</label><input className="fi" type="text" inputMode="decimal" placeholder={String(entry.amount)} value={logAmt} onFocus={e=>e.target.select()} onChange={e=>setLogAmt(e.target.value)} style={{padding:"8px 12px"}}/></div>
</div>
<button onClick={logBill} style={{width:"100%",background:`linear-gradient(135deg,${C.amber},#f59e0b)`,border:"none",borderRadius:8,padding:"9px",color:C.bg,fontWeight:700,fontSize:12,cursor:"pointer",marginBottom:12}}>Log Bill</button>
{entry.actuals&&entry.actuals.length>0&&(
<div style={{borderTop:`1px solid ${C.border}`,paddingTop:10}}>
<div style={{fontSize:10,color:C.t4,marginBottom:6,textTransform:"uppercase",letterSpacing:".06em"}}>Bill History</div>
{[...entry.actuals].sort((a,b)=>b.date.localeCompare(a.date)).map(a=>(
<div key={a.date} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:`1px solid ${C.bg}`}}>
<span style={{fontSize:11,color:C.t3}}>{a.date}</span>
<div style={{display:"flex",alignItems:"center",gap:10}}>
<Mono color={C.t1} size={12}>{fmt(a.amount)}</Mono>
<span style={{fontSize:10,color:a.amount>entry.amount?C.red:C.green}}>{a.amount>entry.amount?`+${fmt(a.amount-entry.amount)} est`:a.amount<entry.amount?`-${fmt(entry.amount-a.amount)} est`:""}</span>
<button onClick={()=>onEdit({...entry,actuals:entry.actuals.filter(x=>x.date!==a.date)})} style={{background:"none",border:"none",color:C.t5,cursor:"pointer",fontSize:13}}>×</button>
</div>
</div>
))}
</div>
)}
</div>
);
return(
<div style={{marginBottom:6}}>
<div style={{position:"relative",borderRadius:10,background:swipeX<0?C.red:"transparent"}}>
{swipeX<0&&<div style={{position:"absolute",right:0,top:0,bottom:0,width:REVEAL,display:"flex",alignItems:"center",justifyContent:"center"}}><button onClick={()=>onDelete(entry.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#fff",fontSize:22,width:"100%",height:"100%"}}>🗑</button></div>}
<div onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE} onClick={onClick}
style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:10,background:entry.type==="income"?C.incDk:C.expDk,borderLeft:`3px solid ${isVar?C.amber:entry.type==="income"?C.green:C.red}`,cursor:"pointer",transform:`translateX(${swipeX}px) translateZ(0)`,transition:swiping||swipeX===0?"none":"transform .2s ease",position:"relative",zIndex:1}}>
<div style={{width:8,height:8,borderRadius:"50%",background:CAT_COLORS[entry.category]||C.t2,flexShrink:0}}/>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:13,fontWeight:600,color:C.t1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{entry.label}</div>
<div style={{fontSize:11,color:C.t2,marginTop:2}}>{entry.category} · {isVar?"Variable":entry.recur} {isOneOff?`· ${entry.startDate}`:`from ${entry.startDate}`}{isVar&&thisMonthActual&&<span style={{color:C.amber,marginLeft:6}}>· actual logged</span>}</div>
</div>
<div style={{textAlign:"right",flexShrink:0}}>
<Mono color={entry.type==="income"?C.green:C.red} size={14}>{entry.type==="income"?"+":"−"}{fmt(displayed)}</Mono>
{!isOneOff&&!isVar&&<div style={{fontSize:10,color:C.t4}}>per {PWORD[displayPeriod]||displayPeriod}</div>}
{isVar&&<div style={{fontSize:10,color:C.amber}}>{thisMonthActual?"this month":"est."}</div>}
{isOneOff&&<div style={{fontSize:10,color:C.amber}}>one-off</div>}
</div>
<div style={{color:C.t5,fontSize:12,flexShrink:0}}>✎</div>
</div>
</div>
{isVar&&swipeable&&<button onClick={()=>setShowLog(true)} style={{width:"100%",marginTop:3,background:"rgba(251,191,36,.08)",border:`1px solid rgba(251,191,36,.2)`,borderRadius:8,padding:"5px",color:C.amber,fontSize:11,fontWeight:600,cursor:"pointer"}}>📋 Log bill{entry.actuals&&entry.actuals.length>0?` · ${entry.actuals.length} logged`:""}</button>}
</div>
);
}

// ── SEED DATA ─────────────────────────────────────────────────
const SEED=[
{id:1,type:"income",label:"Salary",category:"Salary",amount:5500,recur:"Monthly",startDate:"2025-01-01"},
{id:2,type:"expense",label:"Mortgage Payment",category:"Mortgage/Rent",amount:1800,recur:"Monthly",startDate:"2025-01-01"},
{id:3,type:"expense",label:"Rates",category:"Rates",amount:80,recur:"Monthly",startDate:"2025-01-01"},
{id:4,type:"expense",label:"Groceries",category:"Food",amount:220,recur:"Fortnightly",startDate:"2025-01-06"},
{id:5,type:"expense",label:"House Insurance",category:"Insurance",amount:1200,recur:"Yearly",startDate:"2025-03-01"},
{id:6,type:"expense",label:"Emergency Fund",category:"Savings Goal",amount:200,recur:"Monthly",startDate:"2025-01-01"},
{id:7,type:"expense",label:"Sharesies",category:"Investments",amount:300,recur:"Monthly",startDate:"2025-01-01"},
{id:8,type:"income",label:"Moving Bonus",category:"Other Income",amount:500,recur:"One-off",startDate:"2025-03-13"},
];

// ── APP ────────────────────────────────────────────────────────
export default function App(){
const[entries,setEntries]=useState(SEED);
const[displayPeriod,setDisplayPeriod]=useState("monthly");
const[view,setView]=useState("dashboard");
const[tab,setTab]=useState("income");
const[showPastOneOffs,setShowPastOneOffs]=useState(false);
const[form,setForm]=useState({type:"expense",label:"",category:EXPENSE_CATS[0],amount:"",recur:"Monthly",startDate:todayStr});
const[mortgageCfg,setMortgageCfg]=useState(DEFAULT_MORT);
const[mortgageRateChanges,setMortgageRateChanges]=useState([]);
const[mortgageLumpSums,setMortgageLumpSums]=useState([]);
const[assets,setAssets]=useState([{id:1,label:"Home Value",value:650000},{id:2,label:"KiwiSaver",value:42000},{id:3,label:"Savings",value:15000},{id:4,label:"Investments",value:8000}]);
const[liabilities,setLiabilities]=useState([{id:1,label:"Mortgage",value:500000,linkMortgage:true},{id:2,label:"Car Loan",value:12000}]);
const[networthSnapshots,setNetworthSnapshots]=useState([]);
const[budgetLimits,setBudgetLimits]=useState({});
const[budgetEditing,setBudgetEditing]=useState(false);
const[scenarioMode,setScenarioMode]=useState(false);
const[scenarioDelta,setScenarioDelta]=useState({income:0,expenses:0,incomeSign:1,expensesSign:1});
const[goals,setGoals]=useState([
{id:1,name:"Emergency Fund",target:15000,saved:3200,color:C.green,linkedCategory:"Savings Goal",emoji:"🛡"},
{id:2,name:"Holiday",target:5000,saved:800,color:"#67e8f9",linkedCategory:"Savings Goal",emoji:"✈️"},
{id:3,name:"New Car",target:20000,saved:0,color:C.amber,linkedCategory:"Savings Goal",emoji:"🚗"},
]);
const[showDataPanel,setShowDataPanel]=useState(false);
const[importText,setImportText]=useState("");
const[importMsg,setImportMsg]=useState("");

const exportData=()=>JSON.stringify({v:2,entries,displayPeriod,mortgage:{cfg:mortgageCfg,rateChanges:mortgageRateChanges,lumpSums:mortgageLumpSums},networth:{assets,liabilities,snapshots:networthSnapshots},goals,budgetLimits},null,2);
const importData=()=>{try{const d=JSON.parse(importText);if(d.entries)setEntries(d.entries);if(d.displayPeriod)setDisplayPeriod(d.displayPeriod);if(d.mortgage){if(d.mortgage.cfg)setMortgageCfg(d.mortgage.cfg);if(d.mortgage.rateChanges)setMortgageRateChanges(d.mortgage.rateChanges);if(d.mortgage.lumpSums)setMortgageLumpSums(d.mortgage.lumpSums);}if(d.networth){if(d.networth.assets)setAssets(d.networth.assets);if(d.networth.liabilities)setLiabilities(d.networth.liabilities);if(d.networth.snapshots)setNetworthSnapshots(d.networth.snapshots);}if(d.goals)setGoals(d.goals);if(d.budgetLimits)setBudgetLimits(d.budgetLimits);setImportMsg("✓ Data restored successfully!");setImportText("");setTimeout(()=>{setImportMsg("");setShowDataPanel(false);},2000);}catch(e){setImportMsg("✗ Invalid data — paste the full exported text.");}};

const mortSchedule=useMemo(()=>buildSchedule(mortgageCfg.principal,mortgageCfg.annualRate,mortgageCfg.termYears,mortgageCfg.startDate,mortgageRateChanges,mortgageLumpSums),[mortgageCfg,mortgageRateChanges,mortgageLumpSums]);

// Auto monthly net worth snapshot
const mortSchedForSnap=useMemo(()=>{if(!mortgageCfg.principal||!mortgageCfg.annualRate||!mortgageCfg.termYears)return null;const mo=mortgageCfg.annualRate/100/12,n=mortgageCfg.termYears*12,pmt=mortgageCfg.principal*mo*Math.pow(1+mo,n)/(Math.pow(1+mo,n)-1);let bal=mortgageCfg.principal;const sc=[];for(let i=0;i<n&&bal>0;i++){const interest=bal*mo,principal=Math.min(pmt-interest,bal);bal=Math.max(0,bal-principal);sc.push({balance:bal});}return sc;},[mortgageCfg]);
useEffect(()=>{
const thisMonth=todayStr.slice(0,7);
if(networthSnapshots.some(s=>s.date.slice(0,7)===thisMonth))return;
const liveBal=mortSchedForSnap&&mortSchedForSnap.length?mortSchedForSnap[0].balance:mortgageCfg.principal;
const totalA=assets.reduce((s,a)=>s+Number(a.value),0);
const totalL=liabilities.reduce((s,l)=>s+(l.linkMortgage?liveBal:Number(l.value)),0);
setNetworthSnapshots(prev=>[...prev,{id:Date.now(),date:todayStr,netWorth:totalA-totalL,totalAssets:totalA,totalLiabs:totalL,auto:true}].sort((a,b)=>a.date.localeCompare(b.date)));
},[assets,liabilities,networthSnapshots,mortSchedForSnap,mortgageCfg.principal]);

const pDays=PERIODS.find(p=>p.key===displayPeriod).days;
const{totalIncome,totalExpenses}=useMemo(()=>{let inc=0,exp=0;entries.forEach(e=>{if(e.recur!=="One-off"){const a=periodAmt(e,pDays);if(e.type==="income")inc+=a;else exp+=a;}});return{totalIncome:inc,totalExpenses:exp};},[entries,pDays]);
const balance=totalIncome-totalExpenses;
const trueExpenses=useMemo(()=>entries.filter(e=>e.type==="expense"&&e.recur!=="One-off"&&!SAVINGS_CATS.has(e.category)).reduce((s,e)=>s+periodAmt(e,pDays),0),[entries,pDays]);
const savingsTotal=useMemo(()=>entries.filter(e=>e.type==="expense"&&e.recur!=="One-off"&&SAVINGS_CATS.has(e.category)).reduce((s,e)=>s+periodAmt(e,pDays),0),[entries,pDays]);
const scenarioIncome=totalIncome+(scenarioDelta.income||0)*scenarioDelta.incomeSign;
const scenarioExpenses=totalExpenses+(scenarioDelta.expenses||0)*scenarioDelta.expensesSign;
const scenarioBalance=scenarioIncome-scenarioExpenses;
const scenarioPWord=PWORD[displayPeriod];
const displayIncome=scenarioMode?scenarioIncome:totalIncome;
const displayTrueExp=scenarioMode?trueExpenses+(scenarioDelta.expenses||0)*scenarioDelta.expensesSign:trueExpenses;
const ratio=displayIncome>0?(displayTrueExp/displayIncome)*100:0;
const savingsRatio=displayIncome>0?(savingsTotal/displayIncome)*100:0;
const expByCategory=useMemo(()=>{const map={};entries.filter(e=>e.type==="expense"&&e.recur!=="One-off").forEach(e=>{map[e.category]=(map[e.category]||0)+periodAmt(e,pDays);});return Object.entries(map).sort((a,b)=>b[1]-a[1]);},[entries,pDays]);
const incByCategory=useMemo(()=>{const map={};entries.filter(e=>e.type==="income"&&e.recur!=="One-off").forEach(e=>{map[e.category]=(map[e.category]||0)+periodAmt(e,pDays);});return Object.entries(map).sort((a,b)=>b[1]-a[1]);},[entries,pDays]);
const savingsRate=useMemo(()=>{if(totalIncome<=0)return 0;const sv=entries.filter(e=>e.type==="expense"&&e.recur!=="One-off"&&SAVINGS_CATS.has(e.category)).reduce((s,e)=>s+periodAmt(e,pDays),0);return Math.min(100,(sv/totalIncome)*100);},[entries,totalIncome,pDays]);
const statusColor=ratio<60?C.green:ratio<85?C.amber:C.red;
const statusLabel=ratio<60?"Healthy":ratio<85?"Moderate":"Over-stretched";
const periodLabel=PERIODS.find(p=>p.key===displayPeriod).label;
const handleDelete=id=>setEntries(prev=>prev.filter(e=>e.id!==id));
const handleEdit=updated=>setEntries(prev=>prev.map(e=>e.id===updated.id?updated:e));
const handleAdd=()=>{if(!form.label||!form.amount||isNaN(Number(form.amount)))return;setEntries(prev=>[...prev,{id:Date.now(),type:form.type,label:form.label,category:form.category,amount:Math.abs(Number(form.amount)),recur:form.recur,startDate:form.startDate,...(form.recur==="Variable"?{actuals:[]}:{})}]);setForm(f=>({...f,label:"",amount:""}));};

return(
<div style={{minHeight:"100vh",background:C.bg,fontFamily:F.sans,color:C.t1,paddingBottom:60}}>
<style>{CSS}</style>
<div style={{background:"linear-gradient(180deg,#0f172a 0%,#0a0f1e 100%)",borderBottom:`1px solid ${C.border}`,padding:"28px 24px 20px"}}>
<div style={{maxWidth:720,margin:"0 auto"}}>
<div style={{fontFamily:"‘DM Serif Display’,serif",fontSize:26,letterSpacing:"-0.5px",marginBottom:4}}>My Finance Tracker</div>
<div style={{fontSize:13,color:C.t3,marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
<span>New Zealand · NZD · Keep your new home finances in check</span>
<Btn onClick={()=>{setShowDataPanel(v=>!v);setImportText("");setImportMsg("");}} bg={showDataPanel?"rgba(110,231,183,.15)":C.border} border={showDataPanel?C.green:C.t5} color={showDataPanel?C.green:C.t2} style={{padding:"5px 12px"}}>💾 Save / Load</Btn>
</div>
{showDataPanel&&(
<div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:12,padding:16,marginBottom:16}}>
<div style={{fontSize:12,fontWeight:700,color:C.t2,marginBottom:6}}>Save your data</div>
<div style={{fontSize:11,color:C.t3,marginBottom:10}}>Copy to clipboard, then paste into Notes or email.</div>
<button onClick={()=>navigator.clipboard.writeText(exportData()).then(()=>setImportMsg("✓ Copied!")).catch(()=>{const el=document.getElementById("eta");if(el){el.style.display="block";el.select();document.execCommand("copy");el.style.display="none";setImportMsg("✓ Copied!");}else setImportMsg("✗ Copy failed.");})} style={{width:"100%",background:`linear-gradient(135deg,${C.green},#3b82f6)`,border:"none",borderRadius:8,padding:"11px 16px",color:C.bg,fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:6}}>📋 Copy Data to Clipboard</button>
<textarea id="eta" readOnly value={exportData()} style={{display:"none",width:"100%",height:1,opacity:0,position:"absolute"}}/>
<details style={{marginBottom:12}}><summary style={{fontSize:11,color:C.t4,cursor:"pointer"}}>Can’t copy? Tap to select manually</summary><textarea readOnly value={exportData()} onFocus={e=>e.target.select()} style={{marginTop:6,width:"100%",height:100,background:C.border,border:`1px solid ${C.t5}`,borderRadius:8,color:C.green,fontSize:10,fontFamily:F.mono,padding:8,resize:"none",boxSizing:"border-box"}}/></details>
<div style={{borderTop:`1px solid ${C.border}`,paddingTop:12}}><div style={{fontSize:12,fontWeight:700,color:C.t2,marginBottom:6}}>Restore from backup</div><textarea value={importText} onChange={e=>setImportText(e.target.value)} placeholder="Paste your saved data here..." style={{width:"100%",height:90,background:C.border,border:`1px solid ${C.t5}`,borderRadius:8,color:C.t1,fontSize:11,padding:10,resize:"none",boxSizing:"border-box"}}/>{importMsg&&<div style={{fontSize:12,color:importMsg.startsWith("✓")?C.green:C.red,margin:"6px 0",fontWeight:600}}>{importMsg}</div>}<button onClick={importData} disabled={!importText.trim()} style={{marginTop:8,width:"100%",background:C.card,border:`1px solid ${C.green}`,borderRadius:8,padding:"10px 16px",color:C.green,fontWeight:700,fontSize:13,cursor:"pointer",opacity:importText.trim()?1:.35}}>Restore Data</button></div>
</div>
)}
<div style={{marginBottom:16}}>
<div style={{fontSize:11,color:C.t3,textTransform:"uppercase",letterSpacing:".07em",fontWeight:700,marginBottom:8}}>View figures as</div>
<div className="hscroll">{PERIODS.map(p=><button key={p.key} className={`period-btn ${displayPeriod===p.key?"active":""}`} onClick={()=>setDisplayPeriod(p.key)}>{p.label}</button>)}</div>
</div>
</div>
</div>

```
  <div style={{maxWidth:720,margin:"0 auto",padding:"24px 24px 0"}}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:20,background:C.card,borderRadius:12,padding:4}}>
      {[{key:"income",label:"Income vs Expenses"},{key:"goals",label:"Goals & Investments"},{key:"mortgage",label:"Mortgage"},{key:"networth",label:"Net Worth"}].map(t=>(
        <button key={t.key} onClick={()=>setTab(t.key)} style={{padding:"10px 8px",borderRadius:8,border:"none",fontSize:12,fontWeight:600,cursor:"pointer",textAlign:"center",lineHeight:1.3,background:tab===t.key?C.border:"transparent",color:tab===t.key?C.t1:C.t3,boxShadow:tab===t.key?"0 1px 3px rgba(0,0,0,.4)":"none"}}>{t.label}</button>
      ))}
    </div>

    {tab==="income"&&<>
      <div className="hscroll" style={{background:C.card,borderRadius:10,padding:4,gap:2,marginBottom:20}}>
        {["dashboard","entries","add"].map(t=>(
          <button key={t} className={`tab-btn ${view===t?"active":""}`} onClick={()=>setView(t)}>{t==="dashboard"?"📊 Overview":t==="entries"?"📋 Entries":"➕ Add Entry"}</button>
        ))}
      </div>

      {view==="dashboard"&&<>
        {/* Scenario Mode */}
        <div style={{marginBottom:16}}>
          <button onClick={()=>setScenarioMode(v=>!v)} style={{width:"100%",background:scenarioMode?"rgba(167,139,250,.15)":C.card,border:`1px solid ${scenarioMode?C.purple:C.border}`,borderRadius:10,padding:"9px 16px",color:scenarioMode?C.purple:C.t3,fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span>🔮 Scenario Mode{scenarioMode?" — ON":""}</span>
            {scenarioMode&&<span style={{fontSize:11,color:C.t3}}>What if my income/expenses changed?</span>}
          </button>
          {scenarioMode&&(
            <div style={{background:"rgba(167,139,250,.18)",border:`1px solid rgba(167,139,250,.5)`,borderRadius:"0 0 10px 10px",padding:"14px 16px",marginTop:-1}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:10}}>
                {[{key:"income",label:`Income per ${scenarioPWord}`,signKey:"incomeSign"},{key:"expenses",label:`Expenses per ${scenarioPWord}`,signKey:"expensesSign"}].map(({key,label,signKey})=>{
                  const isNeg=scenarioDelta[signKey]===-1;const absVal=Math.abs(scenarioDelta[key])||"";
                  return <div key={key}><label style={{fontSize:10,color:C.purple,display:"block",marginBottom:5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{label}</label><div style={{display:"flex",gap:6,alignItems:"center"}}><button onClick={()=>setScenarioDelta(d=>({...d,[signKey]:d[signKey]*-1}))} style={{background:isNeg?"rgba(251,113,133,.2)":"rgba(110,231,183,.2)",border:`1px solid ${isNeg?C.red:C.green}`,borderRadius:6,padding:"6px 10px",color:isNeg?C.red:C.green,fontSize:13,fontWeight:700,cursor:"pointer",flexShrink:0}}>{isNeg?"−":"+"}</button><input type="text" inputMode="numeric" className="fi" placeholder="0" value={absVal} onFocus={e=>e.target.select()} onChange={e=>{const v=Number(e.target.value.replace(/[^0-9.]/g,""))||0;setScenarioDelta(d=>({...d,[key]:v}));}} style={{flex:1,minWidth:0}}/></div></div>;
                })}
              </div>
              <div style={{fontSize:11,color:C.t3}}>Scenario balance: <Mono color={scenarioBalance>=0?C.green:C.red} size={11}>{scenarioBalance>=0?"+":"−"}{fmt(Math.abs(scenarioBalance))}</Mono> <span style={{color:C.t5}}>vs actual {balance>=0?"+":"−"}{fmt(Math.abs(balance))}</span></div>
              <button onClick={()=>setScenarioDelta({income:0,expenses:0,incomeSign:1,expensesSign:1})} style={{marginTop:8,background:"none",border:`1px solid ${C.t5}`,borderRadius:6,padding:"3px 10px",color:C.t4,fontSize:11,cursor:"pointer"}}>Reset</button>
            </div>
          )}
        </div>

        {/* Summary cards */}
        <div className="hscroll" style={{marginBottom:20}}>
          {[
            {label:`${periodLabel} Income`,value:fmt(scenarioMode?scenarioIncome:totalIncome),color:C.green,scenario:scenarioMode&&!!scenarioDelta.income},
            {label:`${periodLabel} Outgoings`,value:fmt(scenarioMode?scenarioExpenses:totalExpenses),color:C.red,scenario:scenarioMode&&!!scenarioDelta.expenses},
            {label:"Net Balance",value:((scenarioMode?scenarioBalance:balance)<0?"−":"+")+fmt(Math.abs(scenarioMode?scenarioBalance:balance)),color:(scenarioMode?scenarioBalance:balance)>=0?C.green:(scenarioMode?scenarioBalance:balance)>=-200?C.amber:C.red,scenario:scenarioMode,highlight:true},
            {label:"Savings Rate",value:`${savingsRate.toFixed(1)}%`,color:savingsRate>=20?C.green:savingsRate>=10?C.amber:C.red,sub:savingsRate>=20?"On track":savingsRate>=10?"Could be higher":"Low"},
          ].map(c=>(
            <StatCard key={c.label} label={c.label} value={c.value} color={c.color} sub={c.sub}
              bg={c.scenario?"rgba(167,139,250,.2)":c.highlight?((scenarioMode?scenarioBalance:balance)>=0?"rgba(110,231,183,.08)":(scenarioMode?scenarioBalance:balance)>=-200?"rgba(251,191,36,.08)":"rgba(251,113,133,.08)"):C.card}
              border={c.scenario?"rgba(167,139,250,.7)":c.highlight?((scenarioMode?scenarioBalance:balance)>=0?"rgba(110,231,183,.2)":(scenarioMode?scenarioBalance:balance)>=-200?"rgba(251,191,36,.2)":"rgba(251,113,133,.2)"):C.border}
              labelColor={c.scenario?C.purple:C.t3}/>
          ))}
        </div>

        {/* Period comparison */}
        <div className="card">
          <div style={{fontSize:13,fontWeight:600,color:C.t2,marginBottom:14}}>Net balance across all periods <span style={{fontSize:11,color:C.t4}}>· tap to switch</span></div>
          <div className="hscroll">
            {PERIODS.map(p=>{let inc=0,exp=0;entries.filter(e=>e.recur!=="One-off").forEach(e=>{const a=periodAmt(e,p.days);if(e.type==="income")inc+=a;else exp+=a;});const bal=inc-exp;return(
              <div key={p.key} className={`cc ${displayPeriod===p.key?"active":""}`} onClick={()=>setDisplayPeriod(p.key)} style={{minWidth:110,width:"calc(25% - 9px)"}}>
                <div style={{fontSize:10,color:displayPeriod===p.key?C.green:C.t3,fontWeight:700,marginBottom:6,textTransform:"uppercase",letterSpacing:".07em"}}>{p.label}</div>
                <Mono color={bal>=0?C.green:C.red} size={13}>{bal>=0?"+":"−"}{fmt(bal)}</Mono>
              </div>
            );})}
          </div>
        </div>

        {/* Expense Ratio */}
        <div className="card" style={scenarioMode?{background:"rgba(167,139,250,.18)",border:`1px solid rgba(167,139,250,.5)`}:{}}>
          <Row mb={14}><div style={{fontSize:14,fontWeight:600}}>Expense Ratio</div><div style={{background:`${statusColor}22`,color:statusColor,padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:700}}>{statusLabel}</div></Row>
          <div style={{height:14,background:C.border,borderRadius:7,overflow:"hidden",marginBottom:10,display:"flex"}}>
            <div style={{height:"100%",width:`${Math.min(ratio,100)}%`,background:`linear-gradient(90deg,${C.green},${statusColor})`,borderRadius:savingsRatio>0?"7px 0 0 7px":"7px",transition:"width .6s ease",flexShrink:0}}/>
            {savingsRatio>0&&<div style={{height:"100%",width:`${Math.min(savingsRatio,100-ratio)}%`,background:"linear-gradient(90deg,#06b6d4,#0ea5e9)",opacity:.6,transition:"width .6s ease",flexShrink:0,borderRadius:"0 7px 7px 0"}}/>}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.t3,marginBottom:8}}>
            <span>{ratio.toFixed(1)}% expenses</span>
            {savingsRatio>0&&<span style={{color:"rgba(6,182,212,.8)"}}>+{savingsRatio.toFixed(1)}% savings</span>}
            <span>Target: &lt;75%</span>
          </div>
          <div style={{display:"flex",gap:12,fontSize:11}}>
            <div style={{display:"flex",alignItems:"center",gap:5}}><span style={{display:"inline-block",width:10,height:10,borderRadius:2,background:statusColor}}/><span style={{color:C.t3}}>Expenses ({fmt(displayTrueExp)})</span></div>
            {savingsRatio>0&&<div style={{display:"flex",alignItems:"center",gap:5}}><span style={{display:"inline-block",width:10,height:10,borderRadius:2,background:"rgba(6,182,212,.6)"}}/><span style={{color:C.t3}}>Savings ({fmt(savingsTotal)})</span></div>}
          </div>
        </div>

        {/* Spending by Category */}
        {expByCategory.length>0&&(
          <div className="card">
            <Row mb={16}><div style={{fontSize:14,fontWeight:600}}>Spending by Category <span style={{fontSize:11,color:C.t3,fontWeight:400}}>({periodLabel})</span></div><button onClick={()=>setBudgetEditing(v=>!v)} className={`rb ${budgetEditing?"on":""}`}>{budgetEditing?"Done":"Budget"}</button></Row>
            {expByCategory.map(([cat,amt])=>{
              const pct=totalExpenses>0?(amt/totalExpenses)*100:0;
              const budgetAmt=budgetLimits[`${cat}_${displayPeriod}`]||budgetLimits[cat]||null;
              const overBudget=budgetAmt&&amt>budgetAmt;
              const budgetPct=budgetAmt?Math.min((amt/budgetAmt)*100,100):null;
              const budgetLinePct=budgetAmt&&totalExpenses>0?Math.min((budgetAmt/totalExpenses)*100,100):null;
              const overPct=budgetAmt&&pct>budgetLinePct?pct-budgetLinePct:0;
              const pw=({weekly:"wk",fortnightly:"fn",monthly:"mo",yearly:"yr"})[displayPeriod];
              return(
                <div key={cat} style={{marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13,marginBottom:5}}>
                    <span style={{color:C.t2,display:"flex",alignItems:"center",gap:6}}><span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:CAT_COLORS[cat]||C.t2}}/>{cat}{overBudget&&<span style={{fontSize:10,background:"rgba(251,113,133,.15)",color:C.red,borderRadius:6,padding:"1px 6px",fontWeight:700}}>over</span>}</span>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      {budgetEditing?(
                        <div style={{display:"flex",alignItems:"center",gap:4}}>
                          <span style={{fontSize:10,color:C.t4}}>$/{pw}</span>
                          <input type="text" inputMode="decimal" value={budgetLimits[`${cat}_${displayPeriod}`]||""} onFocus={e=>e.target.select()} onChange={e=>{const v=e.target.value,k=`${cat}_${displayPeriod}`;setBudgetLimits(prev=>v?{...prev,[k]:Number(v)}:Object.fromEntries(Object.entries(prev).filter(([x])=>x!==k)));}} placeholder="no limit" style={{width:72,background:C.bg,border:`1px solid ${C.t5}`,borderRadius:6,padding:"3px 6px",color:C.t1,fontSize:12,fontFamily:F.mono,textAlign:"right"}}/>
                        </div>
                      ):(
                        <span style={{fontFamily:F.mono,color:overBudget?C.red:C.t1,fontWeight:600}}>{fmt(amt)}{budgetAmt&&<span style={{color:C.t4,fontWeight:400,fontSize:11}}> / {fmt(budgetAmt)}</span>}</span>
                      )}
                    </div>
                  </div>
                  <div style={{height:6,background:C.border,borderRadius:3,overflow:"visible",position:"relative"}}>
                    <div style={{height:"100%",width:`${budgetAmt?Math.min(pct,budgetLinePct):pct}%`,background:CAT_COLORS[cat]||C.t2,borderRadius:3,transition:"width .5s ease",position:"absolute",top:0,left:0}}/>
                    {overPct>0&&<div style={{height:"100%",width:`${overPct}%`,background:C.red,borderRadius:"0 3px 3px 0",position:"absolute",top:0,left:`${budgetLinePct}%`}}/>}
                    {budgetLinePct&&<div style={{position:"absolute",top:-3,left:`${budgetLinePct}%`,width:2,height:12,background:C.red,borderRadius:1,transform:"translateX(-50%)",boxShadow:`0 0 4px ${C.red}`,zIndex:2}}/>}
                  </div>
                  {budgetAmt&&!budgetEditing&&<div style={{fontSize:10,color:overBudget?C.red:C.t4,marginTop:3,textAlign:"right"}}>{overBudget?`${fmt(amt-budgetAmt)} over budget`:`${fmt(budgetAmt-amt)} remaining`}</div>}
                </div>
              );
            })}
          </div>
        )}

        {/* Income by Source */}
        {incByCategory.length>0&&(
          <div className="card">
            <div style={{fontSize:14,fontWeight:600,marginBottom:16}}>Income by Source <span style={{fontSize:11,color:C.t3,fontWeight:400}}>({periodLabel})</span></div>
            {incByCategory.map(([cat,amt])=>{
              const pct=totalIncome>0?(amt/totalIncome)*100:0;
              return(
                <div key={cat} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:5}}>
                    <span style={{color:C.t2,display:"flex",alignItems:"center",gap:6}}><span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:CAT_COLORS[cat]||C.green}}/>{cat}</span>
                    <Mono color={C.t1} size={13}>{fmt(amt)}</Mono>
                  </div>
                  <div style={{height:6,background:C.border,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:CAT_COLORS[cat]||C.green,borderRadius:3,transition:"width .5s ease"}}/></div>
                  <div style={{fontSize:10,color:C.t4,marginTop:3,textAlign:"right"}}>{pct.toFixed(1)}% of income</div>
                </div>
              );
            })}
          </div>
        )}
        <div style={{fontSize:11,color:C.t4,textTransform:"uppercase",letterSpacing:".08em",fontWeight:700,marginBottom:12,marginTop:4}}>{displayPeriod==="yearly"?"Monthly Charts":"Daily Charts"}</div>
        <Histogram entries={entries} displayPeriod={displayPeriod}/>
        <CalendarWidget entries={entries} displayPeriod={displayPeriod}/>
      </>}

      {view==="entries"&&<>
        <div style={{textAlign:"center",marginBottom:16}}><span style={{background:C.border,color:C.t2,fontSize:12,padding:"4px 14px",borderRadius:20}}>Recurring amounts shown as <strong style={{color:C.t1}}>{periodLabel}</strong> · NZD</span></div>
        {entries.length===0?<div style={{textAlign:"center",color:C.t4,padding:"60px 0",fontSize:14}}>No entries yet</div>:(()=>{
          const pastOneOffs=entries.filter(e=>e.recur==="One-off"&&e.startDate<todayStr);
          const active=entries.filter(e=>!(e.recur==="One-off"&&e.startDate<todayStr));
          return <>
            {active.filter(e=>e.type==="income").length>0&&<div style={{marginBottom:20}}><div style={{fontSize:11,color:C.green,letterSpacing:".08em",textTransform:"uppercase",fontWeight:700,marginBottom:10}}>Income</div>{active.filter(e=>e.type==="income").map(e=><EntryRow key={`${e.id}-${displayPeriod}`} entry={e} onDelete={handleDelete} onEdit={handleEdit} displayPeriod={displayPeriod} swipeable={true}/>)}</div>}
            {active.filter(e=>e.type==="expense").length>0&&<div style={{marginBottom:20}}><div style={{fontSize:11,color:C.red,letterSpacing:".08em",textTransform:"uppercase",fontWeight:700,marginBottom:10}}>Expenses, Savings &amp; Investments</div>{active.filter(e=>e.type==="expense").map(e=><EntryRow key={`${e.id}-${displayPeriod}`} entry={e} onDelete={handleDelete} onEdit={handleEdit} displayPeriod={displayPeriod} swipeable={true}/>)}</div>}
            {pastOneOffs.length>0&&<div style={{marginTop:8}}><div onClick={()=>setShowPastOneOffs(v=>!v)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",padding:"8px 12px",background:C.card,borderRadius:10,marginBottom:showPastOneOffs?10:0}}><div style={{fontSize:11,color:C.t4,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em"}}>Past one-offs <span style={{background:C.border,color:C.t3,borderRadius:10,padding:"1px 8px",marginLeft:6,fontSize:10}}>{pastOneOffs.length}</span></div><span style={{color:C.t4,fontSize:13,display:"inline-block",transform:showPastOneOffs?"rotate(180deg)":"rotate(0deg)",transition:"transform .2s"}}>▾</span></div>{showPastOneOffs&&pastOneOffs.map(e=><EntryRow key={`${e.id}-${displayPeriod}`} entry={e} onDelete={handleDelete} onEdit={handleEdit} displayPeriod={displayPeriod} swipeable={true}/>)}</div>}
          </>;
        })()}
      </>}

      {view==="add"&&(
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:20,padding:24}}>
          <div style={{fontSize:16,fontWeight:700,marginBottom:20}}>Add Entry</div>
          <div className="tt" style={{marginBottom:16}}>
            <button className={`tb ${form.type==="income"?"inc":"off"}`} onClick={()=>setForm(f=>({...f,type:"income",category:INCOME_CATS[0]}))}>Income</button>
            <button className={`tb ${form.type==="expense"?"exp":"off"}`} onClick={()=>setForm(f=>({...f,type:"expense",category:EXPENSE_CATS[0]}))}>Expense / Savings / Investment</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <div><label style={{fontSize:12,color:C.t3,display:"block",marginBottom:6}}>Description</label><input className="fi" placeholder="e.g. Netflix" value={form.label} onChange={e=>setForm(f=>({...f,label:e.target.value}))}/></div>
            <div><label style={{fontSize:12,color:C.t3,display:"block",marginBottom:6}}>Category</label><select className="fi" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>{(form.type==="income"?INCOME_CATS:EXPENSE_CATS).map(c=><option key={c}>{c}</option>)}</select></div>
            <div><label style={{fontSize:12,color:C.t3,display:"block",marginBottom:6}}>{form.recur==="Variable"?"Estimate ($)":"Amount ($)"}</label><input className="fi" type="text" inputMode="decimal" placeholder="0.00" value={form.amount} onFocus={e=>e.target.select()} onChange={e=>setForm(f=>({...f,amount:e.target.value}))}/></div>
          </div>
          <div style={{marginBottom:12}}><label style={{fontSize:12,color:C.t3,display:"block",marginBottom:8}}>Frequency</label><div className="hscroll">{RECUR_OPT.map(r=>{const isActive=form.recur===r;return <button key={r} className={`rb ${isActive?(r==="One-off"||r==="Variable"?"oo":"on"):""}`} onClick={()=>setForm(f=>({...f,recur:r}))}>{r}</button>;})}</div>{form.recur==="Variable"&&<div style={{fontSize:11,color:C.amber,marginTop:5}}>Amount is a monthly estimate. Log actual bills from Entries tab.</div>}</div>
          <div style={{marginBottom:20}}><label style={{fontSize:12,color:C.t3,display:"block",marginBottom:6}}>{form.recur==="One-off"?"Date":"Start Date"}</label><input className="fi" type="date" value={form.startDate} onChange={e=>setForm(f=>({...f,startDate:e.target.value}))}/>{form.recur!=="One-off"&&<div style={{fontSize:11,color:C.t4,marginTop:5}}>Repeats {form.recur.toLowerCase()} from this date.</div>}{form.recur==="One-off"&&<div style={{fontSize:11,color:C.amber,marginTop:5}}>Appears in calendar on this date only.</div>}</div>
          <button className="add-btn" style={{width:"100%"}} onClick={handleAdd}>Add Entry</button>
        </div>
      )}
    </>}

    {tab==="goals"&&<GoalsWidget entries={entries} displayPeriod={displayPeriod} goals={goals} setGoals={setGoals}/>}
    {tab==="mortgage"&&<MortgageWidget cfg={mortgageCfg} setCfg={setMortgageCfg} rateChanges={mortgageRateChanges} setRateChanges={setMortgageRateChanges} lumpSums={mortgageLumpSums} setLumpSums={setMortgageLumpSums} displayPeriod={displayPeriod}/>}
    {tab==="networth"&&<NetWorthWidget mortgageSchedule={mortSchedule} mortgagePrincipal={mortgageCfg.principal} assets={assets} setAssets={setAssets} liabilities={liabilities} setLiabilities={setLiabilities} snapshots={networthSnapshots} setSnapshots={setNetworthSnapshots}/>}
  </div>
</div>

);
}

