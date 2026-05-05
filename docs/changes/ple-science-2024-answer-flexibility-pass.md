# PLE Science 2024 Answer Flexibility Pass

Date: 2026-04-19

## Scope

PLE Science 2024 only.

- Exam ID: `v5sxOCgZRzbge9RWM3K0`
- Package: `docs/data/ple-science-2024-uganda-v2-import.json`
- No PLE English 2024 work
- No Kenya exam work
- No renderer refactor
- No re-import

## Summary

The remaining marking problem was that many Science answers still used one canonical normalized string. Correct pupil answers such as `mask`, `cloudy`, `covid`, `TB`, `expensive food`, `absorbs nutrients`, and `social insect` could be rejected because they did not exactly match the model answer phrase.

I updated the package and live Firestore marking data so that:

- strict single-term answers now accept harmless spelling/plural aliases;
- concept answers now accept common equivalent phrases;
- split "any two" fields accept valid answers in either field;
- broad open-ended questions remain manual-review only;
- model-answer versions now carry matching acceptable alternatives.

No schema change was made. The live exam still has 55 items, 97 interactions, 97 marking rules, 97 model answer versions, and 100 marks.

## Scoring Strategy Counts

| strategy | count | notes |
|---|---:|---|
| exact_match_safe | 0 | No interaction remains strict exact-only. |
| exact_match_with_aliases | 16 | Single-term/fixed-label answers with minor aliases. |
| keyword_or_phrase_match | 39 | Conceptual short answers implemented through normalized accepted phrase sets. |
| multi-answer-flex | 16 | Split "any two" fields accept valid entries in either field. |
| manual_review_only | 26 | Open-ended answers remain teacher-review routed. |

Implementation note: the current V2 engine supports flexible text marking through `alternativeAnswers`; this pass used that existing rule mode rather than adding a new keyword engine path.

## Full Audit Table

