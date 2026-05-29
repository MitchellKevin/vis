import { useEffect, useRef } from 'react';
import Nav from '../components/Nav.jsx';
import { initMitchell } from '../scripts/mitchell.js';
import '../styles/mitchell.css';
import '../styles/mitchell-week1.css';

function FishSprite() {
  return (
    <svg className="fish-sprite" aria-hidden="true" width="0" height="0">
      <defs>
        <symbol id="fish-round" viewBox="0 0 44 18">
          <path d="M4 9 C6 4.5 14 2.5 23 3.2 C30 3.7 34.5 5.6 37 9 C34.5 12.4 30 14.3 23 14.8 C14 15.5 6 13.5 4 9 Z M37 9 L43 4 L41 9 L43 14 Z" fill="currentColor" />
          <circle cx="12" cy="8" r="1.1" fill="rgba(1,70,60,0.45)" />
        </symbol>
        <symbol id="fish-baars" viewBox="0 0 44 18">
          <path d="M4 9 C6 4.5 14 2.5 23 3.2 C30 3.7 34.5 5.6 37 9 C34.5 12.4 30 14.3 23 14.8 C14 15.5 6 13.5 4 9 Z M37 9 L43 4 L41 9 L43 14 Z M18 3.6 L22 0.6 L26 4 Z" fill="currentColor" />
          <circle cx="12" cy="8" r="1.1" fill="rgba(1,70,60,0.45)" />
        </symbol>
        <symbol id="fish-pred" viewBox="0 0 44 18">
          <path d="M2 9 C7 5.5 16 4 27 4.6 C32 4.9 35 6.3 36.5 9 C35 11.7 32 13.1 27 13.4 C16 14 7 12.5 2 9 Z M36.5 9 L43 5 L41.5 9 L43 13 Z" fill="currentColor" />
          <circle cx="10" cy="8.2" r="1" fill="rgba(1,70,60,0.45)" />
        </symbol>
        <symbol id="fish-long" viewBox="0 0 44 18">
          <path d="M2 9 C8 7 18 6.4 28 6.8 C33 7 36 7.8 38 9 C36 10.2 33 11 28 11.2 C18 11.6 8 11 2 9 Z M38 9 L43 6.5 L41.5 9 L43 11.5 Z" fill="currentColor" />
          <circle cx="9" cy="8.4" r="0.9" fill="rgba(1,70,60,0.45)" />
        </symbol>
        <symbol id="fish-tiny" viewBox="0 0 44 18">
          <path d="M14 9 C15.5 6.5 20 5.5 25 5.9 C28.5 6.2 31 7.2 32.5 9 C31 10.8 28.5 11.8 25 12.1 C20 12.5 15.5 11.5 14 9 Z M32.5 9 L37 6.5 L35.5 9 L37 11.5 Z" fill="currentColor" />
        </symbol>
      </defs>
    </svg>
  );
}

