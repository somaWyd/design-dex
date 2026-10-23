#!/usr/bin/env python3
"""DesignDex: data/entries/*.json（と個人用の data/local/entries/*.json）を検証して web/dist/catalog.js にまとめる。

使い方:
  python3 tools/build.py            検証して書き出す（エラーなら書き出さず終了コード1）
  python3 tools/build.py --public   公開版（Web・Mac アプリの同梱）を書き出す。中身は data/basic.json で選んだ「基本」だけ
  python3 tools/build.py --sources  Claude Code・Codex に導入済みのスキル・MCP・プラグインのうち、未登録のものを一覧する
"""
import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
WEB = ROOT / "web"
LOCAL = DATA / "local"  # 個人用（.gitignore）。自動追加の項目と対象外リストを置く
HOME = Path.home()
SKILL_DIRS = [HOME / ".claude/skills", HOME / ".agents/skills", HOME / ".codex/skills"]
MCP_CONFIGS = [HOME / ".claude.json", HOME / ".codex/config.toml"]
PLUGINS_INSTALLED = HOME / ".claude/plugins/installed_plugins.json"
CLAUDE_SETTINGS = HOME / ".claude/settings.json"
REQUIRED = ["id", "kind", "category", "name_ja", "name_en", "description_ja", "prompt", "source_ref", "ref_url"]
KINDS = {"motion", "ui", "type"}
SOURCE_TYPES = {"skill", "mcp", "skill+mcp", "doc"}


def demo_ids():
    import re
    text = (WEB / "demos.js").read_text(encoding="utf-8")
    body = text.split("const TEMPLATES = {", 1)[1].split("\n};", 1)[0]
    return set(re.findall(r"^  ([a-z]+):", body, re.M))


def preview_error(p, demos):
    if not isinstance(p, dict):
        return "preview が無い"
    if "image" in p:
        return None if (WEB / p["image"]).exists() else f"画像が無い {p['image']}"
    if "font" in p:
        return None if p["font"].strip() else "font が空"
    return None if p.get("demo") in demos else f"demo '{p.get('demo')}' は demos.js に無い"


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def validate(categories, files, demos=None):
    demos = demo_ids() if demos is None else demos
    cat_kind = {c["id"]: c["kind"] for c in categories}
    errors, seen, sources, entries = [], set(), [], []
    for path, data in files:
        src = data.get("source") or {}
        if not src.get("id") or src.get("type") not in SOURCE_TYPES:
            errors.append(f"{path.name}: source.id と source.type（skill/mcp/skill+mcp/doc）が必要")
            continue
        if src["id"] not in {x["id"] for x in sources}:
            sources.append(src)
        for i, e in enumerate(data.get("entries", [])):
            where = f"{path.name}[{i}] {e.get('id', '?')}"
            missing = [k for k in REQUIRED if not str(e.get(k, "")).strip()]
            if missing:
                errors.append(f"{where}: 必須項目が空 {missing}")
                continue
            if e["kind"] not in KINDS:
                errors.append(f"{where}: kind は motion / ui / type")
            elif cat_kind.get(e["category"]) != e["kind"]:
                errors.append(f"{where}: category '{e['category']}' は kind '{e['kind']}' に無い")
            for key in ("url", "ref_url"):
                if e.get(key) and not str(e[key]).startswith("https://"):
                    errors.append(f"{where}: {key} は https:// のみ")
            if (err := preview_error(e.get("preview"), demos)):
                errors.append(f"{where}: {err}")
            if e["id"] in seen:
                errors.append(f"{where}: id が重複")
            seen.add(e["id"])
            entries.append({**e, "source": src["id"]})
    return errors, sources, entries


HOST_NAMES = {"developer.mozilla.org": "MDN Web Docs", "m3.material.io": "Material Design 3", "fonts.google.com": "Google Fonts",
              "developer.apple.com": "Apple Developer", "web.dev": "web.dev", "www.w3.org": "W3C", "design.digital.go.jp": "デジタル庁デザインシステム"}


