import { prisma } from '../prisma.js';
import { config } from '../config.js';
import { getSocketIO } from '../realtime/socket.js';

export interface SmsProvider {
  sendSms(toPhone: string, body: string): Promise<boolean>;
}

export class MockSmsProvider implements SmsProvider {
  async sendSms(toPhone: string, body: string): Promise<boolean> {
    try {
      const record = await prisma.smsOutbox.create({
        data: {
          toPhone,
          body,
          provider: 'mock',
          status: 'DELIVERED',
        },
      });

      // Emit real-time notification to the dev SMS simulator UI
      const io = getSocketIO();
      if (io) {
        io.emit('sms:received', record);
      }

      console.log(`📱 [Mock SMS to ${toPhone}]: ${body}`);
      return true;
    } catch (err) {
      console.error('Mock SMS failed:', err);
      return false;
    }
  }
}

export class TwilioSmsProvider implements SmsProvider {
  async sendSms(toPhone: string, body: string): Promise<boolean> {
    console.log(`[Twilio SMS Stub] Sending SMS to ${toPhone}`);
    // Real Twilio client call would go here when credentials are supplied
    return true;
  }
}

export class Msg91SmsProvider implements SmsProvider {
  async sendSms(toPhone: string, body: string): Promise<boolean> {
    console.log(`[MSG91 SMS Stub] Sending SMS to ${toPhone}`);
    // Real MSG91 client call would go here when credentials are supplied
    return true;
  }
}

export function getSmsProvider(): SmsProvider {
  if (config.smsProvider === 'twilio') {
    return new TwilioSmsProvider();
  }
  if (config.smsProvider === 'msg91') {
    return new Msg91SmsProvider();
  }
  return new MockSmsProvider();
}
