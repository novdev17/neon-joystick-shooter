// spawn.js

import Enemy from "./enemy.js";

export default class Spawner {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    this.enemies = [];

    this.spawnRate = 1000; // waktu spawn (ms)
    this.lastSpawn = 0;

    this.level = 1;
  }

  //  Update spawner
  update(deltaTime) {
    this.lastSpawn += deltaTime;

    if (this.lastSpawn >= this.spawnRate) {
      this.spawnEnemy();
      this.lastSpawn = 0;
    }

    // update semua musuh
    this.enemies.forEach((enemy) => enemy.update());

    // hapus musuh yang mati
    this.enemies = this.enemies.filter((enemy) => enemy.alive);
  }

  //  Spawn musuh random
  spawnEnemy() {
    const y = Math.random() * (this.canvasHeight - 50);

    const types = ["basic", "fast", "tank"];
    const randomType = this.getWeightedType(types);

    const speed = 2 + Math.random() * 2;

    const enemy = new Enemy(
      this.canvasWidth,
      y,
      speed,
      randomType
    );

    this.enemies.push(enemy);
  }

  //  Random  peluang 
  getWeightedType(types) {
    const rand = Math.random();

    if (this.level < 3) {
      return "basic";
    } else if (this.level < 5) {
      return rand < 0.7 ? "basic" : "fast";
    } else {
      if (rand < 0.5) return "basic";
      if (rand < 0.8) return "fast";
      return "tank";
    }
  }

  //  level 
  increaseLevel() {
    this.level++;

    // makin cepat spawn
    this.spawnRate = Math.max(300, this.spawnRate - 100);
  }

  // semua musuh
  draw(ctx) {
    this.enemies.forEach((enemy) => enemy.draw(ctx));
  }

  // 💥 ambil list musuh (buat collision)
  getEnemies() {
    return this.enemies;
  }
}