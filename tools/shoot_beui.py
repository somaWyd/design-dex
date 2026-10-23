#!/usr/bin/env python3
"""beUI の見本ページの #preview-stage を撮って previews/beui/<slug>.webp に保存する。

使い方: python3 tools/shoot_beui.py [--force]
既にある画像は飛ばす（--force で撮り直し）。同じページを指す派生（button-* 等）は1回だけ撮って共有する。
"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "web/previews/beui"
SETTLE_MS = 2000  # 入場アニメが落ち着くまで待つ
OPEN_MS = 1200  # ボタンで開く部品（シート等）が開ききるまで待つ
TRIGGER_ONLY_BYTES = 2600  # これより小さい画像は「開くボタンだけ」とみなし、押してから撮り直す


def to_webp(png):
    from io import BytesIO
    from PIL import Image
    img = Image.open(BytesIO(png))
    img.thumbnail((720, 480))
    buf = BytesIO()
    img.save(buf, "WEBP", quality=80)
    return buf.getvalue()


def targets():
    for p in sorted((ROOT / "data/entries").glob("beui*.json")):
        for e in json.loads(p.read_text())["entries"]:
            if e.get("url"):
                yield e["slug"], e["url"]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    force = "--force" in sys.argv
    shot_by_url, failed = {}, []
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={"width": 1100, "height": 900}, device_scale_factor=1,
                                color_scheme="light")
        for slug, url in targets():
            dest = OUT / f"{slug}.webp"
            if dest.exists() and not force:
                continue
            if url in shot_by_url:
                dest.write_bytes(shot_by_url[url])
                continue
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=30000)
                stage = page.locator("#preview-stage, [id$='-panel-preview']").first  # ページの作りが2種類ある
                stage.wait_for(timeout=15000)
                page.wait_for_timeout(SETTLE_MS)
                data = to_webp(stage.screenshot(type="png"))
                if len(data) < TRIGGER_ONLY_BYTES and stage.locator("button").count():
                    stage.locator("button").first.click()
                    page.wait_for_timeout(OPEN_MS)
                    data = to_webp(page.screenshot(type="png"))
                shot_by_url[url] = data
                dest.write_bytes(data)
                print("ok", slug, flush=True)
            except Exception as exc:  # 1件の失敗で全体を止めない。最後にまとめて報告する
                failed.append(f"{slug}: {exc.__class__.__name__}")
        browser.close()
    print(f"失敗 {len(failed)} 件", *failed, sep="\n")


if __name__ == "__main__":
    main()
