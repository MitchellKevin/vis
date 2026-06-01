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

// Toggle-switch knop met de naam van de vis.
function FishPill({ name, isChecked, onToggle }) {
  return (
    <button
      className={`embla__slide__pill${isChecked ? ' embla__slide__pill--checked' : ''}`}
      role="checkbox"
      aria-checked={isChecked}
      onClick={onToggle}
    >
      <span className="embla__slide__knob" aria-hidden="true">
        <CheckIcon />
      </span>
      <span className="embla__slide__name">{name}</span>
    </button>
  )
}

// Eén slide: de visafbeelding met de toggle-knop eronder.
export default function FishSlide({ fish, isChecked, onToggle }) {
  return (
    <div className="embla__slide">
      <img
        className="embla__slide__img"
        src={fish.img}
        alt={fish.name}
        draggable="false"
      />
      <FishPill name={fish.name} isChecked={isChecked} onToggle={onToggle} />
    </div>
  )
}
