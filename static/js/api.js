let localMax = 0;
let scoresHistory = []; // NUEVO: Almacena los últimos scores para calcular la media

// ==========================================
// 1. CONFIGURACIÓN DE LA GRÁFICA (Chart.js)
// ==========================================
const ctxChart = document.getElementById("scoreChart").getContext("2d");
const scoreChart = new Chart(ctxChart, {
  type: "line",
  data: {
    labels: [], // Números de episodio reales
    datasets: [
      {
        label: "Score",
        data: [],
        borderColor: "#38bdf8", // Azul claro
        backgroundColor: "rgba(56, 189, 248, 0.1)",
        fill: true,
        tension: 0.1,
        pointRadius: 1,
      },
      {
        label: "Media (últimos 50)",
        data: [],
        borderColor: "#f59e0b", // Naranja para destacar la tendencia
        backgroundColor: "transparent",
        borderWidth: 2,
        pointRadius: 0, // Sin puntos para que sea una línea limpia
        tension: 0.3, // Más suavizada
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: false, // Desactivar animaciones mejora el rendimiento en Turbo
    scales: {
      y: { beginAtZero: true },
      x: { title: { display: true, text: "Episodio" } },
    },
  },
});

// ==========================================
// 2. EVENTOS DEL SOCKET (Lógica de la IA)
// ==========================================
socket.on("episode_finished", (data) => {
  // A. Actualizar textos de score y número de juego
  document.getElementById("game_number").innerText = data.episode_number;
  if (data.score > localMax) {
    localMax = data.score;
    document.getElementById("max_score").innerText = localMax;
  }

  // B. Calcular la Media Móvil
  scoresHistory.push(data.score);
  if (scoresHistory.length > 50) {
    scoresHistory.shift(); // Mantenemos solo los últimos 50 para la media
  }
  const sum = scoresHistory.reduce((a, b) => a + b, 0);
  const average = (sum / scoresHistory.length).toFixed(2);

  // C. Actualizar Gráfica con ambos valores
  scoreChart.data.labels.push(data.episode_number);
  scoreChart.data.datasets[0].data.push(data.score);
  scoreChart.data.datasets[1].data.push(average); // Añadimos la media

  // Mantenemos los últimos 100 puntos visuales para que la gráfica respire
  if (scoreChart.data.labels.length > 100) {
    scoreChart.data.labels.shift();
    scoreChart.data.datasets[0].data.shift();
    scoreChart.data.datasets[1].data.shift(); // Desplazar también la media
  }
  scoreChart.update();

  // D. Feedback si es Turbo (Nota: usa 'turbo_status' como en tu código original)
  let turboElem =
    document.getElementById("turbo_status") ||
    document.getElementById("turbo_progress");
  if (turboElem) {
    if (data.is_turbo) {
      turboElem.innerText = "🚀 Modo Turbo Activo...";
    } else {
      turboElem.innerText = "Esperando orden...";
    }
  }
});

// ==========================================
// 3. FUNCIONES DE INTERFAZ (Botones)
// ==========================================
function startTurbo() {
  const steps = parseInt(document.getElementById("turbo_steps").value);
  socket.emit("start_turbo", { steps: steps });
}

function resetMemoria() {
  if (
    confirm(
      "¿Estás seguro? Esto borrará toda la Q-Table y el pájaro volverá a ser un novato.",
    )
  ) {
    socket.emit("reset_training");

    // Limpiar la gráfica, la media y los textos
    scoresHistory = [];
    scoreChart.data.labels = [];
    scoreChart.data.datasets[0].data = [];
    scoreChart.data.datasets[1].data = [];
    scoreChart.update();

    localMax = 0;
    document.getElementById("max_score").innerText = "0";
    document.getElementById("game_number").innerText = "0";

    // Validar si existe el elemento antes de modificarlo para evitar errores
    let qSizeElem = document.getElementById("q_size");
    if (qSizeElem) qSizeElem.innerText = "0";
  }
}

function updateParams() {
  const alpha = parseFloat(document.getElementById("alpha").value);
  const gamma = parseFloat(document.getElementById("gamma").value);
  const epsilon = parseFloat(document.getElementById("epsilon").value);

  socket.emit("update_params", {
    alpha: alpha,
    gamma: gamma,
    epsilon: epsilon,
  });

  console.log(`🚀 Parámetros enviados: α=${alpha}, γ=${gamma}, ε=${epsilon}`);
}

function updateSpeed() {
  const speed = document.getElementById("game_speed").value;
  document.getElementById("speed_val").innerText = speed + "x";
  socket.emit("update_speed", { speed: parseInt(speed) });
}

// ==========================================
// 4. RENDERIZADO DEL JUEGO (Canvas)
// ==========================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

socket.on("game_state", (data) => {
  // Limpiar el canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Fondo
  ctx.fillStyle = "#70c5ce";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Tubos
  ctx.fillStyle = "#2e7d32";
  ctx.strokeStyle = "#1b4d1c";
  ctx.lineWidth = 2;

  data.pipes.forEach((p) => {
    // Superior
    ctx.fillRect(p.x, 0, 50, p.gap_y - 80);
    ctx.strokeRect(p.x, 0, 50, p.gap_y - 80);
    // Inferior
    ctx.fillRect(p.x, p.gap_y + 80, 50, canvas.height);
    ctx.strokeRect(p.x, p.gap_y + 80, 50, canvas.height);
  });

  // Pájaro
  ctx.fillStyle = "#fdd835";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.fillRect(50, data.bird_y, 30, 30);
  ctx.strokeRect(50, data.bird_y, 30, 30);

  // Actualizar stats en tiempo real
  if (document.getElementById("score"))
    document.getElementById("score").innerText = data.score;
  if (document.getElementById("q_size"))
    document.getElementById("q_size").innerText = data.q_size;
  if (document.getElementById("max_score"))
    document.getElementById("max_score").innerText = data.max_score;
  if (document.getElementById("game_number"))
    document.getElementById("game_number").innerText = data.episode_number;
});
