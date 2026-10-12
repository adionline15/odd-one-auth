(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const progress = document.createElement("div");
  progress.className = "scroll-progress";
  progress.setAttribute("aria-hidden", "true");
  document.body.append(progress);
  const glow = document.createElement("div");
  glow.className = "cursor-glow";
  glow.setAttribute("aria-hidden", "true");
  document.body.append(glow);

  const hero = document.querySelector(".hero");
  const scene = document.querySelector(".monument-scene");
  const india = document.querySelector(".india-mark");
  const title = document.querySelector("#hero-title");
  const panel = document.querySelector(".auth-panel");
  const cards = [...document.querySelectorAll(".era-card")];
  const revealItems = [
    ...document.querySelectorAll(".section-heading, .timeline-rail, .era-card, .history-note, .closing-section > *")
  ];
  revealItems.forEach((el, i) => {
    el.classList.add("motion-reveal");
    el.style.setProperty("--reveal-delay", `${Math.min(i % 4, 3) * 90}ms`);
  });

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -35px 0px" });
    revealItems.forEach(el => observer.observe(el));
  } else {
    revealItems.forEach(el => el.classList.add("is-visible"));
  }

  if (!reduceMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    let raf = 0, pointerX = innerWidth / 2, pointerY = innerHeight / 2;
    window.addEventListener("pointermove", event => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        root.style.setProperty("--pointer-x", `${pointerX}px`);
        root.style.setProperty("--pointer-y", `${pointerY}px`);
        if (hero && scene) {
          const x = (pointerX / innerWidth - .5);
          const y = (pointerY / innerHeight - .5);
          scene.style.setProperty("--scene-x", `${x * 15}px`);
          scene.style.setProperty("--scene-y", `${y * 12}px`);
          if (india) india.style.transform = `translate3d(${x * 8}px,${y * 8}px,0) rotateY(${x * -5}deg) rotateX(${y * 4}deg)`;
          if (title) title.style.setProperty("--title-shift", `${x * -4}px`);
          if (panel) panel.style.setProperty("--panel-tilt", `${x * .6}deg`);
        }
      });
    }, { passive: true });
    document.querySelectorAll(".era-card").forEach(card => {
      card.addEventListener("pointermove", event => {
        const r = card.getBoundingClientRect();
        const x = (event.clientX - r.left) / r.width - .5;
        const y = (event.clientY - r.top) / r.height - .5;
        card.style.setProperty("--card-rotate-x", `${y * -3}deg`);
        card.style.setProperty("--card-rotate-y", `${x * 3}deg`);
        card.style.setProperty("--card-glow-x", `${(x + .5) * 100}%`);
        card.style.setProperty("--card-glow-y", `${(y + .5) * 100}%`);
      });
      card.addEventListener("pointerleave", () => {
        card.style.setProperty("--card-rotate-x", "0deg");
        card.style.setProperty("--card-rotate-y", "0deg");
      });
    });
  }

  let scrollRaf = 0;
  const updateScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const ratio = max > 0 ? scrollY / max : 0;
    progress.style.transform = `scaleX(${ratio})`;
    const heroHeight = hero ? hero.offsetHeight : 1;
    root.style.setProperty("--hero-scroll", Math.min(scrollY / heroHeight, 1).toFixed(3));
    scrollRaf = 0;
  };
  window.addEventListener("scroll", () => {
    if (!scrollRaf) scrollRaf = requestAnimationFrame(updateScroll);
  }, { passive: true });
  window.addEventListener("resize", updateScroll, { passive: true });
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
    card.style.setProperty("--card-index", index);
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `History chapter ${index + 1}: ${card.querySelector("h3")?.textContent || "Explore"}`);
  });
})();