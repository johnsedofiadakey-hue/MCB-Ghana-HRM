import { SchemaType } from '@google/generative-ai';
import prisma from '../prisma/client';
import { getEffectiveLeaveMetrics } from '../utils/leave.utils';
import { GoogleWorkspaceService } from './workspace.service';
import { SlackService } from './slack.service';
import { LeaveService } from './leave.service';

/**
 * AI Tool Registry - Phase 4 Agentic Intelligence
 * Defines the tools (functions) that the Cortex Agent can call autonomously.
 */

export const functionDeclarations = [
  {
    name: 'get_organization_health',
    description: 'Retrieves high-level organizational metrics including headcount, pending leaves, and departmental distributions.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        forceRefresh: { type: SchemaType.BOOLEAN, description: 'Whether to bypass cache.' }
      }
    }
  },
  {
    name: 'search_employees',
    description: 'Search for employees by name, department, or job title within the organization.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: { type: SchemaType.STRING, description: 'The search term (name, title, or dept).' }
      },
      required: ['query']
    }
  },
  {
    name: 'request_leave',
    description: 'Drafts or submits a leave request for the current user. Requires date range and type.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        leaveType: { type: SchemaType.STRING, enum: ['ANNUAL', 'SICK', 'MATERNITY', 'CASUAL', 'STUDY'], description: 'Type of leave' },
        startDate: { type: SchemaType.STRING, description: 'Start date in YYYY-MM-DD format' },
        endDate: { type: SchemaType.STRING, description: 'End date in YYYY-MM-DD format' },
        reason: { type: SchemaType.STRING, description: 'Reason for the request' }
      },
      required: ['leaveType', 'startDate', 'endDate']
    }
  },
  {
    name: 'get_my_metrics',
    description: 'Retrieves the current user\'s leave balance, KPI performance, and target statuses.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {}
    }
  },
  {
    name: 'schedule_calendar_event',
    description: 'Schedules a new meeting or event in the organization Google Calendar.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        summary: { type: SchemaType.STRING, description: 'Event title' },
        startTime: { type: SchemaType.STRING, description: 'ISO 8601 start time' },
        endTime: { type: SchemaType.STRING, description: 'ISO 8601 end time' },
        description: { type: SchemaType.STRING, description: 'Detailed agenda' },
        attendees: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: 'List of emails' }
      },
      required: ['summary', 'startTime', 'endTime']
    }
  },
  {
    name: 'post_to_slack',
    description: 'Broadcasts a corporate update to the institutional Slack channel.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        message: { type: SchemaType.STRING, description: 'The text to broadcast' },
        priority: { type: SchemaType.STRING, enum: ['INFO', 'SUCCESS', 'WARNING', 'ALERT'], description: 'Message type' }
      },
      required: ['message']
    }
  }
];

/**
 * Tool Execution Handler
 * Maps AI tool calls to secure Prisma/Service operations.
 */
export const executeTool = async (name: string, args: any, user: any) => {
  const organizationId = user.organizationId || 'default-tenant';

  console.log(`[Cortex Agent] Executing Tool: ${name}`, args);

  switch (name) {
    case 'get_organization_health':
      const [count, depts, activeLeaves] = await Promise.all([
        prisma.user.count({ where: { organizationId, isArchived: false } }),
        prisma.department.findMany({ where: { organizationId }, select: { name: true, _count: { select: { employees: true } } } }),
        prisma.leaveRequest.count({ where: { organizationId, status: 'PENDING' } })
      ]);
      return { totalHeadcount: count, departments: depts, pendingLeaveRequests: activeLeaves };

    case 'search_employees':
      const employees = await prisma.user.findMany({
        where: {
          organizationId,
          isArchived: false,
          OR: [
            { fullName: { contains: args.query, mode: 'insensitive' } },
            { departmentObj: { name: { contains: args.query, mode: 'insensitive' } } },
            { jobTitle: { contains: args.query, mode: 'insensitive' } }
          ]
        },
        select: { fullName: true, jobTitle: true, departmentObj: { select: { name: true } }, email: true },
        take: 10
      });
      return { results: employees };

    case 'get_my_metrics':
      const me = await prisma.user.findUnique({
        where: { id: user.id },
        include: { 
            departmentObj: true
        }
      });
      if (!me) return { error: 'User context not found' };
      const leaveMetrics = getEffectiveLeaveMetrics(me as any);
      return {
        fullName: me.fullName,
        leaveBalance: leaveMetrics.balance,
        department: me.departmentObj?.name
      };

    case 'request_leave':
      const newLeave = await LeaveService.requestLeave(organizationId, user.id, {
        startDate: args.startDate,
        endDate: args.endDate,
        leaveType: args.leaveType,
        reason: args.reason || 'Requested via Cortex AI',
        relieverId: args.relieverId || null
      });
      return { 
        status: 'SUCCESS', 
        message: 'Leave request created and pending approval',
        requestId: newLeave.id,
        days: newLeave.leaveDays 
      };

    case 'schedule_calendar_event':
      const eventDetails = {
        summary: args.summary,
        description: args.description || 'Scheduled via Nexus Cortex AI',
        startTime: args.startTime, // Should be ISO string
        endTime: args.endTime,
        attendees: args.attendees || []
      };
      const event = await GoogleWorkspaceService.scheduleEvent(eventDetails);
      await SlackService.notifyAgentAction('Event Scheduled', `${args.summary} at ${args.startTime}`);
      return { status: 'SUCCESS', calendarLink: event.htmlLink, id: event.id };

    case 'post_to_slack':
      await SlackService.broadcastEvent('Cortex Intelligence Update', args.message, args.priority || 'INFO');
      return { status: 'SUCCESS', channel: 'Nexus-Ops' };

    case 'sync_to_drive':
      // This tool would normally take a file buffer or path. For the agent, we simulate 
      // by syncing a specific report they just generated.
      return { status: 'SUCCESS', driveId: 'cloud-vault-sync-id-123' };

    default:
      throw new Error(`Tool ${name} not implemented`);
  }
};
