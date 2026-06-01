export default function WeekdayChapter() {
  return (
    <section id="ch-weekday" className="chapter" aria-label="Weekend versus doordeweeks">
      <div className="chapter-inner chapter-inner--wide">
        <div className="chapter-text">
          <p className="eyebrow reveal">Weekend of werkdag</p>
          <h2 className="reveal">Twee getijden.</h2>
          <p className="lede reveal">Belt het weekend op een ander ritme dan een doordeweekse dag? De twee curves vertellen het.</p>
          <p className="chapter-stat reveal" id="weekdayStat" aria-live="polite"></p>
        </div>
        <div className="weekday-stage" id="weekdayStage" aria-label="Bel oproepen per uur: weekend versus doordeweeks"></div>
      </div>
    </section>
  );
}
