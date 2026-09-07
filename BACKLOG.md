# Backlog

Known gaps the team has agreed to leave for later. Each entry: **what**, **why deferred**, **what unblocks**, **where**.

## Apps

### An orphaned Plex TCPRoute manifest
- **What:** `plex-media-stack/tcproute.yaml` defines a `TCPRoute` for `plex-tcp` on the public gateway, is absent from its `kustomization.yaml`, and no `TCPRoute` exists in the cluster — Plex on 32400 reaches the backend by another path, so it has never been in effect. (The huntarr half of this entry was resolved 2026-09-01: manifest, kustomization line and Renovate disable rule all deleted, along with the equally inert tdarr and cleanuparr manifests.)
- **Why deferred:** Deleting someone's disabled manifest is a judgement call, not a fix, and it costs nothing where it sits.
- **Unblock:** Decide whether Plex should route through the gateway's `plex-tcp` entrypoint; if yes add it to `kustomization.yaml` and confirm the listener exists, if no delete it.
- **Where:** `k8s/talos/apps/plex-media-stack/{tcproute.yaml,kustomization.yaml}`.

### Lock the proxied hostnames to Cloudflare with an IPAllowList
- **What:** `nordbye.it`, `blog.nordbye.it`, `gate.nordbye.it`, `headroom.nordbye.it` and `logeverylift.com` are proxied, but the origin still answers anyone who reaches it directly with the right Host header, so the WAF and the per-client rate limits in `k8s/talos/apps/{portfolio,blog}/ratelimit-middleware.yaml` can be skipped entirely.
- **Why deferred:** the ranges to allow are not known yet. Traefik's access log resolves X-Forwarded-For before writing the client address, so a Cloudflare-fronted request and a direct one look identical in it. What is visible is that requests arrive on the portfolio and blog routes from `10.3.10.1`, a LAN browser on a path carrying no Cloudflare header, which a Cloudflare-only list would answer with 403. `accessLog.format: json` was turned on to record `ClientAddr`, the real peer, alongside `ClientHost`.
- **Unblock:** after a few days of JSON logs, group `ClientAddr` per router for the five routes above and write the allowlist from what actually appears. Then revert `accessLog.format` (the comment above it in `values.yaml` says so). The middleware is `ipAllowList` on Traefik v3, attached per route through an `ExtensionRef` filter as the existing rate-limit middlewares are, and it must use the default `ipStrategy` rather than the `depth: 1` the rate limits use, otherwise a spoofed X-Forwarded-For walks through it. Traefik resolves `ExtensionRef` middlewares in the route's own namespace, so this needs one copy per app namespace or a shared kustomize base.
- **Where:** `k8s/talos/infra/traefik/values.yaml`, `k8s/talos/apps/{portfolio,blog,reelsmith,headroom-demo,logeverylift}/httproute.yaml`. The six proxied `bigd.no` hostnames belong in the same allowlist, but `audiobookshelf` and `seerr` must stay out of it while they are reached directly.

### Take audiobookshelf, seerr and plex off public DNS
- **What:** `bigd.no`, `www.bigd.no`, `hub.bigd.no`, `it-tools.bigd.no`, `mealie.bigd.no` and `omni-tools.bigd.no` are proxied. `audiobookshelf.bigd.no`, `seerr.bigd.no` and `ddns.bigd.no` are not, so the residential address is still published in this zone and the address stays public despite `nordbye.it` and `logeverylift.com` being clean.
- **Why deferred:** audiobookshelf serves audio, which Cloudflare's terms exclude outside Enterprise, and they enforce at the account level rather than per hostname. seerr is probably fine as HTML and JSON, but Jellyseerr can proxy TMDB posters through the origin, and if that setting is on it falls under the same clause. Neither can simply be annotated, so hiding the address means giving them a private path, and nothing like Tailscale exists in the cluster today.
- **Unblock:** check seerr's image proxy setting; if it is off, flip its HTTPRoute annotation to `"true"` like the others — external-dns now owns both records, so that is the only edit needed. audiobookshelf needs a private path, as does Plex. Once no public hostname points at it unproxied, `ddns.bigd.no` can go proxied too, but not before: Cloudflare resolves a DNS-only CNAME through to its target's answer, so proxying that record routes every hostname pointing at it through the edge whatever its own proxy flag says. Verified in the zone with a throwaway CNAME.
- **Where:** `k8s/talos/apps/{audiobookshelf,plex-media-stack}/httproute*.yaml`, `terraform/cloudflare/bigd-no/dns.tf`.

### Plex hardcodes the public address and bypasses DNS entirely
- **What:** `ADVERTISE_IP` is set to `http://84.212.143.165:32400/`, and Plex is a `TCPRoute` on port 32400 rather than an HTTP hostname. Plex hands that address to plex.tv and to every client, so no amount of DNS proxying hides it while remote access is on.
- **Why deferred:** it is the same decision as the entry above, and turning remote access off is a household call rather than a technical one.
- **Unblock:** decide whether Plex remote access is worth publishing the address. If it is, the hardcoded value should at least become a reference to something the DDNS client updates, because it silently breaks remote access the day Telia reassigns the address.
- **Where:** `k8s/talos/apps/plex-media-stack/plex.yaml:101`, `k8s/talos/apps/plex-media-stack/tcproute.yaml`.

### Retire Mealie's inert ScaledObject and interceptor hop
- **What:** Mealie is pinned to `minReplicaCount: 1` / `maxReplicaCount: 1`, so its `ScaledObject` triggers (cron + external-push) never fire. Its `HTTPRoute` still sends traffic through `keda-add-ons-http-interceptor-proxy` rather than straight at `mealie-service`, which is now a pointless extra hop.
- **Why deferred:** Removing the ScaledObject and InterceptorRoute and repointing the HTTPRoute is a structural change to the request path of a live household app, and the pin already fixes the logout bug on its own. Not worth bundling into the fix.
- **Unblock:** Delete `scaledobject.yaml` and `interceptorroute.yaml`, drop them from `kustomization.yaml`, and point the `HTTPRoute` `backendRefs` at `mealie-service` port 9000 (drop the cross-namespace ref to `keda`). Check whether `k8s/talos/infra/keda-http-add-on/referencegrant.yaml` still needs a mealie entry afterwards. Verify with `kubectl diff` before merging.
- **Where:** `k8s/talos/apps/mealie/{scaledobject,interceptorroute,httproute,kustomization}.yaml`, `k8s/talos/infra/keda-http-add-on/referencegrant.yaml`.

