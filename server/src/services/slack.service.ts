import axios from 'axios';

/**
 * Slack Service - MCB Ecosystem Phase 5
 * Handles operational broadcasting to institutional channels.
 */

export class SlackService {
  private static readonly WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || '';

  /**
   * Broadcasts a professional event to the corporate Slack channel.
   */
  static async broadcastEvent(title: string, message: string, type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT' = 'INFO') {
    if (!this.WEBHOOK_URL) {
      console.warn('[Slack] Broadcast skipped: SLACK_WEBHOOK_URL not configured.');
      return;
    }

    const color = type === 'SUCCESS' ? '#10b981' : type === 'WARNING' ? '#f59e0b' : type === 'ALERT' ? '#ef4444' : '#6366f1';
    
    const payload = {
        attachments: [
            {
                fallback: `${title}: ${message}`,
                color: color,
                title: title.toUpperCase(),
                text: message,
                footer: "MCB Cortex Intelligence",
                footer_icon: "https://nexus-hr-platform.web.app/logo-mini.png",
                ts: Math.floor(Date.now() / 1000)
            }
        ]
    };

    try {
      await axios.post(this.WEBHOOK_URL, payload);
      console.log(`[Slack] Broadcast successful: ${title}`);
    } catch (error: any) {
      console.error('[Slack] Broadcast failed:', error.message);
    }
  }

  /**
   * Agentic notification triggered by Cortex tool execution.
   */
  static async notifyAgentAction(action: string, detail: string) {
      return this.broadcastEvent('Cortex Autonomous Action', `${action}: ${detail}`, 'SUCCESS');
  }
}
