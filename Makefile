# Build targets.  Run inside the Docker container (or any TeX Live 2025).
#   make en / make ja / make all      build en/build/main.pdf, ja/build/main.pdf
#   make dist                         copy PDFs to dist/notes-<lang>.pdf
#   make en-a5 / ja-b6 / ...          print edition <lang>/build/main-<size>.pdf
#   make print-<size>                 both languages, copied to
#                                     dist/notes-<lang>-<size>.pdf
#   make print                        every print size
#   make gray / make gray-<size>      grayscale twin of each PDF in dist/:
#                                     dist/notes-<lang>[-<size>]-gray.pdf
#                                     (dist and print-<size> make them too)
#   make clean
#   make rev                          print the build revision (title page)
#   make docker-<target>              run <target> inside the container
#   make docker-shell                 interactive shell in the container
LATEXMK    ?= latexmk
LANGS      := en ja
SIZES      := a5 b6 shinsho b5
DOCKER_RUN := docker compose run --rm tex
GS         ?= gs
# Grayscale for monochrome submission: every colour converted to gray,
# fonts embedded (subset), page size and orientation kept.
GSFLAGS    := -q -dNOPAUSE -dBATCH -sDEVICE=pdfwrite \
              -sColorConversionStrategy=Gray -dProcessColorModel=/DeviceGray \
              -dCompatibilityLevel=1.7 -dPDFSETTINGS=/prepress \
              -dEmbedAllFonts=true -dSubsetFonts=true -dAutoRotatePages=/None

# Title-page revision: "rev 1.<commit count>" (CI: fetch-depth 0), else "draft".
# Exported for docker-% (compose.yml): a worktree's /work mount has no repository.
ifeq ($(strip $(REV)),)
REV := $(or $(shell git -c safe.directory='*' rev-list --count HEAD 2>/dev/null | awk '{printf "rev 1.%03d", $$1}'),draft)
endif
export REV
# One -pretex only (latexmk keeps the last), so the print targets append to it.
PRETEX := \def\lnrevision{$(REV)}

LANG_SIZES  := $(foreach l,$(LANGS),$(addprefix $(l)-,$(SIZES)))
PRINT_SIZES := $(addprefix print-,$(SIZES))
GRAY_SIZES  := $(addprefix gray-,$(SIZES))
# The grayscale twins of the PDFs present in dist/ (evaluated when make
# starts, so dist and print-<size> run them in a sub-make after the copy).
gray_of = $(patsubst %.pdf,%-gray.pdf,$(wildcard $(1)))

.PHONY: all rev $(LANGS) $(LANG_SIZES) $(PRINT_SIZES) $(GRAY_SIZES) print dist gray clean distclean docker-build docker-shell

all: $(LANGS)

rev:
	@echo '$(REV)'

$(LANGS):
	$(LATEXMK) -cd -jobname=main '-pretex=$(PRETEX)' $@/main.tex

# en-a5 -> latexmk -jobname=main-a5 with print=a5 passed to the class
$(LANG_SIZES):
	$(LATEXMK) -cd -jobname=main-$(lastword $(subst -, ,$@)) \
	  '-pretex=$(PRETEX)\PassOptionsToClass{print=$(lastword $(subst -, ,$@))}{lnotes}' \
	  $(firstword $(subst -, ,$@))/main.tex

$(PRINT_SIZES): print-%: $(addsuffix -%,$(LANGS))
	mkdir -p dist
	$(foreach l,$(LANGS),cp $(l)/build/main-$*.pdf dist/notes-$(l)-$*.pdf;)
	$(MAKE) --no-print-directory gray-$*

print: $(PRINT_SIZES)

dist: $(LANGS)
	mkdir -p dist
	$(foreach l,$(LANGS),cp $(l)/build/main.pdf dist/notes-$(l).pdf;)
	$(MAKE) --no-print-directory gray

gray: $(call gray_of,$(foreach l,$(LANGS),dist/notes-$(l).pdf))

$(GRAY_SIZES): gray-%:
	@$(if $(wildcard $(foreach l,$(LANGS),dist/notes-$(l)-$*.pdf)),:,echo "no dist/notes-<lang>-$*.pdf: run make print-$* first")
	@$(MAKE) --no-print-directory \
	  $(foreach l,$(LANGS),$(call gray_of,dist/notes-$(l)-$*.pdf)) gray-none

# gray-none: the sub-make above always has a goal, even with no PDF in dist/.
.PHONY: gray-none
gray-none:
	@:

dist/%-gray.pdf: dist/%.pdf
	$(GS) $(GSFLAGS) -sOutputFile=$@ $<

# Removing the build directories also removes the print jobs (main-<size>.*).
clean:
	$(foreach l,$(LANGS),$(LATEXMK) -cd -C $(l)/main.tex;)
	rm -rf $(foreach l,$(LANGS),$(l)/build $(l)/lessons/build)

distclean: clean
	rm -rf dist

docker-build:
	docker compose build

docker-shell:
	$(DOCKER_RUN) bash

docker-%:
	$(DOCKER_RUN) make $*
