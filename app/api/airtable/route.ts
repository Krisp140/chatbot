import { NextRequest, NextResponse } from 'next/server';

const AIRTABLE_BASE_ID = 'app3158WWpanZ6Y91';
const AIRTABLE_TABLE_NAME = 'Notes';
const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;

export async function POST(req: NextRequest) {
  try {
    const { name, notes } = await req.json();

    if (!name || !notes) {
      return NextResponse.json(
        { error: "Both name and notes are required" },
        { status: 400 }
      );
    }

    // Debug token (logging just the first few characters for security)
    const token = process.env.AIRTABLE_TOKEN || '';
    console.log('Token prefix:', token.substring(0, 5) + '...');
    console.log('API URL:', AIRTABLE_API_URL);

    const response = await fetch(AIRTABLE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        records: [
          {
            fields: {
              Name: name,
              Notes: notes,
            },
          },
        ],
      }),
    });

    // Log the full response for debugging
    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('Response status:', response.status);
    } catch (e) {
      console.error('Failed to parse response:', responseText);
      return NextResponse.json(
        { error: "Invalid response from Airtable" },
        { status: 500 }
      );
    }

    if (!response.ok) {
      console.error('Airtable error:', data);
      return NextResponse.json(
        { error: data.error?.message || "Failed to create note in Airtable" },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: "Failed to process your request" },
      { status: 500 }
    );
  }
}