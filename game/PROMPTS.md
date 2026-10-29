# Prompt สำหรับเจนภาพ (GPT / ChatGPT)

ตัวละครทุกตัวเป็นผู้หญิงอายุ 25 แนวเซ็กซี่แบบเกมกาชา (ใส่เสื้อผ้าครบ ถ้าใช้คำโจ่งแจ้งเกินไป GPT จะปฏิเสธ)

ทุก prompt ก๊อปไปวางได้ทั้งก้อน ไม่ต้องต่ออะไรเพิ่ม เซฟตาม **ชื่อไฟล์** แล้ววางในโฟลเดอร์ `game/assets/...` เกมจะใช้ภาพนั้นแทนภาพพิกเซลเอง ทำทีละภาพก็ได้

## เคล็ดลับ
- เกมเป็นแนวแฟนตาซี อาวุธเป็นดาบ ธนู เวท ไม่มีปืน
- กดปุ่มดาวน์โหลดในแอป GPT เพื่อเซฟไฟล์จริง อย่าแคปหน้าจอ เพราะพื้นใสจะหาย
- ทำภาพหน้าตรงกับภาพหันหลังของตัวเดียวกัน **ในแชทเดียวกัน** หน้าตาจะได้ตรงกัน (ทำ 1 แชทต่อ 1 ตัว)
- ถ้าพื้นหลังไม่โปร่งใส พิมพ์ต่อว่า `make the background transparent`
- ชื่อไฟล์ใช้ตัวพิมพ์เล็ก นามสกุล `.png`
- ระดับ R / SR / SSR ใส่ไว้ใน prompt แล้ว: R ชุดเรียบ ไม่มีเอฟเฟกต์ · SR ชุดละเอียดขึ้น มีออร่าม่วง · SSR ชุดหรู ขอบทอง แสงวิบวับ

## 1. ฮีโร่: ภาพหน้าตรง
ใช้ในการ์ด กาชา กล่องคำพูด และฉาก BURST · เซฟเป็น `assets/portraits/<ชื่อไฟล์>.png`

### เบลล์ · R · ไรเฟิล → `bell.png`
```
Half-body character portrait from the waist up, facing the viewer at a slight three-quarter angle, square 1024x1024, transparent background. Character: a calm young woman with long brown hair, steel-grey adventurer jacket, holding a slim longsword. Rarity R (common): simple practical outfit, plain colors, few accessories, relaxed pose, plain soft lighting, no special effects. Glamorous adult anime heroine, 25 years old, curvy figure, form-fitting stylish outfit, alluring confident smile, tasteful fan-service like a modern fantasy gacha game, fully clothed. Style: pixel art, high-quality modern gacha game look, late-night city mood, warm browns, deep plum and navy shadows, cream highlights, neon green and pink accents, clean dark outlines, soft cel shading, visible square pixels. No text, no logo, no frame, no watermark.
```

### เฟน · R · สไนเปอร์ → `fen.png`
```
Half-body character portrait from the waist up, facing the viewer at a slight three-quarter angle, square 1024x1024, transparent background. Character: a focused young woman with a green ponytail, olive ranger coat with brown leather straps, holding an elegant wooden longbow. Rarity R (common): simple practical outfit, plain colors, few accessories, relaxed pose, plain soft lighting, no special effects. Glamorous adult anime heroine, 25 years old, curvy figure, form-fitting stylish outfit, alluring confident smile, tasteful fan-service like a modern fantasy gacha game, fully clothed. Style: pixel art, high-quality modern gacha game look, late-night city mood, warm browns, deep plum and navy shadows, cream highlights, neon green and pink accents, clean dark outlines, soft cel shading, visible square pixels. No text, no logo, no frame, no watermark.
```

### พิม · R · จรวด → `pim.png`
```
Half-body character portrait from the waist up, facing the viewer at a slight three-quarter angle, square 1024x1024, transparent background. Character: a cheerful clumsy woman with a pink bob haircut, purple jacket, wearing a pointed witch hat, holding a magic staff with a glowing pink fire orb. Rarity R (common): simple practical outfit, plain colors, few accessories, relaxed pose, plain soft lighting, no special effects. Glamorous adult anime heroine, 25 years old, curvy figure, form-fitting stylish outfit, alluring confident smile, tasteful fan-service like a modern fantasy gacha game, fully clothed. Style: pixel art, high-quality modern gacha game look, late-night city mood, warm browns, deep plum and navy shadows, cream highlights, neon green and pink accents, clean dark outlines, soft cel shading, visible square pixels. No text, no logo, no frame, no watermark.
```

