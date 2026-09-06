"""Erzeugt DB-regelkonforme Icon-Varianten aus dem vorhandenen Icon-Satz.

    python3 scripts/icon-varianten.py

Schreibt die Ergebnisse nach `src/icons/`. Zwei Motive braucht die App, die es im
DB-Satz nicht gibt: "Theme folgt dem System" (Sonne + Mond) und "Filter zuruecksetzen"
(durchgestrichener Trichter). Beide sind aus den offiziellen 24-dp-SVGs von
`@db-ux/db-theme-icons` zusammengesetzt -- nichts ist neu gezeichnet.

Regeln laut DB-Marketingportal (Funktionale Icons):
- Komposition: mindestens zwei bestehende Icons verbinden.
- Durchstreichung: Erweiterung um eine 2-dp-Linie und einen Verschnitt.
- Raster 24 x 24 dp, Schutzraum 2 dp, Strichstaerke 2 dp, Linienenden 1 dp Radius.
"""
import pathlib, re

BASIS = pathlib.Path('node_modules/@db-ux/db-theme-icons/build/assets')
_cache = {}

def pfad(name: str) -> str:
    if name not in _cache:
        svg = next(BASIS.rglob(f'{name}_24.svg')).read_text()
        _cache[name] = re.search(r'<path d="([^"]*)"', svg).group(1)
    return _cache[name]

def huelle(inhalt: str, kennung: str) -> str:
    return (f'<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" '
            f'class="db-svg" data-variante="{kennung}" aria-hidden="true">{inhalt}</svg>')

def durchgestrichen(name: str, kennung: str, x1=4.0, y1=20.0, x2=20.0, y2=4.0) -> str:
    """2-dp-Linie diagonal von unten links nach oben rechts (Richtung wie `eye_disabled`),
    Verschnitt 2 dp beidseitig -- Maskenlinie also 2 + 2*2 = 6 dp."""
    mid = f'strike-{kennung}'
    return huelle(
        f'<mask id="{mid}" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">'
        f'<rect width="24" height="24" fill="#fff"/>'
        f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#000" stroke-width="6" stroke-linecap="round"/>'
        f'</mask>'
        f'<path d="{pfad(name)}" fill="currentColor" mask="url(#{mid})"/>'
        f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
        kennung)

def komponiert(basis: str, modifikator: str, kennung: str, skala=0.5, ecke=(22.0, 22.0)) -> str:
    """Modifikator in die untere rechte Ecke, 2 dp Schutzraum zum Rand,
    Verschnitt 2 dp rundherum (Maskenkontur 4 dp, in Modifikator-Koordinaten skaliert)."""
    mid = f'komp-{kennung}'
    groesse = 24 * skala
    dx, dy = ecke[0] - groesse, ecke[1] - groesse
    kontur = 4 / skala  # 2 dp Verschnitt beidseitig, in Modifikator-Koordinaten
    return huelle(
        f'<mask id="{mid}" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">'
        f'<rect width="24" height="24" fill="#fff"/>'
        f'<g transform="translate({dx:.2f} {dy:.2f}) scale({skala})">'
        f'<path d="{pfad(modifikator)}" fill="#000" stroke="#000" stroke-width="{kontur:.2f}" '
        f'stroke-linejoin="round"/></g>'
        f'</mask>'
        f'<path d="{pfad(basis)}" fill="currentColor" mask="url(#{mid})"/>'
        f'<g transform="translate({dx:.2f} {dy:.2f}) scale({skala})">'
        f'<path d="{pfad(modifikator)}" fill="currentColor"/></g>',
        kennung)

def original(name: str) -> str:
    return huelle(f'<path d="{pfad(name)}" fill="currentColor"/>', name)


WERKSTATT = {
    # Dateiname -> fertiges SVG
    'theme-auto.svg': lambda: komponiert('sun', 'moon', 'theme-auto'),
    'filter-off.svg': lambda: durchgestrichen('funnel', 'filter-off'),
}


def main() -> None:
    ziel = pathlib.Path(__file__).resolve().parent.parent / 'src' / 'icons'
    ziel.mkdir(parents=True, exist_ok=True)
    for dateiname, bauen in WERKSTATT.items():
        svg = bauen().replace(' class="db-svg"', '')
        (ziel / dateiname).write_text(svg + '\n')
        print('geschrieben:', ziel / dateiname)


if __name__ == '__main__':
    main()
