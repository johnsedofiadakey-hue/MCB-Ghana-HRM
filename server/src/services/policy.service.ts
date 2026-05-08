import prisma from '../prisma/client';

export class PolicyService {
  /**
   * Evaluates if a user has permission to perform an action on a target.
   * @param userId The ID of the user performing the action.
   * @param permission The permission string (e.g., 'leave.approve').
   * @param context Contextual data like targetUserId, departmentId, etc.
   */
  static async evaluatePolicy(userId: string, permission: string, context: any = {}): Promise<{ allowed: boolean; reason: string }> {
    // 1. Get user with bundles
    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
      include: { permissionBundles: true },
    });

    if (!user) return { allowed: false, reason: 'User not found' };

    // Super admin override (assuming rank >= 90 or role 'ADMIN')
    if (user.role === 'ADMIN' || user.rank >= 90) {
      return { allowed: true, reason: `Super admin override (Role: ${user.role}, Rank: ${user.rank})` };
    }

    // 2. Check direct permissions from bundles
    for (const bundle of user.permissionBundles) {
      const hasPerm = bundle.permissions.includes(permission);
      if (hasPerm) {
        const scopeAllowed = this.evaluateScope(user, bundle.scope, context);
        if (scopeAllowed) {
          return { allowed: true, reason: `Granted by bundle "${bundle.name}" with scope "${bundle.scope}"` };
        }
      }
    }

    // 3. Check delegations
    const activeDelegations = await (prisma as any).delegation.findMany({
      where: {
        delegateId: userId,
        status: 'ACTIVE',
        startTime: { lte: new Date() },
        endTime: { gte: new Date() },
      },
    });

    for (const delegation of activeDelegations) {
      // Check if the granter has the permission
      const granterResult = await this.evaluatePolicy(delegation.granterId, permission, context);
      if (granterResult.allowed) {
        return { 
          allowed: true, 
          reason: `Granted via delegation from user ${delegation.granterId}. Reason for granter: ${granterResult.reason}` 
        };
      }
    }

    return { allowed: false, reason: 'No matching permission bundle or active delegation found with appropriate scope' };
  }

  private static evaluateScope(user: any, scope: string, context: any): boolean {
    switch (scope) {
      case 'ORG':
        return true; // Org-wide access
      case 'DEPT':
        return context.departmentId === user.departmentId;
      case 'TEAM':
        return context.supervisorId === user.id;
      case 'SELF':
        return context.targetUserId === user.id;
      default:
        return false;
    }
  }
}
