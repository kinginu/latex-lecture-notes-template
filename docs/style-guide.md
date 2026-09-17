# Writing style guide

These rules apply to every chapter in `en/lessons/` and `ja/lessons/` of a
book made from this template.  What is specific to one book — what the
source material is, how to cite it, the textbook, the code language,
what must never be included — is in [`book.md`](book.md); the chapter list is
[`syllabus.json`](syllabus.json); the terminology is
[`../glossary.tsv`](../glossary.tsv).  How chapters are produced and checked
is in [`workflow.md`](workflow.md).

## 1. What a chapter is

- A **textbook-style summary of what the source unit covers**: one chapter
  per unit (a lecture lesson, a tutorial chapter, a documentation topic —
  see `book.md`), sections following the order of the source.
- **Scope = the source.**  Add background from the textbook or the reference
  documentation only where it is needed to make a statement precise or
  correct.  Do not add topics the source does not discuss.
- **Register**: impersonal, declarative, textbook prose.  Remove everything
  that belongs to the delivery format: analogies and metaphors used as
  teaching devices, jokes, "in this video", "as the speaker said", "let's",
  "you", rhetorical questions.  The textbook "we" ("we now compute …") is
  fine.  A named law, principle or design rule that the source introduces is
  content and stays, stated precisely.
- **No graded or restricted material.**  For a course: never reproduce quiz,
  exam, homework or project questions, their numbers or their answers
  (honor code); the concept a quiz tests may be explained with our own
  example.  `book.md` lists what else is excluded for a book.
- Length follows content, never padded (a 5-minute video is roughly a page
  or less).

## 2. Chapter skeleton

```latex
\documentclass[../main.tex]{subfiles}
\begin{document}

\chapter{<Unit title>}
\lessoninfo{
  video={<lecture reference>},        % recorded lectures (omit otherwise)
  sources={<primary material>},       % docs, tutorial, paper, talk (omit if none)
  textbook={<book §…>},               % e.g. H\&P \cite{hennessy2017} §3.3
  keywords={<6–14 comma-separated key terms>},
}

<2–4 sentence introduction: what the unit is about, why it matters, and
how it connects to the previous chapter.>

\section{…}
<first sentence of the section>\source{<source ref>; <textbook ref>.}
…
\begin{keypoint}[Lesson summary]   % ja: [章のまとめ]  (a book with the
  …                                 % class option "chapter": [Chapter summary])
\end{keypoint}

\end{document}
```

- Every `\section` carries one `\source{}` margin note near its first
  sentence: which part of the source it summarizes and where the textbook or
  reference documentation covers it (formats in `book.md`).  Cite a section
  number only when you are sure of it; otherwise cite the chapter
  ("H\&P ch.~3").
- Use `definition` for every concept the source defines, `example` for
  worked numeric/trace examples, `note` for remarks, `keypoint` for
  take-aways (sparingly: ≈1 per 2–3 sections plus the final summary).
- `description`/`itemize` for enumerations; tables (`booktabs`) for
  comparisons; TikZ figures for structures, timing diagrams, state machines,
  data flow.

## 3. Macros

| Macro | Use |
|---|---|
| `\term[sort]{word}[gloss]` | **first definition** of a term in the book. EN: gloss = Japanese term. JA: `sort` = hiragana reading (required when the word has kanji; katakana/Latin may omit), gloss = English term. |
| `\term*{word}` | a later emphasized mention (no index entry, no gloss) |
| `\index{key}` | extra index entry without emphasis, e.g. a concept re-used in a later chapter that should also point here; acronyms: `\index{BTB\|see{branch target buffer}}` (JA: `\index{BTB\|see{分岐先バッファ}}`) |
| `\source{}` | where the section's material comes from |
| `\tip{}` | practical rule of thumb, calculation shortcut |
| `\caution{}` | common misconception / pitfall |
| `\margin{}` | short supporting remark (≤ 3 lines) |
| `\sidenote{}` | numbered aside, for anything longer than ~3 lines or tied to one sentence |
| `marginfigure` / `margintable` | small figure or table in the margin (50 mm) |
| `widefigure` / `widetable` | float spanning body + margin; only when the body width (120 mm) really is too narrow |

