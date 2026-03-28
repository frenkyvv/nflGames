import { NextResponse } from 'next/server';
import { getEspnTeamProfile } from '@/app/lib/espnTeamProfile';

export async function GET(_request, { params }) {
  try {
    const data = await getEspnTeamProfile(params.abbreviation);
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'No fue posible cargar el perfil del equipo.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
