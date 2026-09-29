import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const CALLBACK_DATA_DIR = path.join(process.cwd(), 'callback_data');

async function saveCallbackPayload(callbackName: string, payload: any) {
  try {
    await fs.mkdir(CALLBACK_DATA_DIR, { recursive: true });

    const enrichedPayload = {
      callback_name: callbackName,
      received_at_utc: new Date().toISOString(),
      payload,
    };

    const latestFile = path.join(CALLBACK_DATA_DIR, `${callbackName}_latest.json`);
    await fs.writeFile(latestFile, JSON.stringify(enrichedPayload, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving callback payload', error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const pathStr = slug.join('/');

  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    payload = { raw_body: await request.text() };
  }

  // Determine callback name based on path
  let callbackName = pathStr.replace(/\//g, '_');

  await saveCallbackPayload(callbackName, payload);
  console.info(`Received ${callbackName} callback:`, payload);

  return NextResponse.json({
    ResultCode: 0,
    ResultDesc: "Accepted"
  });
}
