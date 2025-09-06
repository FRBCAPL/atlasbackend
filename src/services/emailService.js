import emailjs from 'emailjs-com';

const sendApprovalEmail = async (playerData) => {
  try {
    // Use the same EmailJS configuration as the singles league app
    const result = await emailjs.send(
      'service_l5q2047', // Same service ID as singles league
      'template_ladder_approval', // You'll need to create this template
      {
        to_email: playerData.email,
        to_name: `${playerData.firstName} ${playerData.lastName}`,
        email: playerData.email,
        pin: playerData.pin,
        ladder_name: playerData.ladderName,
        position: playerData.position,
        login_url: 'https://newapp-1-ic1v.onrender.com' // Your app URL
      },
      'g6vqrOs_Jb6LL1VCZ' // Same user ID as singles league
    );
    
    console.log('📧 Email sent successfully!');
    console.log('📧 EmailJS Response:', result);
    
    return { success: true, messageId: result.text };
    
  } catch (error) {
    console.error('Error sending approval email:', error);
    return { success: false, error: error.message };
  }
};

const sendChallengeConfirmationEmail = async (emailData) => {
  try {
    const result = await emailjs.send(
      'service_l5q2047', // Same service ID as singles league
      'template_rrotb7b', // Challenge confirmation template
      {
        to_email: emailData.to_email,
        to_name: emailData.to_name,
        from_name: emailData.from_name,
        challenge_type: emailData.challenge_type,
        entry_fee: emailData.entry_fee,
        race_length: emailData.race_length,
        game_type: emailData.game_type,
        location: emailData.location,
        note: emailData.note,
        challenge_id: emailData.challenge_id,
        match_date: emailData.match_date ? new Date(emailData.match_date).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }) : 'To be scheduled',
        app_url: 'https://newapp-1-ic1v.onrender.com'
      },
      'g6vqrOs_Jb6LL1VCZ' // Same user ID as singles league
    );
    
    console.log('📧 Challenge confirmation email sent successfully!');
    console.log('📧 EmailJS Response:', result);
    
    return { success: true, messageId: result.text };
    
  } catch (error) {
    console.error('Error sending challenge confirmation email:', error);
    return { success: false, error: error.message };
  }
};

export { sendApprovalEmail, sendChallengeConfirmationEmail };
