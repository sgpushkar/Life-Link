import { Router, Request, Response } from 'express';
import { prisma } from '../../prisma.js';
import { handleInboundSms } from '../../services/smsParser.js';
import { emitRealtimeEvent } from '../../realtime/socket.js';

export const smsRouter = Router();

// 1. Inbound SMS Webhook (Handles feature phone messages)
smsRouter.post('/inbound', async (req: Request, res: Response) => {
  const { fromPhone, body } = req.body;

  if (!fromPhone || !body) {
    return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'fromPhone and body required' } });
  }

  // Parse command & execute domain operation
  const result = await handleInboundSms(fromPhone, body);

  // Store in database
  const inMsg = await prisma.smsInbox.create({
    data: {
      fromPhone,
      body,
      parsedIntent: result.intent,
    },
  });

  const outMsg = await prisma.smsOutbox.create({
    data: {
      toPhone: fromPhone,
      body: result.reply,
      provider: 'mock',
      status: 'DELIVERED',
    },
  });

  // Emit to dev feature phone simulator
  emitRealtimeEvent('feature_phone:sms_exchange', {
    inbound: inMsg,
    outbound: outMsg,
    intent: result.intent,
  });

  return res.json({
    success: result.success,
    intent: result.intent,
    reply: result.reply,
    outboxId: outMsg.id,
  });
});

// 2. USSD Session Webhook (*123# menu tree)
smsRouter.post('/ussd', async (req: Request, res: Response) => {
  const { sessionId, phoneNumber, text = '' } = req.body;

  const cleanText = text.trim();
  let response = '';

  // Main Menu
  if (cleanText === '') {
    response =
      'CON Welcome to LifeLink USSD\n' +
      '1. Update Facility Stock\n' +
      '2. Emergency Request Resource\n' +
      '3. Find Nearest Resource\n' +
      '4. Active Allocations Status';
  } else if (cleanText === '1') {
    response =
      'CON Select Stock to Update:\n' +
      '1. Ventilators (+1 Available)\n' +
      '2. Oxygen Concentrators (+1 Available)\n' +
      '3. Report Zero Stock';
  } else if (cleanText === '1*1') {
    // Execute stock increment
    await handleInboundSms(phoneNumber, 'STOCK VENT 3');
    response = 'END LifeLink: 1 Ventilator added to available stock at your facility. Network notified.';
  } else if (cleanText === '1*2') {
    await handleInboundSms(phoneNumber, 'STOCK O2 5');
    response = 'END LifeLink: 1 Oxygen Concentrator added to available stock. Network notified.';
  } else if (cleanText === '1*3') {
    await handleInboundSms(phoneNumber, 'STOCK VENT 0');
    response = 'END LifeLink: Critical alert logged. Standby providers alerted.';
  } else if (cleanText === '2') {
    response =
      'CON Emergency Request (Criticality 5):\n' +
      '1. Request 1 Oxygen Concentrator\n' +
      '2. Request 1 Invasive Ventilator\n' +
      '3. Request 2 Units B+ Blood';
  } else if (cleanText === '2*1') {
    const res = await handleInboundSms(phoneNumber, 'NEED O2 1 URGENT 5');
    response = `END ${res.reply}`;
  } else if (cleanText === '2*2') {
    const res = await handleInboundSms(phoneNumber, 'NEED VENT 1 URGENT 5');
    response = `END ${res.reply}`;
  } else if (cleanText === '2*3') {
    const res = await handleInboundSms(phoneNumber, 'NEED BLOOD B+ 2 URGENT 5');
    response = `END ${res.reply}`;
  } else if (cleanText === '3') {
    const res = await handleInboundSms(phoneNumber, 'FIND VENT');
    response = `END ${res.reply}`;
  } else if (cleanText === '4') {
    response = 'END LifeLink: Job #L-891 IN_TRANSIT. Driver: Santosh (ETA 12 mins).';
  } else {
    response = 'END Invalid selection. Please dial *123# again.';
  }

  return res.type('text/plain').send(response);
});
