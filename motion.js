(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const progress = document.createElement("div");
  progress.className = "scroll-progress";
  progress.setAttribute("aria-hidden", "true");
  document.body.append(progress);

  const hero = document.querySelector(".hero");
  const closing = document.querySelector(".closing-section");
  const earth = document.querySelector(".world-globe");
  const cards = [...document.querySelectorAll(".era-card")];
  const revealItems = [...document.querySelectorAll(".section-heading,.timeline-rail,.era-card,.history-note,.closing-section > *")];

  revealItems.forEach((el, index) => {
    el.classList.add("motion-reveal");
    el.style.setProperty("--reveal-delay", `${(index % 4) * 75}ms`);
  });

  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -28px 0px" });
    revealItems.forEach(el => revealObserver.observe(el));
  } else {
    revealItems.forEach(el => el.classList.add("is-visible"));
  }

  let scrollRaf = 0;
  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const smoothstep = value => {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
  };

  const updateScroll = () => {
    const doc = document.documentElement;
    const maxScroll = Math.max(1, doc.scrollHeight - window.innerHeight);
    progress.style.transform = `scaleX(${clamp(window.scrollY / maxScroll)})`;

    if (earth && hero && closing) {
      const heroRect = hero.getBoundingClientRect();
      const closingRect = closing.getBoundingClientRect();
      const heroProgress = clamp((window.innerHeight - heroRect.bottom) / Math.max(1, heroRect.height * 0.58));
      const closingProgress = clamp((window.innerHeight - closingRect.top) / Math.max(1, closingRect.height * 0.62));
      const toClosing = smoothstep(closingProgress);
      const awayFromHero = smoothstep(heroProgress);
      const opacity = Math.max(0, (1 - awayFromHero) * 0.96, toClosing * 0.92);
      if (reduceMotion) {
        root.style.setProperty("--earth-x", "35vw");
        root.style.setProperty("--earth-y", "52vh");
        root.style.setProperty("--earth-scale", "0.92");
        root.style.setProperty("--earth-opacity", "0.38");
        root.style.setProperty("--closing-progress", "0");
        earth.dataset.closingProgress = "0";
        earth.dataset.heroProgress = "0";
        scrollRaf = 0;
        return;
      }
      const mobile = window.innerWidth <= 820;
      const startX = mobile ? 54 : 35;
      const endX = mobile ? 79 : 76;
      const startY = mobile ? 28 : 52;
      const endY = mobile ? 52 : 55;
      const startScale = mobile ? 0.76 : 0.92;
      const endScale = mobile ? 1.12 : 1.34;
      const x = startX + (endX - startX) * toClosing;
      const y = startY + (endY - startY) * toClosing;
      const scale = startScale + (endScale - startScale) * toClosing;
      root.style.setProperty("--earth-x", `${x}vw`);
      root.style.setProperty("--earth-y", `${y}vh`);
      root.style.setProperty("--earth-scale", scale.toFixed(3));
      root.style.setProperty("--earth-opacity", opacity.toFixed(3));
      root.style.setProperty("--closing-progress", toClosing.toFixed(3));
      earth.dataset.closingProgress = toClosing.toFixed(3);
      earth.dataset.heroProgress = heroProgress.toFixed(3);
    }
    scrollRaf = 0;
  };

  const scheduleScroll = () => {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(updateScroll);
  };
  window.addEventListener("scroll", scheduleScroll, { passive: true });
  window.addEventListener("resize", scheduleScroll, { passive: true });
  updateScroll();

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener("click", event => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
  });

  cards.forEach((card, index) => {
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `History chapter ${index + 1}: ${card.querySelector("h3")?.textContent || "Explore"}`);
  });

  if (!reduceMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    let pointerRaf = 0;
    window.addEventListener("pointermove", event => {
      if (pointerRaf) return;
      pointerRaf = requestAnimationFrame(() => {
        pointerRaf = 0;
        const x = event.clientX / Math.max(1, window.innerWidth) - 0.5;
        const y = event.clientY / Math.max(1, window.innerHeight) - 0.5;
        root.style.setProperty("--pointer-x", `${event.clientX}px`);
        root.style.setProperty("--pointer-y", `${event.clientY}px`);
        cards.forEach(card => {
          const rect = card.getBoundingClientRect();
          if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
          card.style.setProperty("--card-glow-x", `${((event.clientX - rect.left) / rect.width) * 100}%`);
          card.style.setProperty("--card-glow-y", `${((event.clientY - rect.top) / rect.height) * 100}%`);
        });
      });
    }, { passive: true });
  }
})();