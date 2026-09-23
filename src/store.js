import { useSyncExternalStore } from 'react'

let state = { gravity: false, hangarOpen: false, section: 'HERO', offset: 0 }
const listeners = new Set()

export const getState = () => state

export const setState = (patch) => {
  const next = typeof patch === 'function' ? patch(state) : patch
  let changed = false
  for (const k in next) if (state[k] !== next[k]) { changed = true; break }
  if (!changed) return
  state = { ...state, ...next }
  listeners.forEach((l) => l())
}

export const subscribe = (l) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export const useStore = (selector) => useSyncExternalStore(subscribe, () => selector(state), () => selector(state))

export const setGravity = (gravity) => setState({ gravity })
export const toggleGravity = () => setState((s) => ({ gravity: !s.gravity }))
export const setHangarOpen = (hangarOpen) => setState({ hangarOpen })
export const setSection = (section) => setState({ section })
export const setOffset = (offset) => setState({ offset })
