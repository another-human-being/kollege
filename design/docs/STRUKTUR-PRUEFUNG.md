# Strukturprüfung der Seiten

Stand 03.10.2026 · Grundlage: `prototyp/quellen/*.html|.js`, `ENTSCHEIDUNGEN.md` (E1–E50), `design-system/README.md`. Befunde aus `UI-PRUEFUNG-EINORDNUNG.md` werden nicht wiederholt, nur mit ID genannt, wo sie die Struktur erklären.

**Kennzeichnung:** **[B]** = belegt (Datei/Element genannt) · **[A]** = Annahme über Nutzung, im Test zu prüfen.

**Was schon umgesetzt ist (03.10.):** Termin-Panel in Clustern Wann · Wo · Wer · Gehört zu · Weitere (E53), Dateien-Detail mit „Worum es geht“ oben und eingeklappten Dateiangaben, Seitenleiste nach E51, Vollbild für Detailansichten (E52). **Noch nicht umgesetzt, Entscheidung nötig:** Umbau von Heute (§1.4) und die Vorschläge für die übrigen Seiten (§2–11) sowie die seitenübergreifenden Muster am Ende. Abweichend vom Vorschlag in §12 bleibt „/einstellungen“ auf Wunsch in der Navigation; das Konto-Menü kommt zusätzlich.

**Prüffrage je Ansicht:** Welche Fragen hat ein Mensch beim Öffnen, in welcher Reihenfolge – und steht die Antwort auf Frage 1 oben?

---

## 1 · Heute – warum die Seite so nicht funktioniert

### 1.1 Zweck aus erster Hand

Ein Mensch, der morgens Heute öffnet, will in 30 Sekunden drei Dinge wissen und dann eines tun:

1. **Was ist heute zeitlich fest?** (Termine – sie bestimmen, wie viel Zeit für alles andere bleibt)
2. **Was hat Folgen, wenn ich es heute nicht tue?** (überfällig, heute fällig – egal, ob ich etwas zugesagt habe oder jemand anderem hinterherlaufen muss)
3. **Ist etwas Neues da, das jemand übernehmen muss?** (sonst übernimmt es niemand)
4. **Tun:** den ersten Punkt anfangen.

Alles andere – worauf wir warten, was seit Wochen ruht, 214 Importvorschläge – ist **Beobachtung**, keine Tagesaufgabe. Es wird gebraucht, aber nicht in den ersten 30 Sekunden.

### 1.2 Tatsächliche Ordnung (`Main.html` Z. 12–130, `Main.js` Z. 120–170)

| Pos. | Element | Umfang |
|---|---|---|
| 1 | Datum + „N offene Punkte“ (`zaehlzeile`, Main.js Z. 323) | 1 Zeile |
| 2 | **Eingabe** (18/28 px, größte Schrift der Seite) + Erklärzeile „Eingaben öffnen einen Chat …“ | ~4 Zeilen |
| 3 | Bereichsfilter, 5 Chips (Z. 18) | 1 Zeile |
| 4 | Kurz klären · 2 Karten mit je 3 Antwortknöpfen (Z. 23) | ~8 Zeilen |
| 5 | Heute · 2 (Termin Kitchen Loop, private Notiz Tom) | je ~5 Zeilen |
| 6 | Wartet auf uns · 2 (Finanzplan heute fällig, Raumbuchung **überfällig**) | je ~5 |
| 7 | Wir warten auf · 1 (Pitchdeck bis Fr, „noch 2 Tage“) | ~5 |
| 8 | Hängt · 1 (Nordlicht) | ~6 |
| 9 | Prüfen · 1 („214 ungeprüft“) | ~5 |
| 10 | Im Team · 5, **standardmäßig zugeklappt** (Z. 84): Neu, niemand zuständig 3 · Hängt bei anderen 2 | – |

Abschnittsabstand 44 px, jeder Punkt hat dasselbe Format: Satz + Etikett/Eintrag/Person + 1–3 Gründe + bis zu 3 Knöpfe. Artboard-Höhe 1900 px.

### 1.3 Befunde