| question | subpart | current prompt | pre-pass issue | final strategy | exact fix |
|---|---|---|---|---|---|
| Q1 | - | Name any one type of latrine. | Canonical answer only. | keyword_or_phrase_match | Added VIP, flush, compost, and ventilated-improved pit variants. |
| Q2 | - | Dangerous shelter under tall trees during rain. | One phrasing for lightning only. | keyword_or_phrase_match | Added lightning, falling branches, and tree-collapse variants. |
| Q3 | - | Function of diaphragm during breathing. | Broad physiology wording. | manual_review_only | Kept manual review. |
| Q4 | - | Agent of soil erosion. | Only running water accepted. | keyword_or_phrase_match | Added water, rainwater, wind, animals, people/human activity. |
| Q5 | - | Name animal in diagram. | Minor wording variation. | exact_match_with_aliases | Added `a snail`. |
| Q6 | - | Invertebrate group. | Plural/spelling variation. | keyword_or_phrase_match | Added mollusc/mollusk variants. |
| Q7 | - | Keep vegetables fresh. | Several valid practical answers. | keyword_or_phrase_match | Added cool place, fridge, shade, sprinkling water. |
| Q8 | - | Bacteria useful in soil formation. | Open explanation. | manual_review_only | Kept manual review. |
| Q9 | - | Bilharzia and anaemia. | Only one phrase accepted. | keyword_or_phrase_match | Added loss of blood / worms suck blood variants. |
| Q10 | - | Improve rabbit hutch air circulation. | Only wire mesh phrase accepted. | keyword_or_phrase_match | Added ventilation holes, air holes, ventilators, openings, windows. |
| Q11 | - | Goose pimples during cold weather. | One heat-loss phrase. | keyword_or_phrase_match | Added keep warm, trap air, conserve/prevent heat loss. |
| Q12 | - | Utilise empty plastic bottles. | Too many valid uses. | manual_review_only | Routed to manual review. |
| Q13 | - | Function of a bandage. | Too many valid functions. | manual_review_only | Kept manual review. |
| Q14 | - | Importance of fermentation. | Only bread accepted. | keyword_or_phrase_match | Added bread, alcohol/beer, yoghurt/yogurt. |
| Q15 | - | Why prefer pulley to inclined plane. | Concept phrasing is broad. | manual_review_only | Routed to manual review. |
| Q16 | - | Name organ in diagram. | Minor plural/article variation. | exact_match_with_aliases | Added kidney/kidneys variants. |
| Q17 | - | Function of part N. | Ureter answer phrasing varied. | keyword_or_phrase_match | Added carries/transports urine to bladder variants. |
| Q18 | - | Effect of pests/diseases on tuber crops. | Only reduce yield accepted. | keyword_or_phrase_match | Added damage crops/tubers and poor harvest variants. |
| Q19 | - | Taking medicine without health-worker instruction. | Open family impact. | manual_review_only | Kept manual review. |
| Q20 | - | Harvest honey during day time. | Open reason. | manual_review_only | Kept manual review. |
| Q21 | - | Bone moves from normal joint position. | Minor phrase variation. | exact_match_with_aliases | Added dislocated bone. |
| Q22 | - | Wool weighs less than stone. | Density phrasing varied. | keyword_or_phrase_match | Added lower density / stone denser variants. |
| Q23 | - | Paddocking and pest life cycle. | Explanation phrasing is broad. | manual_review_only | Routed to manual review. |
| Q24 | - | Importance of rusting to environment. | Open-ended. | manual_review_only | Kept manual review. |
| Q25 | - | PHC element for body cleanliness. | Alias variation. | keyword_or_phrase_match | Added body hygiene, personal/body cleanliness. |
| Q26 | - | School Health Club activity. | Open-ended. | manual_review_only | Kept manual review. |
| Q27 | - | Property of air in balloons. | Concept phrasing varied. | keyword_or_phrase_match | Added takes up space, fills space, has volume. |
| Q28 | - | Trees improving soil quality. | Open-ended. | manual_review_only | Kept manual review. |
| Q29 | - | Wash hands with soap. | Germ/disease wording varied. | keyword_or_phrase_match | Added remove/kill/wash away germs, prevent disease/infection. |
| Q30 | - | Antennae and skin similarity. | Open comparison. | manual_review_only | Kept manual review. |
| Q31 | - | Vacuum prevents heat loss. | Concept phrasing varied. | keyword_or_phrase_match | Added no particles/air/medium variants. |
| Q32 | - | Crop planting method in diagram. | Alias variation. | keyword_or_phrase_match | Added line planting, planting in rows. |
| Q33 | - | Advantage of planting method. | Open-ended. | manual_review_only | Kept manual review. |
| Q34 | - | Emotional change in adolescents. | Multiple valid examples. | keyword_or_phrase_match | Added mood changes, shyness, attraction, anger/stress. |
| Q35 | - | Immunisable viral disease spread by poor sanitation. | Fixed term. | exact_match_with_aliases | Added poliomyelitis. |
| Q36 | - | Light bends through glass block. | Refraction wording varied. | keyword_or_phrase_match | Added refraction and light-speed variants. |
| Q37 | - | Conserving water. | Open-ended. | manual_review_only | Kept manual review. |
| Q38 | - | Brush tongue when cleaning teeth. | Germ/dirt/odour wording varied. | keyword_or_phrase_match | Added germs, bacteria, dirt, bad smell/odour. |
| Q39 | - | Prevent electric shocks at home. | Open safety answer. | manual_review_only | Kept manual review. |
| Q40 | - | Keep seeds viable. | Storage phrasing varied. | keyword_or_phrase_match | Added dry, cool dry, airtight, away from moisture. |
| Q41 | (a) | Class of food for body repair. | Singular/plural and class-name variation. | exact_match_with_aliases | Added protein and body-building foods. |
| Q41 | (b)(i) | Challenge 1 for market buyers. | Split answer was too rigid/order-sensitive. | multi-answer-flex | Accepts high prices, expensive food, high cost, stale/spoilt/bad/rotten food. |
| Q41 | (b)(ii) | Challenge 2 for market buyers. | Split answer was too rigid/order-sensitive. | multi-answer-flex | Same valid challenge set as Q41(b)(i). |
| Q41 | (c) | Control food contamination in market. | Several valid control methods. | keyword_or_phrase_match | Added cover food, wash hands, keep food clean, store properly, clean market, keep away flies. |
| Q42 | (a) | Germ that causes cholera. | Scientific alias variation. | exact_match_with_aliases | Added bacterium, Vibrio cholerae, cholera bacteria. |
| Q42 | (b) | Cholera in heavily populated communities. | Explanatory answer. | manual_review_only | Kept manual review. |
| Q42 | (c) | Control cholera spread. | Broad valid controls. | manual_review_only | Kept manual review. |
| Q43 | (a) | Tool for transplanting seedlings. | Source variants used hand fork/trowel. | keyword_or_phrase_match | Accepts hand fork, hand trowel, trowel. |
| Q43 | (b) | Evening transplanting reason. | Wording variation. | keyword_or_phrase_match | Added less water loss, reduce wilting, cooler evening. |
| Q43 | (c)(i) | Mulching advantage 1. | Split answer order-sensitive. | multi-answer-flex | Accepts moisture conservation, weed control, humus, erosion prevention. |
| Q43 | (c)(ii) | Mulching advantage 2. | Split answer order-sensitive. | multi-answer-flex | Same valid advantage set as Q43(c)(i). |
| Q44 | (a)(i) | Part labelled X. | Minor article variation. | exact_match_with_aliases | Accepts liver/the liver. |
| Q44 | (a)(ii) | Part labelled W. | Diagram/source conflict and alias risk. | keyword_or_phrase_match | Keeps current source answer `large intestine`; adds large intestines, colon, caecum/cecum, appendix due scanned-label ambiguity. |
| Q44 | (a)(iii) | Part labelled Y. | Alias variation. | keyword_or_phrase_match | Accepts small intestine, small intestines, ileum. |
| Q44 | (b)(i) | Function of part Y. | Correct concept expressed many ways. | keyword_or_phrase_match | Accepts absorbs digested food/nutrients and completes digestion. |
| Q44 | (b)(ii) | Function of part Z. | Correct concept expressed many ways. | keyword_or_phrase_match | Accepts absorbs water, forms faeces/feces, temporary storage wording. |
| Q45 | (a) | Purpose of soaking clothes. | Open practical wording. | manual_review_only | Kept manual review. |
| Q45 | (b) | Step for separating clothes. | Minor wording variation. | exact_match_with_aliases | Added sort clothes/sorting clothes. |
| Q45 | (c) | Step removing dirty soapy water. | Minor wording variation. | exact_match_with_aliases | Added rinse/rinsing clothes. |
| Q45 | (d) | Purpose of ironing clothes. | Multiple valid purposes. | manual_review_only | Kept manual review. |
| Q46 | (a) | Meaning of electromagnet. | Definition phrasing varied. | keyword_or_phrase_match | Added magnet made/produced by electricity/current variants. |
| Q46 | (b) | Make a magnet with nail/wire/cell/pins. | Multi-step process. | manual_review_only | Kept manual review. |
| Q47 | (a)(i) | Biogas material 1. | Split answer order-sensitive. | multi-answer-flex | Accepts animal dung/waste, cow/pig/goat dung, chicken droppings, faeces, plant waste. |
| Q47 | (a)(ii) | Biogas material 2. | Split answer order-sensitive. | multi-answer-flex | Same valid material set as Q47(a)(i). |
| Q47 | (b) | Why digester is tightly sealed. | Phrase variation. | keyword_or_phrase_match | Added gas escaping, keep gas inside, prevent air entering, anaerobic conditions. |
| Q47 | (c) | Advantage of using biogas. | Broad valid answers. | manual_review_only | Kept manual review. |
| Q48 | (a) | Protective item K. | `mask` was rejected. | keyword_or_phrase_match | Added mask, a mask, face covering. |
| Q48 | (b)(i) | Disease 1 prevented by item K. | Split answer order-sensitive and disease formatting varied. | multi-answer-flex | Accepts covid/COVID-19/coronavirus, TB/tuberculosis, flu/influenza, cough, measles. |
| Q48 | (b)(ii) | Disease 2 prevented by item K. | Split answer order-sensitive and disease formatting varied. | multi-answer-flex | Same valid disease set as Q48(b)(i). |
| Q48 | (c) | Good practice using item K. | Many equivalent safety practices. | keyword_or_phrase_match | Added wear properly, cover nose/mouth, do not share, wash/clean reusable mask, handle straps. |
| Q49 | (a)(i) | String instrument example. | Multiple valid examples. | keyword_or_phrase_match | Added violin, harp, adungu, bow harp. |
| Q49 | (a)(ii) | Percussion instrument example. | Multiple valid examples. | keyword_or_phrase_match | Added xylophone, tambourine, shaker, rattle. |
| Q49 | (b)(i) | Sound storage method 1. | Split answer order-sensitive. | multi-answer-flex | Accepts tape/cassette, CD, memory card, flash disk, computer, phone. |
| Q49 | (b)(ii) | Sound storage method 2. | Split answer order-sensitive. | multi-answer-flex | Same valid storage-method set as Q49(b)(i). |
| Q50 | (a) | Insects that live/work together. | Singular form rejected. | exact_match_with_aliases | Added social insect/social animals. |
| Q50 | (b) | Usefulness of insects. | Broad valid answers. | manual_review_only | Kept manual review. |
| Q50 | (c)(i) | Human activity dangerous to insects 1. | Split answer order-sensitive. | multi-answer-flex | Accepts pesticides/insecticides, bush burning, burning grass, deforestation, habitat destruction. |
| Q50 | (c)(ii) | Human activity dangerous to insects 2. | Split answer order-sensitive. | multi-answer-flex | Same valid activity set as Q50(c)(i). |
| Q51 | (a) | Weather marked C. | `cloudy` was rejected. | exact_match_with_aliases | Added cloudy/cloudy day. |
| Q51 | (b) | Sunny weather helps rainy weather. | Evaporation phrasing varied. | keyword_or_phrase_match | Added evaporation, heat causes evaporation, sun heats/evaporates water. |
| Q51 | (c) | Protect from windy weather. | Broad valid answers. | manual_review_only | Kept manual review. |
| Q51 | (d) | Too much sunny weather danger. | Broad valid answers. | manual_review_only | Kept manual review. |
| Q52 | (a) | Meaning of vaccine. | Definition phrasing varied. | keyword_or_phrase_match | Added substance/medicine/preparation that protects or gives immunity. |
| Q52 | (b) | Polio vaccine administration. | Oral wording varied. | exact_match_with_aliases | Added orally, oral, through mouth, drops in mouth. |
| Q52 | (c) | Why vaccines stored cool. | Heat/effectiveness wording varied. | keyword_or_phrase_match | Added heat destroys/spoils/damages, keeps effective. |
| Q52 | (d) | Support immunization programmes. | Broad valid answers. | manual_review_only | Kept manual review. |
| Q53 | (a)(i) | Physical change forming ice. | Scientific alias. | exact_match_with_aliases | Added solidification. |
| Q53 | (a)(ii) | Physical change forming rainfall. | Verb form alias. | exact_match_with_aliases | Added condensing. |
| Q53 | (b)(i) | Soil erosion effect 1. | Split answer order-sensitive. | multi-answer-flex | Accepts fertile topsoil loss, infertile soil, silting, water pollution, landslides. |
| Q53 | (b)(ii) | Soil erosion effect 2. | Split answer order-sensitive. | multi-answer-flex | Same valid effect set as Q53(b)(i). |
| Q54 | (a)(i) | Arm muscle 1. | Order should not matter. | multi-answer-flex | Accepts biceps/bicep/triceps/tricep. |
| Q54 | (a)(ii) | Arm muscle 2. | Order should not matter. | multi-answer-flex | Same valid muscle set as Q54(a)(i). |
| Q54 | (b) | Function of muscles. | Phrase variation. | keyword_or_phrase_match | Added movement, support body, maintain posture. |
| Q54 | (c) | Importance of correct posture. | Phrase variation. | keyword_or_phrase_match | Added prevent deformities/back pain, upright body, body shape. |
| Q55 | (a) | Draw mirror image. | Drawing/manual task. | manual_review_only | Kept manual review. |
| Q55 | (b)(i) | Name ray A. | Minor alias. | exact_match_with_aliases | Added incoming ray/incidence ray. |
| Q55 | (b)(ii) | Relationship between angles m and y. | Phrase variation. | exact_match_with_aliases | Added equal/same size/angle of incidence equals angle of reflection. |

