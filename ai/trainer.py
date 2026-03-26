import time

from ai.q_learning import QLearningAgent
from core.engine import FlappyEngine


class Trainer:
    def __init__(self, socketio):
        self.game = FlappyEngine()
        self.agent = QLearningAgent()
        self.socketio = socketio
        self.speed = 0.02
        self.max_score = 0
        self.total_episodes = 0
        self.is_turbo = False
        self.base_delay = 0.02
        self.speed_multiplier = 1

    def set_speed(self, multiplier):
        self.speed_multiplier = max(0.1, float(multiplier))

    def run(self):
        while True:
            if self.is_turbo:
                time.sleep(0.1)
                continue

            state = self.game.get_ai_state()
            action = self.agent.choose_action(state)
            _, reward, done = self.game.step(action)
            next_state = self.game.get_ai_state()
            self.agent.learn(state, action, reward, next_state)

            if done:
                # 1. CAPTURAR el score antes del reset
                final_score = self.game.score
                self.total_episodes += 1

                # 2. ACTUALIZAR Récord
                if final_score > self.max_score:
                    self.max_score = final_score

                # 3. EMITIR a la gráfica
                self.socketio.emit(
                    "episode_finished",
                    {
                        "score": final_score,
                        "max_score": self.max_score,
                        "episode_number": self.total_episodes,
                    },
                )

                # 4. RESETEAR manualmente
                self.game.reset()

            # Datos constantes para el Canvas y el Panel
            self.socketio.emit(
                "game_state",
                {
                    **self.game.get_state(),
                    "q_size": len(self.agent.q_table),
                    "epsilon": round(self.agent.epsilon, 2),
                    "max_score": self.max_score,
                    "episode_number": self.total_episodes,
                },
            )

            self.socketio.sleep(self.base_delay / self.speed_multiplier)

    def train_turbo(self, n_episodes):
        self.is_turbo = True
        for i in range(n_episodes):
            done = False
            self.game.reset()
            while not done:
                state = self.game.get_ai_state()
                action = self.agent.choose_action(state)
                _, reward, done = self.game.step(action)
                next_state = self.game.get_ai_state()
                self.agent.learn(state, action, reward, next_state)

            # Al terminar el bucle 'while not done', el pájaro acaba de morir
            final_score = self.game.score
            self.total_episodes += 1
            if final_score > self.max_score:
                self.max_score = final_score

            self.socketio.emit(
                "episode_finished",
                {
                    "score": final_score,
                    "max_score": self.max_score,
                    "episode_number": self.total_episodes,
                    "current_training": i + 1,
                    "total_turbo": n_episodes,
                    "is_turbo": True,
                },
            )
        self.is_turbo = False
