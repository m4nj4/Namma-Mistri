/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Site {
  id: string;
  name: string;
  address: string;
  createdAt: number;
}

export interface Laborer {
  id: string;
  name: string;
  dailyRate: number;
  totalAdvance: number;
}

export interface AttendanceLog {
  id: string;
  laborerId: string;
  date: string; // YYYY-MM-DD
  isPresent: boolean;
  advancePaid: number;
}

export interface ProgressPhoto {
  id: string;
  url: string;
  caption: string;
  timestamp: number;
}

export interface MaterialRates {
  brick: number; // price per brick
  cement: number; // price per bag
  sand: number; // price per load/cu.ft
}

export interface EstimationResult {
  bricks: number;
  cementBags: number;
  sandCuFt: number;
  totalCost: number;
}
