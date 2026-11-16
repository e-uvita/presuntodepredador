import { cueAtTime, parseSrt, type SubtitleCue } from "./srt-parser";
const formatTime = (seconds: number) =>
  Number.isFinite(seconds)
    ? `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`
    : "00:00";
export function initPlayers() {
  document
    .querySelectorAll<HTMLElement>("[data-panorama-player]")
    .forEach((root) => {
      const video = root.querySelector("video")!;
      const audio = root.querySelector("audio")!;
      const canvas = root.querySelector("canvas")!;
      const controls = root.querySelector<HTMLElement>(".controls")!;
      const play = root.querySelector<HTMLButtonElement>("[data-play]")!;
      const mute = root.querySelector<HTMLButtonElement>("[data-mute]")!;
      const seek = root.querySelector<HTMLInputElement>("[data-seek]")!;
      const time = root.querySelector<HTMLOutputElement>("[data-time]")!;
      const subtitle = root.querySelector<HTMLElement>(".subtitle")!;
      const captions = root.querySelector<HTMLButtonElement>("[data-captions]");
      const next = root.querySelector<HTMLAnchorElement>("[data-next]");
      const notice = root.querySelector<HTMLElement>("[data-notice]")!;
      const status = root.querySelector<HTMLElement>("[data-status]")!;
      const retry = root.querySelector<HTMLButtonElement>("[data-retry]")!;
      const separate = Boolean(root.dataset.audio);
      const hasAudio = separate || root.dataset.hasAudio === "true";
      const master = separate ? audio : video;
      const lifecycle = new AbortController();
      let cues: SubtitleCue[] = [];
      let captionsOn = true;
      let renderOnce = () => {};
      let startRendering = () => {};
      let stopRendering = () => {};
      video.controls = false;
      controls.hidden = false;
      video.loop = root.dataset.loop === "true";
      if (separate) {
        audio.src = root.dataset.audio!;
        video.muted = true;
      }
      const error = (message: string) => {
        status.textContent = message;
        notice.hidden = false;
        retry.hidden = false;
        if (next) next.hidden = true;
      };
      const update = () => {
        const current = master.currentTime || 0;
        const total = master.duration;
        seek.max = String(Number.isFinite(total) ? total : 0);
        seek.value = String(current);
        seek.setAttribute(
          "aria-valuetext",
          `${formatTime(current)} de ${formatTime(total)}`,
        );
        seek.style.setProperty(
          "--progress",
          `${Number.isFinite(total) && total > 0 ? (current / total) * 100 : 0}%`,
        );
        time.value = `${formatTime(current)} / ${formatTime(total)}`;
        subtitle.textContent = captionsOn
          ? (cueAtTime(cues, current)?.text ?? "")
          : "";
        play.querySelector<HTMLElement>("[data-icon-play]")!.hidden =
          !master.paused;
        play.querySelector<HTMLElement>("[data-icon-pause]")!.hidden =
          master.paused;
        play.setAttribute(
          "aria-label",
          master.paused ? "Reproducir" : "Pausar",
        );
        mute.querySelector<HTMLElement>("[data-icon-sound]")!.hidden =
          !hasAudio || master.muted;
        mute.querySelector<HTMLElement>("[data-icon-muted]")!.hidden =
          hasAudio && !master.muted;
        mute.setAttribute(
          "aria-label",
          !hasAudio
            ? "Este video no tiene audio"
            : master.muted
              ? "Activar audio"
              : "Silenciar",
        );
      };
      const seekTo = (value: number) => {
        const target = Math.max(
          0,
          Math.min(
            Number.isFinite(master.duration) ? master.duration : 0,
            value,
          ),
        );
        master.currentTime = target;
        if (separate && Number.isFinite(video.duration) && video.duration > 0)
          video.currentTime = video.loop
            ? target % video.duration
            : Math.min(target, video.duration);
        update();
        renderOnce();
      };
      const toggle = async () => {
        if (!master.paused) {
          master.pause();
          video.pause();
          return;
        }
        try {
          if (master.ended) seekTo(0);
          if (separate) {
            if (Number.isFinite(video.duration) && video.duration > 0)
              video.currentTime = video.loop
                ? audio.currentTime % video.duration
                : Math.min(audio.currentTime, video.duration);
            await Promise.all([video.play(), audio.play()]);
          } else await video.play();
          notice.hidden = true;
        } catch {
          video.pause();
          audio.pause();
          error("No se pudo reproducir el video. Inténtalo de nuevo.");
        }
        update();
      };
      play.addEventListener("click", toggle);
      mute.addEventListener("click", () => {
        if (!hasAudio) return;
        master.muted = !master.muted;
        update();
      });
      seek.addEventListener("input", () => seekTo(Number(seek.value)));
      captions?.addEventListener("click", () => {
        captionsOn = !captionsOn;
        captions.setAttribute("aria-pressed", String(captionsOn));
        captions.setAttribute(
          "aria-label",
          captionsOn ? "Desactivar subtítulos" : "Activar subtítulos",
        );
        update();
      });
      root
        .querySelector<HTMLButtonElement>("[data-fullscreen]")!
        .addEventListener("click", async () => {
          try {
            if (document.fullscreenElement) await document.exitFullscreen();
            else if (root.requestFullscreen) await root.requestFullscreen();
            else if ("webkitEnterFullscreen" in video)
              (
                video as HTMLVideoElement & {
                  webkitEnterFullscreen: () => void;
                }
              ).webkitEnterFullscreen();
            else
              error(
                "La pantalla completa no está disponible en este navegador.",
              );
          } catch {
            error("No se pudo abrir la pantalla completa.");
          }
        });
      retry.addEventListener("click", () => {
        notice.hidden = true;
        video.load();
        if (separate) audio.load();
        void toggle();
      });
      for (const media of separate ? [video, audio] : [video])
        media.addEventListener("error", () =>
          error("No se pudo cargar el contenido."),
        );
      for (const event of [
        "timeupdate",
        "loadedmetadata",
        "durationchange",
        "play",
        "pause",
        "volumechange",
        "seeked",
      ])
        master.addEventListener(event, update);
      master.addEventListener("play", () => startRendering());
      master.addEventListener("pause", () => stopRendering());
      master.addEventListener("ended", () => {
        video.pause();
        stopRendering();
        update();
        if (next) {
          status.textContent = "Terminó el episodio.";
          notice.hidden = false;
          retry.hidden = true;
          next.hidden = false;
        }
      });
      document.addEventListener(
        "visibilitychange",
        () => {
          if (document.hidden) stopRendering();
          else if (!master.paused) startRendering();
        },
        { signal: lifecycle.signal },
      );
      root.addEventListener("keydown", (event) => {
        if (
          event.target instanceof HTMLButtonElement ||
          event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLAnchorElement
        )
          return;
        if (event.key === " " || event.key.toLowerCase() === "k") {
          event.preventDefault();
          void toggle();
        } else if (event.key.toLowerCase() === "m" && hasAudio) {
          master.muted = !master.muted;
          update();
        } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          seekTo(master.currentTime + (event.key === "ArrowRight" ? 5 : -5));
        }
      });
      if (root.dataset.subtitles)
        fetch(root.dataset.subtitles)
          .then((response) => {
            if (!response.ok) throw new Error();
            return response.text();
          })
          .then((text) => {
            cues = parseSrt(text);
            update();
          })
          .catch(() => {
            if (captions) {
              captions.disabled = true;
              captions.title = "Subtítulos no disponibles";
            }
          });
      if (root.dataset.projection === "equirectangular") {
        const hint = root.querySelector<HTMLElement>(".hint")!;
        const badge = root.querySelector<HTMLElement>(".badge")!;
        const fallback = () => {
          canvas.hidden = true;
          video.classList.remove("canvas-video");
          hint.hidden = true;
          badge.textContent = "Video";
        };
        void import("three")
          .then((THREE) => {
            let renderer: import("three").WebGLRenderer;
            try {
              renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
            } catch {
              fallback();
              return;
            }
            if (lifecycle.signal.aborted) {
              renderer.dispose();
              return;
            }
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100);
            const geometry = new THREE.SphereGeometry(5, 48, 32);
            geometry.scale(-1, 1, 1);
            const texture = new THREE.VideoTexture(video);
            texture.colorSpace = THREE.SRGBColorSpace;
            const material = new THREE.MeshBasicMaterial({ map: texture });
            scene.add(new THREE.Mesh(geometry, material));
            let longitude = 180;
            let latitude = 0;
            let frame = 0;
            let lastRender = 0;
            let contextAvailable = true;
            let pointer:
              { x: number; y: number; lon: number; lat: number } | undefined;
            const render = () => {
              const phi = THREE.MathUtils.degToRad(90 - latitude);
              const theta = THREE.MathUtils.degToRad(longitude);
              camera.lookAt(
                Math.sin(phi) * Math.cos(theta),
                Math.cos(phi),
                Math.sin(phi) * Math.sin(theta),
              );
              renderer.render(scene, camera);
            };
            renderOnce = render;
            const showPanorama = () => {
              if (
                !contextAvailable ||
                video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
              )
                return;
              render();
              canvas.hidden = false;
              video.classList.add("canvas-video");
              hint.hidden = false;
              badge.textContent = "360°";
            };
            const loop = (now: number) => {
              if (now - lastRender >= 1000 / 30) {
                render();
                lastRender = now;
              }
              frame = requestAnimationFrame(loop);
            };
            startRendering = () => {
              if (
                !frame &&
                !document.hidden &&
                contextAvailable &&
                video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
              )
                frame = requestAnimationFrame(loop);
            };
            stopRendering = () => {
              cancelAnimationFrame(frame);
              frame = 0;
            };
            const resize = () => {
              renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
              renderer.setSize(root.clientWidth, root.clientHeight, false);
              camera.aspect = root.clientWidth / Math.max(root.clientHeight, 1);
              camera.updateProjectionMatrix();
              render();
            };
            const observer = new ResizeObserver(resize);
            observer.observe(root);
            lifecycle.signal.addEventListener(
              "abort",
              () => {
                observer.disconnect();
                stopRendering();
                geometry.dispose();
                texture.dispose();
                material.dispose();
                renderer.dispose();
              },
              { once: true },
            );
            video.addEventListener("seeked", () => renderOnce(), {
              signal: lifecycle.signal,
            });
            video.addEventListener(
              "loadeddata",
              () => {
                showPanorama();
                if (!master.paused) startRendering();
              },
              {
                signal: lifecycle.signal,
              },
            );
            canvas.addEventListener("webglcontextlost", (event) => {
              event.preventDefault();
              contextAvailable = false;
              stopRendering();
              fallback();
            });
            canvas.addEventListener("webglcontextrestored", () => {
              contextAvailable = true;
              resize();
              showPanorama();
              if (!master.paused) startRendering();
            });
            canvas.addEventListener("pointerdown", (event) => {
              pointer = {
                x: event.clientX,
                y: event.clientY,
                lon: longitude,
                lat: latitude,
              };
              canvas.setPointerCapture(event.pointerId);
            });
            canvas.addEventListener("pointermove", (event) => {
              if (!pointer) return;
              longitude = pointer.lon + (pointer.x - event.clientX) * 0.12;
              latitude = Math.max(
                -85,
                Math.min(85, pointer.lat + (event.clientY - pointer.y) * 0.12),
              );
              render();
            });
            canvas.addEventListener("pointerup", () => {
              pointer = undefined;
            });
            canvas.addEventListener("pointercancel", () => {
              pointer = undefined;
            });
            root.addEventListener(
              "keydown",
              (event) => {
                if (event.target !== root || !event.shiftKey) return;
                if (event.key === "ArrowLeft") longitude -= 5;
                else if (event.key === "ArrowRight") longitude += 5;
                else if (event.key === "ArrowUp")
                  latitude = Math.min(85, latitude + 5);
                else if (event.key === "ArrowDown")
                  latitude = Math.max(-85, latitude - 5);
                else return;
                event.preventDefault();
                event.stopImmediatePropagation();
                render();
              },
              true,
            );
            resize();
            showPanorama();
            if (!master.paused) startRendering();
          })
          .catch(fallback);
      }
      update();
      // Metadata can fail before the deferred module attaches its listeners.
      if (video.error || (separate && audio.error)) {
        error("No se pudo cargar el contenido.");
      }
      window.addEventListener(
        "pagehide",
        (event) => {
          if (event.persisted) return;
          lifecycle.abort();
          video.pause();
          audio.pause();
        },
        { signal: lifecycle.signal },
      );
    });
}
