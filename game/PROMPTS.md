# Prompt สำหรับเจนภาพ (GPT / ChatGPT)

ทุก prompt ก๊อปไปวางได้ทั้งก้อน ไม่ต้องต่ออะไรเพิ่ม เซฟตาม **ชื่อไฟล์** แล้ววางในโฟลเดอร์ `game/assets/...` เกมจะใช้ภาพนั้นแทนภาพพิกเซลเอง ทำทีละภาพก็ได้

## เคล็ดลับ
- คำอย่าง assault rifle / sniper rifle / assassin ทำให้ GPT ปฏิเสธ เลยเขียนเป็นปืนแฟนตาซี (blaster, fantasy prop) ชี้ลงพื้นแทน ถ้ายังโดนปฏิเสธ ตัดท่อนปืนออกได้เลย
- กดปุ่มดาวน์โหลดในแอป GPT เพื่อเซฟไฟล์จริง อย่าแคปหน้าจอ เพราะพื้นใสจะหาย
- ทำภาพหน้าตรงกับภาพหันหลังของตัวเดียวกัน **ในแชทเดียวกัน** หน้าตาจะได้ตรงกัน (ทำ 1 แชทต่อ 1 ตัว)
- ถ้าพื้นหลังไม่โปร่งใส พิมพ์ต่อว่า `make the background transparent`
- ชื่อไฟล์ใช้ตัวพิมพ์เล็ก นามสกุล `.png`
- ระดับ R / SR / SSR ใส่ไว้ใน prompt แล้ว: R ชุดเรียบ ไม่มีเอฟเฟกต์ · SR ชุดละเอียดขึ้น มีออร่าม่วง · SSR ชุดหรู ขอบทอง แสงวิบวับ

## 1. ฮีโร่: ภาพหน้าตรง
ใช้ในการ์ด กาชา กล่องคำพูด และฉาก BURST · เซฟเป็น `assets/portraits/<ชื่อไฟล์>.png`

### แบรม · R · ไรเฟิล → `bram.png`
```
Half-body character portrait from the waist up, facing the viewer at a slight three-quarter angle, square 1024x1024, transparent background. Character: a calm young man with short messy brown hair, steel-grey adventurer jacket, holding a chunky sci-fi blaster that is clearly a fantasy video game prop, pointed at the ground. Rarity R (common): simple practical outfit, plain colors, few accessories, relaxed pose, plain soft lighting, no special effects. Style: pixel art, high-quality modern indie visual novel look, late-night café mood, limited palette of warm brick browns, deep plum and navy shadows, soft cream highlights, small neon green and pink accents, clean dark 1px outlines, soft cel shading, visible square pixels, slightly mature anime proportions (not chibi). Friendly cozy game character art. No text, no logo, no frame, no watermark.
```

### เฟน · R · สไนเปอร์ → `fen.png`
```
Half-body character portrait from the waist up, facing the viewer at a slight three-quarter angle, square 1024x1024, transparent background. Character: a focused young woman with a green ponytail, olive ranger coat with brown leather straps, holding a long sci-fi scope blaster that is clearly a fantasy video game prop, pointed at the ground. Rarity R (common): simple practical outfit, plain colors, few accessories, relaxed pose, plain soft lighting, no special effects. Style: pixel art, high-quality modern indie visual novel look, late-night café mood, limited palette of warm brick browns, deep plum and navy shadows, soft cream highlights, small neon green and pink accents, clean dark 1px outlines, soft cel shading, visible square pixels, slightly mature anime proportions (not chibi). Friendly cozy game character art. No text, no logo, no frame, no watermark.
```

### พิม · R · จรวด → `pim.png`
```
Half-body character portrait from the waist up, facing the viewer at a slight three-quarter angle, square 1024x1024, transparent background. Character: a cheerful clumsy girl with a pink bob haircut, purple jacket, carrying a big chunky toy-like fantasy cannon with a pink tip on her shoulder. Rarity R (common): simple practical outfit, plain colors, few accessories, relaxed pose, plain soft lighting, no special effects. Style: pixel art, high-quality modern indie visual novel look, late-night café mood, limited palette of warm brick browns, deep plum and navy shadows, soft cream highlights, small neon green and pink accents, clean dark 1px outlines, soft cel shading, visible square pixels, slightly mature anime proportions (not chibi). Friendly cozy game character art. No text, no logo, no frame, no watermark.
```

