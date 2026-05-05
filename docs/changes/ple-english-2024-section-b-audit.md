# PLE English 2024 Section B Source Audit and Marking Pass

Date: 2026-04-21  
Live exam ID: `weBoSWQcIi7ZjyDPVx3I`  
Scope: PLE English 2024 Section B only, Q51-Q55. Q31-Q50, Kenya, PLE Mathematics 2015, and PLE Science 2024 were not changed.

## Summary

This was a targeted live-exam correction pass, not a rebuild or re-import.

Changes made:

- Firestore content/marking patch for Q51-Q53 bounded comprehension responses.
- Firestore context patch for Q52 poem, restoring the missing opening line: `Examination, a friend`.
- Model-answer/explanation corrections for unsupported Q51 answers, especially Q51(e) and Q51(f).
- Q54 picture-story and Q55 composition left manual-review only.
- Narrow renderer support change in `src/components/exam/v2/V2InteractionRenderer.tsx` so manual-review practice feedback no longer says `Incorrect`; it now says: `This answer may be correct but requires teacher review.`

No marking-engine change was made.

## Source Audit Notes

Sources reviewed:

- Live Firestore exam `weBoSWQcIi7ZjyDPVx3I`
- `docs/Ple-English-2024-Answers+Explanations.md`
- `docs/PLE ENGLISH 2024-UGANDA copy.md`
- `docs/data/ple-english-2024-uganda-v2-import.json`
- live `items`, `interactions`, `marking_rules`, `model_answer_versions`, and `context_blocks`

Important findings:

- Q51(e) and Q51(f) answer-key text referred to an `old man`, but the live passage/source passage does not mention an old man. These were classified `answer_key_wrong`.
- Q51(d) explanation/model answer included `wanted to enjoy the ride`, which is not stated in the passage. It was corrected to the two supported reasons: Jemba was excited and wanted to return to school in time.
- Q52 live poem context was missing the source opening line `Examination, a friend`; this made Q52(a) less visibly supported. The context block was patched.
- Q51(j), Q52(e), Q53(j), all Q54 picture-story answers, and Q55 composition remain manual-review because their answer spaces are subjective, inferential, or expressive.

## Audit Matrix

