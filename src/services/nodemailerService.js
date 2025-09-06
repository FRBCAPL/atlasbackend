import nodemailer from 'nodemailer';

// Create transporter using Gmail
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER, // Your Gmail address
      pass: process.env.GMAIL_APP_PASSWORD // Your Gmail app password
    }
  });
};

// Send challenge notification email to defender
export const sendChallengeNotificationEmail = async (emailData) => {
  try {
    const transporter = createTransporter();
    
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Challenge Received</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
            .container { background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .header { text-align: center; background: linear-gradient(135deg, #ff4444, #cc0000); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; }
            .challenge-details { background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #ff4444; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; padding: 5px 0; }
            .detail-label { font-weight: bold; color: #555; }
            .detail-value { color: #333; }
            .positions { background-color: #e3f2fd; padding: 15px; border-radius: 8px; border: 2px solid #2196f3; text-align: center; margin: 20px 0; }
            .positions h3 { color: #1976d2; margin: 0 0 10px 0; }
            .dates-section { background-color: #fff3e0; padding: 15px; border-radius: 8px; border: 2px solid #ff9800; margin: 20px 0; }
            .dates-section h3 { color: #f57c00; margin: 0 0 10px 0; }
            .message-box { background-color: #f3e5f5; border: 1px solid #ce93d8; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #ff4444, #cc0000); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .deadline-warning { background-color: #ffebee; border: 2px solid #f44336; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; }
            .deadline-warning h3 { color: #d32f2f; margin: 0 0 10px 0; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>⚔️ Challenge Received!</h1>
                <p>You have a new challenge waiting for your response</p>
            </div>

            <p>Hi ${emailData.to_name},</p>

            <p><strong>${emailData.from_name}</strong> has challenged you to a match! Here are the details:</p>

            <div class="positions">
                <h3>🏆 Ladder Positions</h3>
                <p><strong>${emailData.from_name}</strong> (Position ${emailData.challenger_position}) vs <strong>You</strong> (Position ${emailData.defender_position})</p>
                <p><em>${emailData.ladder_name} Ladder</em></p>
            </div>

            <div class="challenge-details">
                <h3 style="margin-top: 0; color: #ff4444;">Match Details</h3>
                <div class="detail-row">
                    <span class="detail-label">Challenge Type:</span>
                    <span class="detail-value">${emailData.challenge_type}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Entry Fee:</span>
                    <span class="detail-value">$${emailData.entry_fee}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Race Length:</span>
                    <span class="detail-value">${emailData.race_length}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Game Type:</span>
                    <span class="detail-value">${emailData.game_type}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Table Size:</span>
                    <span class="detail-value">${emailData.table_size}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Location:</span>
                    <span class="detail-value">${emailData.location}</span>
                </div>
            </div>

            <div class="dates-section">
                <h3>📅 Preferred Match Dates</h3>
                <p>${emailData.preferred_dates}</p>
                <p style="font-size: 14px; color: #666; margin-top: 10px;">
                    <em>You can select from these dates when you accept the challenge</em>
                </p>
            </div>

            ${emailData.challenge_message ? `
            <div class="message-box">
                <h4 style="margin-top: 0; color: #7b1fa2;">💬 Message from ${emailData.from_name}:</h4>
                <p style="margin-bottom: 0;">${emailData.challenge_message}</p>
            </div>
            ` : ''}

            <div class="deadline-warning">
                <h3>⏰ Action Required</h3>
                <p>You have <strong>3 days</strong> to respond to this challenge</p>
                <p>Don't miss out on this opportunity!</p>
            </div>

            <p><strong>What's Next?</strong></p>
            <ul>
                <li>Review the challenge details above</li>
                <li>Check your availability for the proposed dates</li>
                <li>Accept, decline, or counter-propose</li>
                <li>If you accept, select your preferred date from the options</li>
            </ul>

            <div style="text-align: center;">
                <a href="${emailData.app_url}" class="cta-button">Respond to Challenge</a>
            </div>

            <div class="footer">
                <p>Good luck with your match! 🎱</p>
                <p>Front Range Pool Hub - Ladder of Legends</p>
                <p><a href="https://frontrangepool.com">frontrangepool.com</a></p>
            </div>
        </div>
    </body>
    </html>
    `;

    const mailOptions = {
      from: `"The Pool Hub" <admin@frontrangepool.com>`,
      to: emailData.to_email,
      subject: `⚔️ New Challenge Received - ${emailData.from_name}`,
      html: htmlContent
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('📧 Challenge notification email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('Error sending challenge notification email:', error);
    return { success: false, error: error.message };
  }
};

// Send challenge confirmation email to challenger
export const sendChallengeConfirmationEmail = async (emailData) => {
  try {
    const transporter = createTransporter();
    
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Challenge Accepted</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
            .container { background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .header { text-align: center; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; }
            .match-details { background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; padding: 5px 0; }
            .detail-label { font-weight: bold; color: #555; }
            .detail-value { color: #333; }
            .date-highlight { background-color: #e8f5e8; padding: 15px; border-radius: 8px; border: 2px solid #10b981; text-align: center; margin: 20px 0; }
            .date-highlight h3 { color: #10b981; margin: 0 0 10px 0; }
            .date-highlight p { font-size: 18px; font-weight: bold; color: #333; margin: 0; }
            .message-box { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Challenge Accepted!</h1>
                <p>Your challenge has been accepted and scheduled</p>
            </div>

            <p>Hi ${emailData.to_name},</p>

            <p>Great news! <strong>${emailData.from_name}</strong> has accepted your challenge and selected a match date.</p>

            <div class="date-highlight">
                <h3>📅 Match Scheduled</h3>
                <p>${emailData.match_date}</p>
            </div>

            <div class="match-details">
                <h3 style="margin-top: 0; color: #10b981;">Match Details</h3>
                <div class="detail-row">
                    <span class="detail-label">Challenge Type:</span>
                    <span class="detail-value">${emailData.challenge_type}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Entry Fee:</span>
                    <span class="detail-value">$${emailData.entry_fee}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Race Length:</span>
                    <span class="detail-value">${emailData.race_length}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Game Type:</span>
                    <span class="detail-value">${emailData.game_type}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Location:</span>
                    <span class="detail-value">${emailData.location}</span>
                </div>
            </div>

            ${emailData.note ? `
            <div class="message-box">
                <h4 style="margin-top: 0; color: #856404;">💬 Message from ${emailData.from_name}:</h4>
                <p style="margin-bottom: 0;">${emailData.note}</p>
            </div>
            ` : ''}

            <p><strong>What's Next?</strong></p>
            <ul>
                <li>Mark your calendar for the match date</li>
                <li>Arrive at the location on time</li>
                <li>Bring the entry fee ($${emailData.entry_fee})</li>
                <li>Play your best game!</li>
            </ul>

            <div style="text-align: center;">
                <a href="${emailData.app_url}" class="cta-button">View Challenge Details</a>
            </div>

            <div class="footer">
                <p>Good luck with your match! 🎱</p>
                <p>Front Range Pool Hub - Ladder of Legends</p>
                <p><a href="https://frontrangepool.com">frontrangepool.com</a></p>
            </div>
        </div>
    </body>
    </html>
    `;

    const mailOptions = {
      from: `"The Pool Hub" <admin@frontrangepool.com>`,
      to: emailData.to_email,
      subject: `🎉 Challenge Accepted - Match Confirmed!`,
      html: htmlContent
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('📧 Challenge confirmation email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('Error sending challenge confirmation email:', error);
    return { success: false, error: error.message };
  }
};
