const nodemailer = require('nodemailer');

// ── Transporter ──────────────────────────────────────────────────
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass || user === 'your-email@gmail.com') {
    console.warn('Email: SMTP not configured — emails will be logged only');
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

async function sendEmail(to, subject, html) {
  const transporter = createTransporter();
  const from = process.env.EMAIL_FROM || 'Kentaz Emporium <noreply@kentazemporium.com>';
  const mailOptions = { from, to, subject, html };

  if (transporter) {
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`Email sent: ${info.messageId} → ${to}`);
      return info;
    } catch (err) {
      console.error('Email send error:', err.message);
      throw err;
    }
  } else {
    console.log('📧 Email (mock):', { to, subject, preview: html.substring(0, 200) });
    return null;
  }
}

// ── Design tokens ────────────────────────────────────────────────
const GOLD    = '#C9A84C';
const GOLD_LT = '#F5EDD6';
const DARK    = '#0A0A0A';
const INK     = '#1A1A1A';
const MUTED   = '#6B6B6B';
const FAINT   = '#9B9B9B';
const BORDER  = '#E8E8E8';
const OFFWHITE= '#FAFAFA';
const GREEN   = '#16A34A';
const ORANGE  = '#EA580C';
const RED     = '#DC2626';
const BLUE    = '#2563EB';

// ── Base layout ──────────────────────────────────────────────────
function layout(title, previewText, bodyHtml, heroBg = DARK, heroContent = '') {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>${title}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#F0EBE0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<!-- Preview text -->
<div style="display:none;font-size:1px;color:#F0EBE0;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${previewText}</div>

<!-- Outer wrapper -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F0EBE0;padding:32px 16px;">
<tr><td align="center">

  <!-- Email card -->
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:4px;overflow:hidden;">

    <!-- ── LOGO HEADER ── -->
    <tr>
      <td bgcolor="${DARK}" style="padding:0;">
        <!-- Gold top bar -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td bgcolor="${GOLD}" height="3" style="font-size:0;line-height:0;">&nbsp;</td></tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:28px 40px 24px;text-align:center;">
              <div style="font-family:'Georgia',serif;font-size:11px;letter-spacing:6px;color:${GOLD};text-transform:uppercase;margin-bottom:6px;">✦ &nbsp; &nbsp; ✦</div>
              <div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:32px;font-weight:900;letter-spacing:8px;color:${GOLD};text-transform:uppercase;line-height:1;">KENTAZ</div>
              <div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:9px;letter-spacing:6px;color:rgba(255,255,255,0.4);text-transform:uppercase;margin-top:6px;">E M P O R I U M</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ── HERO BAND ── -->
    ${heroContent ? `<tr>
      <td bgcolor="${heroBg}" style="padding:36px 40px;text-align:center;">
        ${heroContent}
      </td>
    </tr>` : ''}

    <!-- ── BODY ── -->
    <tr>
      <td style="padding:40px;background-color:#ffffff;">
        ${bodyHtml}
      </td>
    </tr>

    <!-- ── FOOTER ── -->
    <tr>
      <td bgcolor="${DARK}" style="padding:0;">
        <!-- Gold top bar -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td bgcolor="${GOLD}" height="1" style="font-size:0;line-height:0;">&nbsp;</td></tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:28px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:rgba(255,255,255,0.5);">
                Suite 35, 911 Mall, Usuma Street, Maitama, Abuja, Nigeria
              </p>
              <p style="margin:0 0 16px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;">
                <a href="mailto:hello@kentazemporium.com" style="color:${GOLD};text-decoration:none;font-weight:600;">hello@kentazemporium.com</a>
              </p>
              <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;color:rgba(255,255,255,0.25);letter-spacing:0.5px;">
                &copy; ${new Date().getFullYear()} Kentaz Emporium &nbsp;&middot;&nbsp; All rights reserved
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

  </table>
  <!-- /Email card -->

</td></tr>
</table>
</body>
</html>`;
}

// ── Component helpers ────────────────────────────────────────────

/** Thin gold divider */
function divider() {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
    <tr>
      <td width="40%" height="1" bgcolor="${BORDER}" style="font-size:0;line-height:0;">&nbsp;</td>
      <td width="20%" style="text-align:center;font-size:14px;color:${GOLD};padding:0 8px;">✦</td>
      <td width="40%" height="1" bgcolor="${BORDER}" style="font-size:0;line-height:0;">&nbsp;</td>
    </tr>
  </table>`;
}