| # | Befund | Beleg / Art |
|---|---|---|
| H-S1 | **Die Abschnitte ordnen nach Richtung (wer wartet auf wen), nicht nach Dringlichkeit.** Dadurch stehen der überfällige Punkt (Raumbuchung, seit 29.09.) und der heute fällige (Finanzplan) unter „Wartet auf uns“ – **unter** „Heute“. „Heute“ verspricht „alles für heute“, enthält aber nur, was keine Richtung hat. Wer Frage 2 beantworten will, muss alle fünf Abschnitte lesen. | [B] Main.js `wartetAufUns` Z. 130; `_shared.js` aufgabenDaten: `raum` fällig 29.09., `fin` fällig 30.09. |
| H-S2 | **Zwei Achsen in einer Gliederung.** Zeit (heute/überfällig/später) und Richtung (von uns/an uns) sind unabhängig; jeder Punkt hat beide. Eine Gliederung kann nur eine Achse tragen, die andere muss Zeilenmerkmal sein. Die Richtung steckt bereits im Satz („Tom wartet auf …“, „Solaro schickt …“) – der Abschnitt wiederholt sie. | [B] Satzbau in `daten()`; E44 (Richtung trägt die Information) |
| H-S3 | **Termine sind keine Agenda.** Ein Termin wird wie eine Aufgabe dargestellt (Karte mit Gründen und Knöpfen). Es gibt keinen Blick auf „wann bin ich heute gebunden, wann frei“. Andreas hat am 30.09. zwei eigene Termine (Kitchen Loop 10:00, Solaro 13:30), Heute zeigt einen. Mobil zeigt nach dem Termin „vorbei – Was kam raus?“, Desktop nicht. | [B] Kalender.js Z. 21–22; MobilUebersicht.html Kopf |
| H-S4 | **Die Eingabe steht an Position 1 und ist das Größte auf der Seite.** Sie beantwortet keine der drei Morgenfragen; sie schiebt die Antworten nach unten. Erfassen ist eine Tätigkeit nach Gesprächen, nicht beim Öffnen am Morgen [A]. Mobil steht sie bereits unten fixiert. Die Erklärzeile darunter ist Dauertext für etwas, das man nach dem ersten Mal weiß. | [B] Main.html Z. 16–17; README „input 18/28 … das Größte nach dem Titel“; MobilUebersicht.html Fußzeile |
| H-S5 | **„Neu, niemand zuständig“ ist am wenigsten sichtbar, obwohl es am leichtesten verloren geht.** Was niemandem gehört, wird von niemandem angesehen; der Abschnitt steht ganz unten und ist zugeklappt. Darunter: Presseanfrage von heute. E39 begründet die zwei Arten damit, dass sie „eine Handlung von dir verlangen“ – das Zuklappen widerspricht dieser Begründung. | [B] Main.html Z. 84 (`teamOffen` false); Main.js `teamNeuListe` tn3 „heute“ |
| H-S6 | **Beobachtung steht gleichrangig neben Handlung.** „Wir warten auf“ (Pitchdeck bis Fr, nichts zu tun bis Freitag), „Hängt“ (Wochenthema) und „Prüfen“ (einmaliger Rückstand nach dem Import, mit „Später“-Knopf) bekommen dasselbe Format und denselben Platz wie Überfälliges. Sie werden erst Handlung, wenn eine Frist reißt – dann gehören sie in „Fällig“. | [B] Main.js Z. 140–166 |
| H-S7 | **Jeder Punkt ist gleich schwer.** 14 Karten (2 Klärungen, 7 Punkte, 5 im Team) mit je 3–6 Zeilen. Gründe sind immer ausgeklappt; zum Überfliegen reicht ein Satz pro Punkt. Gewichtung entsteht nur durch die Reihenfolge der Abschnitte – und die ist nach H-S1 die falsche. | [B] Main.html Z. 30–80 |
| H-S8 | **Wiederholungen ohne Information.** „· Andreas“ an jedem eigenen Punkt, obwohl Heute nur eigene Punkte zeigt (E39); „Später“ an jedem Punkt; Bereichs-Etikett an jedem Punkt und zusätzlich der Bereichsfilter oben. | [B] Main.js `wer: 'Andreas'` in allen Meins-Daten |
| H-S9 | **Dasselbe Ding in zwei Gestalten.** Nordlicht steht als „Hängt“-Hinweis mit „Nachfassen“ **und** existiert als Aufgabe „Bei Nordlicht nachfassen“ (fällig 01.10.). Kitchen Loop: Termin-Grund „offene Frage Hygieneschulung“ ist zugleich Julias Aufgabe. Heute leitet Punkte teils aus Aufgaben, teils aus berechneten Zuständen ab – ohne Regel, welche Gestalt gewinnt. | [B] Main.js `haengt` / _shared.js `nord`, `hyg` |
| H-S10 | **Kurz klären vor dem eigenen Tag.** Klärungen sind Fragen des Systems an den Menschen. Sie stehen vor Heute, obwohl sie nur dann dringend sind, wenn sie etwas blockieren (E18). Die zwei Beispiele blockieren nichts Heutiges. | [B] Main.html Z. 23; [A] Dringlichkeit |
| H-S11 | **Die Zählzeile zählt Ungleiches.** „N offene Punkte“ addiert Termin, Wartendes, Hängendes. Eine Zahl ohne Art sagt nicht, ob der Tag voll ist. | [B] Main.js Z. 323 |
| H-S12 | **Bereichsfilter auf einer Seite mit ~8 Punkten** kostet eine Zeile oben und erzeugt die Zählerprobleme H2/H11/H12 [B]; Nutzen gering, solange die Seite kurz ist [A]. | [B] Main.html Z. 18 |

**Kern:** Heute ist eine **Sortierung nach Beziehungsart** (wer schuldet wem). Für den Morgen braucht es eine **Sortierung nach Zeit und Folge**. Deshalb muss man die ganze Seite lesen, um zu wissen, was zuerst kommt.

### 1.4 Strukturvorschlag Heute

