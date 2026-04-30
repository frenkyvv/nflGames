import { NextResponse } from 'next/server';
import { getCurrentScores } from '@/app/lib/oddsApi';

export async function GET() {
  try {
    const data = await getCurrentScores();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No fue posible cargar los scores.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
