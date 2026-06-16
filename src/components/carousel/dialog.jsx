import { useEffect, useRef } from 'react'

// Toegankelijke modal op basis van het native <dialog>-element.
// showModal() regelt focus-trapping, Escape-sluiten, de achtergrond
// verbergen voor screenreaders en de top-layer (geen z-index-gedoe) gratis.
//
// De parent rendert deze component alleen wanneer de dialog open moet zijn
// (conditionele mount). Daarom openen we hem één keer bij mount; sluiten
// gebeurt door de parent die de component weer unmount.
export default function Dialog({ onClose, labelledBy, children }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  // Klik op de backdrop (= de dialog zelf, niet de inhoud) sluit hem.
  function handleClick(e) {
    if (e.target === dialogRef.current) onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      className="fish-dialog"
      onClose={onClose}
      onClick={handleClick}
      aria-labelledby={labelledBy}
    >
      {children}
    </dialog>
  )
}
