import { ColdChainTelemetry, COLD_CHAIN_SPECIFICATIONS, BloodComponent } from '@lifelink/shared';
import { emitRealtimeEvent } from '../realtime/socket.js';
import { prisma } from '../prisma.js';

// In-memory store keyed by jobId
const telemetryStore = new Map<string, ColdChainTelemetry>();

export function getOrCreateTelemetry(jobId: string, defaultCargo = 'PRBC (Packed Red Blood Cells)'): ColdChainTelemetry {
  const existing = telemetryStore.get(jobId);
  if (existing) return existing;

  const spec = COLD_CHAIN_SPECIFICATIONS.PRBC;
  const initial: ColdChainTelemetry = {
    jobId,
    cargoType: defaultCargo,
    currentTemp: 3.8,
    targetMin: spec.minTemp,
    targetMax: spec.maxTemp,
    ambientTemp: 32.5,
    batteryPercent: 88,
    sensorHealth: 'NOMINAL',
    excursionDetected: false,
    rateOfRisePerMin: 0.05,
    projectedSpoilageMinutes: null,
    rerouteStatus: null,
    updatedAt: new Date().toISOString(),
  };

  telemetryStore.set(jobId, initial);
  return initial;
}

export async function recordTelemetryReading(
  jobId: string,
  reading: Partial<ColdChainTelemetry>
): Promise<ColdChainTelemetry> {
  const current = getOrCreateTelemetry(jobId, reading.cargoType);

  const updatedTemp = reading.currentTemp !== undefined ? reading.currentTemp : current.currentTemp;
  const updatedBattery = reading.batteryPercent !== undefined ? reading.batteryPercent : current.batteryPercent;
  const updatedAmbient = reading.ambientTemp !== undefined ? reading.ambientTemp : current.ambientTemp;
  const rate = reading.rateOfRisePerMin !== undefined ? reading.rateOfRisePerMin : current.rateOfRisePerMin;

  const excursionDetected = updatedTemp > current.targetMax || updatedTemp < current.targetMin;
  const criticalMax = 10.0; // Point of red cell hemolysis
  let projectedSpoilageMinutes: number | null = null;
  let rerouteStatus = current.rerouteStatus;

  if (excursionDetected && rate > 0) {
    const deltaToCrit = Math.max(0, criticalMax - updatedTemp);
    projectedSpoilageMinutes = Math.max(2, Math.round(deltaToCrit / rate));

    // If spoilage is imminent (under 15 mins) and not already rerouted, trigger dynamic diversion!
    if (projectedSpoilageMinutes <= 15 && !rerouteStatus?.active) {
      // Find candidate intercept hospital / satellite blood bank
      rerouteStatus = {
        active: true,
        originalFacility: 'NMMC General Hospital (Vashi)',
        reroutedFacility: 'Jeevan Jyoti Blood Centre (Nerul)',
        reason: `Cold-chain thermal runaway detected (${updatedTemp.toFixed(1)}°C, +${rate.toFixed(2)}°C/min). Spoilage ETA ${projectedSpoilageMinutes}m < Original Delivery ETA 32m.`,
        diversionTimeMinutes: 4,
        unitsPreserved: 4,
      };

      // Record in job timeline if job exists in DB
      try {
        const job = await prisma.logisticsJob.findUnique({ where: { id: jobId } });
        if (job) {
          const timeline = (job.timeline as any[]) || [];
          timeline.push({
            status: 'COLD_CHAIN_REROUTED',
            time: new Date().toISOString(),
            actorName: 'Autonomous IoT Cold-Chain Engine',
            note: `DIVERSION TRIGGERED: Rerouted from original destination to ${rerouteStatus.reroutedFacility}. 4 Units preserved.`,
          });
          await prisma.logisticsJob.update({
            where: { id: jobId },
            data: { timeline: timeline as any },
          });
        }
      } catch (e) {
        // Fallback for mock demo jobs
      }

      emitRealtimeEvent('logistics:cold_chain_alert', {
        jobId,
        alertType: 'CRITICAL_THERMAL_EXCURSION',
        currentTemp: updatedTemp,
        spoilageEtaMins: projectedSpoilageMinutes,
        reroute: rerouteStatus,
      });

      emitRealtimeEvent('logistics:rerouted', {
        jobId,
        reroute: rerouteStatus,
      });
    }
  }

  const sensorHealth: 'NOMINAL' | 'WARNING' | 'CRITICAL' =
    updatedTemp > criticalMax || updatedBattery < 10
      ? 'CRITICAL'
      : excursionDetected || updatedBattery < 25
      ? 'WARNING'
      : 'NOMINAL';

  const updated: ColdChainTelemetry = {
    ...current,
    currentTemp: updatedTemp,
    batteryPercent: updatedBattery,
    ambientTemp: updatedAmbient,
    rateOfRisePerMin: rate,
    sensorHealth,
    excursionDetected,
    projectedSpoilageMinutes,
    rerouteStatus,
    updatedAt: new Date().toISOString(),
  };

  telemetryStore.set(jobId, updated);
  return updated;
}

export async function simulateChillerFailure(jobId: string): Promise<ColdChainTelemetry> {
  return recordTelemetryReading(jobId, {
    currentTemp: 7.8, // breached beyond 6.0°C
    ambientTemp: 39.4,
    batteryPercent: 12,
    rateOfRisePerMin: 0.45,
  });
}

export function resetTelemetry(jobId: string): ColdChainTelemetry {
  const spec = COLD_CHAIN_SPECIFICATIONS.PRBC;
  const reset: ColdChainTelemetry = {
    jobId,
    cargoType: 'PRBC (Packed Red Blood Cells)',
    currentTemp: 3.8,
    targetMin: spec.minTemp,
    targetMax: spec.maxTemp,
    ambientTemp: 32.5,
    batteryPercent: 88,
    sensorHealth: 'NOMINAL',
    excursionDetected: false,
    rateOfRisePerMin: 0.05,
    projectedSpoilageMinutes: null,
    rerouteStatus: null,
    updatedAt: new Date().toISOString(),
  };
  telemetryStore.set(jobId, reset);
  emitRealtimeEvent('logistics:telemetry_reset', { jobId, telemetry: reset });
  return reset;
}