export default function Mitchell() {
  const initialized = useRef(false);

  useEffect(() => {
    document.body.classList.add('mitchell-page');
    return () => document.body.classList.remove('mitchell-page');
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const cleanup = initMitchell();
    return cleanup;
  }, []);

  return (
    <>
      <Nav current="mitchell" />
      <FishSprite />

      <div className="data-switch" role="group" aria-label="Kies dataset: week, maand of jaar">
        <button type="button" className="data-switch__btn" data-period="week" aria-pressed="false">Week</button>
        <button type="button" className="data-switch__btn is-active" data-period="maand" aria-pressed="true">Maand</button>
        <button type="button" className="data-switch__btn" data-period="jaar" aria-pressed="false">Jaar</button>
      </div>

      <div className="fish-tooltip" id="fishTooltip" role="status" aria-live="polite"></div>

      <section id="ch-hero" className="chapter chapter--hero chapter--dark" aria-label="Intro">
        <div className="hero-stage" id="heroStage" aria-hidden="true"></div>
        <div className="hero-overlay">
          <p className="hero-eyebrow">De Visdeurbel in cijfers</p>
          <h1 className="hero-title"><span id="heroCount">0</span></h1>
          <p className="hero-sub">keer ging de bel · <span id="heroPeriod">…</span></p>
          <p className="hero-lede">Duizenden mensen drukken op de knop om een vis door de sluis te helpen. Samen vormen ze één grote vis — scroll en laat ze los.</p>
          <div className="hero-scroll" aria-hidden="true"><span className="hero-scroll-dot"></span>scroll</div>
        </div>
      </section>

      <section id="ch-ring" className="chapter" aria-label="Ringkalender">
        <div className="chapter-inner">
          <div className="chapter-text">
            <p className="eyebrow reveal">Ringkalender</p>
            <h2 className="reveal">Elke stip is een uur.</h2>
            <p className="lede reveal">Elke gloed is een hartslag van de sluis. Hoe groter en lichter, hoe vaker er dat uur op de knop werd gedrukt.</p>
          </div>
          <div className="ring-stage" id="ringStage" aria-label="Cirkelvormige kalender van uren"></div>
        </div>
      </section>

      <section id="ch-tide" className="chapter chapter--dark" aria-label="24-uurs ritme">
        <div className="chapter-inner">
          <div className="chapter-text">
            <p className="eyebrow reveal">24-uurs getij</p>
            <h2 className="reveal">Het tij van de sluis.</h2>
            <p className="lede reveal">Wanneer drukt de wereld op de knop? Over de hele maand stijgt en daalt het verkeer als een getij.</p>
            <p className="chapter-stat reveal" id="tideStat" aria-live="polite"></p>
          </div>
          <div className="tide-stage" id="tideStage" aria-label="Cirkelvormige 24-uurs klok"></div>
        </div>
      </section>

      <section id="ch-weekday" className="chapter" aria-label="Weekend versus doordeweeks">
        <div className="chapter-inner chapter-inner--wide">
          <div className="chapter-text">
            <p className="eyebrow reveal">Weekend of werkdag</p>
            <h2 className="reveal">Twee getijden.</h2>
            <p className="lede reveal">Belt het weekend op een ander ritme dan een doordeweekse dag? De twee curves vertellen het.</p>
            <p className="chapter-stat reveal" id="weekdayStat" aria-live="polite"></p>
          </div>
          <div className="weekday-stage" id="weekdayStage" aria-label="Bel oproepen per uur: weekend versus doordeweeks"></div>
        </div>
      </section>

      <section id="ch-peaks" className="chapter" aria-label="Piekdagen">
        <div className="chapter-inner chapter-inner--wide">
          <div className="chapter-text">
            <p className="eyebrow reveal">Piekdagen</p>
            <h2 className="reveal">Eén maand, een paar uitbarstingen.</h2>
            <p className="lede reveal">Bel oproepen komen niet gelijkmatig binnen. Op sommige dagen barst het los.</p>
            <p className="chapter-stat reveal" id="peaksStat" aria-live="polite"></p>
          </div>
          <div className="peaks-stage" id="peaksStage" aria-label="Dagelijkse bel oproepen over de maand"></div>
        </div>
      </section>

      <section id="ch-world" className="chapter chapter--dark" aria-label="Wereldkaart">
        <div className="chapter-inner chapter-inner--wide">
          <div className="chapter-text">
            <p className="eyebrow reveal">Wereldkaart</p>
            <h2 className="reveal">De hele wereld belt aan.</h2>
            <p className="lede reveal">Eén Utrechtse sluis, <strong id="worldCountryCount">159</strong> landen die meekijken. Van Polen tot de Filipijnen drukt iedereen mee op de knop.</p>
            <p className="world-stat reveal" id="worldStat" aria-live="polite"></p>
          </div>
          <div className="world-stage" id="worldStage" aria-label="Wereldkaart met bel oproepen per land"></div>
        </div>
      </section>

      <section id="ch-languages" className="chapter" aria-label="Talen">
        <div className="chapter-inner">
          <div className="chapter-text">
            <p className="eyebrow reveal">Het koor van talen</p>
            <h2 className="reveal">Hallo, Cześć, 你好.</h2>
            <p className="lede reveal">De sluis spreekt vele talen tegelijk. Elk woord is een groet, zo groot als het aantal bezoekers dat zo binnenkwam.</p>
            <p className="chapter-stat reveal" id="langStat" aria-live="polite"></p>
          </div>
          <div className="lang-stage" id="langStage" aria-label="Drijvende begroetingen per taal"></div>
        </div>
      </section>

      <section id="ch-globe" className="chapter chapter--dark" aria-label="Draaiende globe">
        <div className="chapter-inner">
          <div className="chapter-text">
            <p className="eyebrow reveal">De avond reist</p>
            <h2 className="reveal">De bel volgt de schemering.</h2>
            <p className="lede reveal">Het drukste uur is overal hetzelfde lokale moment. Kijk hoe de avondpiek met de draaiing van de aarde de wereld rondreist.</p>
          </div>
          <div className="globe-stage" id="globeStage" aria-label="Draaiende wereldbol met bel oproepen"></div>
        </div>
      </section>

      {/* <section id="ch-funnel" className="chapter" aria-label="De belstroom">
        <div className="chapter-inner">
          <div className="chapter-text">
            <p className="eyebrow reveal">De belstroom</p>
            <h2 className="reveal">Aanbellen of toch afhaken?</h2>
            <p className="lede reveal">Niet elke gespotte vis wordt gemeld. Voor elke vijf keer dat iemand twijfelt en wegklikt, gaat er één keer écht de bel.</p>
          </div>
          <div className="funnel-stage" id="funnelStage" aria-label="Stroomdiagram van meldingen naar bel oproepen"></div>
          <div className="funnel-legend" id="funnelLegend"></div>
        </div>
      </section>

      <section id="ch-fanatics" className="chapter chapter--dark" aria-label="De fanatici">
        <div className="chapter-inner">
          <div className="chapter-text">
            <p className="eyebrow reveal">De fanatici</p>
            <h2 className="reveal">Wie belt het vaakst?</h2>
            <p className="lede reveal">De meeste bezoekers bellen één keer en zwaaien de vis uit. Maar een handjevol blijft maar drukken.</p>
            <p className="chapter-stat reveal" id="fanaticsStat" aria-live="polite"></p>
          </div>
          <div className="fanatics-stage" id="fanaticsStage" aria-label="Bel oproepen per bezoek"></div>
        </div>
      </section> */}

      <section id="ch-shoal" className="chapter" aria-label="Apparaten">
        <div className="chapter-inner">
          <div className="chapter-text">
            <p className="eyebrow reveal">Door welk schermpje?</p>
            <h2 className="reveal">Een school van apparaten.</h2>
            <p className="lede reveal">Waarmee kijk je mee? Van telefoon tot smart-tv — en zelfs rechtstreeks vanuit Instagram en Facebook zwemt het verkeer binnen.</p>
            <p className="shoal-stat reveal" id="shoalStat" aria-live="polite"></p>
          </div>
          <div className="shoal-stage" id="shoalStage" aria-label="Bellen per browser en apparaat"></div>
          <div className="shoal-legend" id="shoalLegend"></div>
        </div>
      </section>

      {/* <section id="ch-screens" className="chapter chapter--dark" aria-label="Schermen">
        <div className="chapter-inner">
          <div className="chapter-text">
            <p className="eyebrow reveal">Schermen-aquarium</p>
            <h2 className="reveal">Door wat voor schermpje?</h2>
            <p className="lede reveal">Elk venster is een schermformaat dat naar de sluis tuurt — van staande telefoon tot breed bureaublad.</p>
            <p className="chapter-stat reveal" id="screensStat" aria-live="polite"></p>
          </div>
          <div className="screens-stage" id="screensStage" aria-label="Schermresoluties als vensters"></div>
          <div className="shoal-legend" id="screensLegend"></div>
        </div>
      </section>

      <section id="ch-aquarium" className="chapter" aria-label="Aquarium">
        <div className="chapter-inner chapter-inner--wide">
          <div className="chapter-text">
            <p className="eyebrow reveal">Kijkglas</p>
            <h2 className="reveal">Dit is hoe <span id="aquariumTotal">…</span> waarnemingen er ongeveer uitzien.</h2>
            <p className="lede reveal">Niet allemaal tegelijk natuurlijk — een steekproef, elk met een eigen koers, tempo en verhaal.</p>
          </div>
          <div className="aquarium-stage" id="aquariumStage" aria-label="Vissen die rondzwemmen"></div>
          <div className="aquarium-filters" id="aquariumFilters" role="group" aria-label="Filter vissoorten"></div>
          <p className="aquarium-tip">Tip — klik in het aquarium om de vissen te laten schrikken.</p>
        </div>
      </section>

      <section id="ch-net" className="chapter chapter--dark" aria-label="Het net">
        <div className="chapter-inner">
          <div className="chapter-text">
            <p className="eyebrow reveal">Het net</p>
            <h2 className="reveal">Als we ze allemaal in één net zouden vangen…</h2>
            <p className="lede reveal">…wie zou er dan het zwaarst uitkomen? Een handvol meervallen weegt op tegen een hele school blankvoorns.</p>
          </div>
          <div className="net-controls-wrap">
            <span className="net-controls-label">Bekijk op</span>
            <div className="net-toggle" role="tablist" aria-label="Verdeling op">
              <button type="button" className="net-toggle-btn" data-stat="count" role="tab" aria-selected="false">Aantal</button>
              <button type="button" className="net-toggle-btn active" data-stat="biomass" role="tab" aria-selected="true">Biomassa</button>
              <button type="button" className="net-toggle-btn" data-stat="weight" role="tab" aria-selected="false">Gewicht / vis</button>
            </div>
          </div>
          <div className="net-stage" id="netStage" aria-label="Bubbel-diagram per soort"></div>
          <div className="net-info" id="netInfo" aria-live="polite">Klik op een bubbel voor details, of wissel hierboven van weergave.</div>
        </div>
      </section> */}

      <section id="ch-radar" className="chapter chapter--dark" aria-label="Visradar">
        <div className="chapter-inner">
          <div className="chapter-text">
            <p className="eyebrow reveal">Sonar</p>
            <h2 className="reveal">Wat zwemt er onder de sluis?</h2>
            <p className="lede reveal">We zien meer dan je denkt. De radar tikt door en bij elke draai licht weer een soort op.</p>
          </div>
          <div className="radar-stage" id="radarStage" aria-label="Radar met opflitsende vissoorten">
            <div className="radar-detail-panel" id="radarDetail" role="status" aria-live="polite"></div>
          </div>
        </div>
      </section>

      {/* <section id="ch-depth" className="chapter chapter--dark" aria-label="Dieptewereld">
        <div className="chapter-inner">
          <div className="chapter-text">
            <p className="eyebrow reveal">Onder het oppervlak</p>
            <h2 className="reveal">Elke soort op zijn eigen diepte.</h2>
            <p className="lede reveal">Sommige vissen scheren langs het oppervlak, andere kruipen over de bodem. Beweeg over een vis en hij licht op in het donker.</p>
          </div>
          <div className="depth-stage" id="depthStage" aria-label="Vissoorten op hun waterdiepte">
            <div className="depth-detail" id="depthDetail" role="status" aria-live="polite"></div>
          </div>
        </div>
      </section> */}

      {/* <section id="ch-pond" className="chapter chapter--dark" aria-label="Levende sluis">
        <div className="chapter-inner">
          <div className="chapter-text">
            <p className="eyebrow reveal">De levende sluis</p>
            <h2 className="reveal">Een week in zestig seconden.</h2>
            <p className="lede reveal">Elke rimpeling is één belroep, op het exacte moment dat hij gebeurde. Zie de sluis ademen: stil in de nacht, een stortbui rond etenstijd.</p>
          </div>
          <div className="pond-stage" id="pondStage" aria-label="Rimpelingen die bel oproepen door de week tonen"></div>
        </div>
      </section> */}
    </>
  );
}
