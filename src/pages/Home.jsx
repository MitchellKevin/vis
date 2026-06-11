import { Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import { useStylesheet } from '../hooks/useStylesheet.js';

// Components ->
import DayScroll from '../components/timeline/day-scroll.jsx';
import TableStyled from '../components/timeline/table-styled.jsx';

export default function Home() {
  useStylesheet('/styles/index.css');
  useStylesheet('/styles/timeline.css');
  return (
    <>
      <Nav />
      <header>
        <span className="logo">Visdeurbel</span>
      </header>
      <main>
        <section className="hero">
          <h1>Visualisaties</h1>
          <p>Overzicht van alle visualisatieprojecten voor de Visdeurbel meesterproef.</p>
        </section>
        <section>
          <div className="grid">
            <Link className="card" to="/julius">
              <span className="card__label">Julius</span>
              <h2 className="card__title">Visualisatie Julius</h2>
              <p className="card__desc">Persoonlijk visualisatieproject van Julius.</p>
              <span className="card__link">Bekijken →</span>
            </Link>
            <Link className="card" to="/joost">
              <span className="card__label">Joost</span>
              <h2 className="card__title">Visualisatie Joost</h2>
              <p className="card__desc">Persoonlijk visualisatieproject van Joost.</p>
              <span className="card__link">Bekijken →</span>
            </Link>
            <Link className="card" to="/mitchell">
              <span className="card__label">Mitchell</span>
              <h2 className="card__title">Visualisatie Mitchell</h2>
              <p className="card__desc">Persoonlijk visualisatieproject van Mitchell.</p>
              <span className="card__link">Bekijken →</span>
            </Link>
            <a className="card" href="#timeline">
              <h2 className="card__title">Timeline Visualisatie</h2>
              <p className="card__desc">Visualisaties van hoeveel vissen op welk tijdstip van de dag te zien zijn.</p>
              <span className="card__link">Bekijken ↓</span>
            </a>
          </div>
        </section>
        <DayScroll />
        <TableStyled />
      </main>
      <footer>
        <div className="footer__inner">
          <p>Visdeurbel — Meesterproef Minor Web 2026</p>
        </div>
      </footer>
    </>
  );
}
