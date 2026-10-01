# Klaerung

Eine unsichere Zuordnung als konkrete Frage mit Antwortknöpfen. Erscheint direkt in der Übersicht (Abschnitt „Kurz klären“) und im Chat, wenn die Unsicherheit gerade entsteht – keine eigene Seite.

- Konsument gibt `frage` (ganze Frage mit Namen), `grund` (warum unsicher – als Einschätzung), `quelle`, `antworten` (2–3), `onAntwort`.
- Die erste Antwort ist die wahrscheinlichste, aber alle Knöpfe sind gleich gewichtet (`sekundaer`) – das System drängt nicht.
- Nach der Antwort: „✓ Zugeordnet zu …“ mit ↶ Rückgängig (`onRueckgaengig(alteAntwort)`). Rückgängig wirkt auf alles, was von der Antwort abhängt: ein abhängiger `Entwurf` ist danach wieder gesperrt. Die Frage verschwindet beim nächsten Laden.
- Antworten im ganzen System gleich: „Ja“ · „Andere Person“ · „Neu anlegen“. „Andere Person“ verwirft abhängige Entwürfe mit einem Satz Erklärung; „Neu anlegen“ hält sie gesperrt, bis der Kontakt angelegt ist.
- Nie mehr als eine Frage pro Beleg. Fragen, die niemand beantwortet, verfallen nach 14 Tagen still.
