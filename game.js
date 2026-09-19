import * as THREE from 'three';

// =========================================================
//  UzRacer — client o'yin mantig'i
// =========================================================

const socket = io();

let myId = null;
let carsCatalog = [];
let myCarId = 'malika';
let myCoins = 0;

// ---------- Uch o'lchamli sahna sozlash ----------
const canvas = document.getElementById('gameCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 80, 260);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Yorug'lik ----------
scene.add(new THREE.AmbientLight(0xffffff, 0.65));
const sun = new THREE.DirectionalLight(0xffffff, 0.9);
sun.position.set(60, 100, 40);
scene.add(sun);

// ---------- Yer / maydon ----------
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(600, 600),
  new THREE.MeshStandardMaterial({ color: 0x2f8f4e })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// ---------- Doiraviy trek (yo'l chizig'i) ----------
const TRACK_RADIUS = 60;
const TRACK_WIDTH = 14;
const trackMat = new THREE.MeshStandardMaterial({ color: 0x333844 });
const track = new THREE.Mesh(
  new THREE.RingGeometry(TRACK_RADIUS - TRACK_WIDTH / 2, TRACK_RADIUS + TRACK_WIDTH / 2, 64),
  trackMat
);
track.rotation.x = -Math.PI / 2;
track.position.y = 0.01;
scene.add(track);

// Yo'l chetlaridagi O'zbekiston bayrog'i ranglaridagi chiziqlar
function addStripeRing(radius, color) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius - 0.3, radius + 0.3, 64),
    new THREE.MeshBasicMaterial({ color })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  scene.add(ring);
}
addStripeRing(TRACK_RADIUS - TRACK_WIDTH / 2, 0x0099b5);
addStripeRing(TRACK_RADIUS + TRACK_WIDTH / 2, 0x1eb53a);

// Markazda yodgorlik minorasi (Registon uslubida, soddalashtirilgan)
const towerBase = new THREE.Mesh(
  new THREE.CylinderGeometry(6, 7, 20, 16),
  new THREE.MeshStandardMaterial({ color: 0xd8c9a3 })
);
towerBase.position.set(0, 10, 0);
scene.add(towerBase);
const towerDome = new THREE.Mesh(
  new THREE.SphereGeometry(6, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: 0x0099b5 })
);
towerDome.position.set(0, 20, 0);
scene.add(towerDome);

// =========================================================
//  Mashina yaratish (geometriyadan, tashqi model kerak emas)
// =========================================================
function buildCarMesh(color) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2, 0.6, 4),
    new THREE.MeshStandardMaterial({ color })
  );
  body.position.y = 0.6;
  group.add(body);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.5, 1.8),
    new THREE.MeshStandardMaterial({ color: 0x1a1f29 })
  );
  cabin.position.set(0, 1.05, -0.2);
  group.add(cabin);

  const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.4, 12);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111318 });
  const wheelPositions = [
    [-1.1, 0.4, 1.3], [1.1, 0.4, 1.3],
    [-1.1, 0.4, -1.3], [1.1, 0.4, -1.3],
  ];
  wheelPositions.forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, y, z);
    group.add(wheel);
  });

  return group;
}

function makeNameTag(text) {
  const canvasTag = document.createElement('canvas');
  canvasTag.width = 256; canvasTag.height = 64;
  const ctx = canvasTag.getContext('2d');
  ctx.fillStyle = 'rgba(10,16,28,0.75)';
  ctx.roundRect ? ctx.roundRect(0, 8, 256, 48, 12) : ctx.fillRect(0, 8, 256, 48);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, 128, 42);
  const tex = new THREE.CanvasTexture(canvasTag);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sprite.scale.set(4, 1, 1);
  sprite.position.y = 2.4;
  return sprite;
}

// ---------- Mening mashinam ----------
let myCar = null;
const myState = { x: TRACK_RADIUS, y: 0, z: 0, rotY: Math.PI / 2, speed: 0 };

// ---------- Boshqa o'yinchilar ----------
const otherCars = {}; // id -> { group, nameSprite }
const coinMeshes = {}; // coinId -> mesh

function spawnCoin(coin) {
  const geo = new THREE.CylinderGeometry(0.8, 0.8, 0.2, 20);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffd23b, metalness: 0.6, roughness: 0.3 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(coin.x, 1.1, coin.z);
  scene.add(mesh);
  coinMeshes[coin.id] = mesh;
}