### น้อย · R · SMG → `noi.png`
```
Half-body character portrait from the waist up, facing the viewer at a slight three-quarter angle, square 1024x1024, transparent background. Character: a gentle young woman with long black hair, cream white medic outfit with mint green details, holding a small compact sci-fi blaster that is clearly a fantasy video game prop, pointed at the ground. Rarity R (common): simple practical outfit, plain colors, few accessories, relaxed pose, plain soft lighting, no special effects. Style: pixel art, high-quality modern indie visual novel look, late-night café mood, limited palette of warm brick browns, deep plum and navy shadows, soft cream highlights, small neon green and pink accents, clean dark 1px outlines, soft cel shading, visible square pixels, slightly mature anime proportions (not chibi). Friendly cozy game character art. No text, no logo, no frame, no watermark.
```

### การ์รอน · SR · ช็อตกัน → `garron.png`
```
Half-body character portrait from the waist up, facing the viewer at a slight three-quarter angle, square 1024x1024, transparent background. Character: a broad bearded man with short dark hair and tan skin, navy heavy armor with brass plates, holding a wide-barrel fantasy blunderbuss prop pointed at the ground, protective stance. Rarity SR (rare): more detailed outfit with distinctive accessories, confident pose, soft violet rim light, faint purple aura and a few small glowing particles. Style: pixel art, high-quality modern indie visual novel look, late-night café mood, limited palette of warm brick browns, deep plum and navy shadows, soft cream highlights, small neon green and pink accents, clean dark 1px outlines, soft cel shading, visible square pixels, slightly mature anime proportions (not chibi). Friendly cozy game character art. No text, no logo, no frame, no watermark.
```

### เว็กซ์ · SR · SMG → `vex.png`
```
Half-body character portrait from the waist up, facing the viewer at a slight three-quarter angle, square 1024x1024, transparent background. Character: a mysterious rogue with pale skin and violet hair under a dark hood, black cloth over the mouth, crimson details, holding a small sleek sci-fi blaster prop pointed at the ground. Rarity SR (rare): more detailed outfit with distinctive accessories, confident pose, soft violet rim light, faint purple aura and a few small glowing particles. Style: pixel art, high-quality modern indie visual novel look, late-night café mood, limited palette of warm brick browns, deep plum and navy shadows, soft cream highlights, small neon green and pink accents, clean dark 1px outlines, soft cel shading, visible square pixels, slightly mature anime proportions (not chibi). Friendly cozy game character art. No text, no logo, no frame, no watermark.
```

### มิระ · SR · ไรเฟิล → `mira.png`
```
Half-body character portrait from the waist up, facing the viewer at a slight three-quarter angle, square 1024x1024, transparent background. Character: an elegant woman with long icy light-blue hair, blue coat with frosty white details, holding a sci-fi blaster that glows with magical ice, a fantasy video game prop pointed at the ground. Rarity SR (rare): more detailed outfit with distinctive accessories, confident pose, soft violet rim light, faint purple aura and a few small glowing particles. Style: pixel art, high-quality modern indie visual novel look, late-night café mood, limited palette of warm brick browns, deep plum and navy shadows, soft cream highlights, small neon green and pink accents, clean dark 1px outlines, soft cel shading, visible square pixels, slightly mature anime proportions (not chibi). Friendly cozy game character art. No text, no logo, no frame, no watermark.
```

### ตั้ม · SR · ปืนกล → `tum.png`
```
Half-body character portrait from the waist up, facing the viewer at a slight three-quarter angle, square 1024x1024, transparent background. Character: an energetic musician with spiky golden hair and brown skin, red jacket, carrying a big steampunk multi-barrel blaster decorated like a guitar, a fantasy video game prop. Rarity SR (rare): more detailed outfit with distinctive accessories, confident pose, soft violet rim light, faint purple aura and a few small glowing particles. Style: pixel art, high-quality modern indie visual novel look, late-night café mood, limited palette of warm brick browns, deep plum and navy shadows, soft cream highlights, small neon green and pink accents, clean dark 1px outlines, soft cel shading, visible square pixels, slightly mature anime proportions (not chibi). Friendly cozy game character art. No text, no logo, no frame, no watermark.
```

