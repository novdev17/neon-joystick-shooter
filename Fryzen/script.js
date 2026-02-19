const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');

function resize() {
    canvas.width = window.innerWidth * 1.5;
    canvas.height = window.innerHeight * 1.5;
}
window.addEventListener('resize', resize);
resize();

let score = 0, lives = 4, invulnerable = 0, gameActive = true, paused = false;
let player = { x: canvas.width/2, y: canvas.height/2, size: 20, color: '#00ffaa', angle: 0, speed: 10 };
let bullets = [], enemies = [], enemyBullets = [], particles = [], powerUps = [];
let ultCooldown = 0, rapidTimer = 0, rapidCooldown = 0, shootTimer = 0;
let ultEffect = { active: false, x: 0, y: 0, radius: 0, alpha: 0 };

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSfx(freq, type, dur, vol=0.05, slide=0) {
    try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, audioCtx.currentTime);
        if(slide !== 0) o.frequency.exponentialRampToValueAtTime(slide, audioCtx.currentTime + dur);
        g.gain.setValueAtTime(vol, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(); o.stop(audioCtx.currentTime + dur);
    } catch(e) {}
}

function createJoystick(stickId, baseId, callback) {
    const stick = document.getElementById(stickId);
    const base = document.getElementById(baseId);
    let active = false;

    const handleMove = (clientX, clientY) => {
        const r = base.getBoundingClientRect();
        const cx = r.left + r.width/2;
        const cy = r.top + r.height/2;
        let dx = clientX - cx, dy = clientY - cy;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const max = 50;

        if (dist > max) {
            dx *= max/dist;
            dy *= max/dist;
        }

        stick.style.transform = `translate(${dx}px, ${dy}px)`;
        callback(dx/max, dy/max);
    };

    const onStart = (e) => {
        if(paused) return;
        active = true;
        const t = e.touches ? e.touches[0] : e;
        handleMove(t.clientX, t.clientY);
    };

    const onMove = (e) => {
        if (!active || paused) return;
        const t = e.touches ? e.touches[0] : e;
        handleMove(t.clientX, t.clientY);
    };

    const onEnd = () => {
        active = false;
        stick.style.transform = 'translate(0,0)';
        callback(0, 0);
    };

    base.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    base.addEventListener('touchstart', onStart, {passive: false});
    window.addEventListener('touchmove', onMove, {passive: false});
    window.addEventListener('touchend', onEnd);
}

let mx = 0, my = 0, sx = 0, sy = 0;
createJoystick('left-stick', 'base-left', (x, y) => { mx = x; my = y; });
createJoystick('right-stick', 'base-right', (x, y) => { sx = x; sy = y; });

function drawHeart(x, y, size) {
    ctx.fillStyle = "#ff4444";
    ctx.beginPath();
    ctx.moveTo(x, y + size / 4);
    ctx.quadraticCurveTo(x, y, x + size / 4, y);
    ctx.quadraticCurveTo(x + size / 2, y, x + size / 2, y + size / 4);
    ctx.quadraticCurveTo(x + size / 2, y, x + (size * 3) / 4, y);
    ctx.quadraticCurveTo(x + size, y, x + size, y + size / 4);
    ctx.quadraticCurveTo(x + size, y + size / 2, x + size / 2, y + size);
    ctx.quadraticCurveTo(x, y + size / 2, x, y + size / 4);
    ctx.fill();
}

function spawnPowerUp() {
    if (!gameActive || paused) return;
    powerUps.push({
        x: Math.random() * (canvas.width - 100) + 50,
        y: Math.random() * (canvas.height - 100) + 50,
        size: 15,
        pulse: 0
    });
}
setInterval(spawnPowerUp, 10000);

function spawnEnemy(xP, yP, typeP = null, colorP = null) {
    if (!gameActive || paused) return;

    let x, y, size, type, color, speed, sides;

    if (typeP === "SMALL_PIECE") {
        x = xP + (Math.random() - 0.5) * 40;
        y = yP + (Math.random() - 0.5) * 40;
        size = 15;
        type = "SMALL";
        color = colorP;
        speed = 4.5;
        sides = 3;
    } else {
        const side = Math.floor(Math.random() * 4);

        if(side === 0) { x = Math.random()*canvas.width; y = -50; }
        else if(side === 1) { x = canvas.width+50; y = Math.random()*canvas.height; }
        else if(side === 2) { x = Math.random()*canvas.width; y = canvas.height+50; }
        else { x = -50; y = Math.random()*canvas.height; }

        type = Math.random() > 0.8 ? "BIG" : "NORMAL";
        size = type === "BIG" ? 55 : 25;
        color = `hsl(${Math.random() * 360}, 100%, 50%)`;
        speed = type === "BIG" ? 1.2 : 2.5 + (score/2000);
        sides = type === "BIG" ? 8 : Math.floor(Math.random()*3)+3;
    }

    enemies.push({ x, y, size, color, sides, speed, type, shootCooldown: Math.random() * 100 + 50 });
}
setInterval(() => spawnEnemy(), 1200);

