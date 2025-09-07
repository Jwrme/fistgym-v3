// Reusable HTML email builder for verification codes
function buildVerificationEmail({ code, purpose = 'Verification', expiresMinutes = 3, brand = {} }) {
  const BRAND = {
    name: brand.brandName || process.env.EMAIL_BRAND_NAME || 'SenJitsu',
    logoUrl:
      brand.logoUrl ||
      process.env.EMAIL_BRAND_LOGO_URL ||
      'http://localhost:3001/logo512.png',
    address:
      brand.address ||
      process.env.EMAIL_BRAND_ADDRESS ||
      'Suite 301, Gil-Preciosa Bldg. 2, 75 Timog Avenue, Quezon City, Philippines'
  };

  const subject = `${BRAND.name} ${purpose}`;
  const text = `${BRAND.name} ${purpose}\n\nYour one-time verification code: ${code}\nThis code expires in ${expiresMinutes} minute(s).\n\n${BRAND.address}`;

  const html = `
  <div style="background:#f4f6f8;padding:32px 0;min-height:100vh;">
    <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:8px;box-shadow:0 2px 16px rgba(0,0,0,0.07);overflow:hidden;">
      <div style="padding:24px 0;text-align:center;background:#ffffff;">
        <img src="${BRAND.logoUrl}" alt="${BRAND.name}" style="height:48px;object-fit:contain;max-width:90%;" />
      </div>
      <div style="padding:36px 32px 32px 32px;text-align:center;">
        <h2 style="font-size:20px;color:#181818;margin:0 0 8px 0;font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
          Your one-time verification code
        </h2>
        <div style="margin:14px 0 18px 0;font-size:34px;font-weight:800;letter-spacing:3px;color:#2ecc40;font-family:ui-monospace,Consolas,Monaco,monospace;">
          ${code}
        </div>
        <p style="color:#444;margin:0 0 16px 0;font-size:14px;">This code expires in ${expiresMinutes} minute(s).</p>
        <p style="color:#6b7280;margin:0;font-size:12px;">If you didn’t request this, you can safely ignore this email.</p>
      </div>
      <div style="padding:14px 18px;text-align:center;background:#fafafa;border-top:1px solid #eee;color:#6b7280;font-size:12px;">
        ${BRAND.address}
      </div>
    </div>
  </div>
  `;

  return { subject, html, text };
}

module.exports = { buildVerificationEmail };

