# Kollege – Regeln für Claude Code

**Was das ist:** Eine interne Arbeits-App für das StartHub-Team (Gründungszentrum Uni Augsburg): Mail, Kalender, Aufgaben, Kontakte, Dateien und Bereiche (Gründungsteams, Events, Lehre, Social Media) mit einer KI, die mitliest, verknüpft und Entwürfe vorbereitet.

## Vor jeder Arbeit

1. `docs/STAND.md` lesen: Welche Stufe ist dran, was ist offen?
2. Den betreffenden Abschnitt in `docs/BAUVORLAGE.md` lesen. **Die Bauvorlage ist maßgeblich.**
3. Für UI-Arbeit: `design/design-system/README.md` und die README des betroffenen Bausteins. Den Ordner `design/prototyp/` nur bei Bedarf als Referenz öffnen. Er ist groß und kein Code für die App.

## Arbeitsweise

- **Eine Stufe nach der anderen** (BAUVORLAGE §13). Nicht vorgreifen, nichts „schon mal mitbauen".
- Kleine, getestete Schritte. Am Ende jeder Stufe: Tests grün, `tsc --noEmit` sauber, Commit, `docs/STAND.md` aktualisiert (erledigt, Befunde, offene Fragen).
- **Was nicht in der Bauvorlage steht, wird nicht gebaut.** Stattdessen als Frage in `docs/STAND.md` unter „Offene Fragen" notieren.
- Lieber einfach als allgemein. Keine Abstraktion ohne zweiten konkreten Verwendungsfall.
- Sparsam mit Kontext: keine großen Dateien komplett lesen, wenn ein Abschnitt reicht. Keine Abhängigkeiten ohne Grund.

## Harte Regeln

- **Jede Datenänderung läuft über `runAction`** (`lib/actions/`). Keine direkten Inserts/Updates aus Routen, Worker oder Modell-Werkzeugen.
- **Akteur `model` führt nie externe Aktionen aus** (`mail.send`, Einladungen an Externe). Das ist im Code erzwungen, nicht nur im Prompt.
- **Jede DB-Verbindung im App-Kontext setzt `app.user_id`.** Auch Kontext für das Modell wird mit den Rechten des Nutzers geladen. RLS-Tests nie abschwächen.
- Geheimnisse (Passwörter, Tokens) nie im Klartext in DB, Logs oder Commits.
- Zahlen in Antworten des Modells kommen aus Werkzeugen/SQL, nie aus dem Modellgedächtnis.
- Das Wort „Vorgang" erscheint nicht in der Oberfläche. Dort heißen Dinge wie ihr Bereich sie nennt.

## Konventionen

- Code, Bezeichner, Commits: Englisch. Oberfläche, Prompts an das Modell, Doku: Deutsch.
- TypeScript strict, Zod für alle Grenzen (API, Modellausgaben, Aktionen).
- Farben, Abstände, Schriften nur über Design-Tokens (`design/design-system/tokens.css`).
- Zeitzone Europe/Berlin; Daten in der UI relativ, wenn nah („gestern", „seit 9 Tagen").

## Testdaten

`fixtures/` enthält erfundene StartHub-Daten (Team, Kontakte, Mails, Termine, Dateien) und `expected.json` als Soll-Zuordnung. Alle Domains sind erfunden oder `example.*`. Stufen 1–3 laufen vollständig darauf.
