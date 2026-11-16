import type { Typeface } from "../data/typefaces";

export function initTypography(root: HTMLElement) {
  const faces = JSON.parse(root.dataset.typefaces!) as Typeface[];
  const defaults = JSON.parse(root.dataset.defaults!) as {
    text: string;
    size: number;
  };
  const family = root.querySelector<HTMLSelectElement>("[data-family]")!;
  const size = root.querySelector<HTMLInputElement>("[data-size]")!;
  const sizeOutput =
    root.querySelector<HTMLOutputElement>("[data-size-output]")!;
  const text = root.querySelector<HTMLTextAreaElement>("[data-text]")!;
  const preview = root.querySelector<HTMLElement>("[data-preview]")!;
  const layerFieldset =
    root.querySelector<HTMLFieldSetElement>("[data-layers]")!;
  const layerOptions = root.querySelector<HTMLElement>("[data-layer-options]")!;
  const download = root.querySelector<HTMLAnchorElement>("[data-download]")!;
  const empty = root.querySelector<HTMLElement>("[data-empty]")!;

  function updateText() {
    preview
      .querySelectorAll<HTMLElement>("[data-preview-text]")
      .forEach((span) => {
        span.textContent = text.value;
      });
    preview.setAttribute("aria-label", text.value || "Vista previa vacía");
  }

  function updateSize() {
    preview.style.setProperty("--specimen-size", `${size.value}px`);
    sizeOutput.value = `${size.value} px`;
    size.setAttribute("aria-valuetext", sizeOutput.value);
  }

  function updateFamily() {
    const face = faces.find((item) => item.id === family.value);
    if (!face) return;
    preview.style.setProperty("--specimen-font", face.cssFamily);
    preview.replaceChildren();
    layerOptions.replaceChildren();
    layerFieldset.hidden = !face.layers?.length;
    download.hidden = !face.downloadSrc;
    if (face.downloadSrc) download.href = face.downloadSrc;
    else download.removeAttribute("href");
    empty.hidden = true;

    const layers = face.layers?.length
      ? face.layers
      : [{ name: face.name, cssFamily: face.cssFamily }];
    for (const layer of layers) {
      const span = document.createElement("span");
      span.dataset.previewText = "";
      span.style.fontFamily = layer.cssFamily;
      span.setAttribute("aria-hidden", "true");
      preview.append(span);
      if (layerFieldset.hidden) continue;
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = true;
      checkbox.addEventListener("change", () => {
        span.hidden = !checkbox.checked;
        empty.hidden = [...preview.children].some(
          (item) => !(item as HTMLElement).hidden,
        );
      });
      label.append(checkbox, document.createTextNode(layer.name));
      layerOptions.append(label);
    }
    updateText();
  }

  family.addEventListener("change", updateFamily);
  size.addEventListener("input", updateSize);
  text.addEventListener("input", updateText);
  root
    .querySelector<HTMLButtonElement>("[data-reset]")!
    .addEventListener("click", () => {
      family.value = faces[0]!.id;
      text.value = defaults.text;
      size.value = String(defaults.size);
      updateFamily();
      updateSize();
    });
  root.querySelector<HTMLElement>("[data-specimen-controls]")!.hidden = false;
  updateFamily();
  updateSize();
}
