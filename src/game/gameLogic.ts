/**
 * Pure logic for 3D Cyber-Arena Game
 */

export interface DroneState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  health: number;
  energy: number;
  score: number;
  packetsCollected: number;
}

export interface Collectible {
  id: string;
  x: number;
  z: number;
  type: 'data' | 'core' | 'shield';
  collected: boolean;
}

export interface Hazard {
  id: string;
  x: number;
  z: number;
  radius: number;
  type: 'firewall' | 'sentinel';
}

export function createInitialDrone(): DroneState {
  return {
    x: 0,
    y: 0.8,
    z: 0,
    vx: 0,
    vz: 0,
    health: 100,
    energy: 100,
    score: 0,
    packetsCollected: 0,
  };
}

export function checkSphereCollision(
  posA: { x: number; z: number },
  posB: { x: number; z: number },
  combinedRadius: number
): boolean {
  const dx = posA.x - posB.x;
  const dz = posA.z - posB.z;
  return dx * dx + dz * dz <= combinedRadius * combinedRadius;
}

export function calculateScore(packets: number, wave: number, streak: number): number {
  return packets * 100 + wave * 250 + streak * 50;
}

export function updateEnergy(current: number, dt: number, isBoosting: boolean): number {
  if (isBoosting) {
    return Math.max(0, current - 35 * dt);
  }
  return Math.min(100, current + 15 * dt);
}

export function checkWaveCompletion(collectibles: Collectible[]): boolean {
  return collectibles.length > 0 && collectibles.every(c => c.collected);
}
