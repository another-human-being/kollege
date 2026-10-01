# Kollege

Interne Arbeits-App für das StartHub-Team (Arbeitsname). Spezifikation: [`docs/BAUVORLAGE.md`](docs/BAUVORLAGE.md) · Fortschritt: [`docs/STAND.md`](docs/STAND.md) · Regeln für Claude Code: [`CLAUDE.md`](CLAUDE.md) · Design System: [`design/`](design/)

## Entwicklung (Stufe 1)

```
cp .env.example .env            # Testdaten: MODEL_FAST=oracle, TEAM_DOMAIN=gruendung.uni-augsburg.example, FREEMAIL_FILE=fixtures/freemail.json
docker compose up -d --build
docker compose run --rm worker npm run db:seed
docker compose restart worker   # importiert die Fixture-Quellen
```

Tests brauchen ein Postgres 16 mit Superuser `kollege`/`kollege` auf `localhost:5432` (oder `TEST_DATABASE_URL`). Die Testdatenbank wird bei jedem Lauf neu angelegt: `npm test`, `npm run typecheck`.
