import { NextRequest, NextResponse } from 'next/server';
import googleSheetsService from '@/lib/google-sheets';

export async function POST(request: NextRequest) {
  try {
    // Initialize the Google Sheets headers
    await googleSheetsService.initializeSheet();
    
    // Test the connection
    const isConnected = await googleSheetsService.testConnection();
    
    return NextResponse.json({
      success: true,
      connected: isConnected,
      message: isConnected 
        ? 'Google Sheets initialized successfully'
        : 'Google Sheets initialized but connection test failed'
    });
  } catch (error) {
    console.error('Error initializing Google Sheets:', error);
    return NextResponse.json(
      { 
        success: false, 
        connected: false,
        error: 'Failed to initialize Google Sheets' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Test the connection only
    const isConnected = await googleSheetsService.testConnection();
    
    return NextResponse.json({
      connected: isConnected,
      message: isConnected 
        ? 'Google Sheets connection is working'
        : 'Google Sheets connection failed'
    });
  } catch (error) {
    console.error('Error testing Google Sheets connection:', error);
    return NextResponse.json(
      { 
        connected: false,
        error: 'Failed to test Google Sheets connection' 
      },
      { status: 500 }
    );
  }
}