def to_basic(files, spec):
    """data/basic.json の選び方で、元の項目を出典「基本」1つにまとめ直す。
    出典表記から作者の手元のスキルのパスを外し、公式ページの URL だけを残す（公開版の人はそのスキルを持っていないため）"""
    from urllib.parse import urlparse
    src = {k: v for k, v in spec["source"].items()}
    rules = {r["source"]: set(r.get("categories") or []) for r in spec["include"]}
    out = []
    for _, data in files:
        sid = data["source"]["id"]
        if sid not in rules:
            continue
        for e in data["entries"]:
            if rules[sid] and e["category"] not in rules[sid]:
                continue
            host = urlparse(e["ref_url"]).hostname or ""
            ref = HOST_NAMES.get(host, host)
            lines = e["prompt"].split("\n")
            if lines and lines[0].startswith("【出典】"):
                lines[0] = f"【出典】{ref}／{e['ref_url']}"
            out.append({**e, "id": "basic/" + e["id"].split("/", 1)[1], "source": src["id"], "source_ref": ref, "prompt": "\n".join(lines)})
    return [src], out


def build(public=False):
    categories = load_json(DATA / "categories.json")
    files = [(p, load_json(p)) for p in entry_files(public)]
    errors, sources, entries = validate(categories, files)
    if public and not errors:
        sources, entries = to_basic(files, load_json(DATA / "basic.json"))
        ids = [e["id"] for e in entries]
        if len(ids) != len(set(ids)):
            errors.append("基本: id が重複している")
    if errors:
        print("検証エラー（catalog.js は更新していません）:")
        print("\n".join(f"  - {e}" for e in errors))
        return 1
    catalog = {"built_at": date.today().isoformat(), "categories": categories,
               "sources": sources, "entries": entries, "import_skill": import_skill()}
    out = WEB / "dist/catalog.js"
    out.parent.mkdir(exist_ok=True)
    out.write_text("window.CATALOG = " + json.dumps(catalog, ensure_ascii=False) + ";\n", encoding="utf-8")
    print(f"OK: 導入元 {len(sources)} / 項目 {len(entries)} → {out}")
    return 0


IMPORT_SKILL = ROOT / "integrations/designdex-import/SKILL.md"


def import_skill():
    """アプリの「スキルを取り込む」でコピーするプロンプトの本体（SKILL.md の frontmatter を除いた部分）"""
    text = IMPORT_SKILL.read_text(encoding="utf-8")
    return text.split("---", 2)[2].strip() if text.startswith("---") else text.strip()


def entry_files(public=False):
    """public=True なら公開データだけ（個人用の data/local を含めない）"""
    shared = sorted((DATA / "entries").glob("*.json"))
    return shared if public else shared + sorted((LOCAL / "entries").glob("*.json"))


def mcp_names(path):
    if not path.exists():
        return set()
    if path.suffix == ".toml":
        import tomllib
        return set(tomllib.loads(path.read_text(encoding="utf-8")).get("mcp_servers", {}))
    return set(load_json(path).get("mcpServers", {}))


def plugin_names():
    """Claude Code のプラグイン（スキル・MCP を束ねたもの）。id は「名前@マーケット」の名前部分。無効にしたものは除く"""
    if not PLUGINS_INSTALLED.exists():
        return set()
    disabled = {k for k, on in (load_json(CLAUDE_SETTINGS).get("enabledPlugins", {}) if CLAUDE_SETTINGS.exists() else {}).items() if not on}
    return {k.split("@")[0] for k in load_json(PLUGINS_INSTALLED).get("plugins", {}) if k not in disabled}


def installed_sources():
    skills = {p.parent.name for d in SKILL_DIRS if d.exists() for p in d.glob("*/SKILL.md")}
    mcps = set().union(*(mcp_names(p) for p in MCP_CONFIGS))
    return skills, mcps, plugin_names()


def unregistered():
    sources = [load_json(p)["source"] for p in entry_files()]
    known = {s["id"] for s in sources} | {c for s in sources for c in s.get("covers", [])}
    skipped = set(load_json(LOCAL / "skipped.json")) if (LOCAL / "skipped.json").exists() else set()
    skills, mcps, plugins = installed_sources()
    kind = lambda n: "プラグイン" if n in plugins else "MCP" if n in mcps else "スキル"
    return [(n, kind(n)) for n in sorted((skills | mcps | plugins) - known - skipped)]


def report_sources():
    todo = unregistered()
    print("未登録の導入元:" if todo else "未登録の導入元はありません")
    for name, kind in todo:
        print(f"  - {name}（{kind}）")
    return 0


if __name__ == "__main__":
    sys.exit(report_sources() if "--sources" in sys.argv else build(public="--public" in sys.argv))
