'use client'

import { useState, useCallback } from 'react'

type SetToggle = (value: boolean | ((prev: boolean) => boolean)) => void

/**
 * Boolean state with a stable setter. Use for open/closed state (e.g. modals, accordions).
 * Toggle: setOpen((v) => !v). Set explicitly: setOpen(false).
 *
 * @param initialValue - Initial boolean value (default: false)
 * @returns [value, setValue] - Current value and setter (accepts boolean or updater function)
 */
export function useToggle(initialValue = false): [boolean, SetToggle] {
  const [value, setValue] = useState(initialValue)
  const setToggle = useCallback((valueOrUpdater: boolean | ((prev: boolean) => boolean)) => {
    setValue(
      typeof valueOrUpdater === 'function'
        ? valueOrUpdater
        : () => valueOrUpdater
    )
  }, [])
  return [value, setToggle]
}
