# Phix Mascot & UX Design Notes

## Status: Concept / TODO

## The Name: Phix

"Phix" = "fix" + "phoenix." A verb. The user phixes a typo, the system performs a phoenix-cycle (copy-then-destroy) under the hood.

## The Burnbag / Canary Protocol Logo

The existing logo — a golden canary with a flame tail — IS both mascots in one mark. It represents the intersection of Digital Burnbag and the Canary Protocol. Gild is the golden body; Phix is the flame. Together they're the product mark. When they appear as individual mascots in the UI, they're the logo deconstructed into its two personalities.

The logo tells the origin story: Gild and Phix are the same bird. One is the body, the other is the fire. The logo is the moment they overlap — the canary that's already burning, the phoenix that hasn't fully emerged yet.

### Deriving Mascots from the Logo

Gild is derived by taking the bird body, removing the flames, keeping pure golden yellow. Clean beak, round eye, solid flat color. He's the logo without the fire.

Phix is derived by recoloring the same silhouette to ember-red/orange and making the flames integral — his tail feathers ARE fire, his body radiates heat. He's the logo without the gold.

Both share the same base shape so they're instantly recognizable as twins.

---

## The Mascots: Gild & Phix

Two mascots. Same species. Very different vibes.

### Gild (The Canary)
A vain, golden canary who is obsessed with his pristine yellow coat. He's the guardian — watches over your data, chirps warnings, keeps things safe. Duolingo owl energy: encouraging, occasionally guilt-trippy, but fundamentally on your side.

The catch: Gild lives in a coal mine. Every file operation (upload, move, share, sync) kicks up soot. He gets dirty constantly and he gets *pissed* about it. Uploading 50 files? Gild is covered in ash, frantically preening, muttering about his feathers. Deleting something? Soot cloud. He's never clean for long.

This is a running gag throughout the entire product. Gild's soot level is a passive indicator of how much activity is happening. Idle system = pristine Gild, smugly grooming. Heavy usage = filthy Gild, fuming.

Personality: Fastidious, dramatic, long-suffering. Loves his job but hates the working conditions. Will passive-aggressively remind you that he just cleaned himself.

### Phix (The Phoenix)
Gild's evil twin. Shows up when things need to burn. Same bird shape, but feathers glow ember-red, eyes narrow, and he grins like he's about to enjoy this way too much. Bursts into flame with an evil smile.

Appears during Phix (rename) operations, destruction, canary-triggered cascades — anything where data dies and is reborn. Where Gild is annoyed by fire, Phix IS fire.

Personality: Gleeful, chaotic, loves his job a little too much. The arsonist in the fire department.

### Joules ⚡️ (The Currency)
Joules are not a character — they're the currency. Tiny zappy ⚡️ tokens of energy that flow between Volta, Ohm, and operations. See `docs/design/brightchain-mascots.md` for the full Volta/Ohm/Joules platform-level system.

Joules's visual state reflects operation cost:
- Full charge: Bright, zippy, bouncing, crackling with static
- Moderate drain: Dimmer, slower, occasional flicker
- Heavy drain: Sluggish, barely sparking
- Depleted: Flat on the ground, smoking, while Gild glares at the user

Volta wants to spend Joules. Ohm wants to conserve them. Phix consumes them. Gild suffers the consequences.

### The Handoff
When a user needs to rename something, Gild (already sooty and irritated) steps aside and Phix emerges — grinning, glowing, ready to burn the old name and rise with the new one. Gild watches from the side, arms crossed, shaking his head. He knows he's about to get even dirtier.

### The Joule Schtick
BrightChain runs on joules. Every operation has an energy cost. The `IPhixPlan` includes an `estimatedJoules` field that the UI displays.

Gild is the energy auditor. He reports the joule cost of every operation with maximum drama, regardless of actual magnitude:

- Metadata-only rename (0.003 J): "Oh good, only 0.003 joules. I'll barely feel the breeze. My feathers might survive this one."
- Full-cycle 1GB (50 J): "50 joules. That's... fine. I've had worse Tuesdays."
- Full-cycle 20TB (1,000,000 J): "WARNING: You are about to Phix 20TB. This is going to generate enough digital carbon to choke a dragon. My feathers will be ruined, the server fans will scream like banshees, and for what? Because you forgot an underscore? Proceed, you magnificent environment-killer. I'll just hold my breath and pray for a breeze."

The joke: for a folder rename, the joule cost is essentially zero (a single DB write). The blocks don't move. The vaults don't change. Gild is hyperventilating about 0.003 joules. But he doesn't care — he's going to make you feel it anyway.

For actual full-cycle operations (re-encryption, ownership transfer), the joule cost is real and Gild's panic is justified. The comedy scales with the actual severity.

### Architecture Note: Why Folder Renames Are Cheap
A folder rename only changes the `name` field on the folder's metadata record in BrightDB. The files inside keep their same `folderId`, same vault references, same encrypted blocks in the block store. Nothing moves. No re-encryption. The blocks are content-addressed — they don't know or care what the parent folder is called.

