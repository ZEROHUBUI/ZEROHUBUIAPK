import {ls} from "./storage.js";
const KEY="zero_settings";
export function settings(){return ls.get(KEY,{theme:"dark",fontSize:13,server:"http://localhost:8080",intro:true})}
export function saveSettings(s){ls.set(KEY,s);return s}