- The optional first argument of `\term` is the **index sort key** and the last
  one is the **margin gloss**: `\term{Amdahl's law}[Amdahl の法則]` — never
  put `key@display` into the gloss.
- English index entries are lowercase except proper nouns and acronyms, so do
  not place a `\term` at the start of a sentence (it would be indexed
  capitalized); rephrase, e.g. "The power consumed … is called
  \term{dynamic power}".
- The glossary column `lesson` says which chapter **owns** a term (defines it
  with `\term`).  Other chapters mention it plainly or with `\term*`; a term
  defined in an earlier chapter is never re-`\term`ed — refer back
  ("Lesson 3" / "第3章") if helpful.
- Index keys follow `glossary.tsv` (canonical English form, lowercase except
  proper nouns and acronyms; canonical Japanese form and reading).  If a
  needed term is missing, choose the standard term and add the row (or report
  it so the glossary can be updated).
- Code identifiers (`mlir::Operation`, `pthread_create`) are set with
  `\texttt{}` (or `\lstinline`) and indexed with a plain `\index{}` if at all;
  they are not glossary terms.

### 3.1 What goes in the margin column

The margin is a quarter of the page: it must carry real content, not only
`\source` notes.  **Aim for 3–4 margin items per page** counting `\source`
and `\term` glosses — roughly 10–20 items in a 5-page chapter, 30–50 in a
long one — and **write them while writing the chapter**, not as a later
pass.  The body keeps the single line of argument; everything that supports
it goes to the margin.

| Put in the margin | Macro | Example |
|---|---|---|
| Where the material comes from | `\source` | one per section (required) |
| Term in the other language | `\term` | automatic |
| **Real-world numbers** | `\margin` | "L1: 32 KB, 4 cycles; L2: 256 KB, 12 cycles on Intel Skylake" |
| **Notation and assumptions** | `\margin` | what a symbol means, units, "a write takes one cycle here" |
| **Link to another chapter** | `\margin` | "same idea as the reservation stations of Lesson 7" |
| **Source vs textbook terminology** | `\caution` | a term the source uses with a different meaning than the textbook |
| **Common misconception, sign error** | `\caution` | "a speedup below 1 is a slowdown" |
| **Rule of thumb, shortcut, mnemonic** | `\tip` | "tag width = address − index − offset" |
| **Longer aside (> 3 lines)** | `\sidenote` | why a design exists, a named implementation, a short history |
| **Version or API caveat** | `\caution` / `\margin` | "renamed in LLVM 17", "deprecated since …" |
| Small illustration | `marginfigure` | state diagram, small plot |

- **Density limit**: at most ~3 margin items within a short run of text;
  the checker reports "margin notes moved down" — keep it at 0–2 per
  chapter.
- **Real-world numbers are welcome even when the source does not give
  them** — they are what makes the notes usable later.  Name where the
  number comes from in the same note or an adjacent `\source` (vendor
  manual, textbook figure, paper, official documentation), so that source
  content and added context stay distinguishable.  Verify every number;
  keep them few, current and uncontroversial; never invent one.
- Do not park body-level reasoning in the margin: if a reader needs it to
  follow the argument, it belongs in the body.

## 4. Labels, figures, bibliography

- Labels are unique across the whole book and carry the chapter number:
  `sec:l04-btb`, `fig:l04-btb`, `tab:l04-…`, `eq:l04-…`, `def:l04-…`,
  `ex:l04-…`, `lst:l04-…`.  EN and JA use the **same** labels.
- Plain `\label{…}` inside `example`/`note` is enough — `\cref` prints
  "Example"/"Note".
- Cross-references: `\cref{…}` (a list or range such as
  `\cref{sec:a,sec:b,sec:c}` is fine in both editions); to another chapter
  in prose: "Lesson 7" (EN) / "第7章" (JA), numbers from `syllabus.json`.
  Japanese chapters do not use `\Cref`.
- Figures shared by both editions: `figures/lNN-<name>.tex`, pure TikZ,
  language-dependent text via `\iflangja{日本語}{English}`, must fit the
  body width (120 mm) — or the margin (50 mm) in `marginfigure` (wrap in
  `\resizebox{\linewidth}{!}{…}` if needed).  Japanese labels are wider than
  English ones: size boxes for the Japanese text (§8).