| Item | Classification | Current answer supported? | Explanation supported? | Corrected / recommended answer | Marking mode |
|---|---|---:|---:|---|---|
| Q51(a) | `direct_fact` | yes | yes | The two friends went to Mushanga Primary School. Concise `Mushanga Primary School` accepted for content. | auto, normalized alternatives |
| Q51(b) | `short_reason` | yes | yes | Lunch was only for pupils whose parents had contributed towards feeding. | auto, normalized alternatives |
| Q51(c) | `direct_fact` | yes | yes | Lolo could buy pancakes, buns and some juice for lunch. | auto, normalized alternatives |
| Q51(d) | `short_reason` | partial | no | Jemba rode fast because he was excited and wanted to get back to school in time. | auto, normalized alternatives |
| Q51(e) | `answer_key_wrong` | no | no | He rang the bell to warn/alert other road users on the busy road. | auto, normalized alternatives |
| Q51(f) | `answer_key_wrong` | no | partial | The accident happened because Jemba lost his balance while riding fast. | auto, normalized alternatives |
| Q51(g) | `direct_fact` | yes | yes | The head teacher thanked the nurses for treating the boys. | auto, normalized alternatives |
| Q51(h) | `direct_fact` | yes | yes | The two friends stayed away from school for three weeks. Concise `three weeks` accepted. | auto, normalized alternatives |
| Q51(i) | `short_reason` | yes | yes | Academic performance improved because all pupils started having lunch at school. | auto, normalized alternatives |
| Q51(j) | `inference_or_ambiguous` | yes | yes | A suitable title should capture the central idea, e.g. `Lunch at School`. | manual review |
| Q52(a) | `direct_fact` | yes after context patch | yes after context patch | The poem is about examination. | auto, normalized alternatives |
| Q52(b) | `short_reason` | yes | yes | The speaker spends sleepless nights preparing for examination. | auto, normalized alternatives |
| Q52(c) | `direct_fact` | yes | yes | The speaker is briefed like a bride and a bridegroom. | auto, normalized alternatives |
| Q52(d) | `short_reason` | yes | yes | The speaker wants to defeat examination to get a good grade. | auto, normalized alternatives |
| Q52(e) | `inference_or_ambiguous` | inferred | inferred | They are strange because they are unfamiliar people/invigilators. | manual review |
| Q52(f) | `direct_fact` | yes | yes | Their duty is giving out and collecting papers. | auto, normalized alternatives |
| Q52(g) | `direct_fact` | yes | yes | The speaker rejoices when results are out and success is on the speaker's side. | auto, normalized alternatives |
| Q52(h) | `direct_fact` | yes | yes | The speaker forgets the sleepless nights. | auto, normalized alternatives |
| Q52(i)(i) | `direct_fact` | yes | yes | `awful`; also `bad`, `dreadful`, `frightening`, etc. | auto, normalized alternatives |
| Q52(i)(ii) | `direct_fact` | yes | yes | `responsibility`; also `job`, `task`, `work`, `role`. | auto, normalized alternatives |
| Q53(a) | `direct_fact` | yes | yes | The record was kept by a P.7 class monitor. | auto, normalized alternatives |
| Q53(b) | `direct_fact` | yes | yes | Week Five, Term Two, 2024. | auto, normalized alternatives |
| Q53(c) | `direct_fact` | yes | yes | Three pupils. | auto, normalized alternatives |
| Q53(d) | `short_reason` | yes | yes | Work was incomplete because part of the classroom was not cleaned. | auto, normalized alternatives |
| Q53(e) | `direct_fact` | yes | yes | Five people/supervisors. | auto, normalized alternatives |
| Q53(f) | `direct_fact` | yes | yes | Wednesday. | auto, normalized alternatives |
| Q53(g) | `direct_fact` | yes | yes | Sidia Sania, Akiasiina Noet and Bwambale Tito. All three names required. | auto, normalized alternatives |
| Q53(h) | `short_reason` | yes | yes | The classroom was not cleaned because there were zonal ball games. | auto, normalized alternatives |
| Q53(i) | `direct_fact` | yes | yes | Acen Lisa was the supervisor on Monday. | auto, normalized alternatives |
| Q53(j) | `inference_or_ambiguous` | yes | yes | A sensible reason for keeping the record, e.g. monitoring work or improving cleanliness. | manual review |
| Q54(a) | `inference_or_ambiguous` | picture-supported | picture-supported | Two girls are walking along the road. | manual review |
| Q54(b) | `inference_or_ambiguous` | picture-supported | picture-supported | Two men are forcing/kidnapping the girls into a car. | manual review |
| Q54(c) | `inference_or_ambiguous` | picture-supported | picture-supported | The girls are escaping/leaving the stopped car. | manual review |
| Q54(d) | `inference_or_ambiguous` | picture-supported | picture-supported | The girls report the matter at a police station. | manual review |
| Q54(e) | `inference_or_ambiguous` | picture-supported | picture-supported | Police stop/check the vehicle at a roadblock. | manual review |
| Q54(f) | `inference_or_ambiguous` | picture-supported | picture-supported | Police arrest the two men; the girls are happy/relieved. | manual review |
| Q54(g) | `inference_or_ambiguous` | picture-supported | picture-supported | Hugging/body language shows the girls are happy or relieved. | manual review |
| Q54(h) | `inference_or_ambiguous` | inferred | inferred | The men may be taken to court, charged, punished, or imprisoned. | manual review |
| Q54(i) | `inference_or_ambiguous` | inferred | inferred | A suitable lesson, e.g. report crimes quickly or avoid strangers. | manual review |
| Q54(j) | `inference_or_ambiguous` | inferred | inferred | A suitable title, e.g. `The Abduction of Two Girls`. | manual review |
| Q55 | `inference_or_ambiguous` | prompt-supported | prompt-supported | Informal letter thanking uncle and describing the game park visit/lessons. | rubric/manual review |

## Answer-Key Corrections

- Q51(d): removed unsupported `wanted to enjoy the ride`.
- Q51(e): replaced old-man answer with road-user/busy-road warning answer.
- Q51(f): removed old-man accident details; corrected to lost balance while riding fast.
- Q52 context: restored missing opening line `Examination, a friend`.
- Q53(g): removed broad alternative `The pupils on Thursday...`; all three names are required. Added both comma-only and final-`and` name-list variants after live validation caught the concise correct answer.

## Marking Strategy

Auto-check with normalized alternatives:

- Q51(a)-Q51(i), except Q51(j)
- Q52(a)-Q52(d), Q52(f)-Q52(i)(ii), except Q52(e)
- Q53(a)-Q53(i), except Q53(j)

Manual review only:

- Q51(j)
- Q52(e)
- Q53(j)
- Q54(a)-Q54(j)
- Q55

Full-sentence enforcement was softened in practice mode by adding concise factual alternatives for direct facts such as `Mushanga Primary School`, `three weeks`, `Examination`, `Three pupils`, `Wednesday`, and `Five`. Content-correct concise answers now pass where the answer space is bounded; full sentences remain teacher/exam guidance, not a hard content-failure rule.

## Firestore Docs Changed

Context blocks:

