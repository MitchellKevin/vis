import { useEffect } from 'react';
import Nav from '../components/Nav.jsx';
import EmblaCarousel from '../components/carousel/EmblaCarousel.jsx';
import '../styles/Julius.css';

function useBodyClass(cls) {
  useEffect(() => {
    document.body.classList.add(cls);
    return () => document.body.classList.remove(cls);
  }, [cls]);
}

export default function Julius() {
  useBodyClass('julius-page');

  return (
    <>
      <Nav current="julius" />

      <main className="julius-main">
        <EmblaCarousel />
      </main>
    </>
  );
}
