import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { prisma } from '../../prisma.js';
import { config } from '../../config.js';
import { verifyAuth } from '../../middleware/auth.js';
import { loginSchema, otpRequestSchema, otpVerifySchema } from '@lifelink/shared';
import { createAuditLog } from '../../services/audit.js';

export const authRouter = Router();

function generateTokens(user: { id: string; phone: string; name: string; role: UserRole; facilityId?: string | null }) {
  const payload = {
    userId: user.id,
    phone: user.phone,
    name: user.name,
    role: user.role,
    facilityId: user.facilityId || null,
  };

  const accessToken = jwt.sign(payload, config.jwtAccessSecret, { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, config.jwtRefreshSecret, { expiresIn: '7d' });

  return { accessToken, refreshToken };
}

// 1. Password Login
authRouter.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.format() } });
  }

  const { phone, password } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { phone },
    include: { facility: true, donorProfile: true },
  });

  if (!user) {
    return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid phone or password' } });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid phone or password' } });
  }

  const { accessToken, refreshToken } = generateTokens(user);

  res.cookie('lifelink_access_token', accessToken, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000,
  });

  res.cookie('lifelink_refresh_token', refreshToken, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  await createAuditLog({
    actorId: user.id,
    action: 'USER_LOGIN',
    entity: 'User',
    entityId: user.id,
    ip: req.ip,
  });

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      facilityId: user.facilityId,
      facility: user.facility,
      donorProfile: user.donorProfile,
      language: user.language,
    },
    accessToken,
    refreshToken,
  });
});

// 2. Demo Persona Switcher (Instant 1-click login as any role for judges)
authRouter.post('/persona-login', async (req: Request, res: Response) => {
  const { role, phone } = req.body;

  let user;
  if (phone) {
    user = await prisma.user.findUnique({
      where: { phone },
      include: { facility: true, donorProfile: true },
    });
  } else if (role) {
    user = await prisma.user.findFirst({
      where: { role: role as UserRole },
      include: { facility: true, donorProfile: true },
    });
  }

  if (!user) {
    return res.status(404).json({ error: { code: 'PERSONA_NOT_FOUND', message: 'Requested persona user not found' } });
  }

  const { accessToken, refreshToken } = generateTokens(user);

  res.cookie('lifelink_access_token', accessToken, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000,
  });

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      facilityId: user.facilityId,
      facility: user.facility,
      donorProfile: user.donorProfile,
      language: user.language,
    },
    accessToken,
    refreshToken,
  });
});

// 3. List Demo Personas
authRouter.get('/personas', async (_req: Request, res: Response) => {
  const demoPhones = [
    '9820011001', // PHC Kalyan (Nurse Priya)
    '9820011002', // CHC Murbad (Dr. Anand)
    '9820011003', // Blood Bank Thane (Dr. Meera)
    '9820011004', // Donor (Ramesh Patil)
    '9820011005', // Transport (Santosh Jadhav)
    '9820011006', // DHO (Dr. Rajesh Shinde)
    '9820011007', // State Admin (Dr. Sunita)
  ];

  const personas = await prisma.user.findMany({
    where: { phone: { in: demoPhones } },
    include: { facility: true, donorProfile: true },
  });

  return res.json({ personas });
});

// 4. Mock OTP Request & Verify
authRouter.post('/otp/request', (req: Request, res: Response) => {
  const parsed = otpRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Valid phone required' } });
  }

  return res.json({
    success: true,
    message: `OTP sent successfully. In dev mode, use code ${config.demoOtpCode}`,
    debugCode: config.demoOtpCode,
  });
});

authRouter.post('/otp/verify', async (req: Request, res: Response) => {
  const parsed = otpVerifySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Valid phone & 6-digit OTP required' } });
  }

  const { phone, otp } = parsed.data;
  if (otp !== config.demoOtpCode) {
    return res.status(401).json({ error: { code: 'INVALID_OTP', message: 'Incorrect OTP' } });
  }

  const user = await prisma.user.findUnique({
    where: { phone },
    include: { facility: true, donorProfile: true },
  });

  if (!user) {
    return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'No registered user with this phone' } });
  }

  const { accessToken, refreshToken } = generateTokens(user);

  res.cookie('lifelink_access_token', accessToken, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000,
  });

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      facilityId: user.facilityId,
      facility: user.facility,
      donorProfile: user.donorProfile,
    },
    accessToken,
    refreshToken,
  });
});

// 5. Token Refresh
authRouter.post('/refresh', (req: Request, res: Response) => {
  const token = req.cookies?.lifelink_refresh_token || req.body?.refreshToken;

  if (!token) {
    return res.status(401).json({ error: { code: 'NO_REFRESH_TOKEN', message: 'Refresh token missing' } });
  }

  try {
    const payload = jwt.verify(token, config.jwtRefreshSecret) as any;
    const { accessToken, refreshToken } = generateTokens({
      id: payload.userId,
      phone: payload.phone,
      name: payload.name,
      role: payload.role,
      facilityId: payload.facilityId,
    });

    res.cookie('lifelink_access_token', accessToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    return res.json({ accessToken, refreshToken });
  } catch {
    return res.status(401).json({ error: { code: 'INVALID_REFRESH_TOKEN', message: 'Invalid or expired refresh token' } });
  }
});

// 6. Logout
authRouter.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('lifelink_access_token');
  res.clearCookie('lifelink_refresh_token');
  return res.json({ success: true, message: 'Logged out successfully' });
});

// 7. Get Current User Info
authRouter.get('/me', verifyAuth, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    include: { facility: true, donorProfile: true },
  });

  if (!user) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
  }

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      facilityId: user.facilityId,
      facility: user.facility,
      donorProfile: user.donorProfile,
      language: user.language,
    },
  });
});