- `context_blocks/89q2I8M5ZWamvIOuQbyu` - restored Q52 poem opening line.

Interactions, marking rules, and model answer versions:

| Item | Interaction | Marking rule | Model answer |
|---|---|---|---|
| Q51(a) | `T0rvlbKXK67bIHXaby0n` | `q2VI53pPsfsaDwfYNRkr` | `jILvUrjq2neQkzxk1RC6` |
| Q51(b) | `c75NBtHa20mAWeqvAflr` | `YN0U3qaH8vXgiMJ3xvdM` | `F88hVlx3Kau6pDm810yZ` |
| Q51(c) | `3RTlvHF18bM7TfDix8bg` | `eAurRBj3o6XbBI5Sy5SN` | `bOw5dcUSvgLCTXZ9Ex3H` |
| Q51(d) | `QjDC9asjCoXnUpCgj4L0` | `V5wFH2o93ZWt6F4Cg2ir` | `eZITghv1EhxlIqtyZEJb` |
| Q51(e) | `XNH1IiizfFv7D6FP1KB8` | `rWI7aR6SxbDst3qNdHGT` | `Unvxu7sZ2Mt7FpDv2ltT` |
| Q51(f) | `nRf3iuHBXFFYGbDNeCqF` | `G6bodPYaQ083XLvJkDT2` | `77Pt4X2V8vpEgJPoE2gE` |
| Q51(g) | `xcAWA7tW7h3joVEH4mKA` | `Ptx3rrCr7iMfMzGU5C8O` | `wX1fhSqtH66QUp3ZN5R8` |
| Q51(h) | `mSOGEIqR4ULxVGWOD8G0` | `b3KsthkjF6FXEHkYk4Gy` | `3DSJN9i2TgUPATpMk4Sf` |
| Q51(i) | `DuO1xGeVBawLIiND2kNX` | `oGuVRkGgSbJU05Cz3C05` | `gSXES7cbwgrmG5xCr3aU` |
| Q51(j) | `0EaEhdysGsCcerdTUH6H` | `wuoNTqjywY2NS4eyg1q4` | `JOanSrAPrpP8IREhsAUU` |
| Q52(a) | `GV3dYUO6W8XDutH6nWnf` | `7MIhfzQBRmrCZpaKVRyd` | `94LIKgIfPmJy06FqRq2e` |
| Q52(b) | `740vvhZZS1xJl3x3HcnG` | `ZLEK91Aqk5NAjKRwcZVp` | `npSHjJ3cIw55ghznG2lN` |
| Q52(c) | `PY8xUA7BvnAmBVYXHpO3` | `J6N5FWz48X31Ckr8lPGF` | `G0I9kU5P8a0df9Y4gQl5` |
| Q52(d) | `y3M9p6H61k3SUSXoELFB` | `fQ5WvtgfSm7qtgEcoWoY` | `247CJQCEe16EDnPLqjDV` |
| Q52(e) | `jqT5XpvYK6HACa7VTFsT` | `cyZTsfFXhOV1GnLA9X9W` | `Hdfu7LxmX18wbALu9Uto` |
| Q52(f) | `25Cz7pE1uPvr8XTUB3gY` | `AJhxLGcoNBZ6ucFOtH6b` | `sYdPBFvnkVn7sVaAXWvG` |
| Q52(g) | `I2m220js7yaXfCJkpiHk` | `P1w5NnEAKkBiczsnzqEy` | `Ax0y0FBfOjQZ90WDHTAz` |
| Q52(h) | `dSBGHTY7znqQ1wV3DtJS` | `kvyytz5CUvsDP2XVsjj7` | `pvoBluDSrH5nrOBHqMCN` |
| Q52(i)(i) | `MbSSyAm2HgB2KxOphM4F` | `7Vi8xZ2KjwYMdS6dgQTc` | `Mv8qRCob7ipbd6ARs4dj` |
| Q52(i)(ii) | `IZ2JIt5wPyW2ZDNwGFWl` | `u9bOctekfpnoE9grrYmy` | `i3BQF2fZKr408wj17jqC` |
| Q53(a) | `eZHGAsEqDGidfpnKhxmZ` | `5C0d795uo0N838bS8uA0` | `giijy8Se1rzGaonIrpCw` |
| Q53(b) | `0Sr6vD573k0z4l8CccuB` | `djWCK6Bc5hdmiulTFn2z` | `GtGlOZGZRVb8kOe035lJ` |
| Q53(c) | `sfchAnbdJcWkz0ogux3l` | `BpVT7md2FU05DJGMWIY9` | `BU1ICQwCf08bggXLNu5X` |
| Q53(d) | `Fge8SM3W4tyXWV4h9IOH` | `XkMjz9k1jXO72NXvdhsd` | `KrFVHoWyUfQbRoz7b9Ws` |
| Q53(e) | `CJVJ1kLMXZzT7V2h7s4I` | `l7hZfZQycns1uXUh8A4C` | `reiHzwp6t6tIjcOENQPo` |
| Q53(f) | `vHykiMbNGFwY5gykiXv2` | `DUkeh3NsjxVyOXrdxXhd` | `JOJV7r2bAtiDTvIw6nzX` |
| Q53(g) | `CysSdK4wvPGkVMzvPOvJ` | `MrO1SdmlTkSvDBB7UOSv` | `1seRhokJdqZfDlXAbc1X` |
| Q53(h) | `AKGUPpEUfkJCDOrJqjfb` | `zsvYQZ2E3nzKPebLilfs` | `PYjx2QimCVFC6sLKsjnN` |
| Q53(i) | `kMXcC70kYsYVFpQOg6tV` | `1ATIJtTL8kQtF7DtQtWS` | `ovu3WlEp0zdIEMFyjDhN` |
| Q53(j) | `VxfuWThrtwpup3pkW8ok` | `vSZboChw45zId6DrUUv2` | `nOoc7JfvJlLmiQpHjdJ8` |

