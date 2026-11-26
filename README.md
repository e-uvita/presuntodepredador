# Presunto depredador

Borrador local de la serie audiovisual de Elizabeth Lezama Jacinto. Astro genera un sitio estático para GitHub Pages. Esta entrega conserva todos los cambios sin commits ni publicación.

## Empezar

```sh
npm install
npm run dev
```

Abrir <http://localhost:4321/presuntodepredador/>. La página de tipografía está en `/presuntodepredador/tipografia/`.

## Dónde editar

| Cambio                                                    | Archivo                                                         |
| --------------------------------------------------------- | --------------------------------------------------------------- |
| Colores, fuentes del sitio, radios y ancho                | [theme.css](src/styles/theme.css)                               |
| Declarar fuentes locales                                  | [fonts.css](src/styles/fonts.css) y archivos en `public/fonts/` |
| Nombre, tagline, imagen principal, marca y kit de fuentes | [site.ts](src/config/site.ts)                                   |
| Videos, narración, subtítulos, títulos y miniaturas       | [chapters.ts](src/data/chapters.ts)                             |
| Sinopsis y créditos                                       | [story.ts](src/data/story.ts)                                   |
| Familias, capas y descargas de la página de tipografía    | [typefaces.ts](src/data/typefaces.ts)                           |

La guía [docs/HANDOFF.md](docs/HANDOFF.md) incluye ejemplos y el mapa de componentes. Los agentes deben leer [AGENTS.md](AGENTS.md); Claude y Cursor tienen entradas que apuntan al mismo documento.

## Estado de los activos

Los tres episodios comparten un video de muestra de 120 segundos **sin audio**. El MP4 se convirtió de EAC a equirectangular 2:1 y ocupa unos 6.9 MB. La narración y los subtítulos finales siguen pendientes. Los videos e imágenes están en `public/media/video/` y `public/media/images/`; las carpetas de audio/subtítulos se agregan cuando existan sus archivos.

`public/branding/mark.svg` es una aproximación provisional. Reemplazar con el activo original de la autora. El símbolo también se utiliza como favicon; el título `public/branding/title.svg` es otro activo, independiente de las fuentes CSS. Las referencias locales están en [docs/design/](docs/design/); no hace falta conectar Figma.

La tipografía utiliza actualmente el kit Adobe existente. Se pueden declarar fuentes locales en `fonts.css` y desactivar ese kit desde `site.ts`. El catálogo de muestras admite capas y enlaces de descarga solo cuando existan sus fuentes; los ejemplos están comentados en `typefaces.ts`.

## Verificar y compilar

```sh
bun test
python3 tests/package-source.test.py
bun run check
bun run build
bun run preview --host 127.0.0.1 --port 4322
```

Con Playwright y sus navegadores disponibles, en otra terminal:

```sh
uv run --with playwright python scripts/check-site.py http://127.0.0.1:4322/presuntodepredador/
```

El chequeo recorre escritorio, tablet y móvil, reproductor, animación, tipografía y errores. Las capturas se guardan en el directorio temporal `presunto-qa`.

`bun run build` genera `dist/`. El prefijo `/presuntodepredador` se configura en `astro.config.mjs`; usar `/` si se cambia a un dominio propio. Los helpers de `src/lib/paths.ts` aplican ese prefijo a rutas y activos. Cada página tiene un `index.html` y `.nojekyll` evita el procesamiento de Jekyll. El código fuente y sus referencias de diseño no se copian al sitio publicado.

## Compartir como ZIP

```sh
python3 scripts/package-source.py --output /tmp/presunto-depredador-source.zip
```

Incluye código, medios optimizados, documentación, referencias y la carpeta `.git` existente, con historial, ramas, remoto e índice. Los cambios de esta entrega siguen sin commits. Al extraerlo ya es un repositorio: no hace falta ejecutar `git init`. El destinatario puede revisar los cambios y crear varios commits con sus agentes, conservando el historial previo; las ramas todavía requieren revisión e integración.

Excluye dependencias, compilaciones, cachés y archivos de entorno sin seguimiento. Solo si se quiere una copia sin historial, añadir `--without-git` explícitamente. La carpeta `.git` original no se modifica al empaquetar.

El script `scripts/prepare-media.py` reproduce los activos del demo con `--video` y `--reference` explícitos. Solo hace falta si se vuelve a preparar esa muestra EAC; no se necesita para instalar, desarrollar o compilar.
