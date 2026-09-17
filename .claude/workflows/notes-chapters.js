export const meta = {
  name: 'notes-chapters',
  description: 'Write, adversarially review, fix, translate (en→ja), check and push chapters of a latex-lecture-notes book',
  whenToUse: 'In a book repository made from latex-lecture-notes-template, once docs/book.md, docs/syllabus.json and glossary.tsv are filled in. args: {chapters: [4, 5, {number: 6, start: "write-ja"}], maxParallel?: 6, repo?: "/abs/path"}; start = write-en (default) | review | fix-en | write-ja | check-ja',
  phases: [
    { title: 'Write EN', detail: 'reconstruct the source outline, write the chapter, build, read the pages' },
    { title: 'Review EN', detail: 'technical reviewer + coverage/conventions reviewer, in parallel' },
    { title: 'Fix EN', detail: 'verify each finding, apply the real ones, rebuild' },
    { title: 'Write JA', detail: 'mirror translation, build, read the pages' },
    { title: 'Check JA + commit', detail: 'adversarial mirror check, fix, rebuild both editions, commit and push' },
  ],
}

const STAGES = ['write-en', 'review', 'fix-en', 'write-ja', 'check-ja']
const pad = n => String(n).padStart(2, '0')
const chapters = (args && args.chapters || []).map(c => typeof c === 'number' ? { number: c } : c)
if (!chapters.length) throw new Error('args.chapters is empty')
for (const c of chapters) {
  if (!Number.isInteger(c.number)) throw new Error('chapter without a number: ' + JSON.stringify(c))
  if (c.start && !STAGES.includes(c.start)) throw new Error('unknown start stage ' + c.start)
}

// At most maxParallel chapters in flight (each runs one or two agents).
const maxParallel = (args && args.maxParallel) || 6
let running = 0
const waiting = []
const acquire = () => running < maxParallel ? (running++, Promise.resolve()) : new Promise(r => waiting.push(r))
const release = () => { const next = waiting.shift(); if (next) next(); else running-- }

const ISSUES = {
  type: 'object',
  properties: {
    issues: { type: 'array', items: { type: 'object', properties: {
      severity: { type: 'string', enum: ['critical', 'major', 'minor'] },
      location: { type: 'string' }, problem: { type: 'string' }, fix: { type: 'string' },
    }, required: ['severity', 'location', 'problem', 'fix'] } },
    verdict: { type: 'string' },
  },
  required: ['issues', 'verdict'],
}
const WRITE = {
  type: 'object',
  properties: {
    slug: { type: 'string' },
    sections: { type: 'array', items: { type: 'object', properties: {
      title: { type: 'string' }, covers: { type: 'string' },
    }, required: ['title', 'covers'] } },
    figures: { type: 'array', items: { type: 'string' } },
    bibKeysAdded: { type: 'array', items: { type: 'string' } },
    termsDefined: { type: 'array', items: { type: 'string' } },
    termsNotInGlossary: { type: 'array', items: { type: 'string' } },
    marginItems: { type: 'integer' },
    uncertain: { type: 'array', items: { type: 'string' } },
    pages: { type: 'integer' },
    checkClean: { type: 'boolean' },
    remainingProblems: { type: 'array', items: { type: 'string' } },
  },
  required: ['slug', 'sections', 'figures', 'bibKeysAdded', 'termsDefined', 'termsNotInGlossary', 'marginItems', 'uncertain', 'pages', 'checkClean', 'remainingProblems'],
}
const FIX = {
  type: 'object',
  properties: {
    applied: { type: 'array', items: { type: 'string' } },
    rejected: { type: 'array', items: { type: 'object', properties: { issue: { type: 'string' }, reason: { type: 'string' } }, required: ['issue', 'reason'] } },
    checkClean: { type: 'boolean' },
    pages: { type: 'integer' },
    remainingProblems: { type: 'array', items: { type: 'string' } },
  },
  required: ['applied', 'rejected', 'checkClean', 'pages', 'remainingProblems'],
}
const TRANSLATE = {
  type: 'object',
  properties: {
    termsNotInGlossary: { type: 'array', items: { type: 'object', properties: { en: { type: 'string' }, ja: { type: 'string' }, reading: { type: 'string' } }, required: ['en', 'ja', 'reading'] } },
    figuresEdited: { type: 'array', items: { type: 'string' } },
    pages: { type: 'integer' },
    checkClean: { type: 'boolean' },
    remainingProblems: { type: 'array', items: { type: 'string' } },
  },
  required: ['termsNotInGlossary', 'figuresEdited', 'pages', 'checkClean', 'remainingProblems'],
}
const CHECK = {
  type: 'object',
  properties: {
    issues: { type: 'array', items: { type: 'object', properties: {
      severity: { type: 'string', enum: ['critical', 'major', 'minor'] }, location: { type: 'string' }, problem: { type: 'string' },
    }, required: ['severity', 'location', 'problem'] } },
    changes: { type: 'array', items: { type: 'string' } },
    enChanged: { type: 'boolean' },
    enClean: { type: 'boolean' }, jaClean: { type: 'boolean' },
    enPages: { type: 'integer' }, jaPages: { type: 'integer' },
    commitOutput: { type: 'string' },
    remainingProblems: { type: 'array', items: { type: 'string' } },
  },
  required: ['issues', 'changes', 'enChanged', 'enClean', 'jaClean', 'enPages', 'jaPages', 'commitOutput', 'remainingProblems'],
}

