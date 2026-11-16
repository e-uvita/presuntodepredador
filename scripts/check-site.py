#!/usr/bin/env python3
"""Exercise the built site. Run with: uv run --with playwright python scripts/check-site.py URL."""

import json
import os
from pathlib import Path
import sys
import html
import re

from playwright.sync_api import sync_playwright, expect

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4322/presuntodepredador/"
OUTPUT = Path(os.getenv("TMPDIR", "/tmp")) / "presunto-qa"
OUTPUT.mkdir(parents=True, exist_ok=True)
CACHE = Path.home() / "Library/Caches/ms-playwright"


def launch(browser_type):
    options = {"headless": True}
    if not Path(browser_type.executable_path).exists():
        pattern = (
            "chromium_headless_shell-*/chrome-headless-shell-mac-*/chrome-headless-shell"
            if browser_type.name == "chromium"
            else "webkit-*/pw_run.sh"
        )
        candidates = sorted(CACHE.glob(pattern))
        if candidates:
            options["executable_path"] = str(candidates[-1])
    return browser_type.launch(**options)


def no_overflow(page):
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), "Horizontal overflow"


def check_browser(browser_type):
    browser = launch(browser_type)
    context = browser.new_context(viewport={"width": 1440, "height": 960})
    page = context.new_page()
    errors = []
    failed_assets = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on(
        "response",
        lambda response: (
            failed_assets.append(response.url) if response.status >= 400 and response.url.startswith(BASE) else None
        ),
    )
    page.goto(BASE, wait_until="networkidle")
    assert page.locator(".chapter-card").count() > 0
    expect(page.locator("[data-water-title]")).to_have_attribute("data-ready", "true")
    expect(page.locator("[data-motion]")).to_have_attribute("aria-pressed", "false")
    page.locator("[data-motion]").click()
    expect(page.locator("[data-motion]")).to_have_attribute("aria-pressed", "true")
    page.locator("summary").click()
    expect(page.locator(".credits")).to_have_attribute("open", "")
    expect(page.get_by_text("Elizabeth Lezama Jacinto", exact=True)).to_be_visible()
    page.locator("summary").click()

    links = page.locator(".chapter-card").evaluate_all("(links) => links.map(a => a.href)")
    for width, height in [(320, 740), (390, 844), (768, 1024), (1024, 768), (1440, 960), (1920, 1080), (844, 390)]:
        page.set_viewport_size({"width": width, "height": height})
        no_overflow(page)
        # A paused WebGL title must survive responsive canvas resizing.
        page.wait_for_function("""() => {
          const canvas = document.querySelector('[data-water-title] canvas');
          const gl = canvas.getContext('webgl');
          const pixels = new Uint8Array(canvas.width * canvas.height * 4);
          gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          return pixels.some((value, index) => index % 4 === 3 && value > 0);
        }""")
        assert page.locator(".watch-button").bounding_box()["height"] >= 44
        if width in (390, 1440):
            page.evaluate("document.activeElement.blur(); window.scrollTo(0, 0)")
            page.screenshot(path=str(OUTPUT / f"{browser_type.name}-home-{width}.png"), full_page=True)
    for href in links:
        assert page.request.get(href).status == 200, f"Deep link failed: {href}"

    page.goto(BASE + "tipografia/", wait_until="networkidle")
    expect(page.locator("[data-specimen-controls]")).to_be_visible()
    page.locator("[data-text]").fill("Tiburones y palabras")
    expect(page.locator("[data-preview-text]")).to_have_text("Tiburones y palabras")
    page.locator("[data-family]").select_option("body")
    page.locator("[data-size]").fill("96")
    expect(page.locator("[data-size-output]")).to_have_text("96 px")
    expect(page.locator("[data-download]")).to_be_hidden()
    page.locator("[data-reset]").click()
    expect(page.locator("[data-size-output]")).to_have_text("64 px")
    for width in (320, 390, 768, 1440):
        page.set_viewport_size({"width": width, "height": 844})
        no_overflow(page)
    page.screenshot(path=str(OUTPUT / f"{browser_type.name}-typography.png"), full_page=True)

    # Exercise optional layers with the real UI module and a local fixture catalog.
    layered = browser.new_page()

    def with_layers(route):
        response = route.fetch()
        markup = response.text()
        match = re.search(r'data-typefaces="([^"]+)"', markup)
        faces = json.loads(html.unescape(match.group(1)))
        faces[0]["layers"] = [{"name": f"Capa {i}", "cssFamily": "var(--font-display)"} for i in range(1, 4)]
        markup = markup[: match.start(1)] + html.escape(json.dumps(faces), quote=True) + markup[match.end(1) :]
        route.fulfill(response=response, body=markup)

    layered.route(BASE + "tipografia/", with_layers)
    layered.goto(BASE + "tipografia/", wait_until="networkidle")
    expect(layered.locator("[data-layer-options] input")).to_have_count(3)
    for checkbox in layered.locator("[data-layer-options] input").all():
        checkbox.uncheck()
    expect(layered.locator("[data-empty]")).to_be_visible()
    layered.locator("[data-reset]").click()
    for checkbox in layered.locator("[data-layer-options] input").all():
        expect(checkbox).to_be_checked()
    expect(layered.locator("[data-empty]")).to_be_hidden()
    layered.close()

    page.set_viewport_size({"width": 1440, "height": 960})
    page.goto(links[0], wait_until="networkidle")
    page.wait_for_function('document.querySelector("video").readyState >= 1')
    total = page.locator("video").evaluate("(v) => v.duration")
    assert total > 0
    player = page.locator("[data-panorama-player]")
    if player.get_attribute("data-has-audio") == "true" or player.get_attribute("data-audio"):
        expect(page.locator("[data-mute]")).to_be_enabled()
    else:
        expect(page.locator("[data-mute]")).to_be_disabled()
    video_source = page.locator("video").get_attribute("src")
    page.locator("[data-play]").click()
    page.wait_for_function('document.querySelector("video").currentTime > 0.5')
    if player.get_attribute("data-projection") == "equirectangular":
        expect(page.locator("canvas")).to_be_visible()
    expect(page.locator("[data-play]")).to_have_attribute("aria-label", "Pausar")
    page.locator("[data-play]").click()
    assert page.locator("video").evaluate("(v) => v.paused")
    page.locator("[data-seek]").fill("30")
    page.wait_for_function('Math.abs(document.querySelector("video").currentTime - 30) < 0.1')
    expect(page.locator("[data-time]")).to_contain_text("00:30")
    page.locator("[data-panorama-player]").focus()
    page.keyboard.press("ArrowRight")
    page.wait_for_function('Math.abs(document.querySelector("video").currentTime - 35) < 0.1')
    page.keyboard.press("Shift+ArrowLeft")
    assert abs(page.locator("video").evaluate("(v) => v.currentTime") - 35) < 0.1
    canvas = page.locator("canvas")
    rect = canvas.bounding_box()
    page.mouse.move(rect["width"] * 0.5, rect["height"] * 0.5)
    page.mouse.down()
    page.mouse.move(rect["width"] * 0.7, rect["height"] * 0.55, steps=5)
    page.mouse.up()
    page.locator("[data-fullscreen]").click()
    page.wait_for_function("Boolean(document.fullscreenElement)")
    page.evaluate("document.exitFullscreen()")
    page.screenshot(path=str(OUTPUT / f"{browser_type.name}-player-desktop.png"))
    for width, height in [(320, 740), (390, 844), (768, 1024), (844, 390)]:
        page.set_viewport_size({"width": width, "height": height})
        no_overflow(page)
        for selector in ("[data-play]", "[data-fullscreen]", ".back", "[data-seek]"):
            box = page.locator(selector).bounding_box()
            assert box["x"] >= 0 and box["x"] + box["width"] <= width + 1, selector
            assert box["y"] >= 0 and box["y"] + box["height"] <= height, selector
        if width == 390:
            page.screenshot(path=str(OUTPUT / f"{browser_type.name}-player-mobile.png"))
    # End state keeps playback stopped and offers the actual next episode.
    page.set_viewport_size({"width": 1440, "height": 960})
    page.locator("video").evaluate("(v) => { v.currentTime = v.duration - .1; }")
    page.locator("[data-play]").click()
    expect(page.locator("[data-next]")).to_be_visible()
    page.locator("[data-next]").click()
    page.wait_for_load_state("networkidle")
    assert links[1] in page.url
    page.locator(".back").click()
    page.wait_for_load_state("networkidle")
    assert "#episodios" in page.url
    assert not errors, errors
    assert not failed_assets, failed_assets

    reduced = browser.new_context(viewport={"width": 390, "height": 844}, reduced_motion="reduce")
    quiet = reduced.new_page()
    quiet.goto(BASE, wait_until="networkidle")
    expect(quiet.locator("[data-motion]")).to_have_attribute("aria-pressed", "true")
    assert quiet.locator("[data-water-title]").get_attribute("data-ready") is None
    assert quiet.locator(".water-title img").evaluate("(img) => img.complete && img.naturalWidth > 0")
    reduced.close()

    plain_context = browser.new_context(java_script_enabled=False)
    plain = plain_context.new_page()
    plain.goto(BASE, wait_until="networkidle")
    expect(plain.locator(".chapter-card")).to_have_count(len(links))
    assert plain.locator(".water-title img").evaluate("(img) => img.complete && img.naturalWidth > 0")
    plain.goto(links[0], wait_until="networkidle")
    assert plain.locator("video").get_attribute("controls") is not None
    plain_context.close()

    broken = browser.new_page()
    broken.route("**" + video_source, lambda route: route.abort())
    broken.goto(links[0], wait_until="networkidle")
    expect(broken.locator("[data-retry]")).to_be_visible()
    broken.unroute("**" + video_source)
    broken.locator("[data-retry]").click()
    broken.wait_for_function('document.querySelector("video").currentTime > .1')
    broken.close()
    browser.close()
    return {
        "browser": browser_type.name,
        "status": "passed",
        "checks": "7 viewports, shader, motion, credits, routes, typography editing/size/reset/layers, panorama, play/pause, seek, keyboard, drag, fullscreen, ended/next, no-JS, media retry",
    }


with sync_playwright() as playwright:
    results = [check_browser(playwright.chromium), check_browser(playwright.webkit)]
print(json.dumps({"results": results, "screenshots": str(OUTPUT)}, indent=2))
