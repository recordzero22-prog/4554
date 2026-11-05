import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialDrone,
  checkSphereCollision,
  calculateScore,
  updateEnergy,
  checkWaveCompletion,
} from './gameLogic';

test('GameLogic: initializes drone with full health and energy', () => {
  const drone = createInitialDrone();
  assert.equal(drone.health, 100);
  assert.equal(drone.energy, 100);
  assert.equal(drone.score, 0);
  assert.equal(drone.packetsCollected, 0);
});

test('GameLogic: collision detection accurately detects overlap', () => {
  const dronePos = { x: 5, z: 5 };
  const targetPos = { x: 5.5, z: 5.5 };
  const farPos = { x: 15, z: 15 };

  assert.equal(checkSphereCollision(dronePos, targetPos, 1.0), true);
  assert.equal(checkSphereCollision(dronePos, farPos, 1.0), false);
});

test('GameLogic: scoring calculates correctly based on packets, waves and streaks', () => {
  assert.equal(calculateScore(5, 1, 2), 5 * 100 + 1 * 250 + 2 * 50);
});

test('GameLogic: energy drains during boost and recharges otherwise', () => {
  const drained = updateEnergy(100, 1.0, true);
  assert.equal(drained, 65);

  const recharged = updateEnergy(50, 1.0, false);
  assert.equal(recharged, 65);

  const capped = updateEnergy(95, 1.0, false);
  assert.equal(capped, 100);
});

test('GameLogic: wave completion detects when all collectibles are gathered', () => {
  const items = [
    { id: '1', x: 0, z: 0, type: 'data' as const, collected: true },
    { id: '2', x: 1, z: 1, type: 'data' as const, collected: true },
  ];
  assert.equal(checkWaveCompletion(items), true);

  items[1].collected = false;
  assert.equal(checkWaveCompletion(items), false);
});
