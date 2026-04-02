import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('email-service');

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private transporter: Transporter | null = null;
  private config: EmailConfig | null = null;
  private templates: Map<string, EmailTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  /**
   * Configure SMTP settings
   */
  public configure(config: EmailConfig): void {
    this.config = config;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });

    logger.info('Email service configured', { host: config.host, port: config.port });
  }

  /**
   * Initialize email templates
   */
  private initializeTemplates(): void {
    // Alert notification template
    this.templates.set('alert', {
      subject: 'Alert: {{taskName}} - {{severity}}',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 24px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .severity-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 12px;
      text-transform: uppercase;
    }
    .severity-info { background-color: #e3f2fd; color: #1976d2; }
    .severity-warning { background-color: #fff3e0; color: #f57c00; }
    .severity-critical { background-color: #ffebee; color: #d32f2f; }
    .content {
      margin-bottom: 20px;
    }
    .alert-message {
      background-color: #f8f9fa;
      border-left: 4px solid #dc3545;
      padding: 12px 16px;
      margin: 16px 0;
      border-radius: 4px;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
    }
    .details-table td {
      padding: 8px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    .details-table td:first-child {
      font-weight: 600;
      color: #666;
      width: 40%;
    }
    .footer {
      border-top: 1px solid #e0e0e0;
      padding-top: 16px;
      margin-top: 24px;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
    .btn {
      display: inline-block;
      padding: 10px 20px;
      background-color: #1976d2;
      color: #ffffff;
      text-decoration: none;
      border-radius: 4px;
      margin-top: 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="severity-badge severity-{{severityClass}}">{{severity}}</span>
      <h2 style="margin: 8px 0 0 0;">{{taskName}}</h2>
    </div>
    <div class="content">
      <p>An alert has been triggered for your monitored task:</p>
      <div class="alert-message">
        {{message}}
      </div>
      <table class="details-table">
        <tr>
          <td>Task ID</td>
          <td>{{taskId}}</td>
        </tr>
        <tr>
          <td>Task Type</td>
          <td>{{taskType}}</td>
        </tr>
        <tr>
          <td>Alert Time</td>
          <td>{{timestamp}}</td>
        </tr>
        <tr>
          <td>Condition</td>
          <td>{{condition}}</td>
        </tr>
      </table>
      <a href="{{dashboardUrl}}" class="btn">View Dashboard</a>
    </div>
    <div class="footer">
      <p>This is an automated alert from Synthetic Monitoring System.</p>
      <p>To manage your alert preferences, visit your dashboard settings.</p>
    </div>
  </div>
</body>
</html>
      `,
      text: `
ALERT: {{taskName}} - {{severity}}

An alert has been triggered for your monitored task.

Message: {{message}}

Task ID: {{taskId}}
Task Type: {{taskType}}
Alert Time: {{timestamp}}
Condition: {{condition}}

View dashboard: {{dashboardUrl}}

---
This is an automated alert from Synthetic Monitoring System.
      `,
    });

    // SSL expiry warning template
    this.templates.set('ssl_expiry', {
      subject: 'SSL Certificate Expiring Soon: {{taskName}}',
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
    .warning-box { background-color: #fff3e0; border-left: 4px solid #f57c00; padding: 16px; margin: 16px 0; }
    .days-left { font-size: 24px; font-weight: bold; color: #f57c00; }
  </style>
</head>
<body>
  <h2>SSL Certificate Expiring</h2>
  <div class="warning-box">
    <p>Your SSL certificate for <strong>{{taskName}}</strong> will expire in:</p>
    <p class="days-left">{{daysLeft}} days</p>
    <p>Expiration Date: {{expiryDate}}</p>
  </div>
  <p>Please renew your certificate before it expires to avoid service disruption.</p>
</body>
</html>
      `,
      text: `
SSL Certificate Expiring Soon

Your SSL certificate for {{taskName}} will expire in {{daysLeft}} days.
Expiration Date: {{expiryDate}}

Please renew your certificate before it expires.
      `,
    });
  }

  /**
   * Send email with template
   */
  public async sendEmail(
    to: string | string[],
    templateName: string,
    variables: Record<string, string | number>
  ): Promise<boolean> {
    if (!this.transporter) {
      logger.warn('Email service not configured, skipping email send');
      return false;
    }

    const template = this.templates.get(templateName);
    if (!template) {
      logger.error(`Email template not found: ${templateName}`);
      return false;
    }

    try {
      // Replace template variables
      let subject = template.subject;
      let html = template.html;
      let text = template.text;

      for (const [key, value] of Object.entries(variables)) {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(placeholder, String(value));
        html = html.replace(placeholder, String(value));
        if (text) {
          text = text.replace(placeholder, String(value));
        }
      }

      const recipients = Array.isArray(to) ? to : [to];
      const mailOptions: SendMailOptions = {
        from: this.config?.from,
        to: recipients,
        subject,
        html,
        text: text || undefined,
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info('Email sent successfully', { messageId: info.messageId, recipients });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to send email', { error: errorMessage, to });
      return false;
    }
  }

  /**
   * Send raw HTML email (for reports)
   */
  public async sendHTMLEmail(
    to: string | string[],
    subject: string,
    html: string,
    isHtml: boolean = true
  ): Promise<boolean> {
    if (!this.transporter) {
      logger.warn('Email service not configured, skipping email send');
      return false;
    }

    try {
      const recipients = Array.isArray(to) ? to : [to];
      const mailOptions: SendMailOptions = {
        from: this.config?.from,
        to: recipients,
        subject,
        html: isHtml ? html : undefined,
        text: !isHtml ? html : undefined,
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info('HTML Email sent successfully', { messageId: info.messageId, recipients });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to send HTML email', { error: errorMessage, to });
      return false;
    }
  }

  /**
   * Send alert notification email
   */
  public async sendAlertEmail(
    recipients: string[],
    taskName: string,
    taskId: string,
    taskType: string,
    message: string,
    severity: 'INFO' | 'WARNING' | 'CRITICAL',
    condition: string,
    dashboardUrl: string = '#'
  ): Promise<boolean> {
    const severityClass = severity.toLowerCase();
    const timestamp = new Date().toISOString();

    return this.sendEmail(recipients, 'alert', {
      taskName,
      taskId,
      taskType,
      message,
      severity,
      severityClass,
      condition,
      timestamp,
      dashboardUrl,
    });
  }

  /**
   * Send SSL expiry warning email
   */
  public async sendSSLEmail(
    recipients: string[],
    taskName: string,
    daysLeft: number,
    expiryDate: string
  ): Promise<boolean> {
    return this.sendEmail(recipients, 'ssl_expiry', {
      taskName,
      daysLeft,
      expiryDate,
    });
  }

  /**
   * Test email configuration
   */
  public async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      logger.error('Email connection test failed', { error });
      return false;
    }
  }

  /**
   * Get email configuration status
   */
  public isConfigured(): boolean {
    return this.transporter !== null;
  }
}

// Singleton instance
export const emailService = new EmailService();
