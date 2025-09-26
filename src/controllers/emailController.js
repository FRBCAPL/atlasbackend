import { sendAdminEmail } from '../services/nodemailerService.js';

// Send email from admin interface
export const sendEmail = async (req, res) => {
  try {
    const { emailType, subject, message, recipientEmail, selectedPlayers, players } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Subject and message are required'
      });
    }

    let emailsSent = 0;
    const results = [];

    // Send to specific email address
    if (recipientEmail) {
      try {
        const emailData = {
          to: recipientEmail,
          subject: subject,
          message: message,
          emailType: emailType
        };

        const result = await sendAdminEmail(emailData);
        if (result.success) {
          emailsSent++;
          results.push(`Email sent to ${recipientEmail}`);
        } else {
          results.push(`Failed to send to ${recipientEmail}: ${result.error}`);
        }
      } catch (error) {
        results.push(`Error sending to ${recipientEmail}: ${error.message}`);
      }
    }

    // Send to selected players
    if (selectedPlayers && players && players.length > 0) {
      for (const player of players) {
        const playerEmail = player.email || player.unifiedAccount?.email;
        
        if (playerEmail) {
          try {
            // Replace placeholders in message
            let personalizedMessage = message
              .replace(/\[PLAYER_NAME\]/g, `${player.firstName} ${player.lastName}`)
              .replace(/\[OPPONENT_NAME\]/g, 'Your Opponent')
              .replace(/\[MATCH_DATE\]/g, 'TBD')
              .replace(/\[MATCH_TIME\]/g, 'TBD')
              .replace(/\[LOCATION\]/g, 'TBD');

            const emailData = {
              to: playerEmail,
              subject: subject,
              message: personalizedMessage,
              emailType: emailType,
              playerName: `${player.firstName} ${player.lastName}`
            };

            const result = await sendAdminEmail(emailData);
            if (result.success) {
              emailsSent++;
              results.push(`Email sent to ${player.firstName} ${player.lastName} (${playerEmail})`);
            } else {
              results.push(`Failed to send to ${player.firstName} ${player.lastName}: ${result.error}`);
            }
          } catch (error) {
            results.push(`Error sending to ${player.firstName} ${player.lastName}: ${error.message}`);
          }
        } else {
          results.push(`No email address for ${player.firstName} ${player.lastName}`);
        }
      }
    }

    console.log(`📧 Admin email sending complete: ${emailsSent} emails sent`);
    console.log('📧 Results:', results);

    res.json({
      success: true,
      message: `Email sending completed. ${emailsSent} email(s) sent successfully.`,
      emailsSent: emailsSent,
      results: results
    });

  } catch (error) {
    console.error('Error in sendEmail controller:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send emails',
      error: error.message
    });
  }
};
