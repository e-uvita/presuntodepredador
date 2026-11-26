// Distort the title texture using the noise + waves supplied for the project.
// Native WebGL keeps the landing independent of the panorama's Three.js bundle.
//
// Alignment: the canvas bleeds outside its element by exactly the maximum
// displacement the waves can produce (the "safe area"), so undistorted glyphs
// land on the same pixels as the static fallback and stay aligned with the
// surrounding copy, whatever the parameters are.
//
// Every parameter can be set from HTML with `data-water-<param>` (kebab-case),
// and `data-water-multiline-<param>` applies only when the text wraps to two or
// more lines. The resolved line count is exposed as `data-water-lines`.
// Add `?gui` to the URL to tune the effect live with dat.gui.

export interface WaterParams {
  /** Wave displacement, as a fraction of the element width. */
  amplitude: number;
  /** Wave crests per line. */
  frequency: number;
  /** Wave speed multiplier. */
  speed: number;
  /** Noise texture scale. */
  noiseScale: number;
  /** How much the noise bends the waves. */
  noiseStrength: number;
  /** Noise drift speed. */
  noiseSpeed: number;
  /** Radius of the pointer influence, in element heights. */
  hoverRadius: number;
  /** Extra amplitude under the pointer (1 doubles it). */
  hoverStrength: number;
  /** Ripple rings around the pointer. */
  hoverRipple: number;
  /** Sensitive margin around the zone, in CSS pixels. */
  hoverZone: number;
  /** How fast the pointer influence fades in and out. */
  hoverEase: number;
}

export const waterDefaults: WaterParams = {
  amplitude: 0.025,
  frequency: 10,
  speed: 1,
  noiseScale: 3,
  noiseStrength: 10,
  noiseSpeed: 0.25,
  hoverRadius: 0.6,
  hoverStrength: 1.6,
  hoverRipple: 1,
  hoverZone: 48,
  hoverEase: 5,
};

// Two-line titles are twice as tall: per-line wave coordinates keep the crest
// density, and these softer values keep the lines legible and apart.
export const waterMultilineDefaults: Partial<WaterParams> = {
  amplitude: 0.016,
  noiseScale: 2.2,
  noiseStrength: 7,
  hoverRadius: 0.45,
};

const paramKeys = Object.keys(waterDefaults) as (keyof WaterParams)[];
const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function readAttributes(root: HTMLElement, prefix: string) {
  const values: Partial<WaterParams> = {};
  for (const key of paramKeys) {
    const raw = root.getAttribute(`data-water-${prefix}${kebab(key)}`);
    const value = raw === null ? Number.NaN : Number.parseFloat(raw);
    if (Number.isFinite(value)) values[key] = value;
  }
  return values;
}

export function resolveWaterParams(root: HTMLElement, lines: number): WaterParams {
  return {
    ...waterDefaults,
    ...readAttributes(root, ""),
    ...(lines > 1 ? waterMultilineDefaults : {}),
    ...(lines > 1 ? readAttributes(root, "multiline-") : {}),
  };
}

/** Safe area per side, in element-relative units, for the given params. */
export function waterBleed(params: WaterParams, lines: number, aspect: number) {
  const boost = 1 + Math.max(0, params.hoverStrength);
  const ripple = 0.5 * Math.max(0, params.hoverRipple) * params.amplitude;
  return {
    x: params.amplitude * boost + ripple / Math.max(aspect, 0.01),
    y: (params.amplitude * boost) / Math.max(lines, 1) + ripple,
  };
}

