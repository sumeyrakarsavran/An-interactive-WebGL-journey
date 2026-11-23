# SIRR — Research Reference Document

## How to read this document

Every entry has a **type** and a **status**.

**Types** (same enum as `src/content/sources.ts`):
`quran` · `meal` (translation) · `tafsir` · `hadith` · `athar` (saying of a Companion or early figure, not the Prophet ﷺ) · `scholar` · `original` (project writing)

**Status:**
- `ref-verified`: I am confident of the reference (sura:verse / collection + number) and of the summarised meaning. **Still to be checked by a qualified reviewer before launch.**
- `check-numbering`: the content is authentic, but hadith numbering differs between editions. Confirm against the edition used.
- `do-not-use`: popular but inauthentic or misattributed. Listed so it never slips in.

**Why no full meal text is pasted here.** Diyanet's *Kur'an Yolu* meal and tefsir are copyrighted publications. The website should either (a) obtain permission and insert the exact text from https://kuran.diyanet.gov.tr, or (b) use a meal whose license allows it. The meanings below are **project summaries for designers, not translations**, and must never be displayed as a meal. In `sources.ts` the `meal` field is `null` with `mealSource: "Diyanet — Kur'an Yolu (insert verified text)"`.

---

## A. The thesis verses (never decorative, shown only in source panels)

| Ref | Summary of meaning | Use | Status |
|---|---|---|---|
| **Fussilat 41:53** | Allah will show them His signs in the horizons (*âfâk*) and in themselves (*enfüs*) until it is clear to them that it is the truth. | The core design principle: outer nature mirrors inner self. | ref-verified |
| **Adh-Dhâriyât 51:20–21** | On the earth are signs for those with certainty, and in yourselves too. *Do you not see?* | Ch. 01 source panel | ref-verified |
| **Qâf 50:16** | Allah created man, knows what his self whispers to him, and is closer to him than his jugular vein. | The answer to the central question. Ch. 06. | ref-verified |
| **Ar-Rahmân 55:26–27** | All on earth perish (*fân*); the Face of your Lord remains (*yebkâ*). | Quranic root of *fenâ/bekâ*, Ch. 04 | ref-verified |

## B. Chapter verses

### At-Tîn (95), Ch. 02
- 95:1–3: oaths by the fig, the olive, Mount Sinai (*Tûr-i Sînîn*) and "this secure city" (Mecca, per the majority of tafsir).
- **95:4**: man created in the finest form/stature (*ahsen-i takvîm*).
- **95:5**: then reduced to the lowest of the low (*esfel-i sâfilîn*). **Two classical readings:** (1) decrepit old age, (2) moral degradation / the Fire. Both appear in Taberî and later tafsir, and the Diyanet tefsir discusses both. **The design must not choose one as "the" meaning.** The wilting petal is compatible with both and is presented as *a reflection*, not as tafsir.
- **95:6**: except those who believe and do righteous deeds; for them is an unending reward.
- 95:7–8: what then makes you deny the Judgment? Is Allah not the most just of judges?
- Status: ref-verified.

### Ash-Shams 91:7–10, Ch. 02/03
By the soul and the One who proportioned it, and inspired it with (discernment of) its wickedness (*fücûr*) and its piety (*takvâ*). Whoever purifies it (*zekkâhâ*) has succeeded; whoever buries/corrupts it (*dessâhâ*) has failed. The Quranic basis of *tezkiye-i nefs*. Status: ref-verified.