/** Status pill badge */
function pill(text, bgColor, textColor = '#ffffff') {
  return `<span style="display:inline-block;padding:5px 16px;border-radius:20px;background-color:${bgColor};font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${textColor};">${text}</span>`;
}

/** CTA button */
function ctaButton(text, href, bgColor = GOLD, textColor = INK) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
    <tr>
      <td style="border-radius:4px;background-color:${bgColor};">
        <a href="${href}" style="display:inline-block;padding:14px 32px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;font-weight:700;letter-spacing:0.5px;color:${textColor};text-decoration:none;">${text}</a>
      </td>
    </tr>
  </table>`;
}

/** Section heading */
function sectionHeading(text) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
    <tr>
      <td style="border-left:3px solid ${GOLD};padding-left:12px;">
        <span style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${INK};">${text}</span>
      </td>
    </tr>
  </table>`;
}

/** Info table (alternating rows) */
function infoTable(rows) {
  const rowsHtml = rows.filter(Boolean).map(([label, value], i) => `
    <tr style="background-color:${i % 2 === 0 ? OFFWHITE : '#ffffff'};">
      <td style="padding:10px 14px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:${FAINT};width:40%;border-bottom:1px solid ${BORDER};">${label}</td>
      <td style="padding:10px 14px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:${INK};font-weight:600;border-bottom:1px solid ${BORDER};">${value}</td>
    </tr>`).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:4px;overflow:hidden;margin-bottom:8px;">
    ${rowsHtml}
  </table>`;
}

/** Gold total callout */
function totalCallout(label, amount) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td bgcolor="${GOLD_LT}" style="padding:16px 20px;border-left:4px solid ${GOLD};border-radius:0 4px 4px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:${MUTED};">${label}</td>
            <td style="text-align:right;font-family:'Helvetica Neue',Arial,sans-serif;font-size:22px;font-weight:900;color:${GOLD};">${amount}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

/** Support box */
function supportBox(message) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
    <tr>
      <td bgcolor="${OFFWHITE}" style="padding:20px 24px;border:1px solid ${BORDER};border-top:3px solid ${GOLD};border-radius:0 0 4px 4px;">
        <p style="margin:0 0 4px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;font-weight:700;color:${INK};">${message}</p>
        <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:${MUTED};">Reply to this email or write to us at <a href="mailto:hello@kentazemporium.com" style="color:${GOLD};font-weight:600;text-decoration:none;">hello@kentazemporium.com</a></p>
      </td>
    </tr>
  </table>`;
}

/** Hero icon + text for the dark band */
function hero(icon, headline, subtext, pillHtml = '') {
  return `
    ${pillHtml ? `<div style="margin-bottom:16px;">${pillHtml}</div>` : ''}
    <div style="font-size:44px;line-height:1;margin-bottom:16px;">${icon}</div>
    <h1 style="margin:0 0 10px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:26px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">${headline}</h1>
    <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:15px;color:rgba(255,255,255,0.6);line-height:1.6;max-width:400px;margin:0 auto;">${subtext}</p>
  `;
}

// ── Helpers ──────────────────────────────────────────────────────

function formatBookingDate(date) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function getServiceLabel(serviceType) {
  return serviceType === 'therapy' ? 'Therapy Session' : serviceType === 'podcast' ? 'Podcast Studio' : serviceType;
}

// ── ORDER CONFIRMED email ─────────────────────────────────────────

