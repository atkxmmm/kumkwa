# Prompt สำหรับเจนภาพ (GPT / ChatGPT)

ตอนนี้เกมวาดภาพพิกเซลด้วยโค้ดไว้ทุกตัว ถ้าเจนภาพมาแล้วเซฟตาม **ชื่อไฟล์** ข้างล่าง วางไว้ใน `game/assets/...` เกมจะใช้ภาพนั้นแทนให้เอง ทำทีละภาพก็ได้ ภาพไหนยังไม่มีก็ใช้ภาพพิกเซลเดิมไปก่อน

## วิธีใช้
1. ทุกภาพให้ก๊อป **STYLE** ไปวางไว้ก่อน แล้วต่อด้วย prompt ของภาพนั้น
2. ขอเป็น **PNG พื้นหลังโปร่งใส** (ยกเว้นฉากหลัง) ถ้า GPT ไม่ยอมทำพื้นโปร่งใส ให้พิมพ์ต่อว่า `make the background transparent`
3. ภาพที่ใช้กับตัวละครคนเดียวกัน (portrait กับ battle) ให้ทำในแชทเดียวกัน หน้าตาจะได้ออกมาเหมือนกัน
4. เซฟชื่อไฟล์ให้ตรงเป๊ะ เป็นตัวพิมพ์เล็ก นามสกุล `.png`

## STYLE (วางไว้หน้าทุก prompt)

```
STYLE: high-quality pixel art in the look of a modern indie visual novel set in a late-night café.
Limited moody palette: warm brick browns, deep plum and navy shadows, soft cream highlights,
small accents of neon green and pink. Clean dark 1px outlines, soft cel shading, visible square pixels,
slightly mature anime proportions (not chibi), calm and cozy mood. No text, no logo, no frame, no watermark.
```

---

## 1. ภาพหน้าตรง (portrait): ใช้ในกล่องคำพูด การ์ด กาชา และฉาก BURST
ขนาด 1024×1024 · พื้นโปร่งใส · ครึ่งตัวจากเอวขึ้นไป หันหน้าเข้ากล้องเล็กน้อย ถือปืนประจำตัว
เซฟเป็น `assets/portraits/<ชื่อไฟล์>.png`

```
Half-body portrait from the waist up, facing the viewer at a slight three-quarter angle,
holding their signature gun. Transparent background. Character:
```
แล้วต่อด้วยคำอธิบายตัวละครข้างล่าง

| ไฟล์ | ตัวละคร | ต่อท้ายด้วย |
|---|---|---|
| `bram.png` | แบรม · R · ไรเฟิล | `a calm young man with short messy brown hair, steel-grey tactical jacket with gold trim, holding an assault rifle` |
| `fen.png` | เฟน · R · สไนเปอร์ | `a focused young woman with a green ponytail, olive ranger coat with brown leather straps, holding a long sniper rifle` |
| `pim.png` | พิม · R · จรวด | `a cheerful clumsy girl with a pink bob haircut, purple jacket with yellow trim, carrying a rocket launcher with a pink warhead over her shoulder` |
| `noi.png` | น้อย · R · SMG | `a gentle young woman with long black hair, cream white medic outfit with mint green accents, holding a compact submachine gun and a cup of herbal tea` |
| `garron.png` | การ์รอน · SR · ช็อตกัน | `a broad bearded man with short dark hair and tan skin, navy heavy armor with gold edges, holding a big pump shotgun, protective stance` |
| `vex.png` | เว็กซ์ · SR · SMG | `a mysterious assassin with pale skin and violet hair under a dark hood, black face mask over the mouth, crimson accents, holding a sleek submachine gun` |
| `mira.png` | มิระ · SR · ไรเฟิล | `an elegant cool-toned woman with long icy light-blue hair, blue coat with frosty white details, holding an assault rifle that glows with ice` |
| `tum.png` | ตั้ม · SR · ปืนกล | `an energetic musician with spiky golden hair and brown skin, red jacket, carrying a heavy machine gun decorated like a guitar` |
| `ruby.png` | รูบี้ · SSR · ช็อตกัน | `a confident demon woman with lilac-pink skin, long dark hair, curled red horns with swirl patterns, pointed ears, dark navy jacket, holding a double-barrel shotgun and a cigarette, half-lidded eyes` |
| `kaida.png` | ไคดะ · SSR · จรวด | `a fierce dragon-girl with spiky red hair, small crimson dragon wings, dark red armor with orange trim, holding a heavy rocket launcher` |
| `elara.png` | เอลาร่า · SSR · ไรเฟิล | `a serene saint with long pale golden hair and a glowing halo, white and gold robe, holding an ornate white assault rifle, soft warm light` |
| `mochi.png` | โมจิ · SSR · สไนเปอร์ | `a sleepy cat-eared boy with short white hair and white cat ears, dark grey hoodie with a long green knitted scarf, cat tail, holding a long sniper rifle` |
| `master.png` | มาสเตอร์ (เจ้าของร้าน) | `a quiet bearded café owner with dark hair, black barista shirt with a cream apron, polishing a coffee cup behind a wooden counter` |

## 2. ภาพหันหลัง (battle): ใช้ตอนยิงหลังกระสอบทราย
ขนาด 1024×1024 · พื้นโปร่งใส · **หันหลังให้กล้อง** เห็นจากเอวขึ้นไป ยกปืนเล็งไปข้างหน้า
เซฟเป็น `assets/heroes/<ชื่อไฟล์>.png` (ชื่อเดียวกับตาราง portrait)

