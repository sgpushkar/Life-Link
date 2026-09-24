import dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../../../.env'),
  ],
});

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/lifelink?schema=public',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'lifelink_jwt_access_secret_development_key_32bytes_long_min!',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'lifelink_jwt_refresh_secret_development_key_32bytes_long_min!',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  smsProvider: process.env.SMS_PROVIDER || 'mock',
  whatsappProvider: process.env.WHATSAPP_PROVIDER || 'mock',
  abdmProvider: process.env.ABDM_PROVIDER || 'mock',
  demoOtpCode: process.env.DEMO_OTP_CODE || '123456',
  defaultRoadSpeedKmph: parseInt(process.env.DEFAULT_ROAD_SPEED_KMPH || '40', 10),
};
