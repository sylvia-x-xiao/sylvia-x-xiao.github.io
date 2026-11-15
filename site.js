(() => {
  const controls = document.querySelector("#filters");
  if (!controls) return;
  const buttons = Array.from(controls.querySelectorAll("button[data-filter]"));
  const papers = Array.from(document.querySelectorAll(".paper[data-tags]"));
  const groups = Array.from(document.querySelectorAll("[data-paper-group]"));
  const status = document.querySelector("#result-count");
  const empty = document.querySelector("#no-results");
  const note = document.querySelector("#corresponding-note");

  function select(button) {
    const topic = button.dataset.filter;
    let visible = 0;

    buttons.forEach((option) => option.setAttribute("aria-pressed", String(option === button)));
    papers.forEach((paper) => {
      const show = topic === "all" || paper.dataset.tags.split(" ").includes(topic);
      paper.hidden = !show;
      if (show) visible += 1;
    });
    groups.forEach((group) => {
      group.querySelector(".group-empty").hidden =
        visible === 0 || group.querySelector(".paper:not([hidden])") !== null;
    });
    note.hidden = note.parentElement.querySelector(".paper:not([hidden])") === null;
    empty.hidden = visible !== 0;
    status.textContent = topic === "all"
      ? `${visible} papers`
      : `${visible} ${visible === 1 ? "paper" : "papers"} · ${button.textContent}`;
  }

  buttons.forEach((button) => button.addEventListener("click", () => select(button)));
  select(buttons[0]);
  controls.hidden = false;
})();

(() => {
  const gallery = document.querySelector(".beach-slideshow");
  if (!gallery) return;
  const viewport = gallery.querySelector(".gallery-viewport");
  const slides = Array.from(viewport.children);
  const controls = gallery.querySelector(".gallery-controls");
  const position = controls.querySelector(".gallery-position");
  let current = 0;

  function show(index) {
    const focusWasInsideSlide = slides[current].contains(document.activeElement);
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, index) => { slide.hidden = index !== current; });
    position.textContent = `Photo ${current + 1} of ${slides.length}`;
    if (focusWasInsideSlide) slides[current].querySelector("a").focus({ preventScroll: true });
  }

  controls.querySelectorAll("button[data-direction]").forEach((button) => {
    button.addEventListener("click", () => show(current + Number(button.dataset.direction)));
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
    show(target);
  });
  show(0);
  gallery.dataset.enhanced = "true";
  controls.hidden = false;
})();
