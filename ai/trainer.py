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
        self.manual_mode = False
        self.next_human_action = 0
        self.max_score_human = 0

    def reset_full(self):
        self.agent.q_table = {}
        self.max_score = 0
        self.max_score_human = 0
        self.total_episodes = 0
        self.game.reset()

    def set_speed(self, multiplier):
        self.speed_multiplier = max(0.1, float(multiplier))

    def run(self):
        while True:
            if self.is_turbo:
                self.socketio.sleep(0.1)
                continue

            state = self.game.get_ai_state()

            # --- LÓGICA DE ACCIÓN ---
            if self.manual_mode:
                action = self.next_human_action
                self.next_human_action = 0  # Consumimos el salto
            else:
                action = self.agent.choose_action(state)

            # Ejecutar paso
            _, reward, done = self.game.step(action)

            # Aprender (solo si no es manual)
            if not self.manual_mode:
                next_state = self.game.get_ai_state()
                self.agent.learn(state, action, reward, next_state)

            # Si muere
            if done:
                self.total_episodes += 1
                if self.manual_mode:
                    if self.game.score > self.max_score_human:
                        self.max_score_human = self.game.score
                else:
                    if self.game.score > self.max_score:
                        self.max_score = self.game.score

                self.socketio.emit(
                    "episode_finished",
                    {
                        "episode_number": self.total_episodes,
                        "score": self.game.score,
                        "q_size": len(self.agent.q_table),
                        "max_score": self.max_score,
                        "max_score_human": self.max_score_human,
                        "is_manual": self.manual_mode,
                    },
                )
                self.game.reset()

            self.socketio.emit(
                "game_state",
                {
                    **self.game.get_state(),
                    "max_score": self.max_score,
                    "max_score_human": self.max_score_human,
                    "manual_mode": self.manual_mode,
                    "q_size": len(self.agent.q_table),
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
