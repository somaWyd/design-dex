#!/usr/bin/env python3
"""beUI の項目に preview（実物スクショ）・出典・公式URL・出典つき指示文を付ける。

使い方: python3 tools/beui_entries.py   （tools/shoot_beui.py の後に実行）
スクショが無い項目は、カテゴリに近いデモで代わりに見せる。
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FALLBACK_DEMO = {
    "button": "buttons", "input": "input", "navigation": "nav", "overlay": "sheet", "notice": "toast",
    "data": "domino", "layout": "card", "ai": "skeleton", "page": "card", "text-motion": "text",
    "scroll": "scroll", "ambient": "loop", "feedback": "hover", "transition": "page", "entrance": "enter",
}


def update(e):
    slug, url = e["slug"], e.get("url")
    shot = ROOT / f"web/previews/beui/{slug}.webp"
    e["preview"] = ({"image": f"previews/beui/{slug}.webp"} if shot.exists()
                    else {"demo": FALLBACK_DEMO.get(e["category"], "enter")})
    e["source_ref"] = f"beUI 公式（MCP beui の get_component(\"{slug}\")／shadcn レジストリ @beui/{slug}）"
    e["ref_url"] = url or f"https://beui.dev/r/{slug}.json"
    e["prompt"] = "\n".join([
        f"【出典】{e['source_ref']}／{e['ref_url']}",
        f"【作るもの】{e['name_en']}（{e['name_ja']}）",
        f"【再現する見た目・動き】見本ページのプレビューと同じ。{e['description_ja']}",
        f"【指示】`npx shadcn@latest add @beui/{slug}` で入れて、〈使う場所〉に置いて。"
        "動き・余白・色は beUI のソースのまま変えず、文言とデータだけ差し替えて。",
    ])


def main():
    for p in sorted((ROOT / "data/entries").glob("beui*.json")):
        data = json.loads(p.read_text())
        for e in data["entries"]:
            update(e)
        p.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n")
        print(p.name, len(data["entries"]))


if __name__ == "__main__":
    main()