const vertexSource = `
  attribute vec2 position;
  varying vec2 vTexCoord;
  void main() {
    vTexCoord = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragmentSource = `
  precision highp float;
  uniform float uTime;
  uniform sampler2D tex0;
  uniform vec2 uBleed;
  uniform float uAspect;
  uniform float uLines;
  uniform float uAmplitude;
  uniform float uFrequency;
  uniform float uSpeed;
  uniform float uNoiseScale;
  uniform float uNoiseStrength;
  uniform float uNoiseSpeed;
  uniform vec2 uPointer;
  uniform float uHover;
  uniform float uHoverRadius;
  uniform float uHoverStrength;
  uniform float uHoverRipple;
  varying vec2 vTexCoord;

  float rand(vec2 n) {
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 ip = floor(p);
    vec2 u = fract(p);
    u = u*u*(3.0-2.0*u);
    float res = mix(
      mix(rand(ip), rand(ip+vec2(1.0,0.0)), u.x),
      mix(rand(ip+vec2(0.0,1.0)), rand(ip+vec2(1.0,1.0)), u.x), u.y);
    return res*res;
  }
  void main() {
    // Canvas coordinates -> element coordinates (0..1 inside the element).
    vec2 uv = vTexCoord * (1.0 + 2.0 * uBleed) - uBleed;
    // Per-line coordinates keep the same wave density on two-line titles.
    vec2 lineUv = vec2(uv.x, uv.y * uLines);
    float noi = noise(lineUv * uNoiseScale + uTime * uNoiseSpeed) * uNoiseStrength;

    vec2 toPointer = (uv - uPointer) * vec2(uAspect, 1.0);
    float dist = length(toPointer);
    float influence = uHover * (1.0 - smoothstep(0.0, uHoverRadius, dist));

    float amp = uAmplitude * (1.0 + influence * uHoverStrength);
    float phase = lineUv.y * uFrequency + noi + uTime * uSpeed * 2.0;
    uv.x += sin(phase) * amp;
    uv.y += cos(phase) * amp / uLines;

    vec2 dir = dist > 0.0001 ? toPointer / dist : vec2(0.0);
    float ring = sin(dist * 40.0 - uTime * 8.0) * influence * uHoverRipple;
    uv -= dir / vec2(uAspect, 1.0) * ring * uAmplitude * 0.5;

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      gl_FragColor = vec4(0.0);
    } else {
      gl_FragColor = texture2D(tex0, uv);
    }
  }
