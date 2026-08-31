export function buildPreview(project){
const index=project.files.find(f=>f.path==="index.html"&&f.type==="file");if(!index)throw Error("index.html ёфт нашуд");
let html=index.content;
const css=project.files.filter(f=>f.type==="file"&&f.path.endsWith(".css")).map(f=>`<style data-zero="${f.path}">${f.content}</style>`).join("\\n");
const js=project.files.filter(f=>f.type==="file"&&f.path.endsWith(".js")).map(f=>`<script data-zero="${f.path}">${f.content.replace(/<\\/script/gi,"<\\\\/script")}<\\/script>`).join("\\n");
html=html.replace(/<link[^>]+href=["'][^"']+\\.css["'][^>]*>/gi,"");html=html.replace(/<script[^>]+src=["'][^"']+\\.js["'][^>]*><\\/script>/gi,"");
if(/<\\/head>/i.test(html))html=html.replace(/<\\/head>/i,css+"</head>");else html=css+html;
if(/<\\/body>/i.test(html))html=html.replace(/<\\/body>/i,js+"</body>");else html+=js;
return html}
export function runProject(project){
const w=window.open("about:blank","_blank");if(!w)throw Error("Браузер кушодани пешнамоишро иҷозат надод");
const html=buildPreview(project);w.document.open();w.document.write(html);w.document.close();return w}
