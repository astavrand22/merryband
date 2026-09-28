/* Crew mechanic test scene. Open crew-test.html. Not part of the shipped game.

   One target, a crew of three creeps and five bystanders (one per "D").
   - Hover a bystander: eye contact (small willingness boost)
   - Click a bystander: a specific ask, then they act if willing. The ability is aimed at
     the creep nearest to them, so position matters (each role has a weakness)
   - Click a creep: draw them away from the group (once each)
   - Space or the Shout button: "someone help!" Barely works, on purpose
   - R: restart
   Circles only. The scene never depicts harm. If the plan runs out, the round just ends. */

const CT = { W: 820, H: 520 };
const CT_COLORS = { ink: 0x1A0E1D, cream: 0xFFF1E0, amber: 0xF4B942, neon: 0xFF4F9A, flag: 0xE0302B, target: 0x6FB1FF, good: 0x7CFF6B };
const CT_FONT = { fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#FFF1E0' };
const CT_DOOR = { x: CT.W - 40, y: 230 };
const CT_ABILITY_LABEL = { direct: 'Direct', distract: 'Distract', delegate: 'Delegate', delay: 'Delay', document: 'Document' };
const CT_ABILITY_ASK = {
  direct: 'stepped up and confronted the crew',
  distract: 'broke the crew’s momentum',
  delegate: 'went to get staff (arrives in a few seconds)',
  delay: 'checked in on the target',
  document: 'started filming'
};

class CrewTestScene extends Phaser.Scene {
  constructor() { super('crew-test'); }

  create() {
    this.cameras.main.setBackgroundColor(CT_COLORS.ink);
    this.ended = false;

    // Exit door on the right.
    this.add.rectangle(CT_DOOR.x, CT_DOOR.y, 26, 110, 0x3A2A40).setStrokeStyle(2, CT_COLORS.amber);
    this.add.text(CT_DOOR.x, CT_DOOR.y - 70, 'EXIT', CT_FONT).setOrigin(0.5);

    // Target.
    this.target = this.add.circle(230, 230, 16, CT_COLORS.target);
    this.targetLabel = this.add.text(230, 254, 'Target', CT_FONT).setOrigin(0.5);

    // Creeps: entities with a `view`, as Crew expects.
    const start = [[560, 130], [600, 230], [560, 330]];
    this.creeps = start.map(([x, y]) => {
      const view = this.add.circle(x, y, 15, CT_COLORS.flag).setInteractive(
        new Phaser.Geom.Circle(15, 15, 24), Phaser.Geom.Circle.Contains);
      const label = this.add.text(x, y - 26, '', CT_FONT).setOrigin(0.5);
      const creep = { view, label, home: null };
      view.on('pointerdown', () => this.onCreepClick(creep));
      return creep;
    });
    this.crew = new Crew(this, this.creeps, this.target);

    // Bystanders along the bottom, one per ability.
    const abilities = Object.values(Ability);
    this.bystanders = abilities.map((ability, i) => {
      const x = 120 + i * 150, y = 420;
      const view = this.add.circle(x, y, 14, 0x9A8CC0).setInteractive(
        new Phaser.Geom.Circle(14, 14, 26), Phaser.Geom.Circle.Contains);
      const label = this.add.text(x, y + 26, CT_ABILITY_LABEL[ability], CT_FONT).setOrigin(0.5);
      const b = new Bystander(this, view, ability);
      b.label = label;
      b.lastEyeContact = 0;
      view.on('pointerover', () => this.onEyeContact(b));
      view.on('pointerdown', () => this.onBystanderClick(b));
      return b;
    });

    this.bars = this.add.graphics();
    this.hud = this.add.text(14, 12, '', CT_FONT);
    ['Crew link', 'Exposure', 'Plan progress'].forEach((s, i) =>
      this.add.text(14, 34 + i * 26, s, { ...CT_FONT, fontSize: '11px', color: '#B8A9C0' }));
    this.toastText = this.add.text(CT.W / 2, 470, '', { ...CT_FONT, fontSize: '14px', color: '#F4B942', align: 'center' }).setOrigin(0.5);
    this.banner = this.add.text(520, 90, '', { ...CT_FONT, fontSize: '18px', align: 'center', wordWrap: { width: 460 } })
      .setOrigin(0.5).setDepth(10).setBackgroundColor('rgba(26,14,29,0.9)').setPadding(12, 8);
    this.add.text(14, CT.H - 22,
      'Hover = eye contact.  Click a bystander = specific ask.  Click a creep = draw away.  Space = shout.  R = restart.',
      { ...CT_FONT, fontSize: '12px', color: '#B8A9C0' });

    // Shout button, for touch screens.
    const shout = this.add.text(CT.W - 14, 12, '[ Shout "someone help!" ]', { ...CT_FONT, color: '#F4B942' })
      .setOrigin(1, 0).setInteractive({ useHandCursor: true });
    shout.on('pointerdown', () => this.shout());

    this.input.keyboard.on('keydown-SPACE', () => this.shout());
    this.input.keyboard.on('keydown-R', () => this.scene.restart());
  }

  /* ---------- player actions ---------- */

  onEyeContact(b) {
    if (this.ended || this.time.now - b.lastEyeContact < 800) return;
    b.lastEyeContact = this.time.now;
    b.eyeContact();
  }

  onBystanderClick(b) {
    if (this.ended) return;
    b.specificAsk();
    const effect = b.tryAct(this.time.now);
    if (!effect) {
      this.toast(CT_ABILITY_LABEL[b.ability] + ' isn’t willing yet. Ask again, or let someone else go first.');
      return;
    }
    const near = this.nearestCreep(b.view);
    const hitRole = near ? near.role : null;
    this.crew.applyEffect(effect, hitRole);
    const strong = hitRole && ROLE_WEAKNESS[hitRole] === b.ability;
    this.toast(CT_ABILITY_LABEL[b.ability] + ' ' + CT_ABILITY_ASK[b.ability] +
      (strong ? '. Right target: extra effect!' : '.'));
  }

  onCreepClick(creep) {
    if (this.ended || creep.separated) return;
    this.crew.separateCreep(creep);
    this.toast('Drew one away from the group. The link weakens.');
  }

  shout() {
    if (this.ended) return;
    this.bystanders.forEach(b => b.genericShout(this.bystanders.length));
    this.toast('Everyone heard "someone help!" and nobody thinks it’s for them.');
  }

  nearestCreep(view) {
    let best = null, bd = Infinity;
    for (const c of this.creeps) {
      const d = Phaser.Math.Distance.Between(view.x, view.y, c.view.x, c.view.y);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }

  toast(text) {
    this.toastText.setText(text);
    this.toastAt = this.time.now;
  }

  /* ---------- per frame ---------- */

  update(time, delta) {
    const dt = delta / 1000;
    this.bystanders.forEach(b => b.update(dt, this.bystanders));
    this.crew.update(delta);
    this.moveCreeps(dt);
    this.draw();

    if (this.toastAt && time - this.toastAt > 3500) { this.toastText.setText(''); this.toastAt = 0; }

    if (!this.ended && this.crew.phase === Phase.BROKEN) {
      this.ended = true;
      this.banner.setText('Crew broken. They scatter, and now they’re easy to handle one at a time.\nPress R to play again.');
    } else if (!this.ended && this.crew.phase === Phase.SUCCEEDED) {
      this.ended = true;
      this.banner.setText('The plan ran out before anyone broke it.\nTry again: ask people by name, and get someone moving first.\nPress R.');
    }
  }

  // Formations per phase. Abstract on purpose: distance from the target is the whole story.
  moveCreeps(dt) {
    const t = this.target, crew = this.crew, phase = crew.phase;
    const angle = { isolator: -0.2, distractor: -2.3, blocker: 1.6 };
    const radius = {
      approach: { isolator: 150, distractor: 170, blocker: 170 },
      separate: { isolator: 90, distractor: 210, blocker: 120 },
      isolate:  { isolator: 40, distractor: 230, blocker: 90 },
      exit:     { isolator: 40, distractor: 230, blocker: 90 }
    };

    for (const c of this.creeps) {
      let tx, ty, speed = 90;
      if (phase === Phase.BROKEN) {
        // Scatter toward the nearest side.
        tx = c.view.x < CT.W / 2 ? -30 : CT.W + 30; ty = c.view.y; speed = 160;
      } else if (c.separated) {
        tx = t.x - 120; ty = 60 + this.creeps.indexOf(c) * 30; speed = 120;
      } else if (phase === Phase.EXIT) {
        tx = CT_DOOR.x - 40 - (c.role === Role.ISOLATOR ? 0 : 50);
        ty = CT_DOOR.y + (angle[c.role] > 0 ? 50 : c.role === Role.DISTRACTOR ? -70 : 0);
      } else if (phase === Phase.SUCCEEDED) {
        continue;
      } else {
        const r = radius[phase][c.role], a = angle[c.role];
        tx = t.x + Math.cos(a) * r; ty = t.y + Math.sin(a) * r;
      }
      const dx = tx - c.view.x, dy = ty - c.view.y, d = Math.hypot(dx, dy);
      if (d > 1) { const s = Math.min(d, speed * dt) / d; c.view.x += dx * s; c.view.y += dy * s; }
      c.label.setPosition(c.view.x, c.view.y - 26).setText(c.role ? c.role : (c.scattering ? '' : 'away'));
      c.view.setAlpha(phase === Phase.BROKEN ? 0.55 : 1);
    }

    // In the exit phase the target is steered toward the door by the isolator.
    if (phase === Phase.EXIT) {
      const iso = this.creeps.find(c => c.role === Role.ISOLATOR && !c.separated);
      if (iso) {
        t.x += (iso.view.x - 34 - t.x) * Math.min(1, dt * 1.5);
        t.y += (iso.view.y - t.y) * Math.min(1, dt * 1.5);
        this.targetLabel.setPosition(t.x, t.y + 24);
      }
    }
  }

  draw() {
    const g = this.bars, crew = this.crew;
    g.clear();

    // Crew meters (labels are static texts created in create()).
    const bar = (x, y, w, frac, color) => {
      g.fillStyle(0x3A2A40, 1).fillRect(x, y, w, 8);
      g.fillStyle(color, 1).fillRect(x, y, w * Math.max(0, Math.min(1, frac)), 8);
    };
    bar(14, 50, 180, crew.cohesion / 100, CT_COLORS.flag);
    bar(14, 76, 180, crew.exposure, CT_COLORS.amber);
    const dur = PHASE_DURATION[crew.phase];
    bar(14, 102, 180, dur ? crew.phaseElapsed / dur : 1, CT_COLORS.target);
    this.hud.setText('Phase: ' + crew.phase);

    // Willingness bars with a tick at each ability's threshold.
    for (const b of this.bystanders) {
      const x = b.view.x - 24, y = b.view.y - 34, w = 48;
      g.fillStyle(0x3A2A40, 1).fillRect(x, y, w, 6);
      const ready = b.canAct(this.time.now);
      g.fillStyle(ready ? CT_COLORS.good : 0x9A8CC0, 1).fillRect(x, y, w * b.willingness, 6);
      g.fillStyle(CT_COLORS.cream, 1).fillRect(x + w * b.config.threshold - 1, y - 3, 2, 12);
      b.view.setStrokeStyle(b.helping ? 4 : 0, CT_COLORS.good);
    }
  }
}

const crewTestGame = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: CT.W,
  height: CT.H,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: CrewTestScene
});
