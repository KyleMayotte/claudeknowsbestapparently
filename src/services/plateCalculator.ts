/**
 * Plate Calculator Service
 * Calculates plate loading for barbell exercises
 */

export interface PlateLoadout {
  plates: { weight: number; count: number }[];
  perSide: string;
  total: number;
}

// Standard Olympic barbell
const BARBELL_WEIGHT = 45; // lbs

// Standard plate inventory (lbs)
const STANDARD_PLATES_LBS = [45, 35, 25, 10, 5, 2.5];

// Standard plate inventory (kg)
const STANDARD_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];

/**
 * Calculate optimal plate loading for a given weight
 */
export const calculatePlateLoadout = (
  totalWeight: number,
  unitSystem: 'lbs' | 'kg' = 'lbs',
  barWeight: number = BARBELL_WEIGHT
): PlateLoadout => {
  const availablePlates = unitSystem === 'lbs' ? STANDARD_PLATES_LBS : STANDARD_PLATES_KG;

  // Weight to load on one side (excluding bar)
  const weightPerSide = (totalWeight - barWeight) / 2;

  if (weightPerSide <= 0) {
    return {
      plates: [],
      perSide: 'Bar only',
      total: barWeight,
    };
  }

  // Greedy algorithm to find plate combination
  const plates: { weight: number; count: number }[] = [];
  let remaining = weightPerSide;

  for (const plateWeight of availablePlates) {
    if (remaining >= plateWeight) {
      const count = Math.floor(remaining / plateWeight);
      plates.push({ weight: plateWeight, count });
      remaining -= plateWeight * count;
    }
  }

  // Format per-side description
  const perSide = plates.length === 0
    ? 'Bar only'
    : plates
        .map((p) => `${p.count}×${p.weight}`)
        .join(' + ');

  const loadedWeight = barWeight + plates.reduce((sum, p) => sum + p.weight * p.count, 0) * 2;

  return {
    plates,
    perSide,
    total: loadedWeight,
  };
};

/**
 * Get suggested weights around a target
 */
export const getSuggestedWeights = (
  currentWeight: number,
  unitSystem: 'lbs' | 'kg' = 'lbs'
): number[] => {
  const increment = unitSystem === 'lbs' ? 5 : 2.5;

  return [
    currentWeight - increment * 4,
    currentWeight - increment * 2,
    currentWeight - increment,
    currentWeight,
    currentWeight + increment,
    currentWeight + increment * 2,
    currentWeight + increment * 4,
  ].filter(w => w >= BARBELL_WEIGHT); // Don't go below bar weight
};

/**
 * Format plate loadout for display
 */
export const formatPlateLoadout = (loadout: PlateLoadout, unitSystem: 'lbs' | 'kg'): string => {
  if (loadout.plates.length === 0) {
    return `Bar only (${BARBELL_WEIGHT} ${unitSystem})`;
  }

  return `${loadout.perSide} per side`;
};