### รูบี้ · SSR · ช็อตกัน → `ruby.png`
```
Half-body character portrait from the waist up, facing the viewer at a slight three-quarter angle, square 1024x1024, transparent background. Character: a confident demon woman with lilac-pink skin, long dark hair, curled red horns with swirl patterns, pointed ears, dark navy jacket, holding an ornate double-barrel fantasy blunderbuss prop resting on her shoulder, half-lidded eyes. Rarity SSR (super rare): ornate luxurious outfit with gold trim and unique details, dramatic dynamic pose, strong golden rim light, glowing aura, sparkles and floating light motes, the most impressive and eye-catching look. Style: pixel art, high-quality modern indie visual novel look, late-night café mood, limited palette of warm brick browns, deep plum and navy shadows, soft cream highlights, small neon green and pink accents, clean dark 1px outlines, soft cel shading, visible square pixels, slightly mature anime proportions (not chibi). Friendly cozy game character art. No text, no logo, no frame, no watermark.
```

### ไคดะ · SSR · จรวด → `kaida.png`
```
Half-body character portrait from the waist up, facing the viewer at a slight three-quarter angle, square 1024x1024, transparent background. Character: a fierce dragon girl with spiky red hair, crimson dragon wings, dark red armor, carrying a huge ornate dragon-head fantasy cannon on her shoulder. Rarity SSR (super rare): ornate luxurious outfit with gold trim and unique details, dramatic dynamic pose, strong golden rim light, glowing aura, sparkles and floating light motes, the most impressive and eye-catching look. Style: pixel art, high-quality modern indie visual novel look, late-night café mood, limited palette of warm brick browns, deep plum and navy shadows, soft cream highlights, small neon green and pink accents, clean dark 1px outlines, soft cel shading, visible square pixels, slightly mature anime proportions (not chibi). Friendly cozy game character art. No text, no logo, no frame, no watermark.
```

### เอลาร่า · SSR · ไรเฟิล → `elara.png`
```
Half-body character portrait from the waist up, facing the viewer at a slight three-quarter angle, square 1024x1024, transparent background. Character: a serene saint with long pale golden hair and a glowing halo, white and gold robe, holding an ornate white and gold magical light blaster, a fantasy video game prop pointed at the ground. Rarity SSR (super rare): ornate luxurious outfit with gold trim and unique details, dramatic dynamic pose, strong golden rim light, glowing aura, sparkles and floating light motes, the most impressive and eye-catching look. Style: pixel art, high-quality modern indie visual novel look, late-night café mood, limited palette of warm brick browns, deep plum and navy shadows, soft cream highlights, small neon green and pink accents, clean dark 1px outlines, soft cel shading, visible square pixels, slightly mature anime proportions (not chibi). Friendly cozy game character art. No text, no logo, no frame, no watermark.
```

### โมจิ · SSR · สไนเปอร์ → `mochi.png`
```
Half-body character portrait from the waist up, facing the viewer at a slight three-quarter angle, square 1024x1024, transparent background. Character: a sleepy cat-eared boy with short white hair, white cat ears and tail, dark grey hoodie with a long green knitted scarf, holding a long sci-fi scope blaster prop resting on his shoulder. Rarity SSR (super rare): ornate luxurious outfit with gold trim and unique details, dramatic dynamic pose, strong golden rim light, glowing aura, sparkles and floating light motes, the most impressive and eye-catching look. Style: pixel art, high-quality modern indie visual novel look, late-night café mood, limited palette of warm brick browns, deep plum and navy shadows, soft cream highlights, small neon green and pink accents, clean dark 1px outlines, soft cel shading, visible square pixels, slightly mature anime proportions (not chibi). Friendly cozy game character art. No text, no logo, no frame, no watermark.
```

### มาสเตอร์ (เจ้าของร้าน) → `master.png`
```
Half-body character portrait from the waist up, facing the viewer, square 1024x1024, transparent background. Character: a quiet bearded café owner with dark hair, black barista shirt and a cream apron, polishing a coffee cup. Style: pixel art, high-quality modern indie visual novel look, late-night café mood, limited palette of warm brick browns, deep plum and navy shadows, soft cream highlights, small neon green and pink accents, clean dark 1px outlines, soft cel shading, visible square pixels, slightly mature anime proportions (not chibi). Friendly cozy game character art. No text, no logo, no frame, no watermark.
```

## 2. ฮีโร่: ภาพหันหลัง (ตอนยิงหลังกระสอบทราย)
พิมพ์ต่อในแชทเดียวกับภาพหน้าตรงของตัวนั้น · เซฟเป็น `assets/heroes/<ชื่อไฟล์>.png` (ชื่อเดียวกับภาพหน้าตรง ไม่ต้องทำมาสเตอร์)

