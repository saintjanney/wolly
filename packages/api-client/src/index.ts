import type { CapabilitiesEnvelope } from './generated.ts';
export type { CapabilitiesEnvelope } from './generated.ts';
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) { super(message); this.status=status; this.code=code; }
}
export function createApiClient(baseUrl: string, transport: typeof fetch = fetch) {
  return {
    async capabilities(signal?: AbortSignal): Promise<CapabilitiesEnvelope> {
      const response = await transport(`${baseUrl.replace(/\/$/, '')}/capabilities`, {signal: signal ?? AbortSignal.timeout(5000), headers:{Accept:'application/json'}, cache:'no-store'});
      if (!response.ok) throw new ApiError(response.status, 'request_failed', `API request failed (${response.status})`);
      const value: unknown = await response.json();
      if (typeof value !== 'object' || value===null || !('data' in value)) throw new ApiError(502,'invalid_response','Invalid API envelope');
      const data = value.data;
      if (typeof data !== 'object' || data===null || !('contractVersion' in data) || data.contractVersion!=='v1' || !('modules' in data) || !Array.isArray(data.modules) || !data.modules.every(item => typeof item==='object' && item!==null && typeof item.id==='string' && typeof item.enabled==='boolean')) throw new ApiError(502,'invalid_response','Invalid capability contract');
      return value as CapabilitiesEnvelope;
    }
  };
}
