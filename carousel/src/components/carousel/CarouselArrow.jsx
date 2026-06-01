// Eén ronde pijlknop (vorige of volgende).
export default function CarouselArrow({ direction, onClick, disabled }) {
  const isPrev = direction === 'prev'
  return (
    <button
      className="embla__arrow"
      onClick={onClick}
      disabled={disabled}
      aria-label={isPrev ? 'Vorige vis' : 'Volgende vis'}
    >
      {isPrev ? '←' : '→'}
    </button>
  )
}
