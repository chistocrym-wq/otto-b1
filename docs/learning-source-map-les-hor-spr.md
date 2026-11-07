# OTTO learning source map — LESEN / HÖREN / SPRECHEN

Status: approved source policy applied in preview. LESEN and SPRECHEN learning are implemented from existing OTTO materials; HÖREN uses only tasks with confirmed content-based Teil mapping.
Branch: preview/task-linked-learning
Production/main: do not change.

## Mandatory rule

Every detailed teaching example must reuse existing OTTO material. LESEN/HÖREN use 1 detailed + 4 practice tasks per Teil; SPRECHEN keeps the previously approved 1 detailed + 5 practice model.
Learning progress must stay separate from exam progress.
Existing images/audio/cards must be reused rather than regenerated.

## Inventory summary

| Module | Teil | Existing source | Count | Image | Audio | Answer type | Can select 1 + 4 now? |
|---|---:|---|---:|---|---|---|---|
| LESEN | 1 | active archive loaded by ReadingModule | 50 | no external image; structured letter/e-mail/SMS visual | no | Richtig/Falsch, 2–4 statements | yes — 1 detailed + 4 practice |
| LESEN | 2 | active archive loaded by ReadingModule | 50 | no external image; structured site/table/notice visual | no | A/B | yes — 1 detailed + 4 practice |
| LESEN | 3 | active archive loaded by ReadingModule | 50 | no external image; structured sign/notice visual | no | Richtig/Falsch | implemented — 1 detailed + 4 practice from active archive |
| HÖREN | mapped pool | src/data/listening.ts + src/data/hoerenTeilMap.ts | 80 | /images/001.png … /images/080.png | /audio/001.mp3 … /audio/080.mp3 | 40 multiple-choice + 40 true-false | YES for confirmed tasks only; ambiguous tasks remain unresolved |
| SPRECHEN | 1 | src/data/speaking.ts / speakingTeil1 | 1 canonical task | no | no stored task audio | spoken self-introduction + follow-ups | YES: approved model = one existing format + 5 practices built only from its existing elements |
| SPRECHEN | 2 | src/data/speaking.ts / speakingTeil2Cards | 50 cards | text card, no image | no stored task audio | spoken question + spoken answer | yes |
| SPRECHEN | 3 | src/data/speakingTeil3Archive.ts | 50 cards | originals exist for cards 1–48; cards 49–50 have no original image | no stored task audio | spoken request + reaction | yes, select only cards with original images |

## LESEN — candidate source tasks

### Teil 1
Use active archive tasks; ReadingModule credits them separately with its exam progress, so the learning implementation must read task data without calling exam record/onComplete.

| Learning role | Source ID | Existing content | Image | Audio | Answer |
|---|---|---|---|---|---|
| detailed | archive Teil 1 · id 1 / exam key 1-0 | Vereinsfest: letter to Frau Berger | no external image | no | Richtig/Falsch statements |
| reinforcement 1 | archive Teil 1 · id 2 / exam key 1-1 | Grillfest invitation / arrival time | no external image | no | Richtig/Falsch |
| reinforcement 2 | archive Teil 1 · id 3 / exam key 1-2 | Postcard from the sea / hotel / trip | no external image | no | Richtig/Falsch |
| reinforcement 3 | archive Teil 1 · id 4 / exam key 1-3 | Note to Ben / bakery / coffee | no external image | no | Richtig/Falsch |
| reinforcement 4 | archive Teil 1 · id 5 / exam key 1-4 | SMS / traffic delay / cinema tickets | no external image | no | Richtig/Falsch |

### Teil 2
Use active archive tasks and preserve the exact A/B options and their site/table/notice rendering.

| Learning role | Source ID | Existing content | Image | Audio | Answer |
|---|---|---|---|---|---|
| detailed | archive Teil 2 · exam key 2-0 | evening German course: Sprachschule Mitte vs Deutsch Online24 | structured site visual | no | A/B |
| reinforcement 1 | archive Teil 2 · exam key 2-1 | 2-room flat in Munich vs WG | structured site visual | no | A/B |
| reinforcement 2 | archive Teil 2 · exam key 2-2 | used bicycle for son | structured site visual | no | A/B |
| reinforcement 3 | archive Teil 2 · exam key 2-3 | craftsman for new kitchen | structured site visual | no | A/B |
| reinforcement 4 | archive Teil 2 · exam key 2-4 | babysitter for this evening | structured notice visual | no | A/B |

### Teil 3
ReadingModule confirms 50 active archive tasks. The archive stores the task text in compressed chunks and exposes it at runtime.
Do not invent or substitute Teil 3 examples.
Preview learning now reads the first five active archive entries directly at runtime: 1 detailed example + 4 practice tasks. No replacement content is invented.

## HÖREN — confirmed mapping used for learning

Active source: src/data/listening.ts.

