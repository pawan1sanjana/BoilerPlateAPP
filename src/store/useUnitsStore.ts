import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type DistanceUnit = 'km' | 'mi'
export type VolumeUnit = 'L' | 'gal'
export type WeightUnit = 'kg' | 'lbs'

interface UnitsState {
  distanceUnit: DistanceUnit
  volumeUnit: VolumeUnit
  weightUnit: WeightUnit
  setDistanceUnit: (u: DistanceUnit) => void
  setVolumeUnit: (u: VolumeUnit) => void
  setWeightUnit: (u: WeightUnit) => void
}

export const useUnitsStore = create<UnitsState>()(
  persist(
    (set) => ({
      distanceUnit: 'km',
      volumeUnit: 'L',
      weightUnit: 'kg',
      setDistanceUnit: (distanceUnit) => set({ distanceUnit }),
      setVolumeUnit: (volumeUnit) => set({ volumeUnit }),
      setWeightUnit: (weightUnit) => set({ weightUnit }),
    }),
    {
      name: 'BoilerplateApp-units'
    }
  )
)
