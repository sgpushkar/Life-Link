import { Router, Request, Response } from 'express';
import { prisma } from '../../prisma.js';
import { verifyAuth } from '../../middleware/auth.js';
import { emitRealtimeEvent } from '../../realtime/socket.js';
import { EquipmentStatus } from '@prisma/client';

export const syncRouter = Router();

export interface SyncOperation {
  id: string;
  clientId: string;
  opType: 'INVENTORY_EQUIPMENT_UPDATE' | 'CREATE_REQUEST' | 'PLEDGE_DONATION';
  payload: Record<string, any>;
  clientTimestamp: number;
}

// Batch Sync Endpoint for Offline Operation Replay
syncRouter.post('/', verifyAuth, async (req: Request, res: Response) => {
  const { ops } = req.body as { ops: SyncOperation[] };

  if (!ops || !Array.isArray(ops)) {
    return res.status(400).json({ error: { code: 'INVALID_PAYLOAD', message: 'Array of ops required' } });
  }

  const results = {
    applied: 0,
    conflicts: [] as Array<{ opId: string; reason: string; serverState: any }>,
  };

  const now = new Date();

  for (const op of ops) {
    try {
      // 1. Check idempotency: Has this op already been applied?
      const existingOp = await prisma.syncOp.findUnique({
        where: { clientId: op.clientId },
      });

      if (existingOp) {
        // Already processed
        results.applied += 1;
        continue;
      }

      let conflict = false;
      let conflictReason = '';
      let serverState = null;

      // 2. Handle Operation by Type
      if (op.opType === 'INVENTORY_EQUIPMENT_UPDATE') {
        const { unitId, targetStatus, facilityId, typeCode } = op.payload;

        if (unitId) {
          const unit = await prisma.equipmentUnit.findUnique({ where: { id: unitId } });
          if (!unit) {
            conflict = true;
            conflictReason = 'Unit no longer exists on server';
          } else {
            // Check last writer wins
            const serverTime = new Date(unit.updatedAt).getTime();
            if (serverTime > op.clientTimestamp) {
              // Server has newer update
              conflict = true;
              conflictReason = 'Server has newer status modification';
              serverState = { status: unit.status, updatedAt: unit.updatedAt };
            } else {
              await prisma.equipmentUnit.update({
                where: { id: unitId },
                data: { status: targetStatus as EquipmentStatus, updatedAt: now },
              });
            }
          }
        } else if (targetStatus === 'DECREMENT') {
          // Verify we don't decrement below zero
          const availableUnits = await prisma.equipmentUnit.findMany({
            where: { facilityId, status: EquipmentStatus.AVAILABLE },
          });

          if (availableUnits.length === 0) {
            conflict = true;
            conflictReason = 'Concurrent allocation depleted available units to zero; decrement rejected.';
            serverState = { availableCount: 0 };
          } else {
            await prisma.equipmentUnit.update({
              where: { id: availableUnits[0].id },
              data: { status: EquipmentStatus.IN_USE, updatedAt: now },
            });
          }
        }
      }

      // Record sync op log in database
      await prisma.syncOp.create({
        data: {
          clientId: op.clientId,
          userId: req.user!.userId,
          opType: op.opType,
          payload: op.payload,
          clientTimestamp: BigInt(op.clientTimestamp),
          appliedAt: conflict ? null : now,
          conflict,
        },
      });

      if (conflict) {
        results.conflicts.push({
          opId: op.id || op.clientId,
          reason: conflictReason,
          serverState,
        });
      } else {
        results.applied += 1;
      }
    } catch (err: any) {
      console.error(`Sync operation error for op ${op.clientId}:`, err);
      results.conflicts.push({
        opId: op.id || op.clientId,
        reason: err.message,
        serverState: null,
      });
    }
  }

  emitRealtimeEvent('sync:completed', { userId: req.user!.userId, applied: results.applied });
  return res.json(results);
});
