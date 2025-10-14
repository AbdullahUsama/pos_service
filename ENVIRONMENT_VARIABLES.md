# Environment Variables

This document lists all the environment variables required for the POS application.

## Required Environment Variables

### Supabase Configuration
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Google Sheets Integration (Optional)
```env
GOOGLE_SHEETS_PRIVATE_KEY=your_google_service_account_private_key
GOOGLE_SHEETS_CLIENT_EMAIL=your_google_service_account_email
GOOGLE_SHEETS_SPREADSHEET_ID=your_google_sheets_spreadsheet_id
```

### Timezone Configuration
```env
# Set your preferred timezone for Google Sheets logging
# Default: Asia/Karachi (UTC+5)
# Other examples:
# - America/New_York (UTC-5/-4)
# - Europe/London (UTC+0/+1)
# - Asia/Dubai (UTC+4)
# - America/Los_Angeles (UTC-8/-7)
TIMEZONE=Asia/Karachi
```

## Timezone Fix for Google Sheets

The `TIMEZONE` environment variable ensures that timestamps in Google Sheets are displayed in your local timezone, regardless of where your application is deployed.

### Common Timezones:
- **Pakistan**: `Asia/Karachi` (UTC+5)
- **UAE**: `Asia/Dubai` (UTC+4)
- **India**: `Asia/Kolkata` (UTC+5:30)
- **USA East**: `America/New_York` (UTC-5/-4)
- **USA West**: `America/Los_Angeles` (UTC-8/-7)
- **UK**: `Europe/London` (UTC+0/+1)
- **UTC**: `UTC` (UTC+0)

### How to Set:

1. **Local Development**: Add to your `.env.local` file
2. **Vercel Deployment**: Add in Vercel Dashboard > Project Settings > Environment Variables
3. **Other Platforms**: Add to your platform's environment variable settings

## Setup Instructions

1. Copy the environment variables to your `.env.local` file for local development
2. For deployed applications, add these variables to your hosting platform's environment settings
3. Restart your application after adding the TIMEZONE variable

## Troubleshooting

If timestamps in Google Sheets are still incorrect:
1. Verify the `TIMEZONE` environment variable is set correctly
2. Check that your timezone string is valid (use IANA timezone names)
3. Restart your deployed application after adding the variable
4. Check the application logs for any timezone-related errors