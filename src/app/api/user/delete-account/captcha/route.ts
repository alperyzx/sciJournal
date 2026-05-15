import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import crypto from 'crypto';

function signPayload(payload: object) {
  const secret = process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_URL || '';
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadJson, 'utf8').toString('base64');
  const sig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // generate simple math captcha: two small integers and plus/minus
  const a = Math.floor(Math.random() * 9) + 1; // 1-9
  const b = Math.floor(Math.random() * 9) + 1;
  const op = Math.random() > 0.5 ? '+' : '-';
  const answer = op === '+' ? a + b : a - b;
  const exp = Date.now() + 5 * 60 * 1000; // 5 minutes

  const token = signPayload({ answer, exp });
  const question = `${a} ${op} ${b} = ?`;
  return NextResponse.json({ question, token });
}
