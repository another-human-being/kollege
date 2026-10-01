# Kalender: Abgleich mit Apple Kalender

Stand 01.10.2026 · Anlass: Kommentar „Kalender soll die gleichen Funktionen wie bestehende Lösungen haben – identifiziere, was fehlt“.
Grundlage: Funktionsumfang von Apple Kalender (macOS/iOS) nach allgemeinem Kenntnisstand, nicht gegen die aktuelle Version geprüft. Outlook ist für euch die eigentliche Quelle – viele Punkte (Einladungen, Räume, Frei/Belegt) liefert Outlook schon; Kollege müsste sie nur anzeigen, nicht neu bauen.

## Jetzt im Prototyp

| Funktion | Stand |
| --- | --- |
| Ansichten Tag, Woche (7 Tage), Monat | ✓ (nur KW 40 mit Daten) |
| Termine jederzeit anlegen, auch nachts und am Wochenende (7–21 Uhr oder 0–24 Uhr) | ✓ |
| „Heute“, vor/zurück | ✓ |
| Suche nach Titel, Person, Ort | ✓ |
| Termin per Klick in freien Platz anlegen, bearbeiten, absagen | ✓ |
| Ganztägig, Wiederholung, Erinnerung, Kalender (persönlich/Team), Anzeigen als frei/belegt, Notiz | ✓ Felder (ohne Wirkung im Raster) |
| Teilnehmende mit Antwortstatus | ✓ |
| Einladung erst nach „Einladung senden“ | ✓ (bewusst strenger als Apple) |
| Seitenleiste einklappbar, dann Symbolleiste mit Zahlen | ✓ |

## Fehlt – nach Nutzen für euch sortiert

| # | Funktion | Warum wichtig | Aufwand / Hinweis |
| --- | --- | --- | --- |
| 1 | Eingehende Einladungen annehmen / ablehnen / vielleicht | Heute nur in Outlook möglich → Medienbruch | mittel; über Outlook-API |
| 2 | Frei/Belegt der Teilnehmenden beim Planen (Terminvorschlag) | Kern beim Termine finden mit Gründungsteams | mittel; Outlook liefert Frei/Belegt nur intern |
| 3 | Termine ziehen (verschieben) und Dauer ziehen | Standard-Interaktion | klein im UI, Einladungslogik beachten (Änderung = neue Einladung) |
| 4 | Wiederholungen mit „nur dieser / alle folgenden“ | Lehre, Jour fixe | mittel |
| 5 | Kalenderliste ein-/ausblenden (persönlich, Team, Lehre, Feiertage) | Überblick | klein; Farben je Kalender widersprechen E3 → Muster statt Farbe |
| 6 | Mehrtägige und ganztägige Termine im Raster (Kopfzeile) | Events, Messen | klein |
| 7 | Mini-Monat zum Springen | Navigation | klein |
| 8 | Raumbuchung / Ressourcen | Raum für Sitzung 3 ist gerade überfällig | hängt an Uni-Raumverwaltung – klären |
| 9 | Videokonferenz-Link (Zoom/Teams) am Termin | Online-Beratungen | klein |
| 10 | Reisezeit / Ort mit Karte | selten nötig | klein |
| 11 | Jahresansicht | Semesterplanung | klein |
| 12 | Feiertage, Semesterzeiten als abonnierte Kalender (ICS) | Planung | klein |
| 13 | Anhänge am Termin | Folien, Agenda | über Dateien-Zuordnung lösbar |
| 14 | Zeitzonen | kaum relevant | niedrig |
| 15 | Kalender teilen, Drucken, Tastaturkürzel | Komfort | niedrig |

Bewusst anders als Apple: Kollege verschickt nichts automatisch (E10/E28) und fragt nach vergangenen Terminen „Was kam raus?“.