```
Same character, same outfit and colors, now seen from behind: back view from the waist up, holding the blaster ready and looking toward the horizon, like a squad member peeking over cover in a cozy shooter game. Square 1024x1024, transparent background, same pixel art style and same rarity effects.
```

## 3. มอนสเตอร์
เซฟเป็น `assets/monsters/<ชื่อไฟล์>.png`

### สไลม์กาแฟ → `slime.png`
```
A single full-body monster, front view, slightly menacing but cute, square 1024x1024, transparent background. Monster: a blob slime made of coffee with milk foam on top, two small eyes. Style: pixel art, high-quality modern indie visual novel look, late-night café mood, limited palette of warm brick browns, deep plum and navy shadows, soft cream highlights, small neon green and pink accents, clean dark 1px outlines, soft cel shading, visible square pixels, slightly mature anime proportions (not chibi). Friendly cozy game character art. No text, no logo, no frame, no watermark.
```

### หนูท่อ → `rat.png`
```
A single full-body monster, front view, slightly menacing but cute, square 1024x1024, transparent background. Monster: a scruffy grey sewer rat with a pink tail. Style: pixel art, high-quality modern indie visual novel look, late-night café mood, limited palette of warm brick browns, deep plum and navy shadows, soft cream highlights, small neon green and pink accents, clean dark 1px outlines, soft cel shading, visible square pixels, slightly mature anime proportions (not chibi). Friendly cozy game character art. No text, no logo, no frame, no watermark.
```

### แมวจรผี → `alleycat.png`
```
A single full-body monster, front view, slightly menacing but cute, square 1024x1024, transparent background. Monster: a black ghost alley cat with glowing neon green eyes. Style: pixel art, high-quality modern indie visual novel look, late-night café mood, limited palette of warm brick browns, deep plum and navy shadows, soft cream highlights, small neon green and pink accents, clean dark 1px outlines, soft cel shading, visible square pixels, slightly mature anime proportions (not chibi). Friendly cozy game character art. No text, no logo, no frame, no watermark.
```

### เห็ดพิษ → `shroom.png`
```
A single full-body monster, front view, slightly menacing but cute, square 1024x1024, transparent background. Monster: a walking red poison mushroom with cream spots and tiny feet. Style: pixel art, high-quality modern indie visual novel look, late-night café mood, limited palette of warm brick browns, deep plum and navy shadows, soft cream highlights, small neon green and pink accents, clean dark 1px outlines, soft cel shading, visible square pixels, slightly mature anime proportions (not chibi). Friendly cozy game character art. No text, no logo, no frame, no watermark.
```

### หมาป่าเงา → `wolf.png`
```
A single full-body monster, front view, slightly menacing but cute, square 1024x1024, transparent background. Monster: a shadowy indigo wolf with yellow eyes. Style: pixel art, high-quality modern indie visual novel look, late-night café mood, limited palette of warm brick browns, deep plum and navy shadows, soft cream highlights, small neon green and pink accents, clean dark 1px outlines, soft cel shading, visible square pixels, slightly mature anime proportions (not chibi). Friendly cozy game character art. No text, no logo, no frame, no watermark.
```

### ค้างคาวถ้ำ → `bat.png`
```
A single full-body monster, front view, slightly menacing but cute, square 1024x1024, transparent background. Monster: a purple cave bat with red eyes, wings spread. Style: pixel art, high-quality modern indie visual novel look, late-night café mood, limited palette of warm brick browns, deep plum and navy shadows, soft cream highlights, small neon green and pink accents, clean dark 1px outlines, soft cel shading, visible square pixels, slightly mature anime proportions (not chibi). Friendly cozy game character art. No text, no logo, no frame, no watermark.
```

### โกเลมหิน → `golem.png`
```
A single full-body monster, front view, slightly menacing but cute, square 1024x1024, transparent background. Monster: a stone golem with glowing cyan crystals in its body. Style: pixel art, high-quality modern indie visual novel look, late-night café mood, limited palette of warm brick browns, deep plum and navy shadows, soft cream highlights, small neon green and pink accents, clean dark 1px outlines, soft cel shading, visible square pixels, slightly mature anime proportions (not chibi). Friendly cozy game character art. No text, no logo, no frame, no watermark.
```

