import type { HullDef, Ship } from '@caveflyer/sim';
import { Container, Graphics } from 'pixi.js';

export const PLAYER_COLORS = [0xffd166, 0x4cc9f0, 0xf72585, 0x80ed99];

interface Particle {
  g: Graphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

/** Draws ships (interpolated), thrust flames, spawn blink and death bursts. */
export class ShipRenderer {
  readonly view = new Container();
  private readonly sprites = new Map<number, Graphics>();
  private readonly wasAlive = new Map<number, boolean>();
  private readonly particles: Particle[] = [];
  private frame = 0;

  draw(ship: Ship, hull: HullDef, pose: { x: number; y: number; angle: number }): void {
    let g = this.sprites.get(ship.id);
    if (!g) {
      g = new Graphics();
      this.sprites.set(ship.id, g);
      this.view.addChild(g);
    }
    if (this.wasAlive.get(ship.id) && !ship.alive) this.burst(pose.x, pose.y, PLAYER_COLORS[ship.player % 4]!);
    this.wasAlive.set(ship.id, ship.alive);

    const blink = ship.invulnTicks > 0 && Math.floor(ship.invulnTicks / 4) % 2 === 0;
    g.visible = ship.alive && !blink;
    if (!g.visible) return;

    const L = hull.size;
    const W = hull.size * 0.75;
    const color = PLAYER_COLORS[ship.player % 4]!;
    g.clear();
    if (ship.thrusting) {
      const flicker = 0.6 + 0.4 * ((this.frame * 7 + ship.id * 3) % 5) / 4;
      g.poly([-W * 0.25, L * 0.35, W * 0.25, L * 0.35, 0, L * (0.35 + 0.5 * flicker)]).fill(0xff8c42);
    }
    g.poly([0, -L * 0.6, W / 2, L * 0.4, 0, L * 0.2, -W / 2, L * 0.4]).fill(color);
    g.position.set(pose.x, pose.y);
    g.rotation = pose.angle;
  }

  /** Advance particles; call once per rendered frame. */
  tick(dtSeconds: number): void {
    this.frame++;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      p.life -= dtSeconds;
      p.g.x += p.vx * dtSeconds;
      p.g.y += p.vy * dtSeconds;
      p.vy += 60 * dtSeconds;
      p.g.alpha = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0) {
        p.g.destroy();
        this.particles.splice(i, 1);
      }
    }
  }

  private burst(x: number, y: number, color: number): void {
    for (let i = 0; i < 28; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 120;
      const g = new Graphics().rect(-1, -1, 2, 2).fill(i % 3 === 0 ? 0xffffff : i % 3 === 1 ? 0xff8c42 : color);
      g.position.set(x, y);
      this.view.addChild(g);
      const life = 0.5 + Math.random() * 0.7;
      this.particles.push({ g, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life, maxLife: life });
    }
  }
}
