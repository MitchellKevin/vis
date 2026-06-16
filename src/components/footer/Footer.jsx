// Visdeurbel-footer — nagebouwd naar het Figma/website-ontwerp.
// Donkerpaarse achtergrond, vier kolommen + onderbalk met taalkeuze en credits.

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.6" cy="6.4" r="1.3" fill="currentColor" />
    </svg>
  );
}

function YoutubeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="4.5" fill="currentColor" />
      <path className="vdb-footer__yt-play" d="M10 8.5l5.5 3.5L10 15.5z" />
    </svg>
  );
}

const navLinks = ["Over", "Waarom", "De vissen", "Community", "Visfoto's"];

const credits = [
  { label: "Design by: vis", href: "#" },
  { label: "Copy by: vis", href: "#" },
  { label: "Built by: vis", href: "#" },
  { label: "Stream by: Live-Streams.nl", href: "#" },
];

export default function Footer() {
  return (
    <footer className="vdb-footer">
      <div className="vdb-footer__inner">
        {/* Kolom 1 — merk, claim en contact */}
        <div className="vdb-footer__brand-col">
          <a className="vdb-footer__brand" href="#">
            <img className="vdb-footer__bell" src="/favicon.ico" alt="" aria-hidden="true" />
            <span className="vdb-footer__wordmark">Visdeurbel</span>
          </a>

          <h2 className="vdb-footer__claim">
            Druk op de Visdeurbel als je een vis ziet
          </h2>

          <a className="vdb-footer__email" href="mailto:visdeurbel@utrecht.nl">
            visdeurbel@utrecht.nl
          </a>
        </div>

        {/* Kolom 2 — sitenavigatie */}
        <nav className="vdb-footer__nav" aria-label="Footer navigatie">
          {navLinks.map((link) => (
            <a key={link} className="vdb-footer__nav-link" href="#">
              {link}
            </a>
          ))}
        </nav>

        {/* Kolom 3 — info en socials */}
        <div className="vdb-footer__info-col">
          <p className="vdb-footer__text">
            Bekijk onze meestgestelde vragen op de{" "}
            <a className="vdb-footer__link" href="#">
              FAQ-pagina
            </a>
          </p>
          <p className="vdb-footer__text">
            Download de{" "}
            <a className="vdb-footer__link" href="#">
              persmap
            </a>
          </p>
          <p className="vdb-footer__text">
            Meer zien en doen in Utrecht?
            <br />
            <a className="vdb-footer__link" href="#">
              Ontdek-Utrecht.nl
            </a>
          </p>

          <div className="vdb-footer__socials">
            <a className="vdb-footer__social" href="#" aria-label="Instagram">
              <InstagramIcon />
            </a>
            <a className="vdb-footer__social" href="#" aria-label="YouTube">
              <YoutubeIcon />
            </a>
          </div>
        </div>

        {/* Kolom 4 — journaal en partners */}
        <div className="vdb-footer__journal-col">
          <p className="vdb-footer__text vdb-footer__text--strong">
            Het Visdeurbel Journaal
          </p>
          <p className="vdb-footer__text">Elke week een nieuwe aflevering!</p>

          <a className="vdb-footer__subscribe" href="#">
            <span className="vdb-footer__subscribe-icon">
              <YoutubeIcon />
            </span>
            Abonneren
          </a>

          <p className="vdb-footer__text vdb-footer__text--strong vdb-footer__partners-label">
            Visdeurbel is een initiatief van:
          </p>
          <div className="vdb-footer__partners">
            <span className="vdb-footer__partner">
              <span className="vdb-footer__partner-mark" aria-hidden="true">❘❙❘</span>
              Gemeente Utrecht
            </span>
            <span className="vdb-footer__partner">
              De Stichtse Rijnlanden
            </span>
            <span className="vdb-footer__partner">
              Dutch Wall Fish
            </span>
          </div>
        </div>
      </div>

      {/* Onderbalk — taalkeuze en credits */}
      <div className="vdb-footer__bottom">
        <div className="vdb-footer__lang">
          <a className="vdb-footer__lang-link" href="#">English</a>
          <a className="vdb-footer__lang-link vdb-footer__lang-link--active" href="#">
            Nederlands
          </a>
        </div>

        <div className="vdb-footer__credits">
          <span className="vdb-footer__copyright">© 2026 Visdeurbel</span>
          {credits.map((c) => (
            <a key={c.label} className="vdb-footer__credit-link" href={c.href}>
              {c.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
