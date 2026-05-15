/**
 * API layer — this is part of the challenge.
 *
 * Implement the functions below to communicate with the backend.
 * You are free to choose your approach:
 *
 *  - Plain `fetch` calls (no extra dependencies needed)
 *  - A library such as axios, ky, or similar
 *  - React Query, SWR, or another data-fetching/caching library
 *
 * The backend runs at http://localhost:4000 by default.
 * Override with the NEXT_PUBLIC_API_BASE_URL environment variable if needed.
 *
 * Available endpoints:
 *
 *   GET    /api/passages            → list all passages (with calculated fees)
 *   POST   /api/passages            → create a new passage
 *   DELETE /api/passages/:id        → remove a passage
 *   GET    /api/meta/vehicle-types  → list available vehicle types
 */

import {
  ApiListResponse,
  CreatePassagePayload,
  Passage,
  VehicleTypeOption
} from "@/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

async function handleFormatErrors<D>(res: Response): Promise<D> {
  if (!res.ok && res.status !== 200) {
    const body = await res.json();
    const errors = body?.errors;

    // Zod validation error shape: { formErrors: string[], fieldErrors: Record<string, string[]> }
    if (errors?.fieldErrors || errors?.formErrors) {
      const fieldMessages = Object.entries(errors.fieldErrors ?? {})
        .flatMap(([field, msgs]) => (msgs as string[]).map((m) => `${field}: ${m}`));
      const allMessages = [...(errors.formErrors ?? []), ...fieldMessages];
      throw new Error(allMessages.join("\n") || "Validation error");
    }

    throw new Error(body?.error ?? body?.message ?? `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<D>;
}


export const apiGET = async <D>(
  path: string,
  headers: Record<string, string> = {}
) => {
  const res = await fetch(`${API_BASE_URL}/${path}`, {
    method: 'GET',
    headers: httpHeaders(headers),
  });
  return handleFormatErrors<D>(res);
}

const httpHeaders = (
  headers?: Record<string, string>
): Record<string, string> => {
  const extra_headers = {
    'Content-Type': 'application/json',
    ...headers,
  }

  return extra_headers
}

export const apiPOST = async <T, D>(path: string, data: T, headers?: Record<string, string>) => {
  const res = await fetch(`${API_BASE_URL}/${path}`, {
    method: 'POST',
    headers: httpHeaders(headers),
    body: JSON.stringify(data),
  });
  return handleFormatErrors<D>(res);
}

export async function fetchPassages(): Promise<Passage[]> {
  const data = await apiGET<ApiListResponse<Passage[]>>('api/passages/getPassages');
  return data?.data ?? [];
}

export async function fetchVehicleTypes(): Promise<VehicleTypeOption[]> {
  const data = await apiGET<ApiListResponse<VehicleTypeOption[]>>('api/meta/vehicle-types');
  return data?.data ?? [];
}

export async function createPassage(
  payload: CreatePassagePayload
): Promise<void> {
  await apiPOST<CreatePassagePayload, Passage>('api/passages/postPassages', payload);
}

export async function deletePassage(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/passages/deletePassages/${id}`, {
    method: 'DELETE',
    headers: httpHeaders(),
  });
  if (!res.ok && res.status !== 204) {
    const errorText = await res.text();
    throw new Error(`API error: ${res.status} ${res.statusText} - ${errorText}`);
  }
}