1. **Kopf = Satz statt Zahl:** „Mi 30.09. · 2 Termine · 3 fällig, davon 1 überfällig · 3 neue Anfragen“ – beantwortet Frage 1–3 in einer Zeile.
2. **Abschnitt „Termine“** als kompakte Zeitleiste (Uhrzeit · Titel · Ort, je eine Zeile); Vorbereitung als eine Zeile darunter, falls vorhanden; vergangene Termine des Tages zeigen „Was kam raus?“ (wie mobil).
3. **Abschnitt „Fällig“** = überfällig + heute fällig, **unabhängig von der Richtung** (von uns: tun; an uns: nachfassen). Überfälliges zuerst (`attention`). Richtung steht im Satz, nicht im Abschnitt.
4. **Abschnitt „Neu, niemand zuständig“ nach oben und offen**, solange die Zahl > 0 ist (präzisiert E39: Inhalt bleibt, Sichtbarkeit folgt der Begründung von E39). Klärungen, die einen Entwurf oder Punkt blockieren, hängen an diesem Punkt; übrige Klärungen bilden „Kurz klären“ direkt danach.
5. **Abschnitt „Im Blick“ eingeklappt** mit Zahl: Wir warten auf · Hängt (meins) · Hängt bei anderen. Ein Punkt wandert automatisch nach „Fällig“, sobald seine Frist reißt.
6. **„214 ungeprüft“ aus den Abschnitten nehmen** und als eine Zeile im Kopf oder unter „Im Blick“ führen; verschwindet bei 0.
7. **Ein Punkt = eine Zeile** (Satz · Eintrag · Frist) + **eine** sichtbare Hauptaktion; Gründe, weitere Knöpfe und „Später“ beim Aufklappen. Konstante Angaben („· Andreas“) entfallen.
8. **Eingabe kompakt und unten fixiert** (wie mobil), ohne Erklärzeile; Bereichsfilter entfällt auf Heute oder wird ein kleines Menü im Kopf [A: im Test prüfen, ob er genutzt wird].

---

## 2 · Chat (Main, Ansicht Chat)

**Fragen beim Öffnen:** Startseite: Was will ich sagen? → Wo war mein letzter Chat? · Im Chat: Was hat Kollege eingetragen (Karte)? → Was muss ich entscheiden (Klärung, Entwurf)?

**Ordnung [B]** (Main.html Z. 136–210): Kopf mit Titel · Etikett · „persönlich“ · Anpinnen · Löschen · + Neuer Chat · Zu Heute (4 gleichrangige Textknöpfe + 1 sekundär); Startseite: Frage, Eingabe, Vorschläge, Frühere Chats mit Suche, Filter, Gruppen.

**Passt nicht:** Löschen steht gleichrangig neben Anpinnen [B]; „+ Neuer Chat“ doppelt (Kopf und Seitenleiste) [B]; „Zu Heute“ doppelt die Navigation [B]. Die Nachrichtenreihenfolge selbst ist richtig (Antwort → Belege → Karte → Klärung → Entwurf).

| Cluster | Inhalt | eingeklappt? | Begründung |
|---|---|---|---|
| Kopf | Titel, Bereichs-Etikett, „persönlich“ | nein | Sagt, wo die Ablagen landen. |
| Verlauf | Nachrichten, Karten, Klärungen, Entwürfe | nein | Unverändert. |
| Eingabe | unten fixiert | nein | Unverändert. |
| Chat-Menü (⋯) | Anpinnen, Löschen | ja | Selten; Löschen nicht auf einer Ebene mit Lesen. „+ Neuer Chat“ und „Zu Heute“ übernimmt die Seitenleiste. |

---

## 3 · Mail – Detail (Thread)

**Fragen beim Öffnen:** 1. Von wem, was will die Person von mir? 2. Muss ich antworten, bis wann – was weiß Kollege dazu (offene Zusage, Frist)? 3. Antworten. 4. Liegt die Mail richtig (Gehört zu, Kontakt)? 5. Ablegen.

**Ordnung [B]** (Mail.html Detail): Betreff → Zeile „Gehört zu“ (Select + KI-Vermutung + Stimmt) · „Kontakt“ (Select) · Postfach → **9 Aktionen in einer Zeile** (Antworten, Allen antworten, Weiterleiten, Archivieren, Löschen, Markieren, Als ungelesen, Kollege fragen, Öffnen) → Nachrichten. „Kollege weiß dazu“ erscheint **nur im Schreibfeld** (`hatWissen: !!sw`, Mail.js Z. 166).

**Passt nicht:**
- Zuordnung (Frage 4) steht vor dem Inhalt (Frage 1) [B].
- Was Kollege weiß, fehlt beim Lesen – genau dann wird entschieden, ob und wie man antwortet. Beispiel Tom-Thread: „Deine Zusage ‚Feedback zum Finanzplan‘ ist heute fällig“ sieht man erst nach „Antworten“ [B Mail.js Z. 15].
- 9 gleichrangige Aktionen mischen drei Gruppen (Antworten, Ablage, Status) [B]; „Öffnen“ sagt nicht, was geöffnet wird (der Bereich) [B].

| Cluster | Inhalt | eingeklappt? | Begründung |
|---|---|---|---|
| Kopf | Betreff; eine Zeile „von · an · Postfach · Zeit“ | nein | Frage 1 in einer Zeile. |
| Kollege weiß dazu | max. 3 Aussagen (Frist, offene Zusagen zu diesem Kontakt/Eintrag) | nein, nur wenn vorhanden | Gehört vor die Entscheidung zu antworten, nicht erst ins Schreibfeld. |
| Nachrichten | neueste offen, ältere als Kopfzeile [A bei langen Threads] | ältere ja | Die letzte Nachricht ist die, auf die man reagiert. |
| Antworten | Antworten · Allen antworten · Weiterleiten · Entwurf mit Kollege; Schreibfeld erscheint hier | nein | Aktion steht unter dem Inhalt, auf den sie antwortet. |
| Zuordnung | „Gehört zu: Solaro · Kontakt: Lisa Meier“ als eine Zeile mit „ändern“; Link „Zur Akte“ | ja – **außer** bei offener KI-Vermutung | Wird selten geändert; eine offene Vermutung verlangt dagegen eine Entscheidung (E32). |
| Ablage (Kopf rechts) | Archivieren; Menü ⋯: Markieren, Als ungelesen, Löschen | Menü ja | Ablegen ist die häufigste Abschlussaktion [A]; der Rest ist selten. |

