// Live tuning panel for the water titles. Loaded only when the URL has `?gui`,
// so dat.gui never ships in the regular bundle path.
import type { GUI } from "dat.gui";
import {
  resolveWaterParams,
  waterDefaults,
  type WaterParams,
  type WaterTitle,
} from "./water-title";

const ranges: Record<keyof WaterParams, [number, number, number]> = {
  amplitude: [0, 0.08, 0.001],
  frequency: [0, 30, 0.1],
  speed: [0, 4, 0.01],
  noiseScale: [0, 10, 0.1],
  noiseStrength: [0, 30, 0.1],
  noiseSpeed: [0, 2, 0.01],
  hoverRadius: [0.05, 2, 0.01],
  hoverStrength: [0, 6, 0.05],
  hoverRipple: [0, 4, 0.05],
  hoverZone: [0, 300, 1],
  hoverEase: [0.5, 20, 0.1],
};

const labels: Record<keyof WaterParams, string> = {
  amplitude: "Amplitud",
  frequency: "Frecuencia",
  speed: "Velocidad",
  noiseScale: "Ruido · escala",
  noiseStrength: "Ruido · fuerza",
  noiseSpeed: "Ruido · velocidad",
  hoverRadius: "Cursor · radio",
  hoverStrength: "Cursor · fuerza",
  hoverRipple: "Cursor · ondas",
  hoverZone: "Cursor · zona (px)",
  hoverEase: "Cursor · suavizado",
};

let guiPromise: Promise<GUI> | undefined;
let count = 0;

function getGui() {
  guiPromise ??= import("dat.gui").then(({ GUI }) => {
    const gui = new GUI({ width: 320 });
    const container = gui.domElement.parentElement;
    if (container) container.style.zIndex = "1000";
    return gui;
  });
  return guiPromise;
}

const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** Attributes that reproduce the current tuning, relative to the defaults. */
function attributesFor(title: WaterTitle) {
  const base = resolveWaterParams(document.createElement("div"), title.lines);
  const prefix = title.lines > 1 ? "multiline-" : "";
  return (Object.keys(waterDefaults) as (keyof WaterParams)[])
    .filter((key) => Math.abs(title.params[key] - base[key]) > 1e-6)
    .map((key) => `data-water-${prefix}${kebab(key)}="${+title.params[key].toFixed(4)}"`)
    .join(" ");
}

export async function addWaterTitleToGui(title: WaterTitle) {
  const gui = await getGui();
  count += 1;
  const name =
    title.root.dataset.text ?? (title.root.closest(".hero") ? "Título del hero" : `Título ${count}`);
  const folder = gui.addFolder(name.length > 32 ? `${name.slice(0, 31)}…` : name);
  // Read-only: always reflects the current wrap (see `data-water-lines`).
  const info = {
    get líneas() {
      return title.lines;
    },
    set líneas(_value: number) {},
  };
  folder.add(info, "líneas").name("Líneas (auto)").listen();
  const keys = Object.keys(waterDefaults) as (keyof WaterParams)[];
  for (const key of keys) {
    const [min, max, step] = ranges[key];
    folder
      .add(title.params, key, min, max, step)
      .name(labels[key])
      .listen()
      .onChange(() => title.refresh());
  }
  const actions = {
    restablecer: () => title.reset(),
    copiarAtributos: async () => {
      const text = attributesFor(title) || "(valores por defecto)";
      console.info(`[water-title] ${name}:\n${text}`);
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // Clipboard may be blocked; the console keeps a copy.
      }
    },
  };
  folder.add(actions, "restablecer").name("Restablecer");
  folder.add(actions, "copiarAtributos").name("Copiar atributos");
  folder.open();
}
