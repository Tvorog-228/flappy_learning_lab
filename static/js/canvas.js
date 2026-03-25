const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

socket.on("game_state", (data) => {
  // 1. Limpiar el canvas antes de dibujar
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 2. Dibujar Fondo (Cielo)
  ctx.fillStyle = "#70c5ce";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 3. Dibujar Tubos
  ctx.fillStyle = "#2e7d32"; // Verde oscuro editorial
  ctx.strokeStyle = "#1b4d1c";
  ctx.lineWidth = 2;

  data.pipes.forEach((p) => {
    // Tubo superior
    ctx.fillRect(p.x, 0, 50, p.gap_y - 80);
    ctx.strokeRect(p.x, 0, 50, p.gap_y - 80);

    // Tubo inferior
    ctx.fillRect(p.x, p.gap_y + 80, 50, canvas.height);
    ctx.strokeRect(p.x, p.gap_y + 80, 50, canvas.height);
  });

  // 4. Dibujar Pájaro (Agente IA)
  ctx.fillStyle = "#fdd835"; // Amarillo
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;

  // Usamos un pequeño efecto de rotación basado en la velocidad si quieres (opcional)
  ctx.fillRect(50, data.bird_y, 30, 30);
  ctx.strokeRect(50, data.bird_y, 30, 30);

  // 5. ACTUALIZAR TODA LA INTERFAZ (Sincronización total)
  // Usamos textContent o innerText para actualizar los valores en tiempo real

  if (document.getElementById("score")) {
    document.getElementById("score").innerText = data.score;
  }

  if (document.getElementById("q_size")) {
    document.getElementById("q_size").innerText = data.q_size;
  }

  // IMPORTANTE: Estos dos IDs son los que hacían que pareciera "estancado"
  if (document.getElementById("max_score")) {
    document.getElementById("max_score").innerText = data.max_score;
  }

  if (document.getElementById("game_number")) {
    document.getElementById("game_number").innerText = data.episode_number;
  }
});
