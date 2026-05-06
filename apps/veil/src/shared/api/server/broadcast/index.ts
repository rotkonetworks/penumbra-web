import { NextRequest, NextResponse } from 'next/server';

export interface BroadcastApiRequest {
  tx: string;
}

export interface BroadcastApiSuccess {
  hash: string;
  code: number;
  log: string;
  codespace: string;
}

export interface BroadcastApiError {
  error: string;
}

export type BroadcastApiResponse = BroadcastApiSuccess | BroadcastApiError;

interface JsonRpcResult {
  jsonrpc: string;
  id: number;
  result?: { hash?: string; code?: number; log?: string; codespace?: string; data?: string };
  error?: { code: number; message: string; data?: unknown };
}

export async function POST(req: NextRequest): Promise<NextResponse<BroadcastApiResponse>> {
  const grpcEndpoint =
    process.env['PENUMBRA_GRPC_ENDPOINT_INTERNAL'] ?? process.env['PENUMBRA_GRPC_ENDPOINT'];
  if (!grpcEndpoint) {
    return NextResponse.json({ error: 'PENUMBRA_GRPC_ENDPOINT is not set' }, { status: 500 });
  }

  let body: BroadcastApiRequest;
  try {
    body = (await req.json()) as BroadcastApiRequest;
  } catch {
    return NextResponse.json({ error: 'invalid json body' }, { status: 400 });
  }

  if (!body.tx || typeof body.tx !== 'string') {
    return NextResponse.json({ error: 'tx (base64) is required' }, { status: 400 });
  }

  const url = new URL('/broadcast_tx_sync', grpcEndpoint);
  let upstream: Response;
  try {
    upstream = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'broadcast_tx_sync',
        params: { tx: body.tx },
      }),
    });
  } catch (e) {
    return NextResponse.json({ error: `upstream fetch failed: ${String(e)}` }, { status: 502 });
  }

  if (!upstream.ok) {
    return NextResponse.json(
      { error: `upstream ${upstream.status}: ${await upstream.text()}` },
      { status: 502 },
    );
  }

  const json = (await upstream.json()) as JsonRpcResult;
  if (json.error) {
    return NextResponse.json(
      { error: `upstream rpc error: ${json.error.message}` },
      { status: 502 },
    );
  }
  const result = json.result;
  if (!result || typeof result.hash !== 'string') {
    return NextResponse.json({ error: 'upstream returned no hash' }, { status: 502 });
  }

  return NextResponse.json({
    hash: result.hash,
    code: result.code ?? 0,
    log: result.log ?? '',
    codespace: result.codespace ?? '',
  });
}
