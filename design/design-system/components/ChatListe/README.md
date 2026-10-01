# ChatListe

Seitenleiste mit dem Chatverlauf: „Neuer Chat“, Suche, angepinnte und frühere Chats.

- Konsument gibt `chats` (`[{id, titel, datum, etikett, angepinnt, aktiv, href}]`), `onNeu` oder `neuHref`, `onOeffnen(id)`, `onPin(id)`, `onLoeschen(id)`.
- Titel entstehen automatisch aus dem ersten Satz, kurz, ohne Punkt. Datum relativ („heute“, „gestern“), sonst `28.09.`.
- Gehört ein Chat zu einem Vorgang oder einer Person, trägt er deren Namen als kleines Etikett.
- Anpinnen und Löschen erscheinen beim Überfahren oder Fokussieren. Löschen hat danach „Rückgängig“ in der Seite (nicht in der Liste).
- Unten der Hinweis mit Schloss: Chats sind persönlich. Was im Chat im Record landet (Zusagen, Notizen), sieht das Team – das zeigen die Karten.
