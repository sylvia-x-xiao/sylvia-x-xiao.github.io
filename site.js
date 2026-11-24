(() => {
  const controls = document.querySelector("#filters");
  if (!controls) return;
  const buttons = Array.from(controls.querySelectorAll("button[data-filter]"));
  const papers = Array.from(document.querySelectorAll(".paper[data-tags]"));
  const sections = Array.from(document.querySelectorAll(".research-section"));
  const pubGroups = Array.from(document.querySelectorAll(".pub-group"));
  const status = document.querySelector("#result-count");
  const empty = document.querySelector("#no-results");
  const note = document.querySelector("#corresponding-note");
  const toggleBtn = document.querySelector("#toggle-abstracts");
  const listingSelector = ["conferences", "seminars", "presentations"]
    .map((kind) => `.paper-listing[data-kind="${kind}"]`)
    .join(", ");
  const listings = Array.from(document.querySelectorAll(listingSelector), (row) => {
    const content = document.createElement("span");
    content.className = "paper-listing-content";
    content.append(...row.childNodes);

    const measure = document.createElement("span");
    measure.className = "paper-listing-measure";
    measure.setAttribute("aria-hidden", "true");
    measure.append(content.cloneNode(true));

    content.id = `${row.closest(".paper").id}-${row.dataset.kind}-listing`;
    const label = content.querySelector(".listing-label").textContent.replace(/:$/, "");
    const button = document.createElement("button");
    button.className = "paper-listing-toggle";
    button.type = "button";
    button.hidden = true;
    button.setAttribute("aria-controls", content.id);

    const listing = { row, content, measure, label, button, expanded: false, overflows: false };
    button.addEventListener("click", () => {
      listing.expanded = !listing.expanded;
      renderListing(listing);
    });
    row.append(content, button);
    return listing;
  });

  function renderListing({ row, content, label, button, expanded, overflows }) {
    const folded = overflows && !expanded;
    if (!overflows && document.activeElement === button) {
      content.tabIndex = -1;
      content.focus({ preventScroll: true });
    }
    row.classList.toggle("paper-listing--folded", folded);
    button.hidden = !overflows;
    button.setAttribute("aria-expanded", String(!folded));
    const text = folded ? "Show more" : "Show less";
    if (button.textContent !== text) {
      button.textContent = text;
      button.setAttribute("aria-label", `${text} about ${label.toLowerCase()}`);
    }
  }

  function refreshListings() {
    const visible = [];
    for (const listing of listings) {
      const width = listing.row.getBoundingClientRect().width;
      if (width <= 0) continue;
      const { paddingInlineStart, paddingInlineEnd } = getComputedStyle(listing.row);
      visible.push({ listing, width: width - parseFloat(paddingInlineStart) - parseFloat(paddingInlineEnd) });
    }

    // Measure the full line with its inline formatting and no space reserved for the button.
    visible.forEach(({ listing }) => listing.row.append(listing.measure));
    visible.forEach(({ listing, width }) => {
      listing.overflows = listing.measure.firstElementChild.getBoundingClientRect().width > width;
    });
    visible.forEach(({ listing }) => {
      listing.measure.remove();
      renderListing(listing);
    });
  }

  let listingFrame = 0;
  function queueListingRefresh() {
    if (listingFrame) return;
    listingFrame = window.requestAnimationFrame(() => {
      listingFrame = 0;
      refreshListings();
    });
  }

  const counts = new Map();
  buttons.forEach((btn) => {
    const key = btn.dataset.filter;
    const label = btn.dataset.label || btn.textContent.trim();
    btn.dataset.label = label;
    const count = key === "all"
      ? papers.length
      : papers.filter((p) => p.dataset.tags.split(" ").includes(key)).length;
    counts.set(key, count);
    if (key !== "all" && count === 0) {
      btn.hidden = true;
    } else {
      btn.hidden = false;
      btn.innerHTML = "";
      btn.append(document.createTextNode(label));
      const badge = document.createElement("span");
      badge.className = "filter-count";
      badge.textContent = `(${count})`;
      btn.append(badge);
    }
  });

  function visibleDisclosures() {
    return papers
      .filter((p) => !p.hidden)
      .map((p) => p.querySelector("details"))
      .filter(Boolean);
  }

  function refreshAbstractToggle() {
    if (!toggleBtn) return;
    const list = visibleDisclosures();
    if (list.length === 0) {
      toggleBtn.hidden = true;
      return;
    }
    toggleBtn.hidden = false;
    const allOpen = list.every((d) => d.open);
    toggleBtn.textContent = allOpen ? "Collapse all abstracts" : "Expand all abstracts";
    toggleBtn.setAttribute("aria-expanded", String(allOpen));
  }

  function syncUrl(topic) {
    if (!window.history || !window.history.replaceState) return;
    const url = new URL(window.location.href);
    if (topic === "all") {
      url.searchParams.delete("topic");
    } else {
      url.searchParams.set("topic", topic);
    }
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }

  function select(button, updateUrl = true) {
    const topic = button.dataset.filter;
    const label = button.dataset.label || button.textContent;
    let visible = 0;

    buttons.forEach((opt) => opt.setAttribute("aria-pressed", String(opt === button)));
    papers.forEach((paper) => {
      const show = topic === "all" || paper.dataset.tags.split(" ").includes(topic);
      paper.hidden = !show;
      if (show) visible += 1;
    });

    pubGroups.forEach((pg) => {
      pg.hidden = pg.querySelector(".paper:not([hidden])") === null;
    });
    sections.forEach((sec) => {
      sec.hidden = sec.querySelector(".paper:not([hidden])") === null;
    });
    if (note) {
      note.hidden = note.parentElement.querySelector(".paper:not([hidden])") === null;
    }
    empty.hidden = visible !== 0;
    status.textContent = topic === "all"
      ? `${visible} papers`
      : `${visible} ${visible === 1 ? "paper" : "papers"} · ${label}`;

    if (updateUrl) syncUrl(topic);
    refreshAbstractToggle();
    refreshListings();
  }

  function revealHashTarget() {
    const rawHash = window.location.hash ? window.location.hash.slice(1) : "";
    if (!rawHash) return;
    let id = rawHash;
    try {
      id = decodeURIComponent(rawHash);
    } catch (_) {
      id = rawHash;
    }
    const target = document.getElementById(id);
    if (!target) return;
    const paper = target.classList.contains("paper") ? target : target.closest(".paper");
    if (!paper) return;
    if (paper.hidden) {
      select(buttons[0], true);
    }
    const disclosure = paper.querySelector("details");
    if (disclosure && !disclosure.open) {
      disclosure.open = true;
      refreshAbstractToggle();
    }
  }

  buttons.forEach((btn) => btn.addEventListener("click", () => select(btn, true)));

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const list = visibleDisclosures();
      const shouldOpen = !list.every((d) => d.open);
      list.forEach((d) => { d.open = shouldOpen; });
      refreshAbstractToggle();
    });
  }

  papers.forEach((p) => {
    const d = p.querySelector("details");
    if (d) d.addEventListener("toggle", refreshAbstractToggle);
  });

  const requestedTopic = new URLSearchParams(window.location.search).get("topic");
  const initialBtn = buttons.find((b) => b.dataset.filter === requestedTopic && !b.hidden) || buttons[0];
  select(initialBtn, false);
  revealHashTarget();
  window.addEventListener("hashchange", revealHashTarget);
  controls.hidden = false;

  if (listings.length) {
    window.addEventListener("resize", queueListingRefresh);
    if (document.fonts) {
      document.fonts.ready.then(queueListingRefresh);
      document.fonts.addEventListener("loadingdone", queueListingRefresh);
    }
    if (typeof ResizeObserver === "function") {
      const widths = new WeakMap();
      const observer = new ResizeObserver((entries) => {
        for (const { target, contentRect } of entries) {
          if (widths.get(target) !== contentRect.width) queueListingRefresh();
          widths.set(target, contentRect.width);
        }
      });
      const groups = new Set(listings.map(({ row }) => row.parentElement));
      groups.forEach((group) => observer.observe(group));
    }
  }

  let closedBeforePrint = [];
  window.addEventListener("beforeprint", () => {
    closedBeforePrint = papers
      .map((p) => p.querySelector("details"))
      .filter((d) => d && !d.open);
    closedBeforePrint.forEach((d) => { d.open = true; });
  });
  window.addEventListener("afterprint", () => {
    closedBeforePrint.forEach((d) => { d.open = false; });
    closedBeforePrint = [];
    refreshAbstractToggle();
    queueListingRefresh();
  });
})();

