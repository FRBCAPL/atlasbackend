# Deployment Guide for Render

## Prerequisites
- Node.js project (not Python)
- All dependencies listed in `package.json`
- Environment variables configured

## Deployment Steps

1. **Remove Python files**: Delete `requirements.txt` if it exists
2. **Ensure package.json has all dependencies**:
   - bcryptjs
   - axios
   - date-fns
   - emailjs-com
   - All other required packages

3. **Environment Variables to set in Render**:
   - `MONGODB_URI` - Your MongoDB connection string
   - `STREAM_API_KEY` - Stream Chat API key
   - `STREAM_API_SECRET` - Stream Chat API secret
   - `NODE_ENV` - Set to "production"

4. **Build Command**: `npm install`
5. **Start Command**: `npm start`

## Troubleshooting

If you see Python-related errors:
- Make sure there's no `requirements.txt` file
- Ensure the project is configured as a Node.js project in Render
- Check that `package.json` exists and is valid

If you see "Cannot find package" errors:
- Make sure all dependencies are listed in `package.json`
- Run `npm install` locally to test
- Check that the package names are correct

## Local Testing

Before deploying:
1. Run `npm install`
2. Set up your `.env` file
3. Run `npm start`
4. Test that the server starts without errors
