package main
import("io";"log";"net/http";"os";"strings")
func main(){target:=strings.TrimRight(getenv("H2APK_URL","http://127.0.0.1:8080"),"/");mux:=http.NewServeMux()
mux.HandleFunc("/health",func(w http.ResponseWriter,r *http.Request){w.Header().Set("Content-Type","application/json");io.WriteString(w,`{"status":"ok"}`)})
mux.HandleFunc("/api/build",proxy(target+"/api/build"))
mux.HandleFunc("/api/status/",proxyDynamic(target))
mux.HandleFunc("/api/log/",proxyDynamic(target))
mux.HandleFunc("/api/download/",proxyDynamic(target))
mux.HandleFunc("/api/download-file/",proxyDynamic(target))
log.Println("ZEROHUBUIAL server listening on :8090; H2APK:",target)
log.Fatal(http.ListenAndServe(getenv("PORT","8090"),cors(mux)))}
func proxy(url string)http.HandlerFunc{return func(w http.ResponseWriter,r *http.Request){if r.Method=="OPTIONS"{w.WriteHeader(204);return};req,_:=http.NewRequestWithContext(r.Context(),r.Method,url,r.Body);req.Header=r.Header.Clone();resp,err:=http.DefaultClient.Do(req);if err!=nil{http.Error(w,err.Error(),502);return};defer resp.Body.Close();for k,v:=range resp.Header{w.Header()[k]=v};w.WriteHeader(resp.StatusCode);io.Copy(w,resp.Body)}}
func proxyDynamic(base string)http.HandlerFunc{return func(w http.ResponseWriter,r *http.Request){u:=base+r.URL.Path;if r.URL.RawQuery!=""{u+="?"+r.URL.RawQuery};proxy(u)(w,r)}}
func cors(next http.Handler)http.Handler{return http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){w.Header().Set("Access-Control-Allow-Origin","*");w.Header().Set("Access-Control-Allow-Headers","Content-Type, Authorization");w.Header().Set("Access-Control-Allow-Methods","GET,POST,OPTIONS");next.ServeHTTP(w,r)})}
func getenv(k,d string)string{if v:=os.Getenv(k);v!=""{return v};return d}
