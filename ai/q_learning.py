import numpy as np
import random

class QLearningAgent:
    def __init__(self, alpha=0.1, gamma=0.99, epsilon=0.1):
        self.q_table = {}
        self.alpha = alpha
        self.gamma = gamma
        self.epsilon = epsilon
        self.actions = [0, 1]

    def get_q_values(self, state):
        if state not in self.q_table:
            self.q_table[state] = [0.0, 0.0]
        return self.q_table[state]

    def choose_action(self, state):
        if random.random() < self.epsilon:
            return random.choice(self.actions)
        return np.argmax(self.get_q_values(state))

    def learn(self, state, action, reward, next_state):
        old_q = self.get_q_values(state)[action]
        next_max = max(self.get_q_values(next_state))
        self.q_table[state][action] = old_q + self.alpha * (reward + self.gamma * next_max - old_q)
