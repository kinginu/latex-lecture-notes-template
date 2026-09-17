export const meta = {
  name: 'notes-margins',
  description: 'Enrich the margin column of finished chapters (both editions) per style guide §3.1, then commit and push each chapter',
  whenToUse: 'In a latex-lecture-notes book whose finished chapters have too few margin items. args: {chapters: [numbers], maxParallel?: 6, repo?: "/abs/path"}',
  phases: [{ title: 'Enrich margins', detail: 'audit density, add margin items to EN, mirror in JA, rebuild, commit' }],
}

const pad = n => String(n).padStart(2, '0')
const chapters = (args && args.chapters) || []
if (!chapters.length) throw new Error('args.chapters is empty')
const repo = args && args.repo
  ? `Repository: ${args.repo} — work only inside it and run every command from its root.`
  : 'Repository: the current working directory, a book made from latex-lecture-notes-template — work only inside it and run every command from its root.'

const maxParallel = (args && args.maxParallel) || 6
let running = 0
const waiting = []
const acquire = () => running < maxParallel ? (running++, Promise.resolve()) : new Promise(r => waiting.push(r))
const release = () => { const next = waiting.shift(); if (next) next(); else running-- }

const RESULT = {
  type: 'object',
  properties: {
    added: { type: 'object', properties: {
      margin: { type: 'integer' }, tip: { type: 'integer' }, caution: { type: 'integer' },
      sidenote: { type: 'integer' }, marginfigure: { type: 'integer' },
    }, required: ['margin', 'tip', 'caution', 'sidenote', 'marginfigure'] },
    examplesOfAdded: { type: 'array', items: { type: 'string' } },
    densityBefore: { type: 'number' }, densityAfter: { type: 'number' },
    enPages: { type: 'integer' }, jaPages: { type: 'integer' },
    enClean: { type: 'boolean' }, jaClean: { type: 'boolean' },
    bodyChanged: { type: 'boolean' },
    commitOutput: { type: 'string' },
    notes: { type: 'array', items: { type: 'string' } },
  },
  required: ['added', 'examplesOfAdded', 'densityBefore', 'densityAfter', 'enPages', 'jaPages', 'enClean', 'jaClean', 'bodyChanged', 'commitOutput', 'notes'],
}

function prompt(n) {
  return `Enrich the margin column of one finished chapter, in both editions, then commit and push it.
${repo}
Chapter ${n}: slug and title from docs/syllabus.json; files en/lessons/<slug>.tex, ja/lessons/<slug>.tex, figures/l${pad(n)}-*.tex, bib/<slug>.bib.
Rules: docs/style-guide.md §3 and §3.1 (margin-column policy) in full; docs/book.md ("Real-world numbers" lists the kinds of numbers and their sources for this book); glossary.tsv.
Checker: tools/chapter-check.sh <en|ja> <slug> (1–4 min; Bash timeout 900000).
Both editions are finished and reviewed: the body text is settled. This stage adds what the margin column is for — and only that.

1. Audit: run the checker for en and read the rendered pages. Count the margin items (\\source, \\term glosses, \\margin, \\tip, \\caution, \\sidenote, marginfigure) per page, find pages with an empty margin and kinds that are missing entirely.
2. Decide what to add, following the §3.1 catalog. Target 3–4 margin items per page overall, never filler: every item carries information that is NOT already in the body. Typically 2–4 real-world numbers (verified — WebSearch when unsure — with their source named; never invent one), 1–3 cautions, 1–2 tips, 1–3 links to other chapters or notation reminders, 0–2 sidenotes for asides longer than ~3 lines, a marginfigure only if a small picture really helps.
3. Apply them to the ENGLISH chapter next to the sentence each supports. Do not restructure the body; the only body edits allowed are fixes for outright errors you notice (report them).
4. Mirror every addition into the JAPANESE chapter — same items, same places, translated per glossary.tsv, である調, full-width ，．.
5. Rebuild both editions until each is clean (0 errors, 0 undefined references/citations, 0 multiply-defined labels, 0 missing glyphs, 0 overfull boxes > 3 pt, at most 2 "margin notes moved down"). Read every rendered page of both editions: margin items must not collide, overflow or drift far from their anchor; move or drop an item if a page gets crowded.
6. Commit and push: tools/commit-lesson.sh <slug>. Never force-push or rewrite history; do not commit by hand.
Return counts added by kind, a few of the actual notes (one line each), margin items per page before and after, page counts, checker status for both editions, whether the body changed, the commit output, and notes.`
}

const results = await pipeline(chapters, async (n) => {
  await acquire()
  try {
    const r = await agent(prompt(n), { label: `margins:ch${pad(n)}`, phase: 'Enrich margins', schema: RESULT })
    if (!r) throw new Error('margin enrichment failed for chapter ' + n)
    log(`ch${pad(n)}: +${r.added.margin} margin +${r.added.tip} tip +${r.added.caution} caution +${r.added.sidenote} sidenote — ${r.densityBefore}→${r.densityAfter}/page`)
    return { chapter: n, ...r }
  } finally {
    release()
  }
})
const failed = chapters.filter((n, i) => !results[i])
if (failed.length) log(`not finished: chapters ${failed.join(', ')}`)
return { results: results.filter(Boolean), failed }