### น้อย · R · SMG → `noi.png`
```
Half-body character portrait from the waist up, facing the viewer at a slight three-quarter angle, square 1024x1024, transparent background. Character: a gentle young woman with long black hair, cream white medic outfit with mint green details, holding an open glowing spell book. Rarity R (common): simple practical outfit, plain colors, few accessories, relaxed pose, plain soft lighting, no special effects. Glamorous adult anime heroine, 25 years old, curvy figure, form-fitting stylish outfit, alluring confident smile, tasteful fan-service like a modern fantasy gacha game, fully clothed. Style: pixel art, high-quality modern gacha game look, late-night city mood, warm browns, deep plum and navy shadows, cream highlights, neon green and pink accents, clean dark outlines, soft cel shading, visible square pixels. No text, no logo, no frame, no watermark.
```

### การ์เน็ต · SR · ช็อตกัน → `garnet.png`
```
Half-body character portrait from the waist up, facing the viewer at a slight three-quarter angle, square 1024x1024, transparent background. Character: a tall strong woman with a dark bob haircut and tan skin, navy heavy armor with brass plates, holding a big tower shield, protective stance. Rarity SR (rare): more detailed outfit with distinctive accessories, confident pose, soft violet rim light, faint purple aura and a few small glowing particles. Glamorous adult anime heroine, 25 years old, curvy figure, form-fitting stylish outfit, alluring confident smile, tasteful fan-service like a modern fantasy gacha game, fully clothed. Style: pixel art, high-quality modern gacha game look, late-night city mood, warm browns, deep plum and navy shadows, cream highlights, neon green and pink accents, clean dark outlines, soft cel shading, visible square pixels. No text, no logo, no frame, no watermark.
```

### เว็กซ์ · SR · SMG → `vex.png`
```
Half-body character portrait from the waist up, facing the viewer at a slight three-quarter angle, square 1024x1024, transparent background. Character: a mysterious rogue with pale skin and violet hair under a dark hood, black cloth over the mouth, crimson details, holding twin daggers. Rarity SR (rare): more detailed outfit with distinctive accessories, confident pose, soft violet rim light, faint purple aura and a few small glowing particles. Glamorous adult anime heroine, 25 years old, curvy figure, form-fitting stylish outfit, alluring confident smile, tasteful fan-service like a modern fantasy gacha game, fully clothed. Style: pixel art, high-quality modern gacha game look, late-night city mood, warm browns, deep plum and navy shadows, cream highlights, neon green and pink accents, clean dark outlines, soft cel shading, visible square pixels. No text, no logo, no frame, no watermark.
```

### มิระ · SR · ไรเฟิล → `mira.png`
```
Half-body character portrait from the waist up, facing the viewer at a slight three-quarter angle, square 1024x1024, transparent background. Character: an elegant woman with long icy light-blue hair, blue coat with frosty white details, holding a crystal staff that glows with magical ice. Rarity SR (rare): more detailed outfit with distinctive accessories, confident pose, soft violet rim light, faint purple aura and a few small glowing particles. Glamorous adult anime heroine, 25 years old, curvy figure, form-fitting stylish outfit, alluring confident smile, tasteful fan-service like a modern fantasy gacha game, fully clothed. Style: pixel art, high-quality modern gacha game look, late-night city mood, warm browns, deep plum and navy shadows, cream highlights, neon green and pink accents, clean dark outlines, soft cel shading, visible square pixels. No text, no logo, no frame, no watermark.
```

### แทมมี่ · SR · ปืนกล → `tammy.png`
```
Half-body character portrait from the waist up, facing the viewer at a slight three-quarter angle, square 1024x1024, transparent background. Character: an energetic musician woman with a golden ponytail and brown skin, red jacket, playing an ornate lute. Rarity SR (rare): more detailed outfit with distinctive accessories, confident pose, soft violet rim light, faint purple aura and a few small glowing particles. Glamorous adult anime heroine, 25 years old, curvy figure, form-fitting stylish outfit, alluring confident smile, tasteful fan-service like a modern fantasy gacha game, fully clothed. Style: pixel art, high-quality modern gacha game look, late-night city mood, warm browns, deep plum and navy shadows, cream highlights, neon green and pink accents, clean dark outlines, soft cel shading, visible square pixels. No text, no logo, no frame, no watermark.
```

