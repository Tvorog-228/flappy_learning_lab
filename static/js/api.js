let localMax = 0;

const ctxChart = document.getElementById("scoreChart").getContext("2d");
const scoreChart = new Chart(ctxChart, {
  type: "line",
  data: {
    labels: [], // Números de episodio reales
    datasets: [
      {
        label: "Score",
        data: [],
        borderColor: "#38bdf8",
        backgroundColor: "rgba(56, 189, 248, 0.1)",
        fill: true,
        tension: 0.1, // Menos tensión para ver mejor los datos reales
        pointRadius: 1,
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

socket.on("episode_finished", (data) => {
  // 1. Actualizar textos de score y número de juego
  document.getElementById("game_number").innerText = data.episode_number;
  if (data.score > localMax) {
    localMax = data.score;
    document.getElementById("max_score").innerText = localMax;
  }

  // 2. Actualizar Gráfica
  scoreChart.data.labels.push(data.episode_number);
  scoreChart.data.datasets[0].data.push(data.score);

  // Mantenemos los últimos 100 puntos (ajustable) para que la gráfica respire
  if (scoreChart.data.labels.length > 100) {
    scoreChart.data.labels.shift();
    scoreChart.data.datasets[0].data.shift();
  }
  scoreChart.update();

  // 3. Feedback si es Turbo
  if (data.is_turbo) {
    document.getElementById("turbo_status").innerText =
      "🚀 Modo Turbo Activo...";
  } else {
    document.getElementById("turbo_status").innerText = "";
  }
});

// Función para el botón (ahora toma el valor actual)
function startTurbo() {
  const steps = parseInt(document.getElementById("turbo_steps").value);
  socket.emit("start_turbo", { steps: steps });
}
