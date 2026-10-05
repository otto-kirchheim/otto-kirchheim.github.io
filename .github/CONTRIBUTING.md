# Mitwirken

Danke für dein Interesse! DB-Nebengeld ist ein privat betriebenes Projekt; Fehlermeldungen und
Verbesserungsvorschläge sind willkommen, größere Änderungen bitte vorher in einem Issue abstimmen.

## Fehler melden und Ideen vorschlagen

- Vorher prüfen, ob es schon ein passendes Issue gibt.
- Bei Fehlern: Schritte zur Reproduktion, erwartetes und tatsächliches Verhalten, Browser/Gerät.
- **Keine echten personenbezogenen Daten** (Namen, Personalnummern, Abrechnungen) in Issues oder Screenshots.
- Sicherheitslücken nicht öffentlich melden, sondern wie in [`SECURITY.md`](SECURITY.md) beschrieben.

## Pull Requests

1. Branch von `dev` abzweigen und den PR gegen `dev` stellen (`main` ist der veröffentlichte Stand).
2. Lokal einrichten: `bun install`, Dev-Server mit `bun run dev:local`.
3. Vor dem PR müssen diese Prüfungen durchlaufen:

   ```bash
   bun run format
   bun run typecheck
   bun run lint
   bun run lint:css
   bun run test
   bun run build
   ```

4. Für neues Verhalten Tests ergänzen (`test/` spiegelt `src/ts/`).
5. Änderungen in [`CHANGELOG.md`](../CHANGELOG.md) eintragen.

## Konventionen

- Architektur nach Feature-Sliced Design, Importe nur abwärts (`app` → `pages` → `widgets` → `features` →
  `shared`); ESLint setzt das durch.
- Datumslogik ausschließlich mit dayjs.
- Commit-Nachrichten im Stil `feat: …`, `fix: …`, `test: …`, `chore: …`.
- Weitere Details: [`CLAUDE.md`](../CLAUDE.md).

## Verhaltenskodex

Es gilt der [Verhaltenskodex](CODE_OF_CONDUCT.md).
