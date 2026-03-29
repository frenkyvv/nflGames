import { NextRequest, NextResponse } from 'next/server';
import { getUpcomingOdds } from '@/app/lib/oddsApi';

export async function GET(request: NextRequest) {
  try {
    const formatParam = request.nextUrl.searchParams.get('format');
    const oddsFormat =
      formatParam === 'american' || formatParam === 'decimal'
        ? formatParam
        : 'decimal';

    const data = await getUpcomingOdds(oddsFormat);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No fue posible cargar las cuotas.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
