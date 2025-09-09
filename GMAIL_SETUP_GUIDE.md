# Gmail Setup Guide for Front Range Pool Hub

## 🎯 **Quick Setup Steps**

### 1. **Enable 2-Factor Authentication**
- Go to https://myaccount.google.com/
- Click "Security" → "2-Step Verification"
- Follow the setup process

### 2. **Create App Password**
- Go to https://myaccount.google.com/security
- Click "App passwords" (search if not visible)
- Select "Mail" → "Other (custom name)"
- Enter "Front Range Pool Hub"
- **Copy the 16-character password** (save it somewhere safe!)

### 3. **Create .env File**
Create a file called `.env` in the `atlasbackend` folder with:

```bash
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password
MONGODB_URI=your-mongodb-connection-string
STREAM_API_KEY=your-stream-api-key
STREAM_API_SECRET=your-stream-api-secret
NODE_ENV=development
PORT=8080
```

### 4. **Test the Setup**
Run this command to test your Gmail configuration:

```bash
cd atlasbackend
node test-gmail-setup.js
```

## 🔧 **Troubleshooting**

### **"Invalid login" error:**
- Make sure 2FA is enabled
- Verify the app password is exactly 16 characters
- Check that GMAIL_USER is your full email address

### **"Missing credentials" error:**
- Ensure the `.env` file is in the `atlasbackend` directory
- Check that variable names match exactly (GMAIL_USER, GMAIL_APP_PASSWORD)
- Restart the server after creating the .env file

### **"App password not found" error:**
- Go back to Google Account settings
- Make sure you copied the app password correctly
- Try creating a new app password

## 📧 **What This Enables**

Once Gmail is set up, your app will be able to send:
- ✅ Challenge notification emails
- ✅ Challenge acceptance confirmations  
- ✅ **Counter-proposal emails** (new feature!)
- ✅ Match scheduling notifications

## 🚀 **Next Steps**

After Gmail is working:
1. Test the counter-proposal system
2. Deploy to production with the same environment variables
3. Set up Gmail credentials in your hosting platform (Render)

## 📞 **Need Help?**

If you're still having issues:
1. Check the console output from `test-gmail-setup.js`
2. Verify your Gmail account has 2FA enabled
3. Make sure the app password was copied correctly
4. Restart your backend server after creating the .env file
