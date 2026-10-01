"use client";

// The host token proves to the server that this browser created the room. It lives only in this browser.
const hostKey = (roomId: string) => `waldo_host_${roomId.toLowerCase()}`;

export function getHostToken(roomId: string): string | null {
  try {
    return localStorage.getItem(hostKey(roomId));
  } catch {
    return null;
  }
}

export function saveHostToken(roomId: string, token: string) {
  try {
    localStorage.setItem(hostKey(roomId), token);
  } catch {
    // Private mode etc.: host controls will only work in this tab session
  }
}
