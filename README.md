# Diashow

Eine kleine, komplett clientseitige Galerie mit konfigurierbarer Vollbild-Diashow und dunklem Editorial-Design. Bilder, Ordner und ZIP-Archive werden lokal im Browser eingelesen und bleiben ausschließlich im Arbeitsspeicher des Tabs. Nur die Diashow-Einstellungen werden lokal gespeichert.

## Starten

Es gibt keinen Build-Schritt und keine Abhängigkeiten. Am einfachsten über einen lokalen statischen Server:

```bash
cd fluechtige-galerie
python3 -m http.server 8000 --bind 127.0.0.1
```

Danach `http://127.0.0.1:8000` öffnen.

Ein direkter Aufruf der `index.html` funktioniert für Dateiauswahl, ZIPs und Ordner ebenfalls. Der **Einfügen-Button** benötigt allerdings die Clipboard-API, die nur in sicheren Kontexten (HTTPS oder `localhost`) freigeschaltet ist. **Strg+V** funktioniert in der Regel auch ohne Server.

## Bedienung

- Oben rechts führen zwei Pfeil-Buttons an den Seitenanfang bzw. das Seitenende.
- **Bilder & ZIPs**: Mehrfachauswahl von Bildern und ZIP-Archiven.
- **Ordner**: rekursives Einlesen eines kompletten Verzeichnisses inklusive Unterordnern und darin liegender ZIPs.
- **Einfügen**: liest Bilder oder ZIP-Dateien aus der Zwischenablage.
- **Strg+V**: fügt Dateien aus der Zwischenablage direkt ein.
- **Drag & Drop**: Dateien und Ordner können auch auf die Seite gezogen werden.
- Klick auf ein Bild öffnet die Vollbildansicht. Mit `←` / `→` wechseln, mit `Esc` schließen. Der **Diashow**-Button in der Lightbox startet die Diashow direkt beim aktuellen Bild.
- Die Thumbnails zeigen immer das vollständige Bild (Fit Size, kein Zuschneiden).
- Über das × auf einer Karte oder **Leeren** lassen sich Bilder aus dem Speicher entfernen.

## Diashows

Der **Diashow**-Button in der Werkzeugleiste startet die Vollbild-Diashow direkt. Das Setup liegt jetzt innerhalb der Diashow und lässt sich über den Regler-Button oben rechts öffnen.

| Einstellung | Optionen | Standard |
| --- | --- | --- |
| **Transition** | Off, Fade Black, Crossfade, Slide, Zoom, Flip, Wipe, Random | Fade Black |
| **Zoom** | Off, In, Out, Random | In |
| **Move** | Off, Left, Right, Up, Down, Pan, Random | Off |
| **Bilder gleichzeitig** | 1–21, Random 1–21, Random 1–3, Random 3–5, Random 3–7 | 1 |
| **Intervall** | 3, 4, 5, 6, 8, 10, 15, 20 Sekunden | 6 Sekunden |
| **Layout** | Grid, Masonry, Carousel, Stack, Random | Grid |

Änderungen im Setup wirken sofort und werden im `localStorage` gespeichert, sodass sie ein Neuladen der Seite überstehen. Der laufende Intervall-Countdown wird dabei nicht neu gestartet. **Random** wird pro Bild aufgelöst: Zoom wechselt zwischen In und Out, Move verwendet unterschiedliche Richtungen, die Bildanzahl und das Layout können pro Szene variieren und Transitions werden bei jedem Wechsel neu gewählt.

Die Diashow läuft automatisch weiter. Über den Button oder **Leertaste** lässt sie sich pausieren und fortsetzen; mit `←` / `→` kann man manuell wechseln, mit `Esc` beendet man sie. Das Setup schließt sich mit `Esc` zuerst, bevor die Diashow beendet wird. Der Fortschrittsbalken unten zeigt die Zeit bis zum nächsten Wechsel. Bei nur einem Bild bleibt die Ansicht statisch, die Navigation ist dann deaktiviert.

Das Diashow-UI wird nach **5 Sekunden Inaktivität** ausgeblendet. Mausbewegung, Klick, Scrollen, Tastendruck oder Touch blenden es wieder ein.

Zusätzliche Buttons in der Diashow:

