"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeTool = exports.functionDeclarations = void 0;
const generative_ai_1 = require("@google/generative-ai");
const client_1 = __importDefault(require("../prisma/client"));
const leave_utils_1 = require("../utils/leave.utils");
const workspace_service_1 = require("./workspace.service");
const slack_service_1 = require("./slack.service");
const leave_service_1 = require("./leave.service");
/**
 * AI Tool Registry - Phase 4 Agentic Intelligence
 * Defines the tools (functions) that the Cortex Agent can call autonomously.
 */
exports.functionDeclarations = [
    {
        name: 'get_organization_health',
        description: 'Retrieves high-level organizational metrics including headcount, pending leaves, and departmental distributions.',
        parameters: {
            type: generative_ai_1.SchemaType.OBJECT,
            properties: {
                forceRefresh: { type: generative_ai_1.SchemaType.BOOLEAN, description: 'Whether to bypass cache.' }
            }
        }
    },
    {
        name: 'search_employees',
        description: 'Search for employees by name, department, or job title within the organization.',
        parameters: {
            type: generative_ai_1.SchemaType.OBJECT,
            properties: {
                query: { type: generative_ai_1.SchemaType.STRING, description: 'The search term (name, title, or dept).' }
            },
            required: ['query']
        }
    },
    {
        name: 'request_leave',
        description: 'Drafts or submits a leave request for the current user. Requires date range and type.',
        parameters: {
            type: generative_ai_1.SchemaType.OBJECT,
            properties: {
                leaveType: { type: generative_ai_1.SchemaType.STRING, enum: ['ANNUAL', 'SICK', 'MATERNITY', 'CASUAL', 'STUDY'], description: 'Type of leave' },
                startDate: { type: generative_ai_1.SchemaType.STRING, description: 'Start date in YYYY-MM-DD format' },
                endDate: { type: generative_ai_1.SchemaType.STRING, description: 'End date in YYYY-MM-DD format' },
                reason: { type: generative_ai_1.SchemaType.STRING, description: 'Reason for the request' }
            },
            required: ['leaveType', 'startDate', 'endDate']
        }
    },
    {
        name: 'get_my_metrics',
        description: 'Retrieves the current user\'s leave balance, KPI performance, and target statuses.',
        parameters: {
            type: generative_ai_1.SchemaType.OBJECT,
            properties: {}
        }
    },
    {
        name: 'schedule_calendar_event',
        description: 'Schedules a new meeting or event in the organization Google Calendar.',
        parameters: {
            type: generative_ai_1.SchemaType.OBJECT,
            properties: {
                summary: { type: generative_ai_1.SchemaType.STRING, description: 'Event title' },
                startTime: { type: generative_ai_1.SchemaType.STRING, description: 'ISO 8601 start time' },
                endTime: { type: generative_ai_1.SchemaType.STRING, description: 'ISO 8601 end time' },
                description: { type: generative_ai_1.SchemaType.STRING, description: 'Detailed agenda' },
                attendees: { type: generative_ai_1.SchemaType.ARRAY, items: { type: generative_ai_1.SchemaType.STRING }, description: 'List of emails' }
            },
            required: ['summary', 'startTime', 'endTime']
        }
    },
    {
        name: 'post_to_slack',
        description: 'Broadcasts a corporate update to the institutional Slack channel.',
        parameters: {
            type: generative_ai_1.SchemaType.OBJECT,
            properties: {
                message: { type: generative_ai_1.SchemaType.STRING, description: 'The text to broadcast' },
                priority: { type: generative_ai_1.SchemaType.STRING, enum: ['INFO', 'SUCCESS', 'WARNING', 'ALERT'], description: 'Message type' }
            },
            required: ['message']
        }
    }
];
/**
 * Tool Execution Handler
 * Maps AI tool calls to secure Prisma/Service operations.
 */
const executeTool = async (name, args, user) => {
    const organizationId = user.organizationId || 'mcb-ghana-tenant';
    console.log(`[Cortex Agent] Executing Tool: ${name}`, args);
    switch (name) {
        case 'get_organization_health':
            const [count, depts, activeLeaves] = await Promise.all([
                client_1.default.user.count({ where: { organizationId, isArchived: false } }),
                client_1.default.department.findMany({ where: { organizationId }, select: { name: true, _count: { select: { employees: true } } } }),
                client_1.default.leaveRequest.count({ where: { organizationId, status: 'PENDING' } })
            ]);
            return { totalHeadcount: count, departments: depts, pendingLeaveRequests: activeLeaves };
        case 'search_employees':
            const employees = await client_1.default.user.findMany({
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
            const me = await client_1.default.user.findUnique({
                where: { id: user.id },
                include: {
                    departmentObj: true
                }
            });
            if (!me)
                return { error: 'User context not found' };
            const leaveMetrics = (0, leave_utils_1.getEffectiveLeaveMetrics)(me);
            return {
                fullName: me.fullName,
                leaveBalance: leaveMetrics.balance,
                department: me.departmentObj?.name
            };
        case 'request_leave':
            // The AI extracts a natural-language date range; convert to the discrete weekday
            // list the leave system now requires (weekends excluded — holidays are validated
            // server-side inside LeaveService.requestLeave).
            const rangeStart = new Date(`${args.startDate}T00:00:00.000Z`);
            const rangeEnd = new Date(`${args.endDate}T00:00:00.000Z`);
            const weekdayDates = [];
            for (const cur = new Date(rangeStart); cur <= rangeEnd; cur.setUTCDate(cur.getUTCDate() + 1)) {
                const dow = cur.getUTCDay();
                if (dow !== 0 && dow !== 6)
                    weekdayDates.push(cur.toISOString().split('T')[0]);
            }
            const newLeave = await leave_service_1.LeaveService.requestLeave(organizationId, user.id, {
                dates: weekdayDates,
                leaveType: args.leaveType,
                reason: args.reason || 'Requested via Cortex AI',
                relieverId: args.relieverId || null
            });
            return {
                status: 'SUCCESS',
                message: 'Leave request created and pending approval',
                requestId: newLeave.leave.id,
                days: newLeave.leave.leaveDays
            };
        case 'schedule_calendar_event':
            const eventDetails = {
                summary: args.summary,
                description: args.description || 'Scheduled via MCB Cortex AI',
                startTime: args.startTime, // Should be ISO string
                endTime: args.endTime,
                attendees: args.attendees || []
            };
            const event = await workspace_service_1.GoogleWorkspaceService.scheduleEvent(eventDetails);
            await slack_service_1.SlackService.notifyAgentAction('Event Scheduled', `${args.summary} at ${args.startTime}`);
            return { status: 'SUCCESS', calendarLink: event.htmlLink, id: event.id };
        case 'post_to_slack':
            await slack_service_1.SlackService.broadcastEvent('Cortex Intelligence Update', args.message, args.priority || 'INFO');
            return { status: 'SUCCESS', channel: 'MCB-Ops' };
        case 'sync_to_drive':
            // This tool would normally take a file buffer or path. For the agent, we simulate 
            // by syncing a specific report they just generated.
            return { status: 'SUCCESS', driveId: 'cloud-vault-sync-id-123' };
        default:
            throw new Error(`Tool ${name} not implemented`);
    }
};
exports.executeTool = executeTool;