---

## 4 · Kalender – Termin (Seitenpanel)

*Bewertet gegen die Zielrichtung Wann / Wo / Wer / Gehört zu / Weitere.*

**Fragen beim Öffnen eines bestehenden Termins:** vorher: 1. Wann, wo? 2. Mit wem – wissen alle Bescheid? 3. Worum geht es, was ist vorzubereiten? · nachher: 1. Was kam raus? · selten: Wiederholung, Erinnerung, Kalender, Verfügbarkeit.

**Ordnung [B]** (Kalender.html Z. 55–108): Titel → **11 gleichrangige Felder** (Ganztägig, Beginn, Ende, Ort, Mit, Gehört zu, Wiederholen, Erinnerung, Kalender, Anzeigen als, Notiz) → „Teilnehmende extern“ mit Status → Statussatz („Einladung nicht verschickt“) → Aktionen (Einladung senden / Änderung senden / Absagen / Öffnen) → „Was kam raus?“.

**Passt nicht:**
- „Mit“ (Freitext) und „Teilnehmende extern“ (Status je Person) beschreiben dieselben Menschen an zwei Stellen [B].
- Der Satz, ob Externe Bescheid wissen, und der Knopf, der das ändert, stehen unter allen Feldern [B Z. 93–96] – bei Terminen mit Externen ist das die wichtigste Information (E28, E48).
- Bei vergangenen Terminen ist „Was kam raus?“ die eigentliche Aufgabe, steht aber ganz unten [B Z. 101].
- Keine Vorbereitung: Der Termin kennt seinen Eintrag („Gehört zu“), zeigt aber nicht dessen offene Zusagen. Heute zeigt für Kitchen Loop „offene Frage Hygieneschulung“, der Termin selbst nicht [B Kalender.js enthält keine Zusagen/Gründe].
- Ganztägig steht als eigenes Feld vor Beginn statt als Teil von „Wann“ [B].

| Cluster | Inhalt | eingeklappt? | Begründung |
|---|---|---|---|
| Status (nur wenn nötig) | „Einladung nicht verschickt“ / „Änderung nicht verschickt“ / „Abgesagt“ + der eine passende Knopf | nein | Grenze nach außen zuerst (README Grundsatz 4); Satz und Knopf gehören zusammen. |
| Nachher (nur vergangene) | „Was kam raus?“, abgelegtes Ergebnis | nein, **oben** | Nach dem Termin ist das die Aufgabe; Zeitbezug bestimmt die Reihenfolge. |
| Wann | Beginn, Ende, ganztägig | nein | Zielrichtung; Ganztägig ist eine Eigenschaft der Zeit. |
| Wo | Ort / Link | nein | Zielrichtung. |
| Wer | Personen mit Teilnahme-Status je Zeile (zugesagt · Antwort offen · nicht eingeladen) | nein | Ersetzt „Mit“ + „Teilnehmende extern“: ein Ort je Person. |
| Gehört zu | Eintrag + max. 3 offene Zusagen; Notiz/Agenda | nein | Beantwortet „was vorbereiten“; Notiz ist Inhalt, keine Einstellung. |
| Weitere | Wiederholen, Erinnerung, Kalender, Anzeigen als, Absagen/Verwerfen | ja | Beim Öffnen fast nie gebraucht [A]; Absagen ist selten und folgenreich. |

Die Zielrichtung trifft die Felder; **zu ergänzen** sind Status oben, „Nachher“ oben bei vergangenen Terminen und die Zusagen unter „Gehört zu“.

---

## 5 · Aufgaben – Detail

**Fragen beim Öffnen:** 1. Was genau ist zu tun und wer hat es wie verlangt (Wortlaut)? 2. Bis wann? 3. Womit erledige ich es (Mail, Datei)? 4. Erledigt setzen. · selten: Richtung, Zuständigkeit, Sichtbarkeit, Löschen.

**Ordnung [B]** (Aufgaben.html Detail): Erledigt-Haken + „Verschieben nach“ → Titel → Felder **Richtung**, (Von wem), zuständig, Fällig, Gehört zu, **Herkunft**, Sichtbar → Notiz → Aktionen (Nachfassen per Mail nur bei „an uns“, Kollege fragen, Löschen).

**Passt nicht:**
- Erstes Feld ist „Richtung“ – vom System gesetzt, fast nie geändert [B/A].
- „Herkunft“ (z. B. „Tom bittet um Feedback ‚bis Mitte der Woche‘“) beantwortet Frage 1, steht aber an sechster Stelle [B].
- Arbeitsmaterial fehlt: Heute bietet für dieselbe Aufgabe „Finanzplan öffnen · Antworten“, das Aufgaben-Detail nicht [B Main.js Z. 132 vs. Aufgaben.html].
- Für „von uns“ gibt es keine Hauptaktion; „Löschen“ steht gleichrangig neben „Kollege fragen“ [B].

