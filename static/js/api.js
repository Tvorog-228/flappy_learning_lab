let localMax = 0;
let scoresHistory = [];
let isManual = false;

// ==========================================
// 1. CONFIGURACIÓN DE LA GRÁFICA
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

const heatCanvas = document.getElementById("heatCanvas");
const heatCtx = heatCanvas ? heatCanvas.getContext("2d") : null;

// ==========================================
// 2. EVENTOS DEL SOCKET
// ==========================================

socket.on("episode_finished", (data) => {
  // Aseguramos que los datos existen antes de usarlos (Evita undefined)
  const episode = data.episode_number || 0;
  const score = data.score || 0;

  document.getElementById("game_number").innerText = episode;

  if (data.max_score !== undefined)
    document.getElementById("max_score").innerText = data.max_score;
  if (data.max_score_human !== undefined)
    document.getElementById("max_human").innerText = data.max_score_human;

  // Lógica de la Gráfica: Ahora registra TODO para que no se rompa la línea
  scoresHistory.push(score);
  if (scoresHistory.length > 50) scoresHistory.shift();
  const sum = scoresHistory.reduce((a, b) => a + b, 0);
  const average = (sum / scoresHistory.length).toFixed(2);

  scoreChart.data.labels.push(episode);
  scoreChart.data.datasets[0].data.push(score);
  scoreChart.data.datasets[1].data.push(average);

  if (scoreChart.data.labels.length > 100) {
    scoreChart.data.labels.shift();
    scoreChart.data.datasets[0].data.shift();
    scoreChart.data.datasets[1].data.shift();
  }
  scoreChart.update();

  if (!data.is_manual) socket.emit("request_heatmap");
});

// Listener del Heatmap (corregido para evitar errores si no existe el canvas)
socket.on("update_heatmap", (data) => {
  if (!heatCtx) return;
  heatCtx.fillStyle = "#111";
  heatCtx.fillRect(0, 0, heatCanvas.width, heatCanvas.height);
  data.forEach((point) => {
    const x = point.dx * 10;
    const y = point.dy * 10 + heatCanvas.height / 2;
    let color = "rgba(100, 100, 100, 0.5)";
    if (point.value > 0)
      color = `rgb(0, ${Math.min(255, point.value * 10)}, 0)`;
    else if (point.value < 0)
      color = `rgb(${Math.min(255, Math.abs(point.value) * 10)}, 0, 0)`;
    heatCtx.fillStyle = color;
    heatCtx.fillRect(x, y, 10, 10);
  });
});

// ==========================================
// 3. FUNCIONES DE INTERFAZ
// ==========================================

function toggleDuel() {
  isManual = !isManual;
  const btn = document.getElementById("btn_duel");
  btn.innerText = isManual
    ? "🤖 Devolver Control a IA"
    : "🎮 Entrar en Modo Humano";
  btn.style.backgroundColor = isManual ? "#ef4444" : "#22c55e";
  socket.emit("toggle_manual", { manual: isManual });
}

window.addEventListener("keydown", (e) => {
  if (e.code === "Space" && isManual) {
    e.preventDefault();
    socket.emit("human_jump");
  }
});

function startTurbo() {
  socket.emit("start_turbo", {
    steps: parseInt(document.getElementById("turbo_steps").value),
  });
}

function toggleDifficulty() {
  const isChecked = document.getElementById("difficulty_toggle").checked;
  socket.emit("toggle_difficulty", { active: isChecked });
}

function resetMemoria() {
  if (confirm("¿Resetear todo?")) {
    socket.emit("reset_training");
    setTimeout(() => {
      location.reload();
    }, 100);
  }
}

function updateParams() {
  socket.emit("update_params", {
    alpha: document.getElementById("alpha").value,
    gamma: document.getElementById("gamma").value,
    epsilon: document.getElementById("epsilon").value,
  });
}

function updateSpeed() {
  const val = document.getElementById("game_speed").value;
  document.getElementById("speed_val").innerText = val + "x";
  socket.emit("update_speed", { speed: parseInt(val) });
}

// ==========================================
// 4. CANVAS DEL JUEGO
// ==========================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

socket.on("game_state", (data) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = data.manual_mode ? "#334155" : "#70c5ce";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Tubos
  ctx.fillStyle = "#166534";
  data.pipes.forEach((p) => {
    ctx.fillRect(p.x, 0, 50, p.gap_y - 80);
    ctx.fillRect(p.x, p.gap_y + 80, 50, canvas.height);
  });

  // Pájaro
  ctx.fillStyle = data.manual_mode ? "#3b82f6" : "#facc15";
  ctx.fillRect(50, data.bird_y, 30, 30);

  // Stats en tiempo real (Validación para evitar undefined)
  document.getElementById("game_number").innerText = data.episode_number ?? 0;
  document.getElementById("score").innerText = data.score ?? 0;
  document.getElementById("q_size").innerText = data.q_size ?? 0;
  document.getElementById("max_score").innerText = data.max_score ?? 0;
  document.getElementById("max_human").innerText = data.max_score_human ?? 0;
});
