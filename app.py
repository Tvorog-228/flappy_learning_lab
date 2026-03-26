import eventlet

eventlet.monkey_patch()

from flask import Flask, render_template
from flask_socketio import SocketIO

from ai.trainer import Trainer

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

trainer = Trainer(socketio)


@app.route("/")
def index():
    return render_template("index.html")


@socketio.on("update_params")
def handle_params(data):
    trainer.agent.alpha = float(data["alpha"])
    trainer.agent.gamma = float(data["gamma"])
    trainer.agent.epsilon = float(data["epsilon"])


@socketio.on("update_speed")
def handle_speed(data):
    new_speed = data.get("speed", 1)
    trainer.speed_multiplier = float(new_speed)


@socketio.on("reset_training")
def handle_reset():
    trainer.agent.q_table = {}
    trainer.max_score = 0
    trainer.game.reset()


@socketio.on("start_turbo")
def handle_turbo(data):
    steps = int(data.get("steps", 100))
    # Lanzamos el turbo en un hilo de fondo para no congelar el servidor
    socketio.start_background_task(trainer.train_turbo, steps)


@socketio.on("request_heatmap")
def send_heatmap():
    heatmap_data = []

    condensed_q = {}

    for state, actions in trainer.agent.q_table.items():
        dx, dy, _ = state
        max_val = max(actions)

        if (dx, dy) not in condensed_q or max_val > condensed_q[(dx, dy)]:
            condensed_q[(dx, dy)] = max_val

    for (dx, dy), val in condensed_q.items():
        heatmap_data.append({"dx": dx, "dy": dy, "value": val})

    socketio.emit("update_heatmap", heatmap_data)


if __name__ == "__main__":
    socketio.start_background_task(trainer.run)
    socketio.run(app, debug=True, port=5000)
