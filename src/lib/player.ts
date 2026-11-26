import { cueAtTime, parseSrt, type SubtitleCue } from "./srt-parser";
import { initWaterTitle } from "./water-title";
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
      const nextHref = root.dataset.nextHref;
      const notice = root.querySelector<HTMLElement>("[data-notice]")!;
      const hint = root.querySelector<HTMLElement>(".hint")!;
      const status = root.querySelector<HTMLElement>("[data-status]")!;
      const retry = root.querySelector<HTMLButtonElement>("[data-retry]")!;
      const pausedInfo = root.querySelector<HTMLElement>("[data-paused-info]");
      const pausedTitle = pausedInfo?.querySelector<HTMLElement>("[data-water-title]");
      const separate = Boolean(root.dataset.audio);
      const hasAudio = separate || root.dataset.hasAudio === "true";
      const master = separate ? audio : video;
      const lifecycle = new AbortController();
      let cues: SubtitleCue[] = [];
      let captionsOn = true;
      let renderOnce = () => {};
      let startRendering = () => {};
      let stopRendering = () => {};
      let titleFrame = 0;
      let titlePrevious = 0;
      let titleTime = 0;
      let titleWater: ReturnType<typeof initWaterTitle> | undefined;
      let controlsIdleTimer = 0;
      let hintTimer = 0;
      let hintFadeTimer = 0;
      let hintStartedAt = 0;
      // The hint starts as a prominent intro and, once it has been seen for
      // a few seconds of playback, settles into a discreet label at the top.
      const hintIntroDuration = 3000;
      let hintRemaining = hintIntroDuration;
      let panoramaReady = false;
      video.controls = false;
      video.playsInline = true;
      if (!hasAudio) video.muted = true;
      controls.hidden = false;
      video.loop = root.dataset.loop === "true";
      const stopPausedTitle = () => {
        cancelAnimationFrame(titleFrame);
        titleFrame = 0;
      };
      const animatePausedTitle = (now: number) => {
        if (!pausedInfo || pausedInfo.hidden || !master.paused || document.hidden) {
          titleFrame = 0;
          return;
        }
        if (now - titlePrevious >= 1000 / 30) {
          titleTime += Math.min((now - titlePrevious) / 1000, 0.1);
          titlePrevious = now;
          titleWater?.draw(titleTime);
        }
        titleFrame = requestAnimationFrame(animatePausedTitle);
      };
      const startPausedTitle = () => {
        if (
          !pausedInfo ||
          !pausedTitle ||
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
        )
          return;
        titleWater ??= initWaterTitle(pausedTitle);
        titlePrevious = performance.now();
        if (!titleFrame) titleFrame = requestAnimationFrame(animatePausedTitle);
      };
      const hidePausedInfo = () => {
        stopPausedTitle();
        if (pausedInfo) {
          pausedInfo.hidden = true;
          pausedInfo.setAttribute("aria-hidden", "true");
        }
      };
      const showPausedInfo = () => {
        if (!pausedInfo || !master.paused || master.ended || !notice.hidden)
          return;
        pausedInfo.hidden = false;
        pausedInfo.setAttribute("aria-hidden", "false");
        startPausedTitle();
      };
      const stopHintCountdown = () => {
        if (!hintTimer) return;
        window.clearTimeout(hintTimer);
        hintTimer = 0;
        hintRemaining = Math.max(
          0,
          hintRemaining - (performance.now() - hintStartedAt),
        );
      };
      const showHint = () => {
        hint.hidden = false;
      };
      const settleHint = () => {
        window.clearTimeout(hintTimer);
        hintTimer = 0;
        hintRemaining = 0;
        if (hint.dataset.mode === "compact" || hintFadeTimer) return;
        hint.dataset.fading = "true";
        hintFadeTimer = window.setTimeout(() => {
          hint.dataset.mode = "compact";
          delete hint.dataset.fading;
          hintFadeTimer = 0;
        }, 700);
      };
      const startHintCountdown = () => {
        if (
          hint.hidden ||
          hint.dataset.mode === "compact" ||
          hint.dataset.fading === "true" ||
          !panoramaReady ||
          master.paused ||
          hintTimer
        )
          return;
        if (hintRemaining <= 0) {
          settleHint();
          return;
        }
        hintStartedAt = performance.now();
        hintTimer = window.setTimeout(settleHint, hintRemaining);
      };
      const revealControls = () => {
        if (master.paused && pausedInfo && !pausedInfo.hidden) hidePausedInfo();
        delete root.dataset.controlsHidden;
        if (!master.paused && panoramaReady) startHintCountdown();
        window.clearTimeout(controlsIdleTimer);
        controlsIdleTimer = window.setTimeout(() => {
          root.dataset.controlsHidden = "true";
          if (master.paused) {
            settleHint();
            showPausedInfo();
          }
        }, 3000);
      };
      const chromeTargets = Array.from(
        root.querySelectorAll<HTMLElement>(".back, .badge, .hint, .controls"),
      );
      const handlePointerActivity = (event: PointerEvent) => {
        if (master.paused && pausedInfo && !pausedInfo.hidden) {
          revealControls();
          return;
        }
        const proximity = 64;
        const nearChrome = chromeTargets.some((target) => {
          const rect = target.getBoundingClientRect();
          return (
            event.clientX >= rect.left - proximity &&
            event.clientX <= rect.right + proximity &&
            event.clientY >= rect.top - proximity &&
            event.clientY <= rect.bottom + proximity
          );
        });
        if (nearChrome) revealControls();
      };
      root.addEventListener("pointermove", handlePointerActivity, {
        passive: true,
      });
      root.addEventListener("pointerdown", handlePointerActivity, {
        passive: true,
      });
      root.addEventListener("keydown", revealControls);
      root.addEventListener("focusin", revealControls);
      revealControls();
      if (separate) {
        audio.src = root.dataset.audio!;
        video.muted = true;
      }
      const error = (message: string) => {
        status.textContent = message;
        notice.hidden = false;
        retry.hidden = false;
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
          "--seek-progress",
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
      // Mobile browsers wait for a direct user gesture before loading and
      // playing video. Keep the video tappable when WebGL falls back.
      video.addEventListener("click", () => void toggle());
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
      const fullscreen = root.querySelector<HTMLButtonElement>("[data-fullscreen]")!;
      const fullscreenIcon = fullscreen.querySelector<HTMLElement>("[data-icon-fullscreen]")!;
      const fullscreenExitIcon = fullscreen.querySelector<HTMLElement>("[data-icon-fullscreen-exit]")!;
      const webkitVideo = video as HTMLVideoElement & {
        webkitDisplayingFullscreen?: boolean;
        webkitEnterFullscreen?: () => void;
        webkitExitFullscreen?: () => void;
      };
      const updateFullscreenButton = () => {
        const isFullscreen =
          document.fullscreenElement === root ||
          Boolean(webkitVideo.webkitDisplayingFullscreen);
        fullscreenIcon.hidden = isFullscreen;
        fullscreenExitIcon.hidden = !isFullscreen;
        fullscreen.setAttribute(
          "aria-label",
          isFullscreen ? "Salir de pantalla completa" : "Pantalla completa",
        );
        fullscreen.title = isFullscreen
          ? "Salir de pantalla completa"
          : "Pantalla completa";
      };
      fullscreen.addEventListener("click", async () => {
        try {
          if (document.fullscreenElement) await document.exitFullscreen();
          else if (webkitVideo.webkitDisplayingFullscreen)
            webkitVideo.webkitExitFullscreen?.();
          else if (root.requestFullscreen) await root.requestFullscreen();
          else if (webkitVideo.webkitEnterFullscreen)
            webkitVideo.webkitEnterFullscreen();
          else
            error(
              "La pantalla completa no está disponible en este navegador.",
            );
        } catch {
          error("No se pudo abrir la pantalla completa.");
        }
      });
      document.addEventListener("fullscreenchange", updateFullscreenButton, {
        signal: lifecycle.signal,
      });
      video.addEventListener("webkitbeginfullscreen", updateFullscreenButton, {
        signal: lifecycle.signal,
      });
      video.addEventListener("webkitendfullscreen", updateFullscreenButton, {
        signal: lifecycle.signal,
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
      master.addEventListener("pause", () => {
        stopHintCountdown();
        revealControls();
      });
      master.addEventListener("play", () => {
        hidePausedInfo();
        revealControls();
        startHintCountdown();
      });
      master.addEventListener("play", () => startRendering());
      master.addEventListener("pause", () => stopRendering());
      master.addEventListener("ended", () => {
        hidePausedInfo();
        revealControls();
        video.pause();
        stopRendering();
        update();
        // Continue the series without an intermediate screen.
        if (nextHref) window.location.assign(nextHref);
      });
      document.addEventListener(
        "visibilitychange",
        () => {
          if (document.hidden) {
            stopRendering();
            stopPausedTitle();
          } else if (!master.paused) startRendering();
          else if (pausedInfo && !pausedInfo.hidden) startPausedTitle();
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
        const badge = root.querySelector<HTMLElement>(".badge")!;
        const fallback = () => {
          panoramaReady = false;
          canvas.hidden = true;
          video.classList.remove("canvas-video");
          window.clearTimeout(hintFadeTimer);
          hintFadeTimer = 0;
          delete hint.dataset.fading;
          hint.hidden = true;
          stopHintCountdown();
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
            let dragged = false;
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
              panoramaReady = true;
              showHint();
              startHintCountdown();
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
              dragged = false;
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
              if (
                Math.abs(pointer.x - event.clientX) > 8 ||
                Math.abs(pointer.y - event.clientY) > 8
              )
                dragged = true;
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
            // Once the panorama canvas covers the video, a tap on it should
            // still start or pause playback. A drag remains camera movement.
            canvas.addEventListener("click", () => {
              if (dragged) return;
              void toggle();
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
          window.clearTimeout(controlsIdleTimer);
          window.clearTimeout(hintTimer);
          window.clearTimeout(hintFadeTimer);
          stopPausedTitle();
          titleWater?.dispose();
          video.pause();
          audio.pause();
        },
        { signal: lifecycle.signal },
      );
    });
}
