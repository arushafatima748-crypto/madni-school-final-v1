import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  const { student_name, course, email } = request.body;

  if (!student_name || !course || !email) {
    return response.status(400).json({ message: 'Missing required fields' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Admission Application Received - Madni School',
      text: `Dear ${student_name},\n\nYour application for ${course} has been received. We will contact you soon.\n\nRegards,\nMadni School System`,
    };

    await transporter.sendMail(mailOptions);
    return response.status(200).json({ message: 'Email sent successfully' });
  } catch (error: any) {
    console.error('Email error:', error);
    return response.status(500).json({ message: 'Failed to send email', error: error.message });
  }
}
