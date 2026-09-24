import { describe, it, expect } from 'vitest';
import {
  getOrCreateTelemetry,
  recordTelemetryReading,
  simulateChillerFailure,
  resetTelemetry,
} from '../src/services/coldChain.js';
import {
  getActiveDisasterScenario,
  setDisasterScenario,
} from '../src/services/disaster.js';
import {
  getMutualAidSummary,
  executeReclamationAudit,
} from '../src/services/mutualAid.js';

describe('Global Hackathon Innovation Engines', () => {
  describe('1. IoT Cold-Chain Telemetry & Dynamic Mid-Transit Rerouting', () => {
    const testJobId = 'job-test-cold-chain-1';

    it('initializes nominal cold-chain state within 2°C - 6°C PRBC safety band', () => {
      const telemetry = getOrCreateTelemetry(testJobId, 'PRBC (Packed Red Blood Cells)');
      expect(telemetry.currentTemp).toBeGreaterThanOrEqual(2.0);
      expect(telemetry.currentTemp).toBeLessThanOrEqual(6.0);
      expect(telemetry.sensorHealth).toBe('NOMINAL');
      expect(telemetry.excursionDetected).toBe(false);
      expect(telemetry.rerouteStatus).toBeNull();
    });

    it('detects thermal runaway excursion and autonomously triggers intercept diversion', async () => {
      const updated = await simulateChillerFailure(testJobId);
      expect(updated.currentTemp).toBe(7.8);
      expect(updated.excursionDetected).toBe(true);
      expect(updated.sensorHealth).toBe('WARNING');
      expect(updated.projectedSpoilageMinutes).toBeLessThanOrEqual(15);
      expect(updated.rerouteStatus).not.toBeNull();
      expect(updated.rerouteStatus?.active).toBe(true);
      expect(updated.rerouteStatus?.reroutedFacility).toContain('Jeevan Jyoti Blood Centre');
      expect(updated.rerouteStatus?.unitsPreserved).toBe(4);
    });

    it('resets telemetry to nominal baseline when requested', () => {
      const reset = resetTelemetry(testJobId);
      expect(reset.currentTemp).toBe(3.8);
      expect(reset.excursionDetected).toBe(false);
      expect(reset.rerouteStatus).toBeNull();
    });
  });

  describe('2. Cooperative Game Theory: Anti-Hoarding & Mutual Aid Network', () => {
    it('computes district Pareto efficiency and facility hoarding risk indices', async () => {
      const summary = await getMutualAidSummary();
      expect(summary.districtParetoEfficiency).toBeGreaterThan(90);
      expect(summary.activeErcCredits).toBeGreaterThan(0);
      expect(Array.isArray(summary.facilities)).toBe(true);
    });

    it('executes algorithmic surplus reclamation and awards ERC mutual aid bonus', async () => {
      const summary = await getMutualAidSummary();
      const facId = summary.facilities[0]?.facilityId || 'fac-demo-1';

      const result = await executeReclamationAudit(facId);
      expect(result.success).toBe(true);
      expect(result.bonusErc).toBe(100);
      expect(result.message).toContain('ERC mutual aid tokens');
    });
  });

  describe('3. One-Click Global Crisis Simulator (WHO Disaster Presets)', () => {
    it('defaults to BASELINE peacetime configuration', () => {
      const baseline = getActiveDisasterScenario();
      expect(baseline.id).toBe('BASELINE');
      expect(baseline.defconLevel).toBe(5);
      expect(baseline.droneCorridorsActive).toBe(false);
    });

    it('activates CYCLONE_FLOOD disaster protocol with drone corridors and hazard alerts', async () => {
      const cyclone = await setDisasterScenario('CYCLONE_FLOOD');
      expect(cyclone.id).toBe('CYCLONE_FLOOD');
      expect(cyclone.defconLevel).toBe(2);
      expect(cyclone.droneCorridorsActive).toBe(true);
      expect(cyclone.blockedRoutes.length).toBeGreaterThan(0);
    });

    it('activates 7.4M EARTHQUAKE mass-casualty protocol', async () => {
      const earthquake = await setDisasterScenario('EARTHQUAKE_74');
      expect(earthquake.id).toBe('EARTHQUAKE_74');
      expect(earthquake.defconLevel).toBe(1);
      expect(earthquake.powerGridOperationalPercent).toBe(30);
    });

    it('safely restores network to BASELINE standard operations', async () => {
      const restored = await setDisasterScenario('BASELINE');
      expect(restored.id).toBe('BASELINE');
      expect(restored.defconLevel).toBe(5);
      expect(restored.activeHazardsCount).toBe(0);
    });
  });
});
