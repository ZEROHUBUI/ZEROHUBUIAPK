const DB="zerohubui_db",VER=1;
let dbPromise;
function openDB(){if(dbPromise)return dbPromise;dbPromise=new Promise((res,rej)=>{const r=indexedDB.open(DB,VER);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains("projects"))d.createObjectStore("projects",{keyPath:"id"});if(!d.objectStoreNames.contains("chats"))d.createObjectStore("chats",{keyPath:"id"});};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});return dbPromise}
export async function put(store,v){const d=await openDB();return new Promise((res,rej)=>{const t=d.transaction(store,"readwrite");t.objectStore(store).put(v);t.oncomplete=()=>res(v);t.onerror=()=>rej(t.error)})}
export async function get(store,id){const d=await openDB();return new Promise((res,rej)=>{const t=d.transaction(store);const r=t.objectStore(store).get(id);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
export async function all(store){const d=await openDB();return new Promise((res,rej)=>{const t=d.transaction(store);const r=t.objectStore(store).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
export async function del(store,id){const d=await openDB();return new Promise((res,rej)=>{const t=d.transaction(store,"readwrite");t.objectStore(store).delete(id);t.oncomplete=()=>res();t.onerror=()=>rej(t.error)})}
export const ls={get(k,f=null){try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}},set(k,v){localStorage.setItem(k,JSON.stringify(v))},del(k){localStorage.removeItem(k)}};
