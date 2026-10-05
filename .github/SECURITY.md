# Sicherheitsrichtlinie

## Unterstützte Versionen

Sicherheitskorrekturen gibt es nur für den aktuellen Stand von `main` (die veröffentlichte App).
Ältere Versionen werden nicht gepflegt.

## Sicherheitslücke melden

Bitte **keine öffentlichen Issues** für Sicherheitslücken anlegen.

Melde Schwachstellen vertraulich über GitHub:
**Security → Advisories → [Report a vulnerability](../../security/advisories/new)**.

Hilfreich sind:

- betroffene Stelle (Datei, Funktion oder Seite der App),
- Schritte zur Reproduktion bzw. ein Proof of Concept,
- erwartete Auswirkung (z. B. XSS, Datenabfluss, Umgehung der Anmeldung).

Du bekommst in der Regel innerhalb von 7 Tagen eine erste Rückmeldung. Bestätigte Lücken werden behoben
und anschließend im [`CHANGELOG.md`](../CHANGELOG.md) genannt; auf Wunsch mit Namensnennung.

## Geltungsbereich

Dieses Repository enthält nur das Frontend. Funde, die das Backend betreffen (API, Authentifizierung,
Datenhaltung), bitte ebenfalls hier melden — sie werden intern weitergegeben.
