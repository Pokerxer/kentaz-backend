const nodemailer = require('nodemailer');

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn('Email: SMTP not configured - emails will be logged only');
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
  const from = process.env.EMAIL_FROM || 'noreply@kentaz.com';

  const mailOptions = { from, to, subject, html };

  if (transporter) {
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`Email sent: ${info.messageId} to ${to}`);
      return info;
    } catch (err) {
      console.error('Email send error:', err.message);
      throw err;
    }
  } else {
    console.log('📧 Email (mock):', { to, subject, html: html.substring(0, 200) + '...' });
    return null;
  }
}

function getOrderEmailHtml(order, user) {
  const itemsList = order.items
    .map(
      (item) =>
        `<li>${item.product?.name || 'Product'} x${item.quantity} - ₦${item.price.toLocaleString()}</li>`
    )
    .join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Thank you for your order, ${user.name}!</h2>
      <p>Your order #${order._id} has been confirmed and is being processed.</p>

      <h3 style="color: #555;">Order Details</h3>
      <ul>${itemsList}</ul>

      <p><strong>Total:</strong> ₦${order.total.toLocaleString()}</p>

      <h3 style="color: #555;">Shipping Address</h3>
      <p>
        ${order.shippingAddress?.name || ''}<br>
        ${order.shippingAddress?.address || ''}<br>
        ${order.shippingAddress?.city || ''}, ${order.shippingAddress?.state || ''}
      </p>

      <p style="color: #777; font-size: 14px; margin-top: 30px;">
        If you have any questions, reply to this email or contact our support team.
      </p>
    </div>
  `;
}

function getAdminOrderEmailHtml(order, user) {
  const itemsList = order.items
    .map(
      (item) =>
        `<li>${item.product?.name || 'Product'} x${item.quantity} - ₦${item.price.toLocaleString()}</li>`
    )
    .join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #d9534f;">New Order Received!</h2>
      <p><strong>Order ID:</strong> ${order._id}</p>
      <p><strong>Customer:</strong> ${user.name} (${user.email})</p>

      <h3 style="color: #555;">Items</h3>
      <ul>${itemsList}</ul>

      <p><strong>Total:</strong> ₦${order.total.toLocaleString()}</p>

      <h3 style="color: #555;">Shipping Address</h3>
      <p>
        ${order.shippingAddress?.name || ''}<br>
        ${order.shippingAddress?.address || ''}<br>
        ${order.shippingAddress?.city || ''}, ${order.shippingAddress?.state || ''}<br>
        ${order.shippingAddress?.phone || ''}
      </p>
    </div>
  `;
}

module.exports = { sendEmail, getOrderEmailHtml, getAdminOrderEmailHtml };