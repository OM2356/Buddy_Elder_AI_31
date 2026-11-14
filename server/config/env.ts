import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

function loadOrCreateDevSecrets(): { jwtSecret: string; backupSecret: string } {
  const devSecretPath = path.resolve(process.cwd(), '.dev-secrets.json');
  try {
    if (fs.existsSync(devSecretPath)) {
      const parsed = JSON.parse(fs.readFileSync(devSecretPath, 'utf-8'));
      if (parsed.jwtSecret && parsed.backupSecret && parsed.jwtSecret !== parsed.backupSecret) {
        return { jwtSecret: parsed.jwtSecret, backupSecret: parsed.backupSecret };
      }
    }
  } catch {
    // Regenerate below if corrupted
  }
  const generated = {
    jwtSecret: crypto.randomBytes(48).toString('hex'),
    backupSecret: crypto.randomBytes(48).toString('hex'),
  };
  fs.writeFileSync(devSecretPath, JSON.stringify(generated, null, 2), { mode: 0o600 });
  return generated;
}

function resolveMandatorySecrets(): { jwtSecret: string; backupSecret: string } {
  const envJwt = process.env.JWT_SECRET?.trim();
  const envBackup = process.env.BACKUP_ENCRYPTION_SECRET?.trim();

  if (isProduction) {
    if (!envJwt || envJwt.length < 32 || envJwt.includes('REPLACE_WITH')) {
      throw new Error('FATAL: JWT_SECRET environment variable must be set (min 32 chars) in production.');
    }
    if (!envBackup || envBackup.length < 32 || envBackup.includes('REPLACE_WITH')) {
      throw new Error('FATAL: BACKUP_ENCRYPTION_SECRET environment variable must be set (min 32 chars) in production.');
    }
    if (envJwt === envBackup) {
      throw new Error('FATAL: BACKUP_ENCRYPTION_SECRET must be distinct from JWT_SECRET.');
    }
    return { jwtSecret: envJwt, backupSecret: envBackup };
  }

  const devSecrets = loadOrCreateDevSecrets();
  const jwtSecret = envJwt && !envJwt.includes('REPLACE_WITH') ? envJwt : devSecrets.jwtSecret;
  const backupSecret = envBackup && !envBackup.includes('REPLACE_WITH') ? envBackup : devSecrets.backupSecret;

  if (jwtSecret === backupSecret) {
    throw new Error('FATAL: BACKUP_ENCRYPTION_SECRET must not fall back to JWT_SECRET.');
  }

  return { jwtSecret, backupSecret };
}

const secrets = resolveMandatorySecrets();

const rawGeminiKey = process.env.GEMINI_API_KEY?.trim() || '';
const geminiApiKey = rawGeminiKey && rawGeminiKey !== 'MY_GEMINI_API_KEY' ? rawGeminiKey : '';

export const env = {
  isProduction,
  port: Number(process.env.PORT) || 3000,
  appUrl: process.env.APP_URL?.trim() || 'http://localhost:3000',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  geminiApiKey,
  geminiModel: process.env.GEMINI_MODEL?.trim() || 'gemini-4-hydrogen',
  jwtSecret: secrets.jwtSecret,
  backupEncryptionSecret: secrets.backupSecret,
  adminSetupCode: process.env.ADMIN_SETUP_CODE?.trim() || '',
};
