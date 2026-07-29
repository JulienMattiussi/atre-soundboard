default: help

help: ## Display available commands
	@fgrep -h "##" $(MAKEFILE_LIST) | fgrep -v fgrep | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

install: ## Install all dependencies
	npm install

start: ## Start application in development (http://localhost:5050)
	npm run dev

build: ## Build application for production
	npm run build

preview: build ## Preview production build locally
	npm run preview

lint: ## Run ESLint
	npm run lint

knip: ## Find unused files, exports and dependencies
	npm run knip

format: ## Format code with Prettier
	npm run format

format-check: ## Check formatting with Prettier
	npm run format:check

typecheck: ## Run TypeScript type checker
	npx tsc -b --noEmit

test: ## Run unit and component tests
	npm run test

test-watch: ## Run tests in watch mode
	npm run test:watch

test-coverage: ## Run tests with coverage report
	npm run test:coverage

.PHONY: sounds
sounds: ## Re-encode every source file from sounds/src/ into public/sounds/ as mono mp3
	@node scripts/encode-sounds.mjs

CHROME ?= $(shell command -v google-chrome || command -v chromium || command -v chromium-browser)

.PHONY: og
og: ## Re-render public/og.png and public/apple-touch-icon.png from scripts/*-template.html (needs Chrome)
	@test -n "$(CHROME)" || { echo "Chrome introuvable. Passe le binaire : make og CHROME=/chemin/vers/chrome"; exit 1; }
	@"$(CHROME)" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
		--window-size=1200,630 --screenshot=public/og.png scripts/og-template.html 2>/dev/null
	@"$(CHROME)" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
		--window-size=180,180 --screenshot=public/apple-touch-icon.png scripts/icon-template.html 2>/dev/null
	@echo "public/og.png (1200x630) et public/apple-touch-icon.png (180x180) regeneres"

fix: format lint ## Format and lint all code

check: build lint typecheck knip test ## Run all checks (build, lint, typecheck, knip, tests)
	@echo "All checks passed!"

clean: ## Remove build artifacts and dependencies
	rm -rf dist node_modules coverage