function removeCoin(coinId) {
  const mesh = coinMeshes[coinId];
  if (mesh) { scene.remove(mesh); delete coinMeshes[coinId]; }
}

// =========================================================
//  Boshqarish (klaviatura)
// =========================================================
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
  if (e.key.toLowerCase() === 'g') toggleGarage();
});
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

function currentCarSpec() {
  return carsCatalog.find((c) => c.id === myCarId) || { maxSpeed: 42, accel: 22 };
}

function updateMyCar(dt) {
  if (!myCar) return;
  const spec = currentCarSpec();
  const accelInput = (keys['w'] || keys['arrowup']) ? 1 : (keys['s'] || keys['arrowdown']) ? -1 : 0;
  const steerInput = (keys['a'] || keys['arrowleft']) ? 1 : (keys['d'] || keys['arrowright']) ? -1 : 0;

  // Tezlanish / tormoz / ishqalanish
  if (accelInput !== 0) {
    myState.speed += accelInput * spec.accel * dt;
  } else {
    const friction = 18 * dt;
    if (myState.speed > 0) myState.speed = Math.max(0, myState.speed - friction);
    else if (myState.speed < 0) myState.speed = Math.min(0, myState.speed + friction);
  }
  myState.speed = THREE.MathUtils.clamp(myState.speed, -spec.maxSpeed * 0.4, spec.maxSpeed);

  // Burilish - tezlikka bog'liq
  if (Math.abs(myState.speed) > 0.05) {
    const turnFactor = THREE.MathUtils.clamp(Math.abs(myState.speed) / spec.maxSpeed, 0.15, 1);
    myState.rotY += steerInput * 1.8 * dt * turnFactor * Math.sign(myState.speed || 1);
  }

  myState.x += Math.sin(myState.rotY) * myState.speed * dt;
  myState.z += Math.cos(myState.rotY) * myState.speed * dt;

  myCar.position.set(myState.x, myState.y, myState.z);
  myCar.rotation.y = myState.rotY;

  // Kamera - orqadan kuzatish
  const camDist = 9, camHeight = 4.2;
  const camX = myState.x - Math.sin(myState.rotY) * camDist;
  const camZ = myState.z - Math.cos(myState.rotY) * camDist;
  camera.position.lerp(new THREE.Vector3(camX, camHeight, camZ), 0.12);
  camera.lookAt(myState.x, myState.y + 1, myState.z);

  // HUD tezlik
  const kmh = Math.round(Math.abs(myState.speed) * 6);
  document.getElementById('speedBox').innerHTML = kmh + ' <span>km/soat</span>';

  // Tangalarni tekshirish
  for (const id in coinMeshes) {
    const m = coinMeshes[id];
    const dist = Math.hypot(m.position.x - myState.x, m.position.z - myState.z);
    if (dist < 2.5) {
      socket.emit('collectCoin', id);
    }
  }
}

let lastMoveEmit = 0;
function maybeSendMove(time) {
  if (time - lastMoveEmit > 60) {
    socket.emit('move', { x: myState.x, y: myState.y, z: myState.z, rotY: myState.rotY });
    lastMoveEmit = time;
  }
}

// =========================================================
//  Server bilan aloqa
// =========================================================
socket.on('init', (data) => {
  myId = data.id;
  carsCatalog = data.cars;

  myCar = buildCarMesh(currentCarSpec().color || 0xce1126);
  scene.add(myCar);

  data.coins.forEach(spawnCoin);

  Object.values(data.players).forEach((p) => {
    if (p.id !== myId) addOtherPlayer(p);
  });

  renderCarList();
});

socket.on('playerJoined', (p) => { if (p.id !== myId) addOtherPlayer(p); });

socket.on('playerLeft', (id) => {
  const entry = otherCars[id];
  if (entry) {
    scene.remove(entry.group);
    scene.remove(entry.nameSprite);
    delete otherCars[id];
  }
  updatePlayerListUI();
});

