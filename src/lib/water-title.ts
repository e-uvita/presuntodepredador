// Distort the title texture using the noise + waves supplied for the project.
// Native WebGL keeps the landing independent of the panorama's Three.js bundle.
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
  uniform vec2 uMouse;
  uniform sampler2D tex0;
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
    vec2 uv = vTexCoord;
    float noi = noise(uv * 3.0 + uTime * 0.25) * 10.0;
    float amp = 0.025 + (uMouse.x - 0.5) * 0.006;
    uv.x += sin(uv.y * 10.0 + noi + uTime * 2.0) * amp;
    uv.y += cos(uv.y * 10.0 + noi + uTime * 2.0) * amp;
    // A transparent margin prevents the waves from clipping the outer letters.
    uv = (uv - 0.5) * 1.13 + 0.5;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      gl_FragColor = vec4(0.0);
    } else {
      gl_FragColor = texture2D(tex0, uv);
    }
  }
`;

export function initWaterTitle(root: HTMLElement) {
  const canvas = root.querySelector("canvas")!;
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    preserveDrawingBuffer: true,
  });
  if (!gl) return { draw: (_time: number) => {}, dispose: () => {} };

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
  let mouse = [0.5, 0.5];
  let texture: WebGLTexture | null = null;
  let buffer: WebGLBuffer | null = null;

  if (vertex && fragment) {
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
  }
  const linked =
    vertex && fragment && gl.getProgramParameter(program, gl.LINK_STATUS);
  const timeLocation = gl.getUniformLocation(program, "uTime");
  const mouseLocation = gl.getUniformLocation(program, "uMouse");

  function draw(time: number) {
    if (!ready || disposed) return;
    lastTime = time;
    gl!.uniform1f(timeLocation, time);
    gl!.uniform2f(mouseLocation, mouse[0]!, mouse[1]!);
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
    root.dataset.ready = "true";
  }

  function resize() {
    const ratio = Math.min(window.devicePixelRatio, 2);
    canvas.width = Math.round(root.clientWidth * ratio);
    canvas.height = Math.round(root.clientHeight * ratio);
    gl!.viewport(0, 0, canvas.width, canvas.height);
    draw(lastTime);
  }
  const observer = new ResizeObserver(resize);

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
    resize();
  }

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
    observer.observe(root);
    if (root.dataset.text) {
      const title = root.querySelector<HTMLElement>("[data-water-source]");
      void document.fonts.ready.then(() => {
        if (disposed || !title) return;
        const style = getComputedStyle(title);
        const width = Math.max(1, root.clientWidth);
        const height = Math.max(1, root.clientHeight);
        const scale = 2;
        const source = document.createElement("canvas");
        source.width = Math.round(width * scale);
        source.height = Math.round(height * scale);
        const context = source.getContext("2d");
        if (!context) return;
        context.scale(scale, scale);
        context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        context.fillStyle = style.color;
        context.textBaseline = "top";
        const words = root.dataset.text!.split(/\s+/);
        const lines: string[] = [];
        let line = "";
        for (const word of words) {
          const candidate = line ? `${line} ${word}` : word;
          if (line && context.measureText(candidate).width > width) {
            lines.push(line);
            line = word;
          } else line = candidate;
        }
        if (line) lines.push(line);
        const fontSize = Number.parseFloat(style.fontSize) || 48;
        const lineHeight = Number.parseFloat(style.lineHeight) || fontSize;
        const top = Math.max(0, (height - lines.length * lineHeight) / 2);
        lines.forEach((text, index) => {
          context.fillText(text, 0, top + index * lineHeight, width);
        });
        uploadSource(source);
      });
    } else {
      const image = new Image();
      image.onload = () => uploadSource(image);
      image.src = root.dataset.logo!;
    }
  }

  const pointerMove = (event: PointerEvent) => {
    const rect = root.getBoundingClientRect();
    mouse = [
      Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    ];
  };
  const contextLost = (event: Event) => {
    event.preventDefault();
    ready = false;
    delete root.dataset.ready;
  };
  root.addEventListener("pointermove", pointerMove);
  canvas.addEventListener("webglcontextlost", contextLost);

  return {
    draw,
    dispose() {
      disposed = true;
      observer.disconnect();
      root.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("webglcontextlost", contextLost);
      shaders.forEach((shader) => gl.deleteShader(shader));
      gl.deleteProgram(program);
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
    },
  };
}
