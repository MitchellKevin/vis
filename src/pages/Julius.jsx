import { useEffect } from 'react';
import Nav from '../components/Nav.jsx';
import EmblaCarousel from '../components/carousel/EmblaCarousel.jsx';
import Pond from '../components/pond/Pond.jsx';
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
  useStylesheet('/styles/EmblaCarousel.css');
  useStylesheet('/styles/pond.css');
  useStylesheet('/styles/clock.css');

  return (
    <>
      <Nav current="julius" />

      <main className="julius-main">
        <EmblaCarousel />
        <Pond />
        <Clock />
      </main>
    </>
  );
}
