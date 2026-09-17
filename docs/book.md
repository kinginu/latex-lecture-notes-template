# Book profile

Everything that is specific to **this** book.  The generic rules are in
[`style-guide.md`](style-guide.md); writers and reviewers read both.  Fill
in every field when you create a book from the template, and keep it
current.

## Identity

- **Title**: Course Title — Lecture Notes
- **Kind**: course notes | self-study notes  <!-- pick one -->
- **Field**: computer architecture  <!-- the discipline reviewers check against -->
- **Chapter label**: Lesson  <!-- class option: "lesson" (default) or "chapter" -->

## Source material

What each chapter summarizes, in the order the chapters follow.

- **Primary source**: <e.g. the Georgia Tech lectures by …, identical to the
  public Udacity course …> | <e.g. the official MLIR Toy tutorial, chapters
  1–7, at https://mlir.llvm.org/docs/Tutorials/Toy/ (LLVM 19)>
- **Version pinned**: <for software documentation: the release the notes
  follow, e.g. LLVM 19.1; mention the version in a `\caution` when an API
  changed>
- **Unit list**: `docs/syllabus.json` (one entry per chapter; `units` lists
  the videos / sections of the source in order).
- **Reference in `\source` and `\lessoninfo`**: <e.g. "Lesson N, videos
  a--b"> | <e.g. "Toy ch.~3; MLIR LangRef §Operations">.
- **Textbook / reference**: <e.g. Hennessy & Patterson, *Computer
  Architecture: A Quantitative Approach*, 6th ed. (bib key `hennessy2017`;
  cite as "H\&P §3.3")> | <e.g. Cooper & Torczon, *Engineering a Compiler*,
  3rd ed. (`cooper2022`)>.
- **Papers the source discusses**: <list with bib keys, or "none">.

## Code

- **Language in listings**: <e.g. `language=C`; `language={[x86masm]Assembler}`
  with MIPS-style mnemonics; LLVM IR / MLIR via a `language=` defined in
  the chapter>
- **Conventions**: <e.g. C17, POSIX threads; LLVM new pass manager only>

## Excluded

Never include (the reviewers treat any of it as a major issue):

- quiz, exam, homework and project questions, numbers and answers of the
  course (honor code);
- <course-specific projects, e.g. "the GFlib and gRPC projects">;
- <anything else, e.g. "content of paid books beyond short quotations">.

## Real-world numbers

Typical kinds of numbers worth adding in margin notes (style guide §3.1),
and where they come from:

- <e.g. cache sizes and latencies, branch-predictor sizes — vendor
  optimization manuals, H\&P figures>
- <e.g. compile-time and binary-size effects of a pass — LLVM compile-time
  tracker, the paper that introduced it>

## Reference chapters

Chapters whose style, density and macro use are approved and should be
imitated by new chapters (both editions):

- `en/lessons/01-using-this-template.tex` (replace with the first finished
  chapters of this book)
