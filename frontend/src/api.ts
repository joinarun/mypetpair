import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// EXPO_PUBLIC values are compiled into the client: never put secrets in them.
export const API_ORIGIN = (process.env.EXPO_PUBLIC_API_URL || "").replace(
  /\/$/,
  "",
);
let bearer: string | null = null;
let unauthorized: (() => void) | undefined;
export const token = () => bearer;
export const onUnauthorized = (fn: () => void) => {
  unauthorized = fn;
};
export async function setToken(value: string | null) {
  bearer = value;
  if (Platform.OS !== "web") {
    if (value) await SecureStore.setItemAsync("mypetpair.session", value);
    else await SecureStore.deleteItemAsync("mypetpair.session");
  }
}
export async function restoreToken() {
  if (Platform.OS !== "web")
    bearer = await SecureStore.getItemAsync("mypetpair.session");
  return bearer;
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T = any>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  if (Platform.OS !== "web" && !API_ORIGIN)
    throw new Error(
      "Set EXPO_PUBLIC_API_URL to your HTTPS API origin before building the native app.",
    );
  const multipart = typeof FormData !== "undefined" && body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`${API_ORIGIN}/api${path}`, {
      method,
      headers: {
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        ...(!multipart && body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body:
        body === undefined
          ? undefined
          : multipart
            ? (body as FormData)
            : JSON.stringify(body),
      credentials: "omit",
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "Could not reach MyPetPair. Check your connection and try again.",
    );
  }
  if (!response.ok) {
    let message = "Something went wrong. Please try again.";
    try {
      message = (await response.json()).message || message;
    } catch {
      /* non-JSON upstream error */
    }
    if (response.status === 401 && bearer) {
      await setToken(null);
      unauthorized?.();
    }
    if (response.status === 429)
      message += ` Please wait ${response.headers.get("Retry-After") || "a moment"} seconds before trying again.`;
    throw new ApiError(message, response.status);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
export async function photoData(
  id: string,
  signal: AbortSignal,
): Promise<string> {
  const res = await fetch(
    `${API_ORIGIN}/api/photos/${encodeURIComponent(id)}`,
    {
      headers: { Authorization: `Bearer ${bearer || ""}` },
      cache: "no-store",
      signal,
    },
  );
  if (!res.ok) throw new Error("Photo unavailable");
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
