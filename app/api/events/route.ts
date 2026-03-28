import { NextResponse } from 'next/server';
import { getUpcomingEvents } from '@/app/lib/oddsApi';

export async function GET() {
  try {
    const data = await getUpcomingEvents();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No fue posible cargar los eventos.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