- Bibliography: new entries go only into `bib/<NN-slug>.bib` of your chapter
  (listed in both `main.tex` by `tools/sync-main.py`), after checking with
  `grep -rn "{key," references.bib bib/` that the key does not exist.  Only
  cite works you are certain exist, with correct authors/venue/year; for
  online documentation use `@online` with `url` and `urldate`.

## 5. Code

- `lstlisting` with the language given in `book.md`; `numbers=none` for
  short snippets.  Languages that `listings` does not know (LLVM IR, MLIR,
  TableGen, …) are defined in `book-preamble.tex`, never in the class.
- Lines ≤ 60 characters (the body is 120 mm wide).
- `\end{lstlisting}` must start at column 0 (no indentation), even inside
  `example`: leading spaces before it add an empty last line to the listing.
- Code copied from a project must respect its license; prefer short,
  self-written snippets that show the idea.

## 6. Japanese edition

- Mirrors the English chapter **exactly**: same sections in the same order,
  same equations, figures, tables, labels, examples, margin notes, key
  points.  Translate, do not summarize or extend.
- である調．Punctuation `，` and `．` (full-width comma and period).  Keep
  established English acronyms and identifiers (CPI, TLB, RPC, SSA, IR).
  Use `glossary.tsv` for every technical term.
- `\term[よみ]{語}[English term]` — reading in hiragana, English gloss.
- `\lessoninfo` keywords separated by `，`; `video={Lesson 4，動画 1--48}`;
  key point summary title `[章のまとめ]`; other chapters as `第N章`.
- Numbers, units, math and code identical to the English edition.

## 7. Checking a chapter

```sh
tools/chapter-check.sh en 04-branches     # or ja
```

Required before a chapter is done: 0 errors, 0 undefined references
(references to other chapters are listed separately and are fine), 0
undefined citations, 0 multiply-defined labels, 0 missing glyphs, 0 overfull
boxes > 3 pt, at most 2 "margin notes moved down".  Then **read every
rendered page** `.png/<lang>-<slug>-NN.png`: a clean log does not mean a
correct page (a font-loading bug once printed `\underbrace` as black boxes
with no warning at all).

## 8. Page layout

Layout is judged on the rendered pages of the **whole book**
(`tools/book-check.sh`), because page breaks in a chapter-only build differ.
Fix layout only in the chapter sources; never edit `format/lnotes.cls` in a
book repository (see `workflow.md`, *Class changes*).

- **Margin notes below the text block.**  A note anchored on one of the last
  lines of a page runs past the bottom of the text block.  Re-anchor it
  earlier in the same passage (the sentence it refers to usually allows
  that); do not delete information to make it fit.  A one-line gloss that
  ends ~2 mm low is acceptable.
- **Pages holding only the summary box.**  `keypoint` boxes do not break
  across pages, and `\needspace` directly before one has no effect.  Keep the
  last paragraph, item or figure together with the summary instead
  (`\Needspace{<lines>\baselineskip}` before that paragraph, or move a
  float), or tighten the chapter's last page.
- **Headings at the bottom of a page.**  `\Needspace{5\baselineskip}` (capital
  N: it also works right after a paragraph) before the heading.  Use the
  smallest value that works; a large value leaves a visibly empty page end.
- **Floats.**  Prefer `[tb]` or `[htbp]`; a float that lands in the middle of
  a listing or splits an example is moved before the paragraph it
  illustrates.  Float pages are top-aligned by the class.
- **Listings.**  Do not let a short listing (< 6 lines) split across pages;
  `\Needspace` before it.  A listing that opens an `example` starts on its
  own line automatically.
- **Tables.**  Balance `p{}` column widths so short entries do not break
  mid-word; Japanese cells need more width than English ones.
  `widetable` spans body + margin, but try a narrower `\tabcolsep` first.
- **Japanese figures.**  Boxes sized for English labels overflow with
  Japanese ones: widen the box or break the label inside the `\iflangja`
  branch only — the English output must not change.
- **Figure text size.**  Nothing smaller than `\scriptsize` in a figure; if a
  figure only fits with `\tiny`, redesign it.