## Known Failures Fixed

Live validation confirmed these alternative answers now pass in the exact interaction container:

| interaction | tested answer | result |
|---|---|---|
| Q41(b)(i) | `expensive food` | correct |
| Q41(b)(ii) | `spoilt food` | correct |
| Q44(a)(ii) | `colon` | correct |
| Q44(b)(i) | `absorbs nutrients` | correct |
| Q44(b)(ii) | `forms faeces` | correct |
| Q48(a) | `mask` | correct |
| Q48(b)(i) | `covid` | correct |
| Q48(b)(ii) | `TB` | correct |
| Q48(c) | `wear it properly` | correct |
| Q50(a) | `social insect` | correct |
| Q50(c)(i) | `using insecticides` | correct |
| Q50(c)(ii) | `bush burning` | correct |
| Q51(a) | `cloudy` | correct |
| Q51(b) | `evaporation` | correct |

## Diagram-Label Review

Q44 was reviewed against the live diagram asset:

- X is clearly the liver.
- Y/Z functions remain aligned with the reconciled source model: Y as small intestine function and Z as large intestine function.
- W is visually ambiguous in the scanned diagram and previous source files conflict (`Stomach` in one final import artifact, `Large intestine` in the current package/reconciliation). I did not change the label structure, but I added aliases for the current reconciled answer, including `colon`, `large intestines`, `caecum/cecum`, and `appendix`, so a plausible pupil reading of the scanned label is not unfairly rejected.