```
Seen from behind, back view from the waist up, the character is aiming their gun forward and slightly
up into the distance, like a shooter game squad member peeking over cover. Transparent background. Character:
```
แล้วต่อด้วยคำอธิบายตัวเดิมจากตารางข้างบน (ไม่ต้องทำ master)

## 3. มอนสเตอร์
ขนาด 1024×1024 · พื้นโปร่งใส · ทั้งตัว หันหน้าเข้ากล้องหรือเฉียงเล็กน้อย
เซฟเป็น `assets/monsters/<ชื่อไฟล์>.png`

```
A single full-body monster, front view, slightly menacing but cute. Transparent background. Monster:
```

| ไฟล์ | มอน | ต่อท้ายด้วย |
|---|---|---|
| `slime.png` | สไลม์กาแฟ | `a blob slime made of coffee with a layer of milk foam on top, two small eyes` |
| `rat.png` | หนูท่อ | `a scruffy grey sewer rat with a pink tail` |
| `alleycat.png` | แมวจรผี | `a black ghost alley cat with glowing neon green eyes` |
| `shroom.png` | เห็ดพิษ | `a walking red poison mushroom with cream spots and tiny feet` |
| `wolf.png` | หมาป่าเงา | `a shadowy indigo wolf with yellow eyes` |
| `bat.png` | ค้างคาวถ้ำ | `a purple cave bat with red eyes, wings spread` |
| `golem.png` | โกเลมหิน | `a stone golem with glowing cyan crystals in its body` |
| `ghost.png` | วิญญาณหลงทาง | `a pale lost ghost with a wavy tail and sad dark eyes` |
| `skeleton.png` | โครงกระดูก | `a skeleton warrior with red glowing eyes holding a rusty sword` |
| `imp.png` | อิมป์ | `a small red imp with horns, claws and a thin tail, mischievous grin` |
| `boss1.png` | ราชาสไลม์ลาเต้ | `a giant king slime made of latte with foam art on top and a small gold crown` |
| `boss2.png` | จ่าฝูงจันทร์เสี้ยว | `a huge alpha wolf with dark navy fur, a crescent moon mark, red eyes and a gold crown` |
| `boss3.png` | โกเลมคริสตัล | `a massive purple crystal golem with glowing pink cores and a gold crown` |
| `boss4.png` | ลิชดวงดาว | `a hooded lich sorcerer made of starlight, dark navy robe, glowing blue eyes, gold crown, holding a staff` |

## 4. ฉากหลัง
ขนาด 1024×1024 · **ไม่ต้องโปร่งใส** · มุมมองเหมือนยืนหลังแนวกำบังมองไปข้างหน้า เส้นขอบฟ้าอยู่ราว 1 ใน 3 จากด้านบน พื้นด้านล่างโล่ง ไม่มีตัวละคร (เกมจะวางกระสอบทรายกับตัวละครเพิ่มเอง)
เซฟเป็น `assets/bg/<ชื่อไฟล์>.png`

```
Background scene only, no characters. First-person view looking down a street toward the horizon,
the horizon line sits about one third from the top, the lower two thirds is empty open ground
that recedes into the distance. Location:
```

| ไฟล์ | ฉาก | ต่อท้ายด้วย |
|---|---|---|
| `alley.png` | ตรอกนีออน | `a narrow brick alley at midnight behind a small café, warm hanging lamps, a green neon coffee cup sign, wet pavement` |
| `forest.png` | ป่าหิ่งห้อย | `a dark teal forest clearing at night under a big moon, fireflies, dirt path` |
| `cave.png` | ถ้ำคริสตัล | `a deep cave with glowing purple and cyan crystals, stalactites, stone floor` |
| `tower.png` | หอคอยดวงดาว | `the courtyard of a tall star-gazing tower under a starry night sky, golden windows, stone tiles` |

## 5. ไอคอนอุปกรณ์ (ไม่จำเป็น)
ขนาด 1024×1024 · พื้นโปร่งใส · เซฟเป็น `assets/gear/<ชื่อไฟล์>.png`

```
A single item icon for an RPG inventory, centered, transparent background. Item:
```

`rustblade` rusty iron combat knife · `willow` willow-wood gun stock charm · `neonblade` neon green glowing blade · `shadowbow` moonlit black scope · `fang` dark curved fang dagger with gold · `starstaff` star-topped staff
`leather` worn leather vest · `apron` barista apron · `ironplate` steel chest plate · `nightcloak` midnight blue cloak · `dragonmail` red dragon-scale armor · `saintrobe` white and gold robe
`copperring` copper ring · `beanamulet` coffee bean amulet · `owlfeather` owl feather · `moonring` crescent moon ring · `phoenix` fiery phoenix feather · `eclipse` solar eclipse pendant

## 6. ผักในฟาร์ม (ไม่จำเป็น ใช้ตอนผักโตเต็มที่)
ขนาด 1024×1024 · พื้นโปร่งใส · เซฟเป็น `assets/crops/<ชื่อไฟล์>.png`

```
A single ripe crop growing from a small mound of soil, cute farming game item, transparent background. Crop:
```

`lettuce` lettuce · `carrot` carrot · `tomato` tomato plant · `coffee` coffee plant with red cherries · `strawberry` strawberry plant · `pumpkin` giant pumpkin
