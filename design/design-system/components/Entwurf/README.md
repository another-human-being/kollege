# Entwurf

Alles, was die Organisation verlässt – Mail, Einladung, Post – erscheint nur als fertiger Entwurf mit „Ansehen“ und „Senden“.

- Konsument gibt `kanal` (Mail/Einladung/Beitrag), `an`, `betreff`, `auszug` (zwei Zeilen), `grund` (eine `Aussage`), `onAnsehen`, `onSenden`.
- Gerahmt (`line-control`, `radius-2`, `paper-sunk`): Grenzobjekt, „geht nach außen“. Rahmen haben sonst nur Eingaben und gestrichelte KI-Vermutungen (E42).
- Der Primärknopf heißt „Über mein Postfach senden“: die Mail geht vom eigenen Konto (`von`) und liegt danach im normalen Gesendet-Ordner. Die Zeile darunter sagt das (`hinweis`). „Ansehen“ ist `sekundaer`.
- Später erscheint die Mail im Verlauf wie jede andere, nur mit Herkunft „über Kollege“.
- „Ansehen“ öffnet ein Blatt (`shadow-sheet`) mit dem vollen Text, editierbar, gleiche zwei Knöpfe.
- Nach dem Senden: „Wird gesendet an … – 10 s zurückholbar“. Rückgängig ist nur ehrlich, solange die Mail noch nicht raus ist (E43). Danach nur noch im Verlauf.
- `gesperrt`: hängt der Entwurf an einer offenen `Klaerung`, sind „Ansehen“ und „Senden“ `disabled` und der Hinweis sagt, worauf er wartet (`gesperrtText`). Nicht nur blass – per Tastatur darf nichts gehen.
- Geplanter Versand: `hinweis` „Geht am Fr 09.10., 9:00 über dein Postfach raus“, `sendenText` „Jetzt senden statt 09.10.“. Der Knopf tut immer genau, was draufsteht.
- Im Blatt „Entwurf ansehen“ kommt der Kopf aus dem Kanal; der Hinweis „Ton wie in deinen letzten Mails an diese Person“ nur bei einzelnen Empfänger:innen, nie bei Verteilern.
- Absender ist immer ein Mensch; der Entwurf schreibt in dessen Namen und Ton.
