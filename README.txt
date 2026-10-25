JAWAD NAHEEN SHAMIM — PORTFOLIO

The website opens in the drivable 3D world (the home screen). Six numbered
destinations sit around the arena: 01 Work, 02 Skills, 03 Philosophy,
04 Experience, 05 About, 06 Contact. The same order and numbers are used in
every menu, tab, map marker and page. Press 1-6 to jump to a section, or use
"View without 3D" for an ordinary scrolling page with everything on it. Links
to a section (for example /#projects) open that view there. Devices without
WebGL get it automatically.

UPDATE THE LIVE WEBSITE THROUGH GITHUB
1. Download and unzip jawad-portfolio-final.zip.
2. Open the inner jawad-portfolio folder. Its contents include index.html,
   css, js, sections, assets, README.txt, CNAME, and serve.py.
3. Open https://github.com/jeens11/Website and select the main branch.
4. Choose Add file, then Upload files. Drag all the inner folder's contents
   into the upload area. The uploaded index.html must be at the repository
   root, alongside css, js, sections, and assets.
5. Wait for all uploads. Use a commit message such as
   "Update portfolio layout and add AirSculpt", then commit to main.
6. If the existing Vercel project tracks this repository's main branch,
   that commit triggers deployment. Check the project's Deployments page
   for successful completion, then refresh https://jawadnaheenshamim.com/.

RUN LOCALLY (MAC)
1. Unzip the website source or clone the repository.
2. Open Terminal in the folder that directly contains index.html.
3. Run: python3 serve.py
   (serve.py is a small server included here. Use it instead of
   `python3 -m http.server`, which cannot seek video, so the demo video will
   not play in Safari.)
4. Open http://localhost:8000 in Chrome or Safari.
5. Leave Terminal running while you use the site.

If port 8000 is already in use, run: python3 serve.py 8001
Then open http://localhost:8001.

Do not open index.html directly with file://. The site loads its section files
with fetch(), so it needs a local HTTP server. The optional 3D world loads
Three.js from jsDelivr and needs an internet connection. If WebGL or the CDN
is unavailable, the normal portfolio remains available automatically.

CONTROLS
Desktop: W accelerates, S brakes and reverses, and A/D steer. Arrow keys work
the same way. Hold Space to drift. Press E or Enter near a destination to open
it. Press R to reset the car. Glowing chevron pads boost the car. The Sound button in the top bar turns
the synthesized engine, effects and music on or off (sound starts after your
first key press or click, as browsers require). Click a map number, or a
board on the signpost beside the start, and the car drives itself there and
opens the section; press any drive key (or Esc) to take over. The top
navigation links and keys 1-6 open a section directly. "Back to start" appears
when the car is far from the start.

Phone or tablet: Drag the joystick up to accelerate and left or right to steer.
Hold Drift while steering. Drive close to a section and tap Open, or use the
map markers and menu for direct access. The joystick is analog: push it
partway for gentle steering and a lower speed.

As the car approaches a platform, a card previews what is inside; it can be
opened once the car is close. Short tips react to what the visitor is doing
(drifting, boost pads, the arena edge) and each shows once per browser. The
sky drifts slowly between dusk and midnight, and the headlights brighten as
it darkens. Visiting all six sections sets off fireworks and shows the resume,
email and non-3D links.

In the world, two billboards beside the Projects landmark show AirSculpt and
Four-Part Harmony. Drive up to one and press E (or tap Open), or click it, to
jump straight to that case study.

PERFORMANCE
Phones and low-core machines render at a lower resolution without shadows.
On every device the resolution adjusts automatically if frames run slow, and
the world pauses while a section or the portfolio is open.

PROJECT STRUCTURE
index.html                 Page shell and accessible interface landmarks
css/base.css               Theme, typography, and shared defaults
css/world.css              Header, 3D scene overlay, map, prompts, controls
css/sections.css           Portfolio overlays and section content styles
css/responsive.css          Tablet, phone, touch, and reduced-motion rules
css/portfolio.css           Default portfolio layout, mobile navigation, case studies
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
js/world/billboards.js     Project 01/02 screenshot billboards at the Work landmark
js/world/autopilot.js      Auto-drive to a map/signpost destination
js/world/signpost.js       Signpost by the start pointing to each section
js/world/sky.js            Slow dusk-to-midnight sky, fog and light cycle
js/world/tips.js           One-time contextual driving tips
js/world/minimap.js        Map drawing and current-car marker
js/world/decoration.js     Center particle sculpture, neon skyline pillars, floating sparks
js/world/effects.js        Drift smoke, sparks and boost flame particles
js/audio.js                Synthesized engine, drift, boost, UI sounds and music
css/theme.css              Colors, gradients, animations and speedometer
sections/*.html            One editable content file per portfolio destination
assets/                    Project visuals, report, demo video, and resume

The project is static HTML, CSS, and JavaScript. There is no build step.