const repo = args && args.repo
  ? `Repository: ${args.repo} — work only inside it and run every command from its root.`
  : 'Repository: the current working directory, a book made from latex-lecture-notes-template — work only inside it and run every command from its root.'

function common(c) {
  const p = pad(c.number)
  return `${repo}
Read first, completely: docs/book.md (this book: source material, citation formats, textbook, code language, what is excluded), docs/style-guide.md (rules — follow them exactly), and the entry with "number": ${c.number} in docs/syllabus.json (slug, title, source units in order).
Glossary: glossary.tsv (term ownership in column "lesson", canonical English index keys, Japanese terms and readings).
Reference chapters: the ones docs/book.md names under "Reference chapters" (approved style, density and macro use), both editions.
This chapter: number ${c.number}, file <lang>/lessons/<slug>.tex with the slug from the syllabus. Label prefix l${p} (e.g. fig:l${p}-name). Figures: figures/l${p}-<name>.tex. New bibliography entries only in bib/<slug>.bib; after creating that file run tools/sync-main.py.
Checker: tools/chapter-check.sh <en|ja> <slug>  (1–4 min; use a Bash timeout of 900000). It builds the chapter alone, prints a problem summary and renders the pages to .png/<lang>-<slug>-NN.png.
Git: never commit or push by hand; only the final stage runs tools/commit-lesson.sh.`
}

function writeEnPrompt(c) {
  return `You are writing one chapter of bilingual (English/Japanese) notes in LaTeX. This stage produces the ENGLISH chapter only.

${common(c)}

1. Read the files above, the glossary rows of this chapter and of earlier chapters (terms owned elsewhere must not be re-defined), and — if they exist — the neighbouring chapters in en/lessons/ so the introduction connects.
2. Reconstruct the source unit: write for yourself an outline that maps each unit listed in the syllabus (in order) to the concepts, definitions, formulas, diagrams, code and reasoning it presents. When the source is documentation or a tutorial, read it (WebFetch) at the version docs/book.md pins. Quiz or exercise items tell you which concept was practised: explain that concept, never reproduce the item, its numbers or its answer. Record every point you are unsure of under "uncertain".
3. Write en/lessons/<slug>.tex following the style guide: \\lessoninfo, introduction, sections in source order each with a \\source note, definitions/examples/notes/keypoints, \\term for every concept this chapter owns in the glossary (gloss = the glossary's Japanese term), TikZ figures wherever structure, state, timing or data flow is explained, tables for traces, our own numbers in worked examples, and the margin items of style guide §3.1 (aim for 3–4 per page — real-world numbers with their source, cautions, tips, links to other chapters, sidenotes for longer asides), and a final keypoint summary.
4. Run the checker for en and fix everything it reports. Then Read EVERY rendered page and fix what looks wrong (overflow into the margin column, crowded margin notes, figures far from their text, unreadable figure text). Re-run the checker after changes.
5. Return: the slug, section titles with what each covers, figure files, bib keys added, terms defined with \\term, terms missing from the glossary, number of margin items, uncertain points, page count, checker status, anything unresolved.`
}

function reviewTechPrompt(c, w) {
  return `You are an adversarial TECHNICAL reviewer of one chapter of bilingual notes. Do NOT edit any file.

${common(c)}

Target: en/lessons/<slug>.tex, the figures it inputs (figures/l${pad(c.number)}-*.tex) and bib/<slug>.bib. Rendered pages: .png/en-<slug>-NN.png (run the checker for en first if they are missing).
The writer's uncertain points: ${JSON.stringify(w ? w.uncertain : [])}

Assume the chapter contains errors and find them. Check:
- every definition, claim, formula, algorithm or protocol step, invariant and code snippet against the field (docs/book.md), the textbook, the source material and — for software — the documentation of the pinned version (WebFetch it; APIs change);
- every worked example: recompute every number, check units and magnitudes, re-trace every step of every table or trace;
- every code listing: would it compile/run as shown at the pinned version; is the output shown correct;
- figures: read the TikZ source and the rendered pages; the picture must match the text and be technically right;
- margin notes with real-world numbers: is the number right, current and attributed;
- cited textbook sections: flag a section/chapter number you believe is wrong;
- bibliography: every entry in bib/<slug>.bib is a real work with correct authors, title, venue, year (WebSearch anything you are not certain of);
- the writer's uncertain points: decide each one.
Report only real problems (no style preferences), each with exact location (quote the text), what is wrong, the correct fact or recomputation, and the precise fix. Severity: critical = wrong content a reader would learn; major = misleading or incomplete explanation, wrong example; minor = small inaccuracy. Verdict: one sentence.`
}

