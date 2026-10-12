(() => {
  const host = document.querySelector('.monument-scene');
  if (!host || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'history-webgl';
  canvas.setAttribute('aria-hidden', 'true');
  host.prepend(canvas);

  import('https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js')
    .then((THREE) => {
      if (!canvas.isConnected) return;
      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
      } catch (_) {
        canvas.remove();
        return;
      }

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x090a0b, 0.075);
      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
      camera.position.set(0, 0.2, 10.8);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
      renderer.setSize(host.clientWidth, host.clientHeight, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;

      scene.add(new THREE.AmbientLight(0x8d9aa8, 1.25));
      const key = new THREE.PointLight(0xf2c77f, 65, 24);
      key.position.set(-3.5, 4.2, 5);
      scene.add(key);
      const rim = new THREE.PointLight(0x9b6332, 42, 20);
      rim.position.set(4, -2, -1);
      scene.add(rim);

      const group = new THREE.Group();
      scene.add(group);

      // Stylised extruded outline of the Indian peninsula; the original SVG remains the fallback.
      const points = [
        [-1.05,3.25],[-.35,3.05],[.1,2.62],[.8,2.42],[1.15,1.88],[1.85,1.52],[1.55,1.03],[1.92,.63],[1.42,.15],[1.12,-.38],[.95,-.95],[.42,-1.48],[.18,-2.12],[-.18,-2.95],[-.55,-2.25],[-.78,-1.62],[-1.22,-1.22],[-1.52,-.7],[-1.95,-.34],[-1.72,.18],[-2.05,.55],[-1.72,.98],[-1.92,1.42],[-1.55,1.78],[-1.58,2.24],[-1.28,2.65]
      ];
      // Smooth the stylised silhouette with a closed spline instead of sharp polygon corners.
      const outline = new THREE.CatmullRomCurve3(points.map(([x, y]) => new THREE.Vector3(x, y, 0)), true, 'centripetal', 0.35);
      const smoothPoints = outline.getPoints(150).map(({ x, y }) => new THREE.Vector2(x, y));
      const shape = new THREE.Shape(smoothPoints);
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: true, bevelSegments: 8, steps: 1, bevelSize: 0.12, bevelThickness: 0.16, curveSegments: 10 });
      geometry.computeVertexNormals();

      // Sculpt the top face into a subtle relief rather than a flat badge.
      const position = geometry.attributes.position;
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        const z = position.getZ(i);
        if (z > 0.18) {
          const ridge = Math.sin(x * 2.4 + y * 1.3) * Math.cos(y * 2.7 - x * 0.7);
          const foothills = Math.sin(x * 4.5) * Math.sin(y * 3.2) * 0.5;
          position.setZ(i, z + ridge * 0.075 + foothills * 0.035);
        }
      }
      position.needsUpdate = true;
      geometry.computeVertexNormals();
      const stone = new THREE.MeshStandardMaterial({ color: 0x8b6843, metalness: 0.08, roughness: 0.9, emissive: 0x1c1007, emissiveIntensity: 0.18, flatShading: false });
      const land = new THREE.Mesh(geometry, stone);
      land.position.set(-0.25, -0.05, 0);
      group.add(land);

      // A dark relief plinth creates a visible edge and separates the landform from the background.
      const plinthGeometry = new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: true, bevelSegments: 3, bevelSize: 0.05, bevelThickness: 0.06, curveSegments: 8 });
      const plinth = new THREE.Mesh(plinthGeometry, new THREE.MeshStandardMaterial({ color: 0x17130e, metalness: 0.28, roughness: 0.6 }));
      plinth.position.set(-0.25, -0.05, -0.23);
      group.add(plinth);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 28), new THREE.LineBasicMaterial({ color: 0xe7c68d, transparent: true, opacity: 0.22 }));
      edges.position.copy(land.position);
      group.add(edges);

      // Fine, restrained elevation-like contour lines add depth without overwhelming the silhouette.
      const contourGroup = new THREE.Group();
      const contourMaterial = new THREE.LineBasicMaterial({ color: 0xf2d7a5, transparent: true, opacity: 0.12 });
      for (let i = 0; i < 5; i++) {
        const contourPoints = [];
        const rx = 0.45 + i * 0.22;
        const ry = 0.42 + i * 0.31;
        for (let step = 0; step <= 100; step++) {
          const a = (step / 100) * Math.PI * 2;
          contourPoints.push(new THREE.Vector3(-0.1 + Math.cos(a) * rx, 0.75 + Math.sin(a) * ry, 0.315));
        }
        const contour = new THREE.Line(new THREE.BufferGeometry().setFromPoints(contourPoints), contourMaterial);
        contourGroup.add(contour);
      }
      contourGroup.position.copy(land.position);
      group.add(contourGroup);

      // Deep atmospheric backlight and a low horizon plane add cinematic scale.
      const backGlow = new THREE.Mesh(
        new THREE.SphereGeometry(2.8, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0x9a5d2d, transparent: true, opacity: 0.055, side: THREE.BackSide })
      );
      backGlow.position.set(0.25, 0.45, -1.5);
      group.add(backGlow);

      const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xd9b77a, transparent: true, opacity: 0.16 });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(3.15, 0.008, 6, 160), ringMaterial);
      ring.rotation.set(0.9, 0.2, -0.4);
      ring.position.z = -0.4;
      group.add(ring);
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(3.45, 0.005, 6, 160), new THREE.MeshBasicMaterial({ color: 0x9d7144, transparent: true, opacity: 0.12 }));
      ring2.rotation.set(1.3, -0.3, 0.65);
      ring2.position.z = -0.7;
      group.add(ring2);

      const particleCount = window.innerWidth < 700 ? 130 : 280;
      const positions = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 12;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 7 - 1;
      }
      const particleGeometry = new THREE.BufferGeometry();
      particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({ color: 0xe8c98e, size: 0.024, transparent: true, opacity: 0.55, sizeAttenuation: true }));
      scene.add(particles);

      const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
      const onPointer = (event) => {
        const rect = host.getBoundingClientRect();
        pointer.tx = ((event.clientX - rect.left) / rect.width - 0.5) * 0.7;
        pointer.ty = ((event.clientY - rect.top) / rect.height - 0.5) * 0.45;
      };
      host.addEventListener('pointermove', onPointer, { passive: true });
      host.addEventListener('pointerleave', () => { pointer.tx = 0; pointer.ty = 0; }, { passive: true });

      let raf = 0;
      let disposed = false;
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
        if (disposed) return;
        raf = requestAnimationFrame(render);
        const t = clock.getElapsedTime();
        pointer.x += (pointer.tx - pointer.x) * 0.035;
        pointer.y += (pointer.ty - pointer.y) * 0.035;
        group.rotation.y = Math.sin(t * 0.12) * 0.075 + pointer.x * 0.72;
        group.rotation.x = Math.cos(t * 0.1) * 0.028 + pointer.y * 0.72;
        group.position.y = Math.sin(t * 0.38) * 0.045;
        ring.rotation.z += 0.0009;
        ring2.rotation.z -= 0.0006;
        particles.rotation.y = t * 0.008;
        renderer.render(scene, camera);
      };
      host.classList.add('has-webgl');
      render();

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) cancelAnimationFrame(raf);
        else if (!disposed) render();
      });
      window.addEventListener('pagehide', () => {
        disposed = true;
        cancelAnimationFrame(raf);
        observer.disconnect();
        host.removeEventListener('pointermove', onPointer);
        geometry.dispose();
        stone.dispose();
        renderer.dispose();
      }, { once: true });
    })
    .catch(() => canvas.remove());
})();