Q54 and Q55 Firestore documents were audited but not changed.

## Renderer Support

File changed:

- `src/components/exam/v2/V2InteractionRenderer.tsx`

Reason:

- Manual-review interactions returned `isCorrect: false` from the existing marking flow, so practice feedback displayed `Incorrect` even when the correct behavior was teacher review. This was not a marking-engine problem; it was a presentation problem for manual-review results.

After:

- Manual-review feedback displays `Manual review required`.
- It shows: `This answer may be correct but requires teacher review.`
- If model guidance exists, it is shown as teacher guidance instead of as a hard incorrect answer.

## Live Validation

Route used:

- `/exams/weBoSWQcIi7ZjyDPVx3I?mode=practice`

Temporary validation account:

- Created and used one temporary student account.
- Deleted the auth user plus 30 Firestore validation docs afterward: 10 attempts and 17 submissions, plus profile/progress docs.

Validated examples:

| Case | Answer tested | Result |
|---|---|---|
| Q51(a) concise factual | `Mushanga Primary School` | Correct |
| Q51(e) corrected alternative | `To alert people on the busy road` | Correct |
| Q51(g) concise factual | `She thanked the nurses` | Correct |
| Q51(i) alternate reason | `Because all pupils started having lunch at school` | Correct |
| Q51(j) title/manual | `Lunch at School` | Manual review message, not marked incorrect after renderer fix |
| Q52(a) concise factual | `Examination` | Correct |
| Q53(g) all names concise | `Sidia Sania, Akiasiina Noet and Bwambale Tito` | Correct after adding final-`and` variant |
| Q51(e) deliberate wrong old key | `To warn the old man` | Incorrect |
| Q53(g) deliberate missing name | `Sidia Sania and Bwambale Tito` | Incorrect |

Screenshots:

- `docs/changes/ple-english-2024-section-b-q51a-correct.png`
- `docs/changes/ple-english-2024-section-b-q51e-correct.png`
- `docs/changes/ple-english-2024-section-b-q51g-correct.png`
- `docs/changes/ple-english-2024-section-b-q51i-correct.png`
- `docs/changes/ple-english-2024-section-b-q51j-manual.png`
- `docs/changes/ple-english-2024-section-b-q52a-correct.png`
- `docs/changes/ple-english-2024-section-b-q53g-correct.png`

## Commands Used

```bash
rg -n "Q51|Question 51|Examination, a friend|Mushanga|old man|Q52|Q53|Q54|Q55" docs src scripts . --glob '!node_modules' --glob '!dist'
node --input-type=module
npm run dev
node --experimental-websocket --input-type=module
npx tsc --noEmit
npm run build
```

Firestore patching and validation were done with targeted `node --input-type=module` and `node --experimental-websocket --input-type=module` scripts against the live exam ID only.

## Build Validation

- `npx tsc --noEmit`: passed.
- `npm run build`: passed.

Build warnings:

- Existing browserslist/caniuse-lite age warning.
- Existing mixed dynamic/static import warning for `src/integrations/firebase/admin.ts`.
- Existing large bundle warning.

## Unresolved Items

- Q54 picture-story answers remain manual-review by design. Automating these would risk accepting/denying valid visual descriptions unfairly.
- Q55 composition remains rubric/manual-review only.
- Q51(j), Q52(e), and Q53(j) remain manual-review because they are subjective or inferential.
- The Section B auto-check strategy is curated normalized alternatives, not broad semantic grading. Additional valid phrasings may still need targeted aliases if live usage reveals a bounded false negative.
