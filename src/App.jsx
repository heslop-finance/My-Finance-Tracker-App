import{useState,useMemo,useRef,useEffect}from"react";

// ── CONSTANTS ──────────────────────────────────────────────────
const C={
bg:"#0a0f1e",card:"#0f172a",border:"#1e293b",
green:"#6ee7b7",red:"#fb7185",amber:"#fbbf24",purple:"#a78bfa",cyan:"#06b6d4",
t1:"#f1f5f9",t2:"#94a3b8",t3:"#64748b",t4:"#475569",t5:"#334155",
inc:"rgba(110,231,183,.08)",exp:"rgba(251,113,133,.08)",
incDk:"#0d2420",expDk:"#1f0d12",
};
const F={mono:"'JetBrains Mono',monospace",sans:"'DM Sans',sans-serif"};
const s=(extra={})=>({...extra});

const INCOME_CATS=["Salary","Freelance","Rental Income","Investment Returns","Benefits","Government Benefits","Other Income"];
const EXPENSE_CATS=["Mortgage","Rent","Utilities","Groceries","Transport","Insurance","Rates","Subscriptions","Health","Entertainment","Clothing","House Maintenance","Personal Care","Shopping","Sports & Leisure","Eating & Drinking Out","Pet Care","Garden & Home","Gifts & Donations","Kids","Savings Goal","Investments","Travel","Car & Maintenance","Fines","Other"];
const SAVINGS_CATS=new Set(["Savings Goal","Investments"]);
const FIXED_CATS=new Set(["Mortgage","Rent","Rates","Insurance","Subscriptions"]);
const CAT_COLORS={"Mortgage":"#fb7185","Rent":"#f97316","Utilities":"#fbbf24","Groceries":"#6ee7b7","Transport":"#67e8f9","Insurance":"#a78bfa","Rates":"#f472b6","Subscriptions":"#818cf8","Health":"#34d399","Entertainment":"#e879f9","Clothing":"#38bdf8","House Maintenance":"#fb923c","Personal Care":"#f0abfc","Shopping":"#fdba74","Sports & Leisure":"#86efac","Eating & Drinking Out":"#fca5a5","Pet Care":"#6ee7b7","Garden & Home":"#a3e635","Gifts & Donations":"#f9a8d4","Kids":"#93c5fd","Savings Goal":"#4ade80","Investments":"#06b6d4","Travel":"#818cf8","Car & Maintenance":"#94a3b8","Fines":"#ef4444","Other":"#94a3b8","Salary":"#6ee7b7","Freelance":"#67e8f9","Rental Income":"#a78bfa","Investment Returns":"#06b6d4","Benefits":"#fbbf24","Government Benefits":"#fbbf24","Other Income":"#f472b6"};
const PERIODS=[{key:"weekly",label:"Weekly",days:7},{key:"fortnightly",label:"Fortnightly",days:14},{key:"monthly",label:"Monthly",days:30.44},{key:"yearly",label:"Yearly",days:365}];
const RECUR_OPT=["One-off","Weekly","Fortnightly","Monthly","Yearly","Variable"];
const DAYS_SHORT=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MON_SHORT=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const RECURDAYS={Weekly:7,Fortnightly:14,Monthly:30.44,Yearly:365};
const PWORD={weekly:"week",fortnightly:"fortnight",monthly:"month",yearly:"year"};
const AKAHU_ACCOUNTS={
'acc_cmp6ij34i002i02jp6ym1f040':{name:'YouMoney',treat:'transactions'},
'acc_cmp6ij356002o02jpfo8jee7t':{name:'Travel',treat:'savings'},
'acc_cmp6ij34p002k02jp28m57k9k':{name:'Sony 200-600mm',treat:'savings'},
'acc_cmp6ij35b002q02jp3a0qgbs3':{name:'Expenses',treat:'transactions'},
'acc_cmp6ij34y002m02jpa4g4expy':{name:'Rainy Day',treat:'savings'},
'acc_cmp6ij35h002s02jpehhug74g':{name:'Holding Account',treat:'transactions'},
'acc_cmp10iudy000002l42skl21mf':{name:'Student Loan',treat:'balance_only'},
'acc_cmp10lt9u000002l49rfchell':{name:'Sharesies',treat:'balance_only'},
'acc_cmp10amt5000002jy6g9lbdzw':{name:'YouMoney',treat:'transactions'},
'acc_cmp10amtq000102jyg87s1g5v':{name:'Travel',treat:'savings'},
'acc_cmp10amut000202jy57yv6lxu':{name:'Sony 200-600mm',treat:'savings'},
'acc_cmp10amvb000302jyeonj9pi4':{name:'Expenses',treat:'transactions'},
'acc_cmp10amvd000402jyhyhsb873':{name:'Rainy Day',treat:'savings'},
};

// ── HELPERS ────────────────────────────────────────────────────
const today=new Date();
const fmt=n=>{const s=Math.abs(n).toLocaleString("en-NZ",{minimumFractionDigits:2,maximumFractionDigits:2});return `$${s.endsWith('.00')?s.slice(0,-3):s}`;};
const fmtS=n=>`$${Math.abs(n).toLocaleString("en-NZ",{minimumFractionDigits:0,maximumFractionDigits:0})}`;
const fmtN=n=>n%1===0?n.toFixed(0):n.toFixed(1);
const pad=n=>String(n).padStart(2,"0");
const dateKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const todayStr=dateKey(today);
const PAY_CYCLE_ANCHOR=new Date(2026,4,5);
function getPeriodStart(periodKey){
const now=new Date();
const todayMidnight=new Date(now.getFullYear(),now.getMonth(),now.getDate());
if(periodKey==='weekly'){const start=new Date(todayMidnight);start.setDate(start.getDate()-6);return start;}
if(periodKey==='fortnightly'){const daysSinceAnchor=Math.floor((todayMidnight-PAY_CYCLE_ANCHOR)/86400000);const daysSinceLastPay=((daysSinceAnchor%14)+14)%14;const start=new Date(todayMidnight);start.setDate(start.getDate()-daysSinceLastPay);return start;}
if(periodKey==='monthly'){return new Date(now.getFullYear(),now.getMonth(),1);}
if(periodKey==='yearly'){return new Date(now.getFullYear(),0,1);}
return new Date(todayMidnight);
}
function getTransactionsForPeriod(transactions,periodKey){
const start=getPeriodStart(periodKey);
const startStr=dateKey(start);
return transactions.filter(t=>t.date>=startStr&&t.date<=todayStr);
}
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
const CSS=`
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&family=JetBrains+Mono:wght@400;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
input,select,textarea{outline:none;font-size:16px!important;}
.fi,.fi-16{font-size:16px;}
input[type="date"]{-webkit-appearance:none;appearance:none;max-width:100%;min-width:0;}
input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(.5);}
input[type="range"]{accent-color:#6ee7b7;}
.bnav{position:fixed;bottom:0;left:0;right:0;background:#0f172a;border-top:1px solid #1e293b;display:flex;z-index:100;padding-bottom:env(safe-area-inset-bottom);}
.bnav-btn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 4px 8px;border:none;background:none;cursor:pointer;gap:3px;}
.bnav-btn span{font-size:18px;line-height:1;}
.bnav-btn div{font-size:10px;font-weight:600;font-family:'DM Sans',sans-serif;}
.hscroll{display:flex;overflow-x:auto;-webkit-overflow-scrolling:touch;gap:12px;padding-bottom:8px;scrollbar-width:none;}
.hscroll::-webkit-scrollbar{display:none;}
.hscroll>*{flex-shrink:0;}
.card{background:#0f172a;border:1px solid #1e293b;border-radius:16px;padding:20px;margin-bottom:20px;}
.fi{background:#1e293b;border:1px solid #334155;border-radius:10px;padding:11px 14px;color:#f1f5f9;font-family:'DM Sans',sans-serif;font-size:16px;width:100%;box-sizing:border-box;}
.fi:focus{border-color:#6ee7b7;}
.tab-btn{background:none;border:none;cursor:pointer;padding:8px 14px;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;transition:all .2s;white-space:nowrap;color:#64748b;}
.tab-btn.active{background:#1e293b;color:#f1f5f9;}
.period-btn{border:1px solid #1e293b;cursor:pointer;padding:8px 14px;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;color:#64748b;background:none;white-space:nowrap;}
.period-btn.active{background:rgba(110,231,183,.1);border-color:#6ee7b7;color:#6ee7b7;}
.add-btn{background:linear-gradient(135deg,#6ee7b7,#3b82f6);border:none;border-radius:10px;padding:13px 28px;color:#0a0f1e;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:700;cursor:pointer;}
.tt{display:flex;background:#1e293b;border-radius:10px;padding:4px;gap:4px;}
.tb{flex:1;border:none;border-radius:7px;padding:9px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;}
.tb.inc{background:rgba(110,231,183,.2);color:#6ee7b7;}
.tb.exp{background:rgba(251,113,133,.2);color:#fb7185;}
.tb.off{background:transparent;color:#475569;}
.rb{border:1px solid #1e293b;cursor:pointer;padding:7px 10px;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:600;color:#64748b;background:none;white-space:nowrap;}
.rb.on{background:rgba(110,231,183,.1);border-color:#6ee7b7;color:#6ee7b7;}
.rb.oo{background:rgba(251,191,36,.1);border-color:#fbbf24;color:#fbbf24;}
.cc{background:#0a0f1e;border:1px solid #1e293b;border-radius:12px;padding:14px 12px;cursor:pointer;text-align:center;}
.cc.active{background:rgba(110,231,183,.07);border-color:#6ee7b7;}
`;

// ── SMALL HELPERS ──────────────────────────────────────────────
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
<div style={{background:bg,border:`1px solid ${border}`,borderRadius:16,padding:"18px 16px",minWidth:155,flexShrink:0}}>
<div style={{fontSize:10,color:labelColor,marginBottom:8,textTransform:"uppercase",letterSpacing:".05em",lineHeight:1.4,whiteSpace:"nowrap"}}>{label}</div>
<Mono color={color} size={14}>{value}</Mono>
{sub&&<div style={{fontSize:10,color:C.t4,marginTop:4}}>{sub}</div>}
</div>
);

// ── HISTOGRAM ─────────────────────────────────────────────────
function Histogram({entries,displayPeriod,actualsMode=false,syncedTransactions=[]}){
const isYearly=displayPeriod==="yearly";
const isAllYears=displayPeriod==="allyears";
const[catFilter,setCatFilter]=useState("All Expenses");
const[showStacked,setShowStacked]=useState(false);
const[showAvg,setShowAvg]=useState(false);
const[showCumul,setShowCumul]=useState(false);
const[showProj,setShowProj]=useState(false);
const[showAllTimeAvg,setShowAllTimeAvg]=useState(false);
const[showAllTimeTrend,setShowAllTimeTrend]=useState(false);
const[openCat,setOpenCat]=useState(false);
const expCats=Object.keys(CAT_COLORS).filter(c=>EXPENSE_CATS.includes(c));
const allExpEntries=useMemo(()=>entries.filter(e=>e.type==="expense"),[entries]);
const filteredEntries=useMemo(()=>catFilter==="All Expenses"?allExpEntries:allExpEntries.filter(e=>e.category===catFilter),[allExpEntries,catFilter]);
const stackCats=useMemo(()=>{
const fromEntries=[...new Set(allExpEntries.map(e=>e.category))];
if(!actualsMode)return fromEntries;
const fromTransactions=[...new Set(syncedTransactions.filter(t=>t.ledgerlyType==='expense'&&!t.isSavingsDeposit).map(t=>t.ledgerlyCategory).filter(Boolean))];
return[...new Set([...fromEntries,...fromTransactions])];
},[allExpEntries,actualsMode,syncedTransactions]);
const bars=useMemo(()=>{
const now=new Date();
if(isAllYears){
const earliest=entries.reduce((min,e)=>{const y=parseDt(e.startDate).getFullYear();return y<min?y:min;},now.getFullYear());
const currentYear=now.getFullYear();
const totalYears=Math.max(12,currentYear-earliest+1);
if(actualsMode){
return Array.from({length:totalYears},(_,i)=>{
const y=earliest+i;
const isFuture=y>currentYear;
const bycat={};stackCats.forEach(c=>{bycat[c]=0;});
if(!isFuture){
syncedTransactions.filter(t=>t.ledgerlyType==='expense'&&!t.isSavingsDeposit&&t.date.startsWith(String(y))&&(catFilter==="All Expenses"||t.ledgerlyCategory===catFilter)).forEach(t=>{const c=t.ledgerlyCategory||'Other';bycat[c]=(bycat[c]||0)+Math.abs(t.amount);});
}
const val=Object.values(bycat).reduce((s,v)=>s+v,0);
return{label:String(y),val,bycat,isFuture};
});
}
return Array.from({length:totalYears},(_,i)=>{
const y=earliest+i;
const isFuture=y>currentYear;
const bycat={};stackCats.forEach(c=>{bycat[c]=0;});
if(!isFuture){
const relevantEntries=catFilter==="All Expenses"?allExpEntries:allExpEntries.filter(e=>e.category===catFilter);
datesInRange(new Date(y,0,1),new Date(y,11,31)).forEach(d=>{relevantEntries.filter(e=>occursOn(e,d)).forEach(e=>{bycat[e.category]=(bycat[e.category]||0)+e.amount;});});
}
const val=Object.values(bycat).reduce((s,v)=>s+v,0);
return{label:String(y),val,bycat,isFuture};
});
}
if(isYearly){
if(actualsMode){
return Array.from({length:12},(_,m)=>{
const bycat={};stackCats.forEach(c=>{bycat[c]=0;});
syncedTransactions.filter(t=>t.ledgerlyType==='expense'&&!t.isSavingsDeposit&&(catFilter==="All Expenses"||t.ledgerlyCategory===catFilter)).forEach(t=>{
const td=parseDt(t.date);
if(td.getFullYear()===now.getFullYear()&&td.getMonth()===m){const c=t.ledgerlyCategory||'Other';bycat[c]=(bycat[c]||0)+Math.abs(t.amount);}
});
const val=Object.values(bycat).reduce((s,v)=>s+v,0);
return{label:MON_SHORT[m],val,bycat,isFuture:m>now.getMonth()};
});
}
return Array.from({length:12},(_,m)=>{
const from=new Date(now.getFullYear(),m,1),to=new Date(now.getFullYear(),m+1,0);
const bycat={};stackCats.forEach(c=>{bycat[c]=0;});
datesInRange(from,to).forEach(d=>{allExpEntries.filter(e=>occursOn(e,d)).forEach(e=>{bycat[e.category]=(bycat[e.category]||0)+e.amount;});});
const val=Object.values(bycat).reduce((s,v)=>s+v,0);
return{label:MON_SHORT[m],val,bycat,isFuture:m>now.getMonth()};
});
}else{
if(actualsMode){
const start=getPeriodStart(displayPeriod);
const todayMidnight=new Date(now.getFullYear(),now.getMonth(),now.getDate());
const days=Math.max(1,Math.round((todayMidnight-start)/86400000)+1);
return Array.from({length:days},(_,di)=>{
const d=new Date(start);d.setDate(d.getDate()+di);
const dStr=dateKey(d);
const bycat={};stackCats.forEach(c=>{bycat[c]=0;});
syncedTransactions.filter(t=>t.date===dStr&&t.ledgerlyType==='expense'&&!t.isSavingsDeposit&&(catFilter==="All Expenses"||t.ledgerlyCategory===catFilter)).forEach(t=>{const c=t.ledgerlyCategory||'Other';bycat[c]=(bycat[c]||0)+Math.abs(t.amount);});
const val=Object.values(bycat).reduce((s,v)=>s+v,0);
return{label:pad(d.getDate()),val,bycat,isFuture:false,date:d};
});
}
const periodStart=getPeriodStart(displayPeriod);
const todayMidnight=new Date(now.getFullYear(),now.getMonth(),now.getDate());
const days=Math.max(1,Math.round((todayMidnight-periodStart)/86400000)+1);
return Array.from({length:days},(_,di)=>{
const d=new Date(periodStart);d.setDate(d.getDate()+di);
const bycat={};stackCats.forEach(c=>{bycat[c]=0;});
allExpEntries.filter(e=>occursOn(e,d)).forEach(e=>{bycat[e.category]=(bycat[e.category]||0)+e.amount;});
const val=Object.values(bycat).reduce((s,v)=>s+v,0);
return{label:pad(d.getDate()),val,bycat,isFuture:false,date:d};
});
}
},[filteredEntries,allExpEntries,displayPeriod,isYearly,stackCats,actualsMode,syncedTransactions,catFilter]);

const rollingAvg=useMemo(()=>{
if(isAllYears)return 0;
const pDays=PERIODS.find(p=>p.key===displayPeriod)?.days||30.44;
if(actualsMode){
const oneYearAgo=new Date();oneYearAgo.setFullYear(oneYearAgo.getFullYear()-1);
const oneYearAgoStr=dateKey(oneYearAgo);
const total=syncedTransactions.filter(t=>t.ledgerlyType==='expense'&&!t.isSavingsDeposit&&t.date>oneYearAgoStr&&t.date<=todayStr&&(catFilter==="All Expenses"||t.ledgerlyCategory===catFilter)).reduce((s,t)=>s+Math.abs(t.amount),0);
return total*(pDays/365);
}
const from=new Date();from.setFullYear(from.getFullYear()-1);
const to=new Date();
let total=0;
datesInRange(from,to).forEach(d=>{
filteredEntries.filter(e=>occursOn(e,d)).forEach(e=>{total+=e.amount;});
});
return total*(pDays/365);
},[filteredEntries,displayPeriod,actualsMode,syncedTransactions,catFilter]);

const cumulativeData=useMemo(()=>{let sum=0;return bars.map(b=>{sum+=b.val;return sum;});},[bars]);
const projection=useMemo(()=>{
if(!showProj||isAllYears||displayPeriod==='weekly')return null;
if(isYearly&&!actualsMode)return null;

if(actualsMode&&syncedTransactions.length>0){
const start=getPeriodStart(displayPeriod);
const todayMidnight=new Date(today.getFullYear(),today.getMonth(),today.getDate());
const daysElapsed=Math.max(1,Math.round((todayMidnight-start)/86400000)+1);
const monthsElapsed=isYearly?Math.max(1,today.getMonth()+1):daysElapsed;
const startStr=dateKey(start);
const totalDays=isYearly?12:bars.length;
const remainingDays=Math.max(0,totalDays-(isYearly?monthsElapsed:daysElapsed));
const periodTxns=syncedTransactions.filter(t=>
t.ledgerlyType==='expense'&&
!t.isSavingsDeposit&&
t.date>=startStr&&
t.date<=todayStr&&
(catFilter==='All Expenses'||t.ledgerlyCategory===catFilter)
);
const actualSpendSoFar=periodTxns.reduce((s,t)=>s+Math.abs(t.amount),0);
const recurringEntries=entries.filter(e=>
e.type==='expense'&&
e.recur!=='One-off'&&
e.recur!=='Variable'&&
!SAVINGS_CATS.has(e.category)&&
FIXED_CATS.has(e.category)&&
(catFilter==='All Expenses'||e.category===catFilter)
);
const recurringCats=new Set(recurringEntries.map(e=>e.category));
let remainingRecurring=0;
if(isYearly){
const daysLeftInMonth=new Date(today.getFullYear(),today.getMonth()+1,0).getDate()-today.getDate();
const remainingCurrentMonthDays=Array.from({length:daysLeftInMonth},(_,i)=>new Date(today.getFullYear(),today.getMonth(),today.getDate()+i+1));
recurringEntries.forEach(e=>{remainingCurrentMonthDays.forEach(d=>{if(occursOn(e,d))remainingRecurring+=e.amount;});});
const currentMonth=today.getMonth();
Array.from({length:remainingDays},(_,i)=>{
const monthIndex=currentMonth+i+1;
const daysInMonth=new Date(today.getFullYear(),monthIndex+1,0).getDate();
const monthDays=Array.from({length:daysInMonth},(_,d)=>new Date(today.getFullYear(),monthIndex,d+1));
recurringEntries.forEach(e=>{monthDays.forEach(d=>{if(occursOn(e,d))remainingRecurring+=e.amount;});});
});
}else{
const remainingDaysArray=Array.from({length:remainingDays},(_,i)=>{const d=new Date(todayMidnight);d.setDate(d.getDate()+i+1);return d;});
recurringEntries.forEach(e=>{remainingDaysArray.forEach(d=>{if(occursOn(e,d))remainingRecurring+=e.amount;});});
}
const discretionaryTxns=periodTxns.filter(t=>!recurringCats.has(t.ledgerlyCategory));
const dailyDiscretionary=Array.from({length:isYearly?monthsElapsed:daysElapsed},(_,i)=>{
if(isYearly){
const mStr=`${today.getFullYear()}-${pad(i+1)}`;
return discretionaryTxns.filter(t=>t.date.startsWith(mStr)).reduce((s,t)=>s+Math.abs(t.amount),0);
}
const d=new Date(start);d.setDate(d.getDate()+i);
const dStr=dateKey(d);
return discretionaryTxns.filter(t=>t.date===dStr).reduce((s,t)=>s+Math.abs(t.amount),0);
});
const sorted=[...dailyDiscretionary].sort((a,b)=>a-b);
const mid=Math.floor(sorted.length/2);
const median=sorted.length%2!==0?sorted[mid]:(sorted[mid-1]+sorted[mid])/2;
const threshold=median*3;
const normalBuckets=dailyDiscretionary.filter(d=>d<=threshold);
const outlierTotal=dailyDiscretionary.filter(d=>d>threshold).reduce((s,d)=>s+d,0);
const normalTotal=normalBuckets.reduce((s,d)=>s+d,0);
const normalCount=Math.max(normalBuckets.length,1);
const discretionaryRate=normalTotal/normalCount;
const discretionaryProjection=discretionaryRate*remainingDays+outlierTotal;
return actualSpendSoFar+remainingRecurring+discretionaryProjection;
}

const pDays=(PERIODS.find(p=>p.key===displayPeriod)?.days||30.44);
const relevantEntries=entries.filter(e=>e.type==='expense');
let val=0;
const periodStart=new Date();periodStart.setDate(periodStart.getDate()-Math.round(pDays)+1);
const periodEnd=new Date(periodStart);periodEnd.setDate(periodEnd.getDate()+Math.round(pDays)-1);
datesInRange(periodStart,periodEnd).forEach(d=>{
if(catFilter==='All Expenses')relevantEntries.filter(e=>occursOn(e,d)).forEach(e=>{val+=e.amount;});
else relevantEntries.filter(e=>e.category===catFilter&&occursOn(e,d)).forEach(e=>{val+=e.amount;});
});
return val;
},[showProj,entries,displayPeriod,catFilter,isYearly,isAllYears,actualsMode,syncedTransactions,bars]);

const maxCumul=showCumul&&!isAllYears?Math.max(...cumulativeData,0):0;
const maxVal=Math.max(...bars.map(b=>b.val),showAvg&&!isAllYears?rollingAvg:0,projection||0,maxCumul,1);
const mostVal=Math.max(...bars.map(b=>b.val));
const mostBar=bars.find(b=>b.val===mostVal&&b.val>0);
const leastBar=bars.filter(b=>b.val>0).sort((a,b)=>a.val-b.val)[0];
const W=320,H=120,PAD=20,barW=Math.max(1,(W-PAD*2)/bars.length-1);
const xOf=i=>PAD+i*(W-PAD*2)/bars.length;
const yOf=v=>H-PAD-(v/maxVal)*(H-PAD*2);
const avgY=yOf(rollingAvg);
const cumulativePts=useMemo(()=>bars.map((b,i)=>({x:xOf(i)+barW/2,y:yOf(cumulativeData[i])})),[bars,cumulativeData,showCumul,showProj,projection]);

const allYearsAvg=useMemo(()=>{
if(!isAllYears)return 0;
const nonFuture=bars.filter(b=>!b.isFuture);
if(!nonFuture.length)return 0;
return nonFuture.reduce((s,b)=>s+b.val,0)/nonFuture.length;
},[isAllYears,bars]);

const allYearsTrend=useMemo(()=>{
if(!isAllYears)return null;
const nf=bars.filter(b=>!b.isFuture);
const n=nf.length;
if(n<2)return null;
const ys=nf.map(b=>b.val);
const sumX=n*(n-1)/2;
const sumY=ys.reduce((s,y)=>s+y,0);
const sumXY=ys.reduce((s,y,i)=>s+i*y,0);
const sumX2=n*(n-1)*(2*n-1)/6;
const slope=(n*sumXY-sumX*sumY)/(n*sumX2-sumX*sumX);
const intercept=(sumY-slope*sumX)/n;
return{slope,intercept,n};
},[isAllYears,bars]);

const toggles=isAllYears?[
{label:"Stack",active:showStacked,set:setShowStacked},
{label:"Avg",active:showAllTimeAvg,set:setShowAllTimeAvg},
{label:"Trend",active:showAllTimeTrend,set:setShowAllTimeTrend},
]:displayPeriod==='weekly'?[
{label:"Stack",active:showStacked,set:setShowStacked},
{label:"Avg",active:showAvg,set:setShowAvg},
{label:"Cumul.",active:showCumul,set:setShowCumul},
]:[
{label:"Stack",active:showStacked,set:setShowStacked},
{label:"Avg",active:showAvg,set:setShowAvg},
{label:"Cumul.",active:showCumul,set:setShowCumul},
{label:"Proj.",active:showProj,set:setShowProj},
];

return(
<div className="card">
<Row mb={12}>
<div style={{fontSize:12,fontWeight:700,color:C.t2}}>{isAllYears?"Yearly":isYearly?"Monthly":"Daily"} Expenses</div>
<div style={{fontFamily:F.sans,fontSize:18,fontWeight:700,color:C.red}}>{fmt(bars.reduce((s,b)=>s+b.val,0))}</div>
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
{showProj&&projection!=null&&!isAllYears&&<div style={{background:C.border,borderRadius:8,padding:'4px 9px',fontSize:11}}><span style={{color:C.t3}}>Proj. </span><Mono color={C.amber} size={11}>{fmtS(projection)}</Mono></div>}
</div>
)}
<div style={{overflowX:"auto",paddingBottom:6}}>
<svg width={isAllYears?Math.max(W,bars.length*26):W} height={H+20} style={{display:"block"}}>
{showAvg&&rollingAvg>0&&<>
<rect x={PAD} y={avgY-(H-PAD*2)*.1} width={W-PAD*2} height={(H-PAD*2)*.2} fill={`${C.green}12`}/>
<line x1={PAD} y1={avgY} x2={W-PAD} y2={avgY} stroke={C.green} strokeWidth={1} strokeDasharray="4 2"/>
<rect x={PAD+3} y={avgY-8} width={28} height={16} rx={3} fill={C.card}/>
<text x={PAD+6} y={avgY} fill={C.green} fontSize={8} fontWeight="700" dominantBaseline="middle" textAnchor="start">avg</text>
</>}
{showProj&&projection!=null&&<>
<line x1={PAD} y1={yOf(projection)} x2={W-PAD} y2={yOf(projection)} stroke={C.amber} strokeWidth={1} strokeDasharray="4 2"/>
<rect x={W-PAD-32} y={yOf(projection)-8} width={30} height={16} rx={3} fill={C.card}/>
<text x={W-PAD-4} y={yOf(projection)} fill={C.amber} fontSize={8} fontWeight="700" textAnchor="end" dominantBaseline="middle">proj</text>
</>}
{showCumul&&!isAllYears&&cumulativePts.length>1&&<polyline points={cumulativePts.map(p=>`${p.x},${p.y}`).join(" ")} fill="none" stroke={C.cyan} strokeWidth={1.5} opacity={.7}/>}
{bars.map((b,i)=>{
const x=xOf(i);
if(showStacked&&catFilter==="All Expenses"){
let yStack=H-PAD;
return(
<g key={i}>
{stackCats.filter(c=>b.bycat[c]>0).map(c=>{
const ch=(b.bycat[c]/maxVal)*(H-PAD*2);yStack-=ch;
return <rect key={c} x={x} y={yStack} width={barW} height={ch} rx={1} fill={CAT_COLORS[c]||C.t2} opacity={b.isFuture?.15:.8}/>;
})}
{(isAllYears?i%2===0:(bars.length<=32&&(i%2===0||displayPeriod!=="monthly")))&&<text x={x+barW/2} y={H+16} textAnchor="middle" fill={C.t5} fontSize={9}>{b.label}</text>}
</g>
);
}else{
const bh=Math.max(2,(b.val/maxVal)*(H-PAD*2));
const by=H-PAD-bh;
return(
<g key={i}>
<rect x={x} y={by} width={barW} height={bh} rx={2} fill={showAvg&&rollingAvg>0&&b.val>rollingAvg*1.1?C.red:CAT_COLORS[catFilter]||C.red} opacity={b.val===0?.12:b.isFuture?.15:b.val===mostVal?1:.65}/>
{(isAllYears?i%2===0:(bars.length<=32&&(i%2===0||displayPeriod!=="monthly")))&&<text x={x+barW/2} y={H+16} textAnchor="middle" fill={C.t5} fontSize={9}>{b.label}</text>}
</g>
);
}
})}
{isAllYears&&showAllTimeAvg&&allYearsAvg>0&&(
<>
<line x1={xOf(0)+barW/2} y1={yOf(allYearsAvg)} x2={xOf(bars.length-1)+barW/2} y2={yOf(allYearsAvg)} stroke={C.green} strokeWidth={1} strokeDasharray="4 3" opacity={.55}/>
<text x={xOf(bars.length-1)+barW/2+3} y={yOf(allYearsAvg)-3} textAnchor="start" fill={C.green} fontSize={8} opacity={.7}>avg</text>
</>
)}
{isAllYears&&showAllTimeTrend&&allYearsTrend&&(()=>{
const clamp=v=>Math.max(0,Math.min(maxVal*1.05,v));
const y0=clamp(allYearsTrend.intercept);
const y1=clamp(allYearsTrend.slope*(allYearsTrend.n-1)+allYearsTrend.intercept);
const x0=xOf(0)+barW/2;
const x1=xOf(allYearsTrend.n-1)+barW/2;
return(
<>
<line x1={x0} y1={yOf(y0)} x2={x1} y2={yOf(y1)} stroke={C.cyan} strokeWidth={1.5} opacity={.55}/>
<text x={x1+3} y={yOf(y1)-3} textAnchor="start" fill={C.cyan} fontSize={8} opacity={.7}>trend</text>
</>
);
})()}
</svg>
</div>
<div style={{display:'flex',gap:8,flexWrap:'wrap',fontSize:10,color:C.t3}}>
{showStacked&&stackCats.filter(c=>bars.some(b=>(b.bycat[c]||0)>0)).map(c=><div key={c} style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:8,height:8,background:CAT_COLORS[c]||C.t2,borderRadius:2,display:'inline-block'}}/>{c}</div>)}
</div>
</div>
);
}

