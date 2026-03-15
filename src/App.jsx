import{useState,useMemo,useRef,useEffect}from"react";

const C={bg:"#0a0f1e",card:"#0f172a",border:"#1e293b",green:"#6ee7b7",red:"#fb7185",amber:"#fbbf24",purple:"#a78bfa",cyan:"#06b6d4",t1:"#f1f5f9",t2:"#94a3b8",t3:"#64748b",t4:"#475569",t5:"#334155",inc:"rgba(110,231,183,.08)",exp:"rgba(251,113,133,.08)",incDk:"#0d2420",expDk:"#1f0d12"};
const F={mono:"'JetBrains Mono',monospace",sans:"'DM Sans',sans-serif"};
const INCOME_CATS=["Salary","Freelance","Rental Income","Investment Returns","Benefits","Other Income"];
const EXPENSE_CATS=["Mortgage","Utilities","Food","Transport","Insurance","Rates","Subscriptions","Health","Entertainment","Clothing","House Maintenance","Savings Goal","Investments","Other"];
const SAVINGS_CATS=new Set(["Savings Goal","Investments"]);
const CAT_COLORS={"Mortgage":"#fb7185","Utilities":"#fbbf24","Food":"#6ee7b7","Transport":"#67e8f9","Insurance":"#a78bfa","Rates":"#f472b6","Subscriptions":"#818cf8","Health":"#34d399","Entertainment":"#e879f9","Clothing":"#38bdf8","House Maintenance":"#fb923c","Savings Goal":"#4ade80","Investments":"#06b6d4","Other":"#94a3b8","Salary":"#6ee7b7","Freelance":"#67e8f9","Rental Income":"#a78bfa","Investment Returns":"#06b6d4","Benefits":"#fbbf24","Other Income":"#f472b6"};
const PERIODS=[{key:"weekly",label:"Weekly",days:7},{key:"fortnightly",label:"Fortnightly",days:14},{key:"monthly",label:"Monthly",days:30.44},{key:"yearly",label:"Yearly",days:365}];
const RECUR_OPT=["One-off","Weekly","Fortnightly","Monthly","Yearly","Variable"];
const DAYS_SHORT=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MON_SHORT=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const RECURDAYS={Weekly:7,Fortnightly:14,Monthly:30.44,Yearly:365};
const PWORD={weekly:"week",fortnightly:"fortnight",monthly:"month",yearly:"year"};

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

const CSS=`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&family=JetBrains+Mono:wght@400;600;700&display=swap'); *{box-sizing:border-box;margin:0;padding:0;} input,select,textarea{outline:none;} .fi,.fi-16{font-size:16px;} input[type="date"]{-webkit-appearance:none;appearance:none;max-width:100%;min-width:0;} input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(.5);} input[type="range"]{accent-color:#6ee7b7;} .hscroll{display:flex;overflow-x:auto;-webkit-overflow-scrolling:touch;gap:12px;padding-bottom:8px;scrollbar-width:none;} .hscroll::-webkit-scrollbar{display:none;} .hscroll>*{flex-shrink:0;} .card{background:#0f172a;border:1px solid #1e293b;border-radius:16px;padding:20px;margin-bottom:20px;} .fi{background:#1e293b;border:1px solid #334155;border-radius:10px;padding:11px 14px;color:#f1f5f9;font-family:'DM Sans',sans-serif;font-size:16px;width:100%;box-sizing:border-box;} .fi:focus{border-color:#6ee7b7;} .tab-btn{background:none;border:none;cursor:pointer;padding:8px 14px;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;transition:all .2s;white-space:nowrap;color:#64748b;} .tab-btn.active{background:#1e293b;color:#f1f5f9;} .period-btn{border:1px solid #1e293b;cursor:pointer;padding:8px 14px;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;color:#64748b;background:none;white-space:nowrap;} .period-btn.active{background:rgba(110,231,183,.1);border-color:#6ee7b7;color:#6ee7b7;} .add-btn{background:linear-gradient(135deg,#6ee7b7,#3b82f6);border:none;border-radius:10px;padding:13px 28px;color:#0a0f1e;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:700;cursor:pointer;} .tt{display:flex;background:#1e293b;border-radius:10px;padding:4px;gap:4px;} .tb{flex:1;border:none;border-radius:7px;padding:9px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;} .tb.inc{background:rgba(110,231,183,.2);color:#6ee7b7;} .tb.exp{background:rgba(251,113,133,.2);color:#fb7185;} .tb.off{background:transparent;color:#475569;} .rb{border:1px solid #1e293b;cursor:pointer;padding:7px 10px;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:600;color:#64748b;background:none;white-space:nowrap;} .rb.on{background:rgba(110,231,183,.1);border-color:#6ee7b7;color:#6ee7b7;} .rb.oo{background:rgba(251,191,36,.1);border-color:#fbbf24;color:#fbbf24;} .cc{background:#0a0f1e;border:1px solid #1e293b;border-radius:12px;padding:14px 12px;cursor:pointer;text-align:center;} .cc.active{background:rgba(110,231,183,.07);border-color:#6ee7b7;}`;

const Mono=({children,color,size=14})=><span style={{fontFamily:F.sans,fontSize:size,fontWeight:700,color,letterSpacing:"-0.02em"}}>{children}</span>;
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
datesInRange(from,to).forEach(d=>{filteredEntries.filter(e=>occursOn(e,d)).forEach(e=>{total+=e.amount;});});
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
<div style={{fontFamily:F.sans,fontSize:18,fontWeight:700,color:C.red,letterSpacing:"-0.02em"}}>{fmt(bars.reduce((s,b)=>s+b.val,0))}</div>
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
{inc>0&&<div style={{fontSize:11,fontFamily:F.sans,fontWeight:700,letterSpacing:"-0.02em",color:C.green}}>+{fmtS(inc)}</div>}
{exp>0&&<div style={{fontSize:11,fontFamily:F.sans,fontWeight:700,letterSpacing:"-0.02em",color:C.red}}>−{fmtS(exp)}</div>}
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
{inc>0&&<div style={{fontSize:9,fontFamily:F.sans,fontWeight:700,letterSpacing:"-0.02em",color:C.green,textAlign:"center"}}>+{fmtS(inc)}</div>}
{exp>0&&<div style={{fontSize:9,fontFamily:F.sans,fontWeight:700,letterSpacing:"-0.02em",color:C.red,textAlign:"center"}}>−{fmtS(exp)}</div>}
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

// ── useLocalStorage ──────────────────────────────────────────────────────────
function useLocalStorage(key,def){
  const[val,setVal]=useState(()=>{try{const v=localStorage.getItem(key);return v!=null?JSON.parse(v):def;}catch{return def;}});
  useEffect(()=>{try{localStorage.setItem(key,JSON.stringify(val));}catch{}},[key,val]);
  return[val,setVal];
}

