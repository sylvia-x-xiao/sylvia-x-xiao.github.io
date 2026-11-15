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