function getOrderEmailHtml(order, user) {
  const addr = order.shippingAddress || {};
  const firstName = user.name ? user.name.split(' ')[0] : 'there';
  const delivery = addr.deliveryMethod === 'express' ? '₦5,000' : (order.total >= 50000 ? 'Free' : '₦2,500');

  const itemsHtml = (order.items || []).map((item, i) => `
    <tr style="background-color:${i % 2 === 0 ? OFFWHITE : '#ffffff'};">
      <td style="padding:12px 14px;border-bottom:1px solid ${BORDER};">
        <span style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;font-weight:600;color:${INK};display:block;">${item.name || item.product?.name || 'Product'}</span>
        ${item.variant?.size && item.variant.size !== 'Default'
          ? `<span style="font-size:12px;color:${FAINT};">Size: ${item.variant.size}${item.variant.color && item.variant.color !== 'Default' ? ' · ' + item.variant.color : ''}</span>`
          : ''}
      </td>
      <td style="padding:12px 14px;text-align:center;border-bottom:1px solid ${BORDER};font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:${MUTED};white-space:nowrap;">× ${item.quantity}</td>
      <td style="padding:12px 14px;text-align:right;border-bottom:1px solid ${BORDER};font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;font-weight:700;color:${INK};white-space:nowrap;">₦${(item.price * item.quantity).toLocaleString('en-NG')}</td>
    </tr>`).join('');

  const bodyHtml = `
    <p style="margin:0 0 4px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${GOLD};">Order Confirmation</p>
    <h2 style="margin:0 0 12px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:22px;font-weight:800;color:${INK};">Thank you for your order, ${firstName}!</h2>
    <p style="margin:0 0 24px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:15px;color:${MUTED};line-height:1.7;">Your order is confirmed and is now being prepared. We'll email you again as soon as it's on its way.</p>

    <p style="margin:0 0 6px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:${FAINT};">Reference</p>
    <p style="margin:0 0 24px;font-family:'Courier New',monospace;font-size:13px;font-weight:700;color:${INK};letter-spacing:1px;">#${order._id}</p>

    ${divider()}
    ${sectionHeading('Items Ordered')}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:4px;overflow:hidden;margin-bottom:16px;">
      <thead>
        <tr bgcolor="${DARK}">
          <th style="padding:10px 14px;text-align:left;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.5);">Product</th>
          <th style="padding:10px 14px;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.5);">Qty</th>
          <th style="padding:10px 14px;text-align:right;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.5);">Amount</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>

    <!-- Totals -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="padding:6px 0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:${FAINT};">Subtotal</td>
        <td style="padding:6px 0;text-align:right;font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:${INK};">₦${order.total.toLocaleString('en-NG')}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:${FAINT};">Delivery</td>
        <td style="padding:6px 0;text-align:right;font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:${INK};">${delivery}</td>
      </tr>
    </table>
    ${totalCallout('Total Paid', '₦' + order.total.toLocaleString('en-NG'))}

    ${divider()}
    ${sectionHeading('Delivery Address')}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:4px;overflow:hidden;margin-bottom:0;">
      <tr bgcolor="${OFFWHITE}">
        <td style="padding:16px 18px;">
          <span style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;font-weight:700;color:${INK};display:block;margin-bottom:4px;">${addr.firstName || ''} ${addr.lastName || ''}</span>
          <span style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:${MUTED};line-height:1.8;">
            ${[addr.address || addr.street, addr.city, addr.state].filter(Boolean).join(', ')}
            ${addr.phone ? '<br>' + addr.phone : ''}
          </span>
        </td>
      </tr>
    </table>

    ${supportBox('Questions about your order?')}
  `;

  const heroHtml = hero(
    '🛍️',
    'Order Confirmed!',
    `Your order is in — we're getting it ready for you.`,
    pill('Processing', GREEN)
  );

  return layout(
    `Order Confirmed #${order._id}`,
    `Your Kentaz order is confirmed and being prepared for dispatch.`,
    bodyHtml,
    '#0F2A1A',
    heroHtml
  );
}

// ── ADMIN ORDER email ─────────────────────────────────────────────

