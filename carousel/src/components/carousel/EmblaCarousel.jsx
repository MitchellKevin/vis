import { useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { fish } from '../../data/fish'
import FishSlide from './FishSlide'
import CarouselControls from './CarouselControls'
import './EmblaCarousel.css'

// Houdt bij of de carousel naar links/rechts kan scrollen,
// zodat de pijlknoppen op het juiste moment uitgeschakeld worden.
function useCarouselNav(emblaApi) {
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(true)

  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => {
      setCanScrollPrev(emblaApi.canScrollPrev())
      setCanScrollNext(emblaApi.canScrollNext())
    }
    emblaApi.on('select', onSelect).on('reInit', onSelect)
    onSelect()
    return () => {
      emblaApi.off('select', onSelect).off('reInit', onSelect)
    }
  }, [emblaApi])

  const scrollPrev = () => emblaApi?.scrollPrev()
  const scrollNext = () => emblaApi?.scrollNext()

  return { canScrollPrev, canScrollNext, scrollPrev, scrollNext }
}

// Beheert welke vissen aangevinkt zijn (toggle per id).
function useFishChecklist() {
  const [checked, setChecked] = useState(new Set())

  function toggleFish(id) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  const isChecked = (id) => checked.has(id)

  return { isChecked, toggleFish }
}

export default function EmblaCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', loop: false })
  const { canScrollPrev, canScrollNext, scrollPrev, scrollNext } = useCarouselNav(emblaApi)
  const { isChecked, toggleFish } = useFishChecklist()

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
