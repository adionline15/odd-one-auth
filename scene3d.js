(() => {
  const host = document.querySelector(".world-globe");
  if (!host) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvas = document.createElement("canvas");
  canvas.className = "earth-webgl";
  canvas.setAttribute("aria-hidden", "true");
  host.prepend(canvas);

  import("https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js")
    .then(THREE => {
      if (!canvas.isConnected) return;

      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: true,
          powerPreference: "high-performance"
        });
      } catch (_) {
        canvas.remove();
        host.classList.add("earth-css-fallback");
        return;
      }

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
      const baseCameraZ = 4.15;
      camera.position.set(0, 0, baseCameraZ);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1 : 1.25));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;

      scene.add(new THREE.AmbientLight(0xb7c9df, 0.48));
      const sun = new THREE.DirectionalLight(0xffffff, 2.25);
      sun.position.set(-3.5, 2.6, 4.5);
      scene.add(sun);
      const nightFill = new THREE.DirectionalLight(0x29476d, 0.28);
      nightFill.position.set(4, -1, -3);
      scene.add(nightFill);

      const earthGroup = new THREE.Group();
      scene.add(earthGroup);
      const textureAssets = [
        { path: "assets/earth/earth-color.jpg.b64", color: true, label: "Earth colour", encodedBytes: 512606 },
        { path: "assets/earth/earth-normal.jpg.b64", color: false, label: "Earth normal", encodedBytes: 336774 },
        { path: "assets/earth/earth-specular.jpg.b64", color: false, label: "Earth specular", encodedBytes: 223421 },
        { path: "assets/earth/earth-clouds.png.b64", color: true, label: "Earth clouds", encodedBytes: 226113 }
      ];
      const expectedTextureBytes = textureAssets.reduce((sum, asset) => sum + asset.encodedBytes, 0);
      let loadedTextureBytes = 0;
      const publishTextureProgress = (asset, bytes) => {
        loadedTextureBytes += bytes;
        document.dispatchEvent(new CustomEvent("oddone:textureprogress", {
          detail: { loadedBytes: loadedTextureBytes, totalBytes: expectedTextureBytes, asset, percent: Math.min(100, loadedTextureBytes / expectedTextureBytes * 100) }
        }));
      };
      const loadTexture = async (asset) => {
        try {
          const response = await fetch(asset.path, { cache: "force-cache" });
          if (!response.ok) throw new Error("Texture request failed: " + response.status);
          const base64 = await response.text();
          const binary = atob(base64.replace(/\s/g, ""));
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const mime = asset.path.endsWith(".png.b64") ? "image/png" : "image/jpeg";
          const objectUrl = URL.createObjectURL(new Blob([bytes], { type: mime }));
          const image = new Image();
          image.src = objectUrl;
          await image.decode();
          URL.revokeObjectURL(objectUrl);
          const texture = new THREE.Texture(image);
          texture.colorSpace = asset.color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
          texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          texture.generateMipmaps = true;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.needsUpdate = true;
          publishTextureProgress(asset.label, bytes.byteLength);
          return texture;
        } catch (error) {
          console.warn("[Odd-One] Local Earth texture unavailable:", asset.path, error);
          publishTextureProgress(asset.label + " (unavailable)", 0);
          return null;
        }
      };

      Promise.all(textureAssets.map(loadTexture)).then(([colorMap, normalMap, specularMap, cloudMap]) => {
        if (!canvas.isConnected) return;

        const earthMaterial = new THREE.MeshPhongMaterial({
          color: 0xf4f6fa,
          map: colorMap || null,
          normalMap: normalMap || null,
          normalScale: new THREE.Vector2(0.45, 0.45),
          specularMap: specularMap || null,
          specular: new THREE.Color(0x182c40),
          shininess: 8
        });
        const earth = new THREE.Mesh(new THREE.SphereGeometry(1.43, 80, 80), earthMaterial);
        earth.rotation.z = -0.12;
        earthGroup.add(earth);

        if (cloudMap) {
          const clouds = new THREE.Mesh(
            new THREE.SphereGeometry(1.455, 56, 56),
            new THREE.MeshPhongMaterial({
              map: cloudMap,
              transparent: true,
              opacity: 0.3,
              color: 0xe8edf5,
              depthWrite: false,
              blending: THREE.NormalBlending
            })
          );
          clouds.rotation.z = -0.12;
          earthGroup.add(clouds);
          earthGroup.userData.clouds = clouds;
        }

        const atmosphere = new THREE.Mesh(
          new THREE.SphereGeometry(1.56, 56, 56),
          new THREE.ShaderMaterial({
            vertexShader: `
              varying vec3 vNormal;
              varying vec3 vViewPosition;
              void main() {
                vNormal = normalize(normalMatrix * normal);
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                vViewPosition = -mvPosition.xyz;
                gl_Position = projectionMatrix * mvPosition;
              }
            `,
            fragmentShader: `
              varying vec3 vNormal;
              varying vec3 vViewPosition;
              void main() {
                float rim = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewPosition)), 0.0), 2.4);
                gl_FragColor = vec4(0.22, 0.43, 0.72, rim * 0.34);
              }
            `,
            blending: THREE.NormalBlending,
            side: THREE.BackSide,
            transparent: true,
            depthWrite: false
          })
        );
        earthGroup.add(atmosphere);

        const starsCount = window.innerWidth < 700 ? 60 : 140;
        const starPositions = new Float32Array(starsCount * 3);
        for (let i = 0; i < starsCount; i++) {
          starPositions[i * 3] = (Math.random() - 0.5) * 9;
          starPositions[i * 3 + 1] = (Math.random() - 0.5) * 7;
          starPositions[i * 3 + 2] = -1.2 - Math.random() * 4;
        }
        const starGeometry = new THREE.BufferGeometry();
        starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
        const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({
          color: 0x9ccaff,
          size: 0.012,
          transparent: true,
          opacity: 0.42
        }));
        scene.add(stars);

        const pointer = { x: 0, y: 0, down: false, lastX: 0, lastY: 0, lastInput: 0 };
        const indiaYaw = 1.38;
        const indiaPitch = -0.08;
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

        const onPointerMove = event => {
          if (!pointer.down) return;
          const dx = event.clientX - pointer.lastX;
          const dy = event.clientY - pointer.lastY;
          earthGroup.rotation.y += dx * 0.005;
          earthGroup.rotation.x = clamp(earthGroup.rotation.x + dy * 0.003, -0.45, 0.45);
          pointer.lastX = event.clientX;
          pointer.lastY = event.clientY;
          pointer.lastInput = performance.now();
          motionActiveUntil = performance.now() + 900;
        };
        const onPointerDown = event => {
          pointer.down = true;
          pointer.lastX = event.clientX;
          pointer.lastY = event.clientY;
          pointer.lastInput = performance.now();
          motionActiveUntil = performance.now() + 900;
          if (host.setPointerCapture) host.setPointerCapture(event.pointerId);
        };
        const onPointerUp = () => {
          pointer.down = false;
          pointer.lastInput = performance.now();
          motionActiveUntil = performance.now() + 900;
        };
        host.addEventListener("pointermove", onPointerMove, { passive: true });
        host.addEventListener("pointerdown", onPointerDown, { passive: true });
        host.addEventListener("pointerup", onPointerUp, { passive: true });
        host.addEventListener("pointercancel", onPointerUp, { passive: true });
        host.addEventListener("pointerleave", onPointerUp, { passive: true });

        let raf = 0;
        let disposed = false;
        let rafRunning = false;
        let lastFrameTime = 0;
        let introStart = 0;
        let sectionActive = true;
        let heroPaused = document.body.classList.contains("map-handoff-active");
        let motionActiveUntil = 0;
        const clock = new THREE.Clock();

        const resize = () => {
          if (disposed) return;
          const width = Math.max(1, host.clientWidth);
          const height = Math.max(1, host.clientHeight);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height, false);
        };
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);

        const updateCamera = () => {
          const closingProgress = Number(host.dataset.closingProgress || 0);
          camera.position.z = baseCameraZ - clamp(closingProgress) * 0.62;
        };
        const easeOutCubic = value => 1 - Math.pow(1 - value, 3);

        const render = now => {
          rafRunning = false;
          if (disposed || document.hidden || !sectionActive || heroPaused) return;
          rafRunning = true;
          raf = requestAnimationFrame(render);
          // 60 FPS during intro/drag easing, 30 FPS while idle.
          const activeMotion = pointer.down || now < motionActiveUntil || (!reducedMotion && introStart && now - introStart < 2350);
          const frameInterval = activeMotion ? (1000 / 60) : (1000 / 30);
          if (now - lastFrameTime < frameInterval) return;
          lastFrameTime = now;

          const elapsed = clock.getElapsedTime();
          if (!introStart) introStart = now;
          const introProgress = reducedMotion ? 1 : clamp((now - introStart) / 2350);
          const eased = easeOutCubic(introProgress);
          const idleFor = pointer.lastInput ? now - pointer.lastInput : Infinity;

          if (!pointer.down) {
            if (introProgress < 1) {
              earthGroup.rotation.y = indiaYaw - (1 - eased) * Math.PI * 2;
              earthGroup.rotation.x = indiaPitch;
            } else if (!reducedMotion && idleFor > 3600) {
              const driftTime = (now - introStart - 2350) / 1000;
              const driftYaw = Math.sin(driftTime * 0.22) * (8 * Math.PI / 180);
              const driftPitch = Math.sin(driftTime * 0.16) * (3 * Math.PI / 180);
              earthGroup.rotation.y += (indiaYaw + driftYaw - earthGroup.rotation.y) * 0.018;
              earthGroup.rotation.x += (indiaPitch + driftPitch - earthGroup.rotation.x) * 0.018;
            }
          }

          const clouds = earthGroup.userData.clouds;
          if (clouds) {
            clouds.rotation.y = earthGroup.rotation.y + (reducedMotion ? 0 : elapsed * 0.00006);
            clouds.rotation.x = earthGroup.rotation.x;
          }
          stars.rotation.y = reducedMotion ? 0 : elapsed * 0.00012;
          updateCamera();
          renderer.render(scene, camera);
        };

        host.classList.add("has-3d-earth");
        host.classList.remove("earth-css-fallback");
        const onEarthPause = event => {
          heroPaused = Boolean(event.detail?.paused);
          if (heroPaused) {
            cancelAnimationFrame(raf);
            rafRunning = false;
          } else if (!disposed && sectionActive && !document.hidden && !rafRunning) {
            lastFrameTime = 0;
            raf = requestAnimationFrame(render);
          }
        };
        document.addEventListener("oddone:pauseEarth", onEarthPause);
        const heroSection = document.querySelector(".hero");
        const closingSection = document.body.classList.contains("road-story") ? null : document.querySelector(".closing-section");
        const sceneVisibility = new IntersectionObserver(entries => {
          entries.forEach(entry => { entry.target.dataset.earthVisible = entry.isIntersecting ? "1" : "0"; });
          sectionActive = Boolean(
            (heroSection && heroSection.dataset.earthVisible === "1") ||
            (closingSection && closingSection.dataset.earthVisible === "1")
          );
          if (sectionActive && !document.hidden && !disposed && !heroPaused && !rafRunning) {
            lastFrameTime = 0;
            raf = requestAnimationFrame(render);
          } else if (!sectionActive) {
            cancelAnimationFrame(raf);
            rafRunning = false;
          }
        }, { threshold: 0.01 });
        if (heroSection) sceneVisibility.observe(heroSection);
        if (closingSection) sceneVisibility.observe(closingSection);

        resize();
        raf = requestAnimationFrame(render);

        const onVisibilityChange = () => {
          if (document.hidden) {
            cancelAnimationFrame(raf);
            rafRunning = false;
          } else if (!disposed && sectionActive && !heroPaused && !rafRunning) {
            lastFrameTime = 0;
            introStart = performance.now() - 2350;
            raf = requestAnimationFrame(render);
          }
        };
        document.addEventListener("visibilitychange", onVisibilityChange);

        window.addEventListener("pagehide", () => {
          disposed = true;
          cancelAnimationFrame(raf);
          resizeObserver.disconnect();
          sceneVisibility.disconnect();
          document.removeEventListener("visibilitychange", onVisibilityChange);
          document.removeEventListener("oddone:pauseEarth", onEarthPause);
          host.removeEventListener("pointermove", onPointerMove);
          host.removeEventListener("pointerdown", onPointerDown);
          host.removeEventListener("pointerup", onPointerUp);
          host.removeEventListener("pointercancel", onPointerUp);
          host.removeEventListener("pointerleave", onPointerUp);
          earthGroup.traverse(object => {
            object.geometry?.dispose();
            if (object.material) {
              const materials = Array.isArray(object.material) ? object.material : [object.material];
              materials.forEach(material => {
                Object.values(material).forEach(value => { if (value?.isTexture) value.dispose(); });
                material.dispose();
              });
            }
          });
          starGeometry.dispose();
          renderer.dispose();
        }, { once: true });
      });
    })
    .catch(() => {
      canvas.remove();
      host.classList.add("earth-css-fallback");
    });
})();