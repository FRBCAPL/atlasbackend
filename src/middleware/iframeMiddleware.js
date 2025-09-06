// Middleware to allow iframe embedding for public ladder views
export const allowIframeEmbedding = (req, res, next) => {
  // Allow iframe embedding by removing X-Frame-Options or setting it to SAMEORIGIN
  res.removeHeader('X-Frame-Options');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  
  // Set permissive Content Security Policy for iframe embedding
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self' *;");
  
  // Allow cross-origin requests for iframe embedding
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
};

// Middleware specifically for public ladder embed routes
export const publicLadderEmbedHeaders = (req, res, next) => {
  // Allow iframe embedding
  res.removeHeader('X-Frame-Options');
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  
  // Set permissive CSP for embedding
  res.setHeader('Content-Security-Policy', "frame-ancestors *;");
  
  // Allow all origins for public data
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Cache headers for better performance
  res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes cache
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
};
