const canvas = document.getElementById('juego');
const ctx = canvas.getContext('2d');

const ANCHO = canvas.width;
const ALTO = canvas.height;

// --- Física (ajusta estos valores para cambiar cómo se siente el salto) ---
const GRAVEDAD = 1800;      // píxeles/s² hacia abajo
const VEL_CORRER = 260;     // velocidad horizontal
const FUERZA_SALTO = 640;   // velocidad inicial del salto
const TIEMPO_COYOTE = 0.1;  // segundos en los que aún puedes saltar tras dejar una plataforma
const TIEMPO_BUFFER = 0.12; // segundos que se recuerda un salto pulsado antes de tocar suelo

// --- Nivel ---
// Cada plataforma es un rectángulo: x, y (esquina superior izquierda), ancho w, alto h.
const MUNDO_ANCHO = 2400;
const NIVEL = {
  inicio: { x: 60, y: 380 },
  plataformas: [
    // Suelo (con huecos para caer)
    { x: 0, y: 460, w: 600, h: 40 },
    { x: 720, y: 460, w: 480, h: 40 },
    { x: 1320, y: 460, w: 380, h: 40 },
    { x: 1850, y: 460, w: 550, h: 40 },
    // Plataformas flotantes
    { x: 250, y: 370, w: 120, h: 16 },
    { x: 420, y: 290, w: 120, h: 16 },
    { x: 600, y: 360, w: 100, h: 16 },
    { x: 900, y: 360, w: 140, h: 16 },
    { x: 1080, y: 270, w: 120, h: 16 },
    { x: 1250, y: 190, w: 100, h: 16 },
    { x: 1420, y: 330, w: 120, h: 16 },
    { x: 1700, y: 380, w: 110, h: 16 },
    { x: 2000, y: 360, w: 120, h: 16 },
  ],
  monedas: [
    { x: 310, y: 340 }, { x: 480, y: 260 }, { x: 650, y: 330 },
    { x: 970, y: 330 }, { x: 1140, y: 240 }, { x: 1300, y: 160 },
    { x: 1480, y: 300 }, { x: 1755, y: 350 }, { x: 2060, y: 330 },
  ],
  enemigos: [
    { x: 800, min: 730, max: 1170 },
    { x: 1400, min: 1330, max: 1670 },
    { x: 1950, min: 1860, max: 2200 },
  ],
  meta: { x: 2320, y: 460 },
};

// --- Entrada de teclado ---
const teclas = {};
const TECLAS_SALTO = [' ', 'arrowup', 'w'];

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
  if (TECLAS_SALTO.includes(k) && !teclas[k]) estado.bufferSalto = TIEMPO_BUFFER;
  teclas[k] = true;
  if (k === 'enter' && estado.fase !== 'jugando') reiniciar();
});
window.addEventListener('keyup', (e) => {
  const k = e.key.toLowerCase();
  teclas[k] = false;
  // Salto variable: si sueltas pronto, saltas menos
  if (TECLAS_SALTO.includes(k) && estado.jugador.vy < 0) estado.jugador.vy *= 0.5;
});

// --- Estado del juego ---
let estado;

function reiniciar() {
  estado = {
    jugador: crearJugador(),
    monedas: NIVEL.monedas.map((m) => ({ ...m, tomada: false })),
    enemigos: NIVEL.enemigos.map((e) => ({ ...e, y: 460 - 28, w: 28, h: 28, vx: 70, vivo: true })),
    puntos: 0,
    vidas: 3,
    camaraX: 0,
    bufferSalto: 0,
    fase: 'jugando', // 'jugando' | 'perdiste' | 'ganaste'
    tiempo: 0,
  };
}

function crearJugador() {
  return {
    x: NIVEL.inicio.x, y: NIVEL.inicio.y,
    w: 26, h: 34,
    vx: 0, vy: 0,
    enSuelo: false,
    coyote: 0,
    mirando: 1, // 1 derecha, -1 izquierda
  };
}

