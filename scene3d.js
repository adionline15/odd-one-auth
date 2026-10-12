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
      camera.position.set(0, 0.25, 12);
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
      const shape = new THREE.Shape();
      shape.moveTo(points[0][0], points[0][1]);
      points.slice(1).forEach(([x,y]) => shape.lineTo(x,y));
      shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.08, bevelThickness: 0.08, curveSegments: 2 });
      geometry.computeVertexNormals();
      const stone = new THREE.MeshStandardMaterial({ color: 0x987047, metalness: 0.38, roughness: 0.48, emissive: 0x2a1608, emissiveIntensity: 0.45 });
      const land = new THREE.Mesh(geometry, stone);
      land.position.set(-0.25, -0.05, 0);
      group.add(land);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 18), new THREE.LineBasicMaterial({ color: 0xf1d6a0, transparent: true, opacity: 0.55 }));
      edges.position.copy(land.position);
      group.add(edges);

      const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xd9b77a, transparent: true, opacity: 0.3 });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(3.15, 0.008, 6, 160), ringMaterial);
      ring.rotation.set(0.9, 0.2, -0.4);
      ring.position.z = -0.4;
      group.add(ring);
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(3.45, 0.005, 6, 160), new THREE.MeshBasicMaterial({ color: 0x9d7144, transparent: true, opacity: 0.23 }));
      ring2.rotation.set(1.3, -0.3, 0.65);
      ring2.position.z = -0.7;
      group.add(ring2);

      const particleCount = window.innerWidth < 700 ? 220 : 420;
      const positions = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 12;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 7 - 1;
      }
      const particleGeometry = new THREE.BufferGeometry();
      particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({ color: 0xe8c98e, size: 0.018, transparent: true, opacity: 0.75, sizeAttenuation: true }));
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
        group.rotation.y = Math.sin(t * 0.16) * 0.12 + pointer.x;
        group.rotation.x = Math.cos(t * 0.13) * 0.045 + pointer.y;
        group.position.y = Math.sin(t * 0.55) * 0.07;
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