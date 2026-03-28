import { NextResponse } from 'next/server';
import { getUpcomingOdds } from '@/app/lib/oddsApi';

export async function GET() {
  try {
    const data = await getUpcomingOdds();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No fue posible cargar las cuotas.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
