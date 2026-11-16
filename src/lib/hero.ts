import { initWaterTitle } from "./water-title";

export function initHero(root: HTMLElement) {
  const button = root.querySelector<HTMLButtonElement>("[data-motion]")!;
  const title = root.querySelector<HTMLElement>("[data-water-title]")!;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const connection = (
    navigator as Navigator & { connection?: { saveData: boolean } }
  ).connection;
  let paused = reduceMotion.matches || Boolean(connection?.saveData);
  let visible = true;
  let frame = 0;
  let previous = 0;
  let time = 0;
  let water: ReturnType<typeof initWaterTitle> | undefined;

  root.querySelector<HTMLElement>("[data-hero-tools]")!.hidden = false;

  function animate(now: number) {
    if (now - previous >= 1000 / 30) {
      time += Math.min((now - previous) / 1000, 0.1);
      previous = now;
      water?.draw(time);
    }
    frame = requestAnimationFrame(animate);
  }

  function update() {
    cancelAnimationFrame(frame);
    frame = 0;
    button.setAttribute(
      "aria-label",
      paused ? "Reanudar animación" : "Pausar animación",
    );
    button.setAttribute("aria-pressed", String(paused));
    button.querySelector<HTMLElement>("[data-pause-icon]")!.hidden = paused;
    button.querySelector<HTMLElement>("[data-play-icon]")!.hidden = !paused;
    if (paused || !visible || document.hidden) {
      return;
    }
    water ??= initWaterTitle(title);
    previous = performance.now();
    frame = requestAnimationFrame(animate);
  }

  const observer = new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting);
    update();
  });
  observer.observe(root);
  button.addEventListener("click", () => {
    paused = !paused;
    update();
  });
  const preferenceChanged = () => {
    paused = reduceMotion.matches;
    update();
  };
  reduceMotion.addEventListener("change", preferenceChanged);
  document.addEventListener("visibilitychange", update);
  window.addEventListener("pagehide", (event) => {
    if (event.persisted) return;
    cancelAnimationFrame(frame);
    observer.disconnect();
    water?.dispose();
    reduceMotion.removeEventListener("change", preferenceChanged);
    document.removeEventListener("visibilitychange", update);
  });
  update();
}