function togglePause() {
    if(!gameActive) return;
    paused = !paused;
    playSfx(400, 'sine', 0.2, 0.05);
}

function useRapid() {
    if (rapidCooldown > 0 || !gameActive || paused) return;
    rapidTimer = 300;
    rapidCooldown = 600;
    playSfx(800, 'square', 0.5, 0.1, 1500);
}

function useUlt() {
    if (ultCooldown > 0 || !gameActive || paused) return;

    ultCooldown = 300;
    ultEffect.active = true;
    ultEffect.x = player.x;
    ultEffect.y = player.y;
    ultEffect.radius = 0;
    ultEffect.alpha = 1.0;

    enemies.forEach(en => {
        createExplosion(en.x, en.y, en.color);
        if (en.type === "BIG") {
            for(let k=0; k < 8; k++) {
                spawnEnemy(en.x, en.y, "SMALL_PIECE", en.color);
            }
        }
        score += 10;
    });

    enemies = [];
    enemyBullets = [];
    scoreEl.innerText = score;

    playSfx(80, 'sawtooth', 0.8, 0.15, 1000);
}

function playerHit() {
    if (invulnerable > 0) return;

    lives--;
    playSfx(150, 'sine', 0.5, 0.2, 50);
    createExplosion(player.x, player.y, "#ffffff");

    if (lives <= 0) {
        gameActive = false;
    } else {
        invulnerable = 120;
    }
}

function createExplosion(x, y, color) {
    for(let i=0; i < 15; i++) {
        particles.push({
            x, y,
            vx: (Math.random()-0.5)*15,
            vy: (Math.random()-0.5)*15,
            l: 20,
            c: color
        });
    }
}

function update() {
    if (!gameActive || paused) return;

    if (invulnerable > 0) invulnerable--;
    ultCooldown = Math.max(0, ultCooldown - 1);
    rapidCooldown = Math.max(0, rapidCooldown - 1);
    if(rapidTimer > 0) rapidTimer--;

    player.x += mx * player.speed;
    player.y += my * player.speed;

    if (mx !== 0 || my !== 0) {
        player.angle = Math.atan2(my, mx);
    }

    player.x = Math.max(20, Math.min(canvas.width - 20, player.x));
    player.y = Math.max(20, Math.min(canvas.height - 20, player.y));

    shootTimer--;

    if ((Math.abs(sx) > 0.1 || Math.abs(sy) > 0.1) && shootTimer <= 0) {
        const angle = Math.atan2(sy, sx);

        bullets.push({
            x: player.x,
            y: player.y,
            vx: Math.cos(angle)*25,
            vy: Math.sin(angle)*25,
            color: '#ffff00'
        });

        playSfx(600, 'square', 0.08, 0.03, 200);
        shootTimer = (rapidTimer > 0) ? 3 : 8;
    }

    powerUps.forEach((pu, i) => {
        pu.pulse += 0.1;

        if (Math.hypot(pu.x - player.x, pu.y - player.y) < player.size + pu.size) {
            if (lives < 4) lives++;
            score += 50;
            scoreEl.innerText = score;

            playSfx(800, 'sine', 0.3, 0.1, 1200);
            powerUps.splice(i, 1);
        }
    });

    bullets.forEach((b, i) => {
        b.x += b.vx;
        b.y += b.vy;

        if (b.x < -50 || b.x > canvas.width + 50 || b.y < -50 || b.y > canvas.height + 50) {
            bullets.splice(i, 1);
        }
    });

    enemyBullets.forEach((eb, i) => {
        eb.x += eb.vx;
        eb.y += eb.vy;

        if (Math.hypot(eb.x - player.x, eb.y - player.y) < player.size) {
            playerHit();
            enemyBullets.splice(i, 1);
        }

        if (eb.x < -50 || eb.x > canvas.width + 50 || eb.y < -50 || eb.y > canvas.height + 50) {
            enemyBullets.splice(i, 1);
        }
    });

    enemies.forEach((en, i) => {
        const angle = Math.atan2(player.y - en.y, player.x - en.x);

        en.x += Math.cos(angle) * en.speed;
        en.y += Math.sin(angle) * en.speed;

        if (en.type === "SMALL") {
            en.shootCooldown--;

            if (en.shootCooldown <= 0) {
                const sAngle = Math.atan2(player.y - en.y, player.x - en.x);

                enemyBullets.push({
                    x: en.x,
                    y: en.y,
                    vx: Math.cos(sAngle) * 8,
                    vy: Math.sin(sAngle) * 8,
                    color: '#ff4444'
                });

                en.shootCooldown = 150;
            }
        }

        if (Math.hypot(player.x - en.x, player.y - en.y) < player.size + en.size/2) {
            if (en.type === "BIG") {
                createExplosion(en.x, en.y, en.color);
                for(let k=0; k < 8; k++) {
                    spawnEnemy(en.x, en.y, "SMALL_PIECE", en.color);
                }
            } else {
                createExplosion(en.x, en.y, en.color);
            }

            enemies.splice(i, 1);
            playerHit();
        }

        bullets.forEach((b, bi) => {
            if (Math.hypot(b.x - en.x, b.y - en.y) < en.size) {
                createExplosion(en.x, en.y, en.color);

                if (en.type === "BIG") {
                    for(let k=0; k < 8; k++) {
                        spawnEnemy(en.x, en.y, "SMALL_PIECE", en.color);
                    }
                    playSfx(120, 'square', 0.4, 0.1, 400);
                } else {
                    playSfx(250, 'sawtooth', 0.1, 0.04, 50);
                }

                enemies.splice(i, 1);
                bullets.splice(bi, 1);

                score += (en.type === "BIG" ? 30 : 15);
                scoreEl.innerText = score;
            }
        });
    });

    particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.l--;

        if(p.l <= 0) {
            particles.splice(i, 1);
        }
    });
}

