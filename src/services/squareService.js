import { Client, Environment } from 'square';

// Initialize Square client
const client = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: process.env.NODE_ENV === 'production' ? Environment.Production : Environment.Sandbox,
});

/**
 * Create a payment with Square
 * @param {Object} paymentData - Payment information
 * @param {number} paymentData.amount - Amount in cents
 * @param {string} paymentData.sourceId - Payment source ID (card token, Apple Pay token, etc.)
 * @param {string} paymentData.idempotencyKey - Unique key to prevent duplicate payments
 * @param {string} paymentData.customerId - Square customer ID (optional)
 * @param {string} paymentData.note - Payment note
 * @returns {Promise<Object>} Payment result
 */
export const createSquarePayment = async (paymentData) => {
  try {
    const {
      amount,
      sourceId,
      idempotencyKey,
      customerId,
      note,
      locationId = process.env.SQUARE_LOCATION_ID
    } = paymentData;

    const requestBody = {
      sourceId: sourceId,
      idempotencyKey: idempotencyKey,
      amountMoney: {
        amount: amount,
        currency: 'USD'
      },
      note: note || 'Ladder Membership Payment'
    };

    // Add customer ID if provided
    if (customerId) {
      requestBody.customerId = customerId;
    }

    const response = await client.paymentsApi.createPayment(requestBody);
    
    return {
      success: true,
      payment: response.result.payment,
      transactionId: response.result.payment.id
    };

  } catch (error) {
    console.error('Square payment error:', error);
    return {
      success: false,
      error: error.message,
      details: error.result?.errors || []
    };
  }
};

/**
 * Create a customer in Square
 * @param {Object} customerData - Customer information
 * @param {string} customerData.email - Customer email
 * @param {string} customerData.firstName - Customer first name
 * @param {string} customerData.lastName - Customer last name
 * @param {string} customerData.phone - Customer phone (optional)
 * @returns {Promise<Object>} Customer creation result
 */
export const createSquareCustomer = async (customerData) => {
  try {
    const { email, firstName, lastName, phone } = customerData;

    const requestBody = {
      idempotencyKey: `customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      givenName: firstName,
      familyName: lastName,
      emailAddress: email
    };

    if (phone) {
      requestBody.phoneNumber = phone;
    }

    const response = await client.customersApi.createCustomer(requestBody);
    
    return {
      success: true,
      customer: response.result.customer,
      customerId: response.result.customer.id
    };

  } catch (error) {
    console.error('Square customer creation error:', error);
    return {
      success: false,
      error: error.message,
      details: error.result?.errors || []
    };
  }
};

/**
 * Get customer by email
 * @param {string} email - Customer email
 * @returns {Promise<Object>} Customer search result
 */
export const getSquareCustomerByEmail = async (email) => {
  try {
    const response = await client.customersApi.searchCustomers({
      filter: {
        emailAddress: {
          exact: email
        }
      }
    });

    if (response.result.customers && response.result.customers.length > 0) {
      return {
        success: true,
        customer: response.result.customers[0],
        customerId: response.result.customers[0].id
      };
    }

    return {
      success: false,
      error: 'Customer not found'
    };

  } catch (error) {
    console.error('Square customer search error:', error);
    return {
      success: false,
      error: error.message,
      details: error.result?.errors || []
    };
  }
};

/**
 * Create a payment link for online payments
 * @param {Object} linkData - Payment link data
 * @param {number} linkData.amount - Amount in cents
 * @param {string} linkData.description - Payment description
 * @param {string} linkData.redirectUrl - Redirect URL after payment
 * @returns {Promise<Object>} Payment link result
 */
export const createSquarePaymentLink = async (linkData) => {
  try {
    const { amount, description, redirectUrl } = linkData;

    const requestBody = {
      idempotencyKey: `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      quickPay: {
        name: description,
        priceMoney: {
          amount: amount,
          currency: 'USD'
        }
      },
      redirectUrl: redirectUrl || `${process.env.FRONTEND_URL}/payment-success`
    };

    const response = await client.checkoutApi.createPaymentLink(requestBody);
    
    return {
      success: true,
      paymentLink: response.result.paymentLink,
      url: response.result.paymentLink.url
    };

  } catch (error) {
    console.error('Square payment link error:', error);
    return {
      success: false,
      error: error.message,
      details: error.result?.errors || []
    };
  }
};

/**
 * Get payment by ID
 * @param {string} paymentId - Square payment ID
 * @returns {Promise<Object>} Payment details
 */
export const getSquarePayment = async (paymentId) => {
  try {
    const response = await client.paymentsApi.getPayment(paymentId);
    
    return {
      success: true,
      payment: response.result.payment
    };

  } catch (error) {
    console.error('Square payment retrieval error:', error);
    return {
      success: false,
      error: error.message,
      details: error.result?.errors || []
    };
  }
};

/**
 * List payments for a location
 * @param {Object} options - List options
 * @param {string} options.beginTime - Start time for payment search
 * @param {string} options.endTime - End time for payment search
 * @param {string} options.customerId - Filter by customer ID
 * @returns {Promise<Object>} Payment list result
 */
export const listSquarePayments = async (options = {}) => {
  try {
    const { beginTime, endTime, customerId } = options;
    
    const requestBody = {
      locationId: process.env.SQUARE_LOCATION_ID
    };

    if (beginTime) requestBody.beginTime = beginTime;
    if (endTime) requestBody.endTime = endTime;
    if (customerId) requestBody.customerId = customerId;

    const response = await client.paymentsApi.listPayments(requestBody);
    
    return {
      success: true,
      payments: response.result.payments || []
    };

  } catch (error) {
    console.error('Square payment list error:', error);
    return {
      success: false,
      error: error.message,
      details: error.result?.errors || []
    };
  }
};
