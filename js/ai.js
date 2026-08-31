import {getKeys} from "./keys.js";
export async function askAI(messages,project){
const keys=getKeys();if(!keys.length)throw Error("Аввал API Key илова кунед.");
const payload={messages,project:{name:project.name,files:project.files.map(f=>({path:f.path,type:f.type,content:f.type==="file"?f.content:""}))}};
const failed=[];
for(const k of keys){try{
 const url=(k.endpoint||"").trim();if(!url)throw Error("Суроғаи провайдер барои калид муайян нашудааст.");
 const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${k.key}`},body:JSON.stringify({...payload,model:k.model||undefined})});
 if(!r.ok){failed.push(k.id);continue}
 const data=await r.json();return {key:k,text:data.choices?.[0]?.message?.content||data.output_text||data.response||JSON.stringify(data)}
}catch(e){failed.push(k.id)}}
throw Error("Ҳеҷ яке аз калидҳои дастрас ҷавоби муваффақ надод.");}
