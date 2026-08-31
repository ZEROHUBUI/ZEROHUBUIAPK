export function nativeBridge(){return {isAndroid:false,download(url,name){const a=document.createElement("a");a.href=url;a.download=name||"app.apk";a.click()}}}
