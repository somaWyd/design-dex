# 項目の書き方（DesignDex）

目的: 使う人が「名前が分からず曖昧な指示をしてしまう」のを防ぐ。見た目・動きの言葉で検索して、プレビューで確かめ、出典つきの指示文か公式URLをコピーして Claude に渡す。

## ファイル

`entries/<導入元id>.json`（大きい導入元は `-1`, `-2` で分けてよい。source は全ファイルで同じ）

```json
{
  "source": {"id": "beui", "type": "skill+mcp", "name": "beUI", "ref": "https://beui.dev", "added_at": "2026-10-22"},
  "entries": [ { ...項目... } ]
}
```

- `source.type`: `skill` / `mcp` / `skill+mcp` / `doc`（公式ドキュメント）
- `source.id`: スキル名・MCP名と一致させる（未登録チェックに使う）。ドキュメントは `apple-hig` など任意

## 項目

| キー | 必須 | 書き方 |
|---|---|---|
| `id` | 必須 | `<導入元id>/<英小文字kebab>`。全体で重複しない |
| `kind` | 必須 | `motion`（動き）／`ui`（部品・画面）／`type`（文字・フォント） |
| `category` | 必須 | `categories.json` の id。kind と一致するもの |
| `name_en` | 必須 | 正式名（英語）。指示に使う名前そのもの |
| `name_ja` | 必須 | 日本語の呼び名。見た目が浮かぶ短い名前 |
| `description_ja` | 必須 | 見た目・動きを1〜2文で。専門語を避ける |
| `aliases` | 推奨 | 使う人が曖昧に言いそうな言葉3〜6個 |
| `preview` | 必須 | `DEMOS.md` の書式。中身に最も近いデモを選ぶ |
| `source_ref` | 必須 | 出典を一文で。どのスキル／MCP／ドキュメントの、どの節・どのツールか（例: 「スキル apple-design（~/.agents/skills/apple-design/SKILL.md）の『Springs』節」「beUI MCP の get_component("bottom-sheet")」「Material 3 公式『Snackbar』ページ」） |
| `ref_url` | 必須 | 再現に使える公式ページの URL（https のみ）。**curl で 200 を確認したものだけ**。作り話の URL を入れない |
| `prompt` | 必須 | 下の型の指示文 |
| `slug` | 任意 | 導入名（beUI の `@beui/<slug>` など） |

## 指示文（prompt）の型

プレビューと同じものが再現できるように、出典と数値を必ず入れる。改行して次の4行で書く:

```
【出典】<source_ref>／<ref_url>
【作るもの】<name_en>（<name_ja>）
【再現する見た目・動き】<DEMOS.md の「プレビューの動き」の値、または出典に書かれた具体値>
【指示】〈使う場所〉に<name_en>を入れて。<出典に従うべき点を1文>
```

- 〈〉は使う人が書き換える場所。数値は出典かプレビューの値を書く（「いい感じに」と書かない）
- タイポは【再現する見た目・動き】に書体名・太さ・字間・行間・読み込み方法（Google Fonts の URL など）を書く

## 禁止

- 存在しない slug・URL を作らない（curl で確かめる）
- 絵文字を使わない
- 元資料の文章を長く写さない（要約して日本語で書く）
