#!/usr/bin/env node
/**
 * Content validator.
 *
 * The legal content in this game expires. A closed lookback window shown as
 * open is not a stale fact, it is harmful misinformation to the one player who
 * most needed it to be right. So the build fails rather than shipping it.
 *
 * Usage:
 *   node tools/validate.mjs            # fail on errors, warn on warnings
 *   node tools/validate.mjs --strict   # fail on warnings too
 *
 * Exit 0 clean, 1 on failure.
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STRICT = process.argv.includes("--strict");
const TODAY = new Date(process.env.VALIDATE_AS_OF ?? Date.now());

const errors = [];
const warnings = [];
const blocked = [];

const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

const load = (rel) => {
  try {
    return JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
  } catch (e) {
    err(rel, `could not load — ${e.message}`);
    return null;
  }
};

const daysBetween = (a, b) => Math.round((a - b) / 86400000);
const parseDate = (s) => (s ? new Date(`${s}T00:00:00Z`) : null);

/* ------------------------------------------------------------------ codex */

const TIERS = [
  { file: "content/codex/tier1-stable.json", tier: 1, reviewMonths: 36, requiresExpiry: false },
  { file: "content/codex/tier2-federal.json", tier: 2, reviewMonths: 12, requiresExpiry: false },
  { file: "content/codex/tier3-volatile.json", tier: 3, reviewMonths: 3, requiresExpiry: true },
];

const cardIds = new Set();