function reviewScopePrompt(c, w) {
  return `You are a reviewer of one chapter of bilingual notes for COVERAGE, FIDELITY TO THE SOURCE and CONVENTIONS. Do NOT edit any file.

${common(c)}

Target: en/lessons/<slug>.tex (+ figures/l${pad(c.number)}-*.tex). Rendered pages: .png/en-<slug>-NN.png (run the checker for en first if they are missing).
The writer's section map: ${JSON.stringify(w ? w.sections : [])}

Check and report:
1. Coverage: go through every source unit of this chapter (syllabus) in order and decide whether its content is in the chapter with enough precision to be learned from the notes alone. A missing main concept = major.
2. Scope: material well beyond what the source covers (padding, textbook-only topics) — minor, major if large.
3. Register: remaining delivery-format language (teaching analogies, jokes, "in this video", "let's", "you", rhetorical questions, speaker mentions).
4. Excluded material (docs/book.md "Excluded"; for a course, anything that looks like a reproduced quiz, exam, homework or project item) — major.
5. Conventions: \\lessoninfo complete; one \\source per section; \\term only for terms this chapter owns in glossary.tsv, with the glossary's Japanese term as gloss and never key@display in the gloss; no sentence-initial \\term; terms owned by other chapters not re-\\term'ed; labels prefixed l${pad(c.number)}; figures named figures/l${pad(c.number)}-*; final keypoint summary; chapter numbers in cross-references match the syllabus; code lines ≤ 60 characters; \\end{lstlisting} at column 0.
6. Margin column (style guide §3.1): count margin items per page; fewer than about 3 per page, or kinds that are missing entirely (real-world numbers, cautions, tips, cross-chapter links, sidenotes for long asides), is a minor issue — suggest concrete items.
7. Layout on the rendered pages: overflow into the margin column, crowded margins, figures far from their text, unreadably small figure text.
Each issue: severity (critical/major/minor), exact location (quote), problem, precise fix. Verdict: one sentence.`
}

function fixEnPrompt(c, issues) {
  return `Apply review findings to one chapter of bilingual notes.

${common(c)}

File: en/lessons/<slug>.tex (+ figures/l${pad(c.number)}-*.tex, bib/<slug>.bib).
Findings from independent reviewers:
${issues.length ? JSON.stringify(issues, null, 1) : '(none were passed in: run both reviews yourself first — technical accuracy with recomputed examples, and coverage/conventions per the style guide — then continue)'}

For each finding: first verify it yourself — reviewers can be wrong; recompute numbers and re-derive facts, and keep what the source teaches when a reviewer only prefers a different convention. If real, fix it (improve on the suggested fix if needed); every real critical and major finding must be fixed. If not real, reject it with a one-line reason.
Then run the checker for en, make it clean, and Read every rendered page. Return applied fixes, rejected findings with reasons, checker status, page count, and anything unresolved.`
}

function translatePrompt(c) {
  return `Translate one finished chapter of bilingual notes from English into Japanese.

${common(c)}

Source: en/lessons/<slug>.tex (final, reviewed). Target: ja/lessons/<slug>.tex (if it exists from an earlier attempt, bring it in line with the current English file instead of starting over).
Follow style guide §6 exactly and imitate the Japanese reference chapters.
- Mirror everything: same sections in the same order, identical math, same figures and \\input lines, same tables (translated text), same labels, same definitions/examples/notes/keypoints, same margin items (\\source \\tip \\caution \\margin \\sidenote), same code listings (translate comments only if they are prose).
- glossary.tsv for every technical term. \\term[よみ]{語}[English term] for exactly the terms the English chapter \\term's (reading = glossary reading, hiragana; may be omitted only for pure katakana/Latin words); \\term* where the English uses \\term*.
- である調; full-width ，and ．; \\lessoninfo in Japanese form, keywords separated by ，; summary title [章のまとめ]; other chapters as 第N章.
- Shared figures: where a figure shows prose without an \\iflangja{日本語}{English} alternative, add the Japanese branch without changing the English output; size boxes for the Japanese labels.
Run the checker for ja, fix until clean, Read every rendered page and fix layout problems. Return terms missing from the glossary (en, ja, reading), figure files you edited, page count, checker status, anything unresolved.`
}

