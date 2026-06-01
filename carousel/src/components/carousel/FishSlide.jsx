import FishPill from './FishPill'

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