for (const spec of TIERS) {
  const doc = load(spec.file);
  if (!doc) continue;

  if (doc.tier !== spec.tier) err(spec.file, `declares tier ${doc.tier}, expected ${spec.tier}`);

  for (const card of doc.cards ?? []) {
    const at = `${spec.file}#${card.id}`;
    cardIds.add(card.id);

    for (const field of ["id", "title", "plain", "gap", "sources", "last_verified", "verification_status"]) {
      if (card[field] === undefined) err(at, `missing required field '${field}'`);
    }

    if (!Array.isArray(card.sources) || card.sources.length === 0) {
      err(at, "has no sources — every claim we put in front of a player is attributable");
    }
    for (const s of card.sources ?? []) {
      if (!s.url || !/^https?:\/\//.test(s.url)) err(at, `source '${s.label ?? "?"}' has no usable url`);
    }

    const verified = parseDate(card.last_verified);
    if (!verified || Number.isNaN(+verified)) {
      err(at, `last_verified '${card.last_verified}' is not a valid YYYY-MM-DD date`);
    } else {
      const ageDays = daysBetween(TODAY, verified);
      const allowed = spec.reviewMonths * 30;
      if (ageDays > allowed * 1.1) {
        err(at, `last verified ${ageDays}d ago, past the tier-${spec.tier} review interval of ~${allowed}d`);
      } else if (ageDays > allowed) {
        warn(at, `last verified ${ageDays}d ago, review interval ~${allowed}d — due`);
      }
    }

    // Tier 3 must expire, and must not have expired.
    if (spec.requiresExpiry) {
      if (!card.expires_on) {
        err(at, "tier 3 card has no expires_on — volatile content must carry a hard expiry");
      } else {
        const exp = parseDate(card.expires_on);
        if (!exp || Number.isNaN(+exp)) {
          err(at, `expires_on '${card.expires_on}' is not a valid YYYY-MM-DD date`);
        } else if (exp < TODAY) {
          err(at, `EXPIRED on ${card.expires_on} — re-verify or pull the card. Build will not pass.`);
        } else if (daysBetween(exp, TODAY) <= 60) {
          warn(at, `expires in ${daysBetween(exp, TODAY)}d (${card.expires_on}) — schedule re-verification now`);
        }
      }

      // Per-instance deadlines (lookback windows) expire independently.
      for (const inst of card.instances ?? []) {
        const closes = parseDate(inst.closes);
        const label = `${at}/${inst.jurisdiction}`;
        if (closes && closes < TODAY) {
          err(label, `window closed ${inst.closes} — must not be shown as open`);
        } else if (closes && daysBetween(closes, TODAY) <= 90) {
          warn(label, `window closes in ${daysBetween(closes, TODAY)}d — player-facing urgency copy should reflect this`);
        }
        if (inst.verification_status === "CONFLICTING") {
          blocked.push(`${label}: sources conflict on live filing deadlines — ${inst.conflict_note ?? "see card"}`);
        }
      }
    }

    if (card.ship_blocked) {
      blocked.push(`${at}: ${card.ship_blocked_reason ?? "marked ship_blocked"}`);
    }

    const flaggedStatuses = ["CONFLICTING", "CONTESTED", "STALE-DATA", "BLOCKED", "needs-primary-source"];
    if (flaggedStatuses.includes(card.verification_status) && !card.verification_note) {
      err(at, `verification_status '${card.verification_status}' requires a verification_note saying what to do about it`);
    }
  }
}

/* ------------------------------------------------------------------ armor */

const armor = load("content/armor/armor-layers.json");
const layerIds = new Set();

for (const layer of armor?.layers ?? []) {
  const at = `armor-layers.json#${layer.id}`;
  layerIds.add(layer.id);

  for (const field of ["id", "name", "mechanic", "break_condition", "teaches"]) {
    if (layer[field] === undefined) err(at, `missing required field '${field}'`);
  }
  for (const ref of layer.teaches ?? []) {
    if (!cardIds.has(ref)) err(at, `teaches unknown codex card '${ref}'`);
  }
  if (layer.jurisdiction_conditional === undefined) {
    err(at, "must declare jurisdiction_conditional — it decides whether the layer varies by state profile");
  }
}

/* -------------------------------------------------------------- scenarios */

const registry = load("content/registry/invented-names.json");
const knownNames = new Set((registry?.names ?? []).map((n) => n.name));

// Text that would mean we depicted the act. Deliberately blunt; a false
// positive costs a reviewer thirty seconds, a false negative ships harm.
const DEPICTION_DENY = [
  /\bhe (grabbed|pinned|forced|held her down|pushed her)\b/i,
  /\bshe (woke|came to) (up )?(to find|and found)\b/i,
  /\bflashback\b/i,
  /\bthe night (it|he) \b/i,
];

const scen = load("content/scenarios/chapter-scenarios.json");

for (const s of scen?.scenarios ?? []) {
  const at = `scenarios#${s.id}`;

  // Composite rule: at least three unrelated matters.
  const n = s.provenance?.pattern_sources?.length ?? 0;
  if (n < 3) {
    err(at, `only ${n} pattern source(s) — the composite rule requires at least 3 unrelated matters`);
  }
  if (s.provenance?.distinct_matters !== undefined && s.provenance.distinct_matters < 3) {
    err(at, `distinct_matters is ${s.provenance.distinct_matters} — must be at least 3`);
  }

  // Sign-off.
  const r = s.review ?? {};
  if (!r.reviewed_by) blocked.push(`${at}: no named reviewer — cannot ship (docs/FICTIONALIZATION.md §6)`);
  if (r.distance_check && !/^(pass|REVISED-THEN-PASS)$/.test(r.distance_check)) {
    err(at, `distance_check is '${r.distance_check}' — must pass before ship`);
  }
  if (r.depiction_check && !/^pass/.test(r.depiction_check)) {
    err(at, `depiction_check is '${r.depiction_check}'`);
  }

  // SAFETY.md §2 — a gap level must carry its action beat.
  if (r.action_beat_present !== true) {
    err(at, "no action beat — a level that teaches a gap must surface the corresponding action (SAFETY.md §2)");
  }

  // Names.
  const pname = s.predator?.name;
  if (pname && !knownNames.has(pname)) {
    err(at, `character name '${pname}' is not in the invented-names registry`);
  }

  // Armor references.
  for (const a of s.armor_stack ?? []) {
    if (!layerIds.has(a)) err(at, `references unknown armor layer '${a}'`);
  }
  for (const t of s.teaches ?? []) {
    if (!cardIds.has(t)) err(at, `teaches unknown codex card '${t}'`);
  }

  // Prose checks.
  const prose = [s.opening ?? "", ...(s.beats ?? [])].join("\n");
  for (const re of DEPICTION_DENY) {
    if (re.test(prose)) err(at, `prose matches depiction denylist ${re} — the game starts after (SAFETY.md §1)`);
  }
  const years = prose.match(/\b(19|20)\d{2}\b/g);
  if (years) {
    err(at, `prose contains calendar year(s) ${[...new Set(years)].join(", ")} — scenario dates must be relative (FICTIONALIZATION.md §5)`);
  }
}

/* ----------------------------------------------------------------- report */

const line = (s) => console.log(s);

line("");
line(`content validation — as of ${TODAY.toISOString().slice(0, 10)}`);
line("");

if (blocked.length) {
  line(`SHIP BLOCKED (${blocked.length})`);
  for (const b of blocked) line(`  ✖ ${b}`);
  line("");
}
if (errors.length) {
  line(`ERRORS (${errors.length})`);
  for (const e of errors) line(`  ✖ ${e}`);
  line("");
}
if (warnings.length) {
  line(`WARNINGS (${warnings.length})`);
  for (const w of warnings) line(`  ▲ ${w}`);
  line("");
}

const cardCount = cardIds.size;
const failed = errors.length > 0 || blocked.length > 0 || (STRICT && warnings.length > 0);

line(
  `${cardCount} codex cards, ${layerIds.size} armor layers, ${scen?.scenarios?.length ?? 0} scenarios — ` +
    (failed ? "FAIL" : "ok")
);
line("");

process.exit(failed ? 1 : 0);
