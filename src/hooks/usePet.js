import { useState, useEffect, useCallback } from 'react'

const DECAY_INTERVAL = 60_000 // stats decay every 60s
const MAX_STAT = 100

export function usePet() {
  const [pet, setPet] = useState({
    name: 'Tama',
    stage: 'egg', // egg -> baby -> child -> adult
    ageMinutes: 0,
    hunger: 80,
    happiness: 80,
    energy: 80,
    isSleeping: false,
    isAlive: true,
  })

  // Decay loop
  useEffect(() => {
    const interval = setInterval(() => {
      setPet((prev) => {
        if (!prev.isAlive) return prev

        const nextAge = prev.ageMinutes + 1
        const nextHunger = Math.max(0, prev.hunger - 2)
        const nextEnergy = prev.isSleeping
          ? Math.min(MAX_STAT, prev.energy + 5)
          : Math.max(0, prev.energy - 1)
        const nextHappiness = Math.max(0, prev.happiness - 1)

        const isAlive = nextHunger > 0 || nextEnergy > 0

        let stage = prev.stage
        if (nextAge > 60 * 24 * 3) stage = 'adult'
        else if (nextAge > 60 * 24) stage = 'child'
        else if (nextAge > 60) stage = 'baby'

        return {
          ...prev,
          ageMinutes: nextAge,
          hunger: nextHunger,
          energy: nextEnergy,
          happiness: nextHappiness,
          stage,
          isAlive,
        }
      })
    }, DECAY_INTERVAL)

    return () => clearInterval(interval)
  }, [])

  const feed = useCallback(() => {
    setPet((prev) => ({
      ...prev,
      hunger: Math.min(MAX_STAT, prev.hunger + 20),
    }))
  }, [])

  const play = useCallback(() => {
    setPet((prev) => ({
      ...prev,
      happiness: Math.min(MAX_STAT, prev.happiness + 20),
      energy: Math.max(0, prev.energy - 10),
    }))
  }, [])

  const toggleSleep = useCallback(() => {
    setPet((prev) => ({ ...prev, isSleeping: !prev.isSleeping }))
  }, [])

  const revive = useCallback(() => {
    setPet({
      name: 'Tama',
      stage: 'egg',
      ageMinutes: 0,
      hunger: 80,
      happiness: 80,
      energy: 80,
      isSleeping: false,
      isAlive: true,
    })
  }, [])

  return { pet, feed, play, toggleSleep, revive }
}
