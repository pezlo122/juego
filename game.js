const canvas = document.getElementById('juego');
const ctx = canvas.getContext('2d');

const ANCHO = canvas.width;
const ALTO = canvas.height;

// --- Entrada de teclado ---
const teclas = {};
window.addEventListener('keydown', (e) => {
  teclas[e.key.toLowerCase()] = true;
  if (e.key === 'Enter' && estado.terminado) reiniciar();
});
window.addEventListener('keyup', (e) => {
  teclas[e.key.toLowerCase()] = false;
});

// --- Estado del juego ---
let estado;

function reiniciar() {
  estado = {
    jugador: { x: ANCHO / 2, y: ALTO / 2, tam: 24, vel: 260 },
    moneda: nuevaPosicion(12),
    enemigos: [],
    puntos: 0,
    terminado: false,
  };
  agregarEnemigo();
}

function nuevaPosicion(margen) {
  return {
    x: margen + Math.random() * (ANCHO - margen * 2),
    y: margen + Math.random() * (ALTO - margen * 2),
  };
}

function agregarEnemigo() {
  // Aparece en un borde para no caer encima del jugador
  const desdeIzquierda = Math.random() < 0.5;
  const angulo = Math.random() * Math.PI * 2;
  const rapidez = 120 + estado.puntos * 8;
  estado.enemigos.push({
    x: desdeIzquierda ? 20 : ANCHO - 20,
    y: Math.random() * ALTO,
    radio: 14,
    vx: Math.cos(angulo) * rapidez,
    vy: Math.sin(angulo) * rapidez,
  });
}

// --- Lógica ---
function actualizar(dt) {
  if (estado.terminado) return;

  const j = estado.jugador;
  let dx = 0, dy = 0;
  if (teclas['arrowleft'] || teclas['a']) dx -= 1;
  if (teclas['arrowright'] || teclas['d']) dx += 1;
  if (teclas['arrowup'] || teclas['w']) dy -= 1;
  if (teclas['arrowdown'] || teclas['s']) dy += 1;

  // Normalizar para que la diagonal no sea más rápida
  const largo = Math.hypot(dx, dy) || 1;
  j.x += (dx / largo) * j.vel * dt;
  j.y += (dy / largo) * j.vel * dt;

  const mitad = j.tam / 2;
  j.x = Math.max(mitad, Math.min(ANCHO - mitad, j.x));
  j.y = Math.max(mitad, Math.min(ALTO - mitad, j.y));

  // Recoger moneda
  if (Math.hypot(j.x - estado.moneda.x, j.y - estado.moneda.y) < mitad + 10) {
    estado.puntos++;
    estado.moneda = nuevaPosicion(12);
    if (estado.puntos % 3 === 0) agregarEnemigo();
  }

  // Mover enemigos y rebotar en los bordes
  for (const e of estado.enemigos) {
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if (e.x < e.radio || e.x > ANCHO - e.radio) e.vx *= -1;
    if (e.y < e.radio || e.y > ALTO - e.radio) e.vy *= -1;

    if (Math.hypot(j.x - e.x, j.y - e.y) < mitad + e.radio - 4) {
      estado.terminado = true;
    }
  }
}

// --- Dibujo ---
function dibujar() {
  ctx.clearRect(0, 0, ANCHO, ALTO);

  // Moneda
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.arc(estado.moneda.x, estado.moneda.y, 10, 0, Math.PI * 2);
  ctx.fill();

  // Enemigos
  ctx.fillStyle = '#ff4d6d';
  for (const e of estado.enemigos) {
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radio, 0, Math.PI * 2);
    ctx.fill();
  }

  // Jugador
  const j = estado.jugador;
  ctx.fillStyle = '#4cc9f0';
  ctx.fillRect(j.x - j.tam / 2, j.y - j.tam / 2, j.tam, j.tam);

  // Puntuación
  ctx.fillStyle = '#fff';
  ctx.font = '20px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Puntos: ${estado.puntos}`, 12, 28);

  if (estado.terminado) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, ANCHO, ALTO);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 48px system-ui, sans-serif';
    ctx.fillText('¡Fin del juego!', ANCHO / 2, ALTO / 2 - 10);
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillText(`Puntos: ${estado.puntos} · Enter para reiniciar`, ANCHO / 2, ALTO / 2 + 30);
  }
}

// --- Bucle principal ---
let ultimo = performance.now();
function bucle(ahora) {
  const dt = Math.min((ahora - ultimo) / 1000, 0.05); // limitar saltos grandes
  ultimo = ahora;
  actualizar(dt);
  dibujar();
  requestAnimationFrame(bucle);
}

reiniciar();
requestAnimationFrame(bucle);