function getAdminOrderEmailHtml(order, user) {
  const addr = order.shippingAddress || {};

  const itemsHtml = (order.items || []).map((item, i) => `
    <tr style="background-color:${i % 2 === 0 ? OFFWHITE : '#ffffff'};">
      <td style="padding:10px 14px;border-bottom:1px solid ${BORDER};font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;font-weight:600;color:${INK};">${item.name || item.product?.name || 'Product'}</td>
      <td style="padding:10px 14px;text-align:center;border-bottom:1px solid ${BORDER};font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:${MUTED};">×${item.quantity}</td>
      <td style="padding:10px 14px;text-align:right;border-bottom:1px solid ${BORDER};font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;font-weight:700;color:${INK};">₦${(item.price * item.quantity).toLocaleString('en-NG')}</td>
    </tr>`).join('');

  const bodyHtml = `
    ${infoTable([
      ['Order ID', '#' + order._id],
      ['Customer', user.name],
      ['Email', user.email],
      ['Phone', addr.phone || '—'],
      ['Delivery Method', addr.deliveryMethod || 'standard'],
      ['Paystack Ref', order.paystackRef || '—'],
    ])}

    <div style="margin-top:20px;"></div>
    ${sectionHeading('Items')}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:4px;overflow:hidden;margin-bottom:20px;">
      <thead>
        <tr bgcolor="${DARK}">
          <th style="padding:10px 14px;text-align:left;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.5);">Product</th>
          <th style="padding:10px 14px;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.5);">Qty</th>
          <th style="padding:10px 14px;text-align:right;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.5);">Total</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>

    ${totalCallout('Order Total', '₦' + order.total.toLocaleString('en-NG'))}

    <div style="margin-top:20px;"></div>
    ${sectionHeading('Delivery Address')}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:4px;overflow:hidden;">
      <tr bgcolor="${OFFWHITE}">
        <td style="padding:14px 18px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:${MUTED};line-height:1.8;">
          ${addr.firstName || ''} ${addr.lastName || ''}<br>
          ${[addr.address || addr.street, addr.city, addr.state].filter(Boolean).join(', ')}
        </td>
      </tr>
    </table>
  `;

  const heroHtml = hero('📦', 'New Order Received', `${user.name} just placed an order worth ₦${order.total.toLocaleString('en-NG')}.`, pill('Action Required', GOLD, INK));

  return layout(
    `New Order #${order._id}`,
    `New order from ${user.name} — ₦${order.total.toLocaleString('en-NG')}`,
    bodyHtml,
    '#1A1200',
    heroHtml
  );
}

// ── BOOKING PENDING email ─────────────────────────────────────────

function getBookingPendingEmailHtml(booking, user) {
  const firstName = user.name ? user.name.split(' ')[0] : 'there';

  const bodyHtml = `
    <p style="margin:0 0 4px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${ORANGE};">Awaiting Payment</p>
    <h2 style="margin:0 0 12px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:22px;font-weight:800;color:${INK};">Your slot is being held, ${firstName}.</h2>
    <p style="margin:0 0 28px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:15px;color:${MUTED};line-height:1.7;">We've received your booking request. <strong style="color:${INK};">Return to the booking page and complete your payment to confirm your slot</strong> — it is not guaranteed until paid.</p>

    ${divider()}
    ${sectionHeading('Booking Details')}

    ${infoTable([
      ['Service', getServiceLabel(booking.serviceType)],
      ['Date', formatBookingDate(booking.date)],
      ['Time', booking.timeSlot + ' (WAT)'],
      ['Duration', booking.duration + ' minutes'],
      ['Format', booking.sessionType === 'online' ? 'Online — Secure Video Call' : 'In-Person — Abuja Studio'],
      ['Booking ID', '#' + booking._id],
    ])}

    <div style="margin-top:16px;"></div>
    ${totalCallout('Amount Due', '₦' + booking.amount.toLocaleString('en-NG'))}

    ${divider()}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td bgcolor="${GOLD_LT}" style="padding:20px 24px;border:1px solid ${GOLD};border-radius:4px;text-align:center;">
          <p style="margin:0 0 6px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;font-weight:700;color:${INK};">⏳ &nbsp;Your slot expires if unpaid</p>
          <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:${MUTED};">Return to kentazemporium.com to complete your payment and lock in this time.</p>
        </td>
      </tr>
    </table>

    ${supportBox('Have questions about your booking?')}
  `;

  const heroHtml = hero('📅', 'Booking Received', `Your ${getServiceLabel(booking.serviceType).toLowerCase()} on ${formatBookingDate(booking.date)} at ${booking.timeSlot}.`, pill('Payment Pending', ORANGE));

  return layout(
    `Booking Received — ${getServiceLabel(booking.serviceType)}`,
    `Your booking is held! Complete payment to confirm your ${booking.timeSlot} slot on ${formatBookingDate(booking.date)}.`,
    bodyHtml,
    '#1A0D00',
    heroHtml
  );
}