// ── Entry Form ────────────────────────────────────────────────────────────────
function EntryForm({onAdd,onClose,editEntry}){
  const isEdit=!!editEntry;
  const[type,setType]=useState(editEntry?.type||"expense");
  const[label,setLabel]=useState(editEntry?.label||"");
  const[amount,setAmount]=useState(editEntry?String(editEntry.amount):"");
  const[category,setCategory]=useState(editEntry?.category||(editEntry?.type==="income"?"Salary":"Food"));
  const[recur,setRecur]=useState(editEntry?.recur||"Monthly");
  const[startDate,setStartDate]=useState(editEntry?.startDate||todayStr);
  const cats=type==="income"?INCOME_CATS:EXPENSE_CATS;
  useEffect(()=>{if(!cats.includes(category))setCategory(cats[0]);},[type]);
  const submit=()=>{
    const amt=parseFloat(amount);
    if(!label.trim()||isNaN(amt)||amt<=0)return;
    onAdd({id:editEntry?.id||Date.now(),type,label:label.trim(),amount:amt,category,recur,startDate,actuals:editEntry?.actuals||[]});
    onClose();
  };
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:100,display:"flex",alignItems:"flex-end"}}>
      <div style={{background:C.card,borderRadius:"20px 20px 0 0",padding:24,width:"100%",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontSize:16,fontWeight:700,color:C.t1}}>{isEdit?"Edit Entry":"Add Entry"}</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.t4,fontSize:24,cursor:"pointer",lineHeight:1}}>x</button>
        </div>
        <div className="tt" style={{marginBottom:16}}>
          {["income","expense"].map(t=>(
            <button key={t} onClick={()=>setType(t)} className={`tb ${type===t?(t==="income"?"inc":"exp"):"off"}`}>
              {t==="income"?"Income":"Expense"}
            </button>
          ))}
        </div>
        <div style={{marginBottom:12}}>
          <Label mb={6}>Label</Label>
          <input className="fi" value={label} onChange={e=>setLabel(e.target.value)} placeholder="e.g. Salary, Groceries..." />
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          <div>
            <Label mb={6}>Amount ($)</Label>
            <input className="fi" type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" min="0" step="0.01"/>
          </div>
          <div>
            <Label mb={6}>Frequency</Label>
            <select className="fi" value={recur} onChange={e=>setRecur(e.target.value)}>
              {RECUR_OPT.map(o=><option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div style={{marginBottom:12}}>
          <Label mb={6}>Category</Label>
          <select className="fi" value={category} onChange={e=>setCategory(e.target.value)}>
            {cats.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{marginBottom:20}}>
          <Label mb={6}>Start Date</Label>
          <input className="fi" type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/>
        </div>
        <GradBtn onClick={submit}>{isEdit?"Save Changes":"Add Entry"}</GradBtn>
      </div>
    </div>
  );
}