function draw() {
    ctx.fillStyle = 'rgba(10, 20, 26, 0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for(let i=0; i < lives; i++) {
        drawHeart(30 + (i * 35), 30, 20);
    }

    powerUps.forEach(pu => {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#00ccff";
        ctx.fillStyle = "#00ccff";

        const s = pu.size + Math.sin(pu.pulse) * 3;

        ctx.beginPath();
        ctx.arc(pu.x, pu.y, s, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    });

    if (ultEffect.active) {
        ctx.save();

        ctx.beginPath();
        ctx.arc(ultEffect.x, ultEffect.y, ultEffect.radius, 0, Math.PI * 2);

        ctx.strokeStyle = `rgba(255, 230, 0, ${ultEffect.alpha})`;
        ctx.lineWidth = 15;
        ctx.stroke();

        ultEffect.radius += 35;
        ultEffect.alpha -= 0.02;

        if (ultEffect.alpha <= 0) {
            ultEffect.active = false;
        }

        ctx.restore();
    }

    if (!(invulnerable > 0 && Math.floor(Date.now() / 100) % 2 === 0)) {
        ctx.save();

        ctx.translate(player.x, player.y);
        ctx.rotate(player.angle);

        ctx.shadowBlur = (rapidTimer > 0) ? 30 : 15;
        ctx.shadowColor = (rapidTimer > 0) ? "#ffbb00" : player.color;
        ctx.fillStyle = (rapidTimer > 0) ? "#ffbb00" : player.color;

        ctx.beginPath();
        ctx.moveTo(player.size, 0);
        ctx.lineTo(-player.size, -player.size);
        ctx.lineTo(-player.size/2, 0);
        ctx.lineTo(-player.size, player.size);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    bullets.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 5, 0, Math.PI*2);
        ctx.fill();
    });

    enemyBullets.forEach(eb => {
        ctx.fillStyle = eb.color;
        ctx.beginPath();
        ctx.arc(eb.x, eb.y, 6, 0, Math.PI*2);
        ctx.fill();
    });

    enemies.forEach(en => {
        ctx.shadowBlur = (en.type === "BIG") ? 15 : 0;
        ctx.shadowColor = en.color;

        ctx.fillStyle = en.color;
        ctx.beginPath();

        for(let j=0; j<en.sides; j++) {
            const a = (j/en.sides) * Math.PI * 2;
            ctx.lineTo(en.x + Math.cos(a)*en.size, en.y + Math.sin(a)*en.size);
        }

        ctx.closePath();
        ctx.fill();
    });

    particles.forEach(p => {
        ctx.fillStyle = p.c;
        ctx.globalAlpha = p.l/20;
        ctx.fillRect(p.x, p.y, 4, 4);
    });

    ctx.globalAlpha = 1;

    if (!gameActive || paused) {
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillRect(0,0,canvas.width,canvas.height);

        ctx.fillStyle = "#fff";
        ctx.font = "bold 50px monospace";
        ctx.textAlign = "center";

        ctx.fillText(!gameActive ? "GAME OVER" : "PAUSED", canvas.width/2, canvas.height/2);
    }

    requestAnimationFrame(() => {
        update();
        draw();
    });
}

function resetGame() {
    score = 0;
    lives = 4;
    invulnerable = 0;
    rapidTimer = 0;
    rapidCooldown = 0;

    scoreEl.innerText = 0;

    player.x = canvas.width/2;
    player.y = canvas.height/2;

    bullets = [];
    enemies = [];
    enemyBullets = [];
    particles = [];
    powerUps = [];

    gameActive = true;
    paused = false;
}

draw();
