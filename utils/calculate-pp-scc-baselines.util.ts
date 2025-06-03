import Decimal from 'decimal.js'

type PPReference = {
  RowID: number
  Category: string
  VesselTypeID: number
  Size: string
  Traj: string
  a: number
  b: number
  c: number
  d: number
  e: number
}

type Vessel = {
  Name: string
  IMONo: number
  VesselType: number
  MaxDeadWg: number
}

type PPSSCPreferenceLine = {
  a?: number
  b?: number
  c?: number
  d?: number
  e?: number
  traj?: string
}

type CalculatePPBaselinesArgs = {
  factors: PPSSCPreferenceLine[]
  year: number
  DWT: Decimal
}

type PPBaselines = {
  min: Decimal
  striving: Decimal
  yxLow: Decimal
  yxUp: Decimal
}

const yxLowF = 0.33
const yxUpF = 1.67

const emptyFactor: PPSSCPreferenceLine = {
  traj: '',
  a: 0,
  b: 0,
  c: 0,
  d: 0,
  e: 0,
}

export const getPPFactors = (ppReference: PPReference[], vessel: Vessel): {
  minFactors: PPSSCPreferenceLine
  strFactors: PPSSCPreferenceLine
}[] => {
  const vesselTypeFactors = ppReference.filter(ref => 
    ref.VesselTypeID === vessel.VesselType && 
    ref.Category?.toUpperCase() === 'PP'
  );

  const minFactors = vesselTypeFactors.find(f => f.Traj?.trim() === 'MIN');
  const strFactors = vesselTypeFactors.find(f => f.Traj?.trim() === 'STR');

  return [{
    minFactors: minFactors ?? emptyFactor,
    strFactors: strFactors ?? emptyFactor,
  }]
}

export const calculatePPSCCBaselines = ({
  factors,
  year,
  DWT,
}: CalculatePPBaselinesArgs): PPBaselines => {
  const { minFactors, strFactors } = mapPPSCCFactors(factors)

  const min = calculatePPSCCBaseline({ factors: minFactors, year, DWT })
  const striving = calculatePPSCCBaseline({ factors: strFactors, year, DWT })
  const yxLow = Decimal.mul(min, yxLowF)
  const yxUp = Decimal.mul(min, yxUpF)

  return {
    min,
    striving,
    yxLow,
    yxUp,
  }
}

type CalculateBaselineArgs = {
  factors: PPSSCPreferenceLine
  year: number
  DWT: Decimal
}

const calculatePPSCCBaseline = ({
  factors,
  year,
  DWT,
}: CalculateBaselineArgs) =>
  Decimal.mul(
    Decimal.sum(
      Decimal.mul(factors.a ?? 0, Decimal.pow(year, 3)),
      Decimal.mul(factors.b ?? 0, Decimal.pow(year, 2)),
      Decimal.mul(factors.c ?? 0, year),
      factors.d ?? 0,
    ),
    Decimal.pow(DWT, factors.e ?? 0),
  )


const mapPPSCCFactors = (factors: PPSSCPreferenceLine[]): {
  minFactors: PPSSCPreferenceLine
  strFactors: PPSSCPreferenceLine
} => {
  return factors.reduce<{
    minFactors: PPSSCPreferenceLine
    strFactors: PPSSCPreferenceLine
  }>(
    (acc, cur) => {
      const key = (() => {
        switch (cur.traj?.trim()) {
          case 'MIN':
            return 'minFactors'
          case 'STR':
            return 'strFactors'
          default:
            return null
        }
      })()

      if (!key) {
        return acc
      }

      return {
        ...acc,
        [key]: cur,
      }
    },
    { minFactors: emptyFactor, strFactors: emptyFactor },
  )
}
