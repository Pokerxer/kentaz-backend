const express = require('express');
const router = express.Router();
const { sendEmail } = require('../utils/email');

const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'info@kentazemporium.com';

router.post('/', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required.' });
    }

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;">
        <h2 style="color:#C9A84C;margin-bottom:4px;">New Contact Message</h2>
        <p style="color:#888;font-size:13px;margin-top:0;">via kentazemporium.com</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <tr><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600;width:100px;">Name</td><td style="padding:10px 0;border-bottom:1px solid #eee;">${name}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600;">Email</td><td style="padding:10px 0;border-bottom:1px solid #eee;"><a href="mailto:${email}">${email}</a></td></tr>
        </table>
        <p style="font-weight:600;margin-bottom:8px;">Message</p>
        <p style="background:#f9f9f9;border-left:3px solid #C9A84C;padding:16px;border-radius:4px;white-space:pre-wrap;">${message}</p>
      </div>`;

    await sendEmail(CONTACT_EMAIL, `Contact: ${name} — ${email}`, html);
    res.json({ success: true });
  } catch (err) {
    console.error('Contact email error:', err.message);
    res.status(500).json({ error: 'Failed to send message. Please try again.' });
  }
});

module.exports = router;
