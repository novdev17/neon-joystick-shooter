// enemy.js

export default class Enemy {
  constructor(x, y, speed = 3, type = "basic") {
    this.x = x;
    this.y = y;
    this.width = 40;
    this.height = 40;

    this.speed = speed;
    this.type = type;

    this.hp = this.setHP(type);
    this.color = this.setColor(type);

    this.alive = true;
  }

  //  Set HP berdasarkan tipe musuh
  setHP(type) {
    switch (type) {
      case "fast":
        return 1;
      case "tank":
        return 5;
      case "boss":
        return 20;
      default:
        return 2; // basic
    }
  }

  //  Set warna 
  setColor(type) {
    switch (type) {
      case "fast":
        return "yellow";
      case "tank":
        return "purple";
      case "boss":
        return "black";
      default:
        return "red";
    }
  }

  //  Gerakan musuh
  update(player = null) {
    if (!this.alive) return;

    // Gerakan berdasarkan tipe
    switch (this.type) {
      case "fast":
        this.x -= this.speed * 2;
        break;

      case "tank":
        this.x -= this.speed * 0.8;
        break;

      case "boss":
        this.x -= this.speed * 0.5;
        // boss bisa naik turun
        this.y += Math.sin(Date.now() * 0.005) * 2;
        break;

      default:
        this.x -= this.speed;
    }

    //  keluar layar = mati
    if (this.x + this.width < 0) {
      this.alive = false;
    }
  }

  //  Kena damage
  hit(damage = 1) {
    this.hp -= damage;

    if (this.hp <= 0) {
      this.alive = false;
    }
  }

  //  Gambar musuh
  draw(ctx) {
    if (!this.alive) return;

    // body musuh
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // detail 
    ctx.fillStyle = "white";
    ctx.fillRect(this.x + 10, this.y + 10, 20, 20);

    // HP bar
    ctx.fillStyle = "green";
    ctx.fillRect(this.x, this.y - 6, (this.hp / 5) * this.width, 4);
  }

  // Collision check
  isColliding(obj) {
    return (
      this.x < obj.x + obj.width &&
      this.x + this.width > obj.x &&
      this.y < obj.y + obj.height &&
      this.y + this.height > obj.y
    );
  }
}