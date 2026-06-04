// Golf-overgang tussen twee secties (zoals op visdeurbel.nl).
// `top` = kleur van de sectie erboven, `bottom` = kleur van de sectie eronder.
// De path is periodiek (periode 720) en breder dan het beeld, zodat de subtiele
// horizontale drift-animatie (mitchell-sections.css) naadloos loopt.
export default function SectionWave({ top, bottom }) {
  return (
    <div className="section-wave" style={{ background: top }} aria-hidden="true">
      <svg
        className="section-wave__svg"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        role="presentation"
      >
        <path
          className="section-wave__path"
          fill={bottom}
          d="M-1440,10 C-1320,10 -1200,110 -1080,110 C-960,110 -840,10 -720,10 C-600,10 -480,110 -360,110 C-240,110 -120,10 0,10 C120,10 240,110 360,110 C480,110 600,10 720,10 C840,10 960,110 1080,110 C1200,110 1320,10 1440,10 C1560,10 1680,110 1800,110 C1920,110 2040,10 2160,10 C2280,10 2400,110 2520,110 C2640,110 2760,10 2880,10 L2880,120 L-1440,120 Z"
        />
      </svg>
    </div>
  );
}
