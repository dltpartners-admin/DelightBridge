import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { translateDraftToKorean } from '@/lib/draft-translation';

export async function POST(req: NextRequest) {
  try {
    const { unauthorized } = await requireSession();
    if (unauthorized) return unauthorized;

    const { draft } = await req.json();
    const translation = await translateDraftToKorean(draft);

    return NextResponse.json({ translation });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json({ error: 'Failed to translate' }, { status: 500 });
  }
}
