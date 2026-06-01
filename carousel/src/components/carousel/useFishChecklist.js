import { useState } from 'react'

// Beheert welke vissen aangevinkt zijn (toggle per id).
export function useFishChecklist() {
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
