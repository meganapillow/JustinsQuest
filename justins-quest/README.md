# Justin’s Quest

A complete original browser platformer and a very important rescue mission.

## Play locally

1. Keep `index.html`, `style.css`, and `game.js` in the same folder.
2. Double-click `index.html` to open it in a modern browser (Chrome, Safari, Firefox, or Edge).
3. Choose **START ADVENTURE**.

No installation, internet connection, backend, account, API key, or build step is needed. All artwork is drawn with Canvas and sound effects use Web Audio. There are no external fonts, images, libraries, or other asset downloads. Sound starts after your first interaction. The game has sound effects, but no background music.

If you prefer a local website and already have Python, open a terminal in this folder and run `python3 -m http.server 8000`, then visit `http://localhost:8000`.

## Controls

| Action | Keyboard |
| --- | --- |
| Move | Left / Right arrows or A / D |
| Jump | Space (also W / Up) |
| Sword | X or J; hold to keep swinging |
| Pause / resume | P or Escape, or the Pause button |
| Sound | Sound button above the game |
| Fullscreen | Square-corners button above the game |

Phones and tablets with a touch screen show left, right, sword, and jump buttons. Landscape orientation gives you more room. Losing window focus pauses play. Use **KEEP GOING** to resume. Fullscreen depends on browser support.

## How to play

Walk right, jump small gaps, collect optional coins, and swing your sword near enemies. Platforms can be jumped through from below. Treasure chests open when you approach them or hit them. Tina is harmless; walk near her for a greeting.

- Five starting hearts; enemy contact removes one heart with a short invulnerability period.
- Frequent hearts, full healing at checkpoints and boss entrances, and unlimited retries.
- Pits return you to nearby safe ground without losing a heart.
- Flags at the midpoint and near each land’s boss save your position for the current session.
- The separate throne room starts with its own retry point at the entrance.
- Bosses display their warning, attack, and then rest. Strike during the rest. Only one hit counts in each rest window; keep swinging if timing is tricky.
- Jump when the ogre or dragon warns **JUMP!**. Give sword swings, charges, magic, and fire breath some space.
- The dragon lowers its head during its rest. Hit the head from the left.
- Bosses offer extra hearts when you are low. Retry restores your hearts and the current boss’s health.
- Chests contain coins plus a heart, a 20-second sword boost against small enemies, or 12 seconds of invincibility.

Coins are only a score. You never need a particular number to progress. A relaxed first run is intended to take around 10–20 minutes; confident players may finish sooner. Progress is session-only: refreshing or closing the page starts a new adventure. Death keeps defeated ordinary enemies, collected coins, and opened chests; bosses reset on retry. Paused time and dialogue time are excluded from the final timer.

## Files

- `index.html`: page structure, game frame, HUD, buttons, and keyboard hints.
- `style.css`: colors, type, layout, mobile controls, and overlays.
- `game.js`: settings, dialogue, maps, input, physics, combat, scenes, original pixel artwork, and generated sounds.
- `.nojekyll`: tells GitHub Pages to publish these static files directly.
- `TESTING.md`: verification summary and suggested hands-on checks.

## Edit the game

Open `game.js` in a plain-text editor. The **GAME CONFIGURATION** section at the very top contains the main settings. Save, then refresh the browser to see changes. Keep punctuation, commas, brackets, and quotes intact. Make a copy before experimenting.

### Dialogue and names

Edit `CONFIG.dialogue.intro`, `forest`, `cave`, `rescue`, and `signs`. Rescue dialogue uses pairs: `['Speaker', 'Their line']`. For apostrophes inside single-quoted text, use `\'`, or use double quotes around the whole line.

`playerName` and `princessName` personalize the HUD, browser title, and story panels. The dialogue strings use Justin and Megan as the original names and are automatically personalized when displayed. To change the page’s small outer branding too, edit its text in `index.html`. Other scene jokes are in `bossDefeated()`, `showRescue()`, `win()`, and `end()`.

### Starting health and lives

Change `maxHearts: 5` to your desired whole number (3–8 is a sensible display range). This controls starting health, checkpoint healing, boss-entry healing, and the heart display. Retries are unlimited by design; there is no lives counter to run out of.

### Boss health and difficulty

Edit the numbers in `bossHealth`:

```js
bossHealth: { ogre: 6, necromancer: 8, knight: 8, king: 8, dragon: 10 }
```

A successful sword strike removes one boss health point. The temporary sword boost affects ordinary enemies only. `bossCycle: 4.8` is the duration of an attack/rest cycle. `bossRestStarts: 2.5` controls when a boss becomes vulnerable; keep it below `bossCycle` and above the attack period (2.4 seconds). Default fights are roughly 30–60 seconds, depending on movement and timing.

`enemySpeed`, `enemyDamage`, `invulnerableSeconds`, `swordCooldown`, and `swordReach` control the basic difficulty. `enemyHealth` controls hits required per ordinary enemy. For an easier game, lower enemy health/speed, increase hearts, or increase invulnerability time.

### Add or remove enemies

Each entry of `levels` has an `enemies` list. Add or remove a name and the game redistributes the enemies along that level. Supported names:

- Forest: `slime`, `mushroom`, `goblin`
- Caverns: `bat`, `skeleton`, `ghost`, `mimic`
- Castle: `guard`, `imp`, `armor`, `dragonling`

You can mix types. Example: `enemies: ['slime', 'mushroom', 'slime']` makes three enemies. Use about 6–10 per land to preserve the easy pace.

### Change level layouts

Each `levels` entry includes:

- `length`: the total horizontal distance.
- `pits`: horizontal starting positions for 90-pixel gaps.
- `platforms`: `[x, y, width]` arrays; for example `[1200, 360, 180]` places a 180-pixel platform 80 pixels above the ground.
- `checkpoints`: fractions of level length; `.5` means halfway and `.91` means near the boss.
- `boss`: the boss type for that land.

The ground is at `y = 440`. Smaller y values are higher. Keep ordinary platforms around y = 340–360 and avoid stacking them over gaps until you have tested the jumps. Leave the final 950 pixels clear for the boss arena. Hearts, coins, chests, signs, and Tina are placed in `loadLevel()`.

`speed`, `jumpSpeed`, and `gravity` control movement. The original gap widths are safe with the default values; test all jumps if you change those values. Graphics are defined in `hero()`, `cat()`, `drawEnemy()`, `drawBoss()`, and `background()`.

## Deploy to GitHub Pages

You can publish this exact folder without any build tools.

1. Sign in to GitHub and create a repository, such as `justins-quest`. A public repository is the straightforward option for free GitHub Pages hosting. Its code and game will be publicly visible.
2. Choose **Add file → Upload files** and upload the contents of this folder to the repository root. `index.html` must be at the top level, alongside `game.js` and `style.css`, not nested inside another folder. Commit the upload to the main branch.
3. Open the repository’s **Settings → Pages**.
4. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
5. Select the `main` branch and `/ (root)` folder, then choose **Save**.
6. Wait for the Pages deployment to finish. GitHub displays the published link on that same page, usually `https://YOUR-USERNAME.github.io/justins-quest/`.
7. Open that link and test Start Adventure and sound. Share the link when you are happy with it.

Upload changed files and commit them to update the game. The relative file links work under a repository subpath. No secrets, environment settings, package installation, or server configuration are required.

Official guide: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

## Credits

Characters, scenery, mechanics, dialogue presentation, and sound synthesis were created for this game. No commercial game artwork, music, or character assets are included. Tina still receives 100% of the credit.