### วิญญาณหลงทาง → `ghost.png`
```
A single full-body monster, front view, slightly menacing but cute, square 1024x1024, transparent background. Monster: a pale lost ghost with a wavy tail and sad dark eyes. Style: pixel art, high-quality modern indie visual novel look, late-night café mood, limited palette of warm brick browns, deep plum and navy shadows, soft cream highlights, small neon green and pink accents, clean dark 1px outlines, soft cel shading, visible square pixels, slightly mature anime proportions (not chibi). Friendly cozy game character art. No text, no logo, no frame, no watermark.
```

### โครงกระดูก → `skeleton.png`
```
A single full-body monster, front view, slightly menacing but cute, square 1024x1024, transparent background. Monster: a skeleton warrior with red glowing eyes holding a rusty sword. Style: pixel art, high-quality modern indie visual novel look, late-night café mood, limited palette of warm brick browns, deep plum and navy shadows, soft cream highlights, small neon green and pink accents, clean dark 1px outlines, soft cel shading, visible square pixels, slightly mature anime proportions (not chibi). Friendly cozy game character art. No text, no logo, no frame, no watermark.
```

### อิมป์ → `imp.png`
```
A single full-body monster, front view, slightly menacing but cute, square 1024x1024, transparent background. Monster: a small red imp with horns, claws and a thin tail, mischievous grin. Style: pixel art, high-quality modern indie visual novel look, late-night café mood, limited palette of warm brick browns, deep plum and navy shadows, soft cream highlights, small neon green and pink accents, clean dark 1px outlines, soft cel shading, visible square pixels, slightly mature anime proportions (not chibi). Friendly cozy game character art. No text, no logo, no frame, no watermark.
```

### บอส: ราชาสไลม์ลาเต้ → `boss1.png`
```
A single full-body monster, front view, slightly menacing but cute, square 1024x1024, transparent background. Monster: a giant king slime made of latte with foam art on top and a small gold crown, boss monster, imposing. Style: pixel art, high-quality modern indie visual novel look, late-night café mood, limited palette of warm brick browns, deep plum and navy shadows, soft cream highlights, small neon green and pink accents, clean dark 1px outlines, soft cel shading, visible square pixels, slightly mature anime proportions (not chibi). Friendly cozy game character art. No text, no logo, no frame, no watermark.
```

### บอส: จ่าฝูงจันทร์เสี้ยว → `boss2.png`
```
A single full-body monster, front view, slightly menacing but cute, square 1024x1024, transparent background. Monster: a huge alpha wolf with dark navy fur, a crescent moon mark, red eyes and a gold crown, boss monster, imposing. Style: pixel art, high-quality modern indie visual novel look, late-night café mood, limited palette of warm brick browns, deep plum and navy shadows, soft cream highlights, small neon green and pink accents, clean dark 1px outlines, soft cel shading, visible square pixels, slightly mature anime proportions (not chibi). Friendly cozy game character art. No text, no logo, no frame, no watermark.
```

### บอส: โกเลมคริสตัล → `boss3.png`
```
A single full-body monster, front view, slightly menacing but cute, square 1024x1024, transparent background. Monster: a massive purple crystal golem with glowing pink cores and a gold crown, boss monster, imposing. Style: pixel art, high-quality modern indie visual novel look, late-night café mood, limited palette of warm brick browns, deep plum and navy shadows, soft cream highlights, small neon green and pink accents, clean dark 1px outlines, soft cel shading, visible square pixels, slightly mature anime proportions (not chibi). Friendly cozy game character art. No text, no logo, no frame, no watermark.
```

### บอส: ลิชดวงดาว → `boss4.png`
```
A single full-body monster, front view, slightly menacing but cute, square 1024x1024, transparent background. Monster: a hooded lich sorcerer made of starlight, dark navy robe, glowing blue eyes, gold crown, holding a staff, boss monster, imposing. Style: pixel art, high-quality modern indie visual novel look, late-night café mood, limited palette of warm brick browns, deep plum and navy shadows, soft cream highlights, small neon green and pink accents, clean dark 1px outlines, soft cel shading, visible square pixels, slightly mature anime proportions (not chibi). Friendly cozy game character art. No text, no logo, no frame, no watermark.
```

## 4. ฉากหลัง
ไม่ต้องโปร่งใส · เซฟเป็น `assets/bg/<ชื่อไฟล์>.png`

