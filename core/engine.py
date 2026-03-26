import random


class FlappyEngine:
    def __init__(self):
        self.width = 400
        self.height = 600
        self.dynamic_difficulty = False
        self.base_gap = 160
        self.reset()

    def reset(self):
        self.bird_y = 300
        self.bird_vel = 0
        self.gravity = 0.5
        self.pipes = [
            {
                "x": 400,
                "gap_y": 300,
                "gap_size": self.base_gap,
                "moving": False,
                "v_dir": 1,
            }
        ]
        self.score = 0
        return self.get_state()

    def check_collision(self):
        if self.bird_y <= 0 or self.bird_y >= self.height - 30:
            return True
        for p in self.pipes:
            # Usamos el gap_size individual de cada tubería
            gap_half = p.get("gap_size", self.base_gap) / 2

            if p["x"] < 80 and p["x"] + 50 > 50:
                # Choca si está por encima del hueco o por debajo
                if (
                    self.bird_y < p["gap_y"] - gap_half
                    or self.bird_y > p["gap_y"] + gap_half
                ):
                    return True
        return False

    def step(self, action=0):
        if action == 1:
            self.bird_vel = -7
        self.bird_vel += self.gravity
        self.bird_y += self.bird_vel

        # --- LÓGICA DE MOVIMIENTO DE TUBERÍAS ---
        for p in self.pipes:
            p["x"] -= 5  # Movimiento horizontal

            # Si la dificultad está activa y el tubo es de tipo "moving"
            if self.dynamic_difficulty and p.get("moving", False):
                p["gap_y"] += p["v_dir"] * 2  # Velocidad vertical
                # Rebotar si llega muy arriba o muy abajo
                if p["gap_y"] < 150 or p["gap_y"] > 450:
                    p["v_dir"] *= -1

        # --- SPAWN DE TUBERÍAS CON DIFICULTAD VARIABLE ---
        if self.pipes[-1]["x"] < 200:
            new_gap_y = random.randint(200, 400)
            new_gap_size = self.base_gap
            is_moving = False

            # Si el modo difícil está activo, hay un 40% de probabilidad de tubo especial
            if self.dynamic_difficulty and random.random() < 0.4:
                new_gap_size = random.randint(100, 130)  # Hueco más estrecho
                is_moving = random.choice([True, False])  # Algunos se mueven, otros no

            self.pipes.append(
                {
                    "x": 400,
                    "gap_y": new_gap_y,
                    "gap_size": new_gap_size,
                    "moving": is_moving,
                    "v_dir": random.choice([1, -1]),
                }
            )

        reward = 0.1

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
        dx = int((next_pipe["x"] - 50) // 20)
        dy = int((next_pipe["gap_y"] - self.bird_y) // 20)
        v = int(self.bird_vel // 2)

        return (dx, dy, v)
