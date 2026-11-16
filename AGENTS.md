# Guía del proyecto

Este archivo es la fuente única de instrucciones del repositorio. Léelo antes de cambiar código o documentación; para contexto de entrega y decisiones visuales, consulta [docs/HANDOFF.md](docs/HANDOFF.md).

## Estado y límites

- Este árbol es un borrador local sin commits propios. Inspecciona `git status`, ramas y remotos antes de actuar. No atribuyas el contenido a un commit o despliegue que no exista.
- El ZIP de entrega incluye `.git` con el historial previo y las ramas existentes; los cambios del borrador siguen sin confirmar. Tras extraerlo ya es un repositorio: conserva ese seguimiento y organiza los commits cuando se solicite.
- Mantén el trabajo local hasta que el dueño solicite explícitamente commits, remotos, publicación o despliegue. Cuando se pida preparar historial, crea commits lógicos revisables; coordina el alcance antes de tocar cambios ajenos.
- El código de `main` y `astro` era idéntico en la revisión del handoff, pero no se creó un commit de merge. Conserva el sitio Astro y la documentación previa.
- Usa las referencias visuales y activos originales disponibles. El símbolo en `public/branding/mark.svg` es provisional, no el logotipo oficial.

## Mapa de cambios

| Necesidad                                                             | Ubicación                                                                                                                          |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Metadatos, tagline, imagen principal, URLs de marca y hoja de fuentes | `src/config/site.ts`                                                                                                               |
| Colores, fuentes, radios y anchos                                     | `src/styles/theme.css`                                                                                                             |
| Declaraciones `@font-face`                                            | `src/styles/fonts.css`; archivos de fuente en `public/fonts/`                                                                      |
| Configuración de episodios y proyección                               | `src/data/chapters.ts`                                                                                                             |
| Sinopsis y créditos                                                   | `src/data/story.ts`                                                                                                                |
| Familias tipográficas, capas de muestra y descargas                   | `src/data/typefaces.ts`                                                                                                            |
| Símbolo compartido                                                    | `src/components/Brand.astro`                                                                                                       |
| Navegación compartida                                                 | `src/components/SiteNav.astro`                                                                                                     |
| Título con agua                                                       | `src/components/WaterTitle.astro`, `src/lib/water-title.ts`                                                                        |
| Muestras tipográficas                                                 | `src/components/typography/TypeSpecimen.astro`, `src/lib/typography.ts`, `src/styles/typography.css`, `src/pages/tipografia.astro` |
| Rutas compatibles con el prefijo del sitio                            | `src/lib/paths.ts`                                                                                                                 |
| Reproductor panorámico                                                | `src/components/PanoramaPlayer.astro`, `src/lib/player.ts`                                                                         |

Antes de añadir otra fuente de verdad, busca primero la configuración existente. Separa contenido (`src/data`), comportamiento (`src/lib` y componentes) y presentación (`src/styles`). No dupliques datos de episodios ni tokens visuales.

## Medios y diseño

- El prefijo de publicación es `/presuntodepredador`; genera rutas internas mediante el helper del proyecto.
- Los medios de episodios viven bajo `public/media/`. Distingue vídeo plano, equirectangular y EAC antes de configurar proyección; no muestres medios planos como esfera.
- El vídeo demo actual es una muestra silenciosa de 120 s. No implica que audio ni subtítulos finales estén presentes.
- Guarda las fuentes con licencia y sus archivos locales en `public/fonts/`; los tokens de fuentes afectan el sitio, mientras que el título delineado SVG se sustituye aparte.
- Usa los PNG de `docs/design/` como referencia local. Si falta el activo original necesario, avanza en tareas independientes y pide el original al dueño; no conviertas una aproximación en marca oficial.

## Validación

Tras cambios de código, ejecuta las comprobaciones pertinentes definidas por el repositorio. La validación completa documentada es `bun test && bun run check && bun run build`; el verificador Playwright opcional está en `scripts/check-site.py`. Informa exactamente qué comandos corriste y sus resultados; no afirmes pruebas ni despliegues no observados.
