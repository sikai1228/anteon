# Assets

Raw scanned models staged for the Layer2 intro film. These are third party
scans we downloaded rather than rebuilt by hand. The raw files live in
public/assets/raw, which is gitignored. Decimated and re-encoded versions get
committed in a later round. Every file was license checked before staging, and
every file we ship will also earn a line in CREDITS.md and on the credits page.

Total staged, 25.89 MB across seven files, well under the download budget with
no single file near it. The sizes below are the downloaded byte counts, which
the film pipeline should trust over any figure in a source manifest.

## 1903 Wright Flyer, Smithsonian

Source, the Smithsonian 3D portal object page for the 1903 Wright Flyer, slug
1903-wright-flyer, object id d8c62e5e-4ebc-11ea-b77f-2e728ce88125, hosted at
[3d.si.edu](https://3d.si.edu). To open the canonical page, join the slug and
the object id with a colon. The scan is served through the Smithsonian Voyager
viewer, and the model binaries download directly from the content host, for
example [the compact draco file](https://cdn.3d-api.si.edu/d8c62e5e-4ebc-11ea-b77f-2e728ce88125/1903WrightFlyer-100k-2048_std_draco.glb).

License, CC0, public domain. The Smithsonian Open Access program released this
object into the public domain. The rights line on the object page renders
client side, so we confirmed the dedication from two public records of the same
object. The Wikimedia mirror states, "This file is made available under the
Creative Commons CC0 1.0 Universal Public Domain Dedication," and traces it to
the same object page, inventory number A19610048000, credit line the Estate of
Orville Wright. The Smithsonian's own upload of the scan labels it "CC0 Public
Domain" with the same credit line. Note that each glb embeds the Voyager
generator's default string, "(c) Smithsonian Institution. All rights reserved,"
which is boilerplate, not the object's usage license.

Files, one whole aircraft in a single compressed file plus three uncompressed
meshes that together form the whole aircraft.

- si-wright-flyer-100k-draco.glb, 0.60 MB. The full aircraft decimated to about
  100k triangles, draco compressed. This is the augmented reality derivative. It
  loads with the draco loader in three/addons, which is not a new dependency.
- si-wright-flyer-wings-low.glb, 8.18 MB. Wings and rib structure, about 49k
  triangles, plain glTF binary, no decoder needed.
- si-wright-flyer-filler-low.glb, 5.49 MB. Fuselage, engine bay filler, and
  control surfaces, about 48k triangles, plain glTF binary.
- si-wright-flyer-engine-low.glb, 6.91 MB. Engine, transmission, and propellers,
  about 53k triangles, plain glTF binary.

Variants seen and skipped. Each Web3D mesh also ships at medium (2048 texture)
and high (4096 texture) resolution over the same geometry, and at a thumbnail
level (512 texture, about 0.2 MB each) that is too coarse for the rib detail. We
took the lowest full detail level because the film renders the scan as chalk
outlines and does not need the texture. A usdz file for iOS augmented reality,
about 6.96 MB, was skipped because the film does not target that path. The
Voyager manifest reported much smaller byte counts for the low meshes than the
files we actually received, so trust the sizes above.

## NASA models

Source, the NASA 3D Resources repository on GitHub,
[nasa/NASA-3D-Resources](https://github.com/nasa/NASA-3D-Resources), under the
3D Models folder. Each file was downloaded as a raw blob from the master branch,
so nothing was cloned.

License, the repository readme states, "These assets are free and without
copyright." NASA's media usage guidelines add the standard caveats, that the
collection can include third party material NASA does not own, that the NASA
insignia is restricted, and that use must not imply NASA endorsement. None of
the three files below carry a third party texture or an insignia, so each is
clear to ship with a credit line.

- nasa-astronaut.glb, 0.72 MB. A posed suited astronaut, glTF binary. This is
  our pick for the distant figure on the lunar surface.
- nasa-emu-spacesuit.glb, 3.28 MB. The Extravehicular Mobility Unit pressure
  suit at higher detail, glTF binary. Kept as an alternative figure or a source
  for the suit silhouette.
- nasa-apollo-lunar-module.glb, 0.68 MB. The Apollo lunar module, glTF binary.
  Not requested, staged as an optional horizon prop for the Moon scene.

## Not downloaded

- Flag assembly. The NASA repository has no flag model, and no clean public
  domain flag scan surfaced. The Moon scene already draws the flag as chalk
  strokes, red stripes and a blue canton with colorBypass, so a scanned mesh is
  neither needed nor a fit for the chalk look.
- Apollo boot or overshoe. The NASA repository has no boot model. It does hold a
  bootprint under Images and Textures, Moon Apollo Astronaut Bootprint, but that
  is a 2D photo, a jpg and a 10.25 MB tif, not a 3D scan, and the spec bans
  image assets this round. The boot scene uses an authored A7L style tread
  pattern.
- Neil Armstrong A7-L spacesuit, slug neil-armstrong-spacesuit, object id
  d8c63ba6-4ebc-11ea-b77f-2e728ce88125, on 3d.si.edu. This scan exists and
  includes the lunar boots, but its stated usage is ambiguous. The public
  summaries describe it as both CC0 and as limited to non-commercial,
  educational, and personal use under a disclaimer, which matches the
  Smithsonian's more restrictive category rather than a clean CC0. We skipped it
  pending a first party read of the exact usage line, and it is not needed
  because the NASA astronaut covers the figure.

## Recommendations

- Flyer, ship the three low meshes together for full rib detail at the camera
  key near t 0.465, or the 0.60 MB draco file when a single compact file is
  easier to load.
- Figure, nasa-astronaut.glb.
- Boot, keep the authored tread pattern, no free scan is available.
- Flag, keep the authored chalk strokes, no scan is needed.
