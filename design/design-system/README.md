Kollege ist ein ruhiger, mitdenkender Kollege für ein kleines Team: Er merkt sich, was passiert, verknüpft es und erinnert an Zusagen. Die Oberfläche ist ein Logbuch mit einem Schreibfeld, das zugleich Chat ist – aber kein Widget-Dashboard. Der Chat ist der Eingang, der Record (Bereiche, Personen, Zusagen) bleibt die Wahrheit. Alles hier dient einer Frage: **Kann ich dem, was da steht, trauen – und woher weiß das System das?**

## Grundsätze

1. **Text vor Grafik.** Eine Aussage ist ein Satz. Keine Icons, keine Diagramme, keine Kacheln, keine Avatare. Hierarchie entsteht durch Schriftgröße, Gewicht und Weißraum.
2. **Herkunft ist sichtbar.** Jede Begründung ist eine `Aussage` mit Art und Quelle. Belegt, berechnet und eingeschätzt sehen verschieden aus – durch die Schrift, nicht durch Farbe.
3. **Rahmen = Grenze.** Nur zwei Dinge haben einen Rahmen: die `Eingabe` (was hereinkommt) und der `Entwurf` (was hinausgeht). Alles andere steht rahmenlos auf `paper`. Wer einen Rahmen sieht, weiß: hier wird die Organisation berührt.
4. **Das System tut leise, der Mensch entscheidet laut.** Interne Schritte passieren still und sind mit einem Klick rückgängig. Alles nach außen braucht einen bewussten Klick auf `primaer`.
5. **Chat rein, Record raus.** Jede Antwort, die etwas ablegt, endet mit einer `Karte`: was eingetragen wurde, Link zum Eintrag, Rückgängig – und welche Folgeschritte Rückgängig mit entfernt. Ohne Karte ist nichts passiert.
6. **Lieber Lücke als Raten.** Reicht das Wissen nicht, sagt das System „Dazu habe ich noch zu wenig Erfahrung“ (`Wissensluecke`) statt einer plausiblen Vermutung.
7. **Farbe heißt Handlung.** `accent` = du kannst jetzt etwas tun. `attention` = etwas ist überfällig. Sonst ist alles Tinte auf Papier.

## Drei Arten von Wissen

Das Herzstück. Jede Begründung trägt eines von drei Zeichen und spricht mit einer eigenen Stimme:

| Zeichen | Art | Stimme | Beispiel |
| --- | --- | --- | --- |
| ▪ | belegt | IBM Plex Sans, `ink` | ▪ Pitchdeck bis Freitag zugesagt `Notiz 24.09.` |
| = | berechnet | IBM Plex Mono, `ink` | = seit 9 Tagen keine Antwort |
| ~ | KI-Vermutung | IBM Plex Serif kursiv, `ink-muted`, gestrichelte Marke `KI-Vermutung` | ~ möglicherweise gefährdet `KI-Vermutung` |

- Belegt braucht immer eine `Quelle`. Ohne Quelle ist es keine belegte Aussage.
- Berechnet muss aus sichtbaren Belegen nachvollziehbar sein (Frist + heutiges Datum).
- „KI-Vermutung“ ist die einzige Bezeichnung für Ungeprüftes – überall gleich, als gestrichelte Marke (gestrichelt = noch nicht fest). Vermutungen sind erkennbar die Stimme der Maschine: leiser, kursiv, mit Tilde. Sie stehen nie allein – mindestens ein belegter oder berechneter Grund daneben.
- Das Zeichen ist für Sehende, der Screenreader-Präfix („belegt:“) für alle; die Farbe trägt keine dieser Bedeutungen.

## Stimme und Sprache

Freundlich-sachlich, kurz, deutsch. Das System spricht in der Ich-Form, das Team duzt sich.

- Hinweise sind Aussagesätze mit Punkt, Wer zuerst: „Solaro hat das Pitchdeck nicht geschickt.“
- Fragen konkret und einzeln: „Soll ich nachfragen?“ – nicht „Möchten Sie eine Aktion ausführen?“
- Knöpfe: ein bis zwei Wörter, Verb: „Merken“, „Senden“, „Ansehen“, „Übergeben an…“, „Rückgängig“.
- Datumsangaben relativ, wenn nah („gestern“, „heute 14:32“, „seit 9 Tagen“), sonst `12.09.`. Kein Jahr im laufenden Jahr.
- Einschätzungen mit Einschränkung: „möglicherweise“, „wirkt“, „vermutlich“. Nie Gewissheit ohne Beleg.
- Keine Emojis, kein Ausrufezeichen, kein „Super!“. Ein Kollege, kein Maskottchen.
- Leere Zustände sagen, was fehlt und wann es kommt: „Nichts wartet auf euch. Wenn jemand eine Antwort von euch erwartet, steht es hier.“

## Farbe

