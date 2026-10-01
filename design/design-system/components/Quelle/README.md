# Quelle

Verweis auf den Beleg, aus dem eine Aussage stammt: Kanal + Datum, in Mono, gepunktet unterstrichen, öffnet den Beleg.

- Format: `Mail 12.09.`, `Notiz Julia 24.09.`, `Termin 20.11.`, `Dateiname.pdf`. Kein Wochentag, kein Jahr im laufenden Jahr, keine Uhrzeit außer am selben Tag.
- Konsument gibt Text und `href` oder `onClick` (öffnet Beleg in der Seitenleiste). Ohne beides wird die Quelle als reiner Text gerendert (kein fokussierbarer Knopf ohne Funktion). Im Design hat jede Quelle ein Ziel.
- Jede belegte Aussage hat genau eine Quelle. Mehrere Belege: die jüngste zeigen, Rest im Eintrag.

`Bezug` (in derselben Vorschau) verlinkt Personen, Teams und Einträge der Bereiche im Fließtext: normale Schrift, Haarlinien-Unterstrich.
