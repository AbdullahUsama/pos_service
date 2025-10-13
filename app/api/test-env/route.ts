import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  // Test the fixed private key parsing
  let connection_test = false;
  let connection_error = null;
  
  try {
    if (process.env.GOOGLE_SHEETS_PRIVATE_KEY && process.env.GOOGLE_SHEETS_CLIENT_EMAIL && process.env.GOOGLE_SHEETS_SPREADSHEET_ID) {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          type: 'service_account',
          private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n'),
          client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      
      const sheets = google.sheets({ version: 'v4', auth });
      
      // Try to access the spreadsheet
      await sheets.spreadsheets.get({
        spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      });
      
      connection_test = true;
    }
  } catch (error: any) {
    connection_error = error.message;
  }

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
      private_key_has_carriage_return: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.includes('\\r\\n') || false,
      all_google_env_vars: Object.keys(process.env).filter(key => key.includes('GOOGLE')),
      connection_test_passed: connection_test,
      connection_error: connection_error
    }
  });
}