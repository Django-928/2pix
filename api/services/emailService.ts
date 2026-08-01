import nodemailer from 'nodemailer';

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
  APP_BASE_URL,
  SMTP_TLS_REJECT_UNAUTHORIZED,
} = process.env;

const tlsRejectUnauthorized = SMTP_TLS_REJECT_UNAUTHORIZED !== 'false';

const transporter = SMTP_HOST
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT || 587),
      secure: Number(SMTP_PORT || 587) === 465,
      auth: SMTP_USER
        ? {
            user: SMTP_USER,
            pass: SMTP_PASS || '',
          }
        : undefined,
      // 默认开启 TLS 证书校验；仅在环境变量 SMTP_TLS_REJECT_UNAUTHORIZED=false 时关闭
      // （用于本地/容器调试或证书链不完整的环境），生产环境强烈建议保持开启
      tls: {
        rejectUnauthorized: tlsRejectUnauthorized,
      },
    })
  : null;

export interface SendActivationEmailOptions {
  to: string;
  username: string;
  token: string;
}

export async function sendActivationEmail({ to, username, token }: SendActivationEmailOptions): Promise<void> {
  if (!transporter) {
    console.warn('[EmailService] SMTP not configured, skipping activation email.');
    return;
  }

  const baseUrl = APP_BASE_URL || 'http://localhost:3001';
  const activationUrl = `${baseUrl}/auth/activate?token=${encodeURIComponent(token)}`;

  await transporter.sendMail({
    from: SMTP_FROM || SMTP_USER || 'noreply@2pix.cn',
    to,
    subject: '激活您的 2PIX 账号',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #8b5cf6;">您好，${username}</h2>
        <p>感谢您注册 2PIX。请点击下方按钮激活您的账号：</p>
        <a href="${activationUrl}" style="display: inline-block; padding: 12px 24px; background: #8b5cf6; color: #fff; text-decoration: none; border-radius: 8px; margin: 16px 0;">激活账号</a>
        <p>如果按钮无法点击，请复制以下链接到浏览器打开：</p>
        <p style="word-break: break-all; color: #666;">${activationUrl}</p>
        <p style="color: #999; font-size: 12px; margin-top: 24px;">此链接有效期为 24 小时。如非本人操作，请忽略本邮件。</p>
      </div>
    `,
    text: `您好，${username}。请复制以下链接到浏览器激活账号：${activationUrl}。有效期 24 小时。`,
  });
}

export interface SendVerificationCodeEmailOptions {
  to: string;
  code: string;
  purpose?: string;
}

export async function sendVerificationCodeEmail({ to, code, purpose = 'register' }: SendVerificationCodeEmailOptions): Promise<void> {
  if (!transporter) {
    console.warn('[EmailService] SMTP not configured, skipping verification code email.');
    return;
  }

  const purposeText = purpose === 'register' ? '注册' : '验证';

  await transporter.sendMail({
    from: SMTP_FROM || SMTP_USER || 'noreply@2pix.cn',
    to,
    subject: `您的 2PIX ${purposeText}验证码`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #8b5cf6;">您好</h2>
        <p>您正在进行 2PIX 账号${purposeText}，验证码为：</p>
        <div style="display: inline-block; padding: 16px 32px; background: #f3f4f6; border-radius: 8px; margin: 16px 0; font-size: 28px; font-weight: 700; letter-spacing: 4px; color: #8b5cf6;">${code}</div>
        <p>验证码 10 分钟内有效。如非本人操作，请忽略本邮件。</p>
        <p style="color: #999; font-size: 12px; margin-top: 24px;">请勿将验证码泄露给他人。</p>
      </div>
    `,
    text: `您好，您正在进行 2PIX 账号${purposeText}，验证码为：${code}，10 分钟内有效。如非本人操作，请忽略本邮件。`,
  });
}

export function isEmailConfigured(): boolean {
  return !!transporter;
}
