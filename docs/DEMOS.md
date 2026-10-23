# プレビューのデモ一覧（preview.demo / preview.variant に使える値）

entries の `preview` は次のどれか1つ:
- `{"demo": "<id>", "variant": "<variant>"}` … 下表のデモ（variant は無印なら省略）
- `{"image": "previews/beui/<slug>.webp"}` … 実物のスクショ（beUI）
- `{"font": "<書体名>", "google": true|false, "fallback": "sans|serif|mono", "weight": 400, "sample": "あ永 Aa", "sample_long": "..."}` … タイポ

プロンプトには「プレビューの動き」欄の数値をそのまま書くこと（プレビューと同じものが再現できるように）。

| id | variant | 見せているもの | プレビューの動き（プロンプトに書く値） |
|---|---|---|---|
| enter | (無印)=fade, slide, up, scale, pop, clip, circle, blur | 要素の出現と退場 | fade: opacity 0→1、2.6秒周期・ease-out／slide: translateX(-70px)→0／up: translateY(40px)→0／scale: scale(.8)→1／pop: scale(.5)→1.12→1／clip: clip-path inset(0 100% 0 0)→inset(0)、cubic-bezier(.2,.8,.2,1)／circle: clip-path circle(0%)→circle(75%)／blur: blur(10px)+scale(1.08)→0 |
| stagger | - | 5本のバーが時間差で下から出る | translateY(16px)+opacity 0→1、間隔80ms、cubic-bezier(.2,.8,.2,1) |
| timing | delay, duration, steps, tween, fill | 2つの点の動きの違い（上が基準） | delay: 下を0.4秒遅らせる／duration: 下を1.3秒に／steps: 下を steps(5)／tween: 下を linear／fill: 下を1回で止めて forwards |
| ease | ease-out, ease-in, ease-in-out, spring, custom, bounce, heavy | 上=linear の比較用、下=指定のイージング | ease-out: cubic-bezier(.2,.8,.2,1)／ease-in: (.6,0,.9,.4)／ease-in-out: (.65,0,.35,1)／spring: (.34,1.56,.64,1)／custom: (.16,1,.3,1)／bounce: 終点で2回跳ねる／heavy: (.5,1.8,.4,.8) 3.2秒 |
| transform | (無印)=translate, scale, rotate, skew, origin, flip, tilt | 変形の種類 | translate: ±50px／scale: .6→1.25／rotate: 0→180deg／skew: skewX(-22deg)／origin: 左上を軸に回転／flip: perspective 500px で rotateY 180deg／tilt: rotateX/Y ±12〜16deg を3秒で往復 |
| cross | (無印), blur | 2つの形の入れ替え | 無印: opacity のクロスフェード／blur: 消える側に blur(6px) |
| morph | - | 角丸の箱が横長の錠剤形に変形 | border-radius 12→30px と scaleX 1→2.6、cubic-bezier(.34,1.3,.64,1) |
| shared | - | 小さなサムネが大きなカードに広がる | translate(-70px,20px) scale(.35)→元の位置と大きさ、cubic-bezier(.2,.8,.2,1) |
| accordion | - | 見出しの下が開閉 | 本体を transform-origin top で scaleY 0→1 |
| page | (無印), fade | 画面遷移 | 無印: 新画面が translateX(105%)→0、旧画面は -30% と scale(.96)／fade: クロスフェード |
| scroll | (無印), edge, progress | スクロールで要素が現れる | 無印: 視界に入った行が translateX(-14px)+opacity で出る／edge: 上端に半透明のぼかしバー／progress: 上端の進捗バーが scaleX 0→1 |
| parallax | - | 背景と前景が違う速さで動く | 背景 ±12px、前景 ±50px |
| hover | (無印), press, state | カーソルが来たときの反応 | 無印: translateY(-3px)+影／press: 押下で scale(.94)／state: 白の重ね(不透明度18%)＝Material の state layer |
| hold | - | 長押しで塗りが進むボタン | 左から scaleX 0→1 を約1.5秒で塗る |
| drag | (無印), swipe, rubber | 指で動かす | 無印: 掴んで動かし離すとバネで戻る (.34,1.4,.64,1)／swipe: 右へ払って消える／rubber: 端を越えて引くと抵抗し、戻るとき少し行き過ぎる |
| reorder | - | 2行の並び替え | 1行目と2行目が translateY で入れ替わる |
| shake | - | 左右に震える | translateX -9,8,-6,4px と減衰 |
| ripple | (無印), sound | 押した点から広がる波紋 | scale 0→4、opacity .5→0／sound: 外側にも波紋 |
| marquee | - | ロゴやチップが横に流れ続ける | 6秒で -50% を linear で無限ループ |
| loop | (無印)=pulse, float, spin, yoyo, orbit, idle | 常に動く演出 | pulse: scale 1→1.12／float: ±6px 2.4秒／spin: 1.6秒で1回転／yoyo: ±50px 往復／orbit: 点が円を描く／idle: ±6px 3.6秒 |
| compare | - | ビフォー・アフターの比較スライダー | 上の層の clip-path を左右に動かす |
| draw | - | 線が描かれていく | SVG の stroke-dashoffset 300→0 |
| text | type, shimmer | 文字の演出 | type: steps(10) で1文字ずつ出す＋点滅カーソル／shimmer: 光の帯が文字の上を2秒で流れる |
| textmorph | - | 文言の入れ替え（保存する→保存済み） | 古い文言が blur(6px)+透明、新しい文言が現れる |
| ticker | (無印), tabular | 数字が回転して変わる | 各桁が translateY で回る、桁ごとに0.1秒遅らせる／tabular: font-variant-numeric: tabular-nums で桁幅をそろえる |
| skeleton | - | 読み込み中の骨組み | 灰色の行の上を光が1.4秒で流れる |
| perf | - | 滑らか（上）とカクつき（下）の比較 | 下は steps(7) でコマ落ち |
| principle | (無印)=anticipation, follow, squash, reduced | アニメの原則 | anticipation: 動く前に逆へ14px 引く／follow: 行き過ぎて戻る／squash: 着地で scale(1.3,.7) に潰れる／reduced: 移動なしのフェードだけ |
| toast | (無印), fab | 下から出る通知・浮いたボタン | 無印: 下から translateY(70px)→0／fab: 右下の角丸ボタンが pop |
| sheet | (無印), stack, drawer | 下から引き出すパネル | 無印: translateY(100%)→30%／stack: 後ろの画面が scale(.93) と暗く沈む／drawer: 左から translateX(-102%)→0 |
| dialog | (無印), alert | 中央のダイアログ | 背景が暗くなり、ダイアログが scale(.9)→1／alert: 決定ボタンが赤（破壊的操作） |
| popover | (無印), center, tooltip | ボタンから出る小窓 | 無印: transform-origin を押したボタン側（左上）にして scale(.6)→1／center: 中心から（悪い例）／tooltip: 小さな黒い吹き出し |
| nav | (無印)=bottom bar, top, rail, tabs | ナビ | 無印: 下のタブバーで選択中の丸い背景が移動／top: 上端／rail: 左の縦帯／tabs: 下線が移動 |
| chips | - | 絞り込みチップ | 2つ目のチップが選択状態に切り替わる |
| like | (無印), bookmark | いいね・ブックマーク | ハートが縮んでから scale(1.25) に弾け、点線の輪が広がる／bookmark: 上から落ちてバネで止まる |
| wipe | shutter, curtain, fill, thread | 画面を覆う遷移 | shutter: 4本の帯が上から順に閉じて開く／curtain: 左右から幕が閉じる／fill: 左下から円が広がって塗りつぶす／thread: 細い線が伸びてから上下に広がる |
| domino | (無印), chart, loader, clunk | 連鎖する動き | 無印: 板が0.1秒ずつ倒れる／chart: 棒グラフが下から伸びる／loader: 棒が順に脈打つ読み込み表示／clunk: 箱がガタンと段階的に落ちる |
| fold | (無印), book | 折りたたみ・ページめくり | 無印: 上を軸に rotateX(-80deg)／book: 左を軸に rotateY(-170deg) でめくる |
| cat | - | キャラクターが弾む | 猫の顔が着地で潰れて弾む |
| buttons | - | ボタンの種類（塗り・枠線・トーナル・テキスト） | 静止 |
| sizes | - | ボタンの大きさ（大・中・小） | 静止 |
| focus | - | キーボード操作のフォーカス表示 | 黒と黄色の二重の輪 |
| tap | - | 押せる範囲 44px | 静止（点線が押せる範囲） |
| input | - | 入力欄 | 枠がアクセント色になりカーソルが点滅 |
| error | - | 入力欄の下にエラー文 | 静止 |
| swatches | (無印), gray | 色の段階 | 静止 |
| shapes | - | 角丸の段階（0/6/12/円） | 静止 |
| elevation | - | 影の高さの段階 | 静止 |
| typescale | - | 文字サイズの段階 | 静止 |
| spacing | - | 8px の格子 | 静止 |
| layers | - | 重なり順（z-index の段階） | 静止 |
| safearea | - | スマホのノッチを避けた余白 | 静止 |
| windows | - | 画面幅の区分（小・中・大） | 静止 |
| balance | - | 見出しの折り返しの比較（左=未調整、右=text-wrap: balance） | 静止 |
| glass | - | すりガラスの半透明素材 | 背景の色の円が動き、上の帯が backdrop-filter: blur(12px) saturate(1.6) でぼかす |
| empty | - | 空の状態（説明＋操作1つ） | 静止 |
| switch | - | スイッチ | つまみが右へバネで動き色が変わる |
| slider | - | スライダー | つまみと塗りが左右に動く |
| progress | - | 進捗バー | 左から伸びる |
| check | - | チェックボックスとラジオ | 選択状態に切り替わる |
| segmented | - | 3択の切り替え | 選択中の白い背景が移動 |
| list | - | 一覧 | 静止 |
| card | - | カード | 静止 |
| menu | - | メニュー | ボタンの下に項目の箱が出る |
| search | - | 検索欄 | 静止 |
| badge | - | 件数のバッジ | 赤い数字が pop |
| avatar | - | 重なった丸いアイコン | 静止 |
| calendar | - | 日付の選択 | 選んだ日が脈打つ |
| carousel | - | 横にめくるカード列 | 横に移動 |
