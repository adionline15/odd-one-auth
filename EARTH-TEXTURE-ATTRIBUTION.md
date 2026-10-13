# Earth texture attribution

The Earth colour, normal, specular and cloud maps are the named files from the Three.js example texture set in `examples/textures/planets/`. The Three.js example assets are based on Solar System Scope / INOVE Earth textures; the upstream texture library is licensed under Creative Commons Attribution 4.0 International (CC BY 4.0).

- **Attribution:** Solar System Scope / INOVE — CC BY 4.0
- **Texture library:** https://www.solarsystemscope.com/textures/
- **Three.js example source:** https://github.com/mrdoob/three.js/tree/dev/examples/textures/planets

The files are stored as binary `.jpg` / `.png` assets and loaded same-origin. The earlier implementation requested these same-named assets from `https://threejs.org/examples/textures/planets/`; the current implementation vendors the corresponding files fetched from the Three.js repository. The earlier remote response was not retained with a checksum, so this note does **not** claim a byte-for-byte comparison against that historical response. No NASA or Solar System Scope endorsement is implied.
