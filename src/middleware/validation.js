
// Payment validation
export const validatePaymentData = (data) => {
  const errors = [];

  // Required fields
  if (!data.playerId) errors.push('Player ID is required');
  if (!data.playerName) errors.push('Player name is required');
  if (!data.division) errors.push('Division is required');
  if (!data.session) errors.push('Session is required');
  if (!data.amount || data.amount <= 0) errors.push('Valid amount is required');
  if (!data.paymentType) errors.push('Payment type is required');
  if (!data.paymentMethod) errors.push('Payment method is required');

  // Payment type validation
  const validPaymentTypes = [
    'registration_fee',
    'weekly_dues',
    'participation_fee',
    'pre_payment',
    'late_payment_fee',
    'no_show_fee',
    'late_cancellation_fee',
    'reschedule_fee',
    'penalty_fee',
    'refund'
  ];

  if (!validPaymentTypes.includes(data.paymentType)) {
    errors.push('Invalid payment type');
  }

  // Payment method validation
  const validPaymentMethods = [
    'cash',
    'venmo',
    'cashapp',
    'credit_card',
    'debit_card',
    'check',
    'online'
  ];

  if (!validPaymentMethods.includes(data.paymentMethod)) {
    errors.push('Invalid payment method');
  }

  // Week number validation for weekly dues
  if (data.paymentType === 'weekly_dues') {
    if (!data.weekNumber || data.weekNumber < 1 || data.weekNumber > 10) {
      errors.push('Week number must be between 1 and 10 for weekly dues');
    }
  }

  // Amount validation based on payment type
  if (data.paymentType === 'registration_fee' && data.amount !== 30) {
    errors.push('Registration fee must be $30');
  }

  if (data.paymentType === 'weekly_dues' && data.amount !== 10) {
    errors.push('Weekly dues must be $10');
  }

  if (data.paymentType === 'participation_fee' && data.amount !== 100) {
    errors.push('Participation fee must be $100');
  }

  if (data.paymentType === 'late_payment_fee' && data.amount !== 5) {
    errors.push('Late payment fee must be $5');
  }

  if (data.paymentType === 'no_show_fee' && data.amount !== 10) {
    errors.push('No-show fee must be $10');
  }

  if (data.paymentType === 'late_cancellation_fee' && data.amount !== 10) {
    errors.push('Late cancellation fee must be $10');
  }

  if (data.paymentType === 'reschedule_fee' && data.amount !== 10) {
    errors.push('Reschedule fee must be $10');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

