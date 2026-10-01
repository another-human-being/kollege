# Quittung

Antwort des Systems direkt nach einer Eingabe: was es verstanden hat, was es still erledigt hat, was es vorschlägt.

- Drei Zeilen, immer in dieser Reihenfolge: **Verstanden** (erkannte Personen, Teams, Vorgang als `Bezug`), **Erledigt** (still ausgeführte Schritte, je mit ↶ Rückgängig), **Vorschlag** (ein `Entwurf` oder eine Frage).
- Kopf: Zeitstempel + „Alles rückgängig“. Fuß: „Falsch zugeordnet?“ öffnet die Zuordnung zum Korrigieren.
- Konsument gibt `zeit`, `verstanden`, `erledigt` (`[{text, onRueckgaengig}]`), `vorschlag` (Knoten), `onAllesRueckgaengig`, `onFalsch`.
- Oben eine Linie in `ink`: die Quittung ist ein abgeschlossener Beleg, kein Chatbeitrag.
- „Erledigt“ nennt nur interne Schritte. Nichts, was nach außen ging – das gibt es hier nicht ohne Klick.
- Leere Zeilen entfallen. Wenn nichts verstanden wurde: „Nicht zugeordnet – zu welchem Vorgang gehört das?“ mit Suchfeld.
- Bleibt oben auf der Übersicht stehen, bis die nächste Eingabe kommt oder man sie schließt.
