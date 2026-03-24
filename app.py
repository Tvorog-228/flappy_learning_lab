import eventlet
eventlet.monkey_patch()

from flask import Flask, render_template
from flask_socketio import SocketIO
from ai.trainer import Trainer

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# Inicializamos el entrenador (que internamente crea el Motor y el Agente)
trainer = Trainer(socketio)

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('update_params')
def handle_params(data):
    trainer.agent.alpha = float(data['alpha'])
    trainer.agent.epsilon = float(data['epsilon'])
    trainer.speed = float(data['speed'])

@socketio.on('reset_training')
def handle_reset():
    trainer.agent.q_table = {}
    trainer.game.reset()

if __name__ == '__main__':
    socketio.start_background_task(trainer.run)
    socketio.run(app, debug=True, port=5000)
