// 項目のプレビュー描画。テンプレートは下の固定文字列だけを使い、データ（entries）由来の文字列は HTML に入れない。
const H = {
  b: '<div class="b"></div>', cd: '<div class="cd"></div>', dot: '<div class="track"><div class="dot"></div></div>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3.3 5 6.8 5c2 0 3.5 1.1 5.2 3 1.7-1.9 3.2-3 5.2-3 3.5 0 5.6 3.6 4.3 6.8C19.5 16.4 12 21 12 21z"/></svg>',
};
const TEMPLATES = {
  enter: H.b + H.cd,
  stagger: '<div class="col">' + '<div class="ln"></div>'.repeat(5) + "</div>",
  timing: '<div class="col">' + H.dot + H.dot + "</div>",
  ease: '<div class="col">' + H.dot + H.dot + "</div>",
  transform: H.b + H.cd,
  cross: '<div class="stack"><div class="s1"></div><div class="s2"></div></div>',
  morph: H.b,
  shared: H.cd,
  accordion: '<div class="col"><div class="hd"></div><div class="bd"></div><div class="hd"></div></div>',
  page: '<div class="frame"><div class="p1"><div class="ln"></div></div><div class="p2"></div></div>',
  scroll: '<div class="frame"><div class="bar"></div><div class="col">' + '<div class="ln"></div>'.repeat(4) + "</div></div>",
  parallax: '<div class="bg"></div>' + H.b,
  hover: '<div class="btn-d">ボタン</div><div class="cursor"></div>',
  hold: '<div class="btn-d"><span>長押しで削除</span></div>',
  drag: H.cd,
  reorder: '<div class="col"><div class="ln"></div><div class="ln"></div><div class="ln"></div></div>',
  shake: H.b,
  ripple: '<div class="btn-d">タップ</div>',
  marquee: '<div class="row">' + '<div class="chip"></div>'.repeat(16) + "</div>",
  loop: H.b,
  compare: '<div class="frame"><div class="a"></div><div class="z"></div></div>',
  draw: '<svg viewBox="0 0 160 80"><path d="M10 60 C 40 0, 70 0, 80 40 S 130 80, 150 20"/></svg>',
  text: '<div class="word">Hello 世界</div>',
  textmorph: '<div class="stack"><div class="word">保存する</div><div class="word">保存済み</div></div>',
  ticker: '<div class="digits">' + '<div class="digit"><span>1</span><span>4</span><span>7</span><span>2</span><span>9</span><span>3</span></div>'.repeat(3) + "</div>",
  skeleton: '<div class="col"><div class="ln"></div><div class="ln"></div><div class="ln"></div></div>',
  perf: '<div class="col">' + H.dot + H.dot + '</div><span class="lbl" style="top:40px">滑らか</span><span class="lbl" style="top:78px">カクつき</span>',
  principle: H.b,
  toast: '<div class="frame"><div class="tst"></div></div>',
  sheet: '<div class="frame"><div class="under"></div><div class="panel"></div></div>',
  dialog: '<div class="frame"><div class="bk"></div><div class="dlg"><div class="ln"></div><div class="ln"></div><div class="btn-d">OK</div></div></div>',
  popover: '<div class="wrap"><div class="btn-d">開く</div><div class="pop"></div></div>',
  nav: '<div class="frame"><div class="bar"><div class="ind"></div><i></i><i></i><i></i><i></i></div></div>',
  chips: '<div class="row"><div class="chip">すべて</div><div class="chip">未読</div><div class="chip">重要</div><div class="chip">あとで</div></div>',
  like: '<div class="heart">' + H.heart + '<div class="burst"></div></div>',
  wipe: '<div class="frame"><div></div><div></div><div></div><div></div></div>',
  domino: '<div class="row"><i></i><i></i><i></i><i></i><i></i></div>' + H.b,
  fold: H.cd,
  cat: '<div class="face"></div>',
  buttons: '<div class="row"><div class="btn-d">塗り</div><div class="btn-d o">枠線</div><div class="btn-d tn">トーナル</div><div class="btn-d tx">テキスト</div></div>',
  sizes: '<div class="row"><div class="btn-d lg">大</div><div class="btn-d">中</div><div class="btn-d sm">小</div></div>',
  focus: '<div class="btn-d focus">フォーカス中</div>',
  tap: '<div class="btn-d sm tap">押す</div>',
  input: '<div class="col" style="width:80%;align-items:center"><div class="input"></div></div>',
  error: '<div class="col" style="width:80%;align-items:center"><div class="input" style="border-color:#d93025;animation:none"></div><div class="err">メールアドレスの形式が正しくありません</div></div>',
  swatches: '<div class="row"><div class="sw"></div><div class="sw"></div><div class="sw"></div><div class="sw"></div><div class="sw"></div></div>',
  shapes: '<div class="row"><div class="shape"></div><div class="shape"></div><div class="shape"></div><div class="shape"></div></div>',
  elevation: '<div class="row" style="gap:18px"><div class="elev"></div><div class="elev"></div><div class="elev"></div></div>',
  typescale: '<div class="row" style="align-items:baseline"><span class="ty" style="font-size:30px">Aa</span><span class="ty" style="font-size:22px">Aa</span><span class="ty" style="font-size:16px">Aa</span><span class="ty" style="font-size:12px">Aa</span></div>',
  spacing: '<div class="grid8"><div class="b"></div></div>',
  layers: '<div class="layer" style="transform:translate(-30px,-16px)">1</div><div class="layer" style="transform:translate(0,0)">10</div><div class="layer" style="transform:translate(30px,16px)">100</div>',
  safearea: '<div class="phone"><div class="b"></div></div>',
  windows: '<div class="row" style="align-items:flex-end;gap:10px"><div class="win" style="width:40px">小</div><div class="win" style="width:70px">中</div><div class="win" style="width:110px">大</div></div>',
  balance: '<div class="row" style="gap:14px"><p class="para bad">見出しの折り返しが偏ると読みにくくなります</p><p class="para">見出しの折り返しが偏ると読みにくくなります</p></div>',
  glass: '<div class="blob" style="left:15%"></div><div class="blob"></div><div class="glass"></div>',
  empty: '<div class="col" style="align-items:center"><div class="empty-ic"></div><div class="ln" style="width:90px"></div><div class="btn-d sm">最初の1件を作る</div></div>',
  switch: '<div class="sw-d"><div class="knob"></div></div>',
  slider: '<div class="sl-d"><div class="fill"></div><div class="kw"><div class="knob"></div></div></div>',
  progress: '<div class="pg-d"><div class="fill"></div></div>',
  check: '<div class="row" style="gap:18px"><div class="ck-d"></div><div class="rd-d"></div></div>',
  segmented: '<div class="seg-d"><div class="ind"></div><span>日</span><span>週</span><span>月</span></div>',
  list: '<div class="frame"><div class="col" style="padding:10px;gap:8px">' + '<div class="li-d"><i></i><div class="ln"></div></div>'.repeat(4) + "</div></div>",
  card: '<div class="cd card-d"><div class="img"></div><div class="ln"></div></div>',
  menu: '<div class="wrap menu-d"><div class="btn-d">メニュー</div><div class="pop"><div class="ln"></div><div class="ln"></div><div class="ln"></div></div></div>',
  search: '<div class="sr-d"><i></i><div class="ln"></div></div>',
  badge: '<div class="bd-d"><div class="b"></div><span>3</span></div>',
  avatar: '<div class="row"><div class="av-d"></div><div class="av-d"></div><div class="av-d"></div></div>',
  calendar: '<div class="cal-d">' + "<i></i>".repeat(28) + "</div>",
  carousel: '<div class="frame car-d"><div class="row"><div class="cd"></div><div class="cd"></div><div class="cd"></div></div></div>',
};

