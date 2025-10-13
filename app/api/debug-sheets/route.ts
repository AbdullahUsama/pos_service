import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

interface TestResult {
  success: boolean;
  error?: string;
  [key: string]: any;
}

interface DebugInfo {
  timestamp: string;
  environment: string;
  googleSheetsConfig: {
    hasPrivateKey: boolean;
    hasClientEmail: boolean;
    hasSpreadsheetId: boolean;
    privateKeyLength: number;
    privateKeyStart: string;
    privateKeyEnd: string;
    clientEmail: string;
    spreadsheetId: string;
    privateKeyHasBeginMarker: boolean;
    privateKeyHasEndMarker: boolean;
    privateKeyHasNewlines: boolean;
  };
  tests: {
    [key: string]: TestResult;
  };
  summary?: {
    allTestsPassed: boolean;
    passedTests: number;
    totalTests: number;
    recommendation: string;
  };
}

export async function GET(request: NextRequest) {
  const debug: DebugInfo = {
    timestamp: new Date().toISOString(),
    environment: 'production',
    googleSheetsConfig: {
      hasPrivateKey: !!process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      hasClientEmail: !!process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      hasSpreadsheetId: !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      privateKeyLength: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.length || 0,
      privateKeyStart: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.substring(0, 50) || 'NOT_SET',
      privateKeyEnd: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.slice(-50) || 'NOT_SET',
      clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL || 'NOT_SET',
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || 'NOT_SET',
      privateKeyHasBeginMarker: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.includes('-----BEGIN PRIVATE KEY-----') || false,
      privateKeyHasEndMarker: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.includes('-----END PRIVATE KEY-----') || false,
      privateKeyHasNewlines: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.includes('\\n') || false,
    },
    tests: {}
  };

  // Test 1: Basic environment check
  console.log('🔍 DEBUG: Starting Google Sheets debug check');
  console.log('📊 Environment variables status:', debug.googleSheetsConfig);

  // Test 2: Try to create auth object
  try {
    let privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
    
    if (!privateKey) {
      debug.tests.authCreation = {
        success: false,
        error: 'GOOGLE_SHEETS_PRIVATE_KEY is not set'
      };
      console.log('❌ Private key not found');
    } else {
      // Process private key
      privateKey = privateKey.replace(/\\n/g, '\n');
      
      const auth = new google.auth.GoogleAuth({
        credentials: {
          type: 'service_account',
          private_key: privateKey,
          client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      debug.tests.authCreation = {
        success: true,
        processedPrivateKeyLength: privateKey.length,
        processedPrivateKeyStart: privateKey.substring(0, 50),
        hasCorrectNewlines: privateKey.includes('\n'),
      };
      console.log('✅ Auth object created successfully');

      // Test 3: Try to create sheets client
      try {
        const sheets = google.sheets({ version: 'v4', auth });
        debug.tests.sheetsClientCreation = { success: true };
        console.log('✅ Sheets client created successfully');

        // Test 4: Try to access the spreadsheet
        if (process.env.GOOGLE_SHEETS_SPREADSHEET_ID) {
          try {
            const spreadsheet = await sheets.spreadsheets.get({
              spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
            });

            debug.tests.spreadsheetAccess = {
              success: true,
              spreadsheetTitle: spreadsheet.data.properties?.title,
              sheetCount: spreadsheet.data.sheets?.length,
              sheets: spreadsheet.data.sheets?.map(sheet => sheet.properties?.title),
            };
            console.log('✅ Spreadsheet access successful:', spreadsheet.data.properties?.title);

            // Test 5: Try to read a cell
            try {
              const response = await sheets.spreadsheets.values.get({
                spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
                range: 'Sheet1!A1',
              });

              debug.tests.cellRead = {
                success: true,
                hasValues: !!response.data.values,
                values: response.data.values,
              };
              console.log('✅ Cell read successful');

              // Test 6: Try to write a test value
              try {
                const testValue = `Debug test - ${new Date().toISOString()}`;
                await sheets.spreadsheets.values.update({
                  spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
                  range: 'Sheet1!Z1',
                  valueInputOption: 'USER_ENTERED',
                  requestBody: { values: [[testValue]] },
                });

                debug.tests.cellWrite = {
                  success: true,
                  testValue,
                  message: 'Successfully wrote test value to Z1'
                };
                console.log('✅ Cell write successful');
              } catch (writeError: any) {
                debug.tests.cellWrite = {
                  success: false,
                  error: writeError.message,
                  code: writeError.code,
                };
                console.log('❌ Cell write failed:', writeError.message);
              }
            } catch (readError: any) {
              debug.tests.cellRead = {
                success: false,
                error: readError.message,
                code: readError.code,
              };
              console.log('❌ Cell read failed:', readError.message);
            }
          } catch (accessError: any) {
            debug.tests.spreadsheetAccess = {
              success: false,
              error: accessError.message,
              code: accessError.code,
              details: accessError.response?.data,
            };
            console.log('❌ Spreadsheet access failed:', accessError.message);
          }
        } else {
          debug.tests.spreadsheetAccess = {
            success: false,
            error: 'GOOGLE_SHEETS_SPREADSHEET_ID is not set'
          };
        }
      } catch (clientError: any) {
        debug.tests.sheetsClientCreation = {
          success: false,
          error: clientError.message,
        };
        console.log('❌ Sheets client creation failed:', clientError.message);
      }
    }
  } catch (authError: any) {
    debug.tests.authCreation = {
      success: false,
      error: authError.message,
      stack: authError.stack,
    };
    console.log('❌ Auth creation failed:', authError.message);
  }

  // Final summary
  const allTestsPassed = Object.values(debug.tests).every(test => 
    test && typeof test === 'object' && test.success
  );

  debug.summary = {
    allTestsPassed,
    passedTests: Object.values(debug.tests).filter(test => 
      test && typeof test === 'object' && test.success
    ).length,
    totalTests: Object.keys(debug.tests).length,
    recommendation: allTestsPassed 
      ? 'All tests passed! Google Sheets should be working correctly.'
      : 'Some tests failed. Check the failed tests above for specific issues.',
  };

  console.log('📋 Final summary:', debug.summary);

  return NextResponse.json(debug, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    }
  });
}