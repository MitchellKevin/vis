import CarouselArrow from './CarouselArrow'

// Onderbalk met de twee pijlen en de horizontale lijn.
export default function CarouselControls({
  canScrollPrev,
  canScrollNext,
  onPrev,
  onNext,
}) {
  return (
    <div className="embla__controls">
      <div className="embla__arrows">
        <CarouselArrow direction="prev" onClick={onPrev} disabled={!canScrollPrev} />
        <CarouselArrow direction="next" onClick={onNext} disabled={!canScrollNext} />
      </div>
      <div className="embla__line" role="presentation" />
    </div>
  )
}
