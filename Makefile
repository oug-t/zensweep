PM := npm
FILES := .

.PHONY: dev build clean format check-format

node_modules: package.json package-lock.json
	@echo "Dependencies changed. Installing..."
	$(PM) install
	@touch node_moudles

dev: node_modules
	$(PM) run dev

build: node_modules
	$(PM) run build

clean:
	rm -rf .svelte-kid build node_modules

format:
	npx prettier --write "$(FILES)"

check-format:
	npx prettier --check "$(FILES)"

