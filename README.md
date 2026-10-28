# latex-lecture-notes-template

A LaTeX template for **bilingual (English / Japanese) lecture notes** with a
Tufte-style sidebar: the body text on the left, a narrow right-hand column
(separated by a thin vertical rule) for sidenotes, sources, tips and
small figures.  The whole toolchain lives in a Docker image so it can be
moved between machines without installing TeX.

[日本語の説明はこちら](#日本語)

## Features

- `lnotes.cls` — one class, `\documentclass[en]{lnotes}` or
  `[ja]`; fonts, hyphenation and all fixed strings switch with the option.
- Margin column macros: `\sidenote`, `\margin`, `\source`, `\tip`,
  `\caution`, `marginfigure`, `margintable`; wide floats with `widefigure`.
- `\term` registers a term in the index and shows its translation in the
  margin.  The index is built with `upmendex`, so Japanese entries sort in
  kana order.
- `definition` / `example` / `note` environments and a shaded `keypoint` box.
- `\lessoninfo{video=…, sources=…, textbook=…, keywords=…}` header block per
  chapter.
- Chapters are `subfiles`: a single chapter can be compiled on its own
  (fast edit loop in VS Code) or as part of the whole book.
- Pinned TeX Live 2025 Docker image, VS Code dev container, GitHub Actions
  that build both PDFs on every push, publish them to GitHub Pages and
  attach them to `v*` releases.
- A writing guide and a production process that produced two complete
  books (38 chapters): [`docs/style-guide.md`](docs/style-guide.md),
  [`docs/workflow.md`](docs/workflow.md), check and commit scripts in
  `tools/`, and Claude Code workflows in `.claude/workflows/`.

## Layout

```
.
├── format/                 shared class, index styles   (do not edit per course)
│   ├── lnotes.cls
│   ├── lnotes-en.ist
│   └── lnotes-ja.ist
├── en/  main.tex  lessons/NN-slug.tex     English edition
├── ja/  main.tex  lessons/NN-slug.tex     Japanese edition (same file names)
├── figures/                TikZ / images shared by both editions (lNN-name.tex)
├── bib/NN-slug.bib         per-chapter bibliography (optional)
├── references.bib          shared bibliography
├── glossary.tsv            terms: English key, Japanese term, reading, owning chapter
├── book-preamble.tex       this book's own preamble (listing languages, macros)
├── docs/
│   ├── style-guide.md      how to write a chapter           (generic)
│   ├── workflow.md         how a book is produced            (generic)
│   ├── book.md             this book: sources, citations, exclusions
│   └── syllabus.json       this book: chapter list
├── tools/                  chapter-check, book-check, layout-diff, sync-main, commit-*
├── .claude/workflows/      Claude Code workflows for the stages in workflow.md
├── CLAUDE.md               rules for Claude Code sessions in a book repo
├── .latexmkrc  Makefile  Dockerfile  compose.yml
├── .devcontainer/  .vscode/  .github/workflows/
└── README.md  LICENSE
```

Page geometry (A4): body 120 mm, gap 8 mm, margin column 50 mm
(~24 % of the page width).  The margin is always on the right (one-sided,
intended for on-screen reading).

## Quick start

```sh
# 1. Create a course repository from this template
gh repo create <name>-notes --template <owner>/latex-lecture-notes-template --private --clone
cd <name>-notes

# 2. Build the image once (~3 GB download), then build both editions
make docker-build
make docker-all          # -> en/build/main.pdf, ja/build/main.pdf
make docker-en           # one edition
make docker-dist         # -> dist/notes-en.pdf, dist/notes-ja.pdf
make docker-shell        # a shell inside the container
```

Inside the container (or on any machine with TeX Live 2025) the same targets
work without the `docker-` prefix: `make en`, `make ja`, `make all`, `make clean`.

### Print editions

The A4 PDF is the screen edition.  `print=<size>` (class option, set by
`make`) builds a compact two-sided edition of the same sources: the margin
column moves to the outer side and everything is the A4 design scaled by
`scale` (body font 10 pt × scale; `scale=` overrides it).  Figures and
tables are drawn at the A4 sizes, scaled, and shrunk to the measure only if
still too wide (logged as `lnotes-fit:`).  Chapters need no changes.

| `print=` | trim (mm) | body + margin column (mm) | scale | body font |
|---|---|---|---|---|
| `a5` | 148 × 210 | 86 + 35 | 0.7 | 7 pt |
| `b5` | 182 × 257 | 106 + 43.5 | 0.85 | 8.5 pt |
| `b6` | 128 × 182 | 73 + 32 | 0.65 | 6.5 pt |
| `shinsho` (新書判) | 113 × 176 | 63 + 27 | 0.65 | 6.5 pt |

```sh
make docker-en-a5        # -> en/build/main-a5.pdf   (also ja-a5, en-b6, ...)
make docker-print-b6     # both languages -> dist/notes-<lang>-b6.pdf
make docker-print        # every size (a5 b6 shinsho b5)
tools/book-check.sh en --print a5
```

Legibility: below `scale=0.6` the text is not readable, and figure labels
already fall to about 4.5 pt at 0.65.  CI builds A4, A5, B6 and 新書判 and
lists the print samples, per size, on the Pages index; B5 is `make` only.

### VS Code

Open the folder and choose **Reopen in Container**; LaTeX Workshop is
installed and configured (`.vscode/settings.json`) to run `latexmk` with the
repo's `.latexmkrc`.

- Open `en/main.tex` and build → whole English book.
- Open `en/lessons/03-foo.tex` and build → **that chapter only**
  (`latex-workshop.latex.rootFile.useSubFile` is on).  Cross references to
  other chapters show as `??` in a chapter-only build; that is expected.

### Starting a book

Follow [`docs/workflow.md`](docs/workflow.md) §1: fill in `docs/book.md`
and `docs/syllabus.json`, set the title block, run `tools/sync-main.py`,
write `glossary.tsv`, replace this README.  Items that are easy to miss:

- the book's README states the **content licence** separately: `format/`
  and the build files are MIT (from the template), the notes themselves
  need their own line, e.g. "© <holder>, CC BY-NC-SA 4.0";
- the copyright holder in `LICENSE`;
- the subtitle of the GitHub Pages index (repository variable
  `PAGES_SUBTITLE`, read by `.github/scripts/pdf-index.sh`; default
  "Lecture notes — English / 日本語");
- GitHub Pages is not switched on by the template: enable it by hand on
  the `pdf` branch (see *CI* below).

### Writing a chapter

1. Add the chapter to `docs/syllabus.json` and run `tools/sync-main.py`
   (both `main.tex` files include it once the file exists).
2. Copy `en/lessons/02-lesson-skeleton.tex` to `en/lessons/NN-slug.tex` and
   the same under `ja/`.
3. Write it following [`docs/style-guide.md`](docs/style-guide.md).  Keep
   figures in `figures/lNN-name.tex` and switch labels with
   `\iflangja{日本語}{English}`.
4. `tools/chapter-check.sh en NN-slug` (and `ja`): builds the chapter in the
   container, reports errors, undefined references, missing glyphs,
   overfull boxes and crowded margins, and renders the pages to
   `.png/` — read them.
5. `tools/commit-lesson.sh NN-slug` commits both editions and pushes.

### Tools

| Script | Purpose |
|---|---|
| `tools/chapter-check.sh <en\|ja> <slug>` | build and check one chapter, render its pages |
| `tools/book-check.sh <en\|ja>` | build and check a whole edition, render every page (one book build at a time per machine) |
| `tools/layout-diff.sh <en\|ja>` | page-by-page text diff of the current build against the published PDF |
| `tools/sync-main.py [--check]` | chapter and bibliography lists of both `main.tex` from the syllabus |
| `tools/commit-lesson.sh <slug>` | commit and push one finished chapter |
| `tools/commit-pass.sh "<subject>" …` | commit and push a cross-chapter pass (`COMMIT_SCOPE=en\|ja`) |
| `tools/glossary-check.py [--lang en\|ja\|both] [--lesson NN]` | `\term` use against `glossary.tsv`: ownership, missing terms, glosses, readings |
| `tools/parity-check.py [--lesson NN] [--lint]` | EN/JA structure and margin anchors per chapter; `--lint` flags "the lecture", "you", 講義では … in the body |

Memory limits (`CHAPTER_MEM`, `BOOK_MEM`), the image name (`LNOTES_IMAGE`)
and commit trailers (`.git/commit-trailers`) are described in
`tools/lib.sh` and `docs/workflow.md`.

### Claude Code

`CLAUDE.md` and `.claude/workflows/` make a book repository ready for
Claude Code: `notes-glossary`, `notes-chapters` (write → two independent
reviews → fix → translate → check → commit, per chapter),
`notes-margins`, `notes-integration`, `notes-visual-qa` and
`notes-proofread` (reviewers report findings for a proofreading pass).  See
[`docs/workflow.md`](docs/workflow.md) §8.

## Macro reference

| Macro / environment | Purpose |
|---|---|
| `\sidenote{…}` | numbered margin note (numbers restart each chapter) |
| `\margin{…}` | unnumbered margin note |
| `\source{…}` | labelled *Source / 出典* note, e.g. `\source{H\&P §3.2}` or `\cite` |
| `\tip{…}` / `\caution{…}` | labelled *Tip / ヒント*, *Caution / 注意* notes |
| `\term[sortkey]{word}[gloss]` | emphasize `word`, index it (sorted by `sortkey` if given), print `gloss` in the margin |
| `\term*{word}` | same without an index entry (repeat mentions) |
| `\index{よみ@語}` | plain index entry with a reading |
| `definition`, `example`, `note` | numbered per chapter, shared counter, `\cref`-able |
| `keypoint` (`[subtitle]`) | shaded take-away box |
| `\lessoninfo{video=…, sources=…, textbook=…, keywords=…}` | info block after `\chapter` (empty keys are omitted) |
| `marginfigure`, `margintable` | float in the margin column |
| `widefigure`, `widetable` | float spanning body + margin (`\fullwidth`) |
| `\iflangja{ja}{en}`, `\ja{…}`, `\en{…}` | language switches for shared files |
| `\definitionname`, `\keypointname`, `\sourcename`, … | localized strings; `\renewcommand` to change |

Class options: `en` (default) / `ja`; `lesson` (default, "Lesson 3") /
`chapter` ("Chapter 3"; the Japanese edition always prints 第3章);
`norule` (no vertical rule); `print=a4|a5|b5|b6|shinsho` and `scale=<factor>`
(see *Print editions*); `fontsize=` (default 10pt, or 10pt × scale);
anything else is passed to KOMA-Script `scrbook`.

### Index readings (Japanese)

`upmendex` sorts by the string before `@`.  Katakana words need no reading;
words containing kanji do:

```latex
\term[きゃっしゅ]{キャッシュ}[cache]        % reading optional for katakana
\term[ぶんきよそく]{分岐予測}[branch prediction]
```

## Customizing

- Fonts: `format/lnotes.cls`, *fonts* section (Libertinus + Harano Aji;
  both ship with TeX Live).
- Column widths / rule: *geometry* and *vertical rule* sections.
- Chapter label (`Lesson 3` / `第3章`): class option `chapter` for
  "Chapter 3"; for anything else ("Module", "Week") renew `\chaptername`
  inside `\AtBeginDocument` in `main.tex`.
- Colors: `ln-accent`, `ln-rule`, `ln-muted`, `ln-tip`, `ln-caution`,
  `ln-source`, `ln-box`.

## CI

`.github/workflows/build.yml` builds `dist/notes-en.pdf` and
`dist/notes-ja.pdf` in the same TeX Live image on every push / PR, and in
parallel the A5, B6 and 新書判 print samples (`dist/notes-<lang>-<size>.pdf`;
a failed print size does not block the A4 editions); they are uploaded as
workflow artifacts `pdf-<size>`.  On every push to `main` the PDFs are
also force-pushed to the orphan branch `pdf`, so the latest build can be
read in the browser at `https://github.com/<owner>/<repo>/blob/pdf/notes-en.pdf`
(and `notes-ja.pdf`) without downloading anything.  For a public repository,
enable GitHub Pages on the `pdf` branch (Settings → Pages → Deploy from a
branch: `pdf`, `/`) and the notes are served with an index page at
`https://<owner>.github.io/<repo>/` (its subtitle is the repository
variable `PAGES_SUBTITLE`, if set).  Pushing a tag `v*` attaches the PDFs
to a GitHub release.  A newer push cancels a build still running for the
same branch.

## License

MIT for the template (`format/`, build files).  Notes written with it are
yours; choose a license for the content in your course repository.

---

## 日本語

英語・日本語の二言語で講義ノートを書くための LaTeX テンプレートです。
本文の右に細い縦罫線で区切った余白列（Tufte スタイルのサイドノート）を持ち、
補足・出典・ヒント・小さな図をそこに置きます。TeX 環境は Docker イメージに
閉じ込めてあるので、マシンを変えてもそのまま使えます。

### 使い方の要点

- `\documentclass[en]{lnotes}` / `[ja]` で言語を切り替え。フォント・
  見出し語（定義／Definition など）は自動で切り替わります。
- `en/` と `ja/` は同じファイル名で対応させ、`figures/` と
  `references.bib` は共有します。共有ファイル内の言語分岐は
  `\iflangja{日本語}{English}`。
- 章ごとのビルド: VS Code で `lessons/NN-slug.tex` を開いてビルドすると
  その章だけがコンパイルされます（他章への参照は `??` になります）。
- 索引: `\term[よみ]{語}[対訳]` で本文強調・索引登録・余白への対訳表示を
  一度に行います。漢字を含む語には読みを付けてください（カタカナ語は省略可）。
- ビルド: `make docker-build`（初回のみ）→ `make docker-all`。
  PDF は `en/build/main.pdf`, `ja/build/main.pdf` に出力されます。
- 書き方は [`docs/style-guide.md`](docs/style-guide.md)、本ごとの設定
  （資料・出典の書式・除外する内容）は [`docs/book.md`](docs/book.md)、
  制作手順（執筆 → 2 系統のレビュー → 修正 → 翻訳 → 確認 → push、
  完成後の用語統一・相互参照・全ページ目視 QA）は
  [`docs/workflow.md`](docs/workflow.md) にまとめてあります。
- `tools/glossary-check.py` で `\term` と `glossary.tsv` の照合、
  `tools/parity-check.py` で英日両版の構造と余白項目の位置の比較が
  できます（校正パスの最初の機械的な確認、`docs/workflow.md` §4）。
- `tools/chapter-check.sh <en|ja> <slug>` で章単位のビルド・検査・
  ページ画像化、`tools/book-check.sh <en|ja>` で本全体（同時に 1 冊だけ）、
  `tools/layout-diff.sh <en|ja>` で公開中の PDF とのページ単位の差分を
  確認できます。
- 印刷用の小型版（両面・余白列は小口側）: `make docker-print-a5`
  （`a5`, `b6`, `shinsho` = 新書判, `b5`）。A4 の版面を縮小するだけで、
  章ファイルの変更は不要です（*Print editions* 参照）。
- Claude Code 用に `CLAUDE.md` とワークフロー（`.claude/workflows/`）を
  同梱しています。
- 講義以外の資料（ドキュメント、チュートリアル）を扱う本では
  `\lessoninfo` の `sources=` と、「Chapter 3」表記にするクラス
  オプション `chapter` を使います。

### 新しい講義でのリポジトリ作成

GitHub の **Use this template** から新しいリポジトリを作成してください
（`gh repo create <name> --template <owner>/latex-lecture-notes-template`）。
その後の準備（`docs/book.md`・`docs/syllabus.json`・`glossary.tsv` の
記入、`tools/sync-main.py`、サンプル章の削除、README の差し替え、
GitHub Pages の有効化）は [`docs/workflow.md`](docs/workflow.md) §1 の
とおりです。`format/` は全ての本で共通なので、本のリポジトリでは編集せず、
変更はテンプレートで行ってから各リポジトリへコピーします（同 §5）。
