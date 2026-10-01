# Vorgehen bei Problemen und Entscheidungen

> Festgelegt am 01.10.2026, nachdem Andreas freigegeben hat, Probleme selbstständig zu lösen. Jede Entscheidung, die nach diesen Regeln fällt, steht mit einer Zeile Begründung in `STAND.md`.

## 1. Rangfolge der Quellen

1. **Harte Regeln** (`CLAUDE.md`): `runAction`, kein Modell nach außen, `app.user_id`, keine Geheimnisse im Klartext, Zahlen aus SQL. Diese Regeln werden nie gebrochen und nie abgeschwächt.
2. **Bauvorlage** für Datenmodell und Verhalten.
3. **Design** (`design/`) für Aussehen, Sprache und Abläufe in der Oberfläche. Die Entscheidungen E1–E50 gelten als Präzisierung der Bauvorlage, solange sie keine harte Regel verletzen.
4. **Eigene Ableitung**, wenn alle drei schweigen.

## 2. So wird entschieden

1. **Zweck:** Welches Problem hat das Team hier wirklich? Was muss wahr sein, damit die Lösung funktioniert?
2. **Belege:** Was steht fest (Spezifikation, Testdaten, Code)? Was ist nur Annahme?
3. **Mindestens zwei Optionen.** Jede wird von allen Seiten betrachtet: Nutzer, Datenmodell, Rechte, Fehlerfälle, spätere Stufen.
4. **Kriterien, in dieser Reihenfolge:**
   1. richtig und sicher (RLS, keine Inhalte an Unbefugte, nichts geht ohne Klick nach außen),
   2. eine Wahrheit (keine doppelten Datenbestände),
   3. umkehrbar,
   4. einfach (wenig Code, keine Abstraktion ohne zweiten Fall),
   5. stimmig mit dem Design.
5. **Die beste Option wird gebaut, getestet und mit Begründung notiert.** Ist eine Entscheidung teuer umzukehren, etwa weil sie das Schema betrifft oder nach außen wirkt, wird sie besonders sorgfältig geprüft. Trotzdem wird nicht gewartet.

## 3. Fehler im Design erkennen

Jeder Screen wird vor dem Bau gegen diese Fragen geprüft:
- Widerspricht er dem Datenmodell, den Rechten (RLS) oder der Autonomie-Regel?
- Widerspricht er einer anderen Design-Entscheidung?
- Zeigt er etwas, das die Daten gar nicht hergeben (vorgetäuschtes Verhalten)?
- Gibt es Zustände, die nicht zu Ende gedacht sind: leer, Fehler, Rückgängig, gleichzeitige Bearbeitung?
- Barrierefreiheit: Überschriften, Rollen, Tastatur, Kontrast.

Ein gefundener Fehler wird gelöst, nicht nachgebaut, und in `STAND.md` unter „Befunde“ notiert.

## 4. Grenzen ehrlich benennen

Echte Zugänge (Uni-Postfach, Kalender, Netzlaufwerk, Modell-API) gibt es in der Bauumgebung nicht. Was davon abhängt, entsteht hinter dem Interface aus §12 bzw. §9. Getestet wird es gegen lokale Stellvertreter, und es ist ausdrücklich als „nicht gegen das echte System geprüft“ markiert. Ein Test wird nie übersprungen oder abgeschwächt, nur damit er grün wird.