### Mealie still hard-logs-out every 48h (upstream)
- **What:** Mealie's frontend never refreshes its access token (`mealie-recipes/mealie#7835`) — only one `/api/auth/refresh` call appears across the whole app log. At `TOKEN_TIME` (default 48h) the token expires and the axios 401 interceptor wipes the cookie and redirects to `/login`. The replica pin fixes cold-start logouts but not this.
- **Why deferred:** The only local lever is raising `TOKEN_TIME`, which delays the logout rather than fixing it; the real fix is upstream implementing a refresh loop. Not worth changing config until we know whether a 48h re-login actually bothers anyone.
- **Unblock:** Either upstream ships automatic refresh (watch #7835), or add `TOKEN_TIME` to the Deployment env with a longer window and accept the longer-lived tokens.
- **Where:** `k8s/talos/apps/mealie/deployment.yaml` (env block).

## AI / RAG POC

### Eval harness
- **What:** Add a small labelled QA set against the committed fixture corpus (the four `contract_<slug>.pdf` files) and a `make eval` target that scores precision@k.
- **Why deferred:** Pipeline shape, multi-document loading, and the refusal prompt are all validated against the fixtures interactively. Quality measurement is the obvious next layer but requires a labelled set and a metric choice (precision@k vs. LLM-as-judge) that wasn't worth deciding mid-POC.
- **Unblock:** Author 15–25 QA pairs against the four fixtures (single-doc + cross-doc questions, plus a handful of out-of-corpus refusals), pick the metric, wire `make eval` to the existing chain.
- **Where:** `ai/projects/local-rag-poc/main.py`, `ai/projects/local-rag-poc/Makefile`, plus a new `ai/projects/local-rag-poc/evals/` directory.

## Infrastructure page

### Second consumer for the cluster status card

- **What:** The status card added to the README is drawn from `/api/v1/infra`, which the `status-publisher` CronJob fills. Two things were deliberately left out. The publisher still lives in the `portfolio` namespace and is named for it even though it now collects cluster-wide facts, and the `/infrastructure` page still renders only the original four (nodes, versions, ArgoCD, cert) while the payload now also carries `gitops`, `apps`, `security`, `observability`, `resources` and `storage`.
- **Why deferred:** Moving the publisher to its own namespace means standing up something to serve the JSON, since the portfolio pod is what serves it today, and that buys tidiness rather than capability while there is only one in-cluster consumer. Rewriting the `/infrastructure` page is its own design job, not part of shipping the card.
- **Unblock:** When a second in-cluster consumer appears (the homepage widget is the likely one), extract the CronJob and its RBAC into `k8s/talos/infra/` with a small nginx and route of its own, then repoint the portfolio at the shared URL. The page adopting the new keys can happen independently and needs no move.
- **Where:** `k8s/talos/apps/portfolio/status-publisher.yaml`, `portfolio/src/app/api/v1/infra/route.ts`, `portfolio/src/components/infrastructure/LiveStatus.tsx`, `scripts/render-status-card.mjs`, `.github/workflows/status-card.yaml`.

### The cabinet object covers only the Kubernetes hosts

- **What:** The homepage infrastructure section renders the whole estate as the BESTÅ it actually lives in — modem, gateway, Home Assistant box, NAS, switch, Hue bridge and the three ThinkCentres — and every one of them is clickable for its spec. Only the three ThinkCentres are backed by live data. The other six are drawn with their lights lit and never change, because `status-publisher` reads the Kubernetes API, ArgoCD and cert-manager and nothing else. Each of those six says so in its own detail panel, and `hardware.ts` carries a `live: false` flag for exactly this.
- **Why deferred:** The NAS, the UniFi gear and the Home Assistant box are each a separate collector with separate credentials — Synology DSM's API, the UniFi controller, the Home Assistant REST API — and none of them is reachable from the publisher's ServiceAccount today. That is a whole integration per device, not an extension of the existing jq.
- **Unblock:** Decide which of the six is worth wiring. The NAS is the one with a real story (it holds every PV in the cluster) and DSM exposes volume and drive health over its API; that needs a credential in Bitwarden, an `ExternalSecret`, and a second collector alongside the CronJob. Once a device reports, flip its `live` flag and drive its LEDs from the feed instead of the constant.
- **Where:** `portfolio/src/components/infrastructure/hardware.ts` (the `live` flag and `DEVICES`), `portfolio/src/components/infrastructure/BenchScene.tsx` (`Nas`, `Switch8`, `DeviceBox` LED constants), `k8s/talos/apps/portfolio/status-publisher.yaml`.

### Outside-in probing for the 30-day health strip
- **What:** The `/infrastructure` page now renders a 30-day health strip from per-day sample counts the status publisher accumulates in `status.json` (`history` array). It is labelled "observed in-cluster" because that is all it is: days where the publisher never ran show as gaps, but the strip cannot see the site being unreachable from the internet while the cluster is fine, and self-reported health proves less than an external probe.
- **Why deferred:** True availability needs an external prober (Uptime Kuma on another host, healthchecks.io, or a GitHub Actions schedule hitting the site) publishing daily results somewhere the static page can fetch.
- **Unblock:** Pick the prober, publish daily results as JSON the page can fetch (second file next to `status.json`, or merged into it), then swap the strip's data source and drop the "observed in-cluster" qualifier.
- **Where:** `portfolio/src/components/infrastructure/LiveStatus.tsx` (`buildUptime`), `k8s/talos/apps/portfolio/status-publisher.yaml` (history merge step).

## Portfolio

### Fun room: real-device pass, printer switches and melody
- **What:** The printer's rocker switches read their prompt correctly under the crosshair, but pressing `E` was reported to produce no visible change in the ON/OFF pill. Never reproduced in a browser with working pointer lock, so it may be a headless-harness artifact rather than a real fault.

  Two further loose ends in `/fun`. The synthesised rickroll's third line ("never gonna run around and desert you") is the least confident transcription and has never been listened to by anyone. And nothing here has been driven on real hardware: mouse-look and the cold-load loading bar have never run in a browser with working pointer lock, and the touch controls added 2026-07-20 (drag-to-look, tap-to-activate, walk stick, entry gate) were verified only by dispatching synthetic `TouchEvent`s in headless Chromium. That proves the wiring and says nothing about feel — look sensitivity, stick size and placement, and the tap slop threshold are all guesses at this point.
- **Why deferred:** Both need a human: one at a real browser with sound, one on an actual phone. Neither is checkable from headless Chromium.
- **Unblock:** Open `/fun` in a real browser, look at a printer switch, press `E`, and watch the pill. If it does not flip, instrument `onActivate` in `Interactive` — the registry hands activation the ref payload, so the suspect is either hover resolution or the keydown listener's `enabled` gate. Open `/fun` on a desktop, listen to the melody, hard-reload with cache disabled to see the loading bar. Then open it on a phone and tune `LOOK_SENS`, `TAP_SLOP_PX` and `STICK_R` in `Touch.tsx` against how it actually feels.
- **Where:** `portfolio/src/components/fun/Printer.tsx` (`Switch`), `portfolio/src/components/fun/interaction.tsx`; `portfolio/src/components/fun/Sonos.tsx` (`MELODY`), `portfolio/src/components/fun/Touch.tsx`, `docs/fun-room-guide.md` (known gaps).

### Fun flat: the parts of the plan not yet modelled
- **What:** `/fun` is the real apartment with all four spaces walkable, the north wall glazed and the entré's two built-ins modelled, but two things on the floor plan are still not built: the **P** marked in the living room (a post, or a flue), and **door leaves** for the bedroom and bathroom — those openings are cased and lined but carry no door, so neither room can be shut.
- **Why deferred:** Neither changes whether the flat is navigable or whether it reads correctly, and the shell, the windows, the merged TV bench and the furniture were the agreed passes.
- **Unblock:** The door leaves can reuse the `Door` component the front door already uses. The post needs confirming against the flat before it is worth modelling.
- **Where:** `portfolio/src/components/fun/flat.ts` (`WALLS`, `doorOpenings`), `portfolio/src/components/fun/Room.tsx` (`Door`, `DoorLining`, `Window`), `portfolio/src/components/fun/Furniture.tsx`.

### Fun room: content parity gaps
- **What:** `/fun` now carries the site's materials, light and annotation language, but three sections of the site still have no object in the room. The hero's positioning (`site.hero.headline` / `.sub` — "I am a Cloud Engineer", Oslo, Orange Business) is never stated, so the room never says who it belongs to. The About narrative (the two bio paragraphs) and the portrait have no object either, though skills, interests and career all do. And `/brand` is reachable only through the terminal's `brand` command and the command palette, with nothing in the room representing it.
- **Why deferred:** Scoped out deliberately. The re-skin, the annotation language and the shared geometry were the agreed job; adding new content objects is a separate design question about what shape each one takes, and the room is already at roughly 90% content parity without them.
- **Unblock:** Decide the object for each before modelling anything — `branding/DECISIONS.md` §4 rejects "click to open" as a toll gate, so each has to read at a glance from where a visitor stands. The hero is the awkward one: a room that announces a job title is a poster, not a study.
- **Where:** `portfolio/src/content/site.ts` (`hero`), `portfolio/src/components/sections/AboutSection.tsx` (the prose), `portfolio/src/app/brand/page.tsx`, `portfolio/src/components/fun/Room.tsx` (placement), `portfolio/src/components/fun/Objects.tsx` (the existing object patterns).

### Fun room: the skills faceplate still spends green as a surface
- **What:** `branding/DECISIONS.md` §2 is locked at "green appears once per view as a lit point ... never as a surface, a border or a glow", and `FunRoom.tsx` states the same rule in a comment over the feed dot. The skills faceplate on the south wall draws its self-assessment as a column of green bars, which is a surface, and it is large in frame from the spawn point. The pinned board's pins and the blog board's magnets were brought down to one green point each on 2026-09-03; the faceplate was not.
- **Why deferred:** Recolouring a bar chart is a design decision, not a find-and-replace. Brass bars on near-black lose the "this is a measured value" reading that green carries, and the alternative — drop the bars for a printed list — changes what the object is. Neither should be picked without the owner.
- **Unblock:** Decide what a level-of-skill bar is made of in a room with four materials. Brass at three densities, or a printed sheet with no bar at all, are the two candidates. Then check the frame again from the spawn pose, which is where the faceplate is most visible.
- **Where:** `portfolio/src/components/fun/Objects.tsx` (the skills faceplate), `portfolio/src/content/brand.ts` (the `lit point` token), `portfolio/branding/DECISIONS.md` §2.

### Fun room: `kubectl get applications` now prints 45 rows
- **What:** The publisher started emitting the full per-application list on 2026-09-03, and the cluster has 45 ArgoCD Applications. The desk monitor's ArgoCD view slices to 12 and the television's panel to 9, but the shell prints every row, so the command fills the portrait monitor and the visitor sees only the tail.
- **Why deferred:** It is what the real command does, and inventing a filter would make the shell claim something the cluster does not. The honest options are paging or a summary line, and both are shell design rather than a bug fix.
- **Unblock:** Either page the output the way a pager would, or print a rollup with a `--all` style flag to get the full table. Whatever is chosen has to keep rows inside the 60-character budget `PORTRAIT_PX_W` sets.
- **Where:** `portfolio/src/components/fun/Terminal.tsx` (`useCommands`, the `applications` case), `portfolio/src/components/fun/Screen.tsx` (`PORTRAIT_PX_W`).

### Fun room: 674 draw calls a frame, ~344 triangles each
- **What:** The flat is drawn as ~680 separate meshes carrying ~232k triangles between them, so a frame is bound by draw-call submission rather than by anything the GPU does. Frozen-shadow numbers, measured in the browser via `gl.info` with `autoReset` off: 674 calls / 232k triangles at the entry viewpoint. Culling works (104 calls facing into a corner) but a normal view still submits 350-400.
- **Why deferred:** Fixing it means merging static geometry — the wall panelling, the kitchen carcasses, the bookshelf's books, the sideboard's devices, the coats — into batched meshes or instances, which is a rewrite of how `Furniture.tsx`, `Room.tsx` and `Hallway.tsx` emit geometry, not a tuning pass. The on-demand shadow map already took a quarter of the per-frame work out (912 → 674 calls, 370k → 232k triangles) and that was the one change with no visual cost at all.
- **Unblock:** Pick the biggest offenders off a per-mesh census first (`scene.traverse` counting by parent) rather than merging everything: the panelling and the kitchen fronts are likely most of it. `BatchedMesh` or per-material `InstancedMesh` for repeated parts. Anything merged has to keep its own `Interactive` subtree separate, or the look-at registry loses the fronts that open.
- **Where:** `portfolio/src/components/fun/{Furniture,Room,Hallway,Devices,Bookshelf}.tsx`.

### Fun room: five accepted `react-hooks/immutability` warnings for on-demand shadows
- **What:** `gl.shadowMap.autoUpdate` / `needsUpdate` are written from an effect in `FunRoom`'s `Lighting` and from `useFrame` in `openable.tsx` and `Printer.tsx`. The rule does not model the three.js renderer API, so each write is a warning; lint went 41 → 46. `WorkShelfScene.tsx` already does the same three writes and its two warnings are in the old baseline.
- **Why deferred:** Mutating the renderer is the documented way to drive shadows on demand — there is no non-mutating form to switch to, so the only fixes are a rule exception or leaving it.
- **Unblock:** Decide whether to add a narrow `eslint-disable` for renderer writes or to accept the count. Fold into the react-hooks v6 entry above if that is ever revisited.
- **Where:** `portfolio/src/components/fun/{FunRoom,openable,Printer}.tsx`, `portfolio/src/components/work/WorkShelfScene.tsx`, `portfolio/eslint.config.mjs`.

### Sitemap covers only the home page
- **What:** `portfolio/src/app/sitemap.ts` emits a single entry for `/`. The 13 case studies at `/work/[slug]`, plus `/infrastructure`, `/api` and `/fun`, are all indexable and all absent. Separately, `services` is a homepage section id that is missing from `site.nav`, so it is reachable only by scrolling or through the command palette.
- **Why deferred:** Noticed while mapping the site against the room; unrelated to that work and not worth folding into it.
- **Unblock:** Build the work entries from `getAllWork()` the way `/work/[slug]` already builds its static params, and add the three static routes. Decide separately whether `services` should be a nav entry or stay a scroll target.
- **Where:** `portfolio/src/app/sitemap.ts`, `portfolio/src/lib/work.ts` (`getAllWork`), `portfolio/src/content/site.ts` (`nav`).

### Lint debt: react-hooks v6 findings and the ESLint 9 → 10 bump
- **What:** `eslint-config-next@16` ships the new react-hooks v6 rules; two of them flag 8 pre-existing errors: `react-hooks/set-state-in-effect` (CommandPalette ×2, FooterStamp, InlineGlobe, ArchitectureDiagram — setState called directly in effect bodies) and `react-hooks/immutability` (InlineGlobeScene — mutating `colorSpace` on textures returned from `useTexture`). Both rules are downgraded to `warn` in `eslint.config.mjs` so lint can gate CI.

  Separately, `eslint` still needs bumping to `^10` in `portfolio/package.json`. Originally paired with a TypeScript 5 → 6 bump; the TS half has since shipped (`typescript` is now `^6.0.0`), leaving only ESLint.
- **Why deferred:** Fixing them means refactoring 5 working components (effect restructuring, moving three.js texture setup into the loader callback) with visual/behavioral risk that needs browser re-verification — out of scope for the CI-wiring change that surfaced them. The R3F texture mutations may be acceptable as-is (idiomatic three.js); decide per-case rather than blanket-refactor.
- **Unblock:** Refactor each component (or add per-line disables where the pattern is intentional), verify in the browser via `make up`, then remove the two `warn` overrides from `eslint.config.mjs`. Wait for an `eslint-config-next` release built on `typescript-eslint@9` (supports ESLint 10). Then bump, and run a containerised `make lint` to confirm the config still loads.
- **Where:** `portfolio/eslint.config.mjs`, `portfolio/src/components/{CommandPalette,FooterStamp,InlineGlobe,InlineGlobeScene}.tsx`, `portfolio/src/components/work/ArchitectureDiagram.tsx`, `portfolio/src/components/fun/{Touch,FirstPerson,interaction}.tsx`; `portfolio/package.json`, `portfolio/eslint.config.mjs`; see `portfolio/DEPENDENCY-UPGRADE-PLAN.md` (Phase 3).

### Image optimization pass
- **What:** Re-encode the migrated case-study images via `sharp` to a normalised max-width and AVIF + WebP. Drop any unused PNGs that weren't migrated.
- **Why deferred:** Existing WebPs work fine; this is a perf optimisation, not a blocker.
- **Unblock:** Add a `scripts/optimize-images.ts` step that runs `sharp` over `public/images/`.
- **Where:** `portfolio/public/images/`.

### The hero globe has no polar axle
- **What:** The meridian ring is placed with `rotation={[0, Math.PI / 2, TILT]}`, and three.js's default `XYZ` Euler order composes that as `Rx·Ry·Rz`, so the tilt is applied before the quarter turn and lands inside the torus's own plane, where it spins the ring rather than leaning it. The ring's plane therefore does not contain the tilted polar axis. A polar axle drawn to the ring's own radius ended in mid-air beside it instead of seating into it, and because Oslo sits at 59.9°N the free end appeared right next to the Oslo pin and read as a second pin. The axle was removed on 2026-09-01 rather than fixing the assembly.
- **Why deferred:** Switching the ring to `ZYX` does put its plane through the axis, and the axle then meets it, but it swings the ring's lower loop clear of the pedestal collar so the globe no longer sits in its stand. Making the ring, axle and pedestal one consistent assembly is a modelling pass on a composition that `branding/DECISIONS.md` treats as settled, not a one-line reorder.
- **Unblock:** Decide whether the globe should read as mechanically correct. If yes, rebuild ring, axle and pedestal together so the ring's plane contains the axis and the collar still meets the ring's lowest point, then re-cut `globe-poster.webp`.
- **Where:** `portfolio/src/components/InlineGlobeScene.tsx` (the `TILT` constant, the meridian ring mesh and the pedestal meshes).

### Three hero posters are captured by hand
- **What:** `portfolio/public/images/room-poster.jpg` (640x450, 37KB) is a screenshot of the `/fun` scene. `globe-poster.webp` (1430x906, 34KB) and `globe-poster-mobile.jpg` (780x807, 41KB) are frames of the hero's own globe scene, added 2026-08-23 so phones get the still life at all — under 768px the WebGL scene never mounts, because it measures 211KB of gzipped JS (883KB parsed) plus 577KB of texture. Nothing regenerates any of the three, so a change to the room's furniture, the globe's grade or the camera pose leaves the hero showing a scene that no longer exists. `globe-poster` was re-cut on 2026-09-01 after it had drifted 145px from the live framing; `room-poster` and `globe-poster-mobile` are still the 2026-08-23 captures and still carry the pre-2026-09-01 pin.
- **Why deferred:** Automating it means driving a headless browser with WebGL in CI, hiding overlays, waiting for textures, catching the globe at a rotation where Oslo faces the camera, and committing binaries each run. Disproportionate for images that change a few times a year.
- **Unblock:** A `make hero-posters` target running Playwright against a local dev server. The recipe, now used three times: activate the scene with a synthetic `pointermove`, wait ~4s so textures resolve but the globe has barely rotated from its Atlantic-facing start, set `visibility: hidden` on every sibling of the globe layer plus the header and footer, then screenshot. For an off-centre crop, insert a transparent fixed-position div at the wanted rect and screenshot that element — `sips` only crops from the centre. Three traps found on the 2026-09-01 re-cut: capture at the same aspect the box displays at, or `object-cover` crops the still away from the render it has to match; the fade wrapper is the backdrop's own child containing the canvas, not `canvas.closest('div').parentElement`, because r3f inserts a div of its own and forcing opacity on the wrong node captures a half-faded frame; and CDP `Emulation.setDeviceMetricsOverride` makes the WebGL layer drop out of screenshots entirely, so set the viewport rather than the device metrics. `cwebp -q 91 -m 6 -sharp_yuv` beats JPEG by roughly 3x on these dark plates.
- **Where:** `portfolio/public/images/{room-poster,globe-poster-mobile}.jpg`, `portfolio/public/images/globe-poster.webp`, `portfolio/src/components/InlineGlobe.tsx`, `portfolio/src/components/sections/Hero.tsx`, `portfolio/src/components/fun/Room.tsx`.

### The hero's stack logos have nowhere to live
- **What:** The hero used to float nineteen product logos and three shell-command jokes around the globe (`InlineGlobeDecor.ts`, deleted 2026-08-23). The still-life hero cannot carry them: a photographed object on a table with SVG logos orbiting it stops being a photograph. So the only place the site names its stack is now prose. The nineteen SVGs are still committed under `portfolio/public/icons/` and nothing imports them; only `public/icons/social/` is still used, by the fun room.
- **Why deferred:** Where the stack belongs is a content decision, not a layout one. It could be an honest strip further down the home page, a line in About, or nothing at all if the work case studies already carry it. Picking one silently would be inventing scope.
- **Unblock:** Decide whether the stack gets its own block on `/`. If yes, build it from the same `public/icons/*.svg` and delete nothing. If no, delete those nineteen files (they are recoverable from git) and the hero loses no signal it still had.
- **Where:** `portfolio/public/icons/*.svg`, `portfolio/src/components/sections/Hero.tsx`, deleted `portfolio/src/components/InlineGlobeDecor.ts`.

### Warn and copper are the same hex
- **What:** `--warn` and `--copper` are both `#c09955` in `tokens.css`, so a `Callout` with `tone="warn"` ("Watch") and any copper mark carry the same colour, separated only by their label. Now that copper is documented as the ink end of the wood/brass/copper material ramp, the overlap is spelled out in two places rather than hidden, but it is not fixed.
- **Why deferred:** Moving warning off hue 38 does not actually separate them. At equal luminance a hue rotation is invisible to a colour-blind reader — measured, warn at hue 46 against copper is 1.00:1. A real fix means moving warning to a different lightness, which changes how every warning state reads and is a spec decision rather than a code change.
- **Unblock:** Decide whether warning keeps amber. If it does, solve it at a distinctly different luminance from copper (roughly 4.5:1 or 9.5:1 rather than copper's 7.03:1) and re-check it against `--danger` `#d18e83`, which is also warm. If it does not, warning moves hue entirely and the material ramp keeps `#c09955` to itself.
- **Where:** `portfolio/src/styles/tokens.css`, `portfolio/src/content/brand.ts` (the `warning` entry in `semantic`), `portfolio/src/components/primitives/Callout.tsx`.

### Data series 1 was left at the old saturation
- **What:** The brand green moved from saturation 34 to 24 (2026-08-23). `dataSeries` series 1 is labelled "eucalyptus" and is meant to be the brand green, but it still ships `#4f9e6a` / `#2f7d4f` at the old saturation, so the chart green and the brand green no longer match.
- **Why deferred:** The five categorical colours were validated for colour-vision deficiency as a set. Re-muting one of them without redoing that check would trade a visible mismatch for an invisible accessibility regression, which is the worse of the two.
- **Unblock:** Re-run the CVD check across all five series with series 1 at `#5f9c68` / `#4a7952` (the held-luminance equivalents, already computed), and adjust whichever neighbours stop separating.
- **Where:** `portfolio/src/content/brand.ts`.

### Two material variants still have no callers
- **What:** `Tag variant="warm"` and `Callout tone="result"` were repainted onto wood and brass, but nothing in the app renders either of them, so those two paths are unexercised. Every other consumer was converted in the full sweep (2026-08-23): `Button` secondary, `ServicesGrid`, the infrastructure packet dots, the command palette, the room HUD.
- **Why deferred:** Inventing content to justify a variant is backwards. They are correct and waiting for a real use.
- **Unblock:** First case study that needs a Result callout, or first tag that should read as material rather than brand. Check both against the ramp's two rules: brass takes `--fg` only, and `--fg-3` never sits on wood.
- **Where:** `portfolio/src/components/primitives/{Tag,Callout}.tsx`.

### Captions on raised surfaces fall just under AA
- **What:** `--fg-3` (`#708373`) is solved to 4.60:1 against the page ground `--bg` (`#0f1410`), but on `--surface` (`#191f1a`) it measures 4.14:1, under the 4.5:1 AA threshold for small text. Cards and panels use both.
- **Why deferred:** Fixing it means either lightening `--fg-3` for every ground (which loosens the ratio the spec was solved for) or adding a surface-specific caption token, and that is a brand-spec decision rather than a code change.
- **Unblock:** Pick one: lift `--fg-3` to roughly `#778a7a` so it clears 4.5:1 on `--surface` too, or add `--fg-3-on-surface` and use it inside cards. Update `content/brand.ts` and the `/brand` page either way.
- **Where:** `portfolio/src/styles/tokens.css`, `portfolio/src/content/brand.ts`, `portfolio/src/app/brand/`.

### Playwright smoke test suite for portfolio
- **What:** A small containerized Playwright suite that builds the prod image, runs the container, and asserts key routes return 200 with expected content plus `/healthz`. Wire into `.github/workflows/ci-portfolio.yaml` as a job after lint/typecheck/build.
- **Why deferred:** Tier 2 of the linting/testing rollout (2026-07-08); user approved shipping lint + typecheck + build gates first. Adds ~2–3 min to CI and needs a committed Playwright config decision (image, route list).
- **Unblock:** Decide the route/assertion list, add `portfolio/tests/` with a Playwright config running via `mcr.microsoft.com/playwright` Docker image, add the CI job.
- **Where:** `.github/workflows/ci-portfolio.yaml`, new `portfolio/tests/`.

### lucide-react survives in one file pending a brand-mark decision
- **What:** The UI icon sweep (2026-09-01) replaced every chrome icon with the owned set in `src/components/icons.tsx` (arrow-left/right/up-right, menu, close, search), and the /infrastructure redesign removed Pipeline's icon chips. One file still imports `lucide-react`, so the dependency stays installed: `work/brand-icons.ts` (22 pictograms feeding `StackTiles` and the shelf/cover canvas art).
- **Why deferred:** Redrawing 22 brand marks is its own job, not part of a six-icon UI set.
- **Unblock:** Decide whether the brand pictograms get a monochrome redraw in `icons.tsx` style or stay lucide-fed. When the import is gone, drop `lucide-react` from `package.json`.
- **Where:** `portfolio/src/components/icons.tsx`, `portfolio/src/components/work/brand-icons.ts`, `portfolio/package.json`.

### `Callout` has no paper variant
- **What:** The case study write-up now renders on a `.sheet`, and `.paper-prose` re-inks the elements `mdx-components.tsx` hard-codes dark — headings, prose, list bullets, links, `code`, `strong`, `blockquote`. `Callout` is not covered. Its four tones are tinted panels solved against the dark ground (`border-accent/40 bg-accent/[0.06]`, and a `bg-wood` block for `result`), and every one of them would sit on cream as a dark box with `text-fg-2` inside it.
- **Why deferred:** No case study uses a callout — all thirteen bodies are `##` headings, lists and paragraphs only — so there is nothing on screen to design against, and inventing a tone ramp for an unused component is the same mistake the entry above already records for `Tag variant="warm"`.
- **Unblock:** First case study that actually needs a callout. Solve the four tones against `--paper-2` the way the dark ones were solved against `--bg`, and add them under `.paper-prose` beside the other overrides rather than as a prop on the component.
- **Where:** `portfolio/src/app/globals.css` (`.paper-prose`), `portfolio/src/components/primitives/Callout.tsx`, `portfolio/src/components/work/mdx-components.tsx`.

### The footer cannot name the node that served the page
- **What:** `FooterStamp` used to open with "served from talos-cp-02", drawn at random in the browser from four hard-coded names, none of which exists in the six-node cluster. It is removed rather than fixed, so the stamp now carries only what it can measure. The real value is on the pod as `spec.nodeName`.
- **Why deferred:** The browser cannot know it, so it has to come from the server, and the footer renders inside statically prerendered pages — reading `process.env.NODE_NAME` there would bake whatever the CI runner had at build time. Making it real means either an endpoint the stamp fetches or a dynamic segment, plus a downward-API env var on the deployment, which is a manifest change that has to go to stage before prod.
- **Unblock:** Add `NODE_NAME` via `fieldRef: spec.nodeName` to `k8s/talos/apps/portfolio/deployment.yaml`, expose it on an existing route under `/api/v1`, and have the stamp fetch it the way `InfraBench` fetches `/api/v1/infra`.
- **Where:** `portfolio/src/components/FooterStamp.tsx`, `portfolio/src/app/api/v1/`, `k8s/talos/apps/portfolio/deployment.yaml`.

### The provenance stamp exists only in the footer
- **What:** `FooterStamp` reports the build sha and the time to first byte. §12 accepted extending that device: the shelf stating its volume count and newest entry, the resume its revision date and size, the repositories their live star counts. None of it is built. Related gap: `content/repos.ts` fetches live stars and forks for four pinned repositories, and the only thing that renders it is `GithubWall` inside `/fun`, so the open-source work is invisible on the main site.
- **Why deferred:** Each stamp needs a real source, and three of the four do not have one yet — the shelf count is derivable, the resume figures are produced inside the cv-bundle container, and the repo numbers already come from `/api/v1/github` but have no home outside the room.
- **Unblock:** Pick sources one at a time and render each stamp under its own object in the same mono treatment as `FooterStamp`. The repositories one is the largest return, since it is the only place the GitHub work appears at all and the endpoint already exists.
- **Where:** `portfolio/src/components/FooterStamp.tsx` (the pattern), `portfolio/src/content/repos.ts`, `portfolio/src/app/api/v1/github/route.ts`, `portfolio/src/components/fun/GithubWall.tsx`.

## Portfolio API

### Portfolio API writes: a real endpoint, and the auth to match
- **What:** `/api/v1` now serves several read routes (`blog`, `github`, `infra`, `profile`, `openapi.json`), but the only write is the stateless example `POST /api/v1/echo`. A useful write (e.g. a guestbook, or a "notify me" capture) needs a datastore.

  Writes currently authenticate with a static API key. For SSO-consistent, per-user writes, route the write paths through Authentik (Traefik forward-auth / OIDC) instead.
- **Why deferred:** Scope was the read API + a proven auth seam. Persistence is a separate design (schema, storage, retention, abuse handling).
- **Unblock:** Pick a store (SQLite on a PVC for a single-writer app, or the existing CNPG Postgres), add a route under `src/app/api/v1/` guarded by `requireApiKey`, and wire storage + any needed CiliumNetworkPolicy egress. Add an Authentik provider + Traefik forward-auth middleware on the `/api/v1` POST paths, and relax `requireApiKey` to accept the forwarded identity.
- **Where:** `portfolio/src/app/api/v1/`, `portfolio/src/lib/api.ts`; `portfolio/src/lib/api.ts`, `k8s/talos/apps/portfolio/httproute.yaml`, Authentik config.

### Silence the Turbopack NFT over-trace on /api/v1/infra
- **What:** `next build` warns that the `fs.readFile` in the infra route causes Node File Tracing to sweep the whole project into `.next/standalone` (locally this pulled in `latex/`, `out/`, CV markdown). The shipped Docker image is unaffected because the build stage only `COPY`s `src`/`public`/config, but the warning is noise and the local standalone is bloated.
- **Why deferred:** Cosmetic; build is green and the runtime image is lean.
- **Unblock:** Scope the read (constant path, or `outputFileTracingRoot`/`outputFileTracingExcludes` in `next.config.ts`) until the warning clears without pulling in extra files.
- **Where:** `portfolio/src/app/api/v1/infra/route.ts`, `portfolio/next.config.ts`.

## Cluster / infra

### Run a Terraform apply before 2026-12-29 or the cluster credentials lapse
- **What:** The talosconfig and kubeconfig client certificates both expire **2026-12-29**. The provider reissues them automatically, but only during a `terraform apply`, and only once they are inside their renewal window. `talos_cluster_kubeconfig` uses `certificate_renewal_duration`, now widened from the 720h default to `2160h` (90 days), so any apply after roughly 2026-09-30 renews the kubeconfig. `talos_machine_secrets` has a **hardcoded 30 day** window for the talosconfig client certificate, so that one only renews on an apply between 2026-11-29 and 2026-12-29.
- **Why deferred:** Nothing to fix. Reissuing by hand does not help: `local_sensitive_file` rewrites both files from Terraform state on the next apply, so a manually generated certificate is discarded. The renewal is genuinely automatic; the only failure mode is nobody running Terraform in the window.
- **Unblock:** Run `terraform apply` in this directory at some point in December 2026, then confirm with `grep "client-certificate-data:" kubeconfig | awk '{print $2}' | base64 -d | openssl x509 -noout -enddate` and the equivalent `crt:` line in `talosconfig`. If both certificates do lapse, recovery is the `convert-secrets.sh` flow in that directory's `README.md`, which rebuilds them from the machine secrets in Terraform state. That works as long as the state is intact, which is why `machine-secrets.yaml` belongs in Bitwarden.
- **Where:** `terraform/proxmox/hyper-cluster/k8s/talos/talos-cluster.tf` (`talos_cluster_kubeconfig.certificate_renewal_duration`), README "Certificate Management".

### Raise `talos_config_contract` to v1.12.11
- **What:** After round 1 the cluster runs Talos v1.12.11, but `talos_config_contract` is still `v1.11.6`, so machine configuration is generated against the 1.11 contract. `kubernetes_config_contract` was raised to `v1.35.7` and is done. Talos accepts an older-contract config, so this is drift to clean up rather than a fault.
- **Why deferred:** The 1.12 contract emits a separate `HostnameConfig` document with `auto: stable`, replacing `machine.features.stableHostname`. The `config_patches` in `talos-cluster.tf` also set a static `machine.network.hostname` per node, and Talos rejects the combination: `static hostname is already set in v1alpha1 config`. `HostnameConfig` accepts either `auto` or `hostname` and the two explicitly conflict, so the static hostname has to move into that document, and a plain strategic-merge patch would merge `hostname` alongside the generated `auto` rather than replacing it. Working that out at the end of the upgrade session was not worth the risk while the cluster was healthy.
- **Already tried and ruled out (2026-08-09):** Removing `machine.network.hostname` and adding a `HostnameConfig` document as a second entry in `config_patches` does **not** work. The patch merges with the generated document instead of replacing it, producing `auto: stable` and `hostname: <node>` in the same document, which Talos rejects with `HostnameConfig: 'auto' and 'hostname' cannot be set at the same time`. Setting `auto: null` in the patch to delete the field does not work either; the merge still emits `auto: stable`. Verified by plan plus `apply-config --dry-run`, no cluster changes made.
- **Do not** simply drop the static hostname and let `auto: stable` name the nodes. It derives hostnames from machine identity, so every node would rename, orphaning the existing Node objects along with PV `nodeAffinity` and the `topology.kubernetes.io/zone` labels.
- **Unblock:** What is left is an RFC6902 JSON patch with a `remove` op on `/auto` targeted at the `HostnameConfig` document, which needs correct document targeting in a multi-document config. Alternatively wait for the provider or Talos to handle the migration. Verify with `talosctl apply-config --mode=auto --dry-run` on both a worker and a control plane before applying, per `docs/talos-kubernetes-upgrade.md`. In the same change, pin `machine.install.grubUseUKICmdline = false`: the provider emits `true` from the 1.12 contract, but these nodes boot via GRUB and their running cmdline carries `talos.platform=nocloud` and `net.ifnames=0`, which the UKI's own command line would not reproduce. That field is unknown to the 1.11 contract, so it can only be added together with the contract bump.
- **Worth it?** Probably not yet. Roughly half a day with a real risk of node renames, and no functional payoff: Talos accepts older-contract configs for several releases and nothing is broken. Reasonable to leave until Talos 1.13 or 1.14 forces it.
- **Where:** `terraform/proxmox/hyper-cluster/k8s/talos/talos-cluster.tf` (`config_patches` in both `data.talos_machine_configuration` blocks), `terraform.tfvars` (`talos_config_contract`).

### Narrow the plex-media-stack PodSecurity level back to baseline
- **What:** `k8s/talos/apps/plex-media-stack/namespace.yaml` sets `pod-security.kubernetes.io/enforce: privileged`. Talos enforces `baseline` cluster-wide (exempting only `kube-system`) and baseline forbids all `hostPath` volumes, which Plex needs to mount `/dev/dri` for QuickSync transcoding.
- **Why deferred:** The label lifts the restriction for the whole namespace, so seerr and tautulli get it too despite neither needing it. Fixing it properly means removing the need for `hostPath` at all, which is a new cluster component rather than a manifest tweak.
- **Unblock:** Deploy Intel's GPU device plugin (`intel/intel-device-plugins-for-kubernetes`, the GPU plugin DaemonSet). It advertises `gpu.intel.com/i915` as a schedulable extended resource, so Plex requests it under `resources.limits` instead of mounting `hostPath`. Node selection can then drop to the plugin's own labels rather than `hardware.nordbye.it/gpu`. Once Plex no longer uses `hostPath`, set the namespace back to `enforce: baseline` and confirm the pod still admits.
- **Where:** `k8s/talos/apps/plex-media-stack/{namespace,plex}.yaml`; see `docs/plex-hw-transcode.md` section 6.
- **Worth it?** Yes, and it is the easiest of the three cluster items. An hour or two, mostly waiting for ArgoCD, no cluster-wide risk, and the failure mode is just Plex not scheduling. It removes a real security compromise: today the whole namespace runs privileged so that one pod can reach one device.

### Round 2 of the cluster upgrade: Talos 1.13 + Kubernetes 1.36
- **What:** Round 1 takes Genesis from Talos v1.11.6 / Kubernetes v1.34.0 to Talos v1.12.11 / Kubernetes v1.35.7. Round 2 takes it to Talos v1.13.8 / Kubernetes v1.36.3 by the same two-apply flow. Cilium v1.20.0 already supports Kubernetes up to 1.36, so the CNI is not a blocker.
- **Why deferred:** Talos only tests migration between adjacent minors and each Talos minor caps the Kubernetes minors it supports, so the two rounds cannot be collapsed. Running both back to back in one sitting was judged too much moving surface for one maintenance window.
- **Unblock:** Let the cluster run clean on Talos 1.12 / Kubernetes 1.35 for a few days, then `brew upgrade talosctl` to a v1.13.x — `talosctl` must be at least as new as the version it installs. Note that `--preserve` in `upgrade-talos.tf` becomes a deprecated flag in 1.13 (still functional, warns, slated for removal in Talos 1.18) and only applies to the legacy upgrade path; the 1.13 CLI also drops `--stage`/`--force`/`--insecure` from its visible flag set. Talos 1.13 additionally requires uninstalling the `nvidia-device-plugin` Helm chart beforehand, which this cluster does not run.
- **Where:** `terraform/proxmox/hyper-cluster/k8s/talos/{terraform.tfvars,upgrade-talos.tf,upgrade-k8s.tf}`, version matrix in that directory's `README.md`.
- **Worth it?** Straightforward now that round 1 is done. Roughly 40 minutes, mostly hands-off: `brew upgrade talosctl`, edit four values, two applies. Every trap is already fixed and documented in `docs/talos-kubernetes-upgrade.md`. The only new thing is `--preserve` starting to print a deprecation warning on the 1.13 CLI.

### Extend Loki PVC after kube-events validated
- **What:** Bump the Loki single-binary PVC from 20Gi (`singleBinary.persistence.size`). Deferred until the new Kubernetes-events ingestion (Alloy `loki.source.kubernetes_events`, 7d per-stream retention) is confirmed working and we can measure real storage growth.
- **Why deferred:** Events are low-volume, so 20Gi is expected to suffice; sizing should be driven by observed usage, not guessed. Also, the PVC is a StatefulSet `volumeClaimTemplate` — immutable after creation — so a resize is non-trivial.
- **Unblock:** Confirm events flow (`{job="kubernetes-events"}` in Grafana) and watch Loki disk usage for a few days. To resize: ensure the `proxmox-local` StorageClass has `allowVolumeExpansion: true`, set the new `size:` in `values.yaml`, then `kubectl delete sts loki --cascade=orphan` and `kubectl patch pvc` on each Loki PVC (or recreate the StatefulSet) so the larger claim takes effect.
- **Where:** `k8s/talos/infra/loki/values.yaml` (`singleBinary.persistence.size`).

### Close the Cilium policy audit and move to enforcement
- **What:** The cluster runs `policyAuditMode: true` (`k8s/talos/infra/cilium/values.yaml`) — CiliumNetworkPolicies log but never drop. To enforce, every legitimate flow must be whitelisted first. A 3-minute Hubble snapshot (2026-06-29) showed these `AUDIT` (would-be-denied) flows — all pre-existing infra, none from the KEDA HTTP wake-from-zero apps added the same day:
  - `monitoring/grafana → kube-apiserver:6443` (egress)
  - `monitoring/loki → kube-apiserver:6443` (egress)
  - `monitoring/alertmanager ↔ alertmanager peers :9094` (cluster gossip, both directions)
  - `argocd/argocd-repo-server → world:443` (egress; git/helm fetch)
  - `plex-media-stack/seerr ↔ traefik:8444` (verify direction before writing the rule)
- **Why deferred:** The Hubble ring buffer only retained ~3 minutes (flooded by `VLAN_FILTERED` noise), and there was no Prometheus history of policy verdicts (the `policy` Hubble metric wasn't enabled). 3 minutes can't capture periodic flows (cron, cert-manager renewals, backups, KEDA wake events, infrequently-used apps), so enforcing off that sample would break things. The `policy` Hubble metric was enabled on 2026-06-29 to record verdicts over Prometheus' 7d retention — but the audit window hasn't elapsed yet.
- **Unblock:** After ≥7d, query `sum by (source, destination, source_namespace, destination_namespace, direction) (increase(hubble_policy_verdicts_total{action="audit"}[7d]))` (verified label keys: `action="audit"` is the would-be-denied verdict; `source`/`destination` = workload names, plus the `*_namespace` labels — matching the `workload-name` / `labelsContext` config in cilium values), add an allow rule for each gap (start with the 5 above), then flip `policyAuditMode: false` **namespace-by-namespace**, not cluster-wide. NOTE: enabling the `policy` metric rolls the Cilium DaemonSet — see the 2026-05-16 BPF LB map corruption record in `docs/incidents.md`; verify per-node BPF LB state right after the roll.
- **Where:** `k8s/talos/infra/cilium/values.yaml` (audit mode + the metric), and the per-app CNPs: `k8s/talos/infra/kube-prometheus-stack/ciliumnetworkpolicy.yaml`, `k8s/talos/infra/loki/ciliumnetworkpolicy.yaml`, `k8s/talos/infra/argocd/ciliumnetworkpolicy.yaml`, `k8s/talos/apps/plex-media-stack/ciliumnetworkpolicies.yaml`.

### Cilium L2 announce VIP co-location risk
- **What:** Both `traefik-private` (10.3.10.102) and `traefik-public` (10.3.10.101) L2 leases are claimed by whichever node wins the election — historically `genesis-ctrl-02`. A single bad node takes down every internal *and* external Traefik VIP at once.
- **Why deferred:** Out of scope for the BPF fix above; needs a policy design decision.
- **Unblock:** Split into two separate `CiliumL2AnnouncementPolicy` resources with disjoint `nodeSelector`s (e.g. private → ctrl-only, public → worker-only) so an election blip never blackholes both. Validate that L2 lease params (`leaseDuration` / `leaseRenewDeadline` / `leaseRetryPeriod`) are set conservatively — defaults can re-elect aggressively under control-plane load.
- **Where:** `k8s/talos/infra/cilium/l2-announcement-policy.yaml`.

## Repo hygiene

### Local-only AI work is not backed up
- **What:** `scripts/backup-secrets.sh` covers CV drafts, blog style docs, Talos credentials and the tfvars files. It does not cover `ai/projects/`, `ai/prompts/`, `.inspiration/` or `.notes/`. That leaves the `jarvis` project, the ERLEND/MORTEN persona documents and the prompt-eval work with no backup at all.
- **Why deferred:** The manifest was written for secrets, and it is not obvious which of these are worth keeping versus genuinely disposable.
- **Unblock:** Decide which are worth keeping and add them to `.backup-manifest`. The persona markdown files are ~28K and clearly worth it; the 234M `slackdump_20260602_122707.zip` next to them probably is not, and may not belong on the laptop at all given it is a Slack export.
- **Where:** `.backup-manifest`, `ai/projects/jarvis/`, `ai/prompts/erlendgpt/`.

## Blog

### Every post renders its title twice as an H1
- **What:** The Northlight theme emits `<h1 class="article-title">` from the front-matter title, and every post also opens its markdown body with `# Same Title`. All seven posts under `blog/content/blog/**` therefore serve two identical H1 elements. Confirmed on the live site: `curl https://blog.nordbye.it/blog/lawless-waf/ | grep -o "<h1[^>]*>"` returns 2. The new `blog/content/about.md` deliberately omits the markdown heading and serves one.
- **Why deferred:** Fixing it means deleting the leading `# Title` line from seven published posts, which changes what every one of them looks like (the title stops appearing twice on screen). That is a visible design change across the whole blog rather than a config fix, and it was not part of the agreed scope.
- **Unblock:** Decide whether the title should render once. If yes, drop the first `# ...` line from each post body and rebuild; nothing else references those headings, though check that no post's table of contents or anchor link points at the removed heading id first.
- **Where:** `blog/content/blog/*/index.md` (first heading line of each), `blog/themes/northlight/layouts/_partials/article-head.html` for the theme-side H1.

### `content/series/_index.md` is orphaned
- **What:** The file exists and carries a `noindex` cascade, but `config/_default/config.toml` deliberately does not register a `series` taxonomy (there is a comment saying so), so Hugo generates no series pages for it to apply to. It was added alongside the tag noindex in `c3f5031c`.
- **Why deferred:** Harmless where it sits, and deleting a file someone added on purpose is a judgement call. It also becomes correct again the day a series is registered.
- **Unblock:** Either register the `series` taxonomy or delete the file.
- **Where:** `blog/content/series/_index.md`, `blog/config/_default/config.toml`.

## Media stack observability (arr-stack)

### Discord alert rules for the media stack
- **What:** PrometheusRules that page Discord on actionable media-stack conditions — e.g. an *arr queue item stuck (no progress) for >2h, a root folder under a free-space threshold, or an exporter/target down.
- **Why deferred:** Scope of this change was graphs, not alerting. The metrics now exist, so the rules are a clean follow-up; thresholds want a little live baseline first.
- **Unblock:** Add a rule group to `homelab-alerts.yaml` (label `release: kube-prometheus-stack`, `severity: critical` routes to Discord per the existing Alertmanager config). Base the stuck-queue expr on `sonarr_queue_total` / `radarr_queue_total` once a normal range is observed.
- **Where:** `k8s/talos/infra/kube-prometheus-stack/homelab-alerts.yaml`.
