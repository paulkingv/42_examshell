all:
	@bash exam.sh

# Exam Quest: gamified memory trainer (see game/)
game:
	@node game/build.js
	@open game/index.html 2>/dev/null || xdg-open game/index.html

.PHONY: all game
