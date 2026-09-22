import { prisma } from '../prisma.js';

export interface AuditLogParams {
  actorId?: string;
  action: string;
  entity: string;
  entityId: string;
  before?: any;
  after?: any;
  ip?: string;
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId || null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        before: params.before ? (params.before as any) : undefined,
        after: params.after ? (params.after as any) : undefined,
        ip: params.ip || null,
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