| Cluster | Inhalt | eingeklappt? | Begründung |
|---|---|---|---|
| Kopf | Erledigt-Haken, Titel, Status (Offen/In Arbeit) | nein | Unverändert; der Haken ist die häufigste Aktion. |
| Worum | Herkunft mit Quelle als Link, Notiz | nein | Frage 1: Wortlaut der Bitte vor allen Metadaten. |
| Wann & wer | Fällig (+ berechnet), zuständig bzw. „von wem“ | nein | Frage 2. |
| Erledigen mit | eine Hauptaktion aus der Herkunft: Antworten / Datei öffnen / Nachfassen per Mail | nein | Frage 3; derselbe Weg wie auf Heute. |
| Gehört zu | Eintrag mit Link | nein | Kontext, eine Zeile. |
| Weitere | Richtung, Sichtbar, Verschieben nach, Löschen | ja | Selten; Richtung ändert die Bedeutung der Aufgabe und soll nicht beiläufig geändert werden. |

---

## 6 · Kontakte – Person und Organisation

**Fragen beim Öffnen einer Person:** 1. Wer ist das (Rolle, Organisation)? 2. Was läuft gerade mit ihr – wer schuldet wem was, wann zuletzt, wann als nächstes? 3. Wie erreiche ich sie? 4. Was muss das Team über sie wissen? · selten: weitere Adressen pflegen, Listen, „Kontakt über“, Zusammenführen, Löschen.

**Ordnung Person [B]** (Kontakte.html Z. 40–110): Name → Schnellaktionen (Mail, Anrufen, Termin, Notiz) → Felder Rolle, Organisation, E-Mail (alle Adressen mit Info und „entfernen“), Telefon, Kontakt über (+ Mailzahlen), Listen, Letzter Kontakt → **zweite** Aktionszeile (Mail schreiben, Zusammenführen, Kollege fragen, Löschen) → Notiz → Gehört zu → Verlauf.

**Passt nicht:**
- Doppelte Aktionen: „Mail“ (Z. 46) und „Mail schreiben“ (Z. 68); Knopf „Notiz“ und Abschnitt „Notiz“ [B].
- Frage 2 hat keinen Ort: offene Zusagen mit dieser Person fehlen (Tom wartet auf Finanzplan-Feedback, steht nur in Aufgaben/Akte) [B: Kontakte.js nutzt `zusagenFuer` nicht]. „Letzter Kontakt“ steht als letztes Stammdatenfeld.
- Adresspflege (entfernen, Info je Adresse) im Hauptbereich – Pflege statt Nutzung [B].
- Organisation ordnet anders als Person (Personen · Gehört zu · Notiz · Verlauf statt Notiz · Gehört zu · Verlauf) [B Z. 146–165].

| Cluster | Inhalt | eingeklappt? | Begründung |
|---|---|---|---|
| Kopf | Name; Zeile „Rolle · Organisation (Link) · letzter Kontakt = …“; Schnellaktionen Mail · Anrufen · Termin (einmal) | nein | Frage 1 + häufigste Aktionen in einem Blick; Dopplung entfällt. |
| Was läuft | Einträge (Gehört zu) mit offenen Zusagen beider Richtungen, nächster Termin | nein | Frage 2 – der Grund, warum man einen Kontakt in Kollege statt im Adressbuch öffnet. |
| Notiz | Teamnotiz | nein | Frage 4; kurz. |
| Erreichbar | Hauptadresse, Telefon; weitere Adressen als „+2 Adressen“ | weitere ja | Frage 3; Pflege nur bei Bedarf. |
| Verlauf | über alle Bereiche | ab 5 Einträgen ja | Nachschlagen, nicht Einstieg. |
| Verwaltung | Kontakt über (+ Mailzahlen), Listen, Zusammenführen, Löschen | ja | Selten; Zusammenführen ist ein eigener Ablauf. |
| *Organisation* | Kopf (Name, Art, „Zur Beratungsakte“) → Personen → Was läuft → Notiz → Erreichbar (Web, Tel, Mail, Ort) → Verlauf → Verwaltung | wie oben | Gleiche Reihenfolge wie Person, Personen als Zusatz nach dem Kopf. |

---

## 7 · Dateien – Detail

*Bewertet gegen die laufende Überarbeitung.*

**Fragen beim Öffnen:** 1. Ist das die richtige Datei, worum geht es? 2. Öffnen. 3. Wofür wird sie gebraucht (Zuordnung, offene Zusagen dazu)? 4. Ist sie aktuell (wann, von wem geändert)? · selten: Ordner, Pfad, Umfang, Sichtbarkeit.

**Ordnung [B]** (Dateien.html Detail): Dateiname (Mono 20 px) → Pfad → Aktionen (Öffnen, Pfad kopieren, Kollege fragen) → Felder **Ordner (Select)**, Geändert, Umfang, Sichtbar → Zugeordnet → Worum es geht (KI) → Verlauf.

