import random


class FlappyEngine:
    def __init__(self):
        self.width = 400
        self.height = 600
        self.reset()

    def reset(self):
        self.bird_y = 300
        self.bird_vel = 0
        self.gravity = 0.5
        self.pipes = [{"x": 400, "gap_y": 300}]
        self.score = 0
        # Ahora reset llama a get_state para no dar error
        return self.get_state()

    def check_collision(self):
        if self.bird_y <= 0 or self.bird_y >= self.height - 30:
            return True
        for p in self.pipes:
            if p["x"] < 80 and p["x"] + 50 > 50:
                if self.bird_y < p["gap_y"] - 80 or self.bird_y > p["gap_y"] + 80:
                    return True
        return False

    def step(self, action=0):
        if action == 1:
            self.bird_vel = -7
        self.bird_vel += self.gravity
        self.bird_y += self.bird_vel

        for p in self.pipes:
            p["x"] -= 5

        # 1. ¿Necesitamos una tubería nueva? (Miramos la última de la lista)
        if self.pipes[-1]["x"] < 200:
            self.pipes.append({"x": 400, "gap_y": random.randint(200, 400)})

        reward = 0.1

        # 2. ¿Hay que borrar la que ya pasó? (Miramos la primera de la lista)
        if self.pipes[0]["x"] < -50:
            self.pipes.pop(0)
            self.score += 1
            reward += 15

        done = False
        if self.check_collision():
            reward = -1000
            done = True

        return self.get_state(), reward, done

    def get_state(self):
        """Datos para enviar al navegador (Canvas)"""
        return {"bird_y": self.bird_y, "pipes": self.pipes, "score": self.score}

    def get_ai_state(self):
        """Datos discretos para la Q-Table con validación de seguridad"""
        # Buscamos tuberías que estén por delante del pájaro
        valid_pipes = [p for p in self.pipes if p["x"] + 50 > 50]

        # Si por un error de tiempo la lista está vacía, usamos la primera disponible
        if not valid_pipes:
            if self.pipes:
                next_pipe = self.pipes[0]
            else:
                # Caso extremo: no hay ninguna tubería (por ejemplo, justo al resetear)
                return (40, 0, 0)  # Un estado seguro por defecto
        else:
            next_pipe = valid_pipes[0]

        # Discretización (el resto sigue igual)
        dx = int((next_pipe["x"] - 50) // 5)
        dy = int((next_pipe["gap_y"] - self.bird_y) // 5)
        v = int(self.bird_vel // 2)

        return (dx, dy, v)