### รูบี้ · SSR · ช็อตกัน → `ruby.png`
```
Half-body character portrait from the waist up, facing the viewer at a slight three-quarter angle, square 1024x1024, transparent background. Character: a confident demon woman with lilac-pink skin, long dark hair, curled red horns with swirl patterns, pointed ears, dark navy jacket, holding a huge dark greatsword resting on her shoulder, half-lidded eyes. Rarity SSR (super rare): ornate luxurious outfit with gold trim and unique details, dramatic dynamic pose, strong golden rim light, glowing aura, sparkles and floating light motes, the most impressive and eye-catching look. Glamorous adult anime heroine, 25 years old, curvy figure, form-fitting stylish outfit, alluring confident smile, tasteful fan-service like a modern fantasy gacha game, fully clothed. Style: pixel art, high-quality modern gacha game look, late-night city mood, warm browns, deep plum and navy shadows, cream highlights, neon green and pink accents, clean dark outlines, soft cel shading, visible square pixels. No text, no logo, no frame, no watermark.
```

### ไคดะ · SSR · จรวด → `kaida.png`
```
Half-body character portrait from the waist up, facing the viewer at a slight three-quarter angle, square 1024x1024, transparent background. Character: a fierce dragon woman with spiky red hair, crimson dragon wings, dark red armor, holding a long dragon spear. Rarity SSR (super rare): ornate luxurious outfit with gold trim and unique details, dramatic dynamic pose, strong golden rim light, glowing aura, sparkles and floating light motes, the most impressive and eye-catching look. Glamorous adult anime heroine, 25 years old, curvy figure, form-fitting stylish outfit, alluring confident smile, tasteful fan-service like a modern fantasy gacha game, fully clothed. Style: pixel art, high-quality modern gacha game look, late-night city mood, warm browns, deep plum and navy shadows, cream highlights, neon green and pink accents, clean dark outlines, soft cel shading, visible square pixels. No text, no logo, no frame, no watermark.
```

### เอลาร่า · SSR · ไรเฟิล → `elara.png`
```
Half-body character portrait from the waist up, facing the viewer at a slight three-quarter angle, square 1024x1024, transparent background. Character: a serene saint with long pale golden hair and a glowing halo, white and gold robe, holding an ornate white and gold holy staff. Rarity SSR (super rare): ornate luxurious outfit with gold trim and unique details, dramatic dynamic pose, strong golden rim light, glowing aura, sparkles and floating light motes, the most impressive and eye-catching look. Glamorous adult anime heroine, 25 years old, curvy figure, form-fitting stylish outfit, alluring confident smile, tasteful fan-service like a modern fantasy gacha game, fully clothed. Style: pixel art, high-quality modern gacha game look, late-night city mood, warm browns, deep plum and navy shadows, cream highlights, neon green and pink accents, clean dark outlines, soft cel shading, visible square pixels. No text, no logo, no frame, no watermark.
```

### โมจิ · SSR · สไนเปอร์ → `mochi.png`
```
Half-body character portrait from the waist up, facing the viewer at a slight three-quarter angle, square 1024x1024, transparent background. Character: a sleepy cat-eared woman with a white bob haircut, white cat ears and tail, dark grey hoodie with a long green knitted scarf, holding a katana. Rarity SSR (super rare): ornate luxurious outfit with gold trim and unique details, dramatic dynamic pose, strong golden rim light, glowing aura, sparkles and floating light motes, the most impressive and eye-catching look. Glamorous adult anime heroine, 25 years old, curvy figure, form-fitting stylish outfit, alluring confident smile, tasteful fan-service like a modern fantasy gacha game, fully clothed. Style: pixel art, high-quality modern gacha game look, late-night city mood, warm browns, deep plum and navy shadows, cream highlights, neon green and pink accents, clean dark outlines, soft cel shading, visible square pixels. No text, no logo, no frame, no watermark.
```

### มาสเตอร์ (เจ้าของร้าน) → `master.png`
```
Half-body character portrait from the waist up, facing the viewer, square 1024x1024, transparent background. Character: a calm elegant café owner woman with long dark hair, black barista shirt and a cream apron, polishing a coffee cup. Glamorous adult anime heroine, 25 years old, curvy figure, form-fitting stylish outfit, alluring confident smile, tasteful fan-service like a modern fantasy gacha game, fully clothed. Style: pixel art, high-quality modern gacha game look, late-night city mood, warm browns, deep plum and navy shadows, cream highlights, neon green and pink accents, clean dark outlines, soft cel shading, visible square pixels. No text, no logo, no frame, no watermark.
```