**Passt nicht:**
- „Worum es geht“ (Frage 1) steht nach Metadaten und Zuordnung [B].
- „Ordner“ ist ein Auswahlfeld an erster Stelle – Ändern verschiebt die Datei für das ganze Team auf dem Netzlaufwerk; eine folgenreiche Aktion sieht aus wie ein Feld [B data-feld="ordner"].
- Keine Verbindung zu Zusagen, obwohl Dateien oft Gegenstand einer Zusage sind (Finanzplan, Folien Sitzung 3) [B: Dateien.js nutzt `zusagenFuer` nicht].

| Cluster | Inhalt | eingeklappt? | Begründung |
|---|---|---|---|
| Kopf | Name; Zeile „geändert … von … · Ordnerpfad (Text)“ | nein | Identität + Aktualität (Frage 4) in einer Zeile. |
| Worum es geht | KI-Zusammenfassung (2 Sätze), Marke einmal | nein | Frage 1 – entscheidet, ob man überhaupt öffnet. |
| Öffnen | Öffnen · Pfad kopieren | nein | Frage 2. |
| Wofür | Zugeordnet (Bereiche, Personen) + offene Zusagen zur Datei | nein | Frage 3; verbindet Datei und Arbeit. |
| Verlauf | Versionen, Änderungen | ab 5 ja | Nachschlagen. |
| Ablage | Ordner verschieben, Umfang, Sichtbar | ja | Selten und folgenreich. |

---

## 8 · Bereich (Gründungsteams, Events, Lehre, Social Media)

**Fragen beim Öffnen eines Eintrags (Beispiel Solaro):** 1. Wo stehen wir (Phase, letzter Kontakt, hängt es)? 2. Was ist offen – was schulden wir, was schuldet man uns, was ist überfällig? 3. Was ist der nächste Schritt, wann ist der nächste Termin? 4. Wer sind die Beteiligten? 5. Was wurde zuletzt besprochen? · selten: Themen, Bezüge, vollständiger Verlauf, Übergabe.

**Ordnung [B]** (Bereich.html Detail): KI-Banner → Kopfzeile „Gründungsteam · Beratungsakte“ → Titel → Felder (= Listenspalten ab Spalte 2: Phase, betreut von, letzter Kontakt) → Übergabe-Status → Aktionen (Übergeben an …, Kollege fragen) → „Wie lief’s?“ → **Nächster Schritt** (Freitext) → *Akte:* Personen → Gespräche (Eingabeformular **über** der Liste) → **Zusagen** → *Akte:* Themen → *sonst:* Notizen-Editor → Bezüge → Verlauf.

**Passt nicht:**
- **Zusagen (Frage 2) stehen an 6. Stelle**, nach Personen und Gesprächen [B].
- **Detailfelder werden aus den Listenspalten abgeleitet** (`B.spalten.slice(1)`, Bereich.js Z. 128). Spalten sind fürs Überfliegen vieler Einträge gewählt, Detailfelder fürs Verstehen eines Eintrags – die Kopplung legt die Detail-Reihenfolge per Listen-Konfiguration fest (Social Media: geplant für, Kanal, Phase, zuständig) [B].
- **„Nächster Schritt“ (Freitext) doppelt die Zusagen.** Solaro: „… dann Termin mit Frau Weber“ steht als Freitext und als Zusage „Kontakt zu Frau Weber vermitteln“; Lehre: „Raum buchen (**überfällig**)“ – ein berechneter Zustand von Hand getippt, der veraltet (Widerspruch zu E27) [B Bereich.js Z. 32, 58].
- **Gespräche und Verlauf doppeln sich:** neu notierte Gespräche werden zusätzlich in den Verlauf geschrieben (Bereich.js Z. 149) [B]. Das Formular steht über den Gesprächen – Schreiben vor Lesen [B].
- „Hängt“ ist nur ein Zusatz im Feld „letzter Kontakt“ [B Bereich.js Z. 131].
- „Übergeben an …“ steht als Select in der ersten Aktionszeile – selten, folgenreich [B].
- **Bereichsspezifischer Gegenstand fehlt:** Social-Media-Beitrag ohne Text/Bild („Text und Bild liegen bereit“, Bereich.js Z. 64); Event ohne die geplante Einladung, die der Chat dort ablegt (Main.js c4 „Einladung als Entwurf bei Events · Gründungsnacht abgelegt“); keine Termine des Eintrags [B].
- `Uebergabe.html` zeigt bereits die richtige Reihenfolge für denselben Eintrag (Stand → Nächster Schritt → Offene Zusagen → Zuletzt) – die Akte selbst nicht [B].

