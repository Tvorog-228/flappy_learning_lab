const socket = io();
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

socket.on("game_state", (data) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Tubos
  ctx.fillStyle = "green";
  data.pipes.forEach((p) => {
    ctx.fillRect(p.x, 0, 50, p.gap_y - 80);
    ctx.fillRect(p.x, p.gap_y + 80, 50, 600);
  });
  // Pájaro
  ctx.fillStyle = "yellow";
  ctx.fillRect(50, data.bird_y, 30, 30);
  // UI
  document.getElementById("score").innerText = data.score;
  document.getElementById("q_size").innerText = data.q_size;
});
