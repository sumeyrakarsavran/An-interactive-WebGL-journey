# SIRR — Asset Plan & Manifest

**Prototype (Phase 3): zero downloaded assets.** Everything in Chapter 01 is procedural: geometry, shaders, and WebAudio-synthesised wind. Nothing below has been downloaded yet. Licenses are listed as each library *publishes* them, and **every individual asset must be re-checked on its own page when downloaded**.

## Libraries

| Library | License (as published) | Commercial use | Attribution | Notes |
|---|---|---|---|---|
| Poly Haven | CC0 | Yes | Not required | HDRIs, textures, some botanical models. Best first stop. |
| ambientCG | CC0 | Yes | Not required | PBR textures (sand, soil, stone, bark) |
| Quaternius | CC0 | Yes | Not required | Stylised, too low-poly for hero assets |
| Kenney | CC0 | Yes | Not required | Prototyping only |
| Sketchfab | **Per model** (CC-BY, CC-BY-NC, CC0, Standard/Editorial) | Depends | Often required | **Check every model. NC and Editorial are not usable.** |
| BlenderKit | Royalty-Free or CC0, per asset | Usually yes | Varies | Royalty-Free assets can't be redistributed as standalone files. Shipping raw GLBs on a website needs checking against their terms. |
| Freesound | **Per sound** (CC0, CC-BY, CC-BY-NC) | Depends | CC-BY requires it | Use CC0/CC-BY only, and log the author. |

## Required assets

| Asset | Chapter | Plan | Source |
|---|---|---|---|
| Far-field grass & wildflowers | 01, 06 | **Procedural** (done) | — |
| Hero flower (macro-grade petals, veins) | 01, 02 | **Custom Blender** sculpt, GLB + KTX2 vein/thickness maps | in-house |
| Petal translucency/vein textures | 02 | Custom (scan or paint) | in-house |
| Dewdrop | 01→02 | Procedural sphere + transmission | — |
| Sky / dawn HDRI | 01, 06 | Poly Haven dawn/sunrise HDRI (1k mobile, 2k desktop) | Poly Haven (CC0) |
| Tall mirror + frame-less slab | 03 | Custom Blender (simple), with tarnish mask texture | in-house |
| Dark reflective floor | 03 | Procedural + ambientCG roughness map | ambientCG (CC0) |
| Sand material | 04 | ambientCG sand textures + procedural dunes | ambientCG (CC0) |
| Footprint decals | 04 | Procedural (render-target trail) | — |
| Lake + tree | 05 | Procedural water; tree from Poly Haven or custom | Poly Haven (CC0) / in-house |
| Human silhouette (hair cards, cloth) | 06 | **Custom Blender**: low-detail face, hair cards, pin-weighted cloth | in-house |
| Ambient audio (wind, birds, water, leaves) | all | Prototype: synthesised wind. Production: CC0/CC-BY field recordings, or own recordings | Freesound (per sound) / in-house |
| Fonts | all | Cormorant Garamond, Inter | Google Fonts (OFL) |

## Optimisation pipeline (when assets arrive)

`gltf-transform optimize in.glb out.glb --compress draco --texture-compress ktx2 --texture-size 2048` (1024 for mobile variants). Target hero GLB < 1.5 MB, chapter budget < 4 MB.