| Cluster | Inhalt | eingeklappt? | Begründung |
|---|---|---|---|
| Kopf | Titel; Zeile Phase (+KI) · zuständig · berechneter Zustand („letzter Kontakt heute“ / „hängt seit 23 Tagen“ / „Übergabe an Julia wartet“) | nein | Frage 1 in einer Zeile; „hängt“ wird sichtbar statt Feldzusatz. |
| Stand | nächster Termin; nächster Schritt = erste offene Zusage „von uns“ (verlinkt) + optionaler Kommentar | nein | Frage 3 ohne zweite Wahrheit neben den Aufgaben (E46). |
| Offen | Zusagen von uns / an uns, überfällig zuerst; erledigte als „3 erledigt“ | erledigte ja | Frage 2 – der Grund, die Akte zu öffnen. |
| Gegenstand (je Bereich) | Akte: Personen + letzte 3 Gespräche, „+ Gespräch“ als Knopf · Event: Datum, Ort, Einladung/Entwurf mit Versandtermin · Beitrag: Text, Bild, Kanal, geplant für · Lehre: Sitzungen, Semester | ältere Gespräche ja | Frage 4/5; jeder Bereich zeigt das Ding, an dem gearbeitet wird. Definiert in `konfig()` getrennt von den Listenspalten. |
| Notizen | Akte: Themen · sonst: Notizen-Editor | ja, wenn leer | Ergänzend. |
| Bezüge | über Bereiche hinweg, KI-Vermutungen gestrichelt | nein, wenn KI-Vermutung offen; sonst ja | Offene Vermutung verlangt Entscheidung (E31). |
| Verlauf | chronologisch, Gespräche nicht doppelt (als Art im Verlauf, filterbar) | ab 5 ja | Ein Ereignis, ein Ort. |
| Verwaltung | Übergeben an …, Wie lief’s (nur bei Endphase sichtbar), Löschen | ja | Selten und folgenreich; „Wie lief’s?“ erscheint ohnehin beim Phasenwechsel. |

---

## 9 · Einstellungen

**Fragen beim Öffnen einer Anweisung:** 1. Was genau gilt? 2. Für wen? 3. Kollidiert sie mit einer anderen? 4. Wirkt sie – wo wurde sie angewandt? 5. Woher kommt sie?

**Ordnung [B]:** Text → Gilt für → Von → Angewandt (= Zahl) → Vorrang (falls) → Herkunft (falls) → Absatz mit allen Vorrangregeln (in jeder Anweisung gleich) → Löschen.

**Passt nicht:** Konflikt (Frage 3) steht nach Von/Angewandt [B]; „Angewandt = N“ ohne Beispiele lässt sich nicht prüfen [B]; der Regelabsatz ist Dauertext, der sich bei jeder Anweisung wiederholt [B].

| Cluster | Inhalt | eingeklappt? | Begründung |
|---|---|---|---|
| Anweisung | Text, Gilt für | nein | Frage 1–2. |
| Konflikt | Vorrang („gilt vor …“) | nein, nur wenn vorhanden | Frage 3; E22 verlangt sichtbare Konflikte. |
| Wirkung | angewandt N, letzte 3 Anwendungen mit Link | nein | Frage 4 prüfbar machen. |
| Herkunft | Von, Datum, Quelle | ja | Nachschlagen. |
| Wie Vorrang entschieden wird | Regelabsatz | ja | Einmal lesen genügt. |
| Verwaltung | Löschen | – | Unverändert am Ende. |

**Quelle (Postfach, Kalender, Netzlaufwerk) [B]:** Status und „Zuletzt“ stehen als 2./3. Feld, die Aktion „Jetzt abgleichen/Verbinden“ unter der Erklärung. Vorschlag: Kopf mit Status + Zuletzt + der einen Aktion; darunter Konto, Liest, Senden, Pfad; Erklärung und Ausschlüsse eingeklappt – Frage 1 ist „funktioniert es?“.

**Bereich-Konfiguration [B]:** Reihenfolge passt (Name, Spalten, Phasen). Ergänzen: eigener Block „Detailansicht“, getrennt von „Spalten“ (folgt aus Befund in §8).

---

## 10 · Übergabe (Ansicht der Empfängerin)

**Fragen:** 1. Was wird mir übergeben und warum? 2. Brennt etwas (heute fällig/überfällig)? 3. Was ist der Stand und der nächste Schritt? 4. Wen muss ich kennen? 5. Annehmen oder nachfragen.

**Ordnung [B]** (Uebergabe.html): Kopf + Nachricht → Stand → Nächster Schritt → Offene Zusagen (Wir / Solaro) → Zuletzt (3 Ereignisse) → Privat-Hinweis → Übernehmen · Rückfrage · Ganze Akte.

**Passt nicht:** Die heute fällige Zusage („Feedback zum Finanzplan … heute“) steckt in der Zusagenliste und ist nicht hervorgehoben [B]; Ansprechpersonen (Lisa, Tom) fehlen – für eine Empfängerin ohne Vorwissen ist das Frage 4 [B]. Sonst die am besten geordnete Ansicht des Prototyps; Vorlage für den Kopf der Akte.

| Cluster | Inhalt | eingeklappt? | Begründung |
|---|---|---|---|
| Kopf | Wer übergibt was, Nachricht | nein | Frage 1. |
| Dringend | heute fällige / überfällige Zusagen | nein, nur wenn vorhanden | Frage 2 – sonst übersieht man beim Annehmen, dass heute etwas fällig ist. |
| Stand & nächster Schritt | Phase, worauf gewartet wird, nächster Schritt, EXIST-Termin | nein | Frage 3. |
| Offene Zusagen | Wir / Gegenseite | nein | Unverändert. |
| Personen | Ansprechpartner:innen mit Rolle | nein | Frage 4. |
| Zuletzt | 3 Ereignisse | nein | Unverändert. |
| Entscheidung | Übernehmen · Rückfrage · Ganze Akte; Privat-Hinweis | nein | Unverändert. |

---

## 11 · Mobil – Übersicht

