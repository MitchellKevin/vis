// Golf-overgang tussen twee secties (zoals op visdeurbel.nl).
// `top` = kleur van de sectie erboven, `bottom` = kleur van de sectie eronder.
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
          fill={bottom}
          d="M0,54 C160,104 320,18 480,46 C640,74 800,116 960,90 C1120,64 1280,30 1440,58 L1440,120 L0,120 Z"
        />
      </svg>
    </div>
  );
}
