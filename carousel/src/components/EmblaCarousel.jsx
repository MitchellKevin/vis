import useEmblaCarousel from 'embla-carousel-react'
import { fish } from '../data/fish'
import { useCarouselButtons } from '../hooks/useCarouselButtons'
import { useCheckedFish } from '../hooks/useCheckedFish'
import FishSlide from './FishSlide'
import CarouselControls from './CarouselControls'
import './EmblaCarousel.css'

export default function EmblaCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', loop: false })
  const { canScrollPrev, canScrollNext, scrollPrev, scrollNext } = useCarouselButtons(emblaApi)
  const { isChecked, toggleFish } = useCheckedFish()

  return (
    <section className="embla">
      <div className="embla__viewport" ref={emblaRef}>
        <div className="embla__container">
          {fish.map((f) => (
            <FishSlide
              key={f.id}
              fish={f}
              isChecked={isChecked(f.id)}
              onToggle={() => toggleFish(f.id)}
            />
          ))}
        </div>
      </div>

      <CarouselControls
        canScrollPrev={canScrollPrev}
        canScrollNext={canScrollNext}
        onPrev={scrollPrev}
        onNext={scrollNext}
      />
    </section>
  )
}