## 2. ฮีโร่: ตัว chibi ในฉากต่อสู้
พิมพ์ต่อในแชทเดียวกับภาพหน้าตรงของตัวนั้น · เซฟเป็น `assets/heroes/<ชื่อไฟล์>.png` (ชื่อเดียวกับภาพหน้าตรง ไม่ต้องทำมาสเตอร์)

```
Now draw this same character as a small chibi pixel art game sprite: same hair, outfit colors and weapon, full body from head to feet, standing in a battle-ready pose facing right. Style: chibi pixel art like a modern mobile pixel RPG, about 2.5 heads tall, big head and big eyes, small body, bright saturated colors, crisp dark outline, rich detailed shading, 3/4 top-down view, keep the same rarity glow. Single character only, transparent background, square 1024x1024, no text.
```

## 3. มอนสเตอร์ (chibi)
เซฟเป็น `assets/monsters/<ชื่อไฟล์>.png` · แทนคำว่า MONSTER ด้วยคำอธิบายในตาราง

```
A single chibi pixel art monster sprite for a mobile pixel RPG: MONSTER. Full body, cute but a little menacing, facing right. Style: chibi pixel art like a modern mobile pixel RPG, about 2.5 heads tall, big head and big eyes, small body, bright saturated colors, crisp dark outline, rich detailed shading, 3/4 top-down view. Transparent background, square 1024x1024, no text.
```

| ไฟล์ | มอน | MONSTER |
|---|---|---|
| `slime.png` | สไลม์กาแฟ | a blob slime made of coffee with milk foam on top, two small eyes |
| `rat.png` | หนูพกระเบิด | a scruffy grey rat carrying a round bomb with a lit fuse |
| `alleycat.png` | แมวจรผี | a black ghost alley cat with glowing neon green eyes |
| `shroom.png` | เห็ดสปอร์ | a walking red mushroom puffing glowing green healing spores |
| `wolf.png` | หมาป่าเงา | a shadowy indigo wolf with yellow eyes |
| `bat.png` | ค้างคาวถ้ำ | a purple cave bat with red eyes, wings spread, flying |
| `golem.png` | โกเลมหิน | a stone golem holding a big rock shield, glowing cyan crystals |
| `ghost.png` | วิญญาณหลงทาง | a pale floating ghost with a wavy tail |
| `skeleton.png` | อัศวินกระดูก | a skeleton knight with a round shield and red glowing eyes |
| `imp.png` | อิมป์หมอผี | a small red imp shaman with horns, holding a glowing staff |
| `boss1.png` | บอส ราชาสไลม์ลาเต้ | a giant king slime made of latte with foam art and a gold crown, boss monster, imposing |
| `boss2.png` | บอส จ่าฝูงจันทร์เสี้ยว | a huge alpha wolf with dark navy fur, crescent moon mark, red eyes, gold crown, boss monster, imposing |
| `boss3.png` | บอส โกเลมคริสตัล | a massive purple crystal golem with glowing pink cores and a gold crown, boss monster, imposing |
| `boss4.png` | บอส ลิชดวงดาว | a hooded lich sorcerer made of starlight, glowing blue eyes, gold crown, holding a staff, boss monster, imposing |

## 4. แผนที่ (ภาพเดียวใช้ทั้งแผนที่)
ไม่ต้องโปร่งใส · เซฟเป็น `assets/bg/<ชื่อไฟล์>.png` · เกมจะใช้ภาพนี้เป็นพื้นทั้งด่าน กล้องเลื่อนดูทีละส่วน

```
A top-down pixel art RPG map seen from above at a slight angle, like a mobile pixel RPG level, square 1024x1024. A large open walkable area in the middle with a winding path, the edges framed by LOCATION_EDGE, small details scattered on the ground. Location: LOCATION. No characters, no monsters, no text, no UI. Bright saturated colors, crisp detailed pixel art.
```

| ไฟล์ | ฉาก | LOCATION | LOCATION_EDGE |
|---|---|---|---|
| `alley.png` | ตรอกนีออน | a cobblestone town square at night behind a cozy café, warm street lamps, crates, neon signs, puddles | brick buildings and rooftops |
| `forest.png` | ป่าหิ่งห้อย | a forest clearing at night with fireflies, mossy grass, flowers, mushrooms, stone lanterns | dense pine trees and ruins |
| `cave.png` | ถ้ำคริสตัล | a crystal cave floor with glowing purple and cyan crystals, stone tiles, small pools | jagged rock walls |
| `tower.png` | หอคอยดวงดาว | the rooftop courtyard of a star-gazing tower at night with rune circles on the floor and star patterns | stone pillars and railings under a starry sky |

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