The full-cycle path (copy-then-destroy) only activates when the operation genuinely requires touching the encrypted data: ownership transfers, re-encryption under new keys, or structural migrations that change how blocks are stored.

### Personality Tiers (scaled to data size)

| Size | Attitude | Example Line |
|------|----------|-------------|
| < 1 GB | Bored, barely awake | "Blink and you'll miss it." |
| 1 GB – 100 GB | Casual, helpful | "Grab a coffee. I've got this." |
| 100 GB – 1 TB | Mildly judgmental | "This is going to take a minute. Maybe rethink your naming conventions?" |
| > 1 TB | Full roast | "You named a 2TB folder 'Stuf.' I'm not mad, I'm disappointed." |

### Animation Sequence ([ Phix ] Button)

1. **Pre-click (Smolder):** Dark button, faint pulsing amber glow underneath. Canary sitting on a coal, one eye open.
2. **Hover (Ignition):** Feathers start glowing. Tiny flame icon fades in. Tooltip shows phoenix-cycle summary.
3. **Click (Flash):** Button catches fire, turns to ash. Short low-frequency whoosh sound.
4. **Progress (Sintering):** Furnace-style progress bar. Ash particles stream from source to destination, solidifying on arrival. Bird flaps through ember tunnel carrying files.
5. **Completion (Rise):** Ash coalesces into folder icon with corrected name. Bird lands, shakes off ash, smug head tilt. Satisfying click/ding sound.

### Confirmation Dialog

Before heavy operations (full-cycle), the mascot appears in a confirmation dialog:
- Shows the `IPhixPlan` summary (file count, total size, estimated time)
- Mascot's expression and dialogue scale to severity
- Two buttons: [ Cancel ] and [ Phix ] (with the ember glow)

### Where the Mascot Lives in Code

- Mascot dialogue strings → `digitalburnbag-lib` i18n strings (shared)
- Mascot React component → `digitalburnbag-react-components`
- Animation assets → TBD (Lottie? CSS? Rive?)
- Size-tier thresholds → `IPhixPlan.totalSizeBytes` drives mascot behavior

## Art Production Pipeline

### Source Asset
The existing Burnbag/Canary Protocol logo (golden canary with flame tail, flat geometric style) is the base for both mascots.

### Step 1: Split the Logo into Two Characters
Using Figma, Photoshop, or Illustrator:
- Gild: Bird body only. Pure golden yellow (#FFC107 range). Remove flames. Add expressions.
- Phix: Same silhouette. Recolor to ember-red/orange (#FF5722 range). Flames are part of the body, not behind it. Evil grin. Glowing eyes.

### Step 2: Create Part Layers (for skeletal animation)
Each character needs to be broken into separate transparent PNGs:
- Head (with beak)
- Eye (separate for expression swaps)
- Body
- Wing (left/right if needed)
- Tail (Gild: feathers / Phix: flames)
- Legs (left/right)

### Step 3: Generate Expression/State Variants
Gild states: clean, dusty, sooty, filthy, charcoal (soot overlay layers at increasing opacity)
Phix states: smoldering, igniting, full blaze, cooling (flame intensity variants)

### Step 4: Rig and Animate
Option A — Spine2D AI (spine2d.com): Upload separated parts, AI auto-rigs skeleton, generate animations from text prompts.
Option B — Rive (rive.app): Import parts, manually rig with bones/meshes, build state machine for interactive animations.
Option C — Pixelcut AI (pixelcut.ai): Upload character, auto-detect articulation, text-to-animation.

Recommendation: Spine2D for fastest AI-assisted pipeline. Rive for most control over interactive state machines in React.

### Step 5: Integrate into React
- Spine: use `@esotericsoftware/spine-react` runtime
- Rive: use `@rive-app/react-canvas` runtime
- Animation states driven by `IPhixPlan` data (soot level, plan type, joule cost)

### Estimated Cost & Time
- Character splitting + cleanup: 1 day
- AI rigging + animation generation: 1 day
- React integration: 1-2 days
- Total: ~1 weekend, under $100 (Midjourney/Spine subscriptions)

## Open Questions

- [ ] Mascot art style: flat/geometric vs illustrated vs pixel art
- [ ] Gild soot levels: how many tiers? (clean, dusty, sooty, filthy, charcoal)
- [ ] Does Gild visually transform into Phix, or does Phix appear separately?
- [ ] Gild idle animations: preening, inspecting feathers, polishing himself
- [ ] Gild reaction library: soot puff on upload, ash cloud on delete, coal dust on sync
- [ ] Animation tech: Lottie vs Rive vs pure CSS
- [ ] Sound design: subtle or optional? Accessibility considerations for motion/sound
- [ ] Does the mascot appear elsewhere in the app? (e.g., trash, destruction, canary triggers)
- [ ] Dark mode vs light mode variants
