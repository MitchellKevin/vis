// Decorative page header with eyebrow text, title, subtitle and fish emoji decoration
export default function PageHeader() {
  return (
    <header className="page-header">
      <div className="header-inner">
        {/* Small category label above the main heading */}
        <p className="header-eyebrow">Wereldwijd data</p>
        <h1>Waar kijken de <em>viskijkers</em> mee?</h1>
        <p className="header-sub">Bezoekersdata van visdeurbel.nl — per land, per gebeurtenis, per maand.</p>
      </div>
      {/* Decorative fish emojis — hidden from screen readers */}
      <div className="header-fish-deco" aria-hidden="true">🐠🐡🐟</div>
    </header>
  );
}