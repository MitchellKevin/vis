export default function TimelineStatic({ children }) {
  return (

    <section>
      <h2>Tijdlijn</h2>

      <p>
        Hoe laat op de dag heb je de meeste kans
        op een vis?
      </p>

      <p>
        Aantal gespotte vissen per uur per maand,
        <br />
        De meest gespotte vis per uur per maand.
      </p>
      {children}
    </section>
  );
}