`;

export interface WaterTitle {
  root: HTMLElement;
  /** Live, mutable parameters. Call `refresh()` after changing them. */
  params: WaterParams;
  lines: number;
  refresh: () => void;
  reset: () => void;
  draw: (time: number) => void;
  dispose: () => void;
}

export function initWaterTitle(root: HTMLElement): WaterTitle {
  const canvas = root.querySelector("canvas")!;
  let lines = 1;
  const instance: WaterTitle = {
    root,
    params: resolveWaterParams(root, lines),
    lines,
    refresh: () => {},
    reset: () => {},
    draw: () => {},
    dispose: () => {},
  };
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    preserveDrawingBuffer: true,
  });
  if (!gl) return instance;

  const shaders: WebGLShader[] = [];
  function compile(type: number, source: string) {
    const shader = gl!.createShader(type)!;
    gl!.shaderSource(shader, source);
    gl!.compileShader(shader);
    shaders.push(shader);
    return gl!.getShaderParameter(shader, gl!.COMPILE_STATUS) ? shader : null;
  }
  const vertex = compile(gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram()!;
  let ready = false;
  let disposed = false;
  let lastTime = 0;
  let width = 0;
  let height = 0;
  let bleed = { x: 0, y: 0 };
  let pointer = [0.5, 0.5];
  let hover = 0;
  let hoverTarget = 0;
  let texture: WebGLTexture | null = null;
  let buffer: WebGLBuffer | null = null;

  if (vertex && fragment) {
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
  }
  const linked =
    vertex && fragment && gl.getProgramParameter(program, gl.LINK_STATUS);
  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const locations = {
    time: uniform("uTime"),
    bleed: uniform("uBleed"),
    aspect: uniform("uAspect"),
    lines: uniform("uLines"),
    pointer: uniform("uPointer"),
    hover: uniform("uHover"),
    amplitude: uniform("uAmplitude"),
    frequency: uniform("uFrequency"),
    speed: uniform("uSpeed"),
    noiseScale: uniform("uNoiseScale"),
    noiseStrength: uniform("uNoiseStrength"),
    noiseSpeed: uniform("uNoiseSpeed"),
    hoverRadius: uniform("uHoverRadius"),
    hoverStrength: uniform("uHoverStrength"),
    hoverRipple: uniform("uHoverRipple"),
  };

  function draw(time: number) {
    if (!ready || disposed) return;
    const delta = Math.min(Math.max(time - lastTime, 0), 0.1);
    lastTime = time;
    const params = instance.params;
    hover += (hoverTarget - hover) * Math.min(1, delta * params.hoverEase);
    gl!.uniform1f(locations.time, time);
    gl!.uniform2f(locations.bleed, bleed.x, bleed.y);
    gl!.uniform1f(locations.aspect, width / Math.max(height, 1));
    gl!.uniform1f(locations.lines, lines);
    gl!.uniform2f(locations.pointer, pointer[0]!, pointer[1]!);
    gl!.uniform1f(locations.hover, hover);
    gl!.uniform1f(locations.amplitude, params.amplitude);
    gl!.uniform1f(locations.frequency, params.frequency);
    gl!.uniform1f(locations.speed, params.speed);
    gl!.uniform1f(locations.noiseScale, params.noiseScale);
    gl!.uniform1f(locations.noiseStrength, params.noiseStrength);
    gl!.uniform1f(locations.noiseSpeed, params.noiseSpeed);
    gl!.uniform1f(locations.hoverRadius, Math.max(params.hoverRadius, 0.001));
    gl!.uniform1f(locations.hoverStrength, params.hoverStrength);
    gl!.uniform1f(locations.hoverRipple, params.hoverRipple);
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
    root.dataset.ready = "true";
  }

  // Size the canvas to the element plus its safe area on every side.
  function layout() {
    width = Math.max(1, root.clientWidth);
    height = Math.max(1, root.clientHeight);
    const safe = waterBleed(instance.params, lines, width / height);
    const bleedX = Math.ceil(safe.x * width) + 1;
    const bleedY = Math.ceil(safe.y * height) + 1;
    bleed = { x: bleedX / width, y: bleedY / height };
    Object.assign(canvas.style, {
      inset: "auto",
      left: `${-bleedX}px`,
      top: `${-bleedY}px`,
      width: `${width + bleedX * 2}px`,
      height: `${height + bleedY * 2}px`,
    });
    const ratio = Math.min(window.devicePixelRatio, 2);
    canvas.width = Math.round((width + bleedX * 2) * ratio);
    canvas.height = Math.round((height + bleedY * 2) * ratio);
    gl!.viewport(0, 0, canvas.width, canvas.height);
    draw(lastTime);
  }

  function setLines(count: number) {
    if (count === lines) return;
    lines = count;
    instance.lines = count;
    root.dataset.waterLines = String(count);
    // Mutate in place so live references (dat.gui) keep working.
    Object.assign(instance.params, resolveWaterParams(root, count));
  }

  function uploadSource(source: TexImageSource) {
    if (disposed) return;
    gl!.bindTexture(gl!.TEXTURE_2D, texture);
    gl!.texImage2D(
      gl!.TEXTURE_2D,
      0,
      gl!.RGBA,
      gl!.RGBA,
      gl!.UNSIGNED_BYTE,
      source,
    );
    ready = true;
    layout();
  }

  const title = root.querySelector<HTMLElement>("[data-water-source]");
  let textSize = "";
  function renderText() {
    if (disposed || !title || !root.dataset.text) return;
    const style = getComputedStyle(title);
    const textWidth = Math.max(1, root.clientWidth);
    const textHeight = Math.max(1, root.clientHeight);
    textSize = `${textWidth}x${textHeight}`;
    const scale = 2;
    const source = document.createElement("canvas");
    source.width = Math.round(textWidth * scale);
    source.height = Math.round(textHeight * scale);
    const context = source.getContext("2d");
    if (!context) return;
    context.scale(scale, scale);
    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    context.fillStyle = style.color;
    context.textBaseline = "top";
    const words = root.dataset.text.split(/\s+/);
    const rows: string[] = [];
    let row = "";
    for (const word of words) {
      const candidate = row ? `${row} ${word}` : word;
      if (row && context.measureText(candidate).width > textWidth) {
        rows.push(row);
        row = word;
      } else row = candidate;
    }
    if (row) rows.push(row);
    const fontSize = Number.parseFloat(style.fontSize) || 48;
    const lineHeight = Number.parseFloat(style.lineHeight) || fontSize;
    const top = Math.max(0, (textHeight - rows.length * lineHeight) / 2);
    rows.forEach((text, index) => {
      context.fillText(text, 0, top + index * lineHeight, textWidth);
    });
    setLines(Math.max(1, rows.length));
    uploadSource(source);
  }

  const observer = new ResizeObserver(() => {
    if (!ready) return;
    const size = `${root.clientWidth}x${root.clientHeight}`;
    // Text titles re-wrap on resize, which can change the line count.
    if (root.dataset.text && size !== textSize) renderText();
    else layout();
  });

  if (linked) {
    gl.useProgram(program);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.uniform1i(gl.getUniformLocation(program, "tex0"), 0);
    root.dataset.waterLines = "1";
    observer.observe(root);
    if (root.dataset.text) {
      void document.fonts.ready.then(renderText);
    } else {
      const image = new Image();
      image.onload = () => uploadSource(image);
      image.src = root.dataset.logo!;
    }
  }

  // Sensitive zone: the element itself, or `data-water-zone` (a selector
  // matched against ancestors first, then the document), plus `hoverZone`.
  const zoneSelector = root.dataset.waterZone;
  const zone =
    (zoneSelector &&
      (root.closest<HTMLElement>(zoneSelector) ??
        document.querySelector<HTMLElement>(zoneSelector))) ||
    root;
  const pointerMove = (event: PointerEvent) => {
    const area = zone.getBoundingClientRect();
    const margin = instance.params.hoverZone;
    const inside =
      event.clientX >= area.left - margin &&
      event.clientX <= area.right + margin &&
      event.clientY >= area.top - margin &&
      event.clientY <= area.bottom + margin;
    hoverTarget = inside ? 1 : 0;
    if (!inside) return;
    const rect = root.getBoundingClientRect();
    // Texture rows are flipped (UNPACK_FLIP_Y), so y grows upwards.
    pointer = [
      (event.clientX - rect.left) / Math.max(rect.width, 1),
      1 - (event.clientY - rect.top) / Math.max(rect.height, 1),
    ];
  };
  const pointerEnd = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") hoverTarget = 0;
  };
  const pointerOut = (event: PointerEvent) => {
    if (!event.relatedTarget) hoverTarget = 0;
  };
  const contextLost = (event: Event) => {
    event.preventDefault();
    ready = false;
    delete root.dataset.ready;
  };
  window.addEventListener("pointermove", pointerMove, { passive: true });
  window.addEventListener("pointerdown", pointerMove, { passive: true });
  window.addEventListener("pointerup", pointerEnd, { passive: true });
  window.addEventListener("pointercancel", pointerEnd, { passive: true });
  document.addEventListener("pointerout", pointerOut, { passive: true });
  canvas.addEventListener("webglcontextlost", contextLost);

  instance.draw = draw;
  instance.refresh = () => {
    if (ready) layout();
  };
  instance.reset = () => {
    Object.assign(instance.params, resolveWaterParams(root, lines));
    instance.refresh();
  };
  instance.dispose = () => {
    disposed = true;
    observer.disconnect();
    window.removeEventListener("pointermove", pointerMove);
    window.removeEventListener("pointerdown", pointerMove);
    window.removeEventListener("pointerup", pointerEnd);
    window.removeEventListener("pointercancel", pointerEnd);
    document.removeEventListener("pointerout", pointerOut);
    canvas.removeEventListener("webglcontextlost", contextLost);
    shaders.forEach((shader) => gl.deleteShader(shader));
    gl.deleteProgram(program);
    gl.deleteTexture(texture);
    gl.deleteBuffer(buffer);
  };

  if (new URLSearchParams(window.location.search).has("gui")) {
    void import("./water-gui").then(({ addWaterTitleToGui }) => {
      if (!disposed) addWaterTitleToGui(instance);
    });
  }
  return instance;
}