**Ordnung [B]** (MobilUebersicht.html): Kopf (+ Neuer Chat) → „Beratung Kitchen Loop vorbei – Was kam raus?“ → Datum → Kurz klären → Heute → Wir warten auf → Im Team (zugeklappt) → Eingabe unten fixiert.

**Passt nicht:** Zwei Dinge macht mobil richtig, die Desktop fehlen (zeitbezogener Nachtrag oben, Eingabe unten). Strukturell fehlt aber „Wartet auf uns“ – also gerade der überfällige Punkt (Raumbuchung) –, während das Beobachtungs-Thema „Wir warten auf“ angezeigt wird [B]. (Inhaltsabweichung selbst = bekannt MO3a.)

| Cluster | Inhalt | eingeklappt? | Begründung |
|---|---|---|---|
| Jetzt | laufender oder gerade beendeter Termin mit „Was kam raus?“ | nein | Mobil = Erfassen direkt nach dem Gespräch (README Mobil). |
| Fällig | überfällig + heute fällig | nein | Gleiche Logik wie Desktop-Vorschlag §1.4. |
| Neu & Klären | Neu, niemand zuständig; Klärungen | nein, wenn > 0 | Wie §1.4 Punkt 4. |
| Im Blick | Wir warten auf, Hängt, Hängt bei anderen | ja | Beobachtung. |
| Eingabe | unten fixiert | – | Unverändert. |

---

## 12 · Seitenleiste

*Bewertet gegen die Zielrichtung: einklappbar, „Neuer Chat“ oben, Gruppen einklappbar, Konto unten.*

**Ordnung [B]** (`build.py` NAV/side): „Kollege“ → /heute /chat → Werkzeuge (5) → Bereiche (4) + „+ Bereich“ → Lücke → /einstellungen → „+ Neuer Chat“ → Konto.

| Punkt | Bewertung |
|---|---|
| „Neuer Chat“ oben | Richtig: Chat ist der Eingang (E4); heute steht er unter zwölf Navigationspunkten. Folge für Heute: die große Eingabe dort wird zur zweiten, gleichwertigen Tür → stützt Vorschlag §1.4 Punkt 8 (kompakt). |
| Gruppen einklappbar | Sinnvoll für **Bereiche** (wachsen, E29/E33); für Werkzeuge (fest 5) bringt es wenig [A]. Zustand je Person merken. |
| „+ Bereich“ in der Navigation | Passt nicht: eine seltene Einrichtungsaktion (E33) als Navigationspunkt. Besser im Menü des Gruppenkopfs „Bereiche“ oder nur in Einstellungen. |
| Konto unten | Richtig; Einstellungen dorthin ziehen (Konto-Menü) – spart einen Punkt und die Lücke. |
| Reihenfolge Werkzeuge vor Bereiche | Offen [A]: Das Team denkt in Einträgen („bei Solaro“, E29) – Bereiche oben würde dem folgen; Mail ist vermutlich der häufigste Einzelpunkt. Im Test messen (offene Frage „Zwölf Navigationspunkte“). |

---

## Seitenübergreifende Muster

Diese Regeln gelten für jede Detailansicht (rechte Spalte, Seitenpanel, Blatt):

1. **Reihenfolge folgt den Fragen, nicht dem Datenmodell.** Immer: Kopf (was ist das – eine Zeile mit berechnetem Zustand) → was jetzt offen/fällig ist → der Gegenstand selbst (Text, Datei, Personen, Nachrichten) → Zuordnung → Verlauf → Verwaltung. Detailfelder werden nie aus Listenspalten oder Formularreihenfolge abgeleitet.
2. **Höchstens fünf sichtbare Felder ohne Gruppe; Seltenes eingeklappt am Ende.** Ein Cluster „Weitere“/„Verwaltung“ nimmt alles auf, was beim Öffnen fast nie gebraucht wird (Wiederholung, Sichtbarkeit, Ordner, Richtung, Listen, Kontakt über, Übergeben, Löschen). Ausnahme: Eine offene KI-Vermutung klappt ihren Cluster auf, weil sie eine Entscheidung verlangt.
3. **Jede Aktion genau einmal, am Inhalt, auf den sie wirkt.** Eine Hauptaktion pro Ansicht, sichtbar; nach außen wirkende Aktionen (Senden, Einladen, Änderung senden) stehen neben dem Status-Satz, der sie auslöst; Löschen und Seltenes im Menü.
4. **Offene Zusagen erscheinen überall, wo ein Bezug besteht.** Mail, Termin, Kontakt, Datei und Bereich zeigen denselben Baustein „Offen“ (max. 3, überfällig zuerst, „alle“-Link). Das beantwortet in jeder Ansicht „muss ich dazu etwas tun?“ und macht E46 (ein Datenbestand) sichtbar.
5. **Ein Ding, ein Ort.** Berechnetes (überfällig, hängt, letzter Kontakt) nie als Freitext; ein Ereignis steht im Verlauf **oder** in einer Teilliste, nicht in beiden; „Nächster Schritt“ verweist auf eine Aufgabe statt sie nachzuerzählen.
6. **Zeitbezug bestimmt die Reihenfolge; Erklärtexte sind keine Dauerinhalte.** Vor einer Frist/einem Termin zuerst Vorbereitung, danach zuerst „Was kam raus?“. Regeln und Bedienhinweise („Eingaben öffnen einen Chat …“, Vorrangregeln) stehen eingeklappt oder als Tooltip.
