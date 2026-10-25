JAWAD NAHEEN SHAMIM — PORTFOLIO

The website opens as a scrolling portfolio on desktop, tablet, and mobile.
Projects, experience, skills, education, and contact are directly accessible.
The completed AirSculpt case study includes its demonstration, report, team
process figures, and selected iteration screenshots. The original 3D world is
available through Explore 3D; its library is requested only when selected.
Portfolio reading does not start audio or require WebGL.

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
js/world/minimap.js        Map drawing and current-car marker
js/world/decoration.js     Center particle sculpture, neon skyline pillars, floating sparks
js/world/effects.js        Drift smoke, sparks and boost flame particles
js/audio.js                Synthesized engine, drift, boost, UI sounds and music
css/theme.css              Colors, gradients, animations and speedometer
sections/*.html            One editable content file per portfolio destination
assets/                    Project visuals, report, demo video, and résumé

The project is static HTML, CSS, and JavaScript. There is no build step.
