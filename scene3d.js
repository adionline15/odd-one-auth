(() => {
  const host = document.querySelector('.world-globe');
  if (!host) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const canvas = document.createElement('canvas');
  canvas.className = 'earth-webgl';
  canvas.setAttribute('aria-hidden', 'true');
  host.prepend(canvas);

  import('https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js')
    .then((THREE) => {
      if (!canvas.isConnected) return;
      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({
          canvas, alpha: true, antialias: true, powerPreference: 'high-performance'
        });
      } catch (_) {
        canvas.remove();
        host.classList.add('earth-css-fallback');
        return;
      }

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
      camera.position.set(0, 0, 4.15);
      const baseCameraZ = 4.15;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1 : 1.25));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.18;

      scene.add(new THREE.AmbientLight(0xb7c9df, 0.48));
      const sun = new THREE.DirectionalLight(0xffffff, 2.25);
      sun.position.set(-3.5, 2.6, 4.5);
      scene.add(sun);
      const nightFill = new THREE.DirectionalLight(0x29476d, 0.28);
      nightFill.position.set(4, -1, -3);
      scene.add(nightFill);

      const earthGroup = new THREE.Group();
      scene.add(earthGroup);
      const loader = new THREE.TextureLoader();
      const loadTexture = (url, colorMap = false) => new Promise((resolve) => {
        loader.load(url, (texture) => {
          texture.colorSpace = colorMap ? THREE.SRGBColorSpace : THREE.NoColorSpace;
          texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          texture.generateMipmaps = true;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.needsUpdate = true;
          resolve(texture);
        }, undefined, () => resolve(null));
      });

      Promise.all([
        loadTexture('https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg', true),
        loadTexture('https://threejs.org/examples/textures/planets/earth_normal_2048.jpg'),
        loadTexture('https://threejs.org/examples/textures/planets/earth_specular_2048.jpg'),
        loadTexture('https://threejs.org/examples/textures/planets/earth_clouds_1024.png', true)
      ]).then(([colorMap, normalMap, specularMap, cloudMap]) => {
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
        const earth = new THREE.Mesh(new THREE.SphereGeometry(1.43, 64, 64), earthMaterial);
        earth.rotation.z = -0.12;
        earthGroup.add(earth);

        if (cloudMap) {
          const clouds = new THREE.Mesh(
            new THREE.SphereGeometry(1.455, 48, 48),
            new THREE.MeshPhongMaterial({
              map: cloudMap, transparent: true, opacity: 0.32,
              color: 0xe8edf5, depthWrite: false, blending: THREE.NormalBlending
            })
          );
          clouds.rotation.z = -0.12;
          earthGroup.add(clouds);
          earthGroup.userData.clouds = clouds;
        }

        const atmosphere = new THREE.Mesh(
          new THREE.SphereGeometry(1.56, 48, 48),
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

        const starsCount = window.innerWidth < 700 ? 100 : 260;
        const starPositions = new Float32Array(starsCount * 3);
        for (let i = 0; i < starsCount; i++) {
          starPositions[i * 3] = (Math.random() - 0.5) * 9;
          starPositions[i * 3 + 1] = (Math.random() - 0.5) * 7;
          starPositions[i * 3 + 2] = -1.2 - Math.random() * 4;
        }
        const starGeometry = new THREE.BufferGeometry();
        starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({
          color: 0x9ccaff, size: 0.012, transparent: true, opacity: 0.7
        }));
        scene.add(stars);

      const updateCityMarkers = () => {
        const closingProgress = Number(host.dataset.closingProgress || 0);
        camera.position.z = baseCameraZ - Math.min(1, Math.max(0, closingProgress)) * 0.62;
      };

      const pointer = { x: 0, y: 0, down: false, lastX: 0, lastY: 0, lastInput: 0 };
        const indiaYaw = 1.38;
        const indiaPitch = -0.08;
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const onPointerMove = (event) => {
          if (!pointer.down) return;
          const dx = event.clientX - pointer.lastX;
          const dy = event.clientY - pointer.lastY;
          earthGroup.rotation.y += dx * 0.005;
          earthGroup.rotation.x = clamp(earthGroup.rotation.x + dy * 0.003, -0.45, 0.45);
          pointer.lastX = event.clientX;
          pointer.lastY = event.clientY;
          pointer.lastInput = performance.now();
        };
        const onPointerDown = (event) => {
          pointer.down = true;
          pointer.lastX = event.clientX;
          pointer.lastY = event.clientY;
          pointer.lastInput = performance.now();
          host.setPointerCapture?.(event.pointerId);
        };
        const onPointerUp = () => {
          pointer.down = false;
          pointer.lastInput = performance.now();
        };
        host.addEventListener('pointermove', onPointerMove, { passive: true });
        host.addEventListener('pointerdown', onPointerDown, { passive: true });
        host.addEventListener('pointerup', onPointerUp, { passive: true });
        host.addEventListener('pointercancel', onPointerUp, { passive: true });
        host.addEventListener('pointerleave', onPointerUp, { passive: true });

        let raf = 0;
        let disposed = false;
        let lastFrameTime = 0;
        let introStart = 0;
        let lastTime = 0;
        let rafRunning = false;
        const clock = new THREE.Clock();
        const resize = () => {
          if (disposed) return;
          const w = Math.max(1, host.clientWidth);
          const h = Math.max(1, host.clientHeight);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h, false);
        };
        const observer = new ResizeObserver(resize);
        observer.observe(host);
        const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
        const render = (now = 0) => {
          rafRunning = false;
          if (disposed || document.hidden || !sectionActive) return;
          rafRunning = true;
          raf = requestAnimationFrame(render);
          // Render at display rate on capable devices; no DOM reads or framework state updates per frame.
          const frameInterval = window.innerWidth < 700 ? 1000 / 45 : 1000 / 60;
          if (now - lastFrameTime < frameInterval) return;
          lastFrameTime = now;
          const elapsed = clock.getElapsedTime();
          if (!introStart) introStart = now;
          const introProgress = reducedMotion ? 1 : clamp((now - introStart) / 2350, 0, 1);
          const eased = easeOutCubic(introProgress);
          const idleFor = pointer.lastInput ? now - pointer.lastInput : Infinity;
          if (!pointer.down) {
            if (introProgress < 1) {
              earthGroup.rotation.y = indiaYaw - (1 - eased) * Math.PI * 2;
              earthGroup.rotation.x = indiaPitch;
            } else if (idleFor > 3600) {
              const driftTime = (now - introStart - 2350) / 1000;
              const driftYaw = reducedMotion ? 0 : Math.sin(driftTime * 0.22) * (8 * Math.PI / 180);
              const driftPitch = reducedMotion ? 0 : Math.sin(driftTime * 0.16) * (3 * Math.PI / 180);
              const targetYaw = indiaYaw + driftYaw;
              const targetPitch = indiaPitch + driftPitch;
              earthGroup.rotation.y += (targetYaw - earthGroup.rotation.y) * 0.018;
              earthGroup.rotation.x += (targetPitch - earthGroup.rotation.x) * 0.018;
            }
          }
          const clouds = earthGroup.userData.clouds;
          if (clouds) {
            clouds.rotation.y = earthGroup.rotation.y + (reducedMotion ? 0 : elapsed * 0.00006);
            clouds.rotation.x = earthGroup.rotation.x;
          }
          stars.rotation.y = reducedMotion ? 0 : elapsed * 0.00012;
          updateCityMarkers();
          renderer.render(scene, camera);
        };
        host.classList.add('has-3d-earth');
        host.classList.remove('earth-css-fallback');
        let sectionActive = true;
        const heroSection = document.querySelector('.hero');
        const closingSection = document.querySelector('.closing-section');
        const sceneVisibility = new IntersectionObserver((entries) => {
          entries.forEach((entry) => { entry.target.dataset.earthVisible = entry.isIntersecting ? '1' : '0'; });
          sectionActive = Boolean(
            (heroSection && heroSection.dataset.earthVisible === '1') ||
            (closingSection && closingSection.dataset.earthVisible === '1')
          );
          if (sectionActive && !document.hidden && !disposed && !rafRunning) {
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
        render();

        document.addEventListener('visibilitychange', () => {
          if (document.hidden) {
            cancelAnimationFrame(raf);
            rafRunning = false;
          } else if (!disposed && sectionActive && !rafRunning) {
            lastFrameTime = 0;
            introStart = performance.now() - 2350;
            raf = requestAnimationFrame(render);
          }
        });
        window.addEventListener('pagehide', () => {
          disposed = true;
          cancelAnimationFrame(raf);
          observer.disconnect();
          sceneVisibility.disconnect();
          host.removeEventListener('pointermove', onPointerMove);
          host.removeEventListener('pointerdown', onPointerDown);
          host.removeEventListener('pointerup', onPointerUp);
          host.removeEventListener('pointercancel', onPointerUp);
          earthGroup.traverse((obj) => {
            obj.geometry?.dispose();
            if (obj.material) {
              const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
              materials.forEach((mat) => {
                Object.values(mat).forEach((value) => { if (value?.isTexture) value.dispose(); });
                mat.dispose();
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
      host.classList.add('earth-css-fallback');
    });
})();
