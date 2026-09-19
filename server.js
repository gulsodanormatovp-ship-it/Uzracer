// =========================================================
//  UzRacer server — real vaqtli multiplayer mashina o'yini
//  Node.js + Express + Socket.io
// =========================================================
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

// ---------- Mashinalar ro'yxati (o'yin ichi valyutasi bilan sotib olinadi) ----------
const CARS = [
  { id: 'malika',   name: "Malika Sport",  color: 0xce1126, maxSpeed: 42, accel: 22, price: 0 },
  { id: 'registon', name: "Registon GT",   color: 0x0099b5, maxSpeed: 50, accel: 20, price: 500 },
  { id: 'sher',     name: "Sher-1 Turbo",  color: 0xffd23b, maxSpeed: 58, accel: 24, price: 1500 },
  { id: 'amir',     name: "Amir Racer X",  color: 0x1eb53a, maxSpeed: 68, accel: 26, price: 4000 },
];

// ---------- Trek bo'ylab tangalar (coin) ----------
const TRACK_RADIUS = 60;
const COIN_COUNT = 24;
const COINS = [];
for (let i = 0; i < COIN_COUNT; i++) {
  const angle = (i / COIN_COUNT) * Math.PI * 2;
  COINS.push({
    id: 'c' + i,
    x: Math.cos(angle) * TRACK_RADIUS,
    z: Math.sin(angle) * TRACK_RADIUS,
    active: true,
  });
}

const players = {}; // socket.id -> { id, name, x,y,z, rotY, carId, coins }

io.on('connection', (socket) => {
  players[socket.id] = {
    id: socket.id,
    name: "O'yinchi-" + socket.id.slice(0, 4),
    x: TRACK_RADIUS, y: 0, z: 0, rotY: 0,
    carId: 'malika',
    coins: 0,
  };

  // Yangi o'yinchiga boshlang'ich holatni yuborish
  socket.emit('init', {
    id: socket.id,
    cars: CARS,
    coins: COINS.filter((c) => c.active),
    players,
  });

  // Boshqalarga xabar berish
  socket.broadcast.emit('playerJoined', players[socket.id]);

  socket.on('setName', (name) => {
    const p = players[socket.id];
    if (p && typeof name === 'string' && name.trim()) {
      p.name = name.trim().slice(0, 16);
    }
  });

  socket.on('buyCar', (carId) => {
    const p = players[socket.id];
    const car = CARS.find((c) => c.id === carId);
    if (!p || !car) return;

    if (p.carId === carId) {
      socket.emit('purchaseResult', { ok: true, carId, coins: p.coins, alreadyOwned: true });
      return;
    }
    if (p.coins >= car.price) {
      p.coins -= car.price;
      p.carId = carId;
      socket.emit('purchaseResult', { ok: true, carId, coins: p.coins });
    } else {
      socket.emit('purchaseResult', { ok: false, reason: 'kam-pul', coins: p.coins });
    }
  });

  socket.on('move', (data) => {
    const p = players[socket.id];
    if (!p || typeof data !== 'object') return;
    p.x = data.x; p.y = data.y; p.z = data.z; p.rotY = data.rotY;
  });

  socket.on('collectCoin', (coinId) => {
    const coin = COINS.find((c) => c.id === coinId);
    const p = players[socket.id];
    if (!coin || !coin.active || !p) return;

    coin.active = false;
    p.coins += 10;
    io.emit('coinCollected', { coinId, by: socket.id, coins: p.coins });

    // 8 soniyadan keyin tanga qayta paydo bo'ladi
    setTimeout(() => {
      coin.active = true;
      io.emit('coinRespawned', coinId);
    }, 8000);
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerLeft', socket.id);
  });
});

// Har 50ms da barcha o'yinchilar holatini sinxronlash (~20 marta/soniya)
setInterval(() => {
  io.emit('state', players);
}, 50);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('UzRacer server ishga tushdi: http://localhost:' + PORT);
});
