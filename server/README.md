# Сервери ZEROHUBUIAL

Интерфейс бевосита сохтмон намекунад. Ин сервер танҳо дархостҳоро ба H2APK мегузаронад.

Талабот:
- Go 1.22+
- H2APK-и воқеӣ дар сервери сохтмон
- H2APK бо воситаҳои сохтмонӣ омода карда шудааст

Оғоз:
```bash
H2APK_URL=http://127.0.0.1:8080 go run .
```

Суроғаи сервер барои ZEROHUBUIAL:
`http://АДРЕСИ-СЕРВЕР:8090`

H2APK endpoint-ҳои истифодашуда:
POST /api/build
GET /api/status/{id}
GET /api/log/{id}
GET /api/download/{id}

Ин endpoint-ҳо аз сохтори воқеии H2APK гирифта шудаанд.
