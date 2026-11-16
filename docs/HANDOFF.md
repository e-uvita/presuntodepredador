# Handoff local para mantenimiento

## Qué se entrega

El ZIP incluye `.git`, con el historial previo, las ramas `main` y `astro`, el remoto y el índice. Los cambios del borrador siguen sin commits; extraer el ZIP conserva ese trabajo pendiente. No ejecutes `git init`: ya es un repositorio. Inspecciona el estado antes de editar. Cuando el dueño pida organizar el historial, crea commits lógicos y construibles para tema y activos, capítulos y reproductor, tipografía y documentación. Evita resets destructivos, sobrescrituras de cambios existentes y pushes forzados.

El ZIP conserva las ramas existentes, pero no repara su organización ni crea una integración nueva. En la revisión del handoff, el código de `main` y `astro` era idéntico, pero no se creó un commit de merge. Conserva el sitio Astro y la documentación existente. Si se aplica la entrega a otro clon, conserva ese clon y compara los cambios con integración no destructiva.

## Inicio

Consulta los scripts vigentes en `package.json` y sigue la validación de `AGENTS.md`. Desde la raíz:

```sh
bun install
bun run dev
```

Abre la URL local que Astro imprima en la terminal (por defecto `http://localhost:4321/presuntodepredador/`). Para un clon con Git, revisa `git status --short --branch`, `git log --oneline --decorate -5` y `git remote -v` antes de integrar nada.

## Mapa para tareas frecuentes

| Tarea                                 | Editar                                                                                                | Consideraciones                                                                                            |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Color, tipografía, radios, ancho      | `src/styles/theme.css`                                                                                | Conserva variables como interfaz visual compartida.                                                        |
| Archivos y declaraciones de fuentes   | `src/styles/fonts.css`, `public/fonts/`                                                               | Confirma licencia y nombres; el SVG de título delineado no depende de la fuente CSS.                       |
| Datos del sitio, tagline, imagen hero | `src/config/site.ts`                                                                                  | URLs de marca, `branding.titleWidth`/`titleHeight` y `fontStylesheetUrl` también se centralizan aquí.      |
| Episodios                             | `src/data/chapters.ts`                                                                                | Incluye vídeo, audio, subtítulos, proyección, `hasAudio` e `isPreview`; rutas mediante `src/lib/paths.ts`. |
| Sinopsis y créditos                   | `src/data/story.ts`                                                                                   | Mantén el contenido separado del renderizado.                                                              |
| Familias y muestras tipográficas      | `src/data/typefaces.ts`                                                                               | Usa `cssFamily`, `name`, capas opcionales y `downloadSrc`; coordina `src/styles/typography.css`.           |
| Símbolo y favicon                     | `src/components/Brand.astro`, `src/config/site.ts`, `public/branding/mark.svg`                        | `mark` y `favicon` reutilizan el mismo SVG provisional. Sustitúyelo con originales aprobados.              |
| Título delineado                      | `public/branding/title.svg`, `src/components/WaterTitle.astro`, `src/lib/water-title.ts`              | SVG independiente de fuentes CSS; `titleWidth`/`titleHeight` describen su tamaño.                          |
| Página de tipografía                  | `src/pages/tipografia.astro`, `src/components/typography/TypeSpecimen.astro`, `src/lib/typography.ts` | Mantén página y lógica de muestras alineadas.                                                              |
| Navegación compartida                 | `src/components/SiteNav.astro`                                                                        | Cambios globales de navegación viven aquí.                                                                 |
| Reproductor                           | `src/components/PanoramaPlayer.astro`, `src/lib/player.ts`                                            | Comprueba proyección y controles al cambiar comportamiento.                                                |

## Capítulos y medios

Los medios locales viven en `public/media/`: `video/episode-demo.mp4` e imágenes `images/ocean.webp`, `images/episode-1.webp`, `images/episode-2.webp`, `images/episode-3.webp`. Audio y subtítulos finales aún no están presentes. La muestra es un vídeo silencioso de 120 s, convertido de EAC a equirectangular 2:1, de unos 6.9 MB.

Para convertir un capítulo de muestra en final, reemplaza en `src/data/chapters.ts` los valores heredados de `preview`. Conserva el contenido editorial real y configura el objeto así:

```ts
{
  slug: "ventral-body-upward-movement",
  number: "1",
  title: "Ventral Body Upward Movement",
  summary: "…",
  videoSrc: asset("media/video/episodio-1.mp4"),
  posterSrc: asset("media/images/episode-1.webp"),
  durationLabel: "12:34 min",
  projection: "equirectangular",
  hasAudio: true,
  isPreview: false,
  audioSrc: asset("media/audio/episodio-1.mp3"),
  subtitlesSrc: asset("media/subtitles/episodio-1.srt"),
}
```

Usa `projection: "flat"` para vídeo convencional. Omite `audioSrc` o `subtitlesSrc` si esos archivos no existen. No confundas vídeo plano, equirectangular y EAC: una fuente plana debe seguir plana; equirectangular requiere proyección 360; EAC necesita conversión/manejo específico. `scripts/prepare-media.py` recrea la muestra EAC silenciosa y requiere `--video` y `--reference`; no es un codificador genérico de entregas finales. Mantén los medios en el paquete local de Pages y genera rutas con `src/lib/paths.ts` para respetar `/presuntodepredador`.

## Tipografías

Para autoalojar una fuente: (1) añade el archivo con licencia a `public/fonts/`; (2) declara `@font-face` en `src/styles/fonts.css`; (3) asigna la familia en `src/styles/theme.css`. En `src/config/site.ts`, pon `fontStylesheetUrl: null` para usar fuentes locales en lugar de la hoja externa. En `src/data/typefaces.ts`, configura `name`, `cssFamily`, las capas opcionales de muestra y `downloadSrc` si se ofrece descarga. Registra licencia y atribución aplicables; no empaquetes fuentes sin permiso.

## Diseño y marca

Las referencias locales son `docs/design/landing.png`, `player.png`, `brand-reference.png` y `design-text.txt`. La captura completa de navegador de marca muestra un arco orgánico fragmentado y relleno sobre un círculo pálido; `mark.svg` es una aproximación, no el original oficial. No traces la captura ni asumas disponibilidad de Figma o conectores externos. Exportaciones locales PNG, PDF o SVG bastan. Si falta el original cuando se necesita, avanza con trabajo independiente y solicítalo al dueño.

El título delineado `public/branding/title.svg` es distinto del símbolo y de las fuentes CSS; reemplaza cada activo con su original correspondiente cuando esté disponible.

## ZIP y entrega

`scripts/package-source.py` incluye `.git` de forma predeterminada si existe; conserva sus metadatos y los archivos con seguimiento presentes en el árbol. Omite dependencias, compilaciones, cachés y archivos de entorno sin seguimiento. Usa `--output /ruta/fuera-del-proyecto.zip`; `--without-git` permite pedir expresamente una copia sin historial. El empaquetador no modifica el repositorio original. Revisa el contenido antes de compartirlo. Mantén la entrega local hasta recibir solicitud explícita de commits, cambios de remoto, publicación o despliegue.
