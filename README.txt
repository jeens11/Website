JAWAD NAHEEN SHAMIM — PORTFOLIO WORLD

RUN LOCALLY (MAC)
1. Extract jawad-design-portfolio.zip.
2. Open Terminal in the extracted jawad-design-portfolio folder (the folder
   that directly contains index.html).
3. Run: python3 serve.py
   (serve.py is a small server included here. Use it instead of
   `python3 -m http.server`, which cannot seek video, so the demo video will
   not play in Safari.)
4. Open http://localhost:8000 in Chrome or Safari.
5. Leave Terminal running while you use the site.

If port 8000 is already in use, stop the other server with Ctrl+C in its
Terminal, or run: python3 -m http.server 8001
Then open http://localhost:8001 (use `python3 serve.py 8001`).

Do not open index.html directly with file://. The site loads its section files
with fetch(), so it needs a local HTTP server. The 3D world also loads Three.js
from jsDelivr and needs an internet connection. If WebGL or the CDN is
unavailable, choose “Classic site” to browse the content.

CONTROLS
Desktop: W accelerates, S brakes and reverses, and A/D steer. Arrow keys work
the same way. Hold Space to drift. Press E or Enter near a destination to open
it. Press R to reset the car. Glowing chevron pads boost the car. The Sound button in the top bar turns
the synthesized engine, effects and music on or off (sound starts after your
first key press or click, as browsers require). Click any map marker
or top navigation link to open a section directly.

Phone or tablet: Drag the joystick up to accelerate and left or right to steer.
Hold Drift while steering. Drive close to a section and tap Open, or use the
map markers and menu for direct access.

PROJECT STRUCTURE
index.html                 Page shell and accessible interface landmarks
css/base.css               Theme, typography, and shared defaults
css/world.css              Header, 3D scene overlay, map, prompts, controls
css/sections.css           Portfolio overlays and section content styles
css/responsive.css          Tablet, phone, touch, and reduced-motion rules
js/main.js                 Application startup and dependency wiring
js/portfolio-data.js       Section labels, scene landmarks, and section paths
js/controls.js             Keyboard, joystick, drift, reset, and interaction input
js/navigation.js           Section loading, navigation, and classic reading view
js/world/drive-state.js    Shared input/car state adapted from your reference code
js/world/drive-physics.js  Keyboard/joystick movement, steering, drift, and boost
js/world/world.js          Three.js scene, render loop, and destination interaction
js/world/camera-rig.js     Fixed-distance chase camera and destination framing
js/world/player.js         Car model and Three.js visual synchronization
js/world/destinations.js   Portfolio landmarks, landing pads, labels, and boost pads
js/world/minimap.js        Map drawing and current-car marker
js/world/decoration.js     Center particle sculpture, neon skyline pillars, floating sparks
js/world/effects.js        Drift smoke, sparks and boost flame particles
js/audio.js                Synthesized engine, drift, boost, UI sounds and music
css/theme.css              Colors, gradients, animations and speedometer
sections/*.html            One editable content file per portfolio destination
assets/                    Project visuals, report, demo video, and résumé

The project is static HTML, CSS, and JavaScript. There is no build step.
