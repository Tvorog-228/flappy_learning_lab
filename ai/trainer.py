import time
from core.engine import FlappyEngine
from ai.q_learning import QLearningAgent

class Trainer:
    def __init__(self, socketio):
        self.game = FlappyEngine()
        self.agent = QLearningAgent()
        self.socketio = socketio
        self.speed = 0.02

    def run(self):
        while True:
            state = self.game.get_ai_state()
            action = self.agent.choose_action(state)
            _, reward, done = self.game.step(action)
            next_state = self.game.get_ai_state()

            self.agent.learn(state, action, reward, next_state)

            # Emitir datos a la web
            self.socketio.emit('game_state', {
                **self.game.get_state(),
                "q_size": len(self.agent.q_table),
                "epsilon": round(self.agent.epsilon, 2)
            })

            if self.speed > 0:
                time.sleep(self.speed)
