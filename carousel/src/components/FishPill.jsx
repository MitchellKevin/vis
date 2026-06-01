import CheckIcon from './CheckIcon'

// Toggle-switch knop met de naam van de vis.
export default function FishPill({ name, isChecked, onToggle }) {
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
