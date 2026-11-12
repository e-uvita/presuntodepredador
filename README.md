# Presunto depredador

Prototipo académico de una serie documental de tres capítulos. La portada presenta el título SVG con una distorsión GLSL y cada capítulo abre un video equirectangular dentro de un reproductor 360 hecho con Three.js.

## Tecnologías

- Astro para páginas, rutas y componentes.
- Three.js para el shader tipográfico y el panorama 360.
- GLSL para deformar el título SVG.
- HTML y CSS para los controles y subtítulos.
- TypeScript para los datos, el reproductor y el parser SRT.

## Ejecutar el proyecto

```bash
npm install
npm run dev
```

Para generar la versión estática:

```bash
npm run build
```

## Estructura

```text
src/
├── components/       Componentes visuales y reproductor
├── data/             Configuración editable de capítulos y shader
├── layouts/          Documento HTML base
├── lib/              Parser de subtítulos SRT
├── pages/            Portada y páginas de capítulo
└── styles/           CSS global mínimo

public/subtitles/     Archivos SRT servidos sin transformación
img/logo.svg          Título original utilizado por el shader
```

## Editar los capítulos

Los tres capítulos se configuran en `src/data/chapters.ts`. Cada entrada acepta:

- `videoSrc`: video panorámico equirectangular, de preferencia en proporción 2:1.
- `audioSrc`: audio separado, cuando se utiliza `audioMode: 'separate'`.
- `subtitlesSrc`: ruta a un archivo `.srt`.
- `audioMode`: `separate` para audio externo o `integrated` cuando el MP4 ya tiene audio.
- `loopVideo`: permite repetir el video visual provisional mientras avanza un audio más largo.

El demo reutiliza temporalmente el mismo video, audio y SRT en los tres capítulos. Cuando existan los medios definitivos, sólo deben cambiarse las rutas de cada objeto.

## Control de reproducción

El reproductor tiene deliberadamente pocos controles:

- Un botón alterna entre reproducir y pausar.
- Un `input[type="range"]` controla el tiempo.
- Un botón silencia o activa el audio.
- Arrastrar dentro del canvas cambia la dirección de la cámara.

Cuando el audio está separado, éste es el reloj principal para la línea de tiempo y los subtítulos. El video se reproduce al mismo tiempo. En el demo el panorama se repite porque los medios provisionales tienen duraciones distintas. Para medios finales sincronizados se recomienda que video, audio y SRT comiencen en `00:00:00` y tengan la misma duración, o integrar el audio directamente en el MP4.

## Parámetros del shader

El objeto `titleShader` en `src/data/chapters.ts` expone:

- `amplitude`: intensidad de la distorsión.
- `frequency`: cantidad de ondas.
- `speed`: velocidad de animación.
- `noiseScale`: escala del ruido procedural.
- `mouseInfluence`: respuesta al movimiento del cursor.

## Referencias

- [Three.js: equirectangular video panorama](https://github.com/mrdoob/three.js/blob/master/examples/webgl_video_panorama_equirectangular.html)
- [srt-reactive-visualization](https://github.com/juanfuent-es/srt-reactive-visualization)
- [audio-subtitles-generator](https://github.com/juanfuent-es/audio-subtitles-generator), utilizado como referencia para generar archivos SRT y como fuente del audio provisional.
