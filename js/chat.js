import {all,put} from "./storage.js";import {askAI} from "./ai.js";
export async function loadChat(){let a=await all("chats");return a[0]||{id:"main",messages:[]}}
export async function sendChat(project,text){const c=await loadChat();c.messages.push({role:"user",content:text,at:Date.now()});await put("chats",c);const r=await askAI(c.messages,project);c.messages.push({role:"assistant",content:r.text,at:Date.now()});await put("chats",c);return {chat:c,response:r}}
