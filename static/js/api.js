let localMax = 0;
let scoresHistory = [];

// ==========================================
// 1. CONFIGURACIÓN DE LAS GRÁFICAS (Chart.js)
// ==========================================
const ctxChart = document.getElementById("scoreChart").getContext("2d");
const scoreChart = new Chart(ctxChart, {
  type: "line",
  data: {
    labels: [],
    datasets: [
      {
        label: "Score",
        data: [],
        borderColor: "#38bdf8",
        backgroundColor: "rgba(56, 189, 248, 0.1)",
        fill: true,
        tension: 0.1,
        pointRadius: 1,
      },
      {
        label: "Media (últimos 50)",
        data: [],
        borderColor: "#f59e0b",
        backgroundColor: "transparent",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    scales: {
      y: { beginAtZero: true },
      x: { title: { display: true, text: "Episodio" } },
    },
  },
});

// Canvas para el Heatmap
const heatCanvas = document.getElementById("heatCanvas");
const heatCtx = heatCanvas.getContext("2d");

// ==========================================
// 2. EVENTOS DEL SOCKET (Lógica de la IA)
// ==========================================

socket.on("episode_finished", (data) => {
  // A. Actualizar textos
  document.getElementById("game_number").innerText = data.episode_number;
  if (data.score > localMax) {
    localMax = data.score;
    document.getElementById("max_score").innerText = localMax;
  }

  // B. Calcular Media Móvil
  scoresHistory.push(data.score);
  if (scoresHistory.length > 50) scoresHistory.shift();
  const sum = scoresHistory.reduce((a, b) => a + b, 0);
  const average = (sum / scoresHistory.length).toFixed(2);

  // C. Actualizar Gráfica
  scoreChart.data.labels.push(data.episode_number);
  scoreChart.data.datasets[0].data.push(data.score);
  scoreChart.data.datasets[1].data.push(average);

  if (scoreChart.data.labels.length > 100) {
    scoreChart.data.labels.shift();
    scoreChart.data.datasets[0].data.shift();
    scoreChart.data.datasets[1].data.shift();
  }
  scoreChart.update();

  // D. Feedback Turbo
  let turboElem =
    document.getElementById("turbo_status") ||
    document.getElementById("turbo_progress");
  if (turboElem) {
    turboElem.innerText = data.is_turbo
      ? "🚀 Modo Turbo Activo..."
      : "Esperando orden...";
  }

  // E. PEDIR MAPA DE CALOR AL TERMINAR EPISODIO
  socket.emit("request_heatmap");
});

// Listener para dibujar el Heatmap
socket.on("update_heatmap", (data) => {
  heatCtx.fillStyle = "#111"; // Fondo oscuro
  heatCtx.fillRect(0, 0, heatCanvas.width, heatCanvas.height);

  const cellSize = 10;
  const offsetX = 0;
  const offsetY = heatCanvas.height / 2;

  data.forEach((point) => {
    const x = point.dx * cellSize + offsetX;
    const y = point.dy * cellSize + offsetY;

    let color = "rgba(100, 100, 100, 0.5)";

    if (point.value > 0) {
      const intensity = Math.min(255, point.value * 10);
      color = `rgb(0, ${intensity}, 0)`;
    } else if (point.value < 0) {
      const intensity = Math.min(255, Math.abs(point.value) * 10);
      color = `rgb(${intensity}, 0, 0)`;
    }

    heatCtx.fillStyle = color;
    heatCtx.fillRect(x, y, cellSize, cellSize);
  });
});

// ==========================================
// 3. FUNCIONES DE INTERFAZ (Botones)
// ==========================================

function startTurbo() {
  const steps = parseInt(document.getElementById("turbo_steps").value);
  socket.emit("start_turbo", { steps: steps });
}

function resetMemoria() {
  if (confirm("¿Estás seguro? Esto borrará toda la Q-Table.")) {
    socket.emit("reset_training");
    scoresHistory = [];
    scoreChart.data.labels = [];
    scoreChart.data.datasets[0].data = [];
    scoreChart.data.datasets[1].data = [];
    scoreChart.update();
    localMax = 0;
    document.getElementById("max_score").innerText = "0";
    document.getElementById("game_number").innerText = "0";
    if (document.getElementById("q_size"))
      document.getElementById("q_size").innerText = "0";

    // Limpiar heatmap al resetear
    heatCtx.fillStyle = "#111";
    heatCtx.fillRect(0, 0, heatCanvas.width, heatCanvas.height);
  }
}

function updateParams() {
  socket.emit("update_params", {
    alpha: parseFloat(document.getElementById("alpha").value),
    gamma: parseFloat(document.getElementById("gamma").value),
    epsilon: parseFloat(document.getElementById("epsilon").value),
  });
}

function updateSpeed() {
  const speed = document.getElementById("game_speed").value;
  document.getElementById("speed_val").innerText = speed + "x";
  socket.emit("update_speed", { speed: parseInt(speed) });
}

// ==========================================
// 4. RENDERIZADO DEL JUEGO (Canvas Principal)
// ==========================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

socket.on("game_state", (data) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#70c5ce";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Tubos
  ctx.fillStyle = "#2e7d32";
  ctx.strokeStyle = "#1b4d1c";
  ctx.lineWidth = 2;
  data.pipes.forEach((p) => {
    ctx.fillRect(p.x, 0, 50, p.gap_y - 80);
    ctx.strokeRect(p.x, 0, 50, p.gap_y - 80);
    ctx.fillRect(p.x, p.gap_y + 80, 50, canvas.height);
    ctx.strokeRect(p.x, p.gap_y + 80, 50, canvas.height);
  });

  // Pájaro
  ctx.fillStyle = "#fdd835";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.fillRect(50, data.bird_y, 30, 30);
  ctx.strokeRect(50, data.bird_y, 30, 30);

  // Stats
  if (document.getElementById("score"))
    document.getElementById("score").innerText = data.score;
  if (document.getElementById("q_size"))
    document.getElementById("q_size").innerText = data.q_size;
  if (document.getElementById("max_score"))
    document.getElementById("max_score").innerText = data.max_score;
  if (document.getElementById("game_number"))
    document.getElementById("game_number").innerText = data.episode_number;
});
