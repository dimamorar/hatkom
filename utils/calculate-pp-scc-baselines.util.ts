import { PPSCCReferenceLine, Vessel } from '@/prisma/generated/prisma'
import Decimal from 'decimal.js'


type PPSSCPreferenceLine = Omit<PPSCCReferenceLine, 'id' | 'category' | 'vesselTypeId' | 'size'> & {
  a: number
  b: number
  c: number
  d: number
  e: number
  traj: string
}

type PPBaselines = {
  min: Decimal
  striving: Decimal
  yxLow: Decimal
  yxUp: Decimal
}

type BaseCalculateArgs = {
  year: number
  DWT: Decimal
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

/**
 * Retrieves Poseidon Principles factors for a specific vessel type
 * 
 * This function finds the appropriate factor sets (MIN and STR trajectories)
 * for a given vessel based on its vessel type. The factors are used to calculate
 * emissions baselines using the formula:
 * Baseline = (a * year³ + b * year² + c * year + d) * DWT^e
 * 
 */
export const getPPFactors = (ppReferenceData: PPSCCReferenceLine[], vessel: Vessel) => {

  const minTrajectory = ppReferenceData.find(
    (ref) =>
      ref.vesselTypeId === vessel.vesselType &&
      ref.traj?.trim().toUpperCase() === "MIN"
  );

  const strTrajectory = ppReferenceData.find(
    (ref) =>
      ref.vesselTypeId === vessel.vesselType &&
      ref.traj?.trim().toUpperCase() === "STR"
  );

  return [{
    minFactors: minTrajectory ?? emptyFactor,
    strFactors: strTrajectory ?? emptyFactor,
  }]
}

/**
 * Calculates multiple Poseidon Principles baselines for a vessel
 * 
 * This function computes four different baseline values:
 * 1. min: Minimum required baseline using MIN trajectory factors
 * 2. striving: More ambitious target using STR trajectory factors
 * 3. yxLow: Lower bound (33% below minimum baseline)
 * 4. yxUp: Upper bound (67% above minimum baseline)
 * 
 * The baselines are calculated using the formula:
 * Baseline = (a * year³ + b * year² + c * year + d) * DWT^e
 * 
 * @param factors - Array of factor sets containing coefficients for different trajectories
 * @param year - Target year for calculation (e.g., 2024)
 * @param DWT - Vessel's Deadweight Tonnage in metric tons
 * @returns PPBaselines object containing all calculated baseline values
 */


type CalculatePPBaselinesArgs = BaseCalculateArgs & {
  factors: PPSSCPreferenceLine[]
}

export const calculatePPSCCBaselines = ({
  factors,
  year,
  DWT,
}: CalculatePPBaselinesArgs): PPBaselines => {
  // Separate factors into MIN and STR trajectories
  const { minFactors, strFactors } = mapPPSCCFactors(factors)

  // Calculate minimum required baseline using MIN trajectory factors
  const min = calculatePPSCCBaseline({ factors: minFactors, year, DWT })

  // Calculate striving (more ambitious) baseline using STR trajectory factors
  const striving = calculatePPSCCBaseline({ factors: strFactors, year, DWT })

  // Calculate lower bound (33% below minimum baseline)
  const yxLow = Decimal.mul(min, yxLowF)

  // Calculate upper bound (67% above minimum baseline)
  const yxUp = Decimal.mul(min, yxUpF)

  return {
    min,
    striving,
    yxLow,
    yxUp,
  }
}

/**
 * Calculates the Poseidon Principles baseline emissions for a vessel
 * 
 * Formula: Baseline = (a * year³ + b * year² + c * year + d) * DWT^e
 * 
 * Where:
 * - year: The target year for the calculation
 * - DWT: Deadweight Tonnage of the vessel
 * - a, b, c, d: Polynomial coefficients for time-based calculation
 * - e: Power coefficient for DWT scaling
 * 
 * The formula consists of two main parts:
 * 1. Time-based polynomial: (a * year³ + b * year² + c * year + d)
 *    - Represents the baseline trend over time
 *    - Higher order terms (year³, year²) capture non-linear changes
 *    - Linear term (year) captures steady changes
 *    - Constant term (d) represents base value
 * 
 * 2. DWT scaling: DWT^e
 *    - Adjusts baseline based on vessel size
 *    - Negative e values mean larger vessels have lower baselines per ton
 * 
 * @param factors - Object containing coefficients (a, b, c, d, e)
 * @param year - Target year for calculation
 * @param DWT - Vessel's Deadweight Tonnage
 * @returns Decimal - Calculated baseline value
 */

type CalculateBaselineArgs = BaseCalculateArgs & {
  factors: PPSSCPreferenceLine
}

const calculatePPSCCBaseline = ({
  factors,
  year,
  DWT,
}: CalculateBaselineArgs) => {

  const yearCubedTerm = Decimal.mul(factors.a ?? 0, Decimal.pow(year, 3));
  const yearSquaredTerm = Decimal.mul(factors.b ?? 0, Decimal.pow(year, 2));
  const yearTerm = Decimal.mul(factors.c ?? 0, year);
  const constantTerm = new Decimal(factors.d ?? 0);
  const dwtPowerTerm = Decimal.pow(DWT, factors.e ?? 0);

  const polynomialSum = Decimal.sum(
    yearCubedTerm,
    yearSquaredTerm,
    yearTerm,
    constantTerm
  );

  return Decimal.mul(polynomialSum, dwtPowerTerm);
}

/**
 * Maps and separates Poseidon Principles factors into MIN and STR trajectories
 * 
 * This function takes an array of factor sets and organizes them into two categories:
 * - minFactors: Factors for minimum required baseline (MIN trajectory)
 * - strFactors: Factors for more ambitious target (STR trajectory)
 * 
 * @param factors - Array of factor sets with trajectory information
 * @returns Object containing separated minFactors and strFactors
 */
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
            return 'minFactors'  // Minimum required baseline
          case 'STR':
            return 'strFactors'  // Striving (more ambitious) baseline
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
