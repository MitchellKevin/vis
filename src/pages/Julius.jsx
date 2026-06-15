import { useEffect } from 'react';
import Nav from '../components/Nav.jsx';
import Clock from '../components/clock/Clock.jsx';
import { useStylesheet } from '../hooks/useStylesheet.js';

function useBodyClass(cls) {
  useEffect(() => {
    document.body.classList.add(cls);
    return () => document.body.classList.remove(cls);
  }, [cls]);
}

export default function Julius() {
  useBodyClass('julius-page');
  useStylesheet('/styles/Julius.css');
  useStylesheet('/styles/clock.css');

  return (
    <>
      <Nav current="julius" />

      <header className="julius-header">
        <div className="julius-header__inner">
          <p className="julius-header__eyebrow">Tijd &amp; drukte</p>
          <h1>Wanneer gaat de <em>bel</em>?</h1>
          <p className="julius-header__sub">
            Een etmaal visdeurbel — van het rustige holst van de nacht tot de
            drukste uren, uur voor uur en minuut voor minuut.
          </p>
        </div>
        <div className="julius-header__deco" aria-hidden="true">🐟🐠🐡</div>
      </header>

      <main className="julius-main">
        <Clock />
      </main>

      <footer className="julius-footer">
        <div className="julius-footer__brand">
          <span className="julius-footer__logo" aria-hidden="true">🐟</span>
          <strong>Visdeurbel</strong>
        </div>
        <p className="julius-footer__tagline">Druk op de Visdeurbel als je een vis ziet</p>
        <p className="julius-footer__copy">© 2026 Visdeurbel · Meesterproef Minor Web</p>
      </footer>
    </>
  );
}
