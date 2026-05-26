import { useRef, useState, useEffect } from 'react';
import Nav from '../components/Nav.jsx';
import '../styles/Julius.css';

const FISH_DATA = [
  {
    naam: 'Snoekbaars',
    latijn: 'Sander lucioperca',
    waarnemingen: '2.847',
    beschrijving:
      'Een slanke, snelle roofvis herkenbaar aan zachte donkere strepen langs het lichaam. De snoekbaars is nachtactief en migreert in het voorjaar naar paaigronden. Zeer geliefd bij sportvissers.',
    lengte: '40–100 cm',
    gewicht: 'tot 15 kg',
    habitat: 'Meren, grote rivieren',
    afbeelding: '/assets/snoekbaars.svg',
    alt: 'Snoekbaars',
  },
];

const SLIDES = Array.from({ length: 12 }, (_, i) => FISH_DATA[i % FISH_DATA.length]);

export default function Julius() {
  const carouselRef = useRef(null);
  const popoverRef = useRef(null);
  const [activeAcc, setActiveAcc] = useState({});
  const [selectedFish, setSelectedFish] = useState(null);

  function step() {
    const carousel = carouselRef.current;
    const slide = carousel.querySelector('.slide');
    return slide.offsetWidth + parseFloat(getComputedStyle(carousel).gap);
  }

  function handleNext() {
    const carousel = carouselRef.current;
    const atEnd = carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 4;
    carousel.scrollTo({ left: atEnd ? 0 : carousel.scrollLeft + step(), behavior: 'smooth' });
  }

  function handlePrev() {
    const carousel = carouselRef.current;
    const atStart = carousel.scrollLeft <= 4;
    carousel.scrollTo({
      left: atStart ? carousel.scrollWidth : carousel.scrollLeft - step(),
      behavior: 'smooth',
    });
  }

  function openModal(fish) {
    setSelectedFish(fish);
    setActiveAcc({});
    popoverRef.current?.showPopover();
  }

  function toggleAcc(acc) {
    setActiveAcc(prev => ({ ...prev, [acc]: !prev[acc] }));
  }

  const fish = selectedFish || SLIDES[0];

  return (
    <>
      <Nav current="julius" />

      <div className="carousel" ref={carouselRef}>
        {SLIDES.map((f, i) => (
          <article key={i} className="slide" onClick={() => openModal(f)}>
            <img src={f.afbeelding} alt={f.alt} />
            <div className="fish-badge">
              <span className="badge-dot"></span>{f.naam}
            </div>
          </article>
        ))}
      </div>

      <nav className="nav">
        <button className="nav-btn nav-prev" onClick={handlePrev}>&#8592;</button>
        <button className="nav-btn nav-next" onClick={handleNext}>&#8594;</button>
      </nav>

      <div id="fish-popover" popover="auto" className="modal" ref={popoverRef}>
        <button
          className="modal-close"
          onClick={() => popoverRef.current?.hidePopover()}
        >&#215;</button>
        <div className="modal-content">
          <div className="fish-col">
            <div className="fish-stage">
              <img src={fish.afbeelding} alt={fish.alt} />
              <img
                className={`fish-accessory acc-hat${activeAcc.hat ? ' visible' : ''}`}
                src="/assets/hat-svgrepo-com.svg"
                alt=""
                aria-hidden="true"
              />
            </div>
            <div className="dress-grid">
              <button
                className={`acc-item${activeAcc.hat ? ' active' : ''}`}
                data-acc="hat"
                title="Hoed"
                onClick={() => toggleAcc('hat')}
              >
                <img src="/assets/hat-svgrepo-com.svg" alt="Hoed" />
              </button>
              <button className="acc-item locked" disabled title="Binnenkort"><span>?</span></button>
              <button className="acc-item locked" disabled title="Binnenkort"><span>?</span></button>
              <button className="acc-item locked" disabled title="Binnenkort"><span>?</span></button>
            </div>
          </div>
          <div className="modal-info">
            <h2>{fish.naam}</h2>
            <p className="modal-latin">{fish.latijn}</p>
            <span className="modal-badge">{fish.waarnemingen} waarnemingen</span>
            <p className="modal-desc">{fish.beschrijving}</p>
            <dl className="modal-details">
              <div><dt>Lengte</dt><dd>{fish.lengte}</dd></div>
              <div><dt>Gewicht</dt><dd>{fish.gewicht}</dd></div>
              <div><dt>Habitat</dt><dd>{fish.habitat}</dd></div>
            </dl>
          </div>
        </div>
      </div>
    </>
  );
}
