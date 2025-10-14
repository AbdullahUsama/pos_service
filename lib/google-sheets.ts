import { google } from 'googleapis';

interface SaleData {
  id: string;
  created_at: string;
  total_amount: number;
  payment_method: string;
  items: any[];
  customer_name?: string;
  discount?: number;
  tax?: number;
  notes?: string;
  cashier_email?: string; // Add cashier email
}

class GoogleSheetsService {
  private sheets: any;
  private spreadsheetId: string = '';
  private auth: any;
  private timezone: string;

  constructor() {
    try {
      this.auth = new google.auth.GoogleAuth({
        credentials: {
          type: 'service_account',
          private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n'),
          client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      this.spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '';
      
      // Set timezone with fallback options
      this.timezone = process.env.TIMEZONE || 'Asia/Karachi';
      
      console.log(`Google Sheets service initialized with timezone: ${this.timezone}`);
    } catch (error) {
      console.error('Failed to initialize Google Sheets service:', error);
      this.timezone = 'Asia/Karachi'; // Fallback timezone
    }
  }

  private formatTimestamp(dateString: string): string {
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: this.timezone
      });
    } catch (error) {
      console.error('Error formatting timestamp with timezone:', error);
      // Fallback to manual offset calculation for Pakistan timezone (UTC+5)
      const date = new Date(dateString);
      const pakistanOffset = 5 * 60; // 5 hours in minutes
      const localTime = new Date(date.getTime() + (pakistanOffset * 60 * 1000));
      return localTime.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    }
  }

  async appendSaleData(saleData: SaleData): Promise<void> {
    if (!this.spreadsheetId) {
      console.warn('Google Sheets spreadsheet ID not configured');
      return;
    }

    try {
      const itemsString = saleData.items
        .map(item => `${item.name} (${item.quantity}x ${item.price})`)
        .join(', ');

      const values = [[
        this.formatTimestamp(saleData.created_at),
        saleData.id,
        saleData.cashier_email || 'Unknown',
        saleData.total_amount,
        saleData.payment_method,
        itemsString, // Removed items count, kept items details
        saleData.discount || 0,
        saleData.tax || 0,
        saleData.notes || ''
      ]];

      // Try Sales worksheet first, fallback to Sheet1
      try {
        await this.sheets.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: 'Sales!A:I', // Updated to I for 9 columns
          valueInputOption: 'USER_ENTERED',
          resource: { values },
        });
        console.log('Sale data logged to Google Sheets (Sales worksheet):', saleData.id);
      } catch (salesError) {
        console.log('Failed to append to Sales worksheet, trying Sheet1...');
        await this.sheets.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: 'Sheet1!A:I', // Updated to I for 9 columns
          valueInputOption: 'USER_ENTERED',
          resource: { values },
        });
        console.log('Sale data logged to Google Sheets (Sheet1):', saleData.id);
      }
    } catch (error) {
      console.error('Error logging to Google Sheets:', error);
      // Don't throw error to avoid disrupting the main sales flow
    }
  }

  async initializeSheet(): Promise<void> {
    if (!this.spreadsheetId) {
      console.warn('Google Sheets spreadsheet ID not configured');
      return;
    }

    try {
      // First, try to create or ensure "Sales" worksheet exists
      await this.ensureSalesWorksheetExists();

      // Always set headers (overwrite if they exist to ensure correct format)
      const headers = [
        'Date & Time',
        'Sale ID',
        'Cashier Email',
        'Total Amount',
        'Payment Method',
        'Items Details',
        'Discount',
        'Tax',
        'Notes'
      ];

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Sales!A1:I1', // Updated to I1 for 9 columns
        valueInputOption: 'USER_ENTERED',
        resource: { values: [headers] },
      });

      console.log('Google Sheets headers initialized on Sales worksheet');
    } catch (error) {
      console.error('Error initializing Google Sheet:', error);
      // Fallback to Sheet1 if Sales worksheet creation fails
      try {
        console.log('Falling back to Sheet1...');
        
        // Always set headers on Sheet1 too
        const headers = [
          'Date & Time',
          'Sale ID',
          'Cashier Email',
          'Total Amount',
          'Payment Method',
          'Items Details',
          'Discount',
          'Tax',
          'Notes'
        ];

        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'Sheet1!A1:I1', // Updated to I1 for 9 columns
          valueInputOption: 'USER_ENTERED',
          resource: { values: [headers] },
        });

        console.log('Google Sheets headers initialized on Sheet1');
      } catch (fallbackError) {
        console.error('Error with fallback initialization:', fallbackError);
      }
    }
  }

  private async ensureSalesWorksheetExists(): Promise<void> {
    try {
      // Get all worksheets
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const worksheets = spreadsheet.data.sheets || [];
      const salesWorksheet = worksheets.find(
        (sheet: any) => sheet.properties?.title === 'Sales'
      );

      if (!salesWorksheet) {
        // Create Sales worksheet
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          resource: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: 'Sales',
                  },
                },
              },
            ],
          },
        });
        console.log('Created Sales worksheet');
      }
    } catch (error) {
      console.error('Error ensuring Sales worksheet exists:', error);
      throw error; // Re-throw to trigger fallback
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.spreadsheetId) {
      console.warn('Google Sheets spreadsheet ID not configured');
      return false;
    }

    try {
      await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      console.log('Google Sheets connection successful');
      return true;
    } catch (error) {
      console.error('Google Sheets connection failed:', error);
      return false;
    }
  }
}

// Export a singleton instance
export const googleSheetsService = new GoogleSheetsService();
export default googleSheetsService;