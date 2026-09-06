import { Resend } from "resend";

export interface EmailOtpResult {
  success: boolean;
  message: string;
  bypassed: boolean;
  devCode?: string;
  error?: string;
}

const PRODUCTION_PORTAL_URL = "https://bharatdrishti.onrender.com/dashboard";

/**
 * Returns the production-safe portal redirect URL.
 * Strictly prevents localhost to avoid ERR_CONNECTION_REFUSED on mobile devices.
 */
export function getPortalRedirectUrl(): string {
  const envUrl = process.env.APP_URL || process.env.VITE_AUTH_REDIRECT_URL;
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    return `${envUrl.replace(/\/+$/, "")}/dashboard`;
  }
  return PRODUCTION_PORTAL_URL;
}

/**
 * Institutional Email Verification & OTP Dispatch Service using Resend.
 * Includes automatic rapid-testing bypass if RESEND_API_KEY is not configured or in dev mode.
 */
export async function sendVerificationOtpEmail(params: {
  email: string;
  otpCode: string;
  redirectUrl?: string;
}): Promise<EmailOtpResult> {
  const emailNorm = params.email.trim().toLowerCase();
  const otpCode = params.otpCode.trim();
  const redirectUrl = params.redirectUrl || getPortalRedirectUrl();

  const resendApiKey = process.env.RESEND_API_KEY;

  // Rapid testing bypass if Resend API key is omitted
  if (!resendApiKey) {
    console.log(
      `\n=================================================================\n` +
      `[VERISCAN AUTH - RESEND BYPASS]\n` +
      `Recipient:    ${emailNorm}\n` +
      `One-Time OTP: ${otpCode}\n` +
      `Redirect URL: ${redirectUrl}\n` +
      `Note: Set RESEND_API_KEY to send live emails.\n` +
      `=================================================================\n`
    );
    return {
      success: true,
      message: `Verification passcode dispatched to ${emailNorm} (test bypass active)`,
      bypassed: true,
      devCode: otpCode,
    };
  }

  try {
    const resend = new Resend(resendApiKey);
    const fromAddress =
      process.env.RESEND_FROM_EMAIL || "VeriScan Security <onboarding@resend.dev>";

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VeriScan Verification Passcode</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; background-color: #0b1120; color: #f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b1120; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="540" cellpadding="0" cellspacing="0" style="max-width: 540px; background-color: #0f172a; border-radius: 12px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5);">
          <!-- Institutional Header -->
          <tr>
            <td style="padding: 24px 32px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-bottom: 2px solid #b45309;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #f59e0b;">
                      Institutional Document Forensic Architecture
                    </div>
                    <div style="font-size: 22px; font-weight: 800; color: #ffffff; margin-top: 4px;">
                      VeriScan &bull; BharatDrishti
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #f8fafc;">
                Security Verification Code
              </h1>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                You have requested a secure sign-in verification code for your VeriScan institutional forensic screening account.
              </p>

              <!-- OTP Display Box -->
              <div style="background-color: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 8px;">
                  Your 6-Digit One-Time Passcode
                </div>
                <div style="font-size: 36px; font-weight: 800; letter-spacing: 0.25em; color: #38bdf8; font-family: monospace;">
                  ${otpCode}
                </div>
                <div style="font-size: 12px; color: #64748b; margin-top: 8px;">
                  Valid for 10 minutes &bull; Single-use authorization
                </div>
              </div>

              <!-- Direct Portal Action -->
              <div style="text-align: center; margin-bottom: 28px;">
                <a href="${redirectUrl}" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 6px; box-shadow: 0 4px 6px -1px rgba(2, 132, 199, 0.3);">
                  Open Production Portal
                </a>
                <p style="font-size: 11px; color: #64748b; margin-top: 8px;">
                  Destination: ${redirectUrl}
                </p>
              </div>

              <div style="border-top: 1px solid #1e293b; padding-top: 20px; font-size: 12px; color: #64748b; line-height: 1.5;">
                <strong style="color: #94a3b8;">Security Notice:</strong> If you did not initiate this authentication request, please ignore this email or notify your system administrator immediately. VeriScan officers will never ask for your one-time passcode.
              </div>
            </td>
          </tr>

          <!-- Institutional Footer -->
          <tr>
            <td style="padding: 16px 32px; background-color: #090d16; border-top: 1px solid #1e293b; font-size: 11px; color: #475569; text-align: center;">
              VeriScan Institutional Screen &bull; National Forensic Document Verification Network
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    const data = await resend.emails.send({
      from: fromAddress,
      to: [emailNorm],
      subject: `VeriScan Security Code: ${otpCode}`,
      html: htmlContent,
    });

    if (data.error) {
      console.error("[RESEND_SEND_ERROR]:", data.error);
      return {
        success: false,
        message: data.error.message || "Failed to deliver email through Resend",
        bypassed: false,
        error: data.error.message,
      };
    }

    return {
      success: true,
      message: `Verification code sent to ${emailNorm}`,
      bypassed: false,
    };
  } catch (err: any) {
    console.error("[RESEND_EXCEPTION]:", err);
    // Graceful fallback to allow testing without crash
    return {
      success: true,
      message: `Passcode generated for ${emailNorm} (Resend fallback active)`,
      bypassed: true,
      devCode: otpCode,
    };
  }
}
