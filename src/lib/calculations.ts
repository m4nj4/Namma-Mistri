/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EstimationResult, MaterialRates } from "../types";

/**
 * Standard formulas for material estimation
 * Ref: General Civil Engineering standards
 */

export function calculateMaterials(
  lengthInFt: number,
  heightInFt: number,
  thicknessInInches: number,
  rates: MaterialRates
): EstimationResult {
  const thicknessInFt = thicknessInInches / 12;
  const volumeInCuFt = lengthInFt * heightInFt * thicknessInFt;
  
  // Standard brick size with mortar for 1 cu.ft of wall (roughly)
  // 1 cu.m = 500 bricks approx.
  // 1 cu.ft = 500 / 35.3147 = ~14.16 bricks
  const bricksCount = Math.ceil(volumeInCuFt * 14.16);
  
  // Mortar calculation
  // Mortar is usually 25-30% of wall volume
  const mortarVolumeCuFt = volumeInCuFt * 0.3;
  
  // Mix ratio 1:6 (Cement:Sand)
  // Dry volume = Wet volume * 1.33
  const dryMortarVolume = mortarVolumeCuFt * 1.33;
  
  // Proportions: 1 part cement, 6 parts sand = 7 total parts
  const cementVolumeCuFt = dryMortarVolume * (1 / 7);
  const sandVolumeCuFt = dryMortarVolume * (6 / 7);
  
  // 1 bag of cement = 1.25 cu.ft approx 
  const cementBags = Math.ceil(cementVolumeCuFt / 1.25);
  const sandCuFt = Math.ceil(sandVolumeCuFt);
  
  const totalCost = (bricksCount * rates.brick) + (cementBags * rates.cement) + (sandCuFt * rates.sand);

  return {
    bricks: bricksCount,
    cementBags,
    sandCuFt,
    totalCost
  };
}