// ── BOOKING CONFIRMED email ───────────────────────────────────────

function getBookingConfirmedEmailHtml(booking, user) {
  const firstName = user.name ? user.name.split(' ')[0] : 'there';
  const isTherapy = booking.serviceType === 'therapy';
  const isOnline  = booking.sessionType === 'online';

  const steps = isOnline
    ? [
        'Check your inbox — this email is your confirmation.',
        'A secure, encrypted session link will be sent 1 hour before your appointment.',
        'Find a quiet, private space with a stable internet connection.',
        isTherapy ? 'Your therapist will join you at the scheduled time.' : 'Our technician will walk you through the setup.',
      ]
    : [
        'Check your inbox — this email is your confirmation.',
        'Arrive at Suite 35, 911 Mall, Usuma Street, Maitama, Abuja.',
        'Please arrive 5 minutes early to settle in comfortably.',
        isTherapy ? 'Your therapist will greet you at reception.' : 'Our studio technician will meet you at the door.',
      ];

  const stepsHtml = steps.map((step, i) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
      <tr>
        <td style="vertical-align:top;padding-top:2px;width:32px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td bgcolor="${GOLD}" style="width:24px;height:24px;border-radius:50%;text-align:center;line-height:24px;">
              <span style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:900;color:${INK};">${i + 1}</span>
            </td></tr>
          </table>
        </td>
        <td style="padding-left:12px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;color:${MUTED};line-height:1.6;">${step}</td>
      </tr>
    </table>`).join('');

  const bodyHtml = `
    <p style="margin:0 0 4px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${GREEN};">Booking Confirmed</p>
    <h2 style="margin:0 0 12px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:22px;font-weight:800;color:${INK};">You're all set, ${firstName}!</h2>
    <p style="margin:0 0 28px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:15px;color:${MUTED};line-height:1.7;">Payment received. Your ${getServiceLabel(booking.serviceType).toLowerCase()} is officially confirmed and locked in.</p>

    ${divider()}
    ${sectionHeading('Session Details')}

    ${infoTable([
      ['Service', getServiceLabel(booking.serviceType)],
      ['Date', formatBookingDate(booking.date)],
      ['Time', booking.timeSlot + ' (WAT)'],
      ['Duration', booking.duration + ' minutes'],
      ['Format', isOnline ? 'Online — Secure Video Call' : 'In-Person — Abuja Studio'],
      ['Booking ID', '#' + booking._id],
    ])}

    <div style="margin-top:16px;"></div>
    ${totalCallout('Amount Paid', '₦' + booking.amount.toLocaleString('en-NG'))}

    ${!isOnline ? `
    ${divider()}
    ${sectionHeading('Location')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-left:4px solid ${GOLD};border-radius:0 4px 4px 0;overflow:hidden;">
      <tr bgcolor="${OFFWHITE}">
        <td style="padding:16px 18px;">
          <span style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;font-weight:700;color:${INK};display:block;margin-bottom:4px;">Kentaz Studio</span>
          <span style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:${MUTED};line-height:1.8;">Suite 35, 911 Mall<br>Usuma Street, Maitama<br>Abuja, Nigeria</span>
        </td>
      </tr>
    </table>` : ''}

    ${divider()}
    ${sectionHeading('What Happens Next')}
    ${stepsHtml}

    ${supportBox('Need to reschedule or have a question?')}
  `;

  const heroHtml = hero(
    isTherapy ? '💚' : '🎙️',
    "You're Booked!",
    `${getServiceLabel(booking.serviceType)} · ${formatBookingDate(booking.date)} · ${booking.timeSlot} WAT`,
    pill('Confirmed & Paid', GREEN)
  );

  return layout(
    `Booking Confirmed — ${getServiceLabel(booking.serviceType)}`,
    `You're booked! ${getServiceLabel(booking.serviceType)} on ${formatBookingDate(booking.date)} at ${booking.timeSlot} is confirmed.`,
    bodyHtml,
    '#0A1F0A',
    heroHtml
  );
}

