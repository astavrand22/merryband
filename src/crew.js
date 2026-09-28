/* A crew is 2-3 creeps sharing one plan. While linked they are stronger than the sum of
   their parts. The player's job is to break the link, not win a brawl: separate them,
   expose the plan, or recruit enough bystanders that the plan falls apart.

   Plain script (no imports). Load src/bystander.js first: this file uses `Ability`.

   The plan is an abstract state machine, not a playbook. Nothing here depicts harm:
   if the plan runs out, the round is simply lost. */

const Role = Object.freeze({
  DISTRACTOR: 'distractor',  // pulls the target's friend away, buys time
  ISOLATOR: 'isolator',      // works on the target, steers toward an exit
  BLOCKER: 'blocker'         // body-blocks and runs interference on bystanders
});

const Phase = Object.freeze({
  APPROACH: 'approach',
  SEPARATE: 'separate',
  ISOLATE: 'isolate',
  EXIT: 'exit',
  BROKEN: 'broken',          // crew defeated: they scatter and are beatable one at a time
  SUCCEEDED: 'succeeded'     // the plan ran out before the player broke it
});

// Each role has one weakness that a matching bystander ability exploits.
// Aiming the right ability at the right role is what makes this a puzzle.
const ROLE_WEAKNESS = Object.freeze({
  [Role.DISTRACTOR]: Ability.DOCUMENT,  // being filmed makes the distraction fall apart
  [Role.ISOLATOR]:   Ability.DISTRACT,  // a harmless interruption breaks momentum
  [Role.BLOCKER]:    Ability.DIRECT     // a confident confrontation outweighs a blocker
});
const WEAKNESS_MULTIPLIER = 1.6;

// ms each phase takes if nobody interferes, at planPace 1.
const PHASE_DURATION = Object.freeze({
  [Phase.APPROACH]: 8000, [Phase.SEPARATE]: 10000, [Phase.ISOLATE]: 10000, [Phase.EXIT]: 6000
});
// The one dial for difficulty. 1 = the durations above; 0.4 runs the plan 2.5x slower.
// A fully linked crew still runs up to 1.5x faster than this, and exposure slows it.
const CREW_TUNING = { planPace: 0.4 };
const NEXT_PHASE = Object.freeze({
  [Phase.APPROACH]: Phase.SEPARATE, [Phase.SEPARATE]: Phase.ISOLATE,
  [Phase.ISOLATE]: Phase.EXIT, [Phase.EXIT]: Phase.SUCCEEDED
});

class Crew {
  /**
   * @param {Phaser.Scene} scene
   * @param {Array<{view:{x:number,y:number}}>} creeps 2-3 creep entities; each needs a `view`
   * @param {object} target the person being targeted (any object; may carry `wellbeing`)
   */
  constructor(scene, creeps, target) {
    this.scene = scene;
    this.creeps = creeps;
    this.target = target;
    this.phase = Phase.APPROACH;
    this.phaseElapsed = 0;
    this.cohesion = 100;       // shared link strength; 0 breaks the crew
    this.exposure = 0;         // 0..1; at 1 the plan is public and collapses
    this.staffArrivesAt = null;
    this.tether = scene.add.graphics();  // visible link between creeps, so the player can read it
    this._assignRoles();
  }

  _assignRoles() {
    const roles = [Role.ISOLATOR, Role.DISTRACTOR, Role.BLOCKER];
    this.creeps.forEach((c, i) => { c.role = roles[i % roles.length]; });
  }

  get isActive() { return this.phase !== Phase.BROKEN && this.phase !== Phase.SUCCEEDED; }

  /** The crew is stronger only while linked: 1.0 (broken) to 1.5 (fully linked). */
  get linkBonus() { return 1 + this.cohesion / 200; }

  /**
   * Apply an effect returned by Bystander.tryAct().
   * @param {object} effect
   * @param {string|null} hitRole role of the creep the ability was aimed at, if any
   */
  applyEffect(effect, hitRole = null) {
    if (!effect || !this.isActive) return;
    const bonus = hitRole && ROLE_WEAKNESS[hitRole] === effect.source.ability ? WEAKNESS_MULTIPLIER : 1;

    switch (effect.type) {
      case 'cohesion':
        this.cohesion = Math.max(0, this.cohesion - effect.amount * bonus);
        break;
      case 'expose':
        this.exposure = Math.min(1, this.exposure + effect.amount * bonus);
        this.cohesion = Math.max(0, this.cohesion - effect.cohesion);
        break;
      case 'staff':
        this.staffArrivesAt = this.scene.time.now + effect.arrivalMs;
        break;
      case 'heal':
        this.target.wellbeing = Math.min(100, (this.target.wellbeing ?? 100) + effect.amount);
        break;
    }
    this._checkBroken();
  }

  /** Player draws one creep away from the group. */
  separateCreep(creep, amount = 20) {
    if (!this.isActive || creep.separated) return;
    creep.separated = true;
    this.cohesion = Math.max(0, this.cohesion - amount);
    this._checkBroken();
  }

  /** @param {number} delta ms since the last frame */
  update(delta) {
    if (!this.isActive) return;

    // Staff arriving breaks the crew outright.
    if (this.staffArrivesAt !== null && this.scene.time.now >= this.staffArrivesAt) {
      this.cohesion = 0;
      this._checkBroken();
      return;
    }

    // The plan advances on its own if nobody interferes.
    this.phaseElapsed += delta * this._pacing();
    if (this.phaseElapsed >= PHASE_DURATION[this.phase]) {
      this.phase = NEXT_PHASE[this.phase];
      this.phaseElapsed = 0;
      if (!this.isActive) { this.tether.clear(); return; }
    }

    // The link slowly recovers when the player isn't pressuring it.
    this.cohesion = Math.min(100, this.cohesion + 0.5 * (delta / 1000));
    this._drawTether();
  }

  /** A stronger link speeds the plan up; exposure slows it down. CREW_TUNING.planPace scales it all. */
  _pacing() { return CREW_TUNING.planPace * this.linkBonus * (1 - this.exposure * 0.6); }

  _checkBroken() {
    if (!this.isActive || (this.cohesion > 0 && this.exposure < 1)) return;
    this.phase = Phase.BROKEN;
    this.tether.clear();
    this.creeps.forEach(c => { c.role = null; c.scattering = true; });  // scene handles the scatter
  }

  _drawTether() {
    this.tether.clear();
    const k = this.cohesion / 100;  // fades and thins as the link weakens
    this.tether.lineStyle(2 + 3 * k, 0xFF4D4D, 0.2 + 0.8 * k);
    for (let i = 0; i < this.creeps.length - 1; i++) {
      const a = this.creeps[i].view, b = this.creeps[i + 1].view;
      this.tether.lineBetween(a.x, a.y, b.x, b.y);
    }
  }

  destroy() { this.tether.destroy(); }
}

/** Crews get likelier with level, so players meet solo creeps first and learn the tools. */
function shouldSpawnCrew(level) {
  return Math.random() < Math.min(0.6, 0.05 + 0.08 * (level - 1));
}