const VARIANT_OK = /^[a-z0-9-]+$/;
const STATIC_IDS = new Set(["buttons", "sizes", "focus", "tap", "input", "error", "swatches", "shapes", "elevation",
  "typescale", "spacing", "layers", "safearea", "windows", "balance", "glass", "empty"]);
function renderPreview(entry) {
  const p = entry.preview || {};
  if (p.image) {
    const box = document.createElement("div");
    box.className = "demo-img";
    const img = document.createElement("img");
    img.loading = "lazy"; img.decoding = "async"; img.alt = ""; img.src = p.image;
    box.append(img);
    return box;
  }
  if (p.font) return renderFont(p);
  const box = document.createElement("div");
  const id = TEMPLATES[p.demo] ? p.demo : null;
  const cls = id === "textmorph" ? "d-text v-morph" : id ? "d-" + id + (STATIC_IDS.has(id) ? " d-static" : "") : "";
  box.className = "demo " + cls + (p.variant && VARIANT_OK.test(p.variant) ? " v-" + p.variant : "");
  box.setAttribute("aria-hidden", "true");
  box.innerHTML = id ? TEMPLATES[id] : "";  // 固定のテンプレートのみ（データは入れない）
  return box;
}

// フォントは見えたときに Google Fonts を読み込む（1書体1回）
const loadedFonts = new Set();
function renderFont(p) {
  const box = document.createElement("div");
  box.className = "demo font-demo";
  const big = document.createElement("div");
  big.className = "font-big";
  big.textContent = p.sample || "あ永 Aa 123";
  const small = document.createElement("div");
  small.className = "font-small";
  small.textContent = p.sample_long || "いろはにほへと The quick brown fox jumps 0123456789";
  for (const el of [big, small]) {
    el.style.fontFamily = `"${p.font.replace(/"/g, "")}", ${p.fallback === "serif" ? "serif" : p.fallback === "mono" ? "monospace" : "sans-serif"}`;
    if (p.weight) el.style.fontWeight = String(Number(p.weight) || 400);
  }
  box.append(big, small);
  box.dataset.font = p.google ? p.font : "";
  return box;
}
function ensureFont(name) {
  if (!name || loadedFonts.has(name)) return;
  loadedFonts.add(name);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=" + encodeURIComponent(name).replace(/%20/g, "+") + ":wght@400;700&display=swap";
  document.head.append(link);
}

// 見えている間だけ再生する（画面外のアニメを止めて軽くする）
const playObserver = new IntersectionObserver((items) => {
  for (const it of items) {
    it.target.classList.toggle("play", it.isIntersecting);
    if (it.isIntersecting && it.target.dataset.font) ensureFont(it.target.dataset.font);
  }
}, { rootMargin: "100px" });
function observePreview(el) { playObserver.observe(el); }
