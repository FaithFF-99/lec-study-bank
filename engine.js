(function(root){
 'use strict';
 const empty=()=>({schema:1,records:{},bookmarks:[],session:null,settings:{subject:'all',topic:'all',source:'all',extensions:false,size:5}});
 function record(state,q,choice,stamp=new Date().toISOString()){
  if(!Number.isInteger(choice)||choice<0||choice>3)throw Error('Invalid choice');
  const prev=state.records[q.id]||{attempts:0,correct:0};const ok=choice===q.answer;
  state.records[q.id]={attempts:prev.attempts+1,correct:prev.correct+Number(ok),lastAnswer:choice,lastCorrect:ok,updatedAt:stamp};
  return ok;
 }
 function stats(state){const all=Object.values(state.records);const attempts=all.reduce((s,r)=>s+r.attempts,0),correct=all.reduce((s,r)=>s+r.correct,0);return{seen:all.length,attempts,correct,wrong:all.filter(r=>!r.lastCorrect).length,rate:attempts?Math.round(correct*100/attempts):null};}
 function pool(questions,state,mode){return questions.filter(q=>(state.settings.extensions||!q.extension)&&(!state.settings.subject||state.settings.subject==='all'||q.subject===state.settings.subject)&&(state.settings.topic==='all'||q.topic===state.settings.topic)&&(state.settings.source==='all'||(state.settings.source==='lec'?q.source.kind.startsWith('LEC'):!q.source.kind.startsWith('LEC')))&&(mode!=='wrong'||state.records[q.id]?.lastCorrect===false)&&(mode!=='saved'||state.bookmarks.includes(q.id)));}
 function shuffle(a,random=Math.random){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
 function sanitize(raw,questions){
  if(!raw||raw.schema!==1||typeof raw.records!=='object'||raw.records===null||Array.isArray(raw.records))throw Error('不支持的备份格式');
  const ids=new Set(questions.map(q=>q.id)),state=empty();
  for(const [id,r] of Object.entries(raw.records)){
   if(!ids.has(id))continue;
   if(!r||!Number.isInteger(r.attempts)||r.attempts<1||r.attempts>1000000||!Number.isInteger(r.correct)||r.correct<0||r.correct>r.attempts||!Number.isInteger(r.lastAnswer)||r.lastAnswer<0||r.lastAnswer>3||!Number.isFinite(Date.parse(r.updatedAt)))throw Error('备份中的答题记录不完整');
   const q=questions.find(q=>q.id===id);
   state.records[id]={attempts:r.attempts,correct:r.correct,lastAnswer:r.lastAnswer,lastCorrect:r.lastAnswer===q.answer,updatedAt:new Date(r.updatedAt).toISOString()};
  }
  state.bookmarks=Array.isArray(raw.bookmarks)?[...new Set(raw.bookmarks.filter(id=>ids.has(id)))]:[];
  const subjects=new Set(questions.map(q=>q.subject)),settings=raw.settings||{};
  const subject=subjects.has(settings.subject)?settings.subject:'all';
  const topics=new Set(questions.filter(q=>subject==='all'||q.subject===subject).map(q=>q.topic));
  state.settings={subject,topic:topics.has(settings.topic)?settings.topic:'all',source:['all','lec','lesson'].includes(settings.source)?settings.source:'all',extensions:settings.extensions===true,size:[5,10,30].includes(settings.size)?settings.size:5};
  const s=raw.session;
  if(s&&Array.isArray(s.ids)&&s.ids.length<=questions.length){
   const selected=[...new Set(s.ids.filter(id=>ids.has(id)))];
   if(selected.length){state.session={ids:selected,index:Math.min(Math.max(Number.isInteger(s.index)?s.index:0,0),selected.length-1),answers:{},mode:['all','wrong','saved'].includes(s.mode)?s.mode:'all',complete:s.complete===true};
    for(const id of selected){const a=s.answers?.[id];if(a&&Number.isInteger(a.choice)&&a.choice>=0&&a.choice<=3)state.session.answers[id]={choice:a.choice,correct:a.choice===questions.find(q=>q.id===id).answer};}
    if(state.session.complete&&Object.keys(state.session.answers).length!==selected.length)state.session.complete=false;
   }
  }
  return state;
 }
 const api={empty,record,stats,pool,shuffle,sanitize};root.LECEngine=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