### The nafs triad, Ch. 03–06
- **Yûsuf 12:53**: the soul surely commands evil (*emmâre*), except whom my Lord has mercy on. (Spoken by the wife of al-'Azîz or by Yûsuf, depending on the tafsir view. Note this in the panel.)
- **Al-Qiyâma 75:2**: oath by the self-reproaching soul (*levvâme*).
- **Al-Fajr 89:27–28**: the soul at rest (*mutmainne*).
- Status: ref-verified. The three-fold scheme is a **classical scholarly framework** built on these verses (Ghazâlî, Ihyâ Book 21; Ibn al-Qayyim, *Ighâthat al-Lahfân*). It is not a single verse, so label it `scholar`.

### Al-'Âdiyât (100), Ch. 04
- 100:1–5: oaths by charging (war-)horses that pant, strike sparks, raid at dawn, raise dust, and penetrate into the midst of a host. (A minority view takes them as camels of pilgrims; mention it in the tafsir note.)
- **100:6**: man is surely ungrateful (*kenûd*) to his Lord.
- **100:7**: and he is a witness to that. **Two views:** the witness is man himself (his deeds testify), or Allah.
- **100:8**: and he is intense in his love of *hayr* (here: wealth).
- 100:9–11: does he not know, when what is in the graves is scattered and what is in the breasts is brought out, that their Lord will be fully informed of them that Day?
- Design consequence: horses appear **only as wind, dust and sound rhythm**, not illustration. The chapter's *ethic* comes from 100:6–8 (ingratitude, love of wealth) and its *horizon* from 100:9–11 (what is hidden in hearts will be brought out). The dust is a direct visual anchor from 100:4. Status: ref-verified.

### At-Tekâsür (102), Ch. 04
Rivalry in accumulating (*tekâsür*) distracts you, until you visit the graves… you will surely see the Hellfire… then you will surely be asked that Day about the blessings (*na'îm*). Status: ref-verified.
- Supporting hadith on *na'îm*: the Prophet ﷺ with Abû Bakr and 'Umar, hungry, given dates, water and shade by an Ansârî: "This is of the *na'îm* you will be asked about." **Muslim, Eşribe 140 (no. 2038).** Status: check-numbering.

### Al-'Asr (103), Ch. 04
By time (*'asr*). Man is surely in loss, except those who believe, do righteous deeds, and counsel one another to truth and to patience. Tafsir meanings of *'asr*: time/epoch in general, the afternoon (and the 'asr prayer), or the era of the Prophet ﷺ. This is why Ch. 04 is lit as **late afternoon**, as an *allusion*, labelled as such. Status: ref-verified.

### Ar-Ra'd 13:28, Ch. 05
Those who believe and whose hearts find rest (*tatmainnu*) in the remembrance of Allah. Indeed, in the remembrance of Allah do hearts find rest. Note that it shares a root with *mutmainne* (89:27), which links Ch. 05 to Ch. 06. Status: ref-verified.

### Al-Fajr 89:27–30, Ch. 06
O soul at rest, return to your Lord, well-pleased and well-pleasing; enter among My servants; enter My Paradise. **Context:** most tafsir place this address at death and/or on the Day of Judgment. The site must present it as **hope**, not as an achieved state. Status: ref-verified.

### Al-Hashr 59:18, Ch. 06 (and the *muhâsebe* thread)
O you who believe, fear Allah, and let every soul look to what it has sent ahead for tomorrow; fear Allah, for He is aware of what you do. Status: ref-verified.

---

## C. Hadith

| Theme | Content (summary) | Reference | Grade | Status |
|---|---|---|---|---|
| Heart over form | Allah does not look at your forms and wealth, but at your hearts and deeds. | Muslim, Birr 33–34 (no. 2564) | Sahih | check-numbering |
| The heart as centre | In the body is a morsel of flesh; if sound, the whole body is sound… it is the heart. | Bukhârî, Îmân 39 (no. 52); Muslim, Musâkât 107 (no. 1599) | Sahih | check-numbering |
| Stain on the heart (Ch. 03 mirror) | When the servant sins, a black spot is placed on his heart; if he repents it is polished; if he returns, it increases: that is the *rân* of 83:14. | Tirmidhî, Tefsîr 83 (no. 3334); Ibn Mâce, Zühd 29 (no. 4244) | Tirmidhî: hasan sahih | check-numbering |
| Repentance | Every son of Adam errs, and the best of those who err are those who repent. | Tirmidhî, Kıyâme 49 (no. 2499); Ibn Mâce 4251 | Graded hasan by several; Tirmidhî: *garîb* | check-numbering, **show grade** |
| Two neglected blessings (Ch. 04) | Health and free time: many people are deceived (*mağbûn*) in them. | Bukhârî, Rikâk 1 (no. 6412) | Sahih | check-numbering |
| Never enough (Ch. 04) | If the son of Adam had a valley of gold he would want a second; only dust fills his mouth; Allah turns to whoever repents. | Bukhârî, Rikâk 10 (no. 6436–6439); Muslim, Zekât 116 (no. 1048) | Sahih | check-numbering |
| Stranger / traveller (Ch. 04 footprints) | Be in this world as if a stranger or a wayfarer. | Bukhârî, Rikâk 3 (no. 6416) | Sahih | check-numbering |
| Gratitude & patience (Ch. 05) | Wondrous is the believer's affair: in ease he is grateful, in hardship he is patient, and both are good for him. | Muslim, Zühd 64 (no. 2999) | Sahih | check-numbering |
| Ihsân | …to worship Allah as though you see Him; though you do not see Him, He sees you. (Hadîth of Jibrîl) | Muslim, Îmân 1 (no. 8); Bukhârî, Îmân 37 (no. 50) | Sahih | check-numbering |
| Five before five | Take advantage of five before five: youth, health, wealth, free time, life. | al-Hâkim, *el-Müstedrek* (no. 7846) | Hâkim: sahih; graded sahih by later scholars, but outside the Six Books | check-numbering, **show source** |

### Do not use (popular, not authentic as hadith)
- **"Men 'arafe nefsehû fekad 'arafe rabbehû"** ("Whoever knows himself knows his Lord"). **Not an authentic hadith**: critics such as Ibn Taymiyya and as-Suyûtî noted it has no sound chain to the Prophet ﷺ, and some attribute it to Yahyâ b. Mu'âz ar-Râzî. It is thematically tempting for SIRR. If used at all, label it as a **saying in the Sufi tradition, not a hadith**. Recommendation: don't use it.
- **"Küntü kenzen mahfiyyen…"** ("I was a hidden treasure…"). No known chain. Do not present it as hadith qudsî.
- **"Ölmeden önce ölünüz"** ("Die before you die"). Not established as hadith. Treat it as a Sufi saying if needed at all.

### Athar (not hadith, label accordingly)
- **'Umar b. al-Khattâb**: "Call yourselves to account before you are called to account…" Reported by Tirmidhî after hadith 2459 as 'Umar's statement, and by Ibn Abi'd-Dunyâ (*Muhâsebetü'n-nefs*). Type: `athar`. Status: check-numbering.

---

## D. Concepts (for content writers; paraphrase, don't quote)

| Concept | Core idea for SIRR | Primary sources |
|---|---|---|
| **Tezkiye-i nefs** | Purification: removing what obscures, not adding ornament (91:9). | Ghazâlî, *Ihyâ* Book 22 *Riyâzatü'n-nefs*; Book 21 *'Acâibü'l-kalb* (heart as mirror, rust and polish) |
| **Muhâsebe** | Taking yourself to account with honesty, without despair. | Ihyâ Book 38 *Murâkabe ve Muhâsebe*; al-Muhâsibî, *er-Ri'âye*; 59:18; 'Umar's athar |
| **Murâkabe** | Awareness that one is seen (hadith of Jibrîl, ihsân). | Ihyâ Book 38; Kuşeyrî, *Risâle* (chapter on murâkabe) |
| **Tevbe** | Turning back: regret, leaving off, resolve. Always possible. | Ihyâ Book 31; Ibn al-Qayyim, *Medâricü's-sâlikîn* (station of tevbe) |
| **Şükr / Sabr** | Two halves of faith in Ghazâlî's framing. | Ihyâ Book 32; Ibn al-Qayyim, *'Uddetü's-sâbirîn* |
| **Tevekkül** | Acting, then entrusting the result. Not passivity. | Ihyâ Book 35 *Tevhîd ve Tevekkül* |
| **Zühd** | The world in the hand, not in the heart. Not a hatred of the world. | Ihyâ Book 34; *Medâric* (station of zühd) |
| **Ihsân** | Excellence through awareness of being seen. | Hadith of Jibrîl |
| **Fenâ / Bekâ** | Passing away of the self's claims and remaining through Allah. **In the mainstream ("sober") Sufism of Junayd and Kuşeyrî this is a state of consciousness and ethics, not an ontological union or dissolution into God.** Never visualise it as merging with a divine light-being. | Kuşeyrî, *Risâle* (fenâ ve bekâ); root in 55:26–27 |
| **Tefekkür** | Reflection on creation as worship. Directly informs Ch. 02. | Ihyâ Book 39 *Tefekkür*; Âl-i 'Imrân 3:190–191 |

### Classical figures, used as *sources of images*, not quote machines
- **Al-Ghazâlî**: the heart as a mirror that can rust and be polished (Ihyâ Book 21). This is the *conceptual* source of Ch. 03. No direct quotation on screen until a verified translation is chosen.
- **Rûmî**, *Mesnevî* Book I: (1) the **reed flute** that laments separation from its reed-bed (the opening lines). This is the emotional key of "return" and can inform the *audio* (breath-like wind tones), **not** a flute track. (2) The story of the **Chinese and Rûmî painters**: one side paints, the other only polishes the wall until it reflects the other side's work. This maps exactly onto Ch. 03's polishing gesture. Credit it in the source panel as "Mesnevî I, Çinli ve Rum ressamlar hikâyesi". Use a published translation (e.g. Veled İzbudak / Abdülbâki Gölpınarlı, or Nicholson in English) and cite the edition.
- **Ibn al-Qayyim**: *Medâricü's-sâlikîn* (a commentary on Herevî's *Menâzilü's-sâirîn*, the "stations" model of the journey). It supports structuring SIRR as stations (*makâm*), not levels to "complete".

---

## E. Tafsir sources to consult per chapter

1. **Diyanet — Kur'an Yolu Türkçe Meal ve Tefsir**: https://kuran.diyanet.gov.tr (primary; use the sura introductions for context).
2. Elmalılı M. Hamdi Yazır, *Hak Dini Kur'an Dili*.
3. Taberî, *Câmi'u'l-beyân*: for the range of early views (95:5, 100:1–7, 103:1).
4. Fahreddin er-Râzî, *Mefâtîhu'l-gayb*: philosophical depth on 91:7–10 and 95:4.
5. İbn Kesîr, *Tefsîru'l-Kur'âni'l-'Azîm*: hadith context for 102:8.

## F. Original project writing (type `original`)

All the Turkish questions in the experience ("Ne zamandır buradasın?" and others) are **original project writing**. On screen they carry no quotation marks or attribution that could suggest scripture, and the source panel labels them "SIRR — özgün metin".

---

## G. Creative & technical references (from prior knowledge, not live-browsed this session)

| Studio / work | What makes it effective | Technique to adopt |
|---|---|---|
| **Active Theory** | Persistent single WebGL world; UI is minimal and diegetic. | One persistent Canvas; scene streaming |
| **Resn** | Playful physical interactions with strong feedback. | Every touch gets an immediate, physical response |
| **Immersive Garden** | Photographic lighting, restrained motion, editorial type over 3D. | Filmic grade, slow camera, one line of text at a time |
| **Locomotive** | Smooth-scroll storytelling and typographic rhythm. | Native scroll + smoothing (Lenis lineage), beat-based reveals |
| **Bruno Simon** | Interaction as exploration, world as interface. | Explorable, not just scrollable, moments |
| **Lusion** | Particles + physicality; transitions inside the 3D world. | Thresholds as camera moves, not DOM fades |

Technique notes:
- **Grass:** instanced blades; wind = vertex displacement weighted by blade height (`h²`), with low-frequency gusts plus high-frequency flutter.
- **Glass/transmission:** drei `MeshTransmissionMaterial` renders an extra FBO pass, so use it only during thresholds.
- **Water ripples:** a ping-pong height-field simulation in a small render target (256²) feeding the normal of a reflective plane (drei `MeshReflectorMaterial` or a custom planar reflection).
- **DOF:** expensive on mobile, so use the high tier only. Fake depth with fog and height-based haze otherwise.
- **Hair & cloth:** hair cards plus shader wind, and a vertex-shader cloth with painted pin weights. Verlet cloth is a desktop upgrade.
