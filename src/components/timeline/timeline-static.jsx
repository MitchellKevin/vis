export default function TimelineStatic({
  className,
  children,
  title = "Tijdlijn",
}) {
  return (
    <section className={className}>
      <h2>{title}</h2>
      <p>Hoe laat op de dag heb je de meeste kans op een vis?</p>
      {children}
    </section>
  );
}