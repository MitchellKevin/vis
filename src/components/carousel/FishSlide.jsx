// Vinkje in de toggle-knob.
function CheckIcon() {
  return (
    <svg className="embla__slide__checkmark" width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M3 7l3 3 5-5.5"
        stroke="var(--color-green-dark)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Toggle-switch met de naam van de vis. Een <label> rond een (visueel
// verborgen) echte checkbox: native toetsenbordbediening en de naam wordt
// automatisch de toegankelijke naam van de checkbox.
function FishPill({ name, isChecked, onToggle }) {
  return (
    <label className={`embla__slide__pill${isChecked ? ' embla__slide__pill--checked' : ''}`}>
      <input
        type="checkbox"
        className="embla__slide__checkbox"
        checked={isChecked}
        onChange={onToggle}
      />
      <span className="embla__slide__knob" aria-hidden="true">
        <CheckIcon />
      </span>
      <span className="embla__slide__name">{name}</span>
    </label>
  )
}

// Eén slide: de klikbare visafbeelding met de toggle-knop eronder.
export default function FishSlide({ fish, isChecked, onToggle, onOpen }) {
  return (
    <div className="embla__slide">
      {/* De afbeelding zit in een <button>: zo is het openen van de dialog
          met toetsenbord (Tab + Enter/Space) bereikbaar en kondigt een
          screenreader een echte actie aan i.p.v. alleen een plaatje. */}
      <button
        className="embla__slide__img-btn"
        onClick={onOpen}
        aria-label={`Meer over de ${fish.name}`}
      >
        <img
          className="embla__slide__img"
          src={fish.img}
          alt={fish.name}
          draggable="false"
        />
      </button>
      <FishPill name={fish.name} isChecked={isChecked} onToggle={onToggle} />
    </div>
  )
}
