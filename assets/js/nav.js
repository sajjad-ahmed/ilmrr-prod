(() => {
  const nav = document.querySelector(".nav");
  if (!nav) return;

  const toggle = nav.querySelector(".nav-toggle");
  const menu = document.getElementById("site-menu");
  const desktop = window.matchMedia("(min-width: 900px)");

  function setOpen(open) {
    nav.classList.toggle("is-open", open);
    if (toggle) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      const label = toggle.querySelector(".sr-only");
      if (label) label.textContent = open ? "Close menu" : "Open menu";
    }
    document.body.style.overflow = open && !desktop.matches ? "hidden" : "";
  }

  if (toggle && menu) {
    toggle.addEventListener("click", () => {
      setOpen(!nav.classList.contains("is-open"));
    });

    menu.addEventListener("click", (event) => {
      const link = event.target.closest("a");
      if (link) setOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setOpen(false);
    });

    document.addEventListener("click", (event) => {
      if (!nav.contains(event.target)) setOpen(false);
    });

    desktop.addEventListener("change", () => setOpen(false));
  }

  const onScroll = () => {
    nav.classList.toggle("is-scrolled", window.scrollY > 12);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const links = [...nav.querySelectorAll(".menu a[href*='#']")];
  const sections = links
    .map((link) => {
      const hash = link.getAttribute("href").split("#")[1];
      const section = hash ? document.getElementById(hash) : null;
      return section ? { link, section } : null;
    })
    .filter(Boolean);

  if (!sections.length || !("IntersectionObserver" in window)) return;

  const visible = new Map();
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      visible.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);
    });
    let current = null;
    let best = 0;
    sections.forEach(({ section }) => {
      const ratio = visible.get(section) || 0;
      if (ratio > best) {
        best = ratio;
        current = section;
      }
    });
    sections.forEach(({ link, section }) => {
      if (section === current) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }, { rootMargin: "-35% 0px -45% 0px", threshold: [0, 0.2, 0.45, 0.7] });

  sections.forEach(({ section }) => observer.observe(section));
})();
