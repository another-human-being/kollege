# Aussage

Eine Zeile Wissen mit sichtbarer Herkunftsart. Das Kernstück des Systems: jede Begründung eines Hinweises ist eine Aussage.

| `art` | Zeichen | Stimme | Wann |
| --- | --- | --- | --- |
| `belegt` | ▪ | Sans, `ink` | steht so in Mail, Notiz, Termin, Datei. Immer mit `quelle`. |
| `berechnet` | = | Mono, `ink` | aus Belegen abgeleitet: Fristen, Abstände, Zählungen. Nachprüfbar. |
| `einschaetzung` | ~ + „KI-Vermutung“ | Serif kursiv, `ink-muted` | Deutung der KI, ungeprüft. Darf irren. |

- Konsument gibt `art`, Text als Kinder, `quelle` (Pflicht bei `belegt`), optional `dringend` (färbt `attention`).
- Die Unterscheidung trägt die Schrift, nicht die Farbe – lesbar auch in Graustufen und für Farbfehlsichtige. Screenreader hören „belegt:“, „berechnet:“, „Einschätzung:“.
- Jede Einschätzung trägt die gestrichelte Marke „KI-Vermutung“ (Komponente `Vermutung`). Das ist die einzige Bezeichnung für Ungeprüftes im ganzen System – nicht „Einschätzung“, „Prognose“ oder „Vorschlag“. `marke={false}` nur, wenn die Marke schon in derselben Zeile steht.
- Faktische Aussagen verlinken ihre Quelle (`quelle` + `quelleHref`/`onQuelle` öffnet Mail, Notiz oder Vorgang).
- Nie Einschätzungen als belegt formulieren. „Solaro ist abgesprungen“ ohne Quelle ist verboten; richtig: `~ Solaro wirkt abgesprungen`.
- Berechnete Aussagen nennen Zahl und Einheit ausgeschrieben: „seit 9 Tagen“, nicht „9d“.
