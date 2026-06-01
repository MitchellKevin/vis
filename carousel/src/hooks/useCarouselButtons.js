import { useEffect, useState } from 'react'

// Houdt bij of de carousel naar links/rechts kan scrollen,
// zodat de pijlknoppen op het juiste moment uitgeschakeld worden.
export function useCarouselButtons(emblaApi) {
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
