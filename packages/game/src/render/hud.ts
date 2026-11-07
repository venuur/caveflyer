import type { HullDef, Ship } from '@caveflyer/sim';
import { Container, Graphics, Text } from 'pixi.js';
import type { Rect } from '../viewports';

/** Per-viewport HUD: hull HP bar, speed, and landing / respawn status. */
export class Hud {
  readonly view = new Container();
  private readonly bar = new Graphics();
  private readonly label = new Text({
    text: '',
    style: { fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 13, fill: 0xe8f1ff },
  });
  private readonly status = new Text({
    text: '',
    style: { fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 16, fill: 0x3ddc84, fontWeight: 'bold' },
  });

  constructor() {
    this.view.addChild(this.bar, this.label, this.status);
  }

  update(ship: Ship, hull: HullDef, rect: Rect, tickRate: number): void {
    const w = 160;
    const x = rect.x + rect.width - w - 16;
    const y = rect.y + rect.height - 30;
    const frac = Math.max(0, Math.min(1, ship.hp / hull.armor));
    const color = frac > 0.5 ? 0x3ddc84 : frac > 0.25 ? 0xffd166 : 0xf25f5c;
    this.bar.clear();
    this.bar.rect(x - 2, y - 2, w + 4, 14).fill({ color: 0x000000, alpha: 0.6 });
    this.bar.rect(x, y, w * frac, 10).fill(color);
    const speed = Math.hypot(ship.vx, ship.vy);
    this.label.text = `HP ${Math.ceil(ship.hp)}/${hull.armor}   ${hull.name}   ${speed.toFixed(0)} px/s`;
    this.label.position.set(x + w - this.label.width, y - 20);

    let msg = '';
    if (!ship.alive) msg = `RESPAWN IN ${Math.ceil(ship.respawnTicks / tickRate)}`;
    else if (ship.landedPad >= 0) msg = ship.hp < hull.armor ? 'LANDED · REPAIRING' : 'LANDED';
    this.status.text = msg;
    this.status.style.fill = ship.alive ? 0x3ddc84 : 0xf25f5c;
    this.status.position.set(rect.x + (rect.width - this.status.width) / 2, rect.y + rect.height * 0.2);
  }
}
