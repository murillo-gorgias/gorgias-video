/**
 * The starter video: 1920 × 1080 at 30 fps, 16 seconds, 120 BPM.
 * STORYBOARD.md has the beat sheet and how to change things.
 */
import {fill} from './components.js';
import {close, hook, product} from './scenes.js';
import {SCENES} from './timeline.js';
import {COLOR} from './theme.js';

const scenes = [
  {from: SCENES.hook.start, to: SCENES.product.start, el: hook()},
  {from: SCENES.product.start, to: SCENES.close.start, el: product()},
  {from: SCENES.close.start, to: Infinity, el: close()},
];

document.body.append(fill({background: COLOR.paper, overflow: 'hidden'}, scenes.map((s) => s.el)));

window.video.onFrame((frame, seconds) => {
  for (const scene of scenes) {
    const active = seconds >= scene.from && seconds < scene.to;
    scene.el.style.display = active ? '' : 'none';
    if (active) scene.el.update(seconds);
  }
});