// ── ADMIN BOOKING email ───────────────────────────────────────────

function getAdminBookingEmailHtml(booking, user, eventType = 'new') {
  const isPaid = eventType === 'paid';

  const intakeRows = booking.intake ? [
    booking.intake.reason     ? ['Reason for Visit', booking.intake.reason]                  : null,
    booking.intake.firstTime !== undefined ? ['First Time in Therapy', booking.intake.firstTime ? 'Yes' : 'No'] : null,
    booking.intake.approach   ? ['Preferred Approach', booking.intake.approach]              : null,
  ].filter(Boolean) : [];

  const bodyHtml = `
    ${infoTable([
      ['Booking ID',      '#' + booking._id],
      ['Customer',        user.name],
      ['Email',           user.email],
      ['Service',         getServiceLabel(booking.serviceType)],
      ['Date',            formatBookingDate(booking.date)],
      ['Time',            booking.timeSlot + ' WAT'],
      ['Duration',        booking.duration + ' min'],
      ['Format',          booking.sessionType],
      ['Payment Status',  isPaid ? '✅ Paid' : '⏳ Unpaid'],
      booking.paystackRef ? ['Paystack Ref', booking.paystackRef] : null,
    ].filter(Boolean))}

    <div style="margin-top:16px;"></div>
    ${totalCallout('Booking Amount', '₦' + booking.amount.toLocaleString('en-NG'))}

    ${intakeRows.length > 0 ? `
    ${divider()}
    ${sectionHeading('Intake Information')}
    ${infoTable(intakeRows)}` : ''}

    ${booking.notes ? `
    ${divider()}
    ${sectionHeading('Notes from Customer')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-left:4px solid ${GOLD};border-radius:0 4px 4px 0;">
      <tr bgcolor="${OFFWHITE}">
        <td style="padding:14px 18px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:${MUTED};line-height:1.7;font-style:italic;">"${booking.notes}"</td>
      </tr>
    </table>` : ''}
  `;

  const heroHtml = hero(
    isPaid ? '💰' : '📅',
    isPaid ? 'Booking Paid' : 'New Booking',
    `${user.name} · ${getServiceLabel(booking.serviceType)} · ${formatBookingDate(booking.date)} at ${booking.timeSlot}`,
    isPaid ? pill('Paid & Confirmed', GREEN) : pill('Awaiting Payment', ORANGE)
  );

  return layout(
    `${isPaid ? 'Booking Confirmed' : 'New Booking'} — ${user.name}`,
    `${isPaid ? 'Booking paid:' : 'New booking:'} ${user.name} — ${getServiceLabel(booking.serviceType)} on ${formatBookingDate(booking.date)}.`,
    bodyHtml,
    isPaid ? '#0A1F0A' : '#1A0D00',
    heroHtml
  );
}

// ── ORDER STATUS UPDATE email ─────────────────────────────────────

function getOrderStatusEmailHtml(order, user) {
  const addr = order.shippingAddress || {};
  const firstName = user.name ? user.name.split(' ')[0] : 'there';

  const statusConfig = {
    processing: {
      label: 'Processing',
      color: BLUE,
      heroBg: '#0A0F1F',
      icon: '⚙️',
      headline: 'Your order is being prepared.',
      subtext: 'We\'ve received your payment and our team is now packing your order for dispatch.',
    },
    shipped: {
      label: 'Shipped',
      color: ORANGE,
      heroBg: '#1A0D00',
      icon: '🚚',
      headline: 'Your order is on its way!',
      subtext: 'Your package has left our facility. Expect delivery within 2–5 business days.',
    },
    delivered: {
      label: 'Delivered',
      color: GREEN,
      heroBg: '#0A1F0A',
      icon: '✅',
      headline: 'Your order has been delivered.',
      subtext: 'We hope you love it! If anything isn\'t right, reach out within 48 hours.',
    },
    cancelled: {
      label: 'Cancelled',
      color: RED,
      heroBg: '#1F0A0A',
      icon: '❌',
      headline: 'Your order has been cancelled.',
      subtext: 'If this was unexpected or you need a refund, please contact our support team.',
    },
  };

  const cfg = statusConfig[order.status] || {
    label: order.status,
    color: MUTED,
    heroBg: DARK,
    icon: '📦',
    headline: 'Your order has been updated.',
    subtext: 'Log in to your account to see the latest status.',
  };

  const bodyHtml = `
    <p style="margin:0 0 4px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${cfg.color};">Order Update</p>
    <h2 style="margin:0 0 12px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:22px;font-weight:800;color:${INK};">Hi ${firstName}, here's your update.</h2>
    <p style="margin:0 0 28px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:15px;color:${MUTED};line-height:1.7;">${cfg.subtext}</p>

    ${divider()}

    ${infoTable([
      ['Order ID', '#' + order._id],
      ['Status', cfg.icon + ' &nbsp;' + cfg.label],
      ['Order Total', '₦' + order.total.toLocaleString('en-NG')],
      addr.city ? ['Delivery To', [addr.city, addr.state].filter(Boolean).join(', ')] : null,
    ].filter(Boolean))}

    ${supportBox('Need help with this order?')}
  `;

  const heroHtml = hero(cfg.icon, cfg.headline, cfg.subtext, pill(cfg.label, cfg.color));

  return layout(
    `Order ${cfg.label} — #${order._id}`,
    `Your Kentaz order #${order._id} is now ${cfg.label.toLowerCase()}.`,
    bodyHtml,
    cfg.heroBg,
    heroHtml
  );
}

// ── Convenience senders ──────────────────────────────────────────

async function sendBookingEmails(booking, user, eventType = 'new') {
  const adminEmail = process.env.ADMIN_EMAIL;
  const isConfirmed = eventType === 'paid';
  const subject = isConfirmed
    ? `✅ Booking Confirmed — ${getServiceLabel(booking.serviceType)} · ${formatBookingDate(booking.date)}`
    : `📅 Booking Received — ${getServiceLabel(booking.serviceType)} · ${formatBookingDate(booking.date)}`;

  try {
    await sendEmail(
      user.email,
      subject,
      isConfirmed
        ? getBookingConfirmedEmailHtml(booking, user)
        : getBookingPendingEmailHtml(booking, user)
    );
  } catch (err) {
    console.error('Failed to send customer booking email:', err.message);
  }

  try {
    if (adminEmail) {
      await sendEmail(
        adminEmail,
        `${isConfirmed ? '[PAID]' : '[NEW]'} Booking — ${user.name} — ${formatBookingDate(booking.date)}`,
        getAdminBookingEmailHtml(booking, user, eventType)
      );
    }
  } catch (err) {
    console.error('Failed to send admin booking email:', err.message);
  }
}

module.exports = {
  sendEmail,
  getOrderEmailHtml,
  getAdminOrderEmailHtml,
  getOrderStatusEmailHtml,
  getBookingPendingEmailHtml,
  getBookingConfirmedEmailHtml,
  getAdminBookingEmailHtml,
  sendBookingEmails,
};
