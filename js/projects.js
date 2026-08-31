import {all,put,del} from "./storage.js";
const id=()=>crypto.randomUUID();
export async function listProjects(){return (await all("projects")).sort((a,b)=>b.updated-a.updated)}
export async function createProject(name){const p={id:id(),name:name||"Лоиҳаи нав",updated:Date.now(),files:[{id:id(),path:"index.html",type:"file",content:"<!doctype html>\\n<html lang=\"tg\">\\n<head><meta charset=\"utf-8\"><link rel=\"stylesheet\" href=\"style.css\"></head>\\n<body><h1>Салом, ZEROHUBUIAL!</h1><script src=\"app.js\"></script></body>\\n</html>"} ,{id:id(),path:"style.css",type:"file",content:"body{font-family:sans-serif;padding:24px;background:#07111f;color:white}"},{id:id(),path:"app.js",type:"file",content:"console.log('ZEROHUBUIAL омода аст');"}]};await put("projects",p);return p}
export async function saveProject(p){p.updated=Date.now();await put("projects",p);return p}
export async function deleteProject(id){await del("projects",id)}
export function findFile(p,path){return p.files.find(f=>f.type==="file"&&f.path===path)}
export function normalizePath(p){return p.replace(/^\/+/,"").replace(/\/+/g,"/")}
export async function addFile(p,path,content=""){path=normalizePath(path);if(!path||findFile(p,path))throw Error("Файл вуҷуд дорад");p.files.push({id:id(),path,type:"file",content});return saveProject(p)}
export async function addFolder(p,path){path=normalizePath(path).replace(/\/$/,"");if(!path||p.files.some(f=>f.path===path))throw Error("Папка вуҷуд дорад");p.files.push({id:id(),path,type:"folder",content:""});return saveProject(p)}
export async function removeNode(p,node){const base=node.path.replace(/\/$/,"");p.files=p.files.filter(f=>f.path!==base&&!f.path.startsWith(base+"/"));return saveProject(p)}
export async function renameNode(p,node,name){const parts=node.path.split("/");parts.pop();const np=[...parts,name].filter(Boolean).join("/");if(p.files.some(f=>f.path===np))throw Error("Ин ном аллакай ҳаст");for(const f of p.files){if(f.path===node.path||f.path.startsWith(node.path+"/"))f.path=np+f.path.slice(node.path.length)}return saveProject(p)}
