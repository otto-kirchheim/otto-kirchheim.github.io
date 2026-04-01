# .claude Übersicht (Frontend)

Zentrale Navigation für Frontend-spezifische AI-Hinweise und Skills.

## Einstieg

- Hauptanweisungen: `frontend/CLAUDE.md`
- Skill-Index: `frontend/.claude/skills/README.md`

## Struktur (v2)

- `commands/`: Frontend-Workflows (`review`, `test`, `deploy`)
- `skills/`: ordnerbasierte Skills mit `SKILL.md` plus `scripts/`, `references/`, `assets/`
- `settings.json`: Teamweite Sicherheitseinstellungen
- `settings.local.json.example`: lokales Beispiel fuer optionale Overrides
- Legacy-Skills bleiben als `*.md` in `skills/` erhalten und werden von den neuen `SKILL.md` referenziert.
