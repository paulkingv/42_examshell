all:
	@bash exam.sh

# Exam Quest: gamified memory trainer (see game/)
game:
	@if command -v node >/dev/null 2>&1; then node game/build.js; else echo "node not found: using the prebuilt game/data.js"; fi
	@f="$$(pwd)/game/index.html"; \
	for o in open xdg-open wslview sensible-browser firefox google-chrome chromium; do \
		if command -v $$o >/dev/null 2>&1; then $$o "$$f" >/dev/null 2>&1 & exit 0; fi; \
	done; echo "Open this file in your browser: $$f"

.PHONY: all game
