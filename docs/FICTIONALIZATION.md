# Fictionalization rules

Every scenario in this game is invented. No real survivor's story, no real
defendant, no real institution, no scraped post, no pending complaint.

Scenarios are **composites**: situations assembled from patterns that appear
repeatedly across published, resolved sources. The patterns are real. The people
are not.

This document is the gate. A scenario does not ship until it passes every check
below and a named reviewer signs the record.

---

## 1. What we may source from

Allowed:

- Published appellate opinions and other final court decisions
- DOJ findings letters and consent decrees
- EEOC consent decrees and litigation releases
- State attorney general reports, inspector general reports, grand jury reports
- Legislative bill analyses and committee testimony
- Peer-reviewed research on case patterns and attrition
- Reports by established nonprofits (RAINN, NSVRC, End the Backlog, AEquitas,
  National Women's Law Center)
- Investigative journalism from established outlets, used for *pattern*, never
  for a person

Not allowed, ever:

- Pending complaints and live dockets
- Social media posts, including public ones
- Any first-person survivor account, however obtained
- Anything under seal, leaked, or shared with us in confidence
- Anything a person sent us about their own experience

The rule is not "is it public." The rule is **"is it resolved, official, and
about a pattern rather than a person."**

---

## 2. The five dimensions

A scenario is assembled by choosing one value per dimension. Each value must be
attested by at least one allowed source.

| Dimension | What it sets |
|---|---|
| `access_vector` | How proximity and authority were obtained |
| `institutional_posture` | What the surrounding organization did or failed to do |
| `silencing_mechanism` | What kept it quiet |
| `legal_obstacle` | What blocked a remedy |
| `resolution_pattern` | How matters of this shape have actually ended |

Do not invent a dimension value because it would be dramatic. If no source
attests it, it does not go in.

---

## 3. The composite rule

**Minimum three unrelated matters.** Every scenario must draw its dimension
values from at least three sources that are not the same underlying matter,
the same institution, or the same reporting thread.

Record them in `provenance.pattern_sources`. Three entries minimum. If you can
only find one source for the combination you want, you are describing a specific
real case. Change the combination.

---

## 4. The distance check

Run this before sign-off. If any answer is yes, the scenario fails and must be
altered.

1. Could a reasonable reader who follows this area name a real matter this
   resembles?
2. Does the combination of institution type + role + region + time period
   narrow to a small number of real matters?
3. Is any detail present that serves no narrative purpose and could only have
   come from one source? (A specific dollar figure, an unusual job title, a
   distinctive location, a number of victims, a distinctive method.)
4. Would a person involved in a real matter recognise themselves?
5. Does the scenario name, or gesture unmistakably at, a real organisation?

**How to fix a failure:** drop one axis. Change the institution type, or the
region, or the era, or the role — not the pattern. The pattern is what we are
teaching. The specificity is what creates the harm.

---

## 5. Hard constraints on content

- **Names.** All character names invented and recorded in
  `content/registry/invented-names.json`. Run the name check before ship. No
  name may match a real figure associated with this subject matter.
- **Institutions.** Archetypes only: "a regional diocese", "a mid-sized
  logistics firm", "a county juvenile facility", "a private surgical practice".
  Never a real org, never a thin rename of one.
- **Places.** Region-level at most ("a mid-Atlantic state"). No cities, no
  campuses, no named facilities. Jurisdiction mechanics use abstract
  jurisdiction profiles, not real state names, unless the profile is being used
  in the codex as a factual reference.
- **Dates.** Relative only ("eleven years earlier"). No calendar years in
  scenario text.
- **The assault is never depicted.** Scenarios begin after. What we dramatise
  is the aftermath and the obstruction — never the act. This is a hard content
  rule, not a stylistic preference. See `SAFETY.md`.
- **Villains are fictional. The codex may cite real published opinions.** The
  two layers never blend. A real case may appear as a citation on a reference
  card. A real person may never appear as a character, a portrait, a name, or a
  recognisable silhouette.

---

## 6. Sign-off record

Every scenario file carries a `review` block:

```json
"review": {
  "distance_check": "pass",
  "distance_check_notes": "Institution type changed from X to Y to widen.",
  "reviewed_by": "",
  "reviewed_on": "",
  "legal_review": "pending"
}
```

`reviewed_by` must be a person, not a tool. `legal_review` should be `done`
before public launch for any scenario that carries a codex card at tier 3.

A scenario with an empty `reviewed_by` fails the build.

---

## 7. What to do when someone sends us their story

They will. Plan for it now.

- Do not use it. Not as a scenario, not as inspiration for one, not as a
  "verification" of a pattern we already have.
- Do not ask follow-up questions about it.
- Reply with care, point to real support resources, and say plainly that the
  game does not use real accounts.
- Delete it from any storage we control, on a short clock.
- The submission form, if we ever build one, must say all of this *before* the
  text box, not after.
