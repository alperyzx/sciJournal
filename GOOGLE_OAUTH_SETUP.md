# Google OAuth Setup for Admin Console

## Prerequisites

1. A Google Cloud Console project
2. Google OAuth 2.0 credentials

## Setup Instructions

### 1. Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API (if not already enabled)

### 2. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Configure the OAuth consent screen if prompted
4. Select "Web application" as the application type
5. Add authorized redirect URIs:
   - For development: `http://localhost:9002/api/auth/callback/google`
   - For production: `https://yourdomain.com/api/auth/callback/google`
6. Copy the Client ID and Client Secret

### 3. Configure Environment Variables

Update your `.env` file with the following variables:

```env
# Admin Configuration
ADMIN=your_admin_email@gmail.com

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
NEXTAUTH_URL=http://localhost:9002
NEXTAUTH_SECRET=your_random_secret_here
```

### 4. Generate NEXTAUTH_SECRET

You can generate a random secret using:

```bash
openssl rand -base64 32
```

Or use an online generator for a secure random string.

### 5. Access the Admin Console

1. Start your development server: `npm run dev`
2. Navigate to `http://localhost:9002/admin`
3. Click "Sign in with Google"
4. Sign in with the Google account that matches your `ADMIN` email
5. You should now have access to the admin console

## Security Notes

- Only the email address specified in the `ADMIN` environment variable can access the admin console
- Make sure to keep your Google OAuth credentials secure
- Use HTTPS in production
- Consider implementing additional security measures like rate limiting

## Troubleshooting

- **"Access denied" error**: Make sure the email in `ADMIN` matches exactly with the Google account you're signing in with
- **"Invalid redirect URI" error**: Ensure the redirect URI in Google Cloud Console matches your `NEXTAUTH_URL`
- **Session issues**: Clear your browser cookies and try again