socket.on('state', (players) => {
  for (const id in players) {
    if (id === myId) {
      myCoins = players[id].coins;
      document.getElementById('coinCount').textContent = myCoins;
      continue;
    }
    const p = players[id];
    if (!otherCars[id]) { addOtherPlayer(p); continue; }
    const entry = otherCars[id];
    entry.group.position.set(p.x, p.y, p.z);
    entry.group.rotation.y = p.rotY;
    entry.nameSprite.position.set(p.x, p.y + 2.4, p.z);
  }
  updatePlayerListUI(players);
});

socket.on('coinCollected', ({ coinId, by, coins }) => {
  removeCoin(coinId);
  if (by === myId) {
    myCoins = coins;
    document.getElementById('coinCount').textContent = myCoins;
  }
});

socket.on('coinRespawned', (coinId) => {
  const angleIndex = parseInt(coinId.replace('c', ''), 10);
  const angle = (angleIndex / 24) * Math.PI * 2;
  spawnCoin({ id: coinId, x: Math.cos(angle) * TRACK_RADIUS, z: Math.sin(angle) * TRACK_RADIUS });
});

socket.on('purchaseResult', ({ ok, carId, coins, reason }) => {
  myCoins = coins;
  document.getElementById('coinCount').textContent = myCoins;
  if (ok) {
    myCarId = carId;
    const spec = currentCarSpec();
    scene.remove(myCar);
    myCar = buildCarMesh(spec.color);
    myCar.position.set(myState.x, myState.y, myState.z);
    myCar.rotation.y = myState.rotY;
    scene.add(myCar);
  } else if (reason === 'kam-pul') {
    alert("Kechirasiz, tanga yetarli emas! Trekda haydab ko'proq tanga to'plang.");
  }
  renderCarList();
});

function addOtherPlayer(p) {
  const car = carsCatalog.find((c) => c.id === p.carId) || carsCatalog[0];
  const group = buildCarMesh(car ? car.color : 0xffffff);
  group.position.set(p.x, p.y, p.z);
  scene.add(group);
  const nameSprite = makeNameTag(p.name);
  nameSprite.position.set(p.x, p.y + 2.4, p.z);
  scene.add(nameSprite);
  otherCars[p.id] = { group, nameSprite };
  updatePlayerListUI();
}

function updatePlayerListUI(playersState) {
  const box = document.getElementById('playerList');
  const total = Object.keys(otherCars).length + 1;
  box.textContent = total + " o'yinchi onlayn";
}

// =========================================================
//  UI: kirish ekrani, garaj
// =========================================================
document.getElementById('playBtn').addEventListener('click', startGame);
document.getElementById('nameInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') startGame();
});

function startGame() {
  const name = document.getElementById('nameInput').value.trim() || "O'yinchi";
  socket.emit('setName', name);
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
}

function toggleGarage() {
  document.getElementById('garage').classList.toggle('hidden');
}
document.getElementById('closeGarage').addEventListener('click', toggleGarage);

function renderCarList() {
  const box = document.getElementById('carList');
  box.innerHTML = '';
  carsCatalog.forEach((car) => {
    const row = document.createElement('div');
    row.className = 'carRow';
    const owned = car.id === myCarId;
    row.innerHTML = `
      <div class="carInfo">
        <span class="carSwatch" style="background:#${car.color.toString(16).padStart(6, '0')}"></span>
        <div>
          ${car.name}
          <span class="carStats">Tezlik: ${car.maxSpeed} • Narxi: ${car.price === 0 ? 'Bepul' : car.price + ' 🪙'}</span>
        </div>
      </div>
      <button class="buyBtn" data-id="${car.id}" ${owned ? 'disabled' : ''}>
        ${owned ? 'Tanlangan' : (car.price === 0 ? 'Tanlash' : 'Sotib olish')}
      </button>
    `;
    box.appendChild(row);
  });
  box.querySelectorAll('.buyBtn').forEach((btn) => {
    btn.addEventListener('click', () => socket.emit('buyCar', btn.dataset.id));
  });
}

// =========================================================
//  Asosiy sikl
// =========================================================
let lastTime = performance.now();
function animate(time) {
  requestAnimationFrame(animate);
  const dt = Math.min((time - lastTime) / 1000, 0.1);
  lastTime = time;

  updateMyCar(dt);
  maybeSendMove(time);

  renderer.render(scene, camera);
}
requestAnimationFrame(animate);
