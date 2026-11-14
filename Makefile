.PHONY: api worker test check build dev smoke infra-up infra-down
export GOCACHE ?= /tmp/wolly-go-cache
api:
	cd backend/go && go run ./cmd/api
worker:
	cd backend/go && go run ./cmd/worker
test:
	cd backend/go && go test -race ./...
	npm run test --workspace @wolly/api-client
check:
	cd backend/go && go vet ./...
	npm run contracts:check
	npm run check:boundaries
	npm run typecheck
build:
	cd backend/go && go build ./cmd/...
	npm run build
smoke:
	python3 scripts/smoke-workspace.py
dev:
	npm run dev
infra-up:
	docker compose --env-file infra/local/.env -f infra/local/compose.yml up -d
infra-down:
	docker compose --env-file infra/local/.env -f infra/local/compose.yml down
