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
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API error: ${res.status} ${res.statusText} - ${errorText}`);
  } else {
    return res.json() as Promise<D>;
  }
}

function setupErrorDialog(title: string, message: string, path: string) {
  console.error(`Error in API call to ${path}: ${message}`);
}


export const apiGET = async <D>(
  path: string,
  headers: Record<string, string> = {}
) => {
  try {
    const res = await fetch(`${API_BASE_URL}/${path}`, {
      method: 'GET',
      headers: httpHeaders(headers),
    });

    return handleFormatErrors<D>(res)
  } catch (error: unknown) {

    setupErrorDialog(
      '',
      error instanceof Error ? error.message : String(error),
      path
    );
  }
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
  try {
    const res = await fetch(`${API_BASE_URL}/${path}`, {
      method: 'POST',
      headers: httpHeaders(headers),
      body: JSON.stringify(data),
    });

    return await handleFormatErrors<D>(res)
  } catch (error: unknown) {

    setupErrorDialog(
      '',
      error instanceof Error ? error.message : String(error),
      path
    );
  }
}

export async function fetchPassages(): Promise<Passage[]> {
  try {
    const data = await apiGET<ApiListResponse<Passage[]>>('api/passages/getPassages');
    return data?.data ?? [];
  } catch (error: unknown) {
    setupErrorDialog(
      '',
      error instanceof Error ? error.message : String(error),
      'api/passages'
    );
    return [];
  }
}

export async function fetchVehicleTypes(): Promise<VehicleTypeOption[]> {
  try {
    const data = await apiGET<ApiListResponse<VehicleTypeOption[]>>('api/meta/vehicle-types');
    return data?.data ?? [];
  } catch (error: unknown) {
    setupErrorDialog(
      '',
      error instanceof Error ? error.message : String(error),
      'api/meta/vehicle-types'
    );
    return [];
  }
}

export async function createPassage(
  payload: CreatePassagePayload
): Promise<void> {
  try {
    await apiPOST<CreatePassagePayload, Passage>('api/passages/postPassages', payload);
  } catch (error: unknown) {
    setupErrorDialog(
      '',
      error instanceof Error ? error.message : String(error),
      'api/passages'
    );
  }
}

export async function deletePassage(id: string): Promise<void> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/passages/deletePassages/${id}`, {
      method: 'DELETE',
      headers: httpHeaders(),
    });
    if (!res.ok && res.status !== 204) {
      const errorText = await res.text();
      throw new Error(`API error: ${res.status} ${res.statusText} - ${errorText}`);
    }
  } catch (error: unknown) {
    setupErrorDialog(
      '',
      error instanceof Error ? error.message : String(error),
      `api/passages/deletePassages/${id}`
    );
  }
}
