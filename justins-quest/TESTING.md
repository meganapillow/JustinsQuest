# Verification

Verified on September 27, 2026.

## Automated checks

The game source passed JavaScript syntax checking. A simulation harness with a mocked page and drawing surface passed 15 checks covering:

1. Start screen and every intro card.
2. Horizontal movement, jumping, gravity, and ground collision.
3. Landing on raised platforms.
4. Nearby pit recovery without health loss.
5. Checkpoint healing, death, and retry location.
6. One-heart damage and temporary invulnerability.
7. Coins, hearts, chest contents, and temporary power-ups.
8. Sword defeat of all 11 ordinary enemy types.
9. Ogre vulnerability timing, one hit per rest, and forest transition.
10. Necromancer teleport/summon logic and cavern transition.
11. Dragon Knight defeat, throne room, and king title card.
12. King transformation, dragon head damage, and Megan rescue trigger.
13. Rescue dialogue, Tina credits, and complete Play Again reset.
14. Pausing and resuming without counting paused time.
15. Drawing every scene and all three world layouts without missing references.

An additional full-route simulation drove ordinary movement, pit jumps, and sword inputs across all lands and boss fights. It reached THE END in 487 seconds of active gameplay, with 31 enemies/bosses defeated and no deaths. That is an optimized run with immediate dialogue advancement, not a measured first-time human completion time. The intended casual pace is approximately 10–20 minutes.

## Browser inspection

The game was opened in the Codex browser through a local static server. The start screen, opening story, forest gameplay, cavern gameplay, HUD, and narrow responsive layout rendered. Browser logs reported no warnings or errors during this inspection. The game uses only local HTML, CSS, and JavaScript; there are no remote asset dependencies.

The full-route test is a game-logic simulation, not a substitute for a human playtest on every browser. Physical phone touch controls, iOS fullscreen support, and a published GitHub Pages deployment have not been tested on-device. The project has not been published to an external host.

## Quick hands-on check after edits

Open index.html. Move, jump onto a platform, swing at an enemy, collect a coin, and cross a checkpoint. Check that a pit returns you nearby. Let health reach zero and choose TRY AGAIN. Confirm the checkpoint position and restored hearts. For each boss, wait through the warning and attack during the pause. Complete the rescue and Tina credits, then choose PLAY AGAIN. Check mute, pause, and touch controls on the devices you intend to use.
