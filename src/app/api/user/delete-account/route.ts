import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { deleteAuthUser, deleteAuthUserById } from '@/lib/repositories';
import crypto from 'crypto';

function verifyToken(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const payloadB64 = parts[0];
    const sig = parts[1];
    const secret = process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_URL || '';
    const h = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
    if (h !== sig) return null;
    const payloadJson = Buffer.from(payloadB64, 'base64').toString('utf8');
    const payload = JSON.parse(payloadJson);
    if (!payload || typeof payload.answer === 'undefined' || typeof payload.exp === 'undefined') return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch (e) {
    // ignore
  }

  const token = body?.captchaToken;
  const answer = body?.answer;
  if (!token || typeof answer === 'undefined') {
    return NextResponse.json({ message: 'Missing captcha' }, { status: 400 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ message: 'Invalid or expired captcha token' }, { status: 400 });
  }

  const expected = String(payload.answer).trim();
  const provided = String(answer).trim();
  if (expected !== provided) {
    return NextResponse.json({ message: 'Incorrect answer' }, { status: 400 });
  }

  try {
    const removed = session.user.id
      ? await deleteAuthUserById(session.user.id, session.user.email)
      : await deleteAuthUser(session.user.email);
    if (!removed) return NextResponse.json({ message: 'Failed to delete account' }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