function checkJaPrompt(c) {
  return `You are the final checker of the Japanese edition of one chapter: review it against the English chapter, fix what is wrong, then commit and push the finished chapter.

${common(c)}

English (authoritative, already reviewed): en/lessons/<slug>.tex. Japanese: ja/lessons/<slug>.tex. Shared figures: figures/l${pad(c.number)}-*.tex.

1. Review adversarially — assume problems exist:
   a. Mirror fidelity: enumerate every section, equation, figure, table, listing, definition, example, note, keypoint, margin item, \\term and \\label of the English file and confirm the Japanese counterpart exists with the same meaning, the same numbers and identical math. The Japanese file must reflect the CURRENT English file.
   b. Japanese quality: natural technical Japanese (である調), no translationese, terminology per glossary.tsv, full-width ，．.
   c. Index: \\term[reading]{語}[English term] with the glossary reading whenever the word contains kanji; never key@display in the gloss.
   d. Figures: Japanese labels wherever a figure shows prose, fitting their boxes (edit only inside \\iflangja branches; never change the English output).
   e. Code: \\end{lstlisting} at column 0 in both editions.
2. Fix every real problem in the Japanese file. If the English chapter itself is wrong, fix it too and keep both editions in sync.
3. Run the checker for ja — and for en too if you changed the English chapter or a figure. Make it clean and Read every rendered page.
4. Add any glossary rows the chapter needed (en, ja, reading, lesson, note). Then commit and push: tools/commit-lesson.sh <slug> from the repository root. If it fails, report its output; never force-push, reset or rewrite history, and do not commit by hand.
Return: problems found (severity, location, problem), changes made, whether the English chapter changed, checker status and page count for each edition, the commit script's output, anything unresolved.`
}

const sev = issues => issues.reduce((a, i) => (a[i.severity]++, a), { critical: 0, major: 0, minor: 0 })

async function runChapter(c) {
  const tag = `ch${pad(c.number)}`
  const from = STAGES.indexOf(c.start || 'write-en')
  await acquire()
  try {
    let w = null, fix = null, ja = null
    const issues = []
    if (from <= 0) {
      w = await agent(writeEnPrompt(c), { label: `write-en:${tag}`, phase: 'Write EN', schema: WRITE })
      if (!w) throw new Error('write-en failed for ' + tag)
    }
    if (from <= 1) {
      const reviews = await parallel([
        () => agent(reviewTechPrompt(c, w), { label: `review-tech:${tag}`, phase: 'Review EN', schema: ISSUES }),
        () => agent(reviewScopePrompt(c, w), { label: `review-scope:${tag}`, phase: 'Review EN', schema: ISSUES }),
      ])
      if (reviews.some(r => !r)) throw new Error('review failed for ' + tag)
      reviews.forEach(r => issues.push(...r.issues))
    }
    if (from <= 2 && (from === 2 || issues.length)) {
      fix = await agent(fixEnPrompt(c, issues), { label: `fix-en:${tag}`, phase: 'Fix EN', schema: FIX })
      if (!fix) throw new Error('fix-en failed for ' + tag)
    }
    if (from <= 3) {
      ja = await agent(translatePrompt(c), { label: `write-ja:${tag}`, phase: 'Write JA', schema: TRANSLATE })
      if (!ja) throw new Error('write-ja failed for ' + tag)
    }
    const check = await agent(checkJaPrompt(c), { label: `check-ja:${tag}`, phase: 'Check JA + commit', schema: CHECK })
    if (!check) throw new Error('check-ja failed for ' + tag)
    log(`${tag} done: en ${check.enPages}p, ja ${check.jaPages}p — ${String(check.commitOutput).slice(0, 80)}`)
    return {
      chapter: c.number, slug: w ? w.slug : undefined, start: c.start || 'write-en',
      marginItems: w ? w.marginItems : undefined,
      reviewIssues: sev(issues),
      fix: fix ? { applied: fix.applied.length, rejected: fix.rejected } : null,
      jaCheckIssues: sev(check.issues), enChangedInJaCheck: check.enChanged,
      enClean: check.enClean, jaClean: check.jaClean, enPages: check.enPages, jaPages: check.jaPages,
      commit: check.commitOutput,
      termsNotInGlossary: { en: w ? w.termsNotInGlossary : [], ja: ja ? ja.termsNotInGlossary : [] },
      unresolved: [...(w ? w.remainingProblems : []), ...(fix ? fix.remainingProblems : []), ...(ja ? ja.remainingProblems : []), ...check.remainingProblems],
    }
  } finally {
    release()
  }
}

const results = await pipeline(chapters, runChapter)
const failed = chapters.filter((c, i) => !results[i]).map(c => c.number)
if (failed.length) log(`not finished: chapters ${failed.join(', ')} — check their files and rerun them with a matching start stage`)
return { results: results.filter(Boolean), failed }