### ตรอกนีออน → `alley.png`
```
Background scene only, no characters, square 1024x1024. First-person view looking down toward the horizon; the horizon line sits about one third from the top and the lower two thirds is empty open ground receding into the distance. Location: a narrow brick alley at midnight behind a small café, warm hanging lamps, a green neon coffee cup sign, wet pavement. Style: pixel art, high-quality modern indie visual novel look, late-night café mood, limited palette of warm brick browns, deep plum and navy shadows, soft cream highlights, small neon green and pink accents, clean dark 1px outlines, soft cel shading, visible square pixels, slightly mature anime proportions (not chibi). Friendly cozy game character art. No text, no logo, no frame, no watermark.
```

### ป่าหิ่งห้อย → `forest.png`
```
Background scene only, no characters, square 1024x1024. First-person view looking down toward the horizon; the horizon line sits about one third from the top and the lower two thirds is empty open ground receding into the distance. Location: a dark teal forest clearing at night under a big moon, fireflies, dirt path. Style: pixel art, high-quality modern indie visual novel look, late-night café mood, limited palette of warm brick browns, deep plum and navy shadows, soft cream highlights, small neon green and pink accents, clean dark 1px outlines, soft cel shading, visible square pixels, slightly mature anime proportions (not chibi). Friendly cozy game character art. No text, no logo, no frame, no watermark.
```

### ถ้ำคริสตัล → `cave.png`
```
Background scene only, no characters, square 1024x1024. First-person view looking down toward the horizon; the horizon line sits about one third from the top and the lower two thirds is empty open ground receding into the distance. Location: a deep cave with glowing purple and cyan crystals, stalactites, stone floor. Style: pixel art, high-quality modern indie visual novel look, late-night café mood, limited palette of warm brick browns, deep plum and navy shadows, soft cream highlights, small neon green and pink accents, clean dark 1px outlines, soft cel shading, visible square pixels, slightly mature anime proportions (not chibi). Friendly cozy game character art. No text, no logo, no frame, no watermark.
```

### หอคอยดวงดาว → `tower.png`
```
Background scene only, no characters, square 1024x1024. First-person view looking down toward the horizon; the horizon line sits about one third from the top and the lower two thirds is empty open ground receding into the distance. Location: the courtyard of a tall star-gazing tower under a starry night sky, golden windows, stone tiles. Style: pixel art, high-quality modern indie visual novel look, late-night café mood, limited palette of warm brick browns, deep plum and navy shadows, soft cream highlights, small neon green and pink accents, clean dark 1px outlines, soft cel shading, visible square pixels, slightly mature anime proportions (not chibi). Friendly cozy game character art. No text, no logo, no frame, no watermark.
```

## 5. ไอคอนอุปกรณ์ (ไม่จำเป็น)
เซฟเป็น `assets/gear/<ชื่อไฟล์>.png` · แทนคำว่า ITEM และ TIER ใน prompt นี้

```
A single item icon for an RPG inventory, centered, square 1024x1024, transparent background. Item: ITEM. TIER Style: pixel art, high-quality modern indie visual novel look, late-night café mood, limited palette of warm brick browns, deep plum and navy shadows, soft cream highlights, small neon green and pink accents, clean dark 1px outlines, soft cel shading, visible square pixels, slightly mature anime proportions (not chibi). Friendly cozy game character art. No text, no logo, no frame, no watermark.
```

TIER: R ใช้ `plain and simple, no glow.` · SR ใช้ `detailed, faint purple glow.` · SSR ใช้ `ornate with gold trim, golden glow and sparkles.`

| ไฟล์ | ระดับ | ITEM |
|---|---|---|
| `rustblade.png` | R | rusty iron combat knife |
| `willow.png` | R | willow-wood charm carved like a gun stock |
| `neonblade.png` | SR | neon green glowing blade |
| `shadowbow.png` | SR | moonlit black rifle scope |
| `fang.png` | SSR | dark curved fang dagger |
| `starstaff.png` | SSR | staff topped with a star |
| `leather.png` | R | worn leather vest |
| `apron.png` | R | barista apron |
| `ironplate.png` | SR | steel chest plate |
| `nightcloak.png` | SR | midnight blue cloak |
| `dragonmail.png` | SSR | red dragon-scale armor |
| `saintrobe.png` | SSR | white and gold robe |
| `copperring.png` | R | copper ring |
| `beanamulet.png` | R | coffee bean amulet |
| `owlfeather.png` | SR | owl feather |
| `moonring.png` | SR | crescent moon ring |
| `phoenix.png` | SSR | fiery phoenix feather |
| `eclipse.png` | SSR | solar eclipse pendant |
