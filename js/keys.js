import {ls} from "./storage.js";
const KEY="zero_ai_keys";
export function getKeys(){return ls.get(KEY,[])}
export function saveKey(k){const a=getKeys();k.id=k.id||crypto.randomUUID();a.push(k);ls.set(KEY,a);return k}
export function deleteKey(id){ls.set(KEY,getKeys().filter(k=>k.id!==id))}
export function nextKey(exclude=[]){return getKeys().find(k=>!exclude.includes(k.id))}
