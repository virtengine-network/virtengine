import { NextResponse } from 'next/server';
import { getConsentSettings } from '../data';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ address: 'virtengine1demo' }];
}

export async function GET(_req: Request, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  return NextResponse.json(getConsentSettings(address));
}