// ── Budget Panel ───────────────────────────────────────────────────────────────
function BudgetPanel({entries,budgetLimits,setBudgetLimits,displayPeriod}){
  const pDays=PERIODS.find(p=>p.key===displayPeriod).days;
  const[editing,setEditing]=useState(null);
  const[editVal,setEditVal]=useState("");
  const spend=useMemo(()=>{
    const s={};
    EXPENSE_CATS.forEach(c=>{
      let total=0;
      entries.filter(e=>e.type==="expense"&&e.category===c).forEach(e=>{total+=periodAmt(e,pDays);});
      s[c]=total;
    });
    return s;
  },[entries,pDays]);
  const saveBudget=()=>{
    const v=parseFloat(editVal);
    if(!isNaN(v)&&v>0)setBudgetLimits(b=>({...b,[editing]:v}));
    else setBudgetLimits(b=>{const nb={...b};delete nb[editing];return nb;});
    setEditing(null);setEditVal("");
  };
  const activeCats=EXPENSE_CATS.filter(c=>spend[c]>0||(budgetLimits[c]||0)>0);
  return(
    <div>
      <style>{`.budget-row:hover{background:rgba(255,255,255,.03)!important;}`}</style>
      <div style={{fontSize:12,color:C.t3,marginBottom:14}}>Tap a category to set a budget limit for <b style={{color:C.t2}}>{PERIODS.find(p=>p.key===displayPeriod).label}</b>.</div>
      {activeCats.length===0&&<div style={{textAlign:"center",padding:"32px 0",color:C.t5,fontSize:13}}>No expenses recorded yet.</div>}
      {activeCats.map(c=>{
        const spent=spend[c]||0;
        const limit=budgetLimits[c]||0;
        const pct=limit?Math.min(100,(spent/limit)*100):0;
        const over=limit&&spent>limit;
        return(
          <div key={c} className="budget-row" onClick={()=>{setEditing(c);setEditVal(limit?String(limit):"");}}
            style={{background:C.card,border:`1px solid ${over?C.red:C.border}`,borderRadius:12,padding:"12px 14px",marginBottom:10,cursor:"pointer",transition:"background .15s"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:limit?6:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{width:10,height:10,borderRadius:3,background:CAT_COLORS[c]||C.t2,display:"inline-block"}}/>
                <span style={{fontSize:13,fontWeight:600,color:C.t1}}>{c}</span>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{fontFamily:F.mono,fontSize:12,color:over?C.red:C.green}}>{fmt(spent)}</span>
                {limit>0&&<span style={{fontSize:11,color:C.t4}}>/ {fmt(limit)}</span>}
              </div>
            </div>
            {limit>0&&(
              <div style={{background:C.border,borderRadius:4,height:4,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${pct}%`,background:over?C.red:pct>80?C.amber:C.green,borderRadius:4,transition:"width .3s"}}/>
              </div>
            )}
          </div>
        );
      })}
      {editing&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:24,width:"100%",maxWidth:320}}>
            <div style={{fontSize:15,fontWeight:700,color:C.t1,marginBottom:4}}>{editing}</div>
            <div style={{fontSize:12,color:C.t3,marginBottom:16}}>Set a {PERIODS.find(p=>p.key===displayPeriod).label.toLowerCase()} budget limit</div>
            <input className="fi" type="number" value={editVal} onChange={e=>setEditVal(e.target.value)} placeholder="e.g. 500" style={{marginBottom:16}}/>
            <div style={{display:"flex",gap:10}}>
              <Btn onClick={()=>{setEditing(null);setEditVal("");}} style={{flex:1}}>Cancel</Btn>
              <GradBtn onClick={saveBudget} style={{flex:2}}>Save</GradBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Goals Panel ────────────────────────────────────────────────────────────────
function GoalsPanel({goals,setGoals,entries,displayPeriod}){
  const pDays=PERIODS.find(p=>p.key===displayPeriod).days;
  const[adding,setAdding]=useState(false);
  const[form,setForm]=useState({name:"",target:"",saved:"",color:"#6ee7b7",linkedCategory:"Savings Goal",emoji:"🎯"});
  const savingsFromEntries=useMemo(()=>{
    let total=0;
    entries.filter(e=>e.type==="expense"&&SAVINGS_CATS.has(e.category)).forEach(e=>{total+=periodAmt(e,pDays);});
    return total;
  },[entries,pDays]);
  const addGoal=()=>{
    const t=parseFloat(form.target),s=parseFloat(form.saved)||0;
    if(!form.name||isNaN(t)||t<=0)return;
    setGoals(g=>[...g,{id:Date.now(),name:form.name,target:t,saved:s,color:form.color,linkedCategory:form.linkedCategory,emoji:form.emoji}]);
    setAdding(false);setForm({name:"",target:"",saved:"",color:"#6ee7b7",linkedCategory:"Savings Goal",emoji:"🎯"});
  };
  const updateSaved=(id,v)=>setGoals(g=>g.map(x=>x.id===id?{...x,saved:parseFloat(v)||0}:x));
  const removeGoal=(id)=>setGoals(g=>g.filter(x=>x.id!==id));
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontSize:12,color:C.t3}}>Savings contributions this {PWORD[displayPeriod]}: <span style={{fontFamily:F.mono,color:C.green}}>{fmt(savingsFromEntries)}</span></div>
        <Btn onClick={()=>setAdding(true)} bg="rgba(110,231,183,.1)" border={C.green} color={C.green}>+ Goal</Btn>
      </div>
      {goals.map(g=>{
        const pct=Math.min(100,(g.saved/g.target)*100);
        const remaining=Math.max(0,g.target-g.saved);
        return(
          <div key={g.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 16px",marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:C.t1,marginBottom:2}}>{g.emoji} {g.name}</div>
                <div style={{fontSize:11,color:C.t4}}>Target: <span style={{fontFamily:F.mono,color:C.t2}}>{fmt(g.target)}</span></div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontFamily:F.mono,fontSize:16,fontWeight:700,color:g.color}}>{fmt(g.saved)}</div>
                <div style={{fontSize:10,color:C.t4}}>{remaining>0?`${fmt(remaining)} to go`:"Complete!"}</div>
              </div>
            </div>
            <div style={{background:C.border,borderRadius:4,height:6,overflow:"hidden",marginBottom:10}}>
              <div style={{height:"100%",width:`${pct}%`,background:g.color,borderRadius:4,transition:"width .3s"}}/>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <input type="number" value={g.saved} onChange={e=>updateSaved(g.id,e.target.value)}
                style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 10px",color:C.t1,fontSize:12,width:100,fontFamily:F.mono}}/>
              <span style={{fontSize:11,color:C.t4}}>saved</span>
              <div style={{marginLeft:"auto"}}>
                <Btn onClick={()=>removeGoal(g.id)} color={C.red} border="rgba(251,113,133,.3)" bg="rgba(251,113,133,.07)">Remove</Btn>
              </div>
            </div>
          </div>
        );
      })}
      {goals.length===0&&<div style={{textAlign:"center",padding:"32px 0",color:C.t5,fontSize:13}}>No goals yet. Add one to get started!</div>}
      {adding&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:24,width:"100%",maxWidth:360}}>
            <div style={{fontSize:15,fontWeight:700,color:C.t1,marginBottom:16}}>New Savings Goal</div>
            <div style={{marginBottom:10}}>
              <Label mb={4}>Goal Name</Label>
              <input className="fi" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Emergency Fund"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <div>
                <Label mb={4}>Target ($)</Label>
                <input className="fi" type="number" value={form.target} onChange={e=>setForm(f=>({...f,target:e.target.value}))} placeholder="10000"/>
              </div>
              <div>
                <Label mb={4}>Saved so far ($)</Label>
                <input className="fi" type="number" value={form.saved} onChange={e=>setForm(f=>({...f,saved:e.target.value}))} placeholder="0"/>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
              <div>
                <Label mb={4}>Emoji</Label>
                <input className="fi" value={form.emoji} onChange={e=>setForm(f=>({...f,emoji:e.target.value}))} placeholder="🎯"/>
              </div>
              <div>
                <Label mb={4}>Colour</Label>
                <input className="fi" type="color" value={form.color} onChange={e=>setForm(f=>({...f,color:e.target.value}))} style={{height:44,padding:4,cursor:"pointer"}}/>
              </div>
            </div>
            <div style={{display:"flex",gap:10}}>
              <Btn onClick={()=>setAdding(false)} style={{flex:1}}>Cancel</Btn>
              <GradBtn onClick={addGoal} style={{flex:2}}>Add Goal</GradBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Net Worth Panel ────────────────────────────────────────────────────────────
function NetWorthPanel({assets,setAssets,liabilities,setLiabilities,mortgageSchedule,networthSnapshots,setNetworthSnapshots}){
  const totalAssets=assets.reduce((s,a)=>s+a.value,0);
  const mortgageBalance=mortgageSchedule.length>0?mortgageSchedule[0].balance:0;
  const totalLiabilities=liabilities.reduce((s,l)=>s+(l.linkMortgage?mortgageBalance:l.value),0);
  const netWorth=totalAssets-totalLiabilities;
  const[editingAsset,setEditingAsset]=useState(null);
  const[editingLiab,setEditingLiab]=useState(null);
  const[addingAsset,setAddingAsset]=useState(false);
  const[addingLiab,setAddingLiab]=useState(false);
  const[newLabel,setNewLabel]=useState("");
  const[newVal,setNewVal]=useState("");
  const saveSnapshot=()=>{
    const snap={date:todayStr,netWorth,assets:totalAssets,liabilities:totalLiabilities};
    setNetworthSnapshots(s=>[...s.filter(x=>x.date!==todayStr),snap].sort((a,b)=>a.date.localeCompare(b.date)));
  };
  const updateAsset=(id,val)=>setAssets(a=>a.map(x=>x.id===id?{...x,value:parseFloat(val)||0}:x));
  const updateLiab=(id,val)=>setLiabilities(l=>l.map(x=>x.id===id?{...x,value:parseFloat(val)||0}:x));
  const W=320,H=80,PAD=16;
  const snaps=networthSnapshots.slice(-12);
  const vals=snaps.map(s=>s.netWorth);
  const minV=Math.min(...vals,0),maxV=Math.max(...vals,1);
  const xOf=(i)=>PAD+i*(W-PAD*2)/Math.max(snaps.length-1,1);
  const yOf=(v)=>H-PAD-((v-minV)/(maxV-minV||1))*(H-PAD*2);
  return(
    <div>
      <div style={{background:netWorth>=0?"rgba(110,231,183,.07)":"rgba(251,113,133,.07)",border:`1px solid ${netWorth>=0?C.green:C.red}`,borderRadius:16,padding:20,marginBottom:16,textAlign:"center"}}>
        <div style={{fontSize:11,color:C.t3,marginBottom:6,textTransform:"uppercase",letterSpacing:".05em"}}>Net Worth</div>
        <div style={{fontFamily:F.mono,fontSize:28,fontWeight:700,color:netWorth>=0?C.green:C.red}}>{netWorth<0?"-":""}{fmt(Math.abs(netWorth))}</div>
        <div style={{display:"flex",justifyContent:"center",gap:24,marginTop:10,fontSize:12}}>
          <span style={{color:C.green}}>Assets {fmt(totalAssets)}</span>
          <span style={{color:C.red}}>Liabilities {fmt(totalLiabilities)}</span>
        </div>
      </div>
      {snaps.length>1&&(
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:12,marginBottom:16}}>
          <div style={{fontSize:11,color:C.t3,marginBottom:8}}>Net Worth History</div>
          <svg width={W} height={H} style={{display:"block",overflow:"visible"}}>
            <line x1={PAD} y1={yOf(0)} x2={W-PAD} y2={yOf(0)} stroke={C.border} strokeWidth={1}/>
            <polyline points={snaps.map((s,i)=>`${xOf(i)},${yOf(s.netWorth)}`).join(" ")} fill="none" stroke={netWorth>=0?C.green:C.red} strokeWidth={2}/>
            {snaps.map((s,i)=><circle key={i} cx={xOf(i)} cy={yOf(s.netWorth)} r={3} fill={s.netWorth>=0?C.green:C.red}/>)}
          </svg>
        </div>
      )}
      <Btn onClick={saveSnapshot} style={{width:"100%",marginBottom:16,padding:"10px"}}>Save Today's Snapshot</Btn>
      <div style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <Label size={12} color={C.green} mb={0}>Assets</Label>
          <Btn onClick={()=>setAddingAsset(true)} bg="rgba(110,231,183,.1)" border={C.green} color={C.green}>+ Add</Btn>
        </div>
        {assets.map(a=>(
          <div key={a.id} style={{marginBottom:8}}>
            {editingAsset===a.id?(
              <div style={{display:"flex",flexDirection:"column",gap:6,background:"rgba(110,231,183,.05)",border:`1px solid ${C.green}`,borderRadius:10,padding:"10px 12px"}}>
                <div style={{fontSize:12,fontWeight:600,color:C.t1}}>{a.label}</div>
                <input type="number" defaultValue={a.value} onBlur={e=>{updateAsset(a.id,e.target.value);setEditingAsset(null);}} autoFocus
                  style={{background:C.bg,border:`1px solid ${C.green}`,borderRadius:8,padding:"9px 12px",color:C.green,fontSize:14,width:"100%",fontFamily:F.sans,fontWeight:700,letterSpacing:"-0.02em"}}/>
              </div>
            ):(
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{flex:1,fontSize:13,color:C.t1}}>{a.label}</div>
                <div onClick={()=>setEditingAsset(a.id)} style={{fontFamily:F.sans,fontWeight:700,letterSpacing:"-0.02em",fontSize:13,color:C.green,cursor:"pointer",background:"rgba(110,231,183,.06)",borderRadius:8,padding:"5px 10px"}}>{fmt(a.value)}</div>
                <Btn onClick={()=>setAssets(x=>x.filter(i=>i.id!==a.id))} color={C.red} border="rgba(251,113,133,.2)" bg="transparent" style={{padding:"4px 8px",fontSize:10}}>x</Btn>
              </div>
            )}
          </div>
        ))}
        {addingAsset&&(
          <div style={{display:"flex",gap:8,marginTop:8}}>
            <input className="fi" value={newLabel} onChange={e=>setNewLabel(e.target.value)} placeholder="Label" style={{flex:2}}/>
            <input className="fi" type="number" value={newVal} onChange={e=>setNewVal(e.target.value)} placeholder="Value" style={{flex:1}}/>
            <Btn onClick={()=>{
              if(newLabel&&parseFloat(newVal)>0){setAssets(a=>[...a,{id:Date.now(),label:newLabel,value:parseFloat(newVal)}]);}
              setAddingAsset(false);setNewLabel("");setNewVal("");
            }} bg="rgba(110,231,183,.1)" border={C.green} color={C.green}>Add</Btn>
          </div>
        )}
      </div>
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <Label size={12} color={C.red} mb={0}>Liabilities</Label>
          <Btn onClick={()=>setAddingLiab(true)} bg="rgba(251,113,133,.1)" border={C.red} color={C.red}>+ Add</Btn>
        </div>
        {liabilities.map(l=>{
          const displayVal=l.linkMortgage?mortgageBalance:l.value;
          return(
            <div key={l.id} style={{marginBottom:8}}>
              {!l.linkMortgage&&editingLiab===l.id?(
                <div style={{display:"flex",flexDirection:"column",gap:6,background:"rgba(251,113,133,.05)",border:`1px solid ${C.red}`,borderRadius:10,padding:"10px 12px"}}>
                  <div style={{fontSize:12,fontWeight:600,color:C.t1}}>{l.label}</div>
                  <input type="number" defaultValue={l.value} onBlur={e=>{updateLiab(l.id,e.target.value);setEditingLiab(null);}} autoFocus
                    style={{background:C.bg,border:`1px solid ${C.red}`,borderRadius:8,padding:"9px 12px",color:C.red,fontSize:14,width:"100%",fontFamily:F.sans,fontWeight:700,letterSpacing:"-0.02em"}}/>
                </div>
              ):(
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,color:C.t1}}>{l.label}</div>
                    {l.linkMortgage&&<div style={{fontSize:10,color:C.t4}}>Linked to mortgage</div>}
                  </div>
                  <div onClick={()=>!l.linkMortgage&&setEditingLiab(l.id)} style={{fontFamily:F.sans,fontWeight:700,letterSpacing:"-0.02em",fontSize:13,color:C.red,cursor:l.linkMortgage?"default":"pointer",background:"rgba(251,113,133,.06)",borderRadius:8,padding:"5px 10px"}}>{fmt(displayVal)}</div>
                  <Btn onClick={()=>setLiabilities(x=>x.filter(i=>i.id!==l.id))} color={C.red} border="rgba(251,113,133,.2)" bg="transparent" style={{padding:"4px 8px",fontSize:10}}>x</Btn>
                </div>
              )}
            </div>
          );
        })}
        {addingLiab&&(
          <div style={{display:"flex",gap:8,marginTop:8}}>
            <input className="fi" value={newLabel} onChange={e=>setNewLabel(e.target.value)} placeholder="Label" style={{flex:2}}/>
            <input className="fi" type="number" value={newVal} onChange={e=>setNewVal(e.target.value)} placeholder="Value" style={{flex:1}}/>
            <Btn onClick={()=>{
              if(newLabel&&parseFloat(newVal)>0){setLiabilities(l=>[...l,{id:Date.now(),label:newLabel,value:parseFloat(newVal)}]);}
              setAddingLiab(false);setNewLabel("");setNewVal("");
            }} bg="rgba(251,113,133,.1)" border={C.red} color={C.red}>Add</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Mortgage Balance Chart ─────────────────────────────────────────────────────
function MortgageChart({schedule}){
  const[viewStart,setViewStart]=useState(0);
  const touchX=useRef(null);
  const touchStart=useRef(0);
  const VIEW=24;
  const total=schedule.length;
  const maxOff=Math.max(0,total-VIEW);
  const visible=schedule.slice(viewStart,viewStart+VIEW);
  const maxBal=schedule[0]?.balance||1;
  const W=320,H=200,PAD=32;
  const xOf=(i,len)=>PAD+i*((W-PAD*2)/(Math.max(len-1,1)));
  const yOf=v=>H-PAD-((v/maxBal))*(H-PAD*2);
  const onTouchStart=e=>{touchX.current=e.touches[0].clientX;touchStart.current=viewStart;};
  const onTouchMove=e=>{
    if(touchX.current===null)return;
    const px=touchX.current-e.touches[0].clientX;
    const delta=Math.round(px/14);
    setViewStart(Math.max(0,Math.min(maxOff,touchStart.current+delta)));
  };
  const onTouchEnd=()=>{touchX.current=null;};
  if(!schedule.length)return null;
  const balPts=visible.map((r,i)=>`${xOf(i,visible.length)},${yOf(r.balance)}`).join(" ");
  const areaClose=`${xOf(visible.length-1,visible.length)},${H-PAD} ${xOf(0,visible.length)},${H-PAD}`;
  return(
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:12,marginBottom:16,touchAction:"pan-y"}}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:11,color:C.t3}}>
        <span>Balance over time</span>
        <span style={{color:C.t4}}>{visible[0]?.label} – {visible[visible.length-1]?.label}</span>
      </div>
      <svg width="100%" height="260" viewBox={`0 0 ${W} ${H+24}`} preserveAspectRatio="none" style={{display:"block"}}>
        <defs>
          <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.green} stopOpacity=".25"/>
            <stop offset="100%" stopColor={C.green} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {[0,.25,.5,.75,1].map(f=>(
          <line key={f} x1={PAD} y1={yOf(maxBal*f)} x2={W-PAD} y2={yOf(maxBal*f)} stroke={C.border} strokeWidth={1}/>
        ))}
        <polyline points={`${balPts} ${areaClose}`} fill="url(#balGrad)" stroke="none"/>
        <polyline points={balPts} fill="none" stroke={C.green} strokeWidth={2}/>
        {visible.map((r,i)=>{
          const ih=Math.max(1,(r.interest/(schedule[0]?.interest||1))*(H-PAD)*0.22);
          return <rect key={i} x={xOf(i,visible.length)-1} y={H-PAD-ih} width={2} height={ih} fill={C.amber} opacity={.6}/>;
        })}
        {visible.filter((_,i)=>i%Math.max(1,Math.floor(visible.length/5))===0).map((r,_i)=>{
          const i=visible.indexOf(r);
          return <text key={i} x={xOf(i,visible.length)} y={H+16} fill={C.t5} fontSize={8} textAnchor="middle">{r.label}</text>;
        })}
        {[0,.5,1].map(f=>(
          <text key={f} x={PAD-4} y={yOf(maxBal*f)} fill={C.t4} fontSize={7} textAnchor="end" dominantBaseline="middle">{fmtS(maxBal*(1-f))}</text>
        ))}
      </svg>
      {total>VIEW&&<div style={{textAlign:"center",fontSize:10,color:C.t4,marginTop:2}}>Swipe to scroll · months {viewStart+1}–{viewStart+visible.length} of {total}</div>}
    </div>
  );
}

// ── Mortgage Panel ─────────────────────────────────────────────────────────────
function MortgagePanel({mortgageCfg,setMortgageCfg,mortgageRateChanges,setMortgageRateChanges,mortgageLumpSums,setMortgageLumpSums}){
  const schedule=useMemo(()=>buildSchedule(
    mortgageCfg.principal,mortgageCfg.rate,mortgageCfg.termYears,
    mortgageCfg.startDate,mortgageRateChanges,mortgageLumpSums
  ),[mortgageCfg,mortgageRateChanges,mortgageLumpSums]);
  const totalInterest=schedule.reduce((s,r)=>s+r.interest,0);
  const[showTable,setShowTable]=useState(false);
  const[rcMonth,setRcMonth]=useState("");
  const[rcRate,setRcRate]=useState("");
  const[lsMonth,setLsMonth]=useState("");
  const[lsAmt,setLsAmt]=useState("");
  const addRateChange=()=>{
    const m=parseInt(rcMonth),r=parseFloat(rcRate);
    if(isNaN(m)||isNaN(r)||r<=0)return;
    setMortgageRateChanges(rc=>[...rc.filter(x=>x.month!==m),{month:m,rate:r}].sort((a,b)=>a.month-b.month));
    setRcMonth("");setRcRate("");
  };
  const addLumpSum=()=>{
    const m=parseInt(lsMonth),a=parseFloat(lsAmt);
    if(isNaN(m)||isNaN(a)||a<=0)return;
    setMortgageLumpSums(ls=>[...ls.filter(x=>x.month!==m),{month:m,amount:a}].sort((a,b)=>a.month-b.month));
    setLsMonth("");setLsAmt("");
  };
  const monthly=schedule[0]?.payment||0;
  const payoffDate=schedule[schedule.length-1]?.date;
  const yearsLeft=schedule.length/12;
  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        <StatCard label="Monthly Payment" value={fmt(monthly)} color={C.red}/>
        <StatCard label="Total Interest" value={fmt(totalInterest)} color={C.amber}/>
        <StatCard label="Loan Balance" value={fmt(mortgageCfg.principal)} color={C.t1}/>
        <StatCard label="Years Remaining" value={`${yearsLeft.toFixed(1)}y`} color={C.purple}/>
      </div>
      {payoffDate&&<div style={{textAlign:"center",fontSize:12,color:C.t4,marginBottom:16}}>Payoff date: <span style={{color:C.t2,fontWeight:600}}>{MON_SHORT[payoffDate.getMonth()]} {payoffDate.getFullYear()}</span></div>}
      <MortgageChart schedule={schedule}/>
      <div className="card" style={{marginBottom:16}}>
        <Label mb={10}>Mortgage Details</Label>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div>
            <Label mb={4} size={10}>Principal ($)</Label>
            <input className="fi" type="number" value={mortgageCfg.principal||""} onChange={e=>setMortgageCfg(c=>({...c,principal:parseFloat(e.target.value)||0}))}/>
          </div>
          <div>
            <Label mb={4} size={10}>Interest Rate (%)</Label>
            <input className="fi" type="number" value={mortgageCfg.rate||""} step="0.01" onChange={e=>setMortgageCfg(c=>({...c,rate:parseFloat(e.target.value)||0}))}/>
          </div>
          <div>
            <Label mb={4} size={10}>Term (Years)</Label>
            <input className="fi" type="number" value={mortgageCfg.termYears||""} onChange={e=>setMortgageCfg(c=>({...c,termYears:parseInt(e.target.value)||0}))}/>
          </div>
          <div>
            <Label mb={4} size={10}>Start Date</Label>
            <input className="fi" type="date" value={mortgageCfg.startDate||""} onChange={e=>setMortgageCfg(c=>({...c,startDate:e.target.value}))}/>
          </div>
        </div>
      </div>
      <div className="card" style={{marginBottom:16}}>
        <Label mb={10}>Rate Changes</Label>
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <input className="fi" type="number" value={rcMonth} onChange={e=>setRcMonth(e.target.value)} placeholder="Month #" style={{flex:1}}/>
          <input className="fi" type="number" value={rcRate} onChange={e=>setRcRate(e.target.value)} placeholder="Rate %" step="0.01" style={{flex:1}}/>
          <GradBtn onClick={addRateChange} style={{flex:0,padding:"11px 16px",width:"auto"}}>+</GradBtn>
        </div>
        {mortgageRateChanges.map((rc,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",background:C.bg,borderRadius:8,marginBottom:4}}>
            <span style={{fontSize:12,color:C.t2}}>Month {rc.month}</span>
            <span style={{fontFamily:F.mono,fontSize:12,color:C.amber}}>{rc.rate}%</span>
            <Btn onClick={()=>setMortgageRateChanges(r=>r.filter((_,j)=>j!==i))} color={C.red} bg="transparent" border="transparent" style={{padding:"2px 6px"}}>x</Btn>
          </div>
        ))}
      </div>
      <div className="card" style={{marginBottom:16}}>
        <Label mb={10}>Lump Sum Payments</Label>
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <input className="fi" type="number" value={lsMonth} onChange={e=>setLsMonth(e.target.value)} placeholder="Month #" style={{flex:1}}/>
          <input className="fi" type="number" value={lsAmt} onChange={e=>setLsAmt(e.target.value)} placeholder="Amount ($)" style={{flex:1}}/>
          <GradBtn onClick={addLumpSum} style={{flex:0,padding:"11px 16px",width:"auto"}}>+</GradBtn>
        </div>
        {mortgageLumpSums.map((ls,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",background:C.bg,borderRadius:8,marginBottom:4}}>
            <span style={{fontSize:12,color:C.t2}}>Month {ls.month}</span>
            <span style={{fontFamily:F.mono,fontSize:12,color:C.green}}>{fmt(ls.amount)}</span>
            <Btn onClick={()=>setMortgageLumpSums(l=>l.filter((_,j)=>j!==i))} color={C.red} bg="transparent" border="transparent" style={{padding:"2px 6px"}}>x</Btn>
          </div>
        ))}
      </div>
      <button onClick={()=>setShowTable(t=>!t)} className="tab-btn" style={{width:"100%",marginBottom:showTable?10:0,border:`1px solid ${C.border}`}}>{showTable?"Hide":"Show"} Amortisation Schedule</button>
      {showTable&&(
        <div style={{overflowX:"auto",background:C.card,border:`1px solid ${C.border}`,borderRadius:12}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead>
              <tr>{["Month","Payment","Interest","Principal","Balance"].map(h=><th key={h} style={{padding:"8px 10px",color:C.t3,fontWeight:700,textAlign:"right",borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap"}}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {schedule.slice(0,24).map((r,i)=>(
                <tr key={i} style={{borderBottom:`1px solid ${C.border}`}}>
                  <td style={{padding:"6px 10px",color:C.t3,whiteSpace:"nowrap"}}>{r.label}</td>
                  <td style={{padding:"6px 10px",fontFamily:F.mono,color:C.red,textAlign:"right"}}>{fmt(r.payment)}</td>
                  <td style={{padding:"6px 10px",fontFamily:F.mono,color:C.amber,textAlign:"right"}}>{fmt(r.interest)}</td>
                  <td style={{padding:"6px 10px",fontFamily:F.mono,color:C.green,textAlign:"right"}}>{fmt(r.principal)}</td>
                  <td style={{padding:"6px 10px",fontFamily:F.mono,color:C.t2,textAlign:"right"}}>{fmt(r.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {schedule.length>24&&<div style={{textAlign:"center",padding:10,color:C.t4,fontSize:11}}>Showing first 24 months of {schedule.length} total</div>}
        </div>
      )}
    </div>
  );
}

// ── Swipe-to-delete row ────────────────────────────────────────────────────────
function SwipeRow({onDelete,children}){
  const[offset,setOffset]=useState(0);
  const startX=useRef(null);
  const THRESHOLD=72;
  const onTouchStart=e=>{startX.current=e.touches[0].clientX;};
  const onTouchMove=e=>{
    if(startX.current===null)return;
    const dx=e.touches[0].clientX-startX.current;
    if(dx<0)setOffset(Math.max(dx,-THRESHOLD*1.3));
  };
  const onTouchEnd=()=>{
    if(offset<-THRESHOLD)onDelete();
    setOffset(0);startX.current=null;
  };
  return(
    <div style={{position:"relative",overflow:"hidden",borderRadius:12,marginBottom:8}}>
      <div style={{position:"absolute",inset:0,background:"#ef4444",display:"flex",alignItems:"center",justifyContent:"flex-end",padding:"0 20px",borderRadius:12}}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
      </div>
      <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        style={{transform:`translateX(${offset}px)`,transition:offset===0?"transform .25s":"none",position:"relative",zIndex:1}}>
        {children}
      </div>
    </div>
  );
}

// ── Entries List ───────────────────────────────────────────────────────────────
function EntriesList({entries,setEntries,displayPeriod,onAddEntry}){
  const pDays=PERIODS.find(p=>p.key===displayPeriod).days;
  const[editEntry,setEditEntry]=useState(null);
  const[typeFilter,setTypeFilter]=useState("all");
  const[search,setSearch]=useState("");
  const filtered=useMemo(()=>{
    return entries
      .filter(e=>typeFilter==="all"||e.type===typeFilter)
      .filter(e=>!search||e.label.toLowerCase().includes(search.toLowerCase())||e.category.toLowerCase().includes(search.toLowerCase()))
      .sort((a,b)=>b.startDate.localeCompare(a.startDate));
  },[entries,typeFilter,search]);
  const remove=(id)=>setEntries(e=>e.filter(x=>x.id!==id));
  const save=(entry)=>setEntries(e=>e.map(x=>x.id===entry.id?entry:x));
  return(
    <div>
      <div style={{textAlign:"center",marginBottom:16}}>
        <GradBtn onClick={onAddEntry} style={{width:"auto",padding:"12px 32px",display:"inline-block"}}>+ Add Entry</GradBtn>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:12}}>
        <input className="fi" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{flex:1}}/>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:12}}>
        {["all","income","expense"].map(t=>(
          <button key={t} onClick={()=>setTypeFilter(t)} className={`tab-btn ${typeFilter===t?"active":""}`} style={{textTransform:"capitalize",border:`1px solid ${C.border}`}}>{t}</button>
        ))}
      </div>
      {filtered.length===0&&<div style={{textAlign:"center",padding:"32px 0",color:C.t5,fontSize:13}}>No entries found.</div>}
      {filtered.map(e=>{
        const pa=periodAmt(e,pDays);
        return(
          <SwipeRow key={e.id} onDelete={()=>remove(e.id)}>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 14px",display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:8,height:8,borderRadius:4,background:CAT_COLORS[e.category]||C.t2,flexShrink:0,marginTop:2}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:C.t1,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.label}</div>
                <div style={{fontSize:11,color:C.t4}}>{e.category} · {e.recur} · {e.startDate}</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontFamily:F.sans,fontSize:13,fontWeight:700,letterSpacing:"-0.02em",color:e.type==="income"?C.green:C.red}}>{e.type==="income"?"+":"-"}{fmt(e.amount)}</div>
                <div style={{fontSize:10,color:C.t4}}>{fmt(pa)}/{PWORD[displayPeriod]}</div>
              </div>
              <Btn onClick={()=>setEditEntry(e)} style={{padding:"4px 8px",fontSize:10,flexShrink:0}}>Edit</Btn>
            </div>
          </SwipeRow>
        );
      })}
      {editEntry&&<EntryForm editEntry={editEntry} onAdd={save} onClose={()=>setEditEntry(null)}/>}
    </div>
  );
}

// ── Donut Chart ────────────────────────────────────────────────────────────────
function DonutChart({slices,size=120,strokeW=18}){
  const total=slices.reduce((s,x)=>s+x.value,0);
  if(total===0)return null;
  const r=(size-strokeW)/2,cx=size/2,cy=size/2,circ=2*Math.PI*r;
  let off=0;
  return(
    <svg width={size} height={size}>
      {slices.map((s,i)=>{
        const pct=s.value/total;
        const dash=pct*circ;
        const el=<circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={strokeW} strokeDasharray={`${dash} ${circ-dash}`} strokeDashoffset={-off*circ} style={{transform:"rotate(-90deg)",transformOrigin:"center"}} opacity={.85}/>;
        off+=pct;
        return el;
      })}
      <circle cx={cx} cy={cy} r={r-strokeW/2} fill={C.bg}/>
    </svg>
  );
}

// ── Overview / Dashboard ───────────────────────────────────────────────────────
function Overview({entries,displayPeriod,goals}){
  const pDays=PERIODS.find(p=>p.key===displayPeriod).days;
  const pw=PWORD[displayPeriod];
  const totInc=useMemo(()=>entries.filter(e=>e.type==="income").reduce((s,e)=>s+periodAmt(e,pDays),0),[entries,pDays]);
  const totExp=useMemo(()=>entries.filter(e=>e.type==="expense").reduce((s,e)=>s+periodAmt(e,pDays),0),[entries,pDays]);
  const savings=totInc-totExp;
  const savingsRate=totInc>0?(savings/totInc)*100:0;
  const catTotals=useMemo(()=>{
    const ct={};
    entries.filter(e=>e.type==="expense").forEach(e=>{ct[e.category]=(ct[e.category]||0)+periodAmt(e,pDays);});
    return Object.entries(ct).sort((a,b)=>b[1]-a[1]).slice(0,6);
  },[entries,pDays]);
  const donutSlices=catTotals.map(([c,v])=>({color:CAT_COLORS[c]||C.t2,value:v,label:c}));
  const topGoal=goals.find(g=>g.saved<g.target);
  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        <StatCard label={`Income / ${pw}`} value={fmt(totInc)} color={C.green} bg="rgba(110,231,183,.05)" border="rgba(110,231,183,.2)" labelColor={C.green}/>
        <StatCard label={`Expenses / ${pw}`} value={fmt(totExp)} color={C.red} bg="rgba(251,113,133,.05)" border="rgba(251,113,133,.2)" labelColor={C.red}/>
        <StatCard label={`Net / ${pw}`} value={`${savings>=0?"+":"-"}${fmt(Math.abs(savings))}`} color={savings>=0?C.green:C.red}/>
        <StatCard label="Savings Rate" value={`${savingsRate.toFixed(1)}%`} color={savingsRate>=20?C.green:savingsRate>=10?C.amber:C.red}/>
      </div>
      {catTotals.length>0&&(
        <div className="card" style={{marginBottom:16}}>
          <Row mb={12}>
            <div style={{fontSize:12,fontWeight:700,color:C.t2}}>Expense Breakdown</div>
            <DonutChart slices={donutSlices}/>
          </Row>
          {catTotals.map(([c,v])=>(
            <div key={c} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{width:8,height:8,borderRadius:2,background:CAT_COLORS[c]||C.t2,display:"inline-block"}}/>
                <span style={{fontSize:12,color:C.t2}}>{c}</span>
              </div>
              <div>
                <span style={{fontFamily:F.mono,fontSize:12,color:C.t1}}>{fmt(v)}</span>
                <span style={{fontSize:10,color:C.t4,marginLeft:6}}>{totExp>0?((v/totExp)*100).toFixed(0):0}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {topGoal&&(
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 16px",marginBottom:16}}>
          <div style={{fontSize:11,color:C.t3,marginBottom:6,textTransform:"uppercase",letterSpacing:".05em"}}>Top Goal</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontSize:13,fontWeight:700,color:C.t1}}>{topGoal.emoji} {topGoal.name}</div>
            <div style={{fontFamily:F.mono,fontSize:13,color:topGoal.color}}>{fmt(topGoal.saved)} / {fmt(topGoal.target)}</div>
          </div>
          <div style={{background:C.border,borderRadius:4,height:6,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${Math.min(100,(topGoal.saved/topGoal.target)*100)}%`,background:topGoal.color,borderRadius:4}}/>
          </div>
        </div>
      )}
      <Histogram entries={entries} displayPeriod={displayPeriod}/>
    </div>
  );
}

// ── SEED DATA & DEFAULTS ───────────────────────────────────────────────────────
const SEED=[
  {id:1,type:"income",label:"Salary",amount:5000,category:"Salary",recur:"Monthly",startDate:"2024-01-15",actuals:[]},
  {id:2,type:"expense",label:"Mortgage",amount:2200,category:"Mortgage",recur:"Monthly",startDate:"2024-01-01",actuals:[]},
  {id:3,type:"expense",label:"Food & Groceries",amount:300,category:"Food",recur:"Fortnightly",startDate:"2024-01-08",actuals:[]},
  {id:4,type:"expense",label:"Power",amount:180,category:"Utilities",recur:"Monthly",startDate:"2024-01-20",actuals:[]},
  {id:5,type:"expense",label:"KiwiSaver",amount:300,category:"Savings Goal",recur:"Monthly",startDate:"2024-01-15",actuals:[]},
  {id:6,type:"expense",label:"Petrol",amount:80,category:"Transport",recur:"Weekly",startDate:"2024-01-01",actuals:[]},
  {id:7,type:"income",label:"Freelance",amount:800,category:"Freelance",recur:"Monthly",startDate:"2024-02-01",actuals:[]},
  {id:8,type:"expense",label:"Internet",amount:99,category:"Subscriptions",recur:"Monthly",startDate:"2024-01-01",actuals:[]},
];
const DEFAULT_MORT={principal:500000,rate:6.5,termYears:30,startDate:"2024-01-01"};

// ── Bottom nav icons ──────────────────────────────────────────────────────────
const IcoChart=()=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="12" width="4" height="9"/><rect x="10" y="7" width="4" height="14"/><rect x="17" y="3" width="4" height="18"/></svg>;
const IcoDoc=()=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
const IcoHouse=()=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const IcoTrend=()=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>;
const IcoTarget=()=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
const NAV_TABS=[
  {key:"overview",label:"Overview",Icon:IcoChart},
  {key:"entries",label:"Entries",Icon:IcoDoc},
  {key:"mortgage",label:"Mortgage",Icon:IcoHouse},
  {key:"networth",label:"Net Worth",Icon:IcoTrend},
  {key:"goals",label:"Goals",Icon:IcoTarget},
];
const PERIOD_SHORT={weekly:"W",fortnightly:"Fn",monthly:"M",yearly:"Y"};

// ── Main App ───────────────────────────────────────────────────────────────────
export default function App(){
  const[entries,setEntries]=useLocalStorage("ft-entries",SEED);
  const[displayPeriod,setDisplayPeriod]=useLocalStorage("ft-period","monthly");
  const[mortgageCfg,setMortgageCfg]=useLocalStorage("ft-mortgage-cfg",DEFAULT_MORT);
  const[mortgageRateChanges,setMortgageRateChanges]=useLocalStorage("ft-rate-changes",[]);
  const[mortgageLumpSums,setMortgageLumpSums]=useLocalStorage("ft-lump-sums",[]);
  const[assets,setAssets]=useLocalStorage("ft-assets",[
    {id:1,label:"Home Value",value:650000},
    {id:2,label:"KiwiSaver",value:42000},
    {id:3,label:"Savings",value:15000},
    {id:4,label:"Investments",value:8000},
  ]);
  const[liabilities,setLiabilities]=useLocalStorage("ft-liabilities",[
    {id:1,label:"Mortgage",value:500000,linkMortgage:true},
    {id:2,label:"Car Loan",value:12000},
  ]);
  const[networthSnapshots,setNetworthSnapshots]=useLocalStorage("ft-nw-snapshots",[]);
  const[budgetLimits,setBudgetLimits]=useLocalStorage("ft-budgets",{});
  const[goals,setGoals]=useLocalStorage("ft-goals",[
    {id:1,name:"Emergency Fund",target:15000,saved:3200,color:"#6ee7b7",linkedCategory:"Savings Goal",emoji:"🛡"},
    {id:2,name:"Holiday",target:5000,saved:800,color:"#67e8f9",linkedCategory:"Savings Goal",emoji:"✈️"},
    {id:3,name:"New Car",target:20000,saved:0,color:"#fbbf24",linkedCategory:"Savings Goal",emoji:"🚗"},
  ]);
  const[activeTab,setActiveTab]=useLocalStorage("ft-tab","overview");
  const[showAdd,setShowAdd]=useState(false);
  const mortgageSchedule=useMemo(()=>buildSchedule(mortgageCfg.principal,mortgageCfg.rate,mortgageCfg.termYears,mortgageCfg.startDate,mortgageRateChanges,mortgageLumpSums),[mortgageCfg,mortgageRateChanges,mortgageLumpSums]);

  return(
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:F.sans,color:C.t1,paddingBottom:72}}>
      <style>{CSS}</style>
      {/* Header */}
      <div style={{background:C.card,borderBottom:`1px solid ${C.border}`,padding:"14px 16px 12px",position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
          <div>
            <div style={{fontSize:17,fontWeight:700,color:C.t1,lineHeight:1.2}}>Finance Tracker</div>
            <div style={{fontSize:10,color:C.t4}}>{today.toLocaleDateString("en-NZ",{weekday:"short",day:"numeric",month:"short",year:"numeric"})}</div>
          </div>
          {/* Period selector W/Fn/M/Y */}
          <div style={{display:"flex",gap:4}}>
            {PERIODS.map(p=>(
              <button key={p.key} onClick={()=>setDisplayPeriod(p.key)}
                style={{background:displayPeriod===p.key?"rgba(110,231,183,.15)":"none",border:`1px solid ${displayPeriod===p.key?C.green:C.border}`,borderRadius:8,padding:"6px 10px",color:displayPeriod===p.key?C.green:C.t4,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F.sans,minWidth:32,textAlign:"center"}}>
                {PERIOD_SHORT[p.key]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{padding:"16px 16px 0"}}>
        {activeTab==="overview"&&<Overview entries={entries} displayPeriod={displayPeriod} goals={goals}/>}
        {activeTab==="entries"&&<EntriesList entries={entries} setEntries={setEntries} displayPeriod={displayPeriod} onAddEntry={()=>setShowAdd(true)}/>}
        {activeTab==="mortgage"&&<MortgagePanel mortgageCfg={mortgageCfg} setMortgageCfg={setMortgageCfg} mortgageRateChanges={mortgageRateChanges} setMortgageRateChanges={setMortgageRateChanges} mortgageLumpSums={mortgageLumpSums} setMortgageLumpSums={setMortgageLumpSums}/>}
        {activeTab==="networth"&&<NetWorthPanel assets={assets} setAssets={setAssets} liabilities={liabilities} setLiabilities={setLiabilities} mortgageSchedule={mortgageSchedule} networthSnapshots={networthSnapshots} setNetworthSnapshots={setNetworthSnapshots}/>}
        {activeTab==="goals"&&<GoalsPanel goals={goals} setGoals={setGoals} entries={entries} displayPeriod={displayPeriod}/>}
      </div>

      {/* Bottom nav */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:C.card,borderTop:`1px solid ${C.border}`,display:"flex",zIndex:50,paddingBottom:"env(safe-area-inset-bottom)"}}>
        {NAV_TABS.map(({key,label,Icon})=>(
          <button key={key} onClick={()=>setActiveTab(key)}
            style={{flex:1,background:"none",border:"none",padding:"10px 0 8px",display:"flex",flexDirection:"column",alignItems:"center",gap:3,color:activeTab===key?C.green:C.t4,cursor:"pointer",transition:"color .2s",fontFamily:F.sans}}>
            <Icon/>
            <span style={{fontSize:9,fontWeight:700}}>{label}</span>
          </button>
        ))}
      </div>

      {/* Add Entry modal */}
      {showAdd&&<EntryForm onAdd={e=>setEntries(es=>[...es,e])} onClose={()=>setShowAdd(false)}/>}
    </div>
  );
}
