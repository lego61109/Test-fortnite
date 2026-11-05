(() => {
const game = document.getElementById("game");
const phase = document.getElementById("phase");
const stats = document.getElementById("stats");
const message = document.getElementById("message");
const intro = document.getElementById("intro");
const startButton = document.getElementById("start");
if (!window.THREE) {
message.textContent = "3D library did not load. Check your internet connection and click Run again.";
return;
}
const THREE = window.THREE;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x89d8f5);
scene.fog = new THREE.Fog(0x89d8f5, 90, 260);
const camera = new THREE.PerspectiveCamera(67, innerWidth / innerHeight, 0.1, 500);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
game.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xc8eeff, 0x586c38, 2));
const sun = new THREE.DirectionalLight(0xfff1c5, 2.7);
sun.position.set(-55, 90, 35);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);
const ground = new THREE.Mesh(
new THREE.CylinderGeometry(100, 108, 7, 48),
new THREE.MeshStandardMaterial({ color: 0x77c85d })
);
ground.position.y = -3.5;
ground.receiveShadow = true;
scene.add(ground);
const water = new THREE.Mesh(
new THREE.CircleGeometry(170, 48),
new THREE.MeshStandardMaterial({ color: 0x38a9d7, roughness: 0.5 })
);
water.rotation.x = -Math.PI / 2;
water.position.y = -7.3;
scene.add(water);
function material(color) {
return new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
}
function makeTree(x, z, size) {
const trunk = new THREE.Mesh(
new THREE.CylinderGeometry(0.2 * size, 0.3 * size, 2 * size, 7),
material(0x79502c)
);
trunk.position.set(x, size, z);
trunk.castShadow = true;
scene.add(trunk);
for (let i = 0; i < 3; i++) {
  const top = new THREE.Mesh(
    new THREE.ConeGeometry((1.25 - i * 0.18) * size, 2.1 * size, 7),
    material([0x237d4b, 0x2c944c, 0x4aaa54][i])
  );
  top.position.set(x, (2 + i * 0.65) * size, z);
  top.castShadow = true;
  scene.add(top);
}

}
function makeHouse(x, z, color) {
const body = new THREE.Mesh(
new THREE.BoxGeometry(9, 6, 8),
material(color)
);
body.position.set(x, 3, z);
body.castShadow = true;
body.receiveShadow = true;
scene.add(body);
const roof = new THREE.Mesh(
  new THREE.ConeGeometry(7, 4, 4),
  material(0xffd06a)
);
roof.position.set(x, 8, z);
roof.rotation.y = Math.PI / 4;
roof.castShadow = true;
scene.add(roof);

const door = new THREE.Mesh(
  new THREE.BoxGeometry(1.5, 3, 0.2),
  material(0x513b39)
);
door.position.set(x, 1.5, z + 4.1);
scene.add(door);

}
[
[-42,-27,0xe9a64c], [46,-40,0xe77455],
[33,36,0x64a9e8], [-60,43,0xb080d8]
].forEach(item => makeHouse(item[0], item[1], item[2]));
for (let i = 0; i < 34; i++) {
const angle = i * 2.399;
const radius = 42 + (i % 5) * 8;
makeTree(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.8 + (i % 4) * 0.1);
}
function makeCharacter(color, isPlayer) {
const root = new THREE.Group();
const outfit = material(color);
const skin = material(0xd4a17f);
const dark = material(0x27344c);
const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.7, 1.15, 4, 8), outfit);
body.position.y = 2.05;
body.castShadow = true;
root.add(body);

const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), skin);
head.position.y = 3.25;
head.castShadow = true;
root.add(head);

const hair = new THREE.Mesh(new THREE.SphereGeometry(0.52, 12, 8), dark);
hair.scale.set(1, 0.55, 1);
hair.position.y = 3.56;
root.add(hair);

const pack = new THREE.Mesh(
  new THREE.BoxGeometry(1.0, 1.0, 0.4),
  material(isPlayer ? 0xffd251 : 0xa9b4c4)
);
pack.position.set(0, 2.1, 0.75);
root.add(pack);