This should be revisited only if an official Uganda answer key becomes available.

## Package And Firestore Changes

Package changed:

- `docs/data/ple-science-2024-uganda-v2-import.json`

Firestore changed with a targeted patch, no re-import:

- `exams/v5sxOCgZRzbge9RWM3K0`
  - `updatedAt` refreshed
- `interactions`
  - 97 Science interaction docs updated for `manualReviewDefault` alignment
- `marking_rules`
  - 97 Science marking rule docs updated
- `model_answer_versions`
  - 97 Science model answer version docs updated with aligned acceptable alternatives

## Validation

Package validation:

```json
{
  "packagePath": "docs/data/ple-science-2024-uganda-v2-import.json",
  "examTitle": "PLE Science 2024",
  "sections": 2,
  "instructionGroups": 2,
  "items": 55,
  "interactions": 97,
  "markingRules": 97,
  "modelAnswerVersions": 97,
  "totalMarks": 100,
  "manualReviewInteractions": 26,
  "mediaRefs": 8,
  "warnings": [],
  "errors": []
}
```

Type check:

- `npx tsc --noEmit`: passed

Live browser validation:

- authenticated student flow opened the live PLE Science 2024 exam;
- runtime header showed `11/97 parts answered` during validation;
- no runtime error appeared;
- exact interaction-level feedback checks passed for the known failures listed above.

Screenshots:

- `docs/changes/ple-science-2024-flex-q41b.png`
- `docs/changes/ple-science-2024-flex-q41b-ii.png`
- `docs/changes/ple-science-2024-flex-q44a.png`
- `docs/changes/ple-science-2024-flex-q44b-y.png`
- `docs/changes/ple-science-2024-flex-q44b-z.png`
- `docs/changes/ple-science-2024-flex-q48a.png`
- `docs/changes/ple-science-2024-flex-q48b.png`
- `docs/changes/ple-science-2024-flex-q48b-ii.png`
- `docs/changes/ple-science-2024-flex-q48c.png`
- `docs/changes/ple-science-2024-flex-q50a.png`
- `docs/changes/ple-science-2024-flex-q50c.png`
- `docs/changes/ple-science-2024-flex-q50c-ii.png`
- `docs/changes/ple-science-2024-flex-q51a.png`
- `docs/changes/ple-science-2024-flex-q51b.png`

## Final Result

PLE Science 2024 marking is now CLEAN and READY to move to PLE English 2024
