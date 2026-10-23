from pathlib import Path

from build import validate

CATS = [{"id": "entrance", "kind": "motion"}, {"id": "button", "kind": "ui"}]
OK = {"id": "x/a", "kind": "motion", "category": "entrance", "name_ja": "あ",
      "name_en": "A", "description_ja": "説明", "prompt": "指示", "source_ref": "出典",
      "ref_url": "https://example.com", "preview": {"demo": "enter"}}


def run(entries):
    return validate(CATS, [(Path("t.json"), {"source": {"id": "x", "type": "skill"}, "entries": entries})], {"enter"})


def test_validate():
    assert run([OK])[0] == []
    assert run([{**OK, "prompt": ""}])[0]                # 空の必須項目
    assert run([{**OK, "category": "button"}])[0]        # kind と category の食い違い
    assert run([OK, OK])[0]                              # id 重複
    assert run([{**OK, "url": "javascript:alert(1)"}])[0]  # https 以外の url
    assert run([{**OK, "preview": {"demo": "nope"}}])[0]  # 未登録のデモ
    assert run([{**OK, "ref_url": ""}])[0]                # 出典URLなし
    assert run([OK])[2][0]["source"] == "x"


if __name__ == "__main__":
    test_validate()
    print("test_build: OK")
