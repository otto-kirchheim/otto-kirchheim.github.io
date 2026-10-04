#!/usr/bin/env python3
"""
Erzeugt `src/fonts/material-symbols-db.woff2`: Material Symbols (Outlined, Apache 2.0) als kleine statische Schrift,
in der jeder DB-UX-Icon-Name als Ligatur auf das passende Material-Symbol zeigt.

Warum: DB UX rendert Icons ueber `content: var(--db-icon, attr(data-icon))` mit einer Ligatur-Schrift -- der DB-Name
steht im Markup (`data-icon="chevron_down"`) UND in den CSS-Regeln der Komponenten (`--db-icon-trailing: "chevron_down"`).
Ohne die DB-Schrift (DB-Designs-Lizenz) genuegt es, dieselben Namen in einer freien Schrift aufzuloesen: kein CSS-Remap
je Selektor, auch die internen Icons der Komponenten (Checkbox-Haken, Select-Pfeil, Notification) funktionieren.

Quelle der Zuordnung: `src/ts/shared/ui/icons/iconRegistry.ts` (DB-Name -> Material-Name) plus `INTERN` unten fuer
Icons, die nur Komponenten-CSS nutzt. Neu erzeugen: `bun run icons:font` (braucht Python `fonttools` und `brotli`).
"""
import re
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont, newTable
from fontTools.ttLib.tables import otTables
from fontTools.varLib import instancer

WURZEL = Path(__file__).resolve().parent.parent
QUELLE = WURZEL / "node_modules/@material-symbols/font-400/material-symbols-outlined.woff2"
REGISTRY = WURZEL / "src/ts/shared/ui/icons/iconRegistry.ts"
ZIEL = WURZEL / "src/fonts/material-symbols-db.woff2"

# Nur im Komponenten-CSS von @db-ux/core-components genutzt (nicht in der Registry).
INTERN = {
    "circle_small": "fiber_manual_record",
    "circle": "circle",
    "clock": "schedule",
    "successful": "check_circle",
    "critical": "error",
}

ZEICHEN = "abcdefghijklmnopqrstuvwxyz0123456789_"


def zuordnung() -> dict[str, str]:
    text = REGISTRY.read_text(encoding="utf8")
    paare = dict(re.findall(r"^\s*(\w+): \{ material: '(\w+)'", text, re.M))
    paare.update(INTERN)
    return paare


def glyphe_fuer(name: str, cmap: dict[int, str]) -> list[str]:
    return [cmap[ord(c)] for c in name]


def main() -> int:
    paare = zuordnung()
    ziele = sorted(set(paare.values()))

    schrift = TTFont(QUELLE)
    cmap = schrift.getBestCmap()

    # 1. Ligaturen der Quelle einsammeln: Name -> Glyphenname des Ergebnisses.
    lig_glyph: dict[str, str] = {}
    for lookup in schrift["GSUB"].table.LookupList.Lookup:
        for sub in lookup.SubTable:
            tabelle = sub.ExtSubTable if hasattr(sub, "ExtSubTable") else sub
            if not isinstance(tabelle, otTables.LigatureSubst):
                continue
            for erste, ligaturen in tabelle.ligatures.items():
                for lig in ligaturen:
                    komponenten = [erste, *lig.Component]
                    name = "".join(_zeichen(g, cmap) for g in komponenten)
                    lig_glyph[name] = lig.LigGlyph

    fehlt = [z for z in ziele if z not in lig_glyph]
    if fehlt:
        print("Material-Symbole fehlen in der Schrift:", fehlt, file=sys.stderr)
        return 1

    # 2. Auf Wunschpunkt (Regular, ungefuellt) festnageln und auf die gebrauchten Glyphen reduzieren.
    # Die Quelle (font-400) hat nur einen Teil der Achsen; vorhandene auf Regular/ungefuellt/24px festnageln.
    wunsch = {"FILL": 0, "GRAD": 0, "opsz": 24, "wght": 400}
    achsen = {a.axisTag for a in schrift["fvar"].axes}
    schrift = instancer.instantiateVariableFont(schrift, {k: v for k, v in wunsch.items() if k in achsen})
    optionen = subset.Options()
    optionen.layout_features = ["rlig", "rclt", "liga"]
    optionen.notdef_outline = True
    optionen.glyph_names = True
    optionen.name_IDs = [1, 2, 3, 4, 6]
    optionen.drop_tables += ["STAT"]
    teil = subset.Subsetter(optionen)
    teil.populate(glyphs=[lig_glyph[z] for z in ziele], unicodes=[ord(c) for c in ZEICHEN])
    teil.subset(schrift)

    # 3. DB-Namen als zusaetzliche Ligaturen auf dieselben Ergebnis-Glyphen; alle in EINER Tabelle,
    #    laengste Folge zuerst (sonst schluckt ein kurzer Name wie "calendar" den laengeren "calendar_today").
    cmap = schrift.getBestCmap()
    alle: dict[str, str] = {z: lig_glyph[z] for z in ziele}
    for db, material in paare.items():
        alle[db] = lig_glyph[material]
    liste = sorted(alle.items(), key=lambda kv: (-len(kv[0]), kv[0]))
    ligatur = otTables.LigatureSubst()
    ligatur.ligatures = {}
    for name, glyph in liste:
        folge = glyphe_fuer(name, cmap)
        eintrag = otTables.Ligature()
        eintrag.Component = folge[1:]
        eintrag.LigGlyph = glyph
        ligatur.ligatures.setdefault(folge[0], []).append(eintrag)

    gsub = schrift["GSUB"].table
    lookup = otTables.Lookup()
    lookup.LookupType = 4
    lookup.LookupFlag = 0
    lookup.SubTable = [ligatur]
    lookup.SubTableCount = 1
    gsub.LookupList.Lookup = [lookup]
    gsub.LookupList.LookupCount = 1
    for feature in gsub.FeatureList.FeatureRecord:
        feature.Feature.LookupListIndex = [0]
        feature.Feature.LookupCount = 1

    ZIEL.parent.mkdir(parents=True, exist_ok=True)
    schrift.flavor = "woff2"
    schrift.save(ZIEL)
    print(f"{ZIEL.relative_to(WURZEL)}: {ZIEL.stat().st_size} Byte, {len(alle)} Ligaturen")
    return 0


def _zeichen(glyph: str, cmap: dict[int, str]) -> str:
    umgekehrt = _UMGEKEHRT.setdefault(id(cmap), {g: chr(c) for c, g in cmap.items()})
    return umgekehrt[glyph]


_UMGEKEHRT: dict[int, dict[str, str]] = {}

if __name__ == "__main__":
    sys.exit(main())