(() => {
  const gallery = document.querySelector(".beach-slideshow");
  if (!gallery) return;
  const viewport = gallery.querySelector(".gallery-viewport");
  const slides = Array.from(viewport.children);
  const controls = gallery.querySelector(".gallery-controls");
  const position = controls.querySelector(".gallery-position");
  const dialog = document.querySelector("#gallery-lightbox");
  const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let current = 0;
  let lastTrigger = null;
  let animTarget = null;
  let animTimer = null;

  if (slides.length === 0) return;

  function updateStatus(index) {
    current = ((index % slides.length) + slides.length) % slides.length;
    const text = `Photo ${current + 1} of ${slides.length}`;
    if (position.textContent !== text) {
      position.textContent = text;
    }
  }

  function slideLeft(slide, index) {
    const base = typeof viewport.offsetLeft === "number" ? viewport.offsetLeft : 0;
    const raw = typeof slide.offsetLeft === "number" ? slide.offsetLeft - base : index * (viewport.clientWidth || 0);
    return Math.max(0, raw);
  }

  function scrollToSlide(index, instant = false) {
    const next = ((index % slides.length) + slides.length) % slides.length;
    const isMultiJump = Math.abs(next - current) > 1;
    const slide = slides[next];
    const targetLeft = slideLeft(slide, next);
    const useInstant = instant || reducedMotion || isMultiJump;

    updateStatus(next);
    clearTimeout(animTimer);
    if (useInstant) {
      animTarget = null;
      try {
        viewport.scrollTo({ left: targetLeft, behavior: "instant" });
      } catch (_) {
        viewport.scrollTo({ left: targetLeft, behavior: "auto" });
      }
      viewport.scrollLeft = targetLeft;
    } else {
      animTarget = targetLeft;
      animTimer = setTimeout(() => { animTarget = null; }, 500);
      viewport.scrollTo({ left: targetLeft, behavior: "smooth" });
    }
    if (dialog && dialog.open) {
      renderLightbox(next);
    }
  }

  let ticking = false;
  viewport.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      ticking = false;
      if (animTarget !== null) {
        if (Math.abs(viewport.scrollLeft - animTarget) <= 4) {
          animTarget = null;
        } else {
          return;
        }
      }
      const width = viewport.clientWidth || 1;
      const approx = Math.round(viewport.scrollLeft / width);
      const bounded = Math.max(0, Math.min(slides.length - 1, approx));
      updateStatus(bounded);
    });
  }, { passive: true });

  controls.querySelectorAll("button[data-direction]").forEach((button) => {
    button.addEventListener("click", () => scrollToSlide(current + Number(button.dataset.direction)));
  });

  gallery.addEventListener("keydown", (event) => {
    const target = {
      ArrowLeft: current - 1,
      ArrowRight: current + 1,
      Home: 0,
      End: slides.length - 1,
    }[event.key];
    if (typeof target !== "number" || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    scrollToSlide(target);
  });

  function renderLightbox(index) {
    if (!dialog) return;
    const img = slides[index].querySelector("img");
    const lightImg = dialog.querySelector("#lightbox-img");
    const lightCap = dialog.querySelector("#lightbox-caption");
    const lightPos = dialog.querySelector("#lightbox-position");
    lightImg.src = slides[index].querySelector("a").getAttribute("href");
    lightImg.alt = img.alt;
    lightCap.textContent = img.alt;
    lightPos.textContent = `Photo ${index + 1} of ${slides.length}`;
  }

  if (dialog && typeof dialog.showModal === "function") {
    const closeBtn = dialog.querySelector("#lightbox-close");
    dialog.querySelectorAll("button[data-lightbox-dir]").forEach((btn) => {
      btn.addEventListener("click", () => scrollToSlide(current + Number(btn.dataset.lightboxDir), true));
    });
    closeBtn.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        scrollToSlide(current - 1, true);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        scrollToSlide(current + 1, true);
      }
    });
    dialog.addEventListener("close", () => {
      if (lastTrigger && typeof lastTrigger.focus === "function") {
        lastTrigger.focus({ preventScroll: true });
      }
    });

    slides.forEach((slide, idx) => {
      const anchor = slide.querySelector("a");
      anchor.addEventListener("click", (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        lastTrigger = anchor;
        scrollToSlide(idx, true);
        renderLightbox(idx);
        dialog.showModal();
      });
    });
  }

  updateStatus(0);
  gallery.dataset.enhanced = "true";
  controls.hidden = false;
})();
