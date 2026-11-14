// Generated from contracts/openapi/wolly.v1.json. Do not edit.
export type Capability = { id: string; enabled: boolean };
export type CapabilitiesEnvelope = { data: { contractVersion: "v1"; modules: Array<Capability> } };
export type LivenessEnvelope = { data: { status: "live" } };
export type ErrorEnvelope = { error: { code: string; message: string } };