// ── CALENDAR ──────────────────────────────────────────────────
function CalendarWidget({entries,displayPeriod,actualsMode=false,syncedTransactions=[]}){
const isYearly=displayPeriod==="yearly";
const isAllYears=displayPeriod==="allyears";
const[calYear,setCalYear]=useState(today.getFullYear());
const[calMonth,setCalMonth]=useState(today.getMonth());
const[sel,setSel]=useState(null);
const[selMonth,setSelMonth]=useState(null);
const[selYear,setSelYear]=useState(null);
const prev=()=>{setSel(null);if(isYearly)setCalYear(y=>y-1);else if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1);};
const next=()=>{setSel(null);if(isYearly)setCalYear(y=>y+1);else if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1);};
if(isAllYears){
const earliest=entries.reduce((min,e)=>{const y=parseDt(e.startDate).getFullYear();return y<min?y:min;},today.getFullYear());
const currentYear=today.getFullYear();
const totalYears=Math.max(12,currentYear-earliest+1);
const yearList=Array.from({length:totalYears},(_,i)=>{
const y=earliest+i;
const isFuture=y>currentYear;
let inc=0,exp=0,sav=0;
if(!isFuture){
if(actualsMode){
syncedTransactions.filter(t=>t.date.startsWith(String(y))).forEach(t=>{
if(t.ledgerlyType==='income')inc+=Math.abs(t.amount);
else if(t.isSavingsDeposit)sav+=Math.abs(t.amount);
else if(t.ledgerlyType==='expense')exp+=Math.abs(t.amount);
});
}else{
datesInRange(new Date(y,0,1),new Date(y,11,31)).forEach(d=>{
entries.filter(e=>e.type==="income"&&occursOn(e,d)).forEach(e=>{inc+=e.amount;});
entries.filter(e=>e.type==="expense"&&occursOn(e,d)).forEach(e=>{
if(SAVINGS_CATS.has(e.category))sav+=e.amount;
else exp+=e.amount;
});
});
}
}
return{year:y,inc,exp,sav,isCurrent:y===currentYear,isFuture};
});
const selYearData=selYear!==null?yearList.find(y=>y.year===selYear):null;
const yearEntryTotals=selYearData&&!selYearData.isFuture?(()=>{
const totals={};
datesInRange(new Date(selYear,0,1),new Date(selYear,11,31)).forEach(d=>{
const mk=`${d.getFullYear()}-${pad(d.getMonth()+1)}`;
entries.filter(e=>occursOn(e,d)).forEach(e=>{
const amt=e.recur==="Variable"?varActual(e,mk):e.amount;
if(!totals[e.id])totals[e.id]={entry:e,total:0};
totals[e.id].total+=amt;
});
});
return Object.values(totals);
})():null;
const yearInc=yearEntryTotals?yearEntryTotals.filter(({entry:e})=>e.type==="income"):[];
const yearExp=yearEntryTotals?yearEntryTotals.filter(({entry:e})=>e.type==="expense"):[];
const yearTotalIn=yearInc.reduce((s,{total})=>s+total,0);
const yearTotalOut=yearExp.reduce((s,{total})=>s+total,0);
return(
<div className="card" style={{padding:16}}>
<div style={{fontSize:14,fontWeight:700,color:C.t2,marginBottom:14}}>Yearly View</div>
<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
{yearList.map(y=>(
<div key={y.year} onClick={()=>setSelYear(selYear===y.year?null:y.year)} style={{background:selYear===y.year?"rgba(110,231,183,.18)":C.bg,border:`1px solid ${selYear===y.year?C.green:y.isCurrent?C.green:C.border}`,borderRadius:10,padding:"8px 10px",opacity:y.isFuture?0.35:1,cursor:"pointer"}}>
<div style={{fontSize:11,fontWeight:700,color:y.isCurrent?C.green:C.t3,marginBottom:4}}>{y.year}</div>
{y.isFuture?<div style={{fontSize:10,color:C.t5}}>—</div>:<>
{y.inc>0&&<div style={{fontSize:10,fontFamily:"'DM Sans',sans-serif",fontWeight:700,letterSpacing:"-0.02em",color:C.green}}>+{fmtS(y.inc)}</div>}
{y.exp>0&&<div style={{fontSize:10,fontFamily:"'DM Sans',sans-serif",fontWeight:700,letterSpacing:"-0.02em",color:C.red}}>−{fmtS(y.exp)}</div>}
{y.sav>0&&<div style={{fontSize:10,fontFamily:"'DM Sans',sans-serif",fontWeight:700,letterSpacing:"-0.02em",color:C.cyan}}>↑{fmtS(y.sav)}</div>}
{!y.inc&&!y.exp&&!y.sav&&<div style={{fontSize:10,color:C.t5}}>—</div>}
</>}
</div>
))}
</div>
<div style={{display:"flex",gap:14,fontSize:10,color:C.t3,marginTop:12,flexWrap:"wrap"}}>
<div style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,background:C.green,borderRadius:2,display:"inline-block"}}/>Income</div>
<div style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,background:C.red,borderRadius:2,display:"inline-block"}}/>Expenses</div>
<div style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,background:C.cyan,borderRadius:2,display:"inline-block"}}/>Savings</div>
</div>
{selYearData&&!selYearData.isFuture&&(
<div style={{borderTop:`1px solid ${C.border}`,paddingTop:14,marginTop:14}}>
<Row mb={12}><div style={{fontSize:13,fontWeight:700,color:C.t1}}>{selYearData.year}</div><button onClick={()=>setSelYear(null)} style={{background:"none",border:"none",color:C.t4,fontSize:18,cursor:"pointer"}}>×</button></Row>
{actualsMode?(()=>{
const yStr=String(selYearData.year);
const yTxns=syncedTransactions.filter(t=>t.date.startsWith(yStr));
const yInc=yTxns.filter(t=>t.ledgerlyType==='income').reduce((s,t)=>s+Math.abs(t.amount),0);
const yExp=yTxns.filter(t=>t.ledgerlyType==='expense'&&!t.isSavingsDeposit).reduce((s,t)=>s+Math.abs(t.amount),0);
const ySav=yTxns.filter(t=>t.isSavingsDeposit).reduce((s,t)=>s+Math.abs(t.amount),0);
const monthRows=Array.from({length:12},(_,m)=>{
const mStr=`${yStr}-${pad(m+1)}`;
const mTxns=yTxns.filter(t=>t.date.startsWith(mStr));
const mInc=mTxns.filter(t=>t.ledgerlyType==='income').reduce((s,t)=>s+Math.abs(t.amount),0);
const mExp=mTxns.filter(t=>t.ledgerlyType==='expense'&&!t.isSavingsDeposit).reduce((s,t)=>s+Math.abs(t.amount),0);
return{m,mInc,mExp,hasTxns:mTxns.length>0};
});
return(<>
{yTxns.length===0&&<div style={{textAlign:'center',padding:'16px 0',color:C.t5,fontSize:13}}>No transactions this year</div>}
{yTxns.length>0&&<>
<div style={{display:'flex',gap:12,marginBottom:12}}>
{yInc>0&&<div style={{flex:1,background:'rgba(110,231,183,.07)',borderRadius:8,padding:'8px 12px'}}><div style={{fontSize:10,color:C.t4,marginBottom:2}}>Income</div><Mono color={C.green} size={14}>+{fmt(yInc)}</Mono></div>}
{yExp>0&&<div style={{flex:1,background:'rgba(251,113,133,.07)',borderRadius:8,padding:'8px 12px'}}><div style={{fontSize:10,color:C.t4,marginBottom:2}}>Expenses</div><Mono color={C.red} size={14}>−{fmt(yExp)}</Mono></div>}
{ySav>0&&<div style={{flex:1,background:'rgba(6,182,212,.07)',borderRadius:8,padding:'8px 12px'}}><div style={{fontSize:10,color:C.t4,marginBottom:2}}>Savings</div><Mono color={C.cyan} size={14}>↑{fmt(ySav)}</Mono></div>}
</div>
<div style={{fontSize:11,fontWeight:700,color:C.t3,marginBottom:6,textTransform:'uppercase',letterSpacing:'.06em'}}>Monthly breakdown</div>
{monthRows.filter(r=>r.hasTxns).map(({m,mInc,mExp})=>(
<div key={m} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'5px 0',borderBottom:`1px solid ${C.border}`}}>
<span style={{fontSize:12,color:C.t3,width:34}}>{MON_SHORT[m]}</span>
{mInc>0?<Mono color={C.green} size={11}>+{fmtS(mInc)}</Mono>:<span/>}
{mExp>0?<Mono color={C.red} size={11}>−{fmtS(mExp)}</Mono>:<span/>}
<Mono color={mInc-mExp>=0?C.green:C.red} size={11}>{mInc-mExp>=0?'+':'−'}{fmtS(Math.abs(mInc-mExp))}</Mono>
</div>
))}
</>}
</>);
})():(
<>
{yearInc.length===0&&yearExp.length===0&&<div style={{textAlign:"center",padding:"16px 0",color:C.t5,fontSize:13}}>No payments this year</div>}
{yearInc.length>0&&<>
<Label color={C.green} mb={6}>Incoming</Label>
{yearInc.map(({entry:e,total})=>(
<div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",background:"rgba(110,231,183,.06)",borderRadius:8,marginBottom:4,borderLeft:`2px solid ${C.green}`}}>
<div><div style={{fontSize:12,fontWeight:600,color:C.t1}}>{e.label}</div><div style={{fontSize:10,color:C.t4}}>{e.category}{e.recur!=="One-off"?` · ${e.recur}`:""}</div></div>
<Mono color={C.green} size={13}>+{fmt(total)}</Mono>
</div>
))}
</>}
{yearExp.length>0&&<>
<Label color={C.red} mb={6}>Outgoings</Label>
{yearExp.map(({entry:e,total})=>(
<div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",background:"rgba(251,113,133,.06)",borderRadius:8,marginBottom:4,borderLeft:`2px solid ${C.red}`}}>
<div><div style={{fontSize:12,fontWeight:600,color:C.t1}}>{e.label}</div><div style={{fontSize:10,color:C.t4}}>{e.category}{e.recur!=="One-off"?` · ${e.recur}`:""}</div></div>
<Mono color={C.red} size={13}>−{fmt(total)}</Mono>
</div>
))}
</>}
{(yearInc.length>0||yearExp.length>0)&&(
<div style={{display:"flex",justifyContent:"space-between",borderTop:`1px solid ${C.border}`,paddingTop:10,marginTop:4}}>
{yearTotalIn>0&&<Mono color={C.green} size={12}>+{fmt(yearTotalIn)} in</Mono>}
{yearTotalOut>0&&<Mono color={C.red} size={12}>−{fmt(yearTotalOut)} out</Mono>}
{yearTotalIn>0&&yearTotalOut>0&&<Mono color={yearTotalIn-yearTotalOut>=0?C.green:C.red} size={12}>{yearTotalIn-yearTotalOut>=0?"+":"−"}{fmt(Math.abs(yearTotalIn-yearTotalOut))} net</Mono>}
</div>
)}
</>
)}
</div>
)}
</div>
);
}
if(isYearly){
let mInc=[],mExp=[],mTotalIn=0,mTotalOut=0;
if(selMonth!==null){
const seenIds=new Set();const monthEntries=[];
datesInRange(new Date(calYear,selMonth,1),new Date(calYear,selMonth+1,0)).forEach(d=>{entries.filter(e=>occursOn(e,d)).forEach(e=>{if(!seenIds.has(e.id)){seenIds.add(e.id);monthEntries.push(e);}});});
mInc=monthEntries.filter(e=>e.type==="income");
mExp=monthEntries.filter(e=>e.type==="expense");
mTotalIn=mInc.reduce((s,e)=>s+periodAmt(e,30.44),0);
mTotalOut=mExp.reduce((s,e)=>s+periodAmt(e,30.44),0);
}
return(
<div className="card" style={{padding:16}}>
<Row mb={14}><span style={{fontSize:14,fontWeight:700,color:C.t2}}>Monthly View</span>
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
if(actualsMode){
const mStr=`${calYear}-${pad(m+1)}`;
syncedTransactions.filter(t=>t.date.startsWith(mStr)).forEach(t=>{
if(t.ledgerlyType==='income')inc+=Math.abs(t.amount);
else if(t.ledgerlyType==='expense'&&!t.isSavingsDeposit)exp+=Math.abs(t.amount);
});
}else{
datesInRange(from,to).forEach(d=>{inc+=dailyTotal(entries,d,"income");exp+=dailyTotal(entries,d,"expense");});
}
const isCurrentMonth=calYear===today.getFullYear()&&m===today.getMonth();
return(
<div key={m} onClick={()=>setSelMonth(selMonth===m?null:m)} style={{background:selMonth===m?"rgba(110,231,183,.18)":isCurrentMonth?"rgba(110,231,183,.08)":C.bg,border:`1px solid ${selMonth===m?C.green:isCurrentMonth?C.green:C.border}`,borderRadius:10,padding:"8px 10px",cursor:"pointer"}}>
<div style={{fontSize:11,fontWeight:700,color:isCurrentMonth?C.green:C.t3,marginBottom:4}}>{MON_SHORT[m]}</div>
{inc>0&&<div style={{fontSize:11,fontFamily:F.sans,fontWeight:700,letterSpacing:"-0.02em",color:C.green}}>+{fmtS(inc)}</div>}
{exp>0&&<div style={{fontSize:11,fontFamily:F.sans,fontWeight:700,letterSpacing:"-0.02em",color:C.red}}>−{fmtS(exp)}</div>}
{!inc&&!exp&&<div style={{fontSize:10,color:C.t5}}>—</div>}
</div>
);
})}
</div>
{selMonth!==null&&(
<div style={{borderTop:`1px solid ${C.border}`,paddingTop:14,marginTop:14}}>
<Row mb={12}>
<span style={{fontSize:13,fontWeight:700,color:C.t1}}>{MON_SHORT[selMonth]} {calYear}</span>
<button onClick={()=>setSelMonth(null)} style={{background:"none",border:"none",color:C.t4,fontSize:18,cursor:"pointer"}}>×</button>
</Row>
{actualsMode?(()=>{
const mStr=`${calYear}-${pad(selMonth+1)}`;
const mTxns=syncedTransactions.filter(t=>t.date.startsWith(mStr));
const incTxns=mTxns.filter(t=>t.ledgerlyType==='income');
const expTxns=mTxns.filter(t=>t.ledgerlyType==='expense'&&!t.isSavingsDeposit);
const savTxns=mTxns.filter(t=>t.isSavingsDeposit);
const totalIn=incTxns.reduce((s,t)=>s+Math.abs(t.amount),0);
const totalOut=expTxns.reduce((s,t)=>s+Math.abs(t.amount),0);
return(<>
{mTxns.length===0&&<div style={{textAlign:'center',padding:'12px 0',color:C.t5,fontSize:13}}>No transactions this month</div>}
{incTxns.length>0&&<><Label color={C.green} mb={6}>Incoming</Label>
{incTxns.map(t=>(
<div key={t.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 10px',background:'rgba(110,231,183,.06)',borderRadius:8,marginBottom:4,borderLeft:`2px solid ${C.green}`}}>
<div><div style={{fontSize:12,fontWeight:600,color:C.t1}}>{t.merchant||t.description}</div><div style={{fontSize:10,color:C.t4}}>{t.ledgerlyCategory}</div></div>
<Mono color={C.green} size={13}>+{fmt(Math.abs(t.amount))}</Mono>
</div>
))}</>}
{expTxns.length>0&&<><Label color={C.red} mb={6}>Outgoings</Label>
{expTxns.map(t=>(
<div key={t.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 10px',background:'rgba(251,113,133,.06)',borderRadius:8,marginBottom:4,borderLeft:`2px solid ${C.red}`}}>
<div><div style={{fontSize:12,fontWeight:600,color:C.t1}}>{t.merchant||t.description}</div><div style={{fontSize:10,color:C.t4}}>{t.ledgerlyCategory}</div></div>
<Mono color={C.red} size={13}>−{fmt(Math.abs(t.amount))}</Mono>
</div>
))}</>}
{savTxns.length>0&&<><Label color={C.cyan} mb={6}>Savings</Label>
{savTxns.map(t=>(
<div key={t.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 10px',background:'rgba(6,182,212,.06)',borderRadius:8,marginBottom:4,borderLeft:`2px solid ${C.cyan}`}}>
<div><div style={{fontSize:12,fontWeight:600,color:C.t1}}>{t.merchant||t.description}</div><div style={{fontSize:10,color:C.t4}}>{t.ledgerlyCategory}</div></div>
<Mono color={C.cyan} size={13}>+{fmt(Math.abs(t.amount))}</Mono>
</div>
))}</>}
{(totalIn>0||totalOut>0)&&(
<div style={{display:'flex',justifyContent:'space-between',borderTop:`1px solid ${C.border}`,paddingTop:10,marginTop:4}}>
{totalIn>0&&<Mono color={C.green} size={12}>+{fmt(totalIn)} in</Mono>}
{totalOut>0&&<Mono color={C.red} size={12}>−{fmt(totalOut)} out</Mono>}
{totalIn>0&&totalOut>0&&<Mono color={totalIn-totalOut>=0?C.green:C.red} size={12}>{totalIn-totalOut>=0?'+':'−'}{fmtS(Math.abs(totalIn-totalOut))} net</Mono>}
</div>
)}
</>);
})():(
<>
{mInc.length===0&&mExp.length===0&&<div style={{textAlign:"center",padding:"12px 0",color:C.t5,fontSize:13}}>No entries this month</div>}
{mInc.length>0&&<>
<Label color={C.green} mb={6}>Income</Label>
{mInc.map(e=>(
<div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",background:"rgba(110,231,183,.06)",borderRadius:8,marginBottom:4,borderLeft:`2px solid ${C.green}`}}>
<div><div style={{fontSize:12,fontWeight:600,color:C.t1}}>{e.label}</div><div style={{fontSize:10,color:C.t4}}>{e.category}{e.recur!=="One-off"?` · ${e.recur}`:""}</div></div>
<Mono color={C.green} size={13}>+{fmt(periodAmt(e,30.44))}</Mono>
</div>
))}
</>}
{mExp.length>0&&<>
<Label color={C.red} mb={6}>Expenses</Label>
{mExp.map(e=>(
<div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",background:"rgba(251,113,133,.06)",borderRadius:8,marginBottom:4,borderLeft:`2px solid ${C.red}`}}>
<div><div style={{fontSize:12,fontWeight:600,color:C.t1}}>{e.label}</div><div style={{fontSize:10,color:C.t4}}>{e.category}{e.recur!=="One-off"?` · ${e.recur}`:""}</div></div>
<Mono color={C.red} size={13}>−{fmt(periodAmt(e,30.44))}</Mono>
</div>
))}
</>}
{(mInc.length>0||mExp.length>0)&&(
<div style={{display:"flex",justifyContent:"space-between",borderTop:`1px solid ${C.border}`,paddingTop:10,marginTop:4}}>
{mTotalIn>0&&<Mono color={C.green} size={12}>+{fmt(mTotalIn)} in</Mono>}
{mTotalOut>0&&<Mono color={C.red} size={12}>−{fmt(mTotalOut)} out</Mono>}
{mTotalIn>0&&mTotalOut>0&&<Mono color={mTotalIn-mTotalOut>=0?C.green:C.red} size={12}>{mTotalIn-mTotalOut>=0?"+":"−"}{fmt(Math.abs(mTotalIn-mTotalOut))} net</Mono>}
</div>
)}
</>
)}
</div>
)}
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
const dStr=dateKey(date);
const isFutureDate=date>today;
const dayTxns=actualsMode&&!isFutureDate?syncedTransactions.filter(t=>t.date===dStr):null;
const inc=actualsMode&&!isFutureDate?dayTxns.filter(t=>t.ledgerlyType==='income').reduce((s,t)=>s+Math.abs(t.amount),0):dailyTotal(entries,date,'income');
const exp=actualsMode&&!isFutureDate?dayTxns.filter(t=>t.ledgerlyType==='expense'&&!t.isSavingsDeposit).reduce((s,t)=>s+Math.abs(t.amount),0):dailyTotal(entries,date,'expense');
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
{actualsMode&&sel<=today?(()=>{
const dStr=dateKey(sel);
const dayTxns=syncedTransactions.filter(t=>t.date===dStr);
const incTxns=dayTxns.filter(t=>t.ledgerlyType==='income');
const expTxns=dayTxns.filter(t=>t.ledgerlyType==='expense'&&!t.isSavingsDeposit);
const savTxns=dayTxns.filter(t=>t.isSavingsDeposit);
const totalIn=incTxns.reduce((s,t)=>s+Math.abs(t.amount),0);
const totalOut=expTxns.reduce((s,t)=>s+Math.abs(t.amount),0);
return(<>
{dayTxns.length===0&&<div style={{textAlign:'center',padding:'16px 0',color:C.t5,fontSize:13}}>No transactions on this day</div>}
{incTxns.length>0&&<><Label color={C.green} mb={6}>Incoming</Label>
{incTxns.map(t=>(
<div key={t.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 10px',background:'rgba(110,231,183,.06)',borderRadius:8,marginBottom:4,borderLeft:`2px solid ${C.green}`}}>
<div><div style={{fontSize:12,fontWeight:600,color:C.t1}}>{t.merchant||t.description}</div><div style={{fontSize:10,color:C.t4}}>{t.ledgerlyCategory}</div></div>
<Mono color={C.green} size={13}>+{fmt(Math.abs(t.amount))}</Mono>
</div>
))}</>}
{expTxns.length>0&&<><Label color={C.red} mb={6}>Outgoings</Label>
{expTxns.map(t=>(
<div key={t.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 10px',background:'rgba(251,113,133,.06)',borderRadius:8,marginBottom:4,borderLeft:`2px solid ${C.red}`}}>
<div><div style={{fontSize:12,fontWeight:600,color:C.t1}}>{t.merchant||t.description}</div><div style={{fontSize:10,color:C.t4}}>{t.ledgerlyCategory}</div></div>
<Mono color={C.red} size={13}>−{fmt(Math.abs(t.amount))}</Mono>
</div>
))}</>}
{savTxns.length>0&&<><Label color={C.cyan} mb={6}>Savings</Label>
{savTxns.map(t=>(
<div key={t.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 10px',background:'rgba(6,182,212,.06)',borderRadius:8,marginBottom:4,borderLeft:`2px solid ${C.cyan}`}}>
<div><div style={{fontSize:12,fontWeight:600,color:C.t1}}>{t.merchant||t.description}</div><div style={{fontSize:10,color:C.t4}}>{t.ledgerlyCategory}</div></div>
<Mono color={C.cyan} size={13}>+{fmt(Math.abs(t.amount))}</Mono>
</div>
))}</>}
{(totalIn>0||totalOut>0)&&(
<div style={{display:'flex',justifyContent:'space-between',borderTop:`1px solid ${C.border}`,paddingTop:10,marginTop:4}}>
{totalIn>0&&<Mono color={C.green} size={12}>+{fmt(totalIn)} in</Mono>}
{totalOut>0&&<Mono color={C.red} size={12}>−{fmt(totalOut)} out</Mono>}
{totalIn>0&&totalOut>0&&<Mono color={totalIn-totalOut>=0?C.green:C.red} size={12}>{totalIn-totalOut>=0?'+':'−'}{fmtS(Math.abs(totalIn-totalOut))} net</Mono>}
</div>
)}
</>);
})():(
<>
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
</>
)}
</div>
)}
</div>
);
}

// ── UPCOMING PAYMENTS ─────────────────────────────────────────
function advanceDueDate(dateStr,recur){
const d=parseDt(dateStr);
if(recur==='Weekly')d.setDate(d.getDate()+7);
else if(recur==='Fortnightly')d.setDate(d.getDate()+14);
else if(recur==='Monthly')d.setMonth(d.getMonth()+1);
else if(recur==='Quarterly')d.setMonth(d.getMonth()+3);
else if(recur==='Yearly')d.setFullYear(d.getFullYear()+1);
return dateKey(d);
}
function effectiveNextDue(payment){
if(payment.recur==='One-off')return payment.dueDate;
let d=payment.dueDate;
while(d<todayStr)d=advanceDueDate(d,payment.recur);
return d;
}
function nextDueFromEntry(entry){
if(!entry.startDate||entry.recur==='One-off'||entry.recur==='Variable')return null;
let d=entry.startDate;
while(d<todayStr)d=advanceDueDate(d,entry.recur);
return d;
}
function PaymentForm({value,onChange,onSubmit,onCancel,submitLabel,akahuBalances=[]}){
return(
<div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:12,padding:14,marginBottom:12}}>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
<div style={{gridColumn:'1/-1'}}><label style={{fontSize:11,color:C.t3,display:'block',marginBottom:4}}>Name</label><input className="fi" placeholder="e.g. Car insurance" value={value.name} onChange={e=>onChange(f=>({...f,name:e.target.value}))} style={{padding:'8px 12px'}}/></div>
<div><label style={{fontSize:11,color:C.t3,display:'block',marginBottom:4}}>Total amount ($)</label><input className="fi" type="text" inputMode="decimal" value={value.amount} onFocus={e=>e.target.select()} onChange={e=>onChange(f=>({...f,amount:e.target.value}))} style={{padding:'8px 12px'}}/></div>
<div><label style={{fontSize:11,color:C.t3,display:'block',marginBottom:4}}>Already saved ($)</label><input className="fi" type="text" inputMode="decimal" value={value.saved} onFocus={e=>e.target.select()} onChange={e=>onChange(f=>({...f,saved:e.target.value}))} style={{padding:'8px 12px'}}/></div>
<div><label style={{fontSize:11,color:C.t3,display:'block',marginBottom:4}}>Due date</label><input className="fi" type="date" value={value.dueDate} onChange={e=>onChange(f=>({...f,dueDate:e.target.value}))} style={{padding:'8px 12px'}}/></div>
<div><label style={{fontSize:11,color:C.t3,display:'block',marginBottom:4}}>Frequency</label><select className="fi" value={value.recur} onChange={e=>onChange(f=>({...f,recur:e.target.value}))} style={{padding:'8px 12px'}}>{['Weekly','Fortnightly','Monthly','Quarterly','Yearly','One-off'].map(r=><option key={r}>{r}</option>)}</select></div>
{AKAHU_ENABLED&&akahuBalances.length>0&&<div style={{gridColumn:'1/-1'}}><label style={{fontSize:11,color:C.t3,display:'block',marginBottom:4}}>Link to Akahu account (auto-updates saved amount)</label><select className="fi" value={value.akahuAccountId||''} onChange={e=>onChange(f=>({...f,akahuAccountId:e.target.value}))} style={{padding:'8px 12px'}}><option value=''>— not linked —</option>{akahuBalances.filter(a=>a.type!=='LOAN').map(a=><option key={a.id} value={a.id}>{a.name} — ${a.balance?.toLocaleString('en-NZ',{minimumFractionDigits:2,maximumFractionDigits:2})}</option>)}</select></div>}
</div>
<div style={{display:'flex',gap:8}}><GradBtn onClick={onSubmit}>{submitLabel}</GradBtn><button onClick={onCancel} className="rb" style={{flex:'none'}}>Cancel</button></div>
</div>
);
}
function UpcomingPayments({payments,setPayments,entries=[],displayPeriod='monthly',akahuBalances=[]}){
const[showAdd,setShowAdd]=useState(false);
const[showImport,setShowImport]=useState(false);
const[editingId,setEditingId]=useState(null);
const BLANK={name:'',amount:'',dueDate:todayStr,recur:'Monthly',saved:0,akahuAccountId:''};
const[form,setForm]=useState(BLANK);
const[editDraft,setEditDraft]=useState(null);
const sorted=useMemo(()=>payments.map(p=>({...p,_next:effectiveNextDue(p)})).sort((a,b)=>a._next.localeCompare(b._next)),[payments]);
const in30=useMemo(()=>{const d=parseDt(todayStr);d.setDate(d.getDate()+30);return dateKey(d);},[]);
const totalDue30=sorted.filter(p=>p._next<=in30).reduce((s,p)=>s+p.amount,0);
const importable=useMemo(()=>entries.filter(e=>e.type==='expense'&&e.recur!=='One-off'&&e.recur!=='Variable'&&!SAVINGS_CATS.has(e.category)&&nextDueFromEntry(e)&&!payments.some(p=>p.entryId===e.id)),[entries,payments]);
function urgencyColor(daysUntil){
if(daysUntil<0)return C.red;
if(daysUntil<=3)return 'rgba(251,113,133,.4)';
if(daysUntil<=7)return 'rgba(251,191,36,.4)';
if(daysUntil<=14)return 'rgba(6,182,212,.3)';
return C.border;
}
function urgencyBadge(daysUntil){
if(daysUntil<0)return <span style={{marginLeft:6,fontSize:9,background:'rgba(251,113,133,.15)',color:C.red,borderRadius:4,padding:'1px 5px',fontWeight:700}}>Overdue</span>;
if(daysUntil<=3)return <span style={{marginLeft:6,fontSize:9,background:'rgba(251,113,133,.15)',color:C.red,borderRadius:4,padding:'1px 5px',fontWeight:700}}>Due in {daysUntil}d</span>;
if(daysUntil<=7)return <span style={{marginLeft:6,fontSize:9,background:'rgba(251,191,36,.15)',color:C.amber,borderRadius:4,padding:'1px 5px',fontWeight:700}}>Due in {daysUntil}d</span>;
if(daysUntil<=14)return <span style={{marginLeft:6,fontSize:9,background:'rgba(6,182,212,.15)',color:C.cyan,borderRadius:4,padding:'1px 5px',fontWeight:700}}>Due in {daysUntil}d</span>;
return null;
}
const perPeriod=p=>{
const pDays=PERIODS.find(x=>x.key===displayPeriod).days;
const daysUntilDue=Math.max(0,Math.round((parseDt(p._next||p.dueDate)-new Date(todayStr))/86400000));
const periodsLeft=Math.max(1,daysUntilDue/pDays);
const remaining=Math.max(0,p.amount-(p.saved||0));
return remaining/periodsLeft;
};
function markPaid(p){
setPayments(prev=>prev.map(x=>{if(x.id!==p.id)return x;if(x.recur==='One-off')return null;return{...x,dueDate:advanceDueDate(effectiveNextDue(x),x.recur),saved:0};}).filter(Boolean));
}
function handleAdd(){
if(!form.name||!form.amount||!form.dueDate)return;
setPayments(prev=>[...prev,{...form,amount:Number(form.amount)||0,saved:Number(form.saved)||0,id:Date.now()}]);
setForm(BLANK);setShowAdd(false);
}
function handleSaveEdit(){
if(!editDraft)return;
setPayments(prev=>prev.map(p=>p.id===editingId?{...editDraft,amount:Number(editDraft.amount)||0,saved:Number(editDraft.saved)||0}:p));
setEditingId(null);setEditDraft(null);
}
function importEntry(e){
const next=nextDueFromEntry(e);if(!next)return;
setPayments(prev=>[...prev,{id:Date.now(),name:e.label,amount:Math.round(periodAmt(e,30)*100)/100,dueDate:next,recur:e.recur,entryId:e.id,saved:0,akahuAccountId:''}]);
}
return(
<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:20,marginBottom:16}}>
<Row mb={sorted.length>0||showAdd||showImport?12:0}>
<div style={{fontSize:13,fontWeight:700,color:C.t2}}>Upcoming Payments</div>
<div style={{display:'flex',gap:6}}>
{importable.length>0&&<button onClick={()=>{setShowImport(v=>!v);setShowAdd(false);setEditingId(null);}} className={`rb ${showImport?'oo':''}`}>Import</button>}
<button onClick={()=>{setShowAdd(v=>!v);setShowImport(false);setEditingId(null);}} className={`rb ${showAdd?'on':''}`}>+ Add</button>
</div>
</Row>
{showImport&&importable.length>0&&(
<div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:12,padding:14,marginBottom:12}}>
<div style={{fontSize:12,fontWeight:700,color:C.t2,marginBottom:10}}>Import from recurring entries</div>
{importable.map(e=>(
<div key={e.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
<div><div style={{fontSize:13,color:C.t1}}>{e.label}</div><div style={{fontSize:11,color:C.t4}}>{e.recur} · {fmt(periodAmt(e,30))}/mo · next {nextDueFromEntry(e)}</div></div>
<button onClick={()=>importEntry(e)} className="rb">Import</button>
</div>
))}
</div>
)}
{showAdd&&<PaymentForm value={form} onChange={setForm} onSubmit={handleAdd} onCancel={()=>setShowAdd(false)} submitLabel="Add Payment" akahuBalances={akahuBalances}/>}
{sorted.length===0&&!showAdd&&!showImport&&<div style={{fontSize:13,color:C.t5,fontStyle:'italic',textAlign:'center',padding:'12px 0'}}>No upcoming payments tracked. Add one to stay ahead of bills.</div>}
{sorted.map(p=>{
const daysUntil=Math.round((new Date(p._next)-new Date(todayStr))/(1000*60*60*24));
const saved=p.saved||0;
const pct=p.amount>0?Math.min(100,(saved/p.amount)*100):0;
const linkedBal=AKAHU_ENABLED&&p.akahuAccountId?akahuBalances.find(a=>a.id===p.akahuAccountId):null;
if(editingId===p.id&&editDraft){
return <PaymentForm key={p.id} value={editDraft} onChange={setEditDraft} onSubmit={handleSaveEdit} onCancel={()=>{setEditingId(null);setEditDraft(null);}} submitLabel="Save Changes" akahuBalances={akahuBalances}/>;
}
return(
<div key={p.id} style={{background:C.bg,border:`1px solid ${urgencyColor(daysUntil)}`,borderRadius:12,padding:'14px 16px',marginBottom:10}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
<div>
<div style={{fontSize:13,fontWeight:700,color:C.t1}}>{p.name}</div>
<div style={{fontSize:11,color:C.t4,marginTop:2}}>Due {p._next}{urgencyBadge(daysUntil)}</div>
</div>
<div style={{textAlign:'right'}}>
<Mono color={C.green} size={13}>{fmtS(saved)}</Mono>
<div style={{fontSize:10,color:C.t4}}>of {fmtS(p.amount)}</div>
{linkedBal&&<div style={{fontSize:10,color:C.cyan,marginTop:2}}>Live · {linkedBal.name}</div>}
</div>
</div>
<div style={{height:8,background:C.border,borderRadius:4,overflow:'hidden',marginBottom:8}}>
<div style={{height:'100%',width:`${pct}%`,background:`linear-gradient(90deg,${C.green},${C.green}88)`,borderRadius:4,transition:'width .6s ease'}}/>
</div>
<div style={{fontSize:11,color:C.t4,marginBottom:8}}>
{saved>=p.amount
?<span style={{color:C.green,fontWeight:700}}>Fully funded ✓</span>
:`Set aside ${fmt(perPeriod(p))} per ${PWORD[displayPeriod]} · ${pct.toFixed(0)}% · ${fmtS(Math.max(0,p.amount-saved))} to go`
}
</div>
{p.entryId&&(()=>{const linked=entries.find(e=>e.id===p.entryId||String(e.id)===String(p.entryId));return linked?(<div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8,padding:'6px 10px',background:'rgba(110,231,183,.05)',borderRadius:8,border:'1px solid rgba(110,231,183,.1)'}}><span style={{fontSize:10,color:C.t4}}>Linked to</span><span style={{fontSize:10,color:C.t2,fontWeight:600}}>{linked.label}</span><span style={{fontSize:10,color:C.t4}}>· {linked.category} · {linked.recur}</span></div>):null;})()}
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<Mono color={C.t4} size={11}>{pct.toFixed(0)}%</Mono>
<div style={{display:'flex',gap:6}}>
<button onClick={()=>{const amt=Number(prompt(`Add to "${p.name}" ($):`));if(amt>0)setPayments(prev=>prev.map(x=>x.id===p.id?{...x,saved:(x.saved||0)+amt}:x));}} style={{background:'none',border:`1px solid ${C.border}`,borderRadius:5,padding:'2px 7px',color:C.t3,fontSize:10,cursor:'pointer'}}>+ Add</button>
<button onClick={()=>{setEditDraft({...p,amount:String(p.amount),saved:String(p.saved||0)});setEditingId(p.id);setShowAdd(false);setShowImport(false);}} style={{background:'none',border:`1px solid ${C.border}`,borderRadius:5,padding:'2px 7px',color:C.t3,fontSize:10,cursor:'pointer'}}>✎ Edit</button>
<button onClick={()=>markPaid(p)} style={{background:'none',border:`1px solid ${C.border}`,borderRadius:5,padding:'2px 7px',color:C.t3,fontSize:10,cursor:'pointer'}}>✓ Paid</button>
<button onClick={()=>setPayments(prev=>prev.filter(x=>x.id!==p.id))} style={{background:'none',border:'none',color:C.t5,cursor:'pointer',fontSize:13}}>×</button>
</div>
</div>
</div>
);
})}
{(()=>{const totalPerPeriod=payments.filter(p=>(p.saved||0)<p.amount).reduce((s,p)=>s+perPeriod({...p,_next:effectiveNextDue(p)}),0);return payments.length>0&&totalPerPeriod>0&&(
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:'10px 14px',marginBottom:8}}>
<div style={{fontSize:12,color:C.t3,fontWeight:600}}>Total to set aside</div>
<div style={{display:'flex',alignItems:'center',gap:6}}>
<Mono color={C.green} size={13}>{fmt(totalPerPeriod)}</Mono>
<span style={{fontSize:11,color:C.t4}}>per {PWORD[displayPeriod]}</span>
</div>
</div>
);})()}
{sorted.length>0&&(
<div style={{background:'rgba(99,102,241,.08)',border:`1px solid rgba(99,102,241,.2)`,borderRadius:10,padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:4}}>
<span style={{fontSize:12,color:C.t3}}>Due in next 30 days</span>
<Mono color={C.t1} size={14}>{fmt(totalDue30)}</Mono>
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
const scenarioSchedule=useMemo(()=>{
if(!scenario.active)return[];
const extra=Number(scenario.extraMonthly)||0;
const lump0=Number(scenario.lumpAtStart)||0;
if(!cfg.principal||!cfg.annualRate||!cfg.termYears)return[];
const rateAt=mi=>{let r=cfg.annualRate;rateChanges.slice().sort((a,b)=>a.month-b.month).forEach(rc=>{if(mi>=rc.month)r=rc.rate;});return r;};
let bal=Math.max(0,cfg.principal-lump0);
const sc=[];const start=parseDt(cfg.startDate);
for(let mi=0;mi<cfg.termYears*12&&bal>0.01;mi++){
const ar=rateAt(mi),mo=ar/100/12,n=cfg.termYears*12-mi;
const payment=bal*mo*Math.pow(1+mo,n)/(Math.pow(1+mo,n)-1);
const lump=(lumpSums.find(l=>l.month===mi)||{amount:0}).amount;
const interest=bal*mo,principalPart=Math.min(payment-interest,bal);
const extraPrin=Math.min(extra,Math.max(0,bal-principalPart-lump));
bal=Math.max(0,bal-principalPart-lump-extraPrin);
const date=new Date(start);date.setMonth(date.getMonth()+mi);
sc.push({mi,date,payment:payment+lump+extraPrin,interest,principal:principalPart+lump+extraPrin,lump:lump+extraPrin,balance:bal,rate:ar});
}
return sc;
},[scenario,cfg,rateChanges,lumpSums]);
const scActive=scenario.active&&scenarioSchedule.length>0;
const scMonthlyPmt=scenarioSchedule.length?scenarioSchedule[0].payment:0;
const scPeriodPmt=scMonthlyPmt*(pDays/30.44);
const scTotalInterest=scenarioSchedule.reduce((s,m)=>s+m.interest,0);
const scTotalCost=cfg.principal+scTotalInterest;
const scPaidOff=scenarioSchedule.length?scenarioSchedule[scenarioSchedule.length-1].date:null;
const scYearsLeft=scenarioSchedule.length/12;
const scData=useMemo(()=>scActive?scenarioSchedule.filter((_,i)=>i%12===0).map((m,yi)=>({year:m.date.getFullYear(),balance:m.balance,interest:scenarioSchedule.slice(yi*12,(yi+1)*12).reduce((s,x)=>s+x.interest,0),principal:scenarioSchedule.slice(yi*12,(yi+1)*12).reduce((s,x)=>s+x.principal,0),lump:scenarioSchedule.slice(yi*12,(yi+1)*12).reduce((s,x)=>s+x.lump,0)})):null,[scenarioSchedule,scActive]);
const scenPath=scActive&&scData?scData.map((d,i)=>`${i===0?"M":"L"}${xScale(i)},${yScale(Math.max(0,d.balance))}`).join(" "):null;
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
{schedule.length>0?(()=>{const cur=schedule.find(m=>new Date(m.date)>=new Date(todayStr));const bal=cur?cur.balance:schedule[schedule.length-1].balance;return <><Mono color={C.t1} size={22}>{fmt(bal)}</Mono><div style={{fontSize:11,color:C.t3,marginTop:2}}>Original loan: <span style={{color:C.t2,fontFamily:F.sans,fontWeight:700,letterSpacing:"-0.02em"}}>{fmt(cfg.principal)}</span></div></>;})():<Mono color={C.t1} size={22}>{fmt(cfg.principal)}</Mono>}
<div style={{fontSize:12,color:C.t3,marginTop:2}}>{cfg.annualRate}% p.a. · {cfg.termYears} yr · from {cfg.startDate}</div>
</div>
<Btn onClick={()=>{setCfgD(cfg);setShowSetup(s=>!s);}} bg={showSetup?"rgba(110,231,183,.15)":C.border} border={showSetup?C.green:C.t5} color={showSetup?C.green:C.t2}><span style={{display:'flex',alignItems:'center',gap:5}}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>Setup</span></Btn>
</Row>
<div className="hscroll" style={{gap:10}}>
{(scActive?[
{label:pmtLabel,val:fmt(scPeriodPmt),color:C.purple,diff:`+${fmt(scPeriodPmt-periodPmt)} extra/${displayPeriod}`},
{label:"Total Interest",val:fmt(scTotalInterest),color:C.purple,diff:`save ${fmt(totalInterest-scTotalInterest)}`},
{label:"Total Cost",val:fmt(scTotalCost),color:C.purple,diff:`save ${fmt(totalCost-scTotalCost)}`},
{label:"Paid Off",val:scPaidOff?`${MON_SHORT[scPaidOff.getMonth()]} ${scPaidOff.getFullYear()}`:"—",color:C.purple,diff:`${fmtN((schedule.length-scenarioSchedule.length)/12)} yrs earlier`},
{label:"Years Left",val:`${fmtN(scYearsLeft)} yrs`,color:C.purple,diff:`save ${fmtN(schedule.length/12-scYearsLeft)} yrs`},
]:[
{label:pmtLabel,val:fmt(periodPmt),color:C.t1},
{label:"Total Interest",val:fmt(totalInterest),color:C.red},
{label:"Total Cost",val:fmt(totalCost),color:C.amber},
{label:"Paid Off",val:paidOff?`${MON_SHORT[paidOff.getMonth()]} ${paidOff.getFullYear()}`:"—",color:C.green},
{label:"Years Left",val:`${fmtN(schedule.length/12)} yrs`,color:C.cyan},
]).map(s=>(
<div key={s.label} style={{background:scActive?"rgba(167,139,250,.07)":"rgba(255,255,255,.03)",border:`1px solid ${scActive?"rgba(167,139,250,.3)":C.border}`,borderRadius:10,padding:"10px 14px",minWidth:130,flexShrink:0}}>
<div style={{fontSize:10,color:C.t4,marginBottom:4,textTransform:"uppercase",letterSpacing:".06em"}}>{s.label}</div>
<Mono color={s.color} size={14}>{s.val}</Mono>
{s.diff&&<div style={{fontSize:10,color:C.purple,marginTop:3}}>{s.diff}</div>}
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
{chartView==='split'&&data.map((d,i)=>{
const x=LPAD+i*(barW+1);
const chartH=H-LPAD-RPAD*2;
const intH=(d.interest/maxStack)*chartH;
const prinH=(d.principal/maxStack)*chartH;
const lumpH=(d.lump/maxStack)*chartH;
const sd=scActive&&scData?scData.find(s=>s.year===d.year):null;
const scIntH=sd?(sd.interest/maxStack)*chartH:0;
const scPrinH=sd?(sd.principal/maxStack)*chartH:0;
const scLumpH=sd?(sd.lump/maxStack)*chartH:0;
const splitY=H-LPAD-prinH-lumpH;
return(
<g key={i}>
<rect x={x} y={H-LPAD-intH-prinH-lumpH} width={barW} height={intH} rx={1} fill={C.red} opacity={scActive?.2:.8}/>
<rect x={x} y={H-LPAD-prinH-lumpH} width={barW} height={prinH} rx={1} fill={C.green} opacity={scActive?.2:.8}/>
{d.lump>0&&<rect x={x} y={H-LPAD-lumpH} width={barW} height={lumpH} rx={1} fill={C.purple} opacity={scActive?.2:.9}/>}
{sd&&<>
<rect x={x} y={H-LPAD-scIntH-scPrinH-scLumpH} width={barW} height={scIntH} rx={1} fill={C.red} opacity={.85}/>
<rect x={x} y={H-LPAD-scPrinH-scLumpH} width={barW} height={scPrinH} rx={1} fill={C.green} opacity={.85}/>
{sd.lump>0&&<rect x={x} y={H-LPAD-scLumpH} width={barW} height={scLumpH} rx={1} fill={C.purple} opacity={.9}/>}
<line x1={x} y1={splitY} x2={x+barW} y2={splitY} stroke={C.amber} strokeWidth={1} opacity={.5}/>
</>}
</g>
);
})}
{data.map((d,i)=>i%5===0?<text key={i} x={xScale(i)} y={H+18} textAnchor="middle" fill={C.t5} fontSize={9}>{d.year}</text>:null)}
{hoverIdx!==null&&data[hoverIdx]&&<line x1={xScale(hoverIdx)} y1={RPAD*2} x2={xScale(hoverIdx)} y2={H-LPAD} stroke={C.t4} strokeWidth={1} strokeDasharray="2 2"/>}
</svg>
</div>
{hoverIdx!==null&&data[hoverIdx]&&(
<div style={{background:C.border,border:`1px solid ${C.t5}`,borderRadius:10,padding:"10px 14px",marginTop:8,display:"flex",gap:16,flexWrap:"wrap"}}>
<div style={{fontSize:12,fontWeight:700,color:C.t1,minWidth:"100%"}}>{data[hoverIdx].year}</div>
{(()=>{const scDH=scActive&&scData?scData.find(s=>s.year===data[hoverIdx].year):null;return[{l:"Balance",v:fmt(data[hoverIdx].balance),c:C.green},{l:"Interest",v:fmt(data[hoverIdx].interest),c:C.red},{l:"Principal",v:fmt(data[hoverIdx].principal),c:C.green},...(data[hoverIdx].lump>0?[{l:"Lump sum",v:fmt(data[hoverIdx].lump),c:C.purple}]:[]),...(scDH?[{l:"Sc. balance",v:fmt(scDH.balance),c:C.purple},{l:"Sc. interest",v:fmt(scDH.interest),c:C.purple}]:[])];})().map(s=>(
<div key={s.l}><div style={{fontSize:10,color:C.t3}}>{s.l}</div><Mono color={s.c} size={12}>{s.v}</Mono></div>
))}
</div>
)}
<div style={{display:"flex",gap:12,marginTop:10,flexWrap:"wrap",fontSize:10,color:C.t3}}>
{chartView==="balance"&&<><div style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:16,height:2,background:C.green,display:"inline-block",borderRadius:1}}/>Balance</div>{scenario.active&&<div style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:16,height:2,background:C.purple,display:"inline-block",borderRadius:1}}/>Scenario</div>}<div style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:8,height:8,background:C.amber,display:"inline-block",borderRadius:"50%"}}/>Rate change</div><div style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:8,height:8,background:C.purple,display:"inline-block",borderRadius:"50%"}}/>Lump sum</div></>}
{chartView==="split"&&<>
<div style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:10,height:10,background:C.red,display:"inline-block",borderRadius:2,opacity:.85}}/>Interest</div>
<div style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:10,height:10,background:C.green,display:"inline-block",borderRadius:2,opacity:.85}}/>Principal</div>
<div style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:10,height:10,background:C.purple,display:"inline-block",borderRadius:2,opacity:.9}}/>Lump sum</div>
{scActive&&<div style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:16,height:2,background:C.amber,display:"inline-block",borderRadius:1,opacity:.7}}/>Base split</div>}
{scActive&&<div style={{fontSize:10,color:C.purple,marginLeft:"auto"}}>Showing what-if scenario</div>}
</>}
</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:16}}>
{(scActive?[
{label:"Interest over life",val:fmt(scTotalInterest),color:C.purple,pct:fmtN(scTotalInterest/scTotalCost*100),barColor:C.purple,diff:`save ${fmt(totalInterest-scTotalInterest)}`},
{label:"Principal",val:fmt(cfg.principal),color:C.green,pct:fmtN(cfg.principal/scTotalCost*100),barColor:C.green},
]:[
{label:"Interest over life",val:fmt(totalInterest),color:C.red,pct:fmtN(totalInterest/totalCost*100),barColor:C.red},
{label:"Principal",val:fmt(cfg.principal),color:C.green,pct:fmtN(cfg.principal/totalCost*100),barColor:C.green},
]).map(s=>(
<div key={s.label} style={{background:C.bg,border:`1px solid ${scActive&&s.diff?'rgba(167,139,250,.25)':C.border}`,borderRadius:12,padding:"12px 14px"}}>
<div style={{fontSize:10,color:C.t3,marginBottom:6,textTransform:"uppercase",letterSpacing:".06em"}}>{s.label}</div>
<Mono color={s.color} size={16}>{s.val}</Mono>
<div style={{fontSize:11,color:C.t4,marginTop:3}}>{s.pct}% of total cost</div>
{s.diff&&<div style={{fontSize:11,color:C.purple,marginTop:2,fontWeight:600}}>{s.diff}</div>}
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
function NetWorthWidget({mortgageSchedule,mortgagePrincipal,assets,setAssets,liabilities,setLiabilities,snapshots,setSnapshots,akahuBalances=[],syncedTransactions=[],entries=[]}){
const[editMode,setEditMode]=useState(false);
const[hoverSnap,setHoverSnap]=useState(null);
const[showRetirement,setShowRetirement]=useState(false);
const[useCustomTarget,setUseCustomTarget]=useState(false);
const[customTarget,setCustomTarget]=useState('');
const[withdrawalRate]=useState(0.04);
const[showFILine,setShowFILine]=useState(false);
const[showAssumptions,setShowAssumptions]=useState(false);
const[nominalReturn,setNominalReturn]=useState('7.0');
const[inflationRate,setInflationRate]=useState('2.5');
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
const suggestedAnnualExpenses=useMemo(()=>{
if(syncedTransactions.length>0){
const oneYearAgo=new Date();oneYearAgo.setFullYear(oneYearAgo.getFullYear()-1);
const oneYearAgoStr=dateKey(oneYearAgo);
const total=syncedTransactions.filter(t=>t.ledgerlyType==='expense'&&!t.isSavingsDeposit&&t.date>oneYearAgoStr&&t.date<=todayStr).reduce((s,t)=>s+Math.abs(t.amount),0);
if(total>0)return total;
}
const annualFromEntries=entries.filter(e=>e.type==='expense'&&e.recur!=='One-off'&&!SAVINGS_CATS.has(e.category)).reduce((s,e)=>s+periodAmt(e,365),0);
return annualFromEntries;
},[syncedTransactions,entries]);
const fiTarget=useMemo(()=>{
if(useCustomTarget&&Number(customTarget)>0)return Number(customTarget);
if(suggestedAnnualExpenses>0)return Math.round(suggestedAnnualExpenses/withdrawalRate);
return 0;
},[useCustomTarget,customTarget,suggestedAnnualExpenses,withdrawalRate]);
const fiPct=fiTarget>0?Math.min(100,(netWorth/fiTarget)*100):0;
const fiGap=Math.max(0,fiTarget-netWorth);
const realMonthlyReturn=useMemo(()=>{
const real=Math.max(0,(parseFloat(nominalReturn)||0)-(parseFloat(inflationRate)||0))/100;
return Math.pow(1+real,1/12)-1;
},[nominalReturn,inflationRate]);
const trajectory=useMemo(()=>{
if(snapshots.length<12)return null;
const sorted=[...snapshots].sort((a,b)=>a.date.localeCompare(b.date));
const recent=sorted.slice(-12);
const monthlyGrowths=[];
for(let i=1;i<recent.length;i++)monthlyGrowths.push(recent[i].netWorth-recent[i-1].netWorth);
const avgMonthlyGrowth=monthlyGrowths.reduce((s,v)=>s+v,0)/monthlyGrowths.length;
if(avgMonthlyGrowth<=0)return null;
let monthsToFI;
if(realMonthlyReturn>0&&netWorth>0){
let balance=netWorth,months=0;
const maxMonths=12*100;
while(balance<fiTarget&&months<maxMonths){balance=balance*(1+realMonthlyReturn)+avgMonthlyGrowth;months++;}
monthsToFI=months<maxMonths?months:null;
}else{
monthsToFI=fiGap/avgMonthlyGrowth;
}
if(!monthsToFI)return null;
const yearsToFI=monthsToFI/12;
const targetYear=new Date().getFullYear()+Math.ceil(yearsToFI);
return{avgMonthlyGrowth,yearsToFI,targetYear,realReturnPct:((Math.pow(1+realMonthlyReturn,12)-1)*100)};
},[snapshots,fiGap,fiTarget,netWorth,realMonthlyReturn]);
const updateAsset=(id,field,val)=>setAssets(as=>as.map(a=>a.id===id?{...a,[field]:val}:a));
const updateLiab=(id,field,val)=>setLiabilities(ls=>ls.map(l=>l.id===id?{...l,[field]:val}:l));
const chartSnaps=snapshots.length>=2?snapshots:[...snapshots];
const W=360,H=120,PAD=28,RPAD=10;
const allVals=chartSnaps.map(s=>s.netWorth);
const minV=Math.min(...allVals,0);
const maxV=Math.max(...allVals,showFILine&&fiTarget>0?fiTarget:0,1);
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
<Btn onClick={()=>setEditMode(e=>!e)} bg={editMode?"rgba(110,231,183,.15)":C.border} border={editMode?C.green:C.t5} color={editMode?C.green:C.t2}>{editMode?"✓ Done":(<span style={{display:'flex',alignItems:'center',gap:5}}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit</span>)}</Btn>
</Row>
<div style={{marginBottom:18}}>
<div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.t3,marginBottom:6}}><span>Equity {fmtN(equityPct)}%</span><span>Liabilities {fmtN(100-equityPct)}%</span></div>
<div style={{height:10,background:C.border,borderRadius:5,overflow:"hidden",display:"flex"}}>
<div style={{height:"100%",width:`${equityPct}%`,background:`linear-gradient(90deg,${C.green},#3b82f6)`,borderRadius:5,transition:"width .6s ease"}}/>
</div>
</div>
{editMode?(
<div style={{marginBottom:16}}>
<div style={{background:"rgba(110,231,183,.06)",border:`1px solid rgba(110,231,183,.15)`,borderRadius:12,padding:"12px 14px",marginBottom:10}}>
<div style={{fontSize:12,color:C.t3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>Assets <Mono color={C.green} size={14}>{fmt(totalAssets)}</Mono></div>
{assets.map(a=>(
<div key={a.id} style={{marginTop:6}}>
<div style={{display:"flex",alignItems:"center",gap:6}}>
<input className="ci" value={a.label} placeholder="Asset name" onChange={e=>updateAsset(a.id,"label",e.target.value)} style={{flex:1,minWidth:0,background:C.bg,border:`1px solid ${C.t5}`,borderRadius:6,padding:"6px 8px",color:C.t1,fontSize:16,boxSizing:"border-box"}}/>
<input className="ci" type="text" inputMode="decimal" value={a.value===0?"":a.value} placeholder="0" onFocus={e=>e.target.select()} onChange={e=>updateAsset(a.id,"value",e.target.value)} style={{width:88,flexShrink:0,background:C.bg,border:`1px solid ${C.t5}`,borderRadius:6,padding:"6px 8px",color:C.green,fontSize:16,fontFamily:F.mono,textAlign:"right",boxSizing:"border-box"}}/>
<button onClick={()=>setAssets(as=>as.filter(x=>x.id!==a.id))} style={{background:"none",border:"none",color:C.t4,cursor:"pointer",fontSize:16,lineHeight:1,flexShrink:0}}>×</button>
</div>
{AKAHU_ENABLED&&<select value={a.akahuAccountId||''} onChange={e=>updateAsset(a.id,'akahuAccountId',e.target.value)} style={{width:'100%',marginTop:4,background:C.bg,border:`1px solid ${C.t5}`,borderRadius:6,padding:'4px 8px',color:C.t3,fontSize:12,boxSizing:'border-box'}}>
<option value=''>— no account link —</option>
{akahuBalances.filter(b=>b.type!=='LOAN').map(b=>(
<option key={b.id} value={b.id}>{b.name} · ${b.balance?.toLocaleString('en-NZ',{minimumFractionDigits:2,maximumFractionDigits:2})}</option>
))}
</select>}
</div>
))}
<button onClick={()=>setAssets(as=>[...as,{id:Date.now(),label:"New Asset",value:0}])} style={{marginTop:10,background:"none",border:`1px solid ${C.border}`,borderRadius:6,padding:"5px 10px",color:C.t3,fontSize:11,cursor:"pointer",width:"100%"}}>+ Add Asset</button>
</div>
<div style={{background:"rgba(251,113,133,.06)",border:`1px solid rgba(251,113,133,.15)`,borderRadius:12,padding:"12px 14px"}}>
<div style={{fontSize:12,color:C.t3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>Liabilities <Mono color={C.red} size={14}>{fmt(totalLiabs)}</Mono></div>
{liabilities.map(l=>(
<div key={l.id} style={{marginTop:6}}>
<div style={{display:"flex",alignItems:"center",gap:6}}>
<input className="ci" value={l.label} placeholder="Liability name" onChange={e=>updateLiab(l.id,"label",e.target.value)} style={{flex:1,minWidth:0,background:C.bg,border:`1px solid ${C.t5}`,borderRadius:6,padding:"6px 8px",color:C.t1,fontSize:16,boxSizing:"border-box"}}/>
<input className="ci" type="text" inputMode="decimal" value={l.linkMortgage?Math.round(liveBal):(l.value===0?"":l.value)} placeholder="0" onFocus={e=>e.target.select()} disabled={l.linkMortgage} onChange={e=>updateLiab(l.id,"value",e.target.value)} style={{width:88,flexShrink:0,background:C.bg,border:`1px solid ${C.t5}`,borderRadius:6,padding:"6px 8px",color:C.red,fontSize:16,fontFamily:F.mono,textAlign:"right",opacity:l.linkMortgage?.7:1,boxSizing:"border-box"}}/>
<button onClick={()=>setLiabilities(ls=>ls.filter(x=>x.id!==l.id))} style={{background:"none",border:"none",color:C.t4,cursor:"pointer",fontSize:16,lineHeight:1,flexShrink:0}}>×</button>
</div>
{AKAHU_ENABLED&&<select value={l.akahuAccountId||''} onChange={e=>updateLiab(l.id,'akahuAccountId',e.target.value)} style={{width:'100%',marginTop:4,background:C.bg,border:`1px solid ${C.t5}`,borderRadius:6,padding:'4px 8px',color:C.t3,fontSize:12,boxSizing:'border-box'}}>
<option value=''>— no account link —</option>
{akahuBalances.map(b=>(
<option key={b.id} value={b.id}>{b.name} · ${Math.abs(b.balance||0).toLocaleString('en-NZ',{minimumFractionDigits:2,maximumFractionDigits:2})}</option>
))}
</select>}
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
<span style={{fontFamily:F.sans,fontWeight:700,letterSpacing:"-0.02em",fontSize:11,color:C.green}}>{fmtS(a.value)}</span>
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
<span style={{fontFamily:F.sans,fontWeight:700,letterSpacing:"-0.02em",fontSize:11,color:C.red}}>{fmtS(l.linkMortgage?liveBal:l.value)}</span>
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
{showFILine&&fiTarget>0&&(()=>{const fiY=yS(fiTarget);return(<><line x1={PAD} y1={fiY} x2={W-RPAD} y2={fiY} stroke={C.amber} strokeWidth={1} strokeDasharray="4 3" opacity={.7}/><rect x={W-RPAD-42} y={fiY-8} width={40} height={16} rx={3} fill={C.card}/><text x={W-RPAD-4} y={fiY} fill={C.amber} fontSize={7} fontWeight="700" textAnchor="end" dominantBaseline="middle" opacity={.9}>FI target</text></>);})()}
{chartSnaps.map((s,i)=>(
<text key={i} x={xS(i)} y={H-2} fill={C.t5} fontSize={7} textAnchor={i===0?"start":i===chartSnaps.length-1?"end":"middle"}>{s.date.slice(0,7)}</text>
))}
{chartSnaps.map((s,i)=>(
<circle key={i} cx={xS(i)} cy={yS(s.netWorth)} r={hoverSnap===i?5:3} fill={hoverSnap===i?C.green:C.bg} stroke={C.green} strokeWidth={1.5} style={{cursor:"pointer"}} onClick={()=>setHoverSnap(hoverSnap===i?null:i)}/>
))}
{hoverSnap!==null&&chartSnaps[hoverSnap]&&(()=>{
const s=chartSnaps[hoverSnap],cx=xS(hoverSnap),cy=yS(s.netWorth);
const tx=cx>W*.7?cx-108:cx+8,ty=cy<40?cy+8:cy-52;
return <g><rect x={tx} y={ty} width={100} height={40} rx={6} fill={C.card} stroke={C.border}/><text x={tx+8} y={ty+14} fill={C.t3} fontSize={9}>{s.date}</text><text x={tx+8} y={ty+30} fill={C.green} fontSize={12} fontWeight="700" fontFamily="DM Sans" letterSpacing="-0.02em">{fmt(s.netWorth)}</text></g>;
})()}
</svg>
</div>
{fiTarget>0&&<div style={{display:'flex',alignItems:'center',gap:8,marginTop:8,marginBottom:4}}><button onClick={()=>setShowFILine(v=>!v)} className={`rb ${showFILine?'on':''}`} style={{fontSize:10}}>FI target</button>{showFILine&&<div style={{display:'flex',alignItems:'center',gap:4,fontSize:10,color:C.amber}}><span style={{width:16,height:2,background:C.amber,display:'inline-block',borderRadius:1,opacity:.7}}/>FI: {fmtS(fiTarget)}</div>}</div>}
{(()=>{
const first=snapshots[0],last=snapshots[snapshots.length-1];
const change=last.netWorth-first.netWorth,pct=first.netWorth!==0?(change/Math.abs(first.netWorth))*100:0;
return <div style={{display:"flex",gap:12,marginTop:8,flexWrap:"wrap"}}>
<div style={{background:C.bg,borderRadius:8,padding:"6px 12px"}}><div style={{fontSize:9,color:C.t3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:2}}>Change</div><Mono color={change>=0?C.green:C.red} size={12}>{change>=0?"+":"−"}{fmt(Math.abs(change))}</Mono></div>
<div style={{background:C.bg,borderRadius:8,padding:"6px 12px"}}><div style={{fontSize:9,color:C.t3,textTransform:"uppercase",letterSpacing:".06em",marginBottom:2}}>% Change</div><Mono color={pct>=0?C.green:C.red} size={12}>{pct>=0?"+":""}{fmtN(pct)}%</Mono></div>
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
{fiTarget>0&&(
<div className="card" style={{marginTop:-12}}>
<div onClick={()=>setShowRetirement(v=>!v)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer'}}>
<div>
<div style={{fontSize:13,fontWeight:700,color:C.t1}}>Retirement Planning</div>
<div style={{fontSize:11,color:C.t4,marginTop:2}}>Financial independence tracker</div>
</div>
<span style={{color:C.t4,fontSize:16,display:'inline-block',transform:showRetirement?'rotate(180deg)':'rotate(0deg)',transition:'transform .2s'}}>▾</span>
</div>
{showRetirement&&<>
<div style={{borderTop:`1px solid ${C.border}`,marginTop:14,paddingTop:14}}>
<div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:12,padding:'12px 14px',marginBottom:14}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
<div>
<div style={{fontSize:10,color:C.t3,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:4}}>FI Target <span style={{color:C.t5,textTransform:'none',letterSpacing:'normal'}}>(4% rule)</span></div>
<Mono color={C.amber} size={22}>{fmtS(fiTarget)}</Mono>
{!useCustomTarget&&suggestedAnnualExpenses>0&&<div style={{fontSize:10,color:C.t4,marginTop:3}}>{syncedTransactions.length>0?`Based on ${fmtS(suggestedAnnualExpenses)}/yr actual expenses ÷ 4%`:`Based on ${fmtS(suggestedAnnualExpenses)}/yr estimated expenses ÷ 4%`}</div>}
</div>
<button onClick={()=>{setUseCustomTarget(v=>!v);if(useCustomTarget)setCustomTarget('');}} style={{background:useCustomTarget?'rgba(110,231,183,.1)':'none',border:`1px solid ${useCustomTarget?C.green:C.t5}`,borderRadius:6,padding:'4px 8px',color:useCustomTarget?C.green:C.t4,fontSize:10,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>{useCustomTarget?'Using custom':'Override'}</button>
</div>
{useCustomTarget&&(
<div style={{marginTop:8}}>
<label style={{fontSize:11,color:C.t3,display:'block',marginBottom:4}}>Custom FI target ($)</label>
<input className="fi" type="text" inputMode="decimal" placeholder={suggestedAnnualExpenses>0?String(Math.round(suggestedAnnualExpenses/withdrawalRate)):'e.g. 1500000'} value={customTarget} onFocus={e=>e.target.select()} onChange={e=>setCustomTarget(e.target.value)} style={{padding:'8px 12px'}}/>
</div>
)}
<div style={{fontSize:10,color:C.t5,marginTop:8,fontStyle:'italic'}}>The 4% rule suggests you can withdraw 4% of your portfolio annually without depleting it. This is a guide only and does not account for inflation or market returns.</div>
</div>
<div style={{marginBottom:14}}>
<div onClick={()=>setShowAssumptions(v=>!v)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer',padding:'8px 12px',background:C.bg,border:`1px solid ${C.border}`,borderRadius:showAssumptions?'10px 10px 0 0':'10px'}}>
<div style={{display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:11,color:C.t3,fontWeight:600}}>Assumptions</span><span style={{fontSize:10,color:C.t5}}>Return {nominalReturn}% · Inflation {inflationRate}% · Real {fmtN(Math.max(0,(parseFloat(nominalReturn)||0)-(parseFloat(inflationRate)||0)))}%</span></div>
<span style={{color:C.t4,fontSize:13,display:'inline-block',transform:showAssumptions?'rotate(180deg)':'rotate(0deg)',transition:'transform .2s'}}>▾</span>
</div>
{showAssumptions&&(
<div style={{background:C.bg,border:`1px solid ${C.border}`,borderTop:'none',borderRadius:'0 0 10px 10px',padding:'12px 14px'}}>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
<div><label style={{fontSize:10,color:C.t3,display:'block',marginBottom:4}}>Nominal return (%)</label><input className="fi" type="text" inputMode="decimal" value={nominalReturn} onFocus={e=>e.target.select()} onChange={e=>setNominalReturn(e.target.value)} style={{padding:'6px 10px',fontSize:13}}/></div>
<div><label style={{fontSize:10,color:C.t3,display:'block',marginBottom:4}}>Inflation (%)</label><input className="fi" type="text" inputMode="decimal" value={inflationRate} onFocus={e=>e.target.select()} onChange={e=>setInflationRate(e.target.value)} style={{padding:'6px 10px',fontSize:13}}/></div>
<div><label style={{fontSize:10,color:C.t3,display:'block',marginBottom:4}}>Real return (%)</label><div style={{background:C.card,border:`1px solid ${C.t5}`,borderRadius:10,padding:'6px 10px'}}><Mono color={Math.max(0,(parseFloat(nominalReturn)||0)-(parseFloat(inflationRate)||0))>0?C.green:C.red} size={13}>{fmtN(Math.max(0,(parseFloat(nominalReturn)||0)-(parseFloat(inflationRate)||0)))}%</Mono></div></div>
</div>
<div style={{fontSize:10,color:C.t5,marginTop:8,fontStyle:'italic'}}>Real return = nominal return minus inflation. Used to project inflation-adjusted portfolio growth.</div>
</div>
)}
</div>
<div style={{marginBottom:14}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:8}}>
<div style={{fontSize:11,color:C.t3,textTransform:'uppercase',letterSpacing:'.06em'}}>Financial Independence</div>
<Mono color={fiPct>=100?C.green:C.amber} size={18}>{fmtN(fiPct)}%</Mono>
</div>
<div style={{height:12,background:C.border,borderRadius:6,overflow:'hidden',marginBottom:10}}>
<div style={{height:'100%',width:`${fiPct}%`,background:fiPct>=100?C.green:`linear-gradient(90deg,${C.green},${C.amber})`,borderRadius:6,transition:'width .6s ease'}}/>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
{[{label:'Current',val:fmtS(netWorth),color:netWorth>=0?C.green:C.red},{label:'Target',val:fmtS(fiTarget),color:C.amber},{label:'Gap',val:fmtS(fiGap),color:C.t2}].map(s=>(
<div key={s.label} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 10px'}}>
<div style={{fontSize:9,color:C.t3,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:3}}>{s.label}</div>
<Mono color={s.color} size={12}>{s.val}</Mono>
</div>
))}
</div>
</div>
{snapshots.length<12&&(
<div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:12,padding:'12px 14px',textAlign:'center'}}>
<div style={{fontSize:12,color:C.t4,marginBottom:4}}>Trajectory available after 12 monthly snapshots</div>
<div style={{fontSize:11,color:C.t5}}>{snapshots.length} of 12 snapshots recorded</div>
</div>
)}
{trajectory&&(
<div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:12,padding:'12px 14px'}}>
<div style={{fontSize:11,color:C.t3,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:10}}>Trajectory</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:10}}>
{[{label:'Monthly growth',val:`+${fmtS(trajectory.avgMonthlyGrowth)}`,color:trajectory.avgMonthlyGrowth>=0?C.green:C.red},{label:'Years to FI',val:`~${fmtN(trajectory.yearsToFI)} yrs`,color:C.t1},{label:'Target year',val:String(trajectory.targetYear),color:C.cyan}].map(s=>(
<div key={s.label} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 10px'}}>
<div style={{fontSize:9,color:C.t3,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:3}}>{s.label}</div>
<Mono color={s.color} size={12}>{s.val}</Mono>
</div>
))}
</div>
<div style={{fontSize:10,color:C.t5,fontStyle:'italic'}}>Based on your average monthly net worth growth over the last 12 snapshots, compounded at {fmtN(trajectory.realReturnPct)}% real return p.a. Accuracy improves over time.</div>
</div>
)}
</div>
</>}
</div>
)}
</div>
);
}

// ── GOALS ─────────────────────────────────────────────────────
function GoalForm({value,onChange,onSubmit,onCancel,submitLabel,fundEntries,pWord,akahuBalances}){
return(
<div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:12,padding:14,marginBottom:16}}>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
<div><label style={{fontSize:11,color:C.t3,display:"block",marginBottom:4}}>Goal name</label><input className="fi" placeholder="e.g. Holiday Fund" value={value.name} onChange={e=>onChange(d=>({...d,name:e.target.value}))} style={{padding:"8px 12px"}}/></div>
<div><label style={{fontSize:11,color:C.t3,display:"block",marginBottom:4}}>Target ($)</label><input className="fi" type="text" inputMode="decimal" value={value.target===0?"":value.target} onFocus={e=>e.target.select()} onChange={e=>onChange(d=>({...d,target:e.target.value}))} style={{padding:"8px 12px"}}/></div>
<div><label style={{fontSize:11,color:C.t3,display:"block",marginBottom:4}}>Already saved ($)</label><input className="fi" type="text" inputMode="decimal" value={value.saved===0?"":value.saved} onFocus={e=>e.target.select()} onChange={e=>onChange(d=>({...d,saved:e.target.value}))} style={{padding:"8px 12px"}}/></div>
<div><label style={{fontSize:11,color:C.t3,display:"block",marginBottom:4}}>Emoji</label><input className="fi" value={value.emoji} onChange={e=>onChange(d=>({...d,emoji:e.target.value}))} style={{padding:"6px 12px"}}/></div>
</div>
<div style={{marginBottom:12}}><label style={{fontSize:11,color:C.t3,display:"block",marginBottom:4}}>Link to entry</label><select className="fi" value={value.linkedEntryId||""} onChange={e=>onChange(d=>({...d,linkedEntryId:e.target.value}))} style={{padding:"8px 12px"}}><option value="">— not linked —</option>{fundEntries.map(e=><option key={e.id} value={e.id}>{e.label} ({e.category})</option>)}</select></div>
{AKAHU_ENABLED&&<div style={{marginBottom:12}}>
<label style={{fontSize:11,color:C.t3,display:'block',marginBottom:4}}>Link to Akahu account (auto-updates saved amount)</label>
<select className="fi" value={value.akahuAccountId||''} onChange={e=>onChange(d=>({...d,akahuAccountId:e.target.value}))} style={{padding:'8px 12px'}}>
<option value=''>— not linked —</option>
{(akahuBalances||[]).filter(a=>a.type!=='LOAN').map(a=>(
<option key={a.id} value={a.id}>{a.name} ({a.connection}) — ${a.balance?.toLocaleString('en-NZ',{minimumFractionDigits:2,maximumFractionDigits:2})}</option>
))}
</select>
</div>}
<div style={{display:"flex",gap:8}}><GradBtn onClick={onSubmit} style={{flex:1,width:"auto"}}>{submitLabel}</GradBtn><Btn onClick={onCancel} style={{padding:"9px 16px"}}>Cancel</Btn></div>
</div>
);
}
function GoalsWidget({entries,displayPeriod,goals,setGoals,akahuBalances=[]}){
const[showAdd,setShowAdd]=useState(false);
const[editingId,setEditingId]=useState(null);
const[editDraft,setEditDraft]=useState(null);
const[draft,setDraft]=useState({name:"",target:1000,saved:0,color:C.purple,emoji:"🎯",linkedEntryId:"",akahuAccountId:""});
const pDays=PERIODS.find(p=>p.key===displayPeriod).days;
const pWord=PWORD[displayPeriod];
const fundEntries=useMemo(()=>entries.filter(e=>e.type==="expense"&&e.recur!=="One-off"&&(e.category==="Savings Goal"||e.category==="Investments"||e.category==="House Maintenance")),[entries]);
const savingsContrib=useMemo(()=>fundEntries.filter(e=>e.category==="Savings Goal").reduce((s,e)=>s+periodAmt(e,pDays),0),[fundEntries,pDays]);
const investContrib=useMemo(()=>fundEntries.filter(e=>e.category==="Investments").reduce((s,e)=>s+periodAmt(e,pDays),0),[fundEntries,pDays]);
const getContrib=g=>{if(!g.linkedEntryId)return null;const e=entries.find(x=>x.id===Number(g.linkedEntryId)||x.id===g.linkedEntryId);return e?periodAmt(e,pDays):null;};
const ttr=g=>{const c=getContrib(g);if(!c||c<=0)return null;const r=Math.max(0,g.target-g.saved);if(r<=0)return"Reached! 🎉";const p=r/c;return displayPeriod==="weekly"?`~${Math.ceil(p)} weeks`:displayPeriod==="fortnightly"?`~${Math.ceil(p)} fortnights`:displayPeriod==="monthly"?`~${Math.ceil(p)} months`:`~${fmtN(p)} years`;};
return(
<div className="card">
<Row mb={4}><div style={{fontSize:14,fontWeight:700,color:C.t1}}>Savings Goals</div><button onClick={()=>setShowAdd(s=>!s)} className={`rb ${showAdd?"on":""}`}>+ New Goal</button></Row>
<div style={{fontSize:12,color:C.t4,marginBottom:16}}>Contributing <span style={{color:C.green,fontFamily:F.sans,fontWeight:700,letterSpacing:"-0.02em"}}>{fmt(savingsContrib)}</span> to savings & <span style={{color:C.cyan,fontFamily:F.sans,fontWeight:700,letterSpacing:"-0.02em"}}>{fmt(investContrib)}</span> to investments per {pWord}</div>
{showAdd&&<GoalForm value={draft} onChange={setDraft} onSubmit={()=>{if(!draft.name)return;setGoals(g=>[...g,{...draft,id:Date.now(),target:Number(draft.target)||0,saved:Number(draft.saved)||0}]);setShowAdd(false);setDraft({name:"",target:1000,saved:0,color:C.purple,emoji:"🎯",linkedEntryId:"",akahuAccountId:""});}} onCancel={()=>setShowAdd(false)} submitLabel="Add Goal" fundEntries={fundEntries} pWord={pWord} akahuBalances={akahuBalances}/>}
<div style={{display:"flex",flexDirection:"column",gap:14}}>
{goals.map(g=>{
const pct=Math.min(100,(g.saved/g.target)*100);
const remaining=Math.max(0,g.target-g.saved);
const contrib=getContrib(g);
const t=ttr(g);
const linked=g.linkedEntryId?entries.find(e=>e.id===Number(g.linkedEntryId)||e.id===g.linkedEntryId):null;
const linkedBalance=g.akahuAccountId?akahuBalances.find(a=>a.id===g.akahuAccountId):null;
if(editingId===g.id)return <GoalForm key={g.id} value={editDraft} onChange={setEditDraft} onSubmit={()=>{setGoals(gs=>gs.map(x=>x.id===g.id?{...editDraft,id:g.id,target:Number(editDraft.target)||0,saved:Number(editDraft.saved)||0}:x));setEditingId(null);}} onCancel={()=>setEditingId(null)} submitLabel="Save Changes" fundEntries={fundEntries} pWord={pWord} akahuBalances={akahuBalances}/>;
return(
<div key={g.id} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px"}}>
<Row mb={10}>
<div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:20}}>{g.emoji}</span><div><div style={{fontSize:13,fontWeight:700,color:C.t1}}>{g.name}</div>{t&&<div style={{fontSize:11,color:C.t4,marginTop:1}}>{t}</div>}{!linked&&<div style={{fontSize:10,color:C.t5,marginTop:1}}>No entry linked</div>}</div></div>
<div style={{textAlign:"right"}}><Mono color={g.color||C.green} size={13}>{fmtS(g.saved)}</Mono><div style={{fontSize:10,color:C.t4}}>of {fmtS(g.target)}</div>{AKAHU_ENABLED&&linkedBalance&&<div style={{fontSize:10,color:C.cyan,marginTop:2}}>Live · {linkedBalance.name}</div>}</div>
</Row>
<div style={{height:8,background:C.border,borderRadius:4,overflow:"hidden",marginBottom:8}}><div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${g.color||C.green},${g.color||C.green}88)`,borderRadius:4,transition:"width .6s ease"}}/></div>
{linked&&<div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8,padding:"6px 10px",background:"rgba(110,231,183,.05)",borderRadius:8,border:`1px solid rgba(110,231,183,.1)`}}><span style={{fontSize:10,color:C.t4}}>Contributing</span><Mono color={C.green} size={11}>{fmt(contrib)}</Mono><span style={{fontSize:10,color:C.t4}}>per {pWord} via</span><span style={{fontSize:10,color:C.t2,fontWeight:600}}>{linked.label}</span></div>}
<div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.t4,alignItems:"center"}}>
<span><Mono color={C.t4} size={11}>{pct.toFixed(0)}%</Mono> · <Mono color={C.t4} size={11}>{fmtS(remaining)}</Mono> to go</span>
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
<span style={{fontSize:10,fontFamily:F.sans,fontWeight:700,letterSpacing:"-0.02em",color:a.amount>entry.amount?C.red:C.green}}>{a.amount>entry.amount?`+${fmt(a.amount-entry.amount)} est`:a.amount<entry.amount?`-${fmt(entry.amount-a.amount)} est`:""}</span>
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
<div style={{position:"relative",borderRadius:10}}>
{swipeX<0&&<div style={{position:"absolute",right:0,top:0,bottom:0,width:REVEAL,display:"flex",alignItems:"center",justifyContent:"center"}}><button onClick={()=>onDelete(entry.id)} style={{background:"#ef4444",border:"none",cursor:"pointer",width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"0 10px 10px 0"}}><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><polyline points="3,6 5,6 21,6" stroke="white" strokeWidth="2" strokeLinecap="round"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="white" strokeWidth="2" strokeLinecap="round"/><path d="M10 11v6M14 11v6" stroke="white" strokeWidth="2" strokeLinecap="round"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg></button></div>}
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
{id:2,type:"expense",label:"Mortgage Payment",category:"Mortgage",amount:1800,recur:"Monthly",startDate:"2025-01-01"},
{id:3,type:"expense",label:"Rates",category:"Rates",amount:80,recur:"Monthly",startDate:"2025-01-01"},
{id:4,type:"expense",label:"Groceries",category:"Groceries",amount:220,recur:"Fortnightly",startDate:"2025-01-06"},
{id:5,type:"expense",label:"House Insurance",category:"Insurance",amount:1200,recur:"Yearly",startDate:"2025-03-01"},
{id:6,type:"expense",label:"Emergency Fund",category:"Savings Goal",amount:200,recur:"Monthly",startDate:"2025-01-01"},
{id:7,type:"expense",label:"Sharesies",category:"Investments",amount:300,recur:"Monthly",startDate:"2025-01-01"},
{id:8,type:"income",label:"Moving Bonus",category:"Other Income",amount:500,recur:"One-off",startDate:"2025-03-13"},
];

// ── LOCAL STORAGE ─────────────────────────────────────────────
const loadLS=(key,fallback)=>{try{const s=localStorage.getItem(key);return s?JSON.parse(s):fallback;}catch{return fallback;}};
const AKAHU_ENABLED=localStorage.getItem('ft_akahu_enabled')==='true';

// ── APP ────────────────────────────────────────────────────────
export default function App(){
const[entries,setEntries]=useState(()=>loadLS('ft_entries',SEED));
const[headerTapCount,setHeaderTapCount]=useState(0);
const headerTapTimer=useRef(null);
const[displayPeriod,setDisplayPeriod]=useState(()=>loadLS('ft_displayPeriod',"monthly"));
const[allTime,setAllTime]=useState(false);
const[view,setView]=useState("dashboard");
const[tab,setTab]=useState(()=>loadLS('ft_tab',"income"));
const[showPastOneOffs,setShowPastOneOffs]=useState(false);
const[syncedTransactions,setSyncedTransactions]=useState(()=>AKAHU_ENABLED?loadLS('ft_transactions',[]):[]);
const[lastSynced,setLastSynced]=useState(()=>loadLS('ft_lastSynced',null));
const[akahuBalances,setAkahuBalances]=useState(()=>AKAHU_ENABLED?loadLS('ft_akahuBalances',[]):[]);
const[syncing,setSyncing]=useState(false);
const[syncError,setSyncError]=useState(null);
const[categoryRules,setCategoryRules]=useState(()=>loadLS('ft_categoryRules',[]));
const[txSearch,setTxSearch]=useState('');
const[txCatFilter,setTxCatFilter]=useState('');
const[txLimit,setTxLimit]=useState(90);
const[txEditingId,setTxEditingId]=useState(null);
const[showRules,setShowRules]=useState(false);
const[actualsMode,setActualsMode]=useState(false);
const[showAddForm,setShowAddForm]=useState(false);
const[form,setForm]=useState({type:"expense",label:"",category:EXPENSE_CATS[0],amount:"",recur:"Monthly",startDate:todayStr});
const[mortgageCfg,setMortgageCfg]=useState(()=>loadLS('ft_mortgageCfg',DEFAULT_MORT));
const[mortgageRateChanges,setMortgageRateChanges]=useState(()=>loadLS('ft_mortgageRateChanges',[]));
const[mortgageLumpSums,setMortgageLumpSums]=useState(()=>loadLS('ft_mortgageLumpSums',[]));
const[assets,setAssets]=useState(()=>loadLS('ft_assets',[{id:1,label:"Home Value",value:650000},{id:2,label:"KiwiSaver",value:42000},{id:3,label:"Savings",value:15000},{id:4,label:"Investments",value:8000}]));
const[liabilities,setLiabilities]=useState(()=>loadLS('ft_liabilities',[{id:1,label:"Mortgage",value:500000,linkMortgage:true},{id:2,label:"Car Loan",value:12000}]));
const[networthSnapshots,setNetworthSnapshots]=useState(()=>loadLS('ft_networthSnapshots',[]));
const[budgetLimits,setBudgetLimits]=useState(()=>loadLS('ft_budgetLimits',{}));
const[budgetEditing,setBudgetEditing]=useState(false);
const[scenarioMode,setScenarioMode]=useState(false);
const[scenarioDelta,setScenarioDelta]=useState({income:0,expenses:0,incomeSign:1,expensesSign:1});
const[goals,setGoals]=useState(()=>loadLS('ft_goals',[
{id:1,name:"Emergency Fund",target:15000,saved:3200,color:C.green,linkedCategory:"Savings Goal",emoji:"🛡"},
{id:2,name:"Holiday",target:5000,saved:800,color:"#67e8f9",linkedCategory:"Savings Goal",emoji:"✈️"},
{id:3,name:"New Car",target:20000,saved:0,color:C.amber,linkedCategory:"Savings Goal",emoji:"🚗"},
]));
const[upcomingPayments,setUpcomingPayments]=useState(()=>loadLS('ft_upcomingPayments',[]));

// Auto-save to localStorage
useEffect(()=>{localStorage.setItem('ft_entries',JSON.stringify(entries));},[entries]);
useEffect(()=>{localStorage.setItem('ft_tab',JSON.stringify(tab));},[tab]);
useEffect(()=>{localStorage.setItem('ft_mortgageCfg',JSON.stringify(mortgageCfg));},[mortgageCfg]);
useEffect(()=>{localStorage.setItem('ft_mortgageRateChanges',JSON.stringify(mortgageRateChanges));},[mortgageRateChanges]);
useEffect(()=>{localStorage.setItem('ft_mortgageLumpSums',JSON.stringify(mortgageLumpSums));},[mortgageLumpSums]);
useEffect(()=>{localStorage.setItem('ft_assets',JSON.stringify(assets));},[assets]);
useEffect(()=>{localStorage.setItem('ft_liabilities',JSON.stringify(liabilities));},[liabilities]);
useEffect(()=>{localStorage.setItem('ft_networthSnapshots',JSON.stringify(networthSnapshots));},[networthSnapshots]);
useEffect(()=>{localStorage.setItem('ft_budgetLimits',JSON.stringify(budgetLimits));},[budgetLimits]);
useEffect(()=>{localStorage.setItem('ft_goals',JSON.stringify(goals));},[goals]);
useEffect(()=>{localStorage.setItem('ft_upcomingPayments',JSON.stringify(upcomingPayments));},[upcomingPayments]);
useEffect(()=>{localStorage.setItem('ft_displayPeriod',JSON.stringify(displayPeriod));},[displayPeriod]);
useEffect(()=>{localStorage.setItem('ft_transactions',JSON.stringify(syncedTransactions));},[syncedTransactions]);
useEffect(()=>{localStorage.setItem('ft_lastSynced',JSON.stringify(lastSynced));},[lastSynced]);
useEffect(()=>{localStorage.setItem('ft_akahuBalances',JSON.stringify(akahuBalances));},[akahuBalances]);
useEffect(()=>{localStorage.setItem('ft_categoryRules',JSON.stringify(categoryRules));},[categoryRules]);
useEffect(()=>{window.scrollTo(0,0);},[view]);
useEffect(()=>{const params=new URLSearchParams(window.location.search);if(params.get('akahu')==='enable'){localStorage.setItem('ft_akahu_enabled','true');window.location.href=window.location.pathname;}if(params.get('akahu')==='disable'){localStorage.removeItem('ft_akahu_enabled');window.location.href=window.location.pathname;}},[]);
useEffect(()=>{if(!AKAHU_ENABLED)return;if(!lastSynced){handleSync();return;}const hoursSinceSync=(Date.now()-new Date(lastSynced).getTime())/(1000*60*60);if(hoursSinceSync>=6){handleSync();}},[]);
useEffect(()=>{const patterns=['GROSS CR INTEREST','INTEREST CREDIT','CR INTEREST'];setSyncedTransactions(prev=>prev.map(t=>{const desc=(t.description||'').toUpperCase();if(patterns.some(p=>desc.includes(p))){return{...t,amount:Math.abs(t.amount),ledgerlyType:'income',ledgerlyCategory:'Investment Returns',needsReview:false};}return t;}));},[]);
useEffect(()=>{setSyncedTransactions(prev=>prev.map(t=>t.ledgerlyCategory==='Food'||t.ledgerlyCategory==='Food & Drink'?{...t,ledgerlyCategory:'Groceries'}:t));},[]);
useEffect(()=>{setEntries(prev=>prev.map(e=>e.category==='Food'?{...e,category:'Groceries'}:e));},[]);
useEffect(()=>{setSyncedTransactions(prev=>prev.map(t=>t.ledgerlyCategory==='Dining Out'?{...t,ledgerlyCategory:'Eating & Drinking Out'}:t));setEntries(prev=>prev.map(e=>e.category==='Dining Out'?{...e,category:'Eating & Drinking Out'}:e));},[]);
useEffect(()=>{const ID_MAP={'acc_cmp10amt5000002jy6g9lbdzw':'acc_cmp6ij34i002i02jp6ym1f040','acc_cmp10amtq000102jyg87s1g5v':'acc_cmp6ij356002o02jpfo8jee7t','acc_cmp10amut000202jy57yv6lxu':'acc_cmp6ij34p002k02jp28m57k9k','acc_cmp10amvb000302jyeonj9pi4':'acc_cmp6ij35b002q02jp3a0qgbs3','acc_cmp10amvd000402jyhyhsb873':'acc_cmp6ij34y002m02jpa4g4expy'};setSyncedTransactions(prev=>prev.map(t=>ID_MAP[t.account]?{...t,account:ID_MAP[t.account]}:t));},[]);
useEffect(()=>{setSyncedTransactions(prev=>{const ids=new Set();prev.forEach((a,ai)=>{if(ids.has(a.id))return;prev.forEach((b,bi)=>{if(ai===bi||ids.has(b.id))return;const absAmountMatch=Math.abs(a.amount)===Math.abs(b.amount);const oppositeSign=(a.amount>0&&b.amount<0)||(a.amount<0&&b.amount>0);const bothOwnAccounts=AKAHU_ACCOUNTS[a.account]&&AKAHU_ACCOUNTS[b.account];const timeDiff=Math.abs(new Date(a.timestamp||a.date)-new Date(b.timestamp||b.date));const withinTimeWindow=timeDiff<=5*60*1000;if(absAmountMatch&&oppositeSign&&bothOwnAccounts&&withinTimeWindow){ids.add(a.id);ids.add(b.id);}});});return prev.filter(t=>!ids.has(t.id));});},[]);

const CATEGORY_MAP={'Food':'Groceries','Supermarkets and grocery stores':'Groceries','Restaurants and cafes':'Eating & Drinking Out','Fast food':'Eating & Drinking Out','Transport':'Transport','Fuel stations':'Transport','Public transport':'Transport','Parking':'Transport','Utilities':'Utilities','Insurance':'Insurance','Health':'Health','Medical':'Health','Hair and beauty':'Personal Care','Pharmacy':'Personal Care','Department stores':'Shopping','General merchandise':'Shopping','Home and garden retail':'Shopping','Gyms and fitness':'Sports & Leisure','Sport and recreation':'Sports & Leisure','Entertainment':'Entertainment','Pet stores':'Pet Care','Veterinary':'Pet Care','Hardware and garden':'Garden & Home','Charities and donations':'Gifts & Donations','Gifts':'Gifts & Donations','Clothing':'Clothing','Education':'Other','Government':'Other','Rates':'Rates','Subscriptions':'Subscriptions','Travel':'Travel','Airlines':'Travel','Hotels and accommodation':'Travel','Car rental':'Travel','Vehicle maintenance':'Car & Maintenance','Automotive':'Car & Maintenance','Fines and penalties':'Fines','Government charges':'Fines'};
const INCOME_CATEGORY_MAP={'Salary':'Salary','Income':'Salary','Government':'Government Benefits','Tax refund':'Government Benefits','Investment':'Investment Returns'};
async function handleSync(){
if(!AKAHU_ENABLED)return;
setSyncing(true);
const syncStart=Date.now();
try{
const mostRecent=syncedTransactions.length?syncedTransactions.reduce((latest,t)=>t.date>latest?t.date:latest,'2000-01-01'):null;
const startDate=mostRecent?new Date(mostRecent):null;
if(startDate)startDate.setDate(startDate.getDate()-1);
const startParam=startDate?`?start=${dateKey(startDate)}`:'';
const[txRes,balRes]=await Promise.all([
fetch(`/.netlify/functions/akahu-transactions${startParam}`),
fetch('/.netlify/functions/akahu-balances'),
]);
if(txRes.status===429){
const nextAvailable=lastSynced?new Date(new Date(lastSynced).getTime()+60*60*1000):null;
const timeStr=nextAvailable?nextAvailable.toLocaleTimeString('en-NZ',{hour:'2-digit',minute:'2-digit'}):'soon';
setSyncError(`Rate limited — next sync available at ${timeStr}`);
return;
}
setSyncError(null);
const txData=await txRes.json();
const balData=await balRes.json();
setAkahuBalances(balData.items||[]);
setGoals(prev=>prev.map(g=>{if(!g.akahuAccountId)return g;const bal=(balData.items||[]).find(a=>a.id===g.akahuAccountId);if(!bal||bal.balance==null)return g;return{...g,saved:Math.max(0,bal.balance)};}));
setUpcomingPayments(prev=>prev.map(p=>{if(!p.akahuAccountId)return p;const bal=(balData.items||[]).find(a=>a.id===p.akahuAccountId);if(!bal||bal.balance==null)return p;return{...p,saved:Math.max(0,bal.balance)};}));
setAssets(prev=>prev.map(a=>{if(!a.akahuAccountId)return a;const bal=(balData.items||[]).find(b=>b.id===a.akahuAccountId);if(!bal||bal.balance==null)return a;return{...a,value:Math.max(0,bal.balance)};}));
setLiabilities(prev=>prev.map(l=>{if(!l.akahuAccountId)return l;const bal=(balData.items||[]).find(b=>b.id===l.akahuAccountId);if(!bal||bal.balance==null)return l;return{...l,value:Math.abs(bal.balance)};}));
const incoming=txData.items||[];
const processed=[];
for(const t of incoming){
const treat=(AKAHU_ACCOUNTS[t.account]||{treat:'transactions'}).treat;
if(treat==='balance_only')continue;
if(treat==='savings'){
if(t.amount>0){
processed.push({...t,ledgerlyCategory:'Savings Goal',ledgerlyType:'expense',isSavingsDeposit:true,needsReview:false});
}
continue;
}
if(t.type==='TRANSFER'||t.type==='PAYMENT')continue;
const desc=t.description||'';
if(['0462579-00','0462579-01','0462579-02','0462579-03','0462579-04','0462579-05'].some(s=>desc.includes(s)))continue;
const ledgerlyType=t.amount>=0?'income':'expense';
const descUpper=(t.description||'').toUpperCase();
if(['GROSS CR INTEREST','INTEREST CREDIT','CR INTEREST'].some(p=>descUpper.includes(p))){
processed.push({...t,amount:Math.abs(t.amount),ledgerlyType:'income',ledgerlyCategory:'Investment Returns',needsReview:false});
continue;
}
const merchant=t.merchant||null;
const rule=categoryRules.find(r=>{const rMatchField=r.matchField||'merchant';const rMatchValue=(r.matchValue||r.merchant||'').toLowerCase();if(!rMatchValue)return false;if(rMatchField==='merchant'){return merchant&&merchant.toLowerCase()===rMatchValue;}return(t.description||'').toLowerCase()===rMatchValue;});
if(rule){
processed.push({...t,ledgerlyType:rule.ledgerlyType,ledgerlyCategory:rule.ledgerlyCategory,needsReview:false});
continue;
}
const map=ledgerlyType==='income'?INCOME_CATEGORY_MAP:CATEGORY_MAP;
const mapped=t.akahuCategory?map[t.akahuCategory]:undefined;
const ledgerlyCategory=mapped||'Other';
const needsReview=!mapped;
processed.push({...t,ledgerlyType,ledgerlyCategory,needsReview});
}
const transferIds=new Set();
processed.forEach((a,ai)=>{
if(transferIds.has(a.id))return;
processed.forEach((b,bi)=>{
if(ai===bi)return;
if(transferIds.has(b.id))return;
const absAmountMatch=Math.abs(a.amount)===Math.abs(b.amount);
const oppositeSign=(a.amount>0&&b.amount<0)||(a.amount<0&&b.amount>0);
const bothOwnAccounts=AKAHU_ACCOUNTS[a.account]&&AKAHU_ACCOUNTS[b.account];
const timeDiff=Math.abs(new Date(a.timestamp||a.date)-new Date(b.timestamp||b.date));
const withinTimeWindow=timeDiff<=5*60*1000;
if(absAmountMatch&&oppositeSign&&bothOwnAccounts&&withinTimeWindow){
transferIds.add(a.id);
transferIds.add(b.id);
}
});
});
const dedupedTransactions=processed.filter(t=>!transferIds.has(t.id));
const fingerprintSeen=new Map();
const fingerprintDeduped=dedupedTransactions.filter(t=>{
const key=`${t.date}|${Math.abs(t.amount)}|${t.description||''}`;
if(fingerprintSeen.has(key))return false;
fingerprintSeen.set(key,true);
return true;
});
const newTxsForPmt=[];
setSyncedTransactions(prev=>{
const existingIds=new Set(prev.map(t=>t.id));
const newTxs=fingerprintDeduped.filter(t=>!existingIds.has(t.id));
newTxsForPmt.push(...newTxs);
return [...prev,...newTxs];
});
if(newTxsForPmt.length>0){
setUpcomingPayments(prev=>prev.map(p=>{
const next=effectiveNextDue(p);
const match=newTxsForPmt.find(t=>{
if(t.ledgerlyType!=='expense')return false;
const daysDiff=Math.abs(new Date(t.date)-new Date(next))/(1000*60*60*24);
const amtDiff=p.amount>0?Math.abs(Math.abs(t.amount)-p.amount)/p.amount:1;
return daysDiff<=5&&amtDiff<=0.1;
});
if(!match)return p;
if(p.recur==='One-off')return null;
return{...p,dueDate:advanceDueDate(next,p.recur)};
}).filter(Boolean));
}
setLastSynced(new Date().toISOString());
localStorage.setItem('ft_init','true');
}catch(err){
console.error('Sync failed:',err);
}finally{
const elapsed=Date.now()-syncStart;
if(elapsed<600)await new Promise(res=>setTimeout(res,600-elapsed));
setSyncing(false);
}
}
const filteredTransactionCount=useMemo(()=>syncedTransactions.filter(t=>{const matchSearch=!txSearch||(t.merchant||t.description||'').toLowerCase().includes(txSearch.toLowerCase());const matchCat=!txCatFilter||t.ledgerlyCategory===txCatFilter;return matchSearch&&matchCat;}).length,[syncedTransactions,txSearch,txCatFilter]);
const displayedTransactions=useMemo(()=>[...syncedTransactions].filter(t=>{const matchSearch=!txSearch||(t.merchant||t.description||'').toLowerCase().includes(txSearch.toLowerCase());const matchCat=!txCatFilter||t.ledgerlyCategory===txCatFilter;return matchSearch&&matchCat;}).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,txLimit),[syncedTransactions,txSearch,txCatFilter,txLimit]);
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
const periodTransactions=useMemo(()=>actualsMode?getTransactionsForPeriod(syncedTransactions,displayPeriod):[],[actualsMode,syncedTransactions,displayPeriod]);
const actualIncome=useMemo(()=>periodTransactions.filter(t=>t.ledgerlyType==='income').reduce((s,t)=>s+Math.abs(t.amount),0),[periodTransactions]);
const actualTrueExp=useMemo(()=>periodTransactions.filter(t=>t.ledgerlyType==='expense'&&!t.isSavingsDeposit&&!SAVINGS_CATS.has(t.ledgerlyCategory)).reduce((s,t)=>s+Math.abs(t.amount),0),[periodTransactions]);
const actualSavingsRatioAmt=useMemo(()=>periodTransactions.filter(t=>t.isSavingsDeposit||SAVINGS_CATS.has(t.ledgerlyCategory)).reduce((s,t)=>s+Math.abs(t.amount),0),[periodTransactions]);
const actualExpenses=actualTrueExp+actualSavingsRatioAmt;
const actualSavingsRate=actualIncome>0?Math.min(100,(actualSavingsRatioAmt/actualIncome)*100):0;
const actualByCategory=useMemo(()=>{const map={};periodTransactions.filter(t=>t.ledgerlyType==='expense').forEach(t=>{const c=t.ledgerlyCategory||'Other';map[c]=(map[c]||0)+Math.abs(t.amount);});return Object.entries(map).sort((a,b)=>b[1]-a[1]);},[periodTransactions]);
const actualIncByCategory=useMemo(()=>{const map={};periodTransactions.filter(t=>t.ledgerlyType==='income').forEach(t=>{const c=t.ledgerlyCategory||'Other Income';map[c]=(map[c]||0)+Math.abs(t.amount);});return Object.entries(map).sort((a,b)=>b[1]-a[1]);},[periodTransactions]);
const hasActualData=periodTransactions.length>0;
const isEstimate=actualsMode&&!hasActualData;
const displayIncomeFigure=actualsMode&&hasActualData?actualIncome:(scenarioMode?scenarioIncome:totalIncome);
const displayExpensesFigure=actualsMode&&hasActualData?actualExpenses:(scenarioMode?scenarioExpenses:totalExpenses);
const displayBalance=actualsMode&&hasActualData?actualIncome-actualExpenses:(scenarioMode?scenarioBalance:balance);
const displaySavingsRate=actualsMode&&hasActualData?actualSavingsRate:savingsRate;
const combinedExpCategories=useMemo(()=>{const all=new Set([...expByCategory.map(([c])=>c),...actualByCategory.map(([c])=>c)]);return[...all].map(c=>({cat:c,budgetAmt:expByCategory.find(([x])=>x===c)?.[1]||0,actualAmt:actualByCategory.find(([x])=>x===c)?.[1]||0})).sort((a,b)=>b.actualAmt-a.actualAmt||b.budgetAmt-a.budgetAmt);},[expByCategory,actualByCategory]);
const combinedIncCategories=useMemo(()=>{const all=new Set([...incByCategory.map(([c])=>c),...actualIncByCategory.map(([c])=>c)]);return[...all].map(c=>({cat:c,budgetAmt:incByCategory.find(([x])=>x===c)?.[1]||0,actualAmt:actualIncByCategory.find(([x])=>x===c)?.[1]||0})).sort((a,b)=>b.actualAmt-a.actualAmt||b.budgetAmt-a.budgetAmt);},[incByCategory,actualIncByCategory]);
const displayRatioIncome=actualsMode&&hasActualData?actualIncome:displayIncome;
const displayRatio=displayRatioIncome>0?(actualsMode&&hasActualData?actualTrueExp:displayTrueExp)/displayRatioIncome*100:0;
const displaySavingsRatio=displayRatioIncome>0?(actualsMode&&hasActualData?actualSavingsRatioAmt:savingsTotal)/displayRatioIncome*100:0;
const displayStatusColor=displayRatio<60?C.green:displayRatio<85?C.amber:C.red;
const displayStatusLabel=displayRatio<60?"Healthy":displayRatio<85?"Moderate":"Over-stretched";
const statusColor=ratio<60?C.green:ratio<85?C.amber:C.red;
const statusLabel=ratio<60?"Healthy":ratio<85?"Moderate":"Over-stretched";
const periodLabel=PERIODS.find(p=>p.key===displayPeriod).label;
const handleDelete=id=>setEntries(prev=>prev.filter(e=>e.id!==id));
const handleEdit=updated=>setEntries(prev=>prev.map(e=>e.id===updated.id?updated:e));
const handleAdd=()=>{if(!form.label||!form.amount||isNaN(Number(form.amount)))return;setEntries(prev=>[...prev,{id:Date.now(),type:form.type,label:form.label,category:form.category,amount:Math.abs(Number(form.amount)),recur:form.recur,startDate:form.startDate,...(form.recur==="Variable"?{actuals:[]}:{})}]);setForm(f=>({...f,label:"",amount:""}));};

return(
<div style={{minHeight:"100vh",background:C.bg,fontFamily:F.sans,color:C.t1,paddingBottom:80}}>
<style>{CSS}</style>
<div style={{background:"linear-gradient(180deg,#0f172a 0%,#0a0f1e 100%)",borderBottom:`1px solid ${C.border}`,padding:"14px 24px 12px",paddingTop:'env(safe-area-inset-top)',position:"sticky",top:0,zIndex:50}}>
<div style={{maxWidth:720,margin:"0 auto"}}>
<div style={{fontFamily:"'DM Serif Display',serif",fontSize:26,letterSpacing:"-0.5px",marginBottom:12}} onClick={()=>{setHeaderTapCount(prev=>{const next=prev+1;clearTimeout(headerTapTimer.current);if(next>=5){const enabled=localStorage.getItem('ft_akahu_enabled')==='true';if(enabled){localStorage.removeItem('ft_akahu_enabled');alert('Akahu sync disabled. Reloading...');}else{localStorage.setItem('ft_akahu_enabled','true');alert('Akahu sync enabled. Reloading...');}window.location.reload();return 0;}headerTapTimer.current=setTimeout(()=>setHeaderTapCount(0),1500);return next;});}}>Ledgerly</div>
<div style={{display:"flex",gap:4,alignItems:"center"}}>
{[{key:"weekly",label:"W"},{key:"fortnightly",label:"Fn"},{key:"monthly",label:"M"},{key:"yearly",label:"Y"}].map(p=><button key={p.key} onClick={()=>{setDisplayPeriod(p.key);setAllTime(false);}} style={{border:`1px solid ${displayPeriod===p.key&&!allTime?C.green:C.border}`,borderRadius:8,padding:"5px 10px",fontSize:12,fontWeight:700,cursor:"pointer",background:displayPeriod===p.key&&!allTime?"rgba(110,231,183,.1)":"none",color:displayPeriod===p.key&&!allTime?C.green:C.t3,whiteSpace:"nowrap"}}>{p.label}</button>)}
</div>
</div>
</div>

<div style={{maxWidth:720,margin:"0 auto",padding:"20px 16px 0"}}>

{view==="dashboard"&&<>
<div style={{marginBottom:16}}>
{AKAHU_ENABLED&&<button onClick={()=>{setActualsMode(v=>!v);setScenarioMode(false);}} style={{width:"100%",background:actualsMode?"rgba(6,182,212,.15)":C.card,border:`1px solid ${actualsMode?C.cyan:C.border}`,borderRadius:10,padding:"9px 16px",color:actualsMode?C.cyan:C.t3,fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
<span style={{whiteSpace:'nowrap',flexShrink:0}}>🔍 Actuals Mode</span>
<span style={{fontSize:11,color:C.t3}}>Show real bank transaction data</span>
</button>}
<button onClick={()=>{setScenarioMode(v=>!v);setActualsMode(false);}} style={{width:"100%",background:scenarioMode?"rgba(167,139,250,.15)":C.card,border:`1px solid ${scenarioMode?C.purple:C.border}`,borderRadius:10,padding:"9px 16px",color:scenarioMode?C.purple:C.t3,fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
<span style={{whiteSpace:'nowrap',flexShrink:0}}>🔮 Scenario Mode</span>
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

<div className="hscroll" style={{marginBottom:20}}>
{[
{label:`${periodLabel} Income${isEstimate?" (est.)":""}`,value:fmt(displayIncomeFigure),color:C.green,scenario:scenarioMode&&!!scenarioDelta.income},
{label:`${periodLabel} Outgoings${isEstimate?" (est.)":""}`,value:fmt(displayExpensesFigure),color:C.red,scenario:scenarioMode&&!!scenarioDelta.expenses},
{label:`Net Balance${isEstimate?" (est.)":""}`,value:(displayBalance<0?"−":"+")+fmt(Math.abs(displayBalance)),color:displayBalance>=0?C.green:displayBalance>=-200?C.amber:C.red,scenario:scenarioMode,highlight:true},
{label:"Savings Rate",value:`${fmtN(displaySavingsRate)}%`,color:displaySavingsRate>=20?C.green:displaySavingsRate>=10?C.amber:C.red,sub:displaySavingsRate>=20?"On track":displaySavingsRate>=10?"Could be higher":"Low"},
].map(c=>(
<StatCard key={c.label} label={c.label} value={c.value} color={c.color} sub={c.sub}
bg={c.scenario?"rgba(167,139,250,.2)":c.highlight?(displayBalance>=0?"rgba(110,231,183,.08)":displayBalance>=-200?"rgba(251,191,36,.08)":"rgba(251,113,133,.08)"):C.card}
border={c.scenario?"rgba(167,139,250,.7)":c.highlight?(displayBalance>=0?"rgba(110,231,183,.2)":displayBalance>=-200?"rgba(251,191,36,.2)":"rgba(251,113,133,.2)"):C.border}
labelColor={c.scenario?C.purple:C.t3}/>
))}
</div>

<div className="card">
<div style={{fontSize:13,fontWeight:600,color:C.t2,marginBottom:14}}>Net balance across all periods <span style={{fontSize:11,color:C.t4}}>· tap to switch</span></div>
<div className="hscroll">
{PERIODS.map(p=>{let inc=0,exp=0;entries.filter(e=>e.recur!=="One-off").forEach(e=>{const a=periodAmt(e,p.days);if(e.type==="income")inc+=a;else exp+=a;});let bal=inc-exp;if(actualsMode&&hasActualData&&p.key===displayPeriod){bal=actualIncome-actualExpenses;}return(
<div key={p.key} className={`cc ${displayPeriod===p.key?"active":""}`} onClick={()=>setDisplayPeriod(p.key)} style={{minWidth:110,width:"calc(25% - 9px)"}}>
<div style={{fontSize:10,color:displayPeriod===p.key?C.green:C.t3,fontWeight:700,marginBottom:6,textTransform:"uppercase",letterSpacing:".07em"}}>{p.label}</div>
<Mono color={bal>=0?C.green:C.red} size={13}>{bal>=0?"+":"−"}{fmt(bal)}</Mono>
</div>
);})}
</div>
</div>

<div className="card" style={scenarioMode?{background:"rgba(167,139,250,.18)",border:`1px solid rgba(167,139,250,.5)`}:actualsMode?{background:"rgba(6,182,212,.06)",border:`1px solid rgba(6,182,212,.2)`}:{}}>
<Row mb={14}><div style={{fontSize:14,fontWeight:600}}>Expense Ratio</div><div style={{background:`${displayStatusColor}22`,color:displayStatusColor,padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:700}}>{displayStatusLabel}</div></Row>
<div style={{height:14,background:C.border,borderRadius:7,overflow:"hidden",marginBottom:10,display:"flex"}}>
<div style={{height:"100%",width:`${Math.min(displayRatio,100)}%`,background:`linear-gradient(90deg,${C.green},${displayStatusColor})`,borderRadius:displaySavingsRatio>0?"7px 0 0 7px":"7px",transition:"width .6s ease",flexShrink:0}}/>
{displaySavingsRatio>0&&<div style={{height:"100%",width:`${Math.min(displaySavingsRatio,100-displayRatio)}%`,background:"linear-gradient(90deg,#06b6d4,#0ea5e9)",opacity:.6,transition:"width .6s ease",flexShrink:0,borderRadius:"0 7px 7px 0"}}/>}
</div>
<div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.t3,marginBottom:8}}>
<span>{fmtN(displayRatio)}% expenses</span>
{displaySavingsRatio>0&&<span style={{color:"rgba(6,182,212,.8)"}}>+{fmtN(displaySavingsRatio)}% savings</span>}
<span>Target: &lt;75%</span>
</div>
<div style={{display:"flex",gap:12,fontSize:11}}>
<div style={{display:"flex",alignItems:"center",gap:5}}><span style={{display:"inline-block",width:10,height:10,borderRadius:2,background:displayStatusColor}}/><span style={{color:C.t3}}>Expenses ({fmt(actualsMode&&hasActualData?actualTrueExp:displayTrueExp)})</span></div>
{displaySavingsRatio>0&&<div style={{display:"flex",alignItems:"center",gap:5}}><span style={{display:"inline-block",width:10,height:10,borderRadius:2,background:"rgba(6,182,212,.6)"}}/><span style={{color:C.t3}}>Savings ({fmt(actualsMode&&hasActualData?actualSavingsRatioAmt:savingsTotal)})</span></div>}
</div>
</div>

{(expByCategory.length>0||actualByCategory.length>0)&&(
<div className="card">
<Row mb={16}><div style={{fontSize:14,fontWeight:600}}>Spending by Category <span style={{fontSize:11,color:C.t3,fontWeight:400}}>({periodLabel})</span></div>{!actualsMode&&<button onClick={()=>setBudgetEditing(v=>!v)} className={`rb ${budgetEditing?"on":""}`}>{budgetEditing?"Done":"Budget"}</button>}</Row>
{actualsMode&&hasActualData?combinedExpCategories.map(({cat,budgetAmt:bAmt,actualAmt})=>{
const maxAmt=Math.max(bAmt,actualAmt,1);
const overBudget=bAmt>0&&actualAmt>bAmt;
const isSavingsCat=SAVINGS_CATS.has(cat);
const overColor=isSavingsCat?C.green:C.red;
return(
<div key={cat} style={{marginBottom:14}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13,marginBottom:5}}>
<span style={{color:C.t2,display:"flex",alignItems:"center",gap:6}}><span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:CAT_COLORS[cat]||C.t2}}/>{cat}{overBudget&&<span style={{fontSize:10,background:isSavingsCat?"rgba(110,231,183,.15)":"rgba(251,113,133,.15)",color:overColor,borderRadius:6,padding:"1px 6px",fontWeight:700}}>over</span>}</span>
<div style={{display:"flex",alignItems:"center",gap:6}}>{bAmt>0&&<span style={{fontSize:10,color:C.t5,fontFamily:F.mono}}>{fmt(bAmt)}</span>}<Mono color={overBudget?overColor:C.t1} size={13}>{fmt(actualAmt)}</Mono></div>
</div>
{bAmt>0&&<div style={{height:5,background:C.border,borderRadius:3,marginBottom:3,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min((bAmt/maxAmt)*100,100)}%`,background:CAT_COLORS[cat]||C.t2,opacity:0.3,borderRadius:3}}/></div>}
<div style={{height:5,background:C.border,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min((actualAmt/maxAmt)*100,100)}%`,background:overBudget?overColor:CAT_COLORS[cat]||C.t2,borderRadius:3}}/></div>
</div>
);
}):expByCategory.map(([cat,amt])=>{
const pct=totalExpenses>0?(amt/totalExpenses)*100:0;
const monthlyBase=budgetLimits[cat]||null;
const budgetAmt=monthlyBase?monthlyBase*(pDays/30.44):null;
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
<input type="text" inputMode="decimal" value={monthlyBase?String(Math.round(monthlyBase*(pDays/30.44))):""} onFocus={e=>e.target.select()} onChange={e=>{const v=e.target.value;setBudgetLimits(prev=>v?{...prev,[cat]:Number(v)*(30.44/pDays)}:Object.fromEntries(Object.entries(prev).filter(([x])=>x!==cat)));}} placeholder="no limit" style={{width:72,background:C.bg,border:`1px solid ${C.t5}`,borderRadius:6,padding:"3px 6px",color:C.t1,fontSize:12,fontFamily:F.mono,textAlign:"right"}}/>
</div>
):(
<span style={{fontFamily:F.sans,fontWeight:700,letterSpacing:"-0.02em",color:overBudget?C.red:C.t1}}>{fmt(amt)}{budgetAmt&&<span style={{fontFamily:F.sans,fontWeight:700,letterSpacing:"-0.02em",color:C.t4,fontSize:11}}> / {fmt(budgetAmt)}</span>}</span>
)}
</div>
</div>
<div style={{height:6,background:C.border,borderRadius:3,overflow:"visible",position:"relative"}}>
<div style={{height:"100%",width:`${budgetAmt?Math.min(pct,budgetLinePct):pct}%`,background:CAT_COLORS[cat]||C.t2,borderRadius:3,transition:"width .5s ease",position:"absolute",top:0,left:0}}/>
{overPct>0&&<div style={{height:"100%",width:`${overPct}%`,background:C.red,borderRadius:"0 3px 3px 0",position:"absolute",top:0,left:`${budgetLinePct}%`}}/>}
{budgetLinePct&&<div style={{position:"absolute",top:-3,left:`${budgetLinePct}%`,width:2,height:12,background:C.red,borderRadius:1,transform:"translateX(-50%)",boxShadow:`0 0 4px ${C.red}`,zIndex:2}}/>}
</div>
{budgetAmt&&!budgetEditing&&<div style={{fontSize:10,fontFamily:F.sans,fontWeight:700,letterSpacing:"-0.02em",color:overBudget?C.red:C.t4,marginTop:3,textAlign:"right"}}>{overBudget?`${fmt(amt-budgetAmt)} over budget`:`${fmt(budgetAmt-amt)} remaining`}</div>}
</div>
);
})}
</div>
)}

{(incByCategory.length>0||actualIncByCategory.length>0)&&(
<div className="card">
<div style={{fontSize:14,fontWeight:600,marginBottom:16}}>Income by Source <span style={{fontSize:11,color:C.t3,fontWeight:400}}>({periodLabel})</span></div>
{actualsMode&&hasActualData?combinedIncCategories.map(({cat,budgetAmt:bAmt,actualAmt})=>{
const maxAmt=Math.max(bAmt,actualAmt,1);
return(
<div key={cat} style={{marginBottom:12}}>
<div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:5}}>
<span style={{color:C.t2,display:"flex",alignItems:"center",gap:6}}><span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:CAT_COLORS[cat]||C.green}}/>{cat}</span>
<div style={{display:"flex",alignItems:"center",gap:6}}>{bAmt>0&&<span style={{fontSize:10,color:C.t5,fontFamily:F.mono}}>{fmt(bAmt)}</span>}<Mono color={C.green} size={13}>{fmt(actualAmt)}</Mono></div>
</div>
{bAmt>0&&<div style={{height:4,background:C.border,borderRadius:3,marginBottom:3,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min((bAmt/maxAmt)*100,100)}%`,background:CAT_COLORS[cat]||C.green,opacity:0.3,borderRadius:3}}/></div>}
<div style={{height:6,background:C.border,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min((actualAmt/maxAmt)*100,100)}%`,background:CAT_COLORS[cat]||C.green,borderRadius:3}}/></div>
</div>
);
}):incByCategory.map(([cat,amt])=>{
const pct=totalIncome>0?(amt/totalIncome)*100:0;
return(
<div key={cat} style={{marginBottom:12}}>
<div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:5}}>
<span style={{color:C.t2,display:"flex",alignItems:"center",gap:6}}><span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:CAT_COLORS[cat]||C.green}}/>{cat}</span>
<Mono color={C.t1} size={13}>{fmt(amt)}</Mono>
</div>
<div style={{height:6,background:C.border,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:CAT_COLORS[cat]||C.green,borderRadius:3,transition:"width .5s ease"}}/></div>
<div style={{fontSize:10,color:C.t4,marginTop:3,textAlign:"right"}}>{fmtN(pct)}% of income</div>
</div>
);
})}
</div>
)}
<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,marginTop:4}}>
<div style={{fontSize:11,color:C.t4,textTransform:"uppercase",letterSpacing:".08em",fontWeight:700}}>{allTime?"All Time Charts":displayPeriod==="yearly"?"Monthly Charts":"Daily Charts"}</div>
<button onClick={()=>setAllTime(v=>!v)} style={{border:`1px solid ${allTime?C.green:C.border}`,borderRadius:8,padding:"5px 10px",fontSize:12,fontWeight:700,cursor:"pointer",background:allTime?"rgba(110,231,183,.1)":"none",color:allTime?C.green:C.t3,whiteSpace:"nowrap"}}>All time</button>
</div>
<Histogram entries={entries} displayPeriod={allTime?"allyears":displayPeriod} actualsMode={actualsMode} syncedTransactions={syncedTransactions}/>
<CalendarWidget entries={entries} displayPeriod={allTime?"allyears":displayPeriod} actualsMode={actualsMode} syncedTransactions={syncedTransactions}/>
<UpcomingPayments payments={upcomingPayments} setPayments={setUpcomingPayments} entries={entries} displayPeriod={displayPeriod} akahuBalances={akahuBalances}/>
</>}

{view==="entries"&&<>
<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
<span style={{background:C.border,color:C.t2,fontSize:12,padding:"4px 14px",borderRadius:20}}>Shown as <strong style={{color:C.t1}}>{periodLabel}</strong> · NZD</span>
<button onClick={()=>setShowAddForm(v=>!v)} style={{background:showAddForm?"rgba(110,231,183,.15)":"linear-gradient(135deg,#6ee7b7,#3b82f6)",border:showAddForm?`1px solid ${C.green}`:"none",borderRadius:10,padding:"9px 18px",color:showAddForm?C.green:C.bg,fontWeight:700,fontSize:13,cursor:"pointer"}}>{showAddForm?"✕ Cancel":"＋ Add Entry"}</button>
</div>
{showAddForm&&<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:20,padding:24,marginBottom:20}}>
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
<button className="add-btn" style={{width:"100%"}} onClick={()=>{handleAdd();setShowAddForm(false);setForm(f=>({...f,label:"",amount:""}));}}>Add Entry</button>
</div>}
{entries.length===0?<div style={{textAlign:"center",color:C.t4,padding:"60px 0",fontSize:14}}>No entries yet</div>:(()=>{
const pastOneOffs=entries.filter(e=>e.recur==="One-off"&&e.startDate<todayStr);
const active=entries.filter(e=>!(e.recur==="One-off"&&e.startDate<todayStr));
return <>
{active.filter(e=>e.type==="income").length>0&&<div style={{marginBottom:20}}><div style={{fontSize:11,color:C.green,letterSpacing:".08em",textTransform:"uppercase",fontWeight:700,marginBottom:10}}>Income</div>{active.filter(e=>e.type==="income").map(e=><EntryRow key={`${e.id}-${displayPeriod}`} entry={e} onDelete={handleDelete} onEdit={handleEdit} displayPeriod={displayPeriod} swipeable={true}/>)}</div>}
{active.filter(e=>e.type==="expense").length>0&&<div style={{marginBottom:20}}><div style={{fontSize:11,color:C.red,letterSpacing:".08em",textTransform:"uppercase",fontWeight:700,marginBottom:10}}>Expenses, Savings &amp; Investments</div>{active.filter(e=>e.type==="expense").map(e=><EntryRow key={`${e.id}-${displayPeriod}`} entry={e} onDelete={handleDelete} onEdit={handleEdit} displayPeriod={displayPeriod} swipeable={true}/>)}</div>}
{pastOneOffs.length>0&&<div style={{marginTop:8}}><div onClick={()=>setShowPastOneOffs(v=>!v)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",padding:"8px 12px",background:C.card,borderRadius:10,marginBottom:showPastOneOffs?10:0}}><div style={{fontSize:11,color:C.t4,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em"}}>Past one-offs <span style={{background:C.border,color:C.t3,borderRadius:10,padding:"1px 8px",marginLeft:6,fontSize:10}}>{pastOneOffs.length}</span></div><span style={{color:C.t4,fontSize:13,display:"inline-block",transform:showPastOneOffs?"rotate(180deg)":"rotate(0deg)",transition:"transform .2s"}}>▾</span></div>{showPastOneOffs&&pastOneOffs.map(e=><EntryRow key={`${e.id}-${displayPeriod}`} entry={e} onDelete={handleDelete} onEdit={handleEdit} displayPeriod={displayPeriod} swipeable={true}/>)}</div>}
</>;
})()}
{AKAHU_ENABLED&&<>
<div style={{borderTop:`1px solid ${C.border}`,marginTop:24,paddingTop:20,marginBottom:16}}>
<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
<div>
<div style={{fontSize:13,fontWeight:700,color:C.t1}}>Bank Transactions</div>
<div style={{fontSize:11,color:C.t3,marginTop:2}}>
{lastSynced?`Last synced: ${new Date(lastSynced).toLocaleString('en-NZ')}`:'Not yet synced'}
</div>
</div>
<button onClick={handleSync} disabled={syncing} style={{background:syncing?C.border:"rgba(110,231,183,.1)",border:`1px solid ${syncing?C.t5:C.green}`,borderRadius:8,padding:"7px 14px",color:syncing?C.t4:C.green,fontSize:12,fontWeight:700,cursor:syncing?"default":"pointer"}}>
{syncing?"↻ Syncing...":"↻ Sync"}
</button>
</div>
</div>
{syncError&&(
<div style={{background:"rgba(251,191,36,.08)",border:"1px solid rgba(251,191,36,.3)",borderRadius:8,padding:"8px 12px",marginBottom:12,fontSize:12,color:C.amber}}>
⏱ {syncError}
</div>
)}
{syncedTransactions.length===0?(
<div style={{fontSize:12,color:C.t4,fontStyle:"italic",marginTop:8}}>Press sync to fetch your bank transactions</div>
):(
<>
<div style={{display:"flex",gap:8,marginBottom:12}}>
<input className="fi" placeholder="Search transactions..." value={txSearch} onChange={e=>{setTxSearch(e.target.value);setTxLimit(90);}} style={{flex:1,padding:"8px 12px",fontSize:14}}/>
<select className="fi" value={txCatFilter} onChange={e=>{setTxCatFilter(e.target.value);setTxLimit(90);}} style={{width:130,padding:"8px 10px",fontSize:13}}>
<option value="">All categories</option>
{[...EXPENSE_CATS,...INCOME_CATS].map(c=><option key={c} value={c}>{c}</option>)}
</select>
</div>
<div style={{maxHeight:480,overflowY:"auto"}}>
{displayedTransactions.map(t=>{
const isEditing=txEditingId===t.id;
const accountName=AKAHU_ACCOUNTS[t.account]?.name||'Unknown';
const catColor=CAT_COLORS[t.ledgerlyCategory]||C.t3;
return(
<div key={t.id} style={{background:t.needsReview?"rgba(251,191,36,.06)":C.bg,border:`1px solid ${t.needsReview?"rgba(251,191,36,.3)":C.border}`,borderLeft:`3px solid ${t.needsReview?C.amber:catColor}`,borderRadius:10,padding:"10px 12px",marginBottom:6,cursor:"pointer"}} onClick={()=>setTxEditingId(isEditing?null:t.id)}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:13,fontWeight:600,color:C.t1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.merchant||t.description}</div>
<div style={{fontSize:10,color:C.t3,marginTop:2,display:"flex",gap:8,alignItems:"center"}}>
<span>{t.date}</span><span>·</span><span>{accountName}</span><span>·</span>
<span style={{color:catColor}}>{t.ledgerlyCategory}</span>
{t.needsReview&&<span style={{background:"rgba(251,191,36,.15)",color:C.amber,borderRadius:4,padding:"1px 5px",fontSize:9,fontWeight:700}}>Review</span>}
</div>
</div>
<div style={{textAlign:"right",flexShrink:0,marginLeft:12}}>
<span style={{fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:13,letterSpacing:"-0.02em",color:t.ledgerlyType==="income"?C.green:C.red}}>
{t.ledgerlyType==="income"?"+":"−"}{Math.abs(t.amount).toLocaleString("en-NZ",{minimumFractionDigits:2,maximumFractionDigits:2})}
</span>
</div>
</div>
{isEditing&&(
<div style={{marginTop:10,borderTop:`1px solid ${C.border}`,paddingTop:10}} onClick={e=>e.stopPropagation()}>
<div style={{fontSize:11,color:C.t3,marginBottom:6}}>Recategorise</div>
<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
<select className="fi" defaultValue={t.ledgerlyCategory} onChange={e=>{const newCat=e.target.value;const newType=INCOME_CATS.includes(newCat)?'income':'expense';setSyncedTransactions(prev=>prev.map(x=>x.id===t.id?{...x,ledgerlyCategory:newCat,ledgerlyType:newType,needsReview:false}:x));}} style={{flex:1,padding:"7px 10px",fontSize:13}}>
<optgroup label="Expenses">{EXPENSE_CATS.map(c=><option key={c} value={c}>{c}</option>)}</optgroup>
<optgroup label="Income">{INCOME_CATS.map(c=><option key={c} value={c}>{c}</option>)}</optgroup>
</select>
<button onClick={()=>{const cur=syncedTransactions.find(x=>x.id===t.id);const newCat=cur?cur.ledgerlyCategory:t.ledgerlyCategory;const newType=INCOME_CATS.includes(newCat)?'income':'expense';const merchant=t.merchant||null;const matchField=merchant?'merchant':'description';const matchValue=(merchant||t.description||'').trim();setCategoryRules(prev=>{const exists=prev.find(r=>r.matchValue&&r.matchValue.toLowerCase()===matchValue.toLowerCase()||r.merchant&&r.merchant.toLowerCase()===matchValue.toLowerCase());if(exists)return prev.map(r=>{const key=r.matchValue&&r.matchValue.toLowerCase()===matchValue.toLowerCase()||r.merchant&&r.merchant.toLowerCase()===matchValue.toLowerCase();return key?{...r,matchField,matchValue,ledgerlyCategory:newCat,ledgerlyType:newType}:r;});return[...prev,{id:Date.now(),matchField,matchValue,ledgerlyCategory:newCat,ledgerlyType:newType}];});const matchValueLower=matchValue.toLowerCase();setSyncedTransactions(prev=>prev.map(x=>{const xVal=((matchField==='merchant'?x.merchant:x.description)||'').toLowerCase();if(xVal===matchValueLower)return{...x,ledgerlyCategory:newCat,ledgerlyType:newType,needsReview:false};return x;}));setTxEditingId(null);}} style={{background:"rgba(110,231,183,.1)",border:`1px solid ${C.green}`,borderRadius:8,padding:"7px 12px",color:C.green,fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>Save as rule</button>
<button onClick={()=>setTxEditingId(null)} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"7px 12px",color:C.t4,fontSize:11,cursor:"pointer"}}>Cancel</button>
</div>
<div style={{fontSize:10,color:C.t4,marginTop:6}}>"Save as rule" will automatically categorise all future {t.merchant||t.description} transactions</div>
</div>
)}
</div>
);
})}
{txLimit<filteredTransactionCount&&(
<div style={{textAlign:"center",padding:"12px 0 4px"}}>
<button onClick={e=>{e.stopPropagation();setTxLimit(v=>v+90);}} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"7px 20px",color:C.t3,fontSize:12,fontWeight:600,cursor:"pointer"}}>Load more</button>
</div>
)}
</div>
<div style={{fontSize:11,color:C.t4,marginBottom:8}}>
{`Showing ${Math.min(txLimit,filteredTransactionCount)} of ${filteredTransactionCount} transactions`}
</div>
{categoryRules.length>0&&(
<div style={{marginTop:16}}>
<div onClick={()=>setShowRules(v=>!v)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",marginBottom:8}}>
<div style={{fontSize:11,color:C.t4,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em"}}>Categorisation Rules<span style={{background:C.border,color:C.t3,borderRadius:10,padding:"1px 8px",marginLeft:6,fontSize:10}}>{categoryRules.length}</span></div>
<span style={{color:C.t4,fontSize:13,display:"inline-block",transform:showRules?"rotate(180deg)":"rotate(0deg)",transition:"transform .2s"}}>▾</span>
</div>
{showRules&&categoryRules.map(r=>(
<div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,marginBottom:4}}>
<div>
<div style={{fontSize:12,fontWeight:600,color:C.t1}}>{r.matchValue||r.merchant}</div>
<div style={{fontSize:10,color:CAT_COLORS[r.ledgerlyCategory]||C.t3,marginTop:1,display:'flex',alignItems:'center',gap:6}}>
→ {r.ledgerlyCategory}
{r.matchField==='description'&&<span style={{fontSize:9,background:C.border,color:C.t4,borderRadius:4,padding:'1px 5px'}}>desc</span>}
</div>
</div>
<button onClick={()=>setCategoryRules(prev=>prev.filter(x=>x.id!==r.id))} style={{background:"none",border:"none",color:C.t5,cursor:"pointer",fontSize:16}}>×</button>
</div>
))}
</div>
)}
</>
)}
{(()=>{
void lastSynced;void syncedTransactions;
const storageUsed=Object.keys(localStorage).filter(key=>key.startsWith('ft_')).reduce((total,key)=>{const item=localStorage.getItem(key);return total+(item?new Blob([item]).size:0);},0);
const storageMB=(storageUsed/(1024*1024)).toFixed(1);
const storagePct=Math.min((storageUsed/(50*1024*1024))*100,100);
return(
<div style={{marginTop:32,paddingBottom:32,marginBottom:16}}>
<div style={{fontSize:10,color:C.t4,marginBottom:4}}>Storage: {storageMB}MB / 50MB</div>
<div style={{height:3,background:C.border,borderRadius:2,overflow:"hidden"}}>
<div style={{height:"100%",width:`${storagePct}%`,background:storagePct>80?C.red:storagePct>60?C.amber:C.green,borderRadius:2,transition:"width .5s ease"}}/>
</div>
</div>
);
})()}
</>}
</>}

{view==="mortgage"&&<MortgageWidget cfg={mortgageCfg} setCfg={setMortgageCfg} rateChanges={mortgageRateChanges} setRateChanges={setMortgageRateChanges} lumpSums={mortgageLumpSums} setLumpSums={setMortgageLumpSums} displayPeriod={displayPeriod}/>}
{view==="networth"&&<NetWorthWidget mortgageSchedule={mortSchedule} mortgagePrincipal={mortgageCfg.principal} assets={assets} setAssets={setAssets} liabilities={liabilities} setLiabilities={setLiabilities} snapshots={networthSnapshots} setSnapshots={setNetworthSnapshots} akahuBalances={akahuBalances} syncedTransactions={syncedTransactions} entries={entries}/>}
{view==="goals"&&<GoalsWidget entries={entries} displayPeriod={displayPeriod} goals={goals} setGoals={setGoals} akahuBalances={akahuBalances}/>}

</div>

<nav className="bnav">
{[
{v:"dashboard",label:"Overview",icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>},
{v:"entries",label:"Entries",icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>},
{v:"mortgage",label:"Mortgage",icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>},
{v:"networth",label:"Net Worth",icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>},
{v:"goals",label:"Goals",icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>},
].map(({v,label,icon})=>(
<button key={v} className="bnav-btn" onClick={()=>setView(v)} style={{color:view===v?C.green:C.t4}}>
<span>{icon}</span>
<div>{label}</div>
</button>
))}
</nav>
</div>
);
}
