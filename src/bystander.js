/* Bystanders for the crew mechanic. Plain script (no imports), like data.js and game.js.
   Load this BEFORE src/crew.js.

   Abilities map to the "5 Ds" of bystander intervention: Direct, Distract, Delegate,
   Delay, Document.

   Willingness is not a fixed stat. It rises with a specific ask, eye contact and social
   proof (others already helping), and a generic "someone help!" barely moves it
   (diffusion of responsibility).

   A bystander wraps a `view`: any Phaser game object with x and y. The caller owns
   drawing it, so this file needs no textures. */

const Ability = Object.freeze({
  DIRECT: 'direct',       // confront: high impact, needs high willingness
  DISTRACT: 'distract',   // break momentum with a harmless interruption
  DELEGATE: 'delegate',   // fetch staff or security; arrives after a delay
  DELAY: 'delay',         // check in with the target afterward; heals
  DOCUMENT: 'document'    // film or note it; exposes the plan
});

// threshold = willingness needed to act. cohesionHit = damage to the crew's link.
const ABILITY_CONFIG = Object.freeze({
  [Ability.DIRECT]:   { threshold: 0.75, cohesionHit: 45, cooldownMs: 6000 },
  [Ability.DISTRACT]: { threshold: 0.40, cohesionHit: 25, cooldownMs: 3500 },
  [Ability.DELEGATE]: { threshold: 0.30, cohesionHit: 0,  cooldownMs: 8000, arrivalMs: 4000 },
  [Ability.DELAY]:    { threshold: 0.20, cohesionHit: 0,  cooldownMs: 5000, heal: 30 },
  [Ability.DOCUMENT]: { threshold: 0.35, cohesionHit: 30, cooldownMs: 5000, exposure: 0.35 }
});

const BYSTANDER_TUNING = {
  baseWillingnessMin: 0.10,
  baseWillingnessMax: 0.45,
  specificAskBoost: 0.35,      // player asks THIS person for a specific thing
  askCooldownMs: 2500,         // asking the same person again inside this window adds nothing
  eyeContactBoost: 0.10,
  socialProofPerHelper: 0.12,  // each active helper nearby raises willingness
  socialProofCap: 0.36,
  socialProofRadius: 160,
  helpingWindowMs: 2500,       // how long someone counts as "helping" after acting
  genericShoutBoost: 0.02,     // "someone help!" barely works, on purpose
  genericShoutDilution: 0.01,  // and the bigger the crowd, the weaker it is
  driftPerSecond: 0.04         // willingness drifts back toward its target
};

class Bystander {
  /**
   * @param {Phaser.Scene} scene
   * @param {{x:number, y:number}} view Phaser game object that represents this person
   * @param {string} ability one of Ability.*
   */
  constructor(scene, view, ability) {
    this.scene = scene;
    this.view = view;
    this.ability = ability;
    this.baseline = Phaser.Math.FloatBetween(
      BYSTANDER_TUNING.baseWillingnessMin, BYSTANDER_TUNING.baseWillingnessMax);
    this.willingness = this.baseline;
    this.helping = false;
    this.cooldownUntil = 0;
    this.lastAskAt = -Infinity;
  }

  get config() { return ABILITY_CONFIG[this.ability]; }

  /* ---------- player interactions ---------- */

  /** Player makes eye contact. Small boost. */
  eyeContact() { this._raise(BYSTANDER_TUNING.eyeContactBoost); }

  /** Player gives this specific person a specific ask. Big boost, but asking again right away does nothing. */
  specificAsk() {
    const now = this.scene.time.now;
    if (now - this.lastAskAt < BYSTANDER_TUNING.askCooldownMs) return;
    this.lastAskAt = now;
    this._raise(BYSTANDER_TUNING.specificAskBoost);
  }

  /**
   * Player shouts generically. Weak, and weaker the more people there are:
   * everyone assumes someone else will act.
   * @param {number} crowdSize number of bystanders in earshot
   */
  genericShout(crowdSize) {
    const boost = Math.max(0,
      BYSTANDER_TUNING.genericShoutBoost - BYSTANDER_TUNING.genericShoutDilution * crowdSize);
    this._raise(boost);
  }

  /* ---------- per frame ---------- */

  /**
   * @param {number} dt seconds since the last frame
   * @param {Bystander[]} others every bystander in the scene (for social proof)
   */
  update(dt, others) {
    const T = BYSTANDER_TUNING;
    let helpers = 0;
    for (const o of others) {
      if (o !== this && o.helping &&
          Phaser.Math.Distance.Between(this.view.x, this.view.y, o.view.x, o.view.y) < T.socialProofRadius) helpers++;
    }
    const target = Math.min(1, this.baseline + Math.min(helpers * T.socialProofPerHelper, T.socialProofCap));
    const step = T.driftPerSecond * dt;
    if (this.willingness > target) this.willingness = Math.max(target, this.willingness - step);
    else this.willingness = Math.min(target, this.willingness + step);
  }

  /* ---------- acting ---------- */

  /** True if this person is willing and off cooldown. */
  canAct(now) {
    return now >= this.cooldownUntil && this.willingness >= this.config.threshold;
  }

  /**
   * Try to use this person's ability. Returns an effect for Crew.applyEffect(),
   * or null if they weren't willing yet.
   * @param {number} now scene time in ms (scene.time.now)
   */
  tryAct(now) {
    if (!this.canAct(now)) return null;
    const cfg = this.config;

    this.helping = true;
    this.cooldownUntil = now + cfg.cooldownMs;
    // Helping lingers briefly so the people around them feel the social proof.
    this.scene.time.delayedCall(BYSTANDER_TUNING.helpingWindowMs, () => { this.helping = false; });

    switch (this.ability) {
      case Ability.DIRECT:
      case Ability.DISTRACT: return { type: 'cohesion', amount: cfg.cohesionHit, source: this };
      case Ability.DOCUMENT: return { type: 'expose', amount: cfg.exposure, cohesion: cfg.cohesionHit, source: this };
      case Ability.DELEGATE: return { type: 'staff', arrivalMs: cfg.arrivalMs, source: this };
      case Ability.DELAY:    return { type: 'heal', amount: cfg.heal, source: this };
      default: return null;
    }
  }

  _raise(amount) { this.willingness = Math.min(1, this.willingness + amount); }
}
