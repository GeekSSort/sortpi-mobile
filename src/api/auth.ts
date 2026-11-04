import { api } from './session';
import type { paths } from './schema';

type Ok<P extends keyof paths, M extends keyof paths[P]> = paths[P][M] extends { responses: { 200: { content: { 'application/json': infer R } } } } ? R : never;

/** `GET /auth/me`: the signed-in user and their permission codes. Types come from openapi.yaml (`npm run gen:api`). */
export type MeResponse = Ok<'/api/v1/auth/me', 'get'>;
export type MeData = MeResponse extends { data: infer D } ? D : never;

export const getMe = () => api.get<MeData>('/auth/me');