Fast farblos. Zwölf Tokens, davon zwei mit Bedeutung.

- `paper` ist der Grund, `ink` der Text. `ink-muted` für Gründe, Quellen, Einschätzungen und die Datumsspalte.
- `ink-faint` nur für Zeichen (▪ = ~ ○), nie für lesbaren Text.
- `rule` für Haarlinien zwischen Zeilen und Abschnitten. `line-control` für Rahmen von Bedienelementen (≥3:1).
- `paper-sunk` nur unter den zwei Grenzobjekten (Eingabe, Entwurf) und als Hover-Grund.
- `accent` (Tinte) nur für Primärknöpfe, Fokusring, Hover auf Links. Nie für Status, Etiketten oder Deko.
- `attention` nur für Überfälliges und Hängendes, immer mit Wort. Kein Rot/Grün-Paar: „erledigt“ ist `ink-muted` mit ✓, nicht grün.
- Vorgangsarten (Beratung, Event, Beitrag, Lehre, Sonstiges) bekommen **keine** Farben.
- Beide Themes erfüllen 4,5:1 für allen Text auf `paper` und `paper-sunk`.

## Typografie

IBM Plex als Familie mit drei Stimmen – verwandt, aber unterscheidbar. Fallbacks: Helvetica Neue / Menlo / Georgia.

- `body` 15/24 für fast alles. 24px ist das Zeilenraster der App; Abstände sind Vielfache davon (`space-5` = eine Leerzeile).
- `input` 18/28 nur für das Eingabefeld – es ist das Größte nach dem Titel.
- `title-1` 28/34 einmal pro Detailseite, `title-2` für Zwischentitel.
- `label` 12px Versalien mit Sperrung für Abschnittsköpfe („HEUTE“, „WARTET AUF UNS“).
- `meta` und `figure` (Plex Mono) für alles, was eine Maschine erzeugt oder gezählt hat: Datum, Quelle, Fristen, Zahlen. Immer `tabular-nums`.
- `estimate` (Plex Serif kursiv) ausschließlich für Einschätzungen.
- Textbreite höchstens `measure` (720px).

## Layout

- Links eine Seitenleiste (240px, einklappbar auf 58px): oben ein Feld „Neuer Chat oder Suche“ (⌘K), dann Heute und Chat, die einklappbaren Gruppen Werkzeuge und Bereiche – Bereiche als Baum mit ihren laufenden Einträgen –, Einstellungen, ganz unten das Konto mit Menü. Seitennamen groß, mit Icon, ohne Schrägstrich. Einzige Zahl: offene Aufgaben je Eintrag im Baum (Bestand). Kein Chatverlauf, keine Neuigkeitszähler, keine Widgets – frühere und angepinnte Chats stehen auf der Chat-Seite (E55).
- Detailansichten rechts lassen sich schließen (×) und als Vollbild über die Liste legen.
- Längere Detailansichten gliedern sich in benannte Cluster (Kopf in `label`-Schrift, Linie oben); Seltenes steht eingeklappt am Ende.
- Daneben eine Spalte, links ausgerichtet, maximal `measure` breit, oberer Rand `space-7`.
- Der Chat folgt gewohnten Chat-Programmen: eigene Nachrichten rechts als Blase, Kollege links ohne Blase, Belege eingerückt mit Linie.
- Links eine schmale Zeitspalte (`col-date`, 96px, Mono): Heute, Quittung und Verlauf teilen diese Kante. Das Datum steht vorn, wie in einem Logbuch.
- Abschnitte trennt `space-6` Weißraum plus eine Haarlinie unter dem Label. Einträge trennt eine `rule`-Linie.
- Flächen statt Karten: App-Grund `paper-sunk`, darauf eine weiße Arbeitsfläche (`surface`, `radius-3`, Haarlinie), ebenso Kontext-Chat und Konto. Keine Karte pro Eintrag. Schatten nur für schwebende Blätter und Menüs (`shadow-sheet`).
- Aktiver Zustand ist eine weiße Pille mit Haarlinie (Navigation, Umschalter); Hover tönt mit `tint`.
- Etiketten, Filter, Personen und Status sind Pillen (`radius-pille`); Eingabefelder und Knöpfe haben `radius-feld` und eine sichtbare Haarlinie. Personen tragen ein Kürzel im grauen Kreis (`kg-kuerzel`), keine Fotos.
- Überschriften in Satzschreibung; Versalien nur noch in `label` für sehr kleine Marken.
- Rahmen nur für Eingaben, Entwürfe und gestrichelte KI-Vermutungen. Alles andere trennt eine Linie oben.
- Farben mit Bedeutung: `attention` nur für Überfälliges, `accent` für Fokus und Aufforderungen, `ink-faint` nie für lesbaren Text. `primaer` nur für Senden und Merken.
- Radien: `radius-0` für Zeilen und Abschnitte, `radius-feld` (6px) für Felder und Knöpfe, `radius-3` (12px) für Flächen und Entwürfe, `radius-pille` für Pillen, `radius-1` (2px) nur für kleine Marken.