const legs = [];
for (const side of [-1, 1]) {
  const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.85, 3, 6), dark);
  leg.position.set(side * 0.36, 0.72, 0);
  leg.castShadow = true;
  root.add(leg);
  legs.push(leg);
}

root.userData.legs = legs;
return root;

}
const player = {
x: 0, z: 22, y: 0, vy: 0,
health: 100, shield: 0, ammo: 24, materials: 0,
grounded: true, crouch: false, moving: false,
mesh: makeCharacter(0x3978ff, true)
};
scene.add(player.mesh);
let bots = [];
let loot = [];
let walls = [];
let bus;
let storm;
let stormRadius = 74;
let mode = "lobby";
let yaw = 0;
let pitch = 0.12;
let tick = 0;
let lastTime = 0;
let messageTimer = 0;
function say(text) {
message.textContent = text;
messageTimer = 180;
}
function makeLoot(x, z, type) {
const color = type === "ammo" ? 0xffdf4a : type === "shield" ? 0x47e5ff : 0xff9945;
const orb = new THREE.Mesh(
new THREE.IcosahedronGeometry(0.8, 1),
new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.45 })
);
orb.position.set(x, 1.3, z);
orb.castShadow = true;
scene.add(orb);
return { mesh: orb, type, got: false };
}
function makeBus() {
const group = new THREE.Group();
const body = new THREE.Mesh(
new THREE.BoxGeometry(13, 4, 5),
material(0x3176c8)
);
body.castShadow = true;
group.add(body);
const balloon = new THREE.Mesh(
  new THREE.SphereGeometry(4.5, 14, 10),
  material(0xffdf58)
);
balloon.position.y = 7;
group.add(balloon);

for (let i = 0; i < 3; i++) {
  const window = new THREE.Mesh(
    new THREE.BoxGeometry(2, 1.1, 0.15),
    material(0x9beaff)
  );
  window.position.set(-3 + i * 3, 0.4, 2.56);
  group.add(window);
}
scene.add(group);
return group;

}
function setupMatch() {
for (const bot of bots) scene.remove(bot.mesh);
for (const item of loot) scene.remove(item.mesh);
for (const wall of walls) scene.remove(wall);
if (bus) scene.remove(bus);
if (storm) scene.remove(storm);
bots = [];
loot = [];
walls = [];
player.x = 0;
player.z = 22;
player.y = 0;
player.vy = 0;
player.health = 100;
player.shield = 0;
player.ammo = 24;
player.materials = 0;
player.mesh.position.set(player.x, 0, player.z);
yaw = 0;
pitch = 0.12;
tick = 0;
stormRadius = 74;

bus = makeBus();
for (let i = 0; i < 21; i++) {
  const angle = Math.random() * Math.PI * 2;
  const radius = 10 + Math.random() * 65;
  loot.push(makeLoot(Math.cos(angle) * radius, Math.sin(angle) * radius,
    ["ammo", "shield", "material"][i % 3]));
}

for (let i = 0; i < 6; i++) {
  const angle = Math.random() * Math.PI * 2;
  const radius = 25 + Math.random() * 48;
  const mesh = makeCharacter([0xe65c67, 0xba6bdd, 0xef9d46][i % 3], false);
  mesh.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
  scene.add(mesh);
  bots.push({ mesh, speed: 1.2 + Math.random(), alive: true });
}

storm = new THREE.Mesh(
  new THREE.SphereGeometry(1, 32, 16),
  new THREE.MeshBasicMaterial({
    color: 0xa943ef,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide
  })
);
storm.scale.set(stormRadius, 45, stormRadius);
storm.position.y = 32;
scene.add(storm);

mode = "bus";
phase.textContent = "BATTLE BUS";
say("Press Space to jump from the Battle Bus");
intro.classList.add("hidden");

}
startButton.addEventListener("click", setupMatch);
function jumpFromBus() {
if (mode !== "bus") return;
scene.remove(bus);
mode = "glide";
player.x = -18;
player.z = 0;
player.y = 30;
player.mesh.position.set(player.x, player.y, player.z);
phase.textContent = "GLIDING";
say("Steer toward the island!");
}
function buildWall() {
if (player.materials < 1) {
say("Collect materials before building!");
return;
}
const wall = new THREE.Mesh(
new THREE.BoxGeometry(6, 4, 0.45),
material(0xb87545)
);
wall.position.set(
player.x + Math.sin(yaw) * 5,
2,
player.z - Math.cos(yaw) * 5
);
wall.rotation.y = yaw;
wall.castShadow = true;
scene.add(wall);
walls.push(wall);
player.materials--;
say("Built a wall!");
}
const held = {};
addEventListener("keydown", event => {
const key = event.key.toLowerCase();
held[key] = true;
if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) event.preventDefault();
if (key === " " && mode === "bus") jumpFromBus();
else if (key === " " && mode === "island" && player.grounded) {
  player.vy = 9;
  player.grounded = false;
}

if (key === "e" && mode === "island") buildWall();

});
addEventListener("keyup", event => {
held[event.key.toLowerCase()] = false;
});
renderer.domElement.addEventListener("click", () => {
if (mode !== "lobby" && mode !== "ended") {
renderer.domElement.requestPointerLock?.();
}
});
addEventListener("mousemove", event => {
if (document.pointerLockElement === renderer.domElement) {
yaw -= event.movementX * 0.0025;
pitch = THREE.MathUtils.clamp(pitch - event.movementY * 0.0015, -0.25, 0.4);
}
});
function movePlayer(dt, speed) {
let forward = (held.w ? 1 : 0) - (held.s ? 1 : 0);
let side = (held.d ? 1 : 0) - (held.a ? 1 : 0);
const length = Math.hypot(forward, side) || 1;
forward /= length;
side /= length;
player.moving = !!(forward || side);
player.crouch = !!held.control || !!held.c;
const actualSpeed = (held.shift && !player.crouch ? speed * 1.55 : speed) *
  (player.crouch ? 0.5 : 1);

const fx = Math.sin(yaw), fz = -Math.cos(yaw);
const rx = Math.cos(yaw), rz = Math.sin(yaw);
const dx = (fx * forward + rx * side) * actualSpeed * dt;
const dz = (fz * forward + rz * side) * actualSpeed * dt;

player.x = THREE.MathUtils.clamp(player.x + dx, -86, 86);
player.z = THREE.MathUtils.clamp(player.z + dz, -86, 86);

if (player.moving) player.mesh.rotation.y = Math.atan2(dx, dz);
player.mesh.position.x = player.x;
player.mesh.position.z = player.z;
player.mesh.scale.y = player.crouch ? 0.72 : 1;

const swing = player.moving ? Math.sin(tick * 0.18) * 0.45 : 0;
player.mesh.userData.legs[0].rotation.x = swing;
player.mesh.userData.legs[1].rotation.x = -swing;

}
function updateCamera(dt) {
const distance = player.crouch ? 8 : 10;
const desired = new THREE.Vector3(
player.x - Math.sin(yaw) * distance,
player.y + 5 + pitch * 7,
player.z + Math.cos(yaw) * distance
);
camera.position.lerp(desired, 1 - Math.pow(0.001, dt));
camera.lookAt(
player.x + Math.sin(yaw) * 2,
player.y + 2.8 + pitch * 6,
player.z - Math.cos(yaw) * 2
);
}
function endMatch(title, text) {
mode = "ended";
phase.textContent = title;
say(text);
intro.querySelector("h1").textContent = title;
intro.querySelector("p").textContent = text;
startButton.textContent = "PLAY AGAIN";
intro.classList.remove("hidden");
document.exitPointerLock?.();
}
function update(dt) {
tick++;
if (mode === "bus") {
  bus.position.x += 22 * dt;
  bus.position.y = 31 + Math.sin(tick * 0.05) * 0.6;
  bus.position.z = -5;
  if (bus.position.x > 100) bus.position.x = -100;
  player.mesh.position.set(bus.position.x, 0, 0);
  phase.textContent = "BATTLE BUS — PRESS SPACE TO JUMP";
}

if (mode === "glide") {
  movePlayer(dt, 7);
  player.y = Math.max(0, player.y - 4 * dt);
  player.mesh.position.set(player.x, player.y, player.z);
  if (player.y <= 0) {
    player.y = 0;
    mode = "island";
    phase.textContent = "SURVIVE THE STORM";
    say("Landed! Find glowing loot.");
  }
}

if (mode === "island") {
  movePlayer(dt, 8);

  if (!player.grounded) {
    player.vy -= 22 * dt;
    player.y += player.vy * dt;
    if (player.y <= 0) {
      player.y = 0;
      player.vy = 0;
      player.grounded = true;
    }
  }
  player.mesh.position.y = player.y;

  for (const item of loot) {
    if (item.got) continue;
    item.mesh.rotation.y += dt * 1.6;
    item.mesh.position.y = 1.3 + Math.sin(tick * 0.06) * 0.2;
    if (Math.hypot(item.mesh.position.x - player.x, item.mesh.position.z - player.z) < 2.5) {
      item.got = true;
      scene.remove(item.mesh);
      if (item.type === "ammo") player.ammo += 8;
      if (item.type === "shield") player.shield = Math.min(100, player.shield + 25);
      if (item.type === "material") player.materials += 3;
      say(item.type === "ammo" ? "Ammo collected!" :
        item.type === "shield" ? "Shield collected!" : "Materials collected!");
    }
  }

  for (const bot of bots) {
    if (!bot.alive) continue;
    const dx = player.x - bot.mesh.position.x;
    const dz = player.z - bot.mesh.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 25) {
      bot.mesh.position.x += dx / Math.max(distance, 0.1) * bot.speed * dt;
      bot.mesh.position.z += dz / Math.max(distance, 0.1) * bot.speed * dt;
      bot.mesh.rotation.y = Math.atan2(dx, dz);
      if (distance < 2 && tick % 100 === 0) {
        if (player.shield) player.shield = Math.max(0, player.shield - 10);
        else player.health = Math.max(0, player.health - 8);
        say("An opponent is close!");
      }
    }
  }

  if (tick % 1200 === 0 && stormRadius > 25) {
    stormRadius -= 10;
    storm.scale.set(stormRadius, 45, stormRadius);
  }

  if (Math.hypot(player.x, player.z) > stormRadius && tick % 80 === 0) {
    if (player.shield) player.shield = Math.max(0, player.shield - 5);
    else player.health = Math.max(0, player.health - 5);
    say("Storm damage! Move toward the center!");
  }

  if (player.health <= 0) endMatch("MATCH OVER", "You were eliminated. Try again!");
  if (bots.every(bot => !bot.alive)) endMatch("VICTORY!", "You survived the island!");
}

if (messageTimer > 0) messageTimer--;
else if (mode === "island") message.textContent = "Stay inside the Storm circle and find loot.";

stats.innerHTML =
  `❤️ ${player.health} &nbsp; 🛡️ ${player.shield}<br>` +
  `🔫 ${player.ammo} &nbsp; 🪵 ${player.materials}`;

if (mode !== "lobby") updateCamera(dt);

}
function frame(time) {
requestAnimationFrame(frame);
const dt = Math.min((time - lastTime) / 1000 || 0.016, 0.04);
lastTime = time;
update(dt);
renderer.render(scene, camera);
}
camera.position.set(0, 8, 14);
camera.lookAt(0, 2, 0);
addEventListener("resize", () => {
camera.aspect = innerWidth / innerHeight;
camera.updateProjectionMatrix();
renderer.setSize(innerWidth, innerHeight);
});
requestAnimationFrame(frame);
})();