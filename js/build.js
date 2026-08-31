import {saveProject} from "./projects.js";
function b64(s){return btoa(unescape(encodeURIComponent(s)))}
function assetMap(project){const m={};for(const f of project.files){if(f.type==="file"&&!["index.html","style.css","app.js"].includes(f.path))m[f.path]=b64(f.content)}return m}
export async function startBuild(project,opts,onLog){
const body={app_name:opts.appName,package_name:opts.packageName,html:project.files.find(f=>f.path==="index.html")?.content||"",css:project.files.find(f=>f.path==="style.css")?.content||"",js:project.files.find(f=>f.path==="app.js")?.content||"",version:opts.version||"1.0",version_code:opts.versionCode||1,build_mode:opts.buildMode||"debug",theme_color:opts.themeColor||"#0a7cff",zoom_enabled:true,pull_refresh:false,transparent_nav:false,hide_scrollbars:false,disable_copy_text:false,allow_cleartext:true,asset_files:assetMap(project)};
const base=(opts.server||"").replace(/\/$/,"");if(!base)throw Error("Суроғаи сервери сохтмон муайян нашудааст.");
const r=await fetch(base+"/api/build",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const info=await r.json();if(!r.ok||!info.success)throw Error(info.error||"H2APK сохтмонро қабул накард.");
const id=info.build_id;onLog?.("Сохтмон қабул шуд: "+id);
const es=new EventSource(base+"/api/log/"+encodeURIComponent(id));let done=false;
const finished=new Promise((resolve,reject)=>{es.onmessage=e=>{onLog?.(e.data)};es.addEventListener("done",e=>{done=true;es.close();resolve(JSON.parse(e.data))});es.addEventListener("failed",e=>{done=true;es.close();reject(Error(e.data||"Сохтмони H2APK ноком шуд"))});es.onerror=()=>{if(!done){es.close();poll(base,id,onLog).then(resolve).catch(reject)}}});
const art=await finished;return {id,artifacts:art,download:base+"/api/download/"+encodeURIComponent(id)}
}
async function poll(base,id,onLog){for(;;){const r=await fetch(base+"/api/status/"+encodeURIComponent(id));const x=await r.json();if(x.log)onLog?.(x.log);if(x.error)throw Error(x.error);if(x.success)return x.artifacts||[];await new Promise(r=>setTimeout(r,1200))}}
