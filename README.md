# ZEROHUBUIAL

Муҳити мобилии HTML/CSS/JavaScript бо нигоҳдории маҳаллӣ, муҳаррири код, пешнамоиш, чат ва пайвастшавии воқеӣ ба H2APK.

## Муҳим
Барномаи веб танҳо қабати корбар аст. Барои сохтани APK сервери H2APK лозим аст.

H2APK:
https://github.com/HashShin/H2APK

Занҷири сохтмон:
ZEROHUBUIAL → сервери ZEROHUBUIAL → H2APK → APK

## Оғози H2APK
Дар сервер:
```bash
git clone --depth=1 https://github.com/HashShin/H2APK
cd H2APK
./setup.sh
go build -o h2apk main.go
./h2apk
```

H2APK бо нобаёнӣ порти 8080-ро истифода мебарад.

## Оғози қабати серверӣ
```bash
cd server
H2APK_URL=http://127.0.0.1:8080 go run .
```

Баъд дар Танзимоти ZEROHUBUIAL суроғаи:
`http://АДРЕСИ-СЕРВЕР:8090`
гузошта мешавад.

## API-и истифодашуда
Аз H2APK:
- POST /api/build
- GET /api/status/{id}
- GET /api/log/{id}
- GET /api/download/{id}

Ҷисми `/api/build` JSON мебошад ва майдонҳои он мувофиқи `internal/types/types.go` дар H2APK истифода шудаанд.
