(() => {
  if (!window.gsap || !window.ScrollTrigger) {
    document.documentElement.classList.remove("js");
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: "power3.out", duration: 0.8 });

  const showcase = document.querySelector("[data-showcase]");
  if (showcase) {
    const tabs = [...showcase.querySelectorAll("[role='tab']")];
    const panels = [...showcase.querySelectorAll("[role='tabpanel']")];

    const select = (tab, shouldFocus) => {
      const id = tab.getAttribute("aria-controls");
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      tabs.forEach((item) => {
        const on = item === tab;
        item.setAttribute("aria-selected", on ? "true" : "false");
        item.tabIndex = on ? 0 : -1;
      });
      panels.forEach((panel) => {
        const on = panel.id === id;
        if (!on) {
          panel.hidden = true;
          return;
        }
        panel.hidden = false;
        if (!reduce) {
          gsap.fromTo(panel, { autoAlpha: 0, y: 14 }, {
            autoAlpha: 1,
            y: 0,
            duration: 0.45,
            overwrite: "auto",
            clearProps: "transform"
          });
        }
      });
      if (shouldFocus) tab.focus();
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => select(tab, false));
      tab.addEventListener("keydown", (event) => {
        const keys = ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"];
        if (!keys.includes(event.key)) return;
        event.preventDefault();
        let next = index;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % tabs.length;
        if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + tabs.length) % tabs.length;
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = tabs.length - 1;
        select(tabs[next], true);
      });
    });
  }

  const media = gsap.matchMedia();

  media.add("(prefers-reduced-motion: reduce)", () => {
    gsap.set("[data-reveal]", { autoAlpha: 1, clearProps: "transform" });
  });

  media.add("(prefers-reduced-motion: no-preference)", () => {
    const lines = document.querySelectorAll("[data-hero='line']");
    if (lines.length) {
      const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
      intro
        .fromTo("[data-hero='eyebrow']", { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.55 })
        .fromTo(lines, { autoAlpha: 0, y: 36 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.12 }, "-=0.25")
        .fromTo("[data-hero='copy']", { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.7 }, "-=0.5")
        .fromTo("[data-hero='actions']", { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.55 }, "-=0.4")
        .fromTo("[data-hero='signal']", { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, stagger: 0.08, duration: 0.45 }, "-=0.35")
        .fromTo("[data-hero='orbit']", { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.1 }, 0.15);
    }

    const progress = document.querySelector(".scroll-progress");
    if (progress) {
      gsap.to(progress, {
        scaleX: 1,
        ease: "none",
        scrollTrigger: {
          trigger: document.body,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.25
        }
      });
    }

    document.querySelectorAll("[data-reveal-group]").forEach((group) => {
      const items = group.querySelectorAll("[data-reveal]");
      if (!items.length) return;
      gsap.fromTo(items, { autoAlpha: 0, y: 32 }, {
        autoAlpha: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: {
          trigger: group,
          start: "top 82%",
          once: true
        },
        onComplete: () => gsap.set(items, { clearProps: "transform" })
      });
    });

    const desktop = window.matchMedia("(min-width: 1040px)");
    if (desktop.matches) {
      const spin = document.querySelector("[data-orbit-spin]");
      if (spin) {
        gsap.to(spin, {
          rotation: 360,
          duration: 90,
          repeat: -1,
          ease: "none",
          transformOrigin: "50% 50%"
        });
      }
      const orbit = document.querySelector("[data-hero='orbit']");
      if (orbit) {
        gsap.to(orbit, {
          y: 70,
          ease: "none",
          scrollTrigger: {
            trigger: ".hero",
            start: "top top",
            end: "bottom top",
            scrub: 0.6
          }
        });
      }
      document.querySelectorAll("[data-lift]").forEach((el) => {
        const lift = gsap.quickTo(el, "y", { duration: 0.35, ease: "power2.out" });
        el.addEventListener("pointerenter", () => lift(-8));
        el.addEventListener("pointerleave", () => lift(0));
      });
    }
  });
})();
