function updateParams() {
  const data = {
    alpha: 0.1,
    epsilon: document.getElementById("epsilon").value,
    speed: document.getElementById("speed").value,
  };
  socket.emit("update_params", data);
}