- **Setup** (Regler): öffnet die Transition-, Zoom-, Move-, Bilder-, Intervall- und Layout-Einstellungen.
- **Shuffle**: aktiviert eine zufällige Reihenfolge und behält das aktuelle Bild als Ausgangspunkt.
- **Fit Size**: zeigt das vollständige Bild statt eines bildfüllenden Ausschnitts. Transitionen, Zoom und Move wirken weiterhin.
- **Movement-Bypass**: setzt Zoom, Move und den Carousel-Lauf aus (standardmäßig aus, aktiv mit rotem Icon).
- **Pause/Play** und **Beenden**.

Mit einer horizontalen Wischgeste auf Touch-Geräten lässt sich die Diashow nach links oder rechts wechseln.

Zoom und Move laufen als endlose Hin-und-zurück-Bewegung weiter, auch wenn die Diashow pausiert ist. Das Carousel läuft als endlose Schleife mit konstanter Geschwindigkeit, unabhängig von der Bildanzahl. Im Stack-Layout werden die Bilder von hinten nach vorn kleiner und nach rechts unten versetzt, sodass die dahinterliegenden Bilder sichtbar bleiben.

## Verarbeitungsregeln

Unterstützt werden **JPG/JPEG, PNG, WebP und GIF**. Andere Dateitypen werden übersprungen.

Beim Import gilt:

- Bilder, die **breiter als 1600 px** sind **oder größer als 200 KB** sind, werden zu **WebP** konvertiert.
- Ist das Bild breiter als 1600 px, wird es auf **maximal 1600 px Breite** herunterskaliert. Hochskaliert wird nie.
- Kleinere Bilder bleiben im Originalformat und unverändert.
- GIFs werden nur dann zu WebP konvertiert, wenn sie die Grenzwerte überschreiten. Dabei wird das erste Frame als statisches WebP übernommen; die Animation geht in diesem Fall verloren.

ZIP-Archive werden über ihr zentrales Verzeichnis gelesen. Unterstützt werden unkomprimierte und deflate-komprimierte Einträge (`store` und `deflate`) sowie verschachtelte ZIP-Dateien bis zu einer Tiefe von 5. Verschlüsselte ZIPs und ZIP64-Archive werden übersprungen. Ordnerstrukturen innerhalb von ZIPs bleiben im angezeigten Pfad erhalten.

## Datenschutz

- Keine Uploads, keine externen Ressourcen, keine Cookies.
- Bilder liegen nur als Blobs und Object-URLs im Arbeitsspeicher und werden nicht dauerhaft gespeichert.
- Nur die Diashow-Einstellungen (Transition, Zoom, Move, Bildanzahl, Intervall, Layout) werden lokal im `localStorage` abgelegt.
- Beim Neuladen oder Schließen des Tabs verschwinden alle Bilder; die Diashow-Einstellungen bleiben erhalten.
- Pro Import werden maximal 4000 Bilder verarbeitet, um den Speicher zu schützen.

## Große Sammlungen

- Die Galerie ist **virtualisiert**: Nur die sichtbaren Karten plus ein kleiner Puffer liegen im DOM. Die Scrollhöhe wird aus der Gesamtzahl berechnet, sodass beliebig weit gescrollt werden kann.
- Während eines Massenimports werden Galerie-Updates gedrosselt, der Fortschritt bleibt live. Nach Abschluss folgt ein finaler Render.
- Karten verwenden feste, berechnete Positionen und werden beim Scrollen wiederverwendet, wenn sie sichtbar bleiben.
- Getestet mit **2.000 Bildern** auf Desktop und Mobile sowie mit der Diashow über die gesamte Sammlung.

## Dateien

| Datei | Zweck |
| --- | --- |
| `index.html` | Struktur und Bedienelemente |
| `styles.css` | komplettes Dark-Theme und Responsive-Layout |
| `app.js` | Import, ZIP-Parser, Zwischenablage, WebP-Optimierung, virtualisierte Galerie, Lightbox, Diashow |
| `favicon.svg` | Icon |

Getestet mit Chromium. Für komprimierte ZIPs wird `DecompressionStream('deflate-raw')` benötigt; aktuelle Versionen von Chromium, Firefox und Safari unterstützen das.
