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
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.18;

      scene.add(new THREE.AmbientLight(0x9bbce8, 1.15));
      const sun = new THREE.DirectionalLight(0xffffff, 3.1);
      sun.position.set(-3.5, 2.6, 4.5);
      scene.add(sun);
      const blueFill = new THREE.DirectionalLight(0x347bff, 1.5);
      blueFill.position.set(4, -1, 2);
      scene.add(blueFill);

      const earthGroup = new THREE.Group();
      scene.add(earthGroup);
      const loader = new THREE.TextureLoader();
      const loadTexture = (url) => new Promise((resolve) => {
        loader.load(url, (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          resolve(texture);
        }, undefined, () => resolve(null));
      });

      Promise.all([
        loadTexture('https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg'),
        loadTexture('https://threejs.org/examples/textures/planets/earth_normal_2048.jpg'),
        loadTexture('https://threejs.org/examples/textures/planets/earth_specular_2048.jpg'),
        loadTexture('https://threejs.org/examples/textures/planets/earth_clouds_1024.png')
      ]).then(([colorMap, normalMap, specularMap, cloudMap]) => {
        if (!canvas.isConnected) return;

        const earthMaterial = new THREE.MeshPhongMaterial({
          color: 0xffffff,
          map: colorMap || null,
          normalMap: normalMap || null,
          specularMap: specularMap || null,
          specular: new THREE.Color(0x2f79d8),
          shininess: 18
        });
        const earth = new THREE.Mesh(new THREE.SphereGeometry(1.43, 96, 96), earthMaterial);
        earth.rotation.z = -0.12;
        earthGroup.add(earth);

        if (cloudMap) {
          const clouds = new THREE.Mesh(
            new THREE.SphereGeometry(1.455, 96, 96),
            new THREE.MeshPhongMaterial({
              map: cloudMap, transparent: true, opacity: 0.22,
              depthWrite: false, blending: THREE.AdditiveBlending
            })
          );
          clouds.rotation.z = -0.12;
          earthGroup.add(clouds);
          earthGroup.userData.clouds = clouds;
        }

        const atmosphere = new THREE.Mesh(
          new THREE.SphereGeometry(1.56, 96, 96),
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
                gl_FragColor = vec4(0.16, 0.48, 1.0, rim * 0.82);
              }
            `,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
            transparent: true,
            depthWrite: false
          })
        );
        earthGroup.add(atmosphere);

        const starsCount = window.innerWidth < 700 ? 450 : 950;
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
        let scrollRotation = 0;
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
        const render = () => {
          if (disposed || document.hidden) return;
          raf = requestAnimationFrame(render);
          const t = clock.getElapsedTime();
          const scrollProgress = Math.min(1, Math.max(0, Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--earth-scroll')) || 0));
          // The Three.js Earth texture places India's longitude ~168 degrees away from the camera-facing meridian.
          // Smoothly reveal India as the globe grows, rather than applying an arbitrary small turn.
          const focusProgress = scrollProgress * scrollProgress * (3 - 2 * scrollProgress);
          const indiaTurn = focusProgress * 2.93;
          scrollRotation += (indiaTurn - scrollRotation) * 0.045;
          pointer.x += (pointer.tx - pointer.x) * 0.035;
          pointer.y += (pointer.ty - pointer.y) * 0.035;
          if (!pointer.down) earth.rotation.y += 0.0018;
          earth.rotation.x += (pointer.y * 0.2 - earth.rotation.x) * 0.018;
          earth.rotation.y += pointer.x * 0.004;
          earthGroup.rotation.y += (scrollRotation - earthGroup.rotation.y) * 0.08;
          const clouds = earthGroup.userData.clouds;
          if (clouds) {
            clouds.rotation.y = earth.rotation.y + t * 0.0008;
            clouds.rotation.x = earth.rotation.x;
          }
          stars.rotation.y = t * 0.002;
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
