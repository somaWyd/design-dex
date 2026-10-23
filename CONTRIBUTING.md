# 項目の追加・修正 / Contributing

1. 書式は [docs/ENTRY_SPEC.md](docs/ENTRY_SPEC.md)、プレビューは [docs/DEMOS.md](docs/DEMOS.md) に従う
2. `ref_url` は実在する公式ページだけ（`curl -L` で 200 を確認）。原文を長く写さず、要約で書く
3. `python3 tools/test_build.py` と `python3 tools/build.py --public` が通ることを確認して Pull Request を出す