function seTocan(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function perderVida() {
  estado.vidas--;
  if (estado.vidas <= 0) estado.fase = 'perdiste';
  else estado.jugador = crearJugador();
}

// --- Lógica ---
function actualizar(dt) {
  estado.tiempo += dt;
  if (estado.fase !== 'jugando') return;

  const j = estado.jugador;

  // Movimiento horizontal
  let dir = 0;
  if (teclas['arrowleft'] || teclas['a']) dir -= 1;
  if (teclas['arrowright'] || teclas['d']) dir += 1;
  j.vx = dir * VEL_CORRER;
  if (dir !== 0) j.mirando = dir;

  // Salto (con "coyote time" y "buffer" para que se sienta justo)
  j.coyote = j.enSuelo ? TIEMPO_COYOTE : j.coyote - dt;
  estado.bufferSalto -= dt;
  if (estado.bufferSalto > 0 && j.coyote > 0) {
    j.vy = -FUERZA_SALTO;
    j.coyote = 0;
    estado.bufferSalto = 0;
  }

  // Gravedad
  j.vy += GRAVEDAD * dt;

  // Mover en X y resolver choques
  j.x += j.vx * dt;
  for (const p of NIVEL.plataformas) {
    if (!seTocan(j, p)) continue;
    if (j.vx > 0) j.x = p.x - j.w;
    else if (j.vx < 0) j.x = p.x + p.w;
  }
  j.x = Math.max(0, Math.min(MUNDO_ANCHO - j.w, j.x));

  // Mover en Y y resolver choques
  j.y += j.vy * dt;
  j.enSuelo = false;
  for (const p of NIVEL.plataformas) {
    if (!seTocan(j, p)) continue;
    if (j.vy > 0) { j.y = p.y - j.h; j.vy = 0; j.enSuelo = true; }
    else if (j.vy < 0) { j.y = p.y + p.h; j.vy = 0; }
  }

  // Caer al vacío
  if (j.y > ALTO + 100) { perderVida(); return; }

  // Monedas
  for (const m of estado.monedas) {
    if (!m.tomada && seTocan(j, { x: m.x - 10, y: m.y - 10, w: 20, h: 20 })) {
      m.tomada = true;
      estado.puntos++;
    }
  }

  // Enemigos: patrullan y se les puede pisar
  for (const e of estado.enemigos) {
    if (!e.vivo) continue;
    e.x += e.vx * dt;
    if (e.x < e.min || e.x + e.w > e.max) e.vx *= -1;

    if (seTocan(j, e)) {
      const pisando = j.vy > 0 && j.y + j.h - e.y < 16;
      if (pisando) {
        e.vivo = false;
        j.vy = -FUERZA_SALTO * 0.6;
        estado.puntos += 2;
      } else {
        perderVida();
        return;
      }
    }
  }

  // Meta
  if (j.x + j.w > NIVEL.meta.x) estado.fase = 'ganaste';

  // Cámara sigue al jugador
  estado.camaraX = Math.max(0, Math.min(MUNDO_ANCHO - ANCHO, j.x - ANCHO / 2));
}

// --- Dibujo ---
function dibujar() {
  // Cielo
  const cielo = ctx.createLinearGradient(0, 0, 0, ALTO);
  cielo.addColorStop(0, '#6ec6ff');
  cielo.addColorStop(1, '#c9ecff');
  ctx.fillStyle = cielo;
  ctx.fillRect(0, 0, ANCHO, ALTO);

  // Colinas de fondo (se mueven más lento: efecto parallax)
  ctx.fillStyle = '#8fd18f';
  for (let i = 0; i < 8; i++) {
    const x = i * 380 - (estado.camaraX * 0.3) % 380;
    ctx.beginPath();
    ctx.arc(x, ALTO, 200, Math.PI, 0);
    ctx.fill();
  }

  // Todo lo del mundo se dibuja desplazado por la cámara
  ctx.save();
  ctx.translate(-Math.round(estado.camaraX), 0);

  // Plataformas
  for (const p of NIVEL.plataformas) {
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(p.x, p.y, p.w, 6);
  }

  // Monedas (flotan un poco)
  ctx.fillStyle = '#ffd23f';
  for (const m of estado.monedas) {
    if (m.tomada) continue;
    const flota = Math.sin(estado.tiempo * 4 + m.x) * 3;
    ctx.beginPath();
    ctx.arc(m.x, m.y + flota, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  // Enemigos
  for (const e of estado.enemigos) {
    if (!e.vivo) continue;
    ctx.fillStyle = '#e53950';
    ctx.fillRect(e.x, e.y, e.w, e.h);
    ctx.fillStyle = '#fff';
    ctx.fillRect(e.x + 5, e.y + 7, 6, 6);
    ctx.fillRect(e.x + 17, e.y + 7, 6, 6);
  }

  // Meta (bandera)
  const meta = NIVEL.meta;
  ctx.fillStyle = '#555';
  ctx.fillRect(meta.x, meta.y - 120, 4, 120);
  ctx.fillStyle = '#ff9800';
  ctx.beginPath();
  ctx.moveTo(meta.x + 4, meta.y - 120);
  ctx.lineTo(meta.x + 44, meta.y - 105);
  ctx.lineTo(meta.x + 4, meta.y - 90);
  ctx.fill();

  // Jugador
  const j = estado.jugador;
  ctx.fillStyle = '#3366ff';
  ctx.fillRect(j.x, j.y, j.w, j.h);
  ctx.fillStyle = '#fff';
  const ojoX = j.mirando > 0 ? j.x + 15 : j.x + 5;
  ctx.fillRect(ojoX, j.y + 8, 6, 6);

  ctx.restore();

  // Interfaz (no se mueve con la cámara)
  ctx.fillStyle = '#1b1b2f';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Puntos: ${estado.puntos}`, 12, 28);
  ctx.fillText(`Vidas: ${'♥'.repeat(estado.vidas)}`, 12, 54);

  if (estado.fase !== 'jugando') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, ANCHO, ALTO);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 48px system-ui, sans-serif';
    ctx.fillText(estado.fase === 'ganaste' ? '¡Nivel completado!' : '¡Fin del juego!', ANCHO / 2, ALTO / 2 - 10);
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillText(`Puntos: ${estado.puntos} · Enter para reiniciar`, ANCHO / 2, ALTO / 2 + 30);
  }
}

// --- Bucle principal ---
let ultimo = performance.now();
function bucle(ahora) {
  const dt = Math.min((ahora - ultimo) / 1000, 0.033); // limitar saltos grandes para no atravesar plataformas
  ultimo = ahora;
  actualizar(dt);
  dibujar();
  requestAnimationFrame(bucle);
}

reiniciar();
requestAnimationFrame(bucle);
