# Testdaten (erfunden)

Ein kleiner, realistischer Ausschnitt aus dem StartHub-Alltag im September 2026. **Alles ist erfunden.** Domains enden auf `.example`.

| Datei | Inhalt |
|---|---|
| `config.json` | Team, Postfächer (wer hat welches), Start-Bereiche |
| `freemail.json` | Freemail-Domains der Testdaten (`FREEMAIL_FILE`); Team-Domain der Testdaten: `TEAM_DOMAIN=gruendung.uni-augsburg.example` |
| `mail.json` | 15 Mails; `mailboxes` gibt an, in welchen Postfächern die Mail liegt |
| `calendar.json` | 7 Termine (inkl. Vorjahres-Event) |
| `drive.json` | 6 Dateien auf dem Netzlaufwerk (Pfad + extrahierter Text) |
| `expected.json` | Soll-Ergebnis der Verarbeitung je Element; dient in Stufe 1 als **Orakel** statt Modell und später als Prüfmaßstab |

## Was die Daten absichtlich prüfen

- **Duplikat:** `m09` liegt in Andreas' und Julias Postfach → ein Eintrag, `visible_to` = beide.
- **Sichtbarkeit:** `m07`/`m08` nur in Julias Postfach → Andreas sieht Platzhalter und die daraus entstandene Zusage, nicht den Text.
- **Team-Postfach:** `m01`, `m10`, `m11` im StartHub-Postfach → für alle sichtbar.
- **Freemail:** `m06` von `l.meier@gmx.example` → keine Organisation „gmx", Klärungsfrage „Lisa Meier von Solaro?".
- **Filter:** `m12` (Newsletter mit `List-Unsubscribe`) und `m14` (rein intern) → übersprungen.
- **Kein passender Bereich:** `m13` (Kooperationsanfrage Stadtwerke) → Klärungsfrage statt Raten.
- **Kein Vorgang:** `m11` (Rechnung) → relevant für niemanden, kein Gründungsteam.
- **Zusagen beider Seiten:** `m05` (wir: Feedback bis Mi), `m09` (wir: Raum buchen; Prof. Hartmann: Folien bis 06.10.).
- **Vorjahr:** `e7` + `f4` (Rückblick Gründungsnacht 2025) → Grundlage für Rat in Stufe 8.
