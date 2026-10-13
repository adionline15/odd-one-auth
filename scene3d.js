(() => {
  const host = document.querySelector('.world-globe');
  if (!host || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

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
          texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
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
          normalScale: new THREE.Vector2(0.62, 0.62),
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

        const pointer = { x: 0, y: 0, tx: 0, ty: 0, down: false, lastX: 0 };
        const onPointerMove = (event) => {
          const rect = host.getBoundingClientRect();
          pointer.tx = ((event.clientX - rect.left) / rect.width - 0.5) * 0.48;
          pointer.ty = ((event.clientY - rect.top) / rect.height - 0.5) * 0.28;
          if (pointer.down) {
            earth.rotation.y += (event.clientX - pointer.lastX) * 0.006;
          }
          pointer.lastX = event.clientX;
        };
        const onPointerDown = (event) => {
          pointer.down = true;
          pointer.lastX = event.clientX;
          host.setPointerCapture?.(event.pointerId);
        };
        const onPointerUp = () => { pointer.down = false; };
        host.addEventListener('pointermove', onPointerMove, { passive: true });
        host.addEventListener('pointerdown', onPointerDown, { passive: true });
        host.addEventListener('pointerup', onPointerUp, { passive: true });
        host.addEventListener('pointercancel', onPointerUp, { passive: true });
        host.addEventListener('pointerleave', () => { pointer.tx = 0; pointer.ty = 0; pointer.down = false; }, { passive: true });

        let raf = 0;
        let disposed = false;
        let scrollRotation = Math.PI;
        let lastFrameTime = 0;
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
        const render = (now = 0) => {
          if (disposed || document.hidden) return;
          raf = requestAnimationFrame(render);
          // Cap the scene to ~30fps: keep interactions smooth without monopolising the GPU.
          if (now - lastFrameTime < 33) return;
          lastFrameTime = now;
          const t = clock.getElapsedTime();
          // Keep the globe locked on the India-facing orientation; no scroll-driven orbit.
          scrollRotation = Math.PI;
          pointer.x += (pointer.tx - pointer.x) * 0.035;
          pointer.y += (pointer.ty - pointer.y) * 0.035;
          earth.rotation.x += (pointer.y * 0.06 - earth.rotation.x) * 0.018;
          earthGroup.rotation.y = scrollRotation;
          const clouds = earthGroup.userData.clouds;
          if (clouds) {
            clouds.rotation.y = earth.rotation.y;
            clouds.rotation.x = earth.rotation.x;
          }
          stars.rotation.y = t * 0.0005;
          renderer.render(scene, camera);
        };
        host.classList.add('has-3d-earth');
        host.classList.remove('earth-css-fallback');
        resize();
        render();

        document.addEventListener('visibilitychange', () => {
          if (document.hidden) cancelAnimationFrame(raf);
          else if (!disposed) render();
        });
        window.addEventListener('pagehide', () => {
          disposed = true;
          cancelAnimationFrame(raf);
          observer.disconnect();
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
