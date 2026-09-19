# 🏁 UzRacer

O'zbekcha, brauzerda ishlaydigan, **real vaqtli multiplayer** 3D mashina yarish o'yini.
Three.js (3D grafika) + Node.js/Express/Socket.io (server) asosida qurilgan.

## Xususiyatlari
- 3D trek, kamera mashina orqasidan kuzatib boradi
- Real vaqtda boshqa o'yinchilarni bir xaritada ko'rish (Socket.io orqali)
- Trekda tanga (coin) yig'ib, o'yin ichi pulini orttirish
- Garaj (`G` tugmasi) — yig'ilgan tanga evaziga yangi, tezroq mashina sotib olish
- 4 ta o'yin ichi mashina: Malika Sport (bepul), Registon GT, Sher-1 Turbo, Amir Racer X

## Ishga tushirish (o'zingizning kompyuteringizda)

```bash
cd uzracer
npm install
npm start
```

Keyin brauzerda oching: **http://localhost:3000**

Do'stlaringiz ham ulanishi uchun kompyuteringiz IP manzilini (masalan `http://192.168.1.5:3000`)
bir tarmoqdagilarga bering, yoki quyidagi "Serverga joylash" bo'limiga qarang.

## Serverga (internetga) joylash

Bu oddiy Node.js ilovasi — quyidagi bepul/arzon xizmatlarning istalganiga joylashtirish mumkin:
- **Render.com** yoki **Railway.app** — GitHub repozitoriyangizni ulaysiz, ular avtomatik `npm install && npm start` qiladi
- **VPS (masalan DigitalOcean, Timeweb)** — `git clone`, keyin `npm install && npm start` (yoki `pm2 start server.js` doimiy ishlashi uchun)

`server.js` faylidagi `PORT` muhit o'zgaruvchisi orqali portni moslashtirish mumkin.

## GitHub'ga yuklash

```bash
cd uzracer
git init
git add .
git commit -m "UzRacer: birinchi versiya"
git branch -M main
git remote add origin https://github.com/<sizning-nom>/<repo-nomi>.git
git push -u origin main
```

(GitHub'da avval bo'sh repozitoriya yaratib oling, so'ng yuqoridagi `<sizning-nom>` va
`<repo-nomi>` qismlarini almashtiring.)

## Cheklovlar va keyingi qadamlar

Bu — ishlaydigan **boshlang'ich versiya** (MVP). Diqqat qilinishi kerak bo'lgan joylar:

- **Ma'lumotlar saqlanmaydi**: o'yinchi tangalari va tanlagan mashinasi faqat server xotirasida
  turadi — server qayta ishga tushsa yoki o'yinchi sahifani yangilasa, hisob nolga tushadi.
  Doimiy saqlash uchun MongoDB yoki PostgreSQL kabi ma'lumotlar bazasi va login tizimi qo'shish kerak.
- **Haqiqiy pul bilan to'lov** (masalan Payme, Click) hozircha yo'q — bu alohida, bank/to'lov
  tizimi bilan integratsiya talab qiladigan qism. Hozirgi tizim faqat o'yin ichi (trekda
  haydab yig'iladigan) tangalar bilan ishlaydi.
- **Xarita va mashina modellari** hozircha oddiy geometrik shakllardan iborat. Keyinchalik
  Blender'da tayyorlangan `.glb` 3D modellarni yuklab, ancha real ko'rinish berish mumkin.
  Yo'l chegaralari hozircha "erkin maydon" — mashina yo'ldan chiqibketishi mumkin, xohlasangiz
  to'siqlar (collision) qo'shib, haqiqiy trekka o'xshatsak bo'ladi.
- **Antifrod**: hozircha tanga yig'ish server tomonida tekshiriladi (yaxshi), lekin mashina
  tezligi/pozitsiyasi client tomonidan yuboriladi — mo'ljallangan o'yinchilar sonidan ko'p
  bo'lsa yoki jamoat serveriga qo'ysangiz, server tomonida tezlik/pozitsiya tekshiruvini
  kuchaytirish tavsiya etiladi.

## Fayllar tuzilishi

```
uzracer/
├── package.json      — server bog'liqliklari
├── server.js         — Socket.io serveri, o'yinchilar/tangalar holati
└── public/
    ├── index.html     — asosiy sahifa
    ├── style.css       — interfeys dizayni
    └── game.js         — Three.js o'yin mantig'i (haydash, kamera, tarmoq)
```
