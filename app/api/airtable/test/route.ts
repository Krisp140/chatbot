import { NextRequest, NextResponse } from 'next/server';

const AIRTABLE_BASE_ID = 'app3158WWpanZ6Y91';
const AIRTABLE_TABLE_NAME = 'Notes';
const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;

export async function GET(req: NextRequest) {
  try {
    const token = process.env.AIRTABLE_TOKEN || '';
    
    // Log token info (safely)
    console.log('Token starts with:', token.substring(0, 5));
    console.log('Token length:', token.length);
    
    // Test Airtable connection by listing records
    const response = await fetch(`${AIRTABLE_API_URL}?maxRecords=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const responseText = await response.text();
    
    try {
      const data = JSON.parse(responseText);
      
      if (!response.ok) {
        console.error('Airtable error:', data);
        return NextResponse.json({
          error: data.error || "Failed to connect to Airtable",
          status: response.status,
          statusText: response.statusText,
          tokenPrefix: token.substring(0, 5) + '...',
          tokenLength: token.length,
          baseId: AIRTABLE_BASE_ID,
          tableName: AIRTABLE_TABLE_NAME
        });
      }
      
      return NextResponse.json({
        success: true,
        data: data,
        baseId: AIRTABLE_BASE_ID,
        tableName: AIRTABLE_TABLE_NAME,
        tokenPrefix: token.substring(0, 5) + '...',
        tokenLength: token.length
      });
    } catch (e) {
      return NextResponse.json({
        error: "Failed to parse Airtable response",
        rawResponse: responseText,
        tokenPrefix: token.substring(0, 5) + '...',
        tokenLength: token.length,
        baseId: AIRTABLE_BASE_ID,
        tableName: AIRTABLE_TABLE_NAME
      });
    }
  } catch (error) {
    console.error('Error testing Airtable connection:', error);
    return NextResponse.json({
      error: "Failed to test Airtable connection",
      message: error instanceof Error ? error.message : String(error)
    });
  }
}