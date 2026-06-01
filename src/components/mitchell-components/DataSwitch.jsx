export default function DataSwitch() {
  return (
    <div className="data-switch" role="group" aria-label="Kies dataset: week, maand of jaar">
      <button type="button" className="data-switch__btn" data-period="week" aria-pressed="false">Week</button>
      <button type="button" className="data-switch__btn is-active" data-period="maand" aria-pressed="true">Maand</button>
      <button type="button" className="data-switch__btn" data-period="jaar" aria-pressed="false">Jaar</button>
    </div>
  );
}
