import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, message } = await request.json()

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Alle Felder sind erforderlich' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Ungültige E-Mail-Adresse' },
        { status: 400 }
      )
    }

    // Create transporter
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    // Email to the club
    const clubMailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.CONTACT_EMAIL || 'info@viktoria-wertheim.de',
      subject: `Kontaktformular: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #003366, #354992); padding: 20px; text-align: center;">
            <h1 style="color: #FFD700; margin: 0;">SV Viktoria Wertheim</h1>
            <p style="color: white; margin: 5px 0 0 0;">Neue Nachricht über das Kontaktformular</p>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #003366; margin-top: 0;">Kontaktanfrage</h2>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #003366; margin-top: 0;">Absender</h3>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>E-Mail:</strong> ${email}</p>
              <p><strong>Betreff:</strong> ${subject}</p>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px;">
              <h3 style="color: #003366; margin-top: 0;">Nachricht</h3>
              <p style="line-height: 1.6; white-space: pre-wrap;">${message}</p>
            </div>
          </div>
          
          <div style="background: #003366; padding: 20px; text-align: center;">
            <p style="color: #FFD700; margin: 0; font-size: 14px;">
              Diese E-Mail wurde automatisch über das Kontaktformular der Website gesendet.
            </p>
          </div>
        </div>
      `,
    }

    // Confirmation email to the sender
    const confirmationMailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Bestätigung: Ihre Nachricht an SV Viktoria Wertheim',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #003366, #354992); padding: 20px; text-align: center;">
            <h1 style="color: #FFD700; margin: 0;">SV Viktoria Wertheim</h1>
            <p style="color: white; margin: 5px 0 0 0;">Vielen Dank für Ihre Nachricht!</p>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #003366; margin-top: 0;">Hallo ${name},</h2>
            
            <p style="line-height: 1.6;">
              vielen Dank für Ihre Nachricht über unser Kontaktformular. 
              Wir haben Ihre Anfrage erhalten und werden uns schnellstmöglich bei Ihnen melden.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #003366; margin-top: 0;">Ihre Nachricht</h3>
              <p><strong>Betreff:</strong> ${subject}</p>
              <p><strong>Nachricht:</strong></p>
              <p style="line-height: 1.6; white-space: pre-wrap; background: #f5f5f5; padding: 15px; border-radius: 4px;">${message}</p>
            </div>
            
            <p style="line-height: 1.6;">
              Falls Sie dringende Fragen haben, können Sie uns auch direkt erreichen:
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px;">
              <p><strong>Telefon:</strong> 0934 / 12345-67</p>
              <p><strong>E-Mail:</strong> info@viktoria-wertheim.de</p>
              <p><strong>Adresse:</strong> Haslocherweg 85, 97877 Wertheim-Bestenheid</p>
            </div>
          </div>
          
          <div style="background: #003366; padding: 20px; text-align: center;">
            <p style="color: #FFD700; margin: 0; font-size: 14px;">
              Mit sportlichen Grüßen<br>
              Ihr Team vom SV Viktoria Wertheim
            </p>
          </div>
        </div>
      `,
    }

    // Send both emails
    await Promise.all([
      transporter.sendMail(clubMailOptions),
      transporter.sendMail(confirmationMailOptions)
    ])

    return NextResponse.json(
      { message: 'E-Mail erfolgreich gesendet' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      { error: 'Fehler beim Senden der E-Mail' },
      { status: 500 }
    )
  }
}