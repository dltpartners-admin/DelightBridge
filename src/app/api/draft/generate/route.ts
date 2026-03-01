import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { generateDraftFromContext } from '@/lib/draft-generation';

export async function POST(req: NextRequest) {
  try {
    const { unauthorized } = await requireSession();
    if (unauthorized) return unauthorized;

    const { messages, document, categories, signature } = await req.json();
    const result = await generateDraftFromContext({
      messages,
      document,
      categories,
      signature,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Draft generation error:', error instanceof Error ? error.message : error);
    console.error('Full error:', error);
    return NextResponse.json(
      { error: 'Failed to generate draft', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
