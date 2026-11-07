import { clonePlain, respawn, type MapDef, type SimConfig, type SimState } from '@caveflyer/sim';
import type { ClientConfig } from '../content';

type Obj = Record<string, unknown>;

interface NumberField {
  kind: 'number';
  label: string;
  target: () => Obj;
  key: string;
  min: number;
  max: number;
  step: number;
}

interface ToggleField {
  kind: 'toggle';
  label: string;
  target: () => Obj;
  key: string;
}

type Field = NumberField | ToggleField;

export interface SandboxSettings {
  assisted: boolean;
}

/**
 * Live tuning panel (F2). Edits the running sim's config, map physics and the
 * camera in place; "Copy JSON" exports the values to paste into content/.
 */
export class TuningPanel {
  private readonly root: HTMLElement;
  private readonly original: { config: SimConfig; map: Pick<MapDef, 'gravity' | 'drag'>; client: ClientConfig };
  private inputs: { field: Field; el: HTMLInputElement; out?: HTMLOutputElement }[] = [];

  constructor(
    private readonly state: SimState,
    private readonly client: ClientConfig,
    private readonly settings: SandboxSettings,
    private readonly playerShip = 0,
  ) {
    this.original = {
      config: clonePlain(state.config),
      map: { gravity: state.map.gravity, drag: state.map.drag },
      client: clonePlain(client),
    };
    this.root = document.createElement('aside');
    this.root.id = 'tuning';
    this.root.hidden = true;
    document.body.appendChild(this.root);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F2') {
        this.toggle();
        e.preventDefault();
      }
    });
    this.build();
  }

  toggle(): void {
    this.root.hidden = !this.root.hidden;
    if (!this.root.hidden) this.refresh();
  }

  private ship() {
    return this.state.ships[this.playerShip]!;
  }

  private hull(): Obj {
    return this.state.config.hulls[this.ship().hull] as unknown as Obj;
  }

  private fields(): [string, Field[]][] {
    const t = () => this.state.config.tuning as unknown as Obj;
    const ship = () => t().ship as Obj;
    const pad = () => t().pad as Obj;
    const map = () => this.state.map as unknown as Obj;
    const cam = () => this.client.camera as unknown as Obj;
    const n = (label: string, target: () => Obj, key: string, min: number, max: number, step: number): Field => ({
      kind: 'number', label, target, key, min, max, step,
    });
    return [
      ['Hull', [
        n('Mass', () => this.hull(), 'mass', 0.2, 3, 0.05),
        n('Thrust (px/s² at mass 1)', () => this.hull(), 'thrust', 0, 900, 5),
        n('Turn rate (°/s)', () => this.hull(), 'turnRate', 30, 720, 5),
        n('Armor (HP)', () => this.hull(), 'armor', 10, 400, 5),
        n('Size (px)', () => this.hull(), 'size', 6, 24, 1),
      ]],
      ['Map', [n('Gravity (px/s²)', map, 'gravity', 0, 400, 5), n('Drag (/s)', map, 'drag', 0, 2, 0.01)]],
      ['Walls', [
        { kind: 'toggle', label: 'Wall damage', target: ship, key: 'wallDamage' },
        n('Damage threshold (px/s)', ship, 'damageThreshold', 0, 400, 5),
        n('Damage per px/s', ship, 'damagePerSpeed', 0, 2, 0.01),
        n('Restitution', ship, 'restitution', 0, 1, 0.01),
        n('Rest speed (px/s)', ship, 'restSpeed', 0, 100, 1),
        n('Contact friction', ship, 'contactFriction', 0, 1, 0.01),
      ]],
      ['Pads', [
        n('Max landing speed', pad, 'maxLandingSpeed', 0, 200, 1),
        n('Max landing angle (°)', pad, 'maxLandingAngleDeg', 0, 90, 1),
        n('Safe impact speed', pad, 'safeImpactSpeed', 0, 400, 5),
        n('Repair (HP/s)', pad, 'repairPerSecond', 0, 100, 1),
      ]],
      ['Camera', [
        n('Visible height (px)', cam, 'targetVisibleHeight', 120, 720, 10),
        n('Look-ahead (s)', cam, 'lookAheadSeconds', 0, 1.5, 0.05),
        n('Max look-ahead (px)', cam, 'maxLookAheadPx', 0, 300, 5),
        n('Smoothing (/s)', cam, 'smoothing', 0.5, 30, 0.5),
      ]],
    ];
  }

  private build(): void {
    this.root.replaceChildren();
    this.inputs = [];
    const h = document.createElement('h2');
    h.textContent = 'Tuning';
    const hint = document.createElement('span');
    hint.textContent = 'F2 to close';
    h.appendChild(hint);
    this.root.appendChild(h);

    // Controls: hull choice and assisted steering.
    const controls = this.section('Controls');
    const hullRow = this.row('Hull');
    const select = document.createElement('select');
    for (const hull of Object.values(this.state.config.hulls)) {
      const opt = document.createElement('option');
      opt.value = hull.id;
      opt.textContent = `${hull.name} (${hull.points} pts)`;
      select.appendChild(opt);
    }
    select.value = this.ship().hull;
    select.addEventListener('change', () => {
      this.ship().hull = select.value;
      respawn(this.state, this.ship());
      this.refresh();
      select.blur();
    });
    hullRow.appendChild(select);
    controls.appendChild(hullRow);
    const assistRow = this.row('Assisted steering (gamepad)');
    const assist = document.createElement('input');
    assist.type = 'checkbox';
    assist.checked = this.settings.assisted;
    assist.addEventListener('change', () => (this.settings.assisted = assist.checked));
    assistRow.appendChild(assist);
    controls.appendChild(assistRow);

    for (const [title, fields] of this.fields()) {
      const sec = this.section(title);
      for (const field of fields) sec.appendChild(this.fieldRow(field));
    }

    const buttons = document.createElement('div');
    buttons.className = 'buttons';
    const copy = this.button('Copy JSON', () => this.copyJson(copy));
    const reset = this.button('Reset', () => this.reset());
    const respawnBtn = this.button('Respawn (R)', () => respawn(this.state, this.ship()));
    buttons.append(copy, reset, respawnBtn);
    this.root.appendChild(buttons);
  }

  private section(title: string): HTMLElement {
    const sec = document.createElement('section');
    const h = document.createElement('h3');
    h.textContent = title;
    sec.appendChild(h);
    this.root.appendChild(sec);
    return sec;
  }

  private row(label: string): HTMLLabelElement {
    const row = document.createElement('label');
    const span = document.createElement('span');
    span.textContent = label;
    row.appendChild(span);
    return row;
  }

  private button(text: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.textContent = text;
    b.addEventListener('click', () => {
      onClick();
      b.blur();
    });
    return b;
  }

  private fieldRow(field: Field): HTMLElement {
    const row = this.row(field.label);
    const el = document.createElement('input');
    if (field.kind === 'toggle') {
      el.type = 'checkbox';
      el.addEventListener('change', () => (field.target()[field.key] = el.checked));
      row.appendChild(el);
      this.inputs.push({ field, el });
    } else {
      el.type = 'range';
      el.min = String(field.min);
      el.max = String(field.max);
      el.step = String(field.step);
      const out = document.createElement('output');
      el.addEventListener('input', () => {
        field.target()[field.key] = Number(el.value);
        out.textContent = el.value;
      });
      row.append(el, out);
      this.inputs.push({ field, el, out });
    }
    return row;
  }

  /** Pull current values into the controls (after hull switch or reset). */
  refresh(): void {
    for (const { field, el, out } of this.inputs) {
      const v = field.target()[field.key];
      if (field.kind === 'toggle') el.checked = Boolean(v);
      else {
        el.value = String(v);
        if (out) out.textContent = String(v);
      }
    }
    const select = this.root.querySelector('select');
    if (select) select.value = this.ship().hull;
  }

  private reset(): void {
    this.state.config = clonePlain(this.original.config);
    this.state.map.gravity = this.original.map.gravity;
    this.state.map.drag = this.original.map.drag;
    Object.assign(this.client.camera, clonePlain(this.original.client.camera));
    if (!this.state.config.hulls[this.ship().hull]) this.ship().hull = Object.keys(this.state.config.hulls)[0]!;
    this.refresh();
  }

  private copyJson(button: HTMLButtonElement): void {
    const json = JSON.stringify(
      {
        hull: this.hull(),
        tuning: this.state.config.tuning,
        map: { id: this.state.map.id, gravity: this.state.map.gravity, drag: this.state.map.drag },
        client: this.client,
      },
      null,
      2,
    );
    console.log(json);
    navigator.clipboard?.writeText(json).then(
      () => flash(button, 'Copied!'),
      () => flash(button, 'See console'),
    ) ?? flash(button, 'See console');
  }
}

function flash(button: HTMLButtonElement, text: string): void {
  const old = button.textContent;
  button.textContent = text;
  setTimeout(() => (button.textContent = old), 1200);
}
