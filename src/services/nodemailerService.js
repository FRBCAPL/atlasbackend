import nodemailer from 'nodemailer';

// Create transporter using Gmail
const createTransporter = () => {
  return nodemailer.createTransport({
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

// Send counter-proposal email to challenger
export const sendCounterProposalEmail = async (emailData) => {
  try {
    const transporter = createTransporter();
    
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Counter-Proposal Received</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
            .container { background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .header { text-align: center; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; }
            .original-challenge { background-color: #ffebee; padding: 20px; border-radius: 8px; border-left: 4px solid #f44336; margin: 20px 0; }
            .counter-proposal { background-color: #e8f5e8; padding: 20px; border-radius: 8px; border-left: 4px solid #4caf50; margin: 20px 0; }
            .section-title { font-weight: bold; color: #333; margin-bottom: 15px; font-size: 18px; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; padding: 5px 0; }
            .detail-label { font-weight: bold; color: #555; }
            .detail-value { color: #333; }
            .dates-list { background-color: #f0f8ff; padding: 15px; border-radius: 8px; border: 2px solid #2196f3; margin: 15px 0; }
            .dates-list h4 { color: #1976d2; margin: 0 0 10px 0; }
            .date-item { background-color: white; padding: 8px; margin: 5px 0; border-radius: 4px; border: 1px solid #e0e0e0; }
            .message-box { background-color: #fff3e0; border: 1px solid #ffb74d; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔄 Counter-Proposal Received!</h1>
                <p>${emailData.from_name} has submitted a counter-proposal to your challenge</p>
            </div>
            
            <div class="original-challenge">
                <div class="section-title">📋 Your Original Challenge</div>
                <div class="detail-row">
                    <span class="detail-label">Challenge Type:</span>
                    <span class="detail-value">${emailData.original_challenge_type.charAt(0).toUpperCase() + emailData.original_challenge_type.slice(1)} Match</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Entry Fee:</span>
                    <span class="detail-value">$${emailData.original_entry_fee}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Race Length:</span>
                    <span class="detail-value">Race to ${emailData.original_race_length}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Game Type:</span>
                    <span class="detail-value">${emailData.original_game_type}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Location:</span>
                    <span class="detail-value">${emailData.original_location}</span>
                </div>
            </div>
            
            <div class="counter-proposal">
                <div class="section-title">🔄 Counter-Proposal from ${emailData.from_name}</div>
                <div class="detail-row">
                    <span class="detail-label">Entry Fee:</span>
                    <span class="detail-value">$${emailData.counter_entry_fee}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Race Length:</span>
                    <span class="detail-value">Race to ${emailData.counter_race_length}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Game Type:</span>
                    <span class="detail-value">${emailData.counter_game_type}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Location:</span>
                    <span class="detail-value">${emailData.counter_location}</span>
                </div>
                
                ${emailData.counter_dates && emailData.counter_dates.length > 0 ? `
                <div class="dates-list">
                    <h4>📅 Preferred Dates</h4>
                    ${emailData.counter_dates.map(date => `
                        <div class="date-item">
                            ${new Date(date).toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })}
                        </div>
                    `).join('')}
                </div>
                ` : ''}
                
                ${emailData.counter_note ? `
                <div class="message-box">
                    <strong>💬 Message from ${emailData.from_name}:</strong><br>
                    ${emailData.counter_note}
                </div>
                ` : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://newapp-1-ic1v.onrender.com/ladder" class="cta-button">
                    View Counter-Proposal in App
                </a>
            </div>
            
            <div class="footer">
                <p>This is an automated message from the Front Range Pool Hub Ladder System.</p>
                <p>Please respond to the counter-proposal through the app.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const mailOptions = {
      from: `"The Pool Hub" <admin@frontrangepool.com>`,
      to: emailData.to_email,
      subject: `🔄 Counter-Proposal from ${emailData.from_name}`,
      html: htmlContent
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('📧 Counter-proposal email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('Error sending counter-proposal email:', error);
    return { success: false, error: error.message };
  }
};

// Send match scheduling request approval email
export const sendMatchSchedulingApprovalEmail = async (emailData) => {
  try {
    const transporter = createTransporter();
    
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Match Scheduling Request Approved</title>
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
            .cta-button { display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Match Request Approved!</h1>
                <p>Your match scheduling request has been approved</p>
            </div>

            <p>Hi ${emailData.challengerName},</p>

            <p>Great news! Your match scheduling request has been approved by an admin.</p>

            <div class="date-highlight">
                <h3>📅 Match Scheduled</h3>
                <p>${emailData.preferredDate} at ${emailData.preferredTime}</p>
            </div>

            <div class="match-details">
                <h3 style="margin-top: 0; color: #10b981;">Match Details</h3>
                <div class="detail-row">
                    <span class="detail-label">Match Type:</span>
                    <span class="detail-value">${emailData.matchType}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Challenger:</span>
                    <span class="detail-value">${emailData.challengerName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Defender:</span>
                    <span class="detail-value">${emailData.defenderName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Game Type:</span>
                    <span class="detail-value">${emailData.gameType || '9-ball'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Race Length:</span>
                    <span class="detail-value">Race to ${emailData.raceLength || 7}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Location:</span>
                    <span class="detail-value">${emailData.location}</span>
                </div>
                ${emailData.notes ? `
                <div class="detail-row">
                    <span class="detail-label">Notes:</span>
                    <span class="detail-value">${emailData.notes}</span>
                </div>
                ` : ''}
            </div>

            <p><strong>What's Next?</strong></p>
            <ul>
                <li>Mark your calendar for the match date</li>
                <li>Arrive at the location on time</li>
                <li>Contact your opponent if needed</li>
                <li>Play your best game!</li>
            </ul>

            <div style="text-align: center;">
                <a href="${emailData.app_url}" class="cta-button">View Match Details</a>
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
      to: emailData.challengerEmail,
      subject: `🎉 Match Request Approved - ${emailData.defenderName}`,
      html: htmlContent
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('📧 Match scheduling approval email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('Error sending match scheduling approval email:', error);
    return { success: false, error: error.message };
  }
};

// Send match scheduling request rejection email
export const sendMatchSchedulingRejectionEmail = async (emailData) => {
  try {
    const transporter = createTransporter();
    
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Match Scheduling Request Update</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
            .container { background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .header { text-align: center; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; }
            .match-details { background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; padding: 5px 0; }
            .detail-label { font-weight: bold; color: #555; }
            .detail-value { color: #333; }
            .message-box { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📋 Match Request Update</h1>
                <p>Your match scheduling request has been reviewed</p>
            </div>

            <p>Hi ${emailData.challengerName},</p>

            <p>Your match scheduling request has been reviewed by an admin.</p>

            <div class="match-details">
                <h3 style="margin-top: 0; color: #f59e0b;">Request Details</h3>
                <div class="detail-row">
                    <span class="detail-label">Match Type:</span>
                    <span class="detail-value">${emailData.matchType}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Challenger:</span>
                    <span class="detail-value">${emailData.challengerName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Defender:</span>
                    <span class="detail-value">${emailData.defenderName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Requested Date:</span>
                    <span class="detail-value">${emailData.preferredDate} at ${emailData.preferredTime}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Location:</span>
                    <span class="detail-value">${emailData.location}</span>
                </div>
            </div>

            ${emailData.adminNotes ? `
            <div class="message-box">
                <h4 style="margin-top: 0; color: #856404;">💬 Admin Notes:</h4>
                <p style="margin-bottom: 0;">${emailData.adminNotes}</p>
            </div>
            ` : ''}

            <p><strong>What's Next?</strong></p>
            <ul>
                <li>You can submit a new match scheduling request</li>
                <li>Try different dates or times</li>
                <li>Contact the admin if you have questions</li>
            </ul>

            <div style="text-align: center;">
                <a href="${emailData.app_url}" class="cta-button">Submit New Request</a>
            </div>

            <div class="footer">
                <p>Thank you for using the Front Range Pool Hub Ladder System! 🎱</p>
                <p>Front Range Pool Hub - Ladder of Legends</p>
                <p><a href="https://frontrangepool.com">frontrangepool.com</a></p>
            </div>
        </div>
    </body>
    </html>
    `;

    const mailOptions = {
      from: `"The Pool Hub" <admin@frontrangepool.com>`,
      to: emailData.challengerEmail,
      subject: `📋 Match Request Update - ${emailData.defenderName}`,
      html: htmlContent
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('📧 Match scheduling rejection email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('Error sending match scheduling rejection email:', error);
    return { success: false, error: error.message };
  }
};

// Send match scheduling approval email to defender
export const sendMatchSchedulingDefenderNotificationEmail = async (emailData) => {
  try {
    const transporter = createTransporter();
    
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Match Scheduled - You're Playing!</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
            .container { background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .header { text-align: center; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; }
            .match-details { background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; padding: 5px 0; }
            .detail-label { font-weight: bold; color: #555; }
            .detail-value { color: #333; }
            .date-highlight { background-color: #dbeafe; padding: 15px; border-radius: 8px; border: 2px solid #3b82f6; text-align: center; margin: 20px 0; }
            .date-highlight h3 { color: #1d4ed8; margin: 0 0 10px 0; }
            .date-highlight p { font-size: 18px; font-weight: bold; color: #333; margin: 0; }
            .opponent-info { background-color: #fef3c7; padding: 15px; border-radius: 8px; border: 2px solid #f59e0b; margin: 20px 0; }
            .opponent-info h3 { color: #d97706; margin: 0 0 10px 0; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎱 Match Scheduled!</h1>
                <p>You have a match coming up</p>
            </div>

            <p>Hi ${emailData.defenderName},</p>

            <p>A match has been scheduled and you're playing! Here are the details:</p>

            <div class="date-highlight">
                <h3>📅 Match Date & Time</h3>
                <p>${emailData.preferredDate} at ${emailData.preferredTime}</p>
            </div>

            <div class="opponent-info">
                <h3>⚔️ Your Opponent</h3>
                <p><strong>${emailData.challengerName}</strong> has scheduled a match against you!</p>
            </div>

            <div class="match-details">
                <h3 style="margin-top: 0; color: #3b82f6;">Match Details</h3>
                <div class="detail-row">
                    <span class="detail-label">Match Type:</span>
                    <span class="detail-value">${emailData.matchType}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Challenger:</span>
                    <span class="detail-value">${emailData.challengerName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Defender:</span>
                    <span class="detail-value">${emailData.defenderName} (You)</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Location:</span>
                    <span class="detail-value">${emailData.location}</span>
                </div>
                ${emailData.notes ? `
                <div class="detail-row">
                    <span class="detail-label">Notes:</span>
                    <span class="detail-value">${emailData.notes}</span>
                </div>
                ` : ''}
            </div>

            <p><strong>What's Next?</strong></p>
            <ul>
                <li>Mark your calendar for the match date</li>
                <li>Arrive at the location on time</li>
                <li>Contact your opponent if you need to reschedule</li>
                <li>Play your best game!</li>
            </ul>

            <div style="text-align: center;">
                <a href="${emailData.app_url}" class="cta-button">View Match Details</a>
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
      to: emailData.defenderEmail,
      subject: `🎱 Match Scheduled - ${emailData.challengerName} vs You`,
      html: htmlContent
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('📧 Match scheduling defender notification email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('Error sending match scheduling defender notification email:', error);
    return { success: false, error: error.message };
  }
};

// Send match scheduling partner notification email
export const sendMatchSchedulingPartnerNotificationEmail = async (emailData) => {
  try {
    const transporter = createTransporter();
    
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Match Scheduled - Cueless Notification</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
            .container { background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .header { text-align: center; background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; }
            .match-details { background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #8b5cf6; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; padding: 5px 0; }
            .detail-label { font-weight: bold; color: #555; }
            .detail-value { color: #333; }
            .date-highlight { background-color: #ede9fe; padding: 15px; border-radius: 8px; border: 2px solid #8b5cf6; text-align: center; margin: 20px 0; }
            .date-highlight h3 { color: #7c3aed; margin: 0 0 10px 0; }
            .date-highlight p { font-size: 18px; font-weight: bold; color: #333; margin: 0; }
            .admin-info { background-color: #fef3c7; padding: 15px; border-radius: 8px; border: 2px solid #f59e0b; margin: 20px 0; }
            .admin-info h3 { color: #d97706; margin: 0 0 10px 0; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📋 New Match Scheduled</h1>
                <p>Cueless Business Notification</p>
            </div>

            <p>Hello Don,</p>

            <p>A new match has been scheduled in the Ladder of Legends system.</p>

            <div class="date-highlight">
                <h3>📅 Match Date & Time</h3>
                <p>${emailData.preferredDate} at ${emailData.preferredTime}</p>
            </div>

            <div class="admin-info">
                <h3>📋 Match Information</h3>
                <p>This match has been scheduled in the Ladder of Legends system.</p>
            </div>

            <div class="match-details">
                <h3 style="margin-top: 0; color: #8b5cf6;">Match Details</h3>
                <div class="detail-row">
                    <span class="detail-label">Match Type:</span>
                    <span class="detail-value">${emailData.matchType}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Challenger:</span>
                    <span class="detail-value">${emailData.challengerName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Defender:</span>
                    <span class="detail-value">${emailData.defenderName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Location:</span>
                    <span class="detail-value">${emailData.location}</span>
                </div>
                ${emailData.notes ? `
                <div class="detail-row">
                    <span class="detail-label">Notes:</span>
                    <span class="detail-value">${emailData.notes}</span>
                </div>
                ` : ''}
            </div>

            <p><strong>Match Status:</strong></p>
            <ul>
                <li>Match has been added to the calendar</li>
                <li>Both players have been notified</li>
                <li>Match is ready to be played</li>
            </ul>

            <div class="footer">
                <p>Front Range Pool Hub - Ladder of Legends</p>
                <p><a href="https://frontrangepool.com">frontrangepool.com</a></p>
            </div>
        </div>
    </body>
    </html>
    `;

    const mailOptions = {
      from: `"The Pool Hub" <admin@frontrangepool.com>`,
      to: emailData.partnerEmail,
      subject: `📋 New Match Scheduled - ${emailData.challengerName} vs ${emailData.defenderName}`,
      html: htmlContent
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('📧 Match scheduling partner notification email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('Error sending match scheduling partner notification email:', error);
    return { success: false, error: error.message };
  }
};

// Send test copies of all match scheduling emails to sslampro@gmail.com
export const sendMatchSchedulingTestEmails = async (challengerEmailData, defenderEmailData, partnerEmailData) => {
  try {
    const transporter = createTransporter();
    
    // Create a combined test email with all three email contents
    const testHtmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Test Email - Match Scheduling Notifications</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
            .container { background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); margin-bottom: 30px; }
            .test-header { text-align: center; background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .test-header h1 { margin: 0; font-size: 24px; }
            .email-section { border: 2px solid #e5e7eb; border-radius: 8px; margin: 20px 0; overflow: hidden; }
            .email-header { background: #f3f4f6; padding: 15px; border-bottom: 1px solid #e5e7eb; }
            .email-header h3 { margin: 0; color: #374151; }
            .email-content { padding: 20px; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="test-header">
                <h1>🧪 Test Email - Match Scheduling Notifications</h1>
                <p>Copies of all emails sent for match scheduling</p>
            </div>

            <p>Hello,</p>
            <p>This is a test email showing all the notifications that were sent for the match scheduling request.</p>

            <div class="email-section">
                <div class="email-header">
                    <h3>📧 Email 1: Challenger Approval Notification</h3>
                    <p><strong>To:</strong> ${challengerEmailData.challengerEmail}</p>
                    <p><strong>Subject:</strong> 🎉 Match Request Approved - ${challengerEmailData.defenderName}</p>
                </div>
                <div class="email-content">
                    <p><strong>This email was sent to the challenger confirming their match request was approved.</strong></p>
                    <p>Content includes: Match approval confirmation, date/time details, location, and next steps.</p>
                </div>
            </div>

            <div class="email-section">
                <div class="email-header">
                    <h3>📧 Email 2: Defender Notification</h3>
                    <p><strong>To:</strong> ${defenderEmailData.defenderEmail || 'No email available'}</p>
                    <p><strong>Subject:</strong> 🎱 Match Scheduled - ${defenderEmailData.challengerName} vs You</p>
                </div>
                <div class="email-content">
                    <p><strong>This email was sent to the defender notifying them they have a match scheduled.</strong></p>
                    <p>Content includes: Match scheduled notification, opponent details, date/time, and location.</p>
                </div>
            </div>

            <div class="email-section">
                <div class="email-header">
                    <h3>📧 Email 3: Don's Business Notification</h3>
                    <p><strong>To:</strong> sacodo752@gmail.com</p>
                    <p><strong>Subject:</strong> 📋 New Match Scheduled - ${partnerEmailData.challengerName} vs ${partnerEmailData.defenderName}</p>
                </div>
                <div class="email-content">
                    <p><strong>This email was sent to Don (Cueless partner) for business notification.</strong></p>
                    <p>Content includes: Match details, player names (no emails), date/time, and location.</p>
                </div>
            </div>

            <div class="footer">
                <p>This is a test email - Front Range Pool Hub Match Scheduling System</p>
                <p><a href="https://frontrangepool.com">frontrangepool.com</a></p>
            </div>
        </div>
    </body>
    </html>
    `;

    const mailOptions = {
      from: `"The Pool Hub" <admin@frontrangepool.com>`,
      to: 'sslampro@gmail.com',
      subject: `🧪 Test: Match Scheduling Emails - ${partnerEmailData.challengerName} vs ${partnerEmailData.defenderName}`,
      html: testHtmlContent
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('📧 Test email sent to sslampro@gmail.com successfully!');
    console.log('📧 Message ID:', result.messageId);
    
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('Error sending test email to sslampro@gmail.com:', error);
    return { success: false, error: error.message };
  }
};

// Send actual test versions of ALL ladder system emails for review
export const sendTestMatchSchedulingEmails = async (testData) => {
  try {
    const transporter = createTransporter();
    const testEmail = testData.testEmail || 'sslampro@gmail.com'; // Email to receive test emails
    const emailsSent = [];
    
    console.log('📧 Sending ALL ladder test emails for review to:', testEmail);
    
    // Prepare data for all three emails
    const challengerEmailData = {
      challengerName: testData.challengerName,
      challengerEmail: testData.challengerEmail,
      defenderName: testData.defenderName,
      matchType: testData.matchType,
      preferredDate: testData.preferredDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      preferredTime: testData.preferredTime,
      location: testData.location,
      notes: testData.notes,
      app_url: process.env.FRONTEND_URL || 'http://localhost:5173'
    };

    const defenderEmailData = {
      challengerName: testData.challengerName,
      challengerEmail: testData.challengerEmail,
      defenderName: testData.defenderName,
      defenderEmail: testData.defenderEmail,
      matchType: testData.matchType,
      preferredDate: testData.preferredDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      preferredTime: testData.preferredTime,
      location: testData.location,
      notes: testData.notes,
      app_url: process.env.FRONTEND_URL || 'http://localhost:5173'
    };

    const partnerEmailData = {
      partnerEmail: 'sacodo752@gmail.com',
      challengerName: testData.challengerName,
      defenderName: testData.defenderName,
      matchType: testData.matchType,
      preferredDate: testData.preferredDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      preferredTime: testData.preferredTime,
      location: testData.location,
      notes: testData.notes
    };

    // Send test challenger approval email
    try {
      const challengerHtml = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Match Scheduling Request Approved</title>
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
              .cta-button { display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>🎉 Match Request Approved!</h1>
                  <p>Your match scheduling request has been approved</p>
              </div>

              <p>Hi ${challengerEmailData.challengerName},</p>

              <p>Great news! Your match scheduling request has been approved by an admin.</p>

              <div class="date-highlight">
                  <h3>📅 Match Scheduled</h3>
                  <p>${challengerEmailData.preferredDate} at ${challengerEmailData.preferredTime}</p>
              </div>

              <div class="match-details">
                  <h3 style="margin-top: 0; color: #10b981;">Match Details</h3>
                  <div class="detail-row">
                      <span class="detail-label">Match Type:</span>
                      <span class="detail-value">${challengerEmailData.matchType}</span>
                  </div>
                  <div class="detail-row">
                      <span class="detail-label">Challenger:</span>
                      <span class="detail-value">${challengerEmailData.challengerName}</span>
                  </div>
                  <div class="detail-row">
                      <span class="detail-label">Defender:</span>
                      <span class="detail-value">${challengerEmailData.defenderName}</span>
                  </div>
                  <div class="detail-row">
                      <span class="detail-label">Location:</span>
                      <span class="detail-value">${challengerEmailData.location}</span>
                  </div>
                  ${challengerEmailData.notes ? `
                  <div class="detail-row">
                      <span class="detail-label">Notes:</span>
                      <span class="detail-value">${challengerEmailData.notes}</span>
                  </div>
                  ` : ''}
              </div>

              <p><strong>What's Next?</strong></p>
              <ul>
                  <li>Mark your calendar for the match date</li>
                  <li>Arrive at the location on time</li>
                  <li>Contact your opponent if needed</li>
                  <li>Play your best game!</li>
              </ul>

              <div style="text-align: center;">
                  <a href="${challengerEmailData.app_url}" class="cta-button">View Match Details</a>
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

      const challengerMailOptions = {
        from: `"The Pool Hub" <admin@frontrangepool.com>`,
        to: testEmail,
        subject: `🧪 TEST: Challenger Email - Match Request Approved - ${challengerEmailData.defenderName}`,
        html: challengerHtml
      };

      await transporter.sendMail(challengerMailOptions);
      emailsSent.push('Challenger Approval Email');
      console.log('📧 Test challenger email sent successfully');
    } catch (error) {
      console.error('Error sending test challenger email:', error);
    }

    // Send test defender notification email
    try {
      const defenderHtml = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Match Scheduled - You're Playing!</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
              .container { background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
              .header { text-align: center; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
              .header h1 { margin: 0; font-size: 24px; }
              .match-details { background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0; }
              .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; padding: 5px 0; }
              .detail-label { font-weight: bold; color: #555; }
              .detail-value { color: #333; }
              .date-highlight { background-color: #dbeafe; padding: 15px; border-radius: 8px; border: 2px solid #3b82f6; text-align: center; margin: 20px 0; }
              .date-highlight h3 { color: #1d4ed8; margin: 0 0 10px 0; }
              .date-highlight p { font-size: 18px; font-weight: bold; color: #333; margin: 0; }
              .opponent-info { background-color: #fef3c7; padding: 15px; border-radius: 8px; border: 2px solid #f59e0b; margin: 20px 0; }
              .opponent-info h3 { color: #d97706; margin: 0 0 10px 0; }
              .cta-button { display: inline-block; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>🎱 Match Scheduled!</h1>
                  <p>You have a match coming up</p>
              </div>

              <p>Hi ${defenderEmailData.defenderName},</p>

              <p>A match has been scheduled and you're playing! Here are the details:</p>

              <div class="date-highlight">
                  <h3>📅 Match Date & Time</h3>
                  <p>${defenderEmailData.preferredDate} at ${defenderEmailData.preferredTime}</p>
              </div>

              <div class="opponent-info">
                  <h3>⚔️ Your Opponent</h3>
                  <p><strong>${defenderEmailData.challengerName}</strong> has scheduled a match against you!</p>
              </div>

              <div class="match-details">
                  <h3 style="margin-top: 0; color: #3b82f6;">Match Details</h3>
                  <div class="detail-row">
                      <span class="detail-label">Match Type:</span>
                      <span class="detail-value">${defenderEmailData.matchType}</span>
                  </div>
                  <div class="detail-row">
                      <span class="detail-label">Challenger:</span>
                      <span class="detail-value">${defenderEmailData.challengerName}</span>
                  </div>
                  <div class="detail-row">
                      <span class="detail-label">Defender:</span>
                      <span class="detail-value">${defenderEmailData.defenderName} (You)</span>
                  </div>
                  <div class="detail-row">
                      <span class="detail-label">Location:</span>
                      <span class="detail-value">${defenderEmailData.location}</span>
                  </div>
                  ${defenderEmailData.notes ? `
                  <div class="detail-row">
                      <span class="detail-label">Notes:</span>
                      <span class="detail-value">${defenderEmailData.notes}</span>
                  </div>
                  ` : ''}
              </div>

              <p><strong>What's Next?</strong></p>
              <ul>
                  <li>Mark your calendar for the match date</li>
                  <li>Arrive at the location on time</li>
                  <li>Contact your opponent if you need to reschedule</li>
                  <li>Play your best game!</li>
              </ul>

              <div style="text-align: center;">
                  <a href="${defenderEmailData.app_url}" class="cta-button">View Match Details</a>
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

      const defenderMailOptions = {
        from: `"The Pool Hub" <admin@frontrangepool.com>`,
        to: testEmail,
        subject: `🧪 TEST: Defender Email - Match Scheduled - ${defenderEmailData.challengerName} vs You`,
        html: defenderHtml
      };

      await transporter.sendMail(defenderMailOptions);
      emailsSent.push('Defender Notification Email');
      console.log('📧 Test defender email sent successfully');
    } catch (error) {
      console.error('Error sending test defender email:', error);
    }

    // Send test partner notification email
    try {
      const partnerHtml = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Match Scheduled - Cueless Notification</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
              .container { background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
              .header { text-align: center; background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
              .header h1 { margin: 0; font-size: 24px; }
              .match-details { background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #8b5cf6; margin: 20px 0; }
              .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; padding: 5px 0; }
              .detail-label { font-weight: bold; color: #555; }
              .detail-value { color: #333; }
              .date-highlight { background-color: #ede9fe; padding: 15px; border-radius: 8px; border: 2px solid #8b5cf6; text-align: center; margin: 20px 0; }
              .date-highlight h3 { color: #7c3aed; margin: 0 0 10px 0; }
              .date-highlight p { font-size: 18px; font-weight: bold; color: #333; margin: 0; }
              .admin-info { background-color: #fef3c7; padding: 15px; border-radius: 8px; border: 2px solid #f59e0b; margin: 20px 0; }
              .admin-info h3 { color: #d97706; margin: 0 0 10px 0; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>📋 New Match Scheduled</h1>
                  <p>Cueless Business Notification</p>
              </div>

              <p>Hello Don,</p>

              <p>A new match has been scheduled in the Ladder of Legends system.</p>

              <div class="date-highlight">
                  <h3>📅 Match Date & Time</h3>
                  <p>${partnerEmailData.preferredDate} at ${partnerEmailData.preferredTime}</p>
              </div>

              <div class="admin-info">
                  <h3>📋 Match Information</h3>
                  <p>This match has been scheduled in the Ladder of Legends system.</p>
              </div>

              <div class="match-details">
                  <h3 style="margin-top: 0; color: #8b5cf6;">Match Details</h3>
                  <div class="detail-row">
                      <span class="detail-label">Match Type:</span>
                      <span class="detail-value">${partnerEmailData.matchType}</span>
                  </div>
                  <div class="detail-row">
                      <span class="detail-label">Challenger:</span>
                      <span class="detail-value">${partnerEmailData.challengerName}</span>
                  </div>
                  <div class="detail-row">
                      <span class="detail-label">Defender:</span>
                      <span class="detail-value">${partnerEmailData.defenderName}</span>
                  </div>
                  <div class="detail-row">
                      <span class="detail-label">Location:</span>
                      <span class="detail-value">${partnerEmailData.location}</span>
                  </div>
                  ${partnerEmailData.notes ? `
                  <div class="detail-row">
                      <span class="detail-label">Notes:</span>
                      <span class="detail-value">${partnerEmailData.notes}</span>
                  </div>
                  ` : ''}
              </div>

              <p><strong>Match Status:</strong></p>
              <ul>
                  <li>Match has been added to the calendar</li>
                  <li>Both players have been notified</li>
                  <li>Match is ready to be played</li>
              </ul>

              <div class="footer">
                  <p>Front Range Pool Hub - Ladder of Legends</p>
                  <p><a href="https://frontrangepool.com">frontrangepool.com</a></p>
              </div>
          </div>
      </body>
      </html>
      `;

      const partnerMailOptions = {
        from: `"The Pool Hub" <admin@frontrangepool.com>`,
        to: testEmail,
        subject: `🧪 TEST: Don's Email - New Match Scheduled - ${partnerEmailData.challengerName} vs ${partnerEmailData.defenderName}`,
        html: partnerHtml
      };

      await transporter.sendMail(partnerMailOptions);
      emailsSent.push('Don\'s Business Notification Email');
      console.log('📧 Test partner email sent successfully');
    } catch (error) {
      console.error('Error sending test partner email:', error);
    }

    // Send test challenge notification email
    try {
      const challengeNotificationData = {
        to_name: 'Jane Doe',
        from_name: 'John Smith',
        challenger_position: '5',
        defender_position: '3',
        ladder_name: 'Ladder of Legends',
        challenge_type: 'Challenge',
        entry_fee: '5',
        race_length: 'Race to 7',
        game_type: '8-Ball',
        table_size: '9-Foot',
        location: 'Main Street Pool Hall',
        preferred_dates: 'Monday, January 15th\nTuesday, January 16th\nWednesday, January 17th',
        message: 'Looking forward to a great match!',
        challenge_id: 'TEST123',
        response_deadline: '48 hours',
        app_url: process.env.FRONTEND_URL || 'http://localhost:5173'
      };

      const challengeNotificationHtml = `
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

              <p>Hi ${challengeNotificationData.to_name},</p>

              <p><strong>${challengeNotificationData.from_name}</strong> has challenged you to a match! Here are the details:</p>

              <div class="positions">
                  <h3>🏆 Ladder Positions</h3>
                  <p><strong>${challengeNotificationData.from_name}</strong> (Position ${challengeNotificationData.challenger_position}) vs <strong>You</strong> (Position ${challengeNotificationData.defender_position})</p>
                  <p><em>${challengeNotificationData.ladder_name} Ladder</em></p>
              </div>

              <div class="challenge-details">
                  <h3 style="margin-top: 0; color: #ff4444;">Match Details</h3>
                  <div class="detail-row">
                      <span class="detail-label">Challenge Type:</span>
                      <span class="detail-value">${challengeNotificationData.challenge_type}</span>
                  </div>
                  <div class="detail-row">
                      <span class="detail-label">Entry Fee:</span>
                      <span class="detail-value">$${challengeNotificationData.entry_fee}</span>
                  </div>
                  <div class="detail-row">
                      <span class="detail-label">Race Length:</span>
                      <span class="detail-value">${challengeNotificationData.race_length}</span>
                  </div>
                  <div class="detail-row">
                      <span class="detail-label">Game Type:</span>
                      <span class="detail-value">${challengeNotificationData.game_type}</span>
                  </div>
                  <div class="detail-row">
                      <span class="detail-label">Table Size:</span>
                      <span class="detail-value">${challengeNotificationData.table_size}</span>
                  </div>
                  <div class="detail-row">
                      <span class="detail-label">Location:</span>
                      <span class="detail-value">${challengeNotificationData.location}</span>
                  </div>
              </div>

              <div class="dates-section">
                  <h3>📅 Preferred Match Dates</h3>
                  <p>${challengeNotificationData.preferred_dates}</p>
              </div>

              <div class="message-box">
                  <h3 style="margin-top: 0; color: #7b1fa2;">Message from ${challengeNotificationData.from_name}</h3>
                  <p><em>"${challengeNotificationData.message}"</em></p>
              </div>

              <div class="deadline-warning">
                  <h3>⏰ Response Deadline</h3>
                  <p><strong>You have ${challengeNotificationData.response_deadline} to respond to this challenge!</strong></p>
              </div>

              <div style="text-align: center;">
                  <a href="${challengeNotificationData.app_url}" class="cta-button">Respond to Challenge</a>
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

      const challengeNotificationMailOptions = {
        from: `"The Pool Hub" <admin@frontrangepool.com>`,
        to: testEmail,
        subject: `🧪 TEST: Challenge Notification Email - ${challengeNotificationData.from_name} vs ${challengeNotificationData.to_name}`,
        html: challengeNotificationHtml
      };

      await transporter.sendMail(challengeNotificationMailOptions);
      emailsSent.push('Challenge Notification Email');
      console.log('📧 Test challenge notification email sent successfully');
    } catch (error) {
      console.error('Error sending test challenge notification email:', error);
    }

    // Send test ladder application approval email
    try {
      const ladderApprovalData = {
        to_name: 'John Smith',
        to_email: testEmail,
        pin: '1234',
        ladder_name: 'Ladder of Legends',
        position: '5',
        login_url: process.env.FRONTEND_URL || 'http://localhost:5173'
      };

      const ladderApprovalHtml = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Ladder Position Approved</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
              .container { background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
              .header { text-align: center; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
              .header h1 { margin: 0; font-size: 24px; }
              .position-details { background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0; }
              .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; padding: 5px 0; }
              .detail-label { font-weight: bold; color: #555; }
              .detail-value { color: #333; }
              .pin-highlight { background-color: #e8f5e8; padding: 15px; border-radius: 8px; border: 2px solid #10b981; text-align: center; margin: 20px 0; }
              .pin-highlight h3 { color: #10b981; margin: 0 0 10px 0; }
              .pin-highlight p { font-size: 18px; font-weight: bold; color: #333; margin: 0; }
              .features-list { background-color: #e3f2fd; padding: 20px; border-radius: 8px; border: 2px solid #2196f3; margin: 20px 0; }
              .features-list h3 { color: #1976d2; margin: 0 0 15px 0; }
              .features-list ul { margin: 0; padding-left: 20px; }
              .features-list li { margin-bottom: 8px; }
              .cta-button { display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>🎉 Ladder Position Approved!</h1>
                  <p>Your ladder position claim has been approved</p>
              </div>

              <p>Hi ${ladderApprovalData.to_name},</p>

              <p>Congratulations! Your ladder position claim has been approved by an admin.</p>

              <div class="position-details">
                  <h3 style="margin-top: 0; color: #10b981;">Position Details</h3>
                  <div class="detail-row">
                      <span class="detail-label">Ladder:</span>
                      <span class="detail-value">${ladderApprovalData.ladder_name}</span>
                  </div>
                  <div class="detail-row">
                      <span class="detail-label">Position:</span>
                      <span class="detail-value">#${ladderApprovalData.position}</span>
                  </div>
              </div>

              <div class="pin-highlight">
                  <h3>🔑 Your PIN</h3>
                  <p>${ladderApprovalData.pin}</p>
                  <p><em>Keep this PIN safe - you'll need it to access your account</em></p>
              </div>

              <div class="features-list">
                  <h3>🎯 What You Can Do Now</h3>
                  <ul>
                      <li>View the ladder standings</li>
                      <li>Challenge other players (with membership)</li>
                      <li>Report match results (with membership)</li>
                      <li>Track your match history</li>
                      <li>View player statistics</li>
                  </ul>
              </div>

              <div style="text-align: center;">
                  <a href="${ladderApprovalData.login_url}" class="cta-button">Access Your Account</a>
              </div>

              <div class="footer">
                  <p>Welcome to the ladder! 🎱</p>
                  <p>Front Range Pool Hub - Ladder of Legends</p>
                  <p><a href="https://frontrangepool.com">frontrangepool.com</a></p>
              </div>
          </div>
      </body>
      </html>
      `;

      const ladderApprovalMailOptions = {
        from: `"The Pool Hub" <admin@frontrangepool.com>`,
        to: testEmail,
        subject: `🧪 TEST: Ladder Application Approval - ${ladderApprovalData.to_name} Position #${ladderApprovalData.position}`,
        html: ladderApprovalHtml
      };

      await transporter.sendMail(ladderApprovalMailOptions);
      emailsSent.push('Ladder Application Approval Email');
      console.log('📧 Test ladder application approval email sent successfully');
    } catch (error) {
      console.error('Error sending test ladder application approval email:', error);
    }

    // Send test challenge confirmation email
    try {
      const challengeConfirmationData = {
        to_name: 'John Smith',
        to_email: testEmail,
        from_name: 'Jane Doe',
        challenge_type: 'Challenge',
        entry_fee: '5',
        race_length: 'Race to 7',
        game_type: '8-Ball',
        table_size: '9-Foot',
        location: 'Main Street Pool Hall',
        note: 'Looking forward to a great match!',
        challenge_id: 'TEST123',
        match_date: new Date('2024-01-15'),
        app_url: process.env.FRONTEND_URL || 'http://localhost:5173'
      };

      const challengeConfirmationHtml = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Challenge Accepted - Match Confirmed</title>
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
              .cta-button { display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>🎉 Challenge Accepted - Match Confirmed!</h1>
                  <p>Your challenge has been accepted</p>
              </div>

              <p>Hi ${challengeConfirmationData.to_name},</p>

              <p>Great news! Your challenge has been accepted and the match is confirmed.</p>

              <div class="date-highlight">
                  <h3>📅 Match Scheduled</h3>
                  <p>Monday, January 15, 2024</p>
              </div>

              <div class="match-details">
                  <h3 style="margin-top: 0; color: #10b981;">Match Details</h3>
                  <div class="detail-row">
                      <span class="detail-label">Opponent:</span>
                      <span class="detail-value">${challengeConfirmationData.from_name}</span>
                  </div>
                  <div class="detail-row">
                      <span class="detail-label">Challenge Type:</span>
                      <span class="detail-value">${challengeConfirmationData.challenge_type}</span>
                  </div>
                  <div class="detail-row">
                      <span class="detail-label">Entry Fee:</span>
                      <span class="detail-value">$${challengeConfirmationData.entry_fee}</span>
                  </div>
                  <div class="detail-row">
                      <span class="detail-label">Race Length:</span>
                      <span class="detail-value">${challengeConfirmationData.race_length}</span>
                  </div>
                  <div class="detail-row">
                      <span class="detail-label">Game Type:</span>
                      <span class="detail-value">${challengeConfirmationData.game_type}</span>
                  </div>
                  <div class="detail-row">
                      <span class="detail-label">Table Size:</span>
                      <span class="detail-value">${challengeConfirmationData.table_size}</span>
                  </div>
                  <div class="detail-row">
                      <span class="detail-label">Location:</span>
                      <span class="detail-value">${challengeConfirmationData.location}</span>
                  </div>
              </div>

              <p><strong>What's Next?</strong></p>
              <ul>
                  <li>Mark your calendar for the match date</li>
                  <li>Arrive at the location on time</li>
                  <li>Contact your opponent if needed</li>
                  <li>Play your best game!</li>
              </ul>

              <div style="text-align: center;">
                  <a href="${challengeConfirmationData.app_url}" class="cta-button">View Match Details</a>
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

      const challengeConfirmationMailOptions = {
        from: `"The Pool Hub" <admin@frontrangepool.com>`,
        to: testEmail,
        subject: `🧪 TEST: Challenge Confirmation Email - ${challengeConfirmationData.to_name} vs ${challengeConfirmationData.from_name}`,
        html: challengeConfirmationHtml
      };

      await transporter.sendMail(challengeConfirmationMailOptions);
      emailsSent.push('Challenge Confirmation Email');
      console.log('📧 Test challenge confirmation email sent successfully');
    } catch (error) {
      console.error('Error sending test challenge confirmation email:', error);
    }

    // Send test counter proposal email
    try {
      const counterProposalData = {
        to_name: 'John Smith',
        to_email: testEmail,
        from_name: 'Jane Doe',
        challenge_type: 'Challenge',
        entry_fee: '5',
        race_length: 'Race to 7',
        new_entry_fee: '10',
        new_race_length: 'Race to 9',
        message: 'How about we make it more interesting with a higher entry fee?',
        app_url: process.env.FRONTEND_URL || 'http://localhost:5173'
      };

      const counterProposalHtml = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Counter-Proposal Received</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
              .container { background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
              .header { text-align: center; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
              .header h1 { margin: 0; font-size: 24px; }
              .proposal-details { background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0; }
              .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; padding: 5px 0; }
              .detail-label { font-weight: bold; color: #555; }
              .detail-value { color: #333; }
              .original-section { background-color: #e3f2fd; padding: 15px; border-radius: 8px; border: 2px solid #2196f3; margin: 20px 0; }
              .original-section h3 { color: #1976d2; margin: 0 0 10px 0; }
              .counter-section { background-color: #fff3e0; padding: 15px; border-radius: 8px; border: 2px solid #ff9800; margin: 20px 0; }
              .counter-section h3 { color: #f57c00; margin: 0 0 10px 0; }
              .message-box { background-color: #f3e5f5; border: 1px solid #ce93d8; padding: 15px; border-radius: 8px; margin: 20px 0; }
              .cta-button { display: inline-block; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>🔄 Counter-Proposal from ${counterProposalData.from_name}</h1>
                  <p>You have received a counter-proposal</p>
              </div>

              <p>Hi ${counterProposalData.to_name},</p>

              <p><strong>${counterProposalData.from_name}</strong> has sent you a counter-proposal for your challenge.</p>

              <div class="original-section">
                  <h3>📋 Original Challenge</h3>
                  <div class="detail-row">
                      <span class="detail-label">Challenge Type:</span>
                      <span class="detail-value">${counterProposalData.challenge_type}</span>
                  </div>
                  <div class="detail-row">
                      <span class="detail-label">Entry Fee:</span>
                      <span class="detail-value">$${counterProposalData.entry_fee}</span>
                  </div>
                  <div class="detail-row">
                      <span class="detail-label">Race Length:</span>
                      <span class="detail-value">${counterProposalData.race_length}</span>
                  </div>
              </div>

              <div class="counter-section">
                  <h3>🔄 Counter-Proposal</h3>
                  <div class="detail-row">
                      <span class="detail-label">New Entry Fee:</span>
                      <span class="detail-value">$${counterProposalData.new_entry_fee}</span>
                  </div>
                  <div class="detail-row">
                      <span class="detail-label">New Race Length:</span>
                      <span class="detail-value">${counterProposalData.new_race_length}</span>
                  </div>
              </div>

              <div class="message-box">
                  <h3 style="margin-top: 0; color: #7b1fa2;">Message from ${counterProposalData.from_name}</h3>
                  <p><em>"${counterProposalData.message}"</em></p>
              </div>

              <p>Please review the counter-proposal and respond accordingly.</p>

              <div style="text-align: center;">
                  <a href="${counterProposalData.app_url}" class="cta-button">Respond to Counter-Proposal</a>
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

      const counterProposalMailOptions = {
        from: `"The Pool Hub" <admin@frontrangepool.com>`,
        to: testEmail,
        subject: `🧪 TEST: Counter-Proposal Email - ${counterProposalData.from_name} vs ${counterProposalData.to_name}`,
        html: counterProposalHtml
      };

      await transporter.sendMail(counterProposalMailOptions);
      emailsSent.push('Counter-Proposal Email');
      console.log('📧 Test counter-proposal email sent successfully');
    } catch (error) {
      console.error('Error sending test counter-proposal email:', error);
    }

    // Send test match scheduling rejection email
    try {
      const matchRejectionData = {
        challengerName: 'John Smith',
        challengerEmail: testEmail,
        defenderName: 'Jane Doe',
        matchType: 'Challenge',
        preferredDate: new Date('2024-01-15'),
        preferredTime: '7:00 PM',
        location: 'Main Street Pool Hall',
        adminNotes: 'Unfortunately, the requested time conflicts with another scheduled match. Please try a different time.',
        app_url: process.env.FRONTEND_URL || 'http://localhost:5173'
      };

      const matchRejectionHtml = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Match Request Update</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
              .container { background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
              .header { text-align: center; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
              .header h1 { margin: 0; font-size: 24px; }
              .match-details { background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0; }
              .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; padding: 5px 0; }
              .detail-label { font-weight: bold; color: #555; }
              .detail-value { color: #333; }
              .message-box { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0; }
              .cta-button { display: inline-block; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>📋 Match Request Update</h1>
                  <p>Your match scheduling request has been reviewed</p>
              </div>

              <p>Hi ${matchRejectionData.challengerName},</p>

              <p>Your match scheduling request has been reviewed by an admin.</p>

              <div class="match-details">
                  <h3 style="margin-top: 0; color: #f59e0b;">Request Details</h3>
                  <div class="detail-row">
                      <span class="detail-label">Match Type:</span>
                      <span class="detail-value">${matchRejectionData.matchType}</span>
                  </div>
                  <div class="detail-row">
                      <span class="detail-label">Opponent:</span>
                      <span class="detail-value">${matchRejectionData.defenderName}</span>
                  </div>
                  <div class="detail-row">
                      <span class="detail-label">Requested Date:</span>
                      <span class="detail-value">Monday, January 15, 2024</span>
                  </div>
                  <div class="detail-row">
                      <span class="detail-label">Requested Time:</span>
                      <span class="detail-value">${matchRejectionData.preferredTime}</span>
                  </div>
                  <div class="detail-row">
                      <span class="detail-label">Location:</span>
                      <span class="detail-value">${matchRejectionData.location}</span>
                  </div>
              </div>

              <div class="message-box">
                  <h3 style="margin-top: 0; color: #f57c00;">Admin Notes</h3>
                  <p>${matchRejectionData.adminNotes}</p>
              </div>

              <p>Please submit a new match scheduling request with different details.</p>

              <div style="text-align: center;">
                  <a href="${matchRejectionData.app_url}" class="cta-button">Submit New Request</a>
              </div>

              <div class="footer">
                  <p>Thank you for using our ladder system! 🎱</p>
                  <p>Front Range Pool Hub - Ladder of Legends</p>
                  <p><a href="https://frontrangepool.com">frontrangepool.com</a></p>
              </div>
          </div>
      </body>
      </html>
      `;

      const matchRejectionMailOptions = {
        from: `"The Pool Hub" <admin@frontrangepool.com>`,
        to: testEmail,
        subject: `🧪 TEST: Match Request Rejection - ${matchRejectionData.challengerName} vs ${matchRejectionData.defenderName}`,
        html: matchRejectionHtml
      };

      await transporter.sendMail(matchRejectionMailOptions);
      emailsSent.push('Match Request Rejection Email');
      console.log('📧 Test match rejection email sent successfully');
    } catch (error) {
      console.error('Error sending test match rejection email:', error);
    }

    console.log(`📧 All ladder test emails sent successfully to ${testEmail}`);
    console.log(`📧 Total emails sent: ${emailsSent.length}`);
    console.log(`📧 Emails sent: ${emailsSent.join(', ')}`);
    return { success: true, emailsSent };
    
  } catch (error) {
    console.error('Error sending test match scheduling emails:', error);
    return { success: false, error: error.message };
  }
};

// Send admin email (generic email from admin interface)
export const sendAdminEmail = async (emailData) => {
  try {
    const transporter = createTransporter();
    
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${emailData.subject}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
            .container { background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .header { text-align: center; background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0; }
            .content p { margin: 0 0 15px 0; }
            .content p:last-child { margin-bottom: 0; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📧 ${emailData.subject}</h1>
                <p>Message from Front Range Pool Hub</p>
            </div>

            <div class="content">
                ${emailData.message.replace(/\n/g, '<br>')}
            </div>

            <div class="footer">
                <p>Front Range Pool Hub - Ladder of Legends</p>
                <p><a href="https://frontrangepool.com">frontrangepool.com</a></p>
            </div>
        </div>
    </body>
    </html>
    `;

    const mailOptions = {
      from: `"The Pool Hub" <admin@frontrangepool.com>`,
      to: emailData.to,
      subject: emailData.subject,
      html: htmlContent
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`📧 Admin email sent successfully to ${emailData.to}`);
    console.log('📧 Message ID:', result.messageId);
    
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error(`Error sending admin email to ${emailData.to}:`, error);
    return { success: false, error: error.message };
  }
};

// Send ladder application approval email
export const sendLadderApplicationApprovalEmail = async (emailData) => {
  try {
    const transporter = createTransporter();
    
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ladder Position Approved</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; }
            .container { background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .header { text-align: center; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; }
            .position-details { background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; padding: 5px 0; }
            .detail-label { font-weight: bold; color: #555; }
            .detail-value { color: #333; }
            .pin-highlight { background-color: #e8f5e8; padding: 15px; border-radius: 8px; border: 2px solid #10b981; text-align: center; margin: 20px 0; }
            .pin-highlight h3 { color: #10b981; margin: 0 0 10px 0; }
            .pin-highlight p { font-size: 18px; font-weight: bold; color: #333; margin: 0; }
            .features-list { background-color: #e3f2fd; padding: 20px; border-radius: 8px; border: 2px solid #2196f3; margin: 20px 0; }
            .features-list h3 { color: #1976d2; margin: 0 0 15px 0; }
            .features-list ul { margin: 0; padding-left: 20px; }
            .features-list li { margin-bottom: 8px; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Ladder Position Approved!</h1>
                <p>Your ladder position claim has been approved</p>
            </div>

            <p>Hi ${emailData.to_name},</p>

            <p>Congratulations! Your ladder position claim has been approved by an admin.</p>

            <div class="position-details">
                <h3 style="margin-top: 0; color: #10b981;">Position Details</h3>
                <div class="detail-row">
                    <span class="detail-label">Ladder:</span>
                    <span class="detail-value">${emailData.ladder_name || 'Ladder of Legends'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Position:</span>
                    <span class="detail-value">#${emailData.position || 'TBD'}</span>
                </div>
            </div>

            <div class="pin-highlight">
                <h3>🔑 Your PIN</h3>
                <p>${emailData.pin}</p>
                <p><em>Keep this PIN safe - you'll need it to access your account</em></p>
            </div>

            <div class="features-list">
                <h3>🎯 What You Can Do Now</h3>
                <ul>
                    <li>View the ladder standings</li>
                    <li>Challenge other players (with membership)</li>
                    <li>Report match results (with membership)</li>
                    <li>Track your match history</li>
                    <li>View player statistics</li>
                </ul>
            </div>

            <div style="text-align: center;">
                <a href="${emailData.login_url || process.env.FRONTEND_URL || 'http://localhost:5173'}" class="cta-button">Access Your Account</a>
            </div>

            <div class="footer">
                <p>Welcome to the ladder! 🎱</p>
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
      subject: `🎉 Ladder Position Approved - ${emailData.to_name}`,
      html: htmlContent
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`📧 Ladder application approval email sent successfully to ${emailData.to_email}`);
    console.log('📧 Message ID:', result.messageId);
    
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('Error sending ladder application approval email:', error);
    return { success: false, error: error.message };
  }
};