## Bewegung und Zustände

- Kaum Bewegung. Neue Einträge erscheinen ohne Animation; die Quittung blendet in 120ms ein.
- Laden ist Text mit Zähler (`Laden`), nie Spinner oder Skelett. Auslassungspunkte atmen, bei `prefers-reduced-motion` nicht.
- Leer ist ein Satz (`Leer`), nie eine Illustration.
- Fokus: 2px `accent`, 2px Abstand, auf jedem Grund ≥3:1.
- Rückgängig: ein Klick, keine Rückfrage; danach „Rückgängig gemacht · Wiederholen“ für 10 Sekunden.

## Privat

- Notizen und Verlaufseinträge können privat sein: Schloss (`Privat`) vor dem Text, nur die Besitzerin sieht sie. Beim ersten Auftreten auf einer Seite steht das Wort dabei; gehört der Eintrag jemand anderem, sagt `Privat` wem („nur Julia“).
- Chats sind grundsätzlich persönlich. Was ein Chat im Record ablegt, sieht das Team – die `Karte` sagt, wenn ein Eintrag privat abgelegt wurde.

## Icons und Zeichen

Linien-Icons (16 px, Strich 1,6, Farbe wie der Text, eigene einfache Geometrie, Baustein `Icon`) stehen nur in Navigation, Clusterköpfen, Suche und Aktionsleisten – immer mit Wort daneben oder als Knopf mit Tooltip. Im Fließtext bleibt das Schloss für „privat“ das einzige Piktogramm. Bedeutung im Text tragen weiter typografische Zeichen, immer mit Wort daneben:

| Zeichen | Bedeutung |
| --- | --- |
| ▪ = ~ | belegt · berechnet · Einschätzung |
| / | Pfad in der Navigation (`/übersicht`) |
| ↶ | Rückgängig |
| → | Richtung (Entwurf → Empfänger, Übergabe) |
| ○ ! ✓ | Zusage offen · überfällig · erledigt |
| ⏎ ⇧ | Tastenhinweise |
| ∅ | zu wenig Erfahrung (`Wissensluecke`) |
| → | Abschicken im Eingabefeld |

## Mobil

Für Eingaben direkt nach einem Gespräch.

- Die `Eingabe` klebt unten über der Tastatur, volle Breite, Knopf „Merken“ 44px.
- Darüber nur Heute (deine Punkte, darunter zugeklappt „Im Team“), Zeitspalte über dem Titel statt links. Seitenrand `space-4`.
- „Kurz klären“ steht oben auf Heute; eine eigene Klärungsseite gibt es nicht.

## Screens und Bausteine

| Screen | Bausteine |
| --- | --- |
| Heute | Seitenleiste, Kopf als Satz, „Diese Woche“ (Tagesspalten ab heute, Termine, Fristen, Jetzt-Linie in Tinte), „Offen“ in Entscheiden und Erledigen (eine Zeile pro Punkt, aufklappbar mit `Aussage`n, `Entwurf` und Antworten), „Ausstehend“ mit erwartet bis und Wiedervorlage (E56, E57) |
| Chat | Startseite mit `Eingabe` und früheren Chats (Angepinnt zuerst); im Chat `Nachricht`, `Aussage`/`Quelle`, `Karte` (Quittung oder Anweisung), `Klaerung`, `Entwurf` (auch gesperrt oder geplant), `Wissensluecke`, `Eingabe` |
| Bereich (Liste + Detail) | Felder des Bereichs (KI-Vermutung bis bestätigt), nächster Schritt, `Zusage` in zwei Spalten (aus Aufgaben), Bezüge, `Verlauf` mit Herkunft und `Privat`, „Übergeben an …“ mit Zustand „wartet auf Annahme“; Gründungsteam = Beratungsakte mit Personen und Gesprächen |
| Kontakte | Personen und Organisationen (über ID verknüpft), alle Adressen, Zusammenführen mit Vorschau und feldweiser Auswahl, `Verlauf` über alle Bereiche |
| Liste & Suche | `Eingabe` als Suchfeld, Filter mit `Umschalter`, Antwort als `Aussage`n mit `Quelle` |
| Einstellungen | Anweisungen (`Anweisung` × n), Postfächer & Kalender (Status, letzte Synchronisierung), Ausschlüsse |
| Einrichtung | `Laden` je Quelle, danach `Klaerung` („Das habe ich gefunden – bitte prüfen“) |

## Verwenden

Komponenten liegen unter `window.Kollege` (React 18). Klasse `kg` auf den Wurzelcontainer setzen, dann gelten Schrift, Grund und Fokusstil. Farben immer über die Tokens (`var(--ink)`), nie als Hex im Code.