Verified:
- 80 tasks: horen-001 … horen-080
- 80 matching audio files: /audio/001.mp3 … /audio/080.mp3
- 80 matching images: /images/001.png … /images/080.png
- task types: 40 multiple-choice, 40 true-false
- ListeningModule uses the same numeric task number for both audio and image.

Source limitation remains: HorenTask itself has no Teil field and the real trainer still presents a continuous pool. Therefore the preview mapping uses only content/format combinations that are strong enough to confirm a Teil and marks the rest unresolved.

Full map: docs/hoeren-teil-map.md. Runtime map: src/data/hoerenTeilMap.ts.

Confirmed learning selections:
- Teil 1: horen-002 detailed; horen-004, -012, -014, -016 practice.
- Teil 2: horen-008 detailed; horen-048, -054, -058, -069 practice.
- Teil 3: horen-001 detailed; horen-005, -011, -015, -020 practice.

Sample source tasks:
| ID | Title | Image | Audio | Type |
|---|---|---|---|---|
| horen-001 | Telefonnachricht | /images/001.png | /audio/001.mp3 | multiple-choice |
| horen-002 | Im Geschäft | /images/002.png | /audio/002.mp3 | multiple-choice |
| horen-003 | Am Bahnhof | /images/003.png | /audio/003.mp3 | multiple-choice |
| horen-004 | In der Schule | /images/004.png | /audio/004.mp3 | multiple-choice |
| horen-005 | Telefonnachricht | /images/005.png | /audio/005.mp3 | multiple-choice |
| horen-006 | Kurzes Gespräch | /images/006.png | /audio/006.mp3 | true-false |

Ambiguous tasks stay unresolved and are not used in learning. Audio/image/question/options remain tied to the same task number.

## SPRECHEN

### Teil 1 — approved reuse model
Existing canonical source contains one task only:
- ID used for evaluation/progress: sprechen-teil1
- format: Sich vorstellen
- keywords: Name, Alter, Land, Wohnort, Sprachen, Beruf, Hobby
- follow-ups: spell name, telephone number, house number
- answer: spoken response through VoiceRecorder

The source has one canonical task. The approved learning model keeps that single source and builds five reinforcement interactions only from its existing keywords and follow-up questions. They are labelled «Практика Teil 1 · N из 5», not presented as five new source tasks.

### Teil 2 — safe 1 + 5 candidate set
Existing cards are text cards; preserve theme, keyword, sampleQuestion and sampleAnswer.

| Learning role | ID | Theme / keyword | Image | Audio | Answer |
|---|---|---|---|---|---|
| detailed | sprechen-t2-1-1 | Einkaufen / Preis | no | no stored task audio | spoken question/answer |
| reinforcement 1 | sprechen-t2-1-2 | Einkaufen / Öffnungszeiten | no | no stored task audio | spoken question/answer |
| reinforcement 2 | sprechen-t2-1-3 | Einkaufen / Obst | no | no stored task audio | spoken question/answer |
| reinforcement 3 | sprechen-t2-1-4 | Einkaufen / bezahlen | no | no stored task audio | spoken question/answer |
| reinforcement 4 | sprechen-t2-1-5 | Einkaufen / Supermarkt | no | no stored task audio | spoken question/answer |
| reinforcement 5 | sprechen-t2-1-6 | Einkaufen / Tasche | no | no stored task audio | spoken question/answer |

### Teil 3 — safe 1 + 5 candidate set
Use archive cards, not generated replacement cards. Preserve original image, word, sample request and sample reaction.

| Learning role | ID | Card | Existing image | Answer |
|---|---|---|---|---|
| detailed | sprechen-t3-01 | Butter | CARD (1).png | spoken request + reaction |
| reinforcement 1 | sprechen-t3-02 | Mineralwasser | CARD (2).png | spoken request + reaction |
| reinforcement 2 | sprechen-t3-03 | Münzen | CARD (3).png | spoken request + reaction |
| reinforcement 3 | sprechen-t3-04 | Termin | CARD (4).png | spoken request + reaction |
| reinforcement 4 | sprechen-t3-05 | Kein Essen und Trinken | CARD (5).png | spoken request + reaction |
| reinforcement 5 | sprechen-t3-06 | Hauptbahnhof | CARD (6).png | spoken request + reaction |

Important:
speakingTeil3Archive.ts defines 50 cards, but public/sprechen/teil3-originals currently contains original images only for cards 1–48. Do not use cards 49–50 in image-based learning unless their original images are added.

## Progress separation rule

Learning code must never call the normal exam completion/progress writers merely because an existing task is reused for teaching.
Use dedicated learning progress keys/state.
The same source task may therefore remain available later in the normal trainer.

If exposing the correct answer during learning would materially spoil the intended later exam encounter, choose another existing source task from the same Teil rather than inventing a new one.

## Current stop conditions

Do not use HÖREN tasks marked unresolved in learning.
Do not turn SPRECHEN Teil 1 practices into invented source tasks.
Do not use SPRECHEN Teil 3 cards 49–50 as image tasks while their original images are absent.
