export default function TimelineStatic({ children, title = "Tijdlijn" }) {
  return (
    <section>
      <h2>{title}</h2>
      <p>Hoe laat op de dag heb je de meeste kans op een vis?</p>
      {children}
    </section>
  );
}