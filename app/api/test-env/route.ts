import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    env_check: {
      has_private_key: !!process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      has_client_email: !!process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      has_spreadsheet_id: !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      private_key_length: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.length || 0,
      client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL || 'NOT_SET',
      spreadsheet_id: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || 'NOT_SET',
      private_key_start: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.substring(0, 30) || 'NOT_SET',
      private_key_has_begin: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.includes('-----BEGIN') || false,
      private_key_has_newlines: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.includes('\\n') || false,
      all_google_env_vars: Object.keys(process.env).filter(key => key.includes('GOOGLE')),
    }
  });
}