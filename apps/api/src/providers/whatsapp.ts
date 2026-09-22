import { prisma } from '../prisma.js';
import { getSocketIO } from '../realtime/socket.js';

export interface WhatsAppProvider {
  sendWhatsApp(toPhone: string, template: string, params: Record<string, any>): Promise<boolean>;
}

export class MockWhatsAppProvider implements WhatsAppProvider {
  async sendWhatsApp(
    toPhone: string,
    template: string,
    params: Record<string, any>
  ): Promise<boolean> {
    try {
      const body = `[WhatsApp: ${template}] ${JSON.stringify(params)}`;
      const record = await prisma.notification.create({
        data: {
          channel: 'WHATSAPP',
          template,
          payload: { toPhone, ...params },
          status: 'DELIVERED',
        },
      });

      const io = getSocketIO();
      if (io) {
        io.emit('whatsapp:received', { toPhone, template, params, record });
      }

      console.log(`💬 [Mock WhatsApp to ${toPhone}]: ${body}`);
      return true;
    } catch (err) {
      console.error('Mock WhatsApp failed:', err);
      return false;
    }
  }
}

export function getWhatsAppProvider(): WhatsAppProvider {
  return new MockWhatsAppProvider();
}
