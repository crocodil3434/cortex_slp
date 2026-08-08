import { getSettings, saveClient } from "./storage";
import type { CalendarEvent, Client } from "./types";
import { parseISO, addMonths, subMonths } from "date-fns";

const SCOPES = "https://www.googleapis.com/auth/calendar.readonly";

export function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    if ((window as any).google?.accounts?.oauth2) return resolve();

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Identity Services script yüklenemedi."));
    document.head.appendChild(script);
  });
}

export async function syncGoogleCalendar(
  onSuccess: (events: CalendarEvent[]) => void,
  onError: (error: string) => void
) {
  const settings = getSettings();
  if (!settings?.googleCalendarClientId) {
    onError("Lütfen Ayarlar sayfasından Google Client ID'nizi girin.");
    return;
  }

  try {
    await loadGoogleScript();
    
    const client = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: settings.googleCalendarClientId,
      scope: SCOPES,
      callback: async (response: any) => {
        if (response.error !== undefined) {
          onError("Yetkilendirme hatası: " + response.error);
          return;
        }

        const token = response.access_token;
        try {
          const events = await fetchEvents(token);
          onSuccess(events);
        } catch (e: any) {
          onError("Etkinlikler alınamadı: " + e.message);
        }
      },
    });

    client.requestAccessToken();
  } catch (err: any) {
    onError(err.message);
  }
}

async function fetchEvents(accessToken: string): Promise<CalendarEvent[]> {
  const timeMin = subMonths(new Date(), 1).toISOString();
  const timeMax = addMonths(new Date(), 2).toISOString();
  
  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.append("timeMin", timeMin);
  url.searchParams.append("timeMax", timeMax);
  url.searchParams.append("singleEvents", "true");
  url.searchParams.append("orderBy", "startTime");
  url.searchParams.append("maxResults", "250");

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    }
  });

  if (!res.ok) {
    throw new Error("Takvim verisi alınamadı (HTTP " + res.status + ")");
  }

  const data = await res.json();
  
  const calendarEvents: CalendarEvent[] = [];

  for (const item of data.items) {
    if (item.status === "cancelled") continue;
    
    const start = item.start?.dateTime || item.start?.date;
    const end = item.end?.dateTime || item.end?.date;
    if (!start || !end) continue;

    const title = item.summary || "İsimsiz Etkinlik";
    
    // Auto-create client if title contains name-like pattern (e.g., "Ahmet Yılmaz - Randevu")
    let clientId: string | undefined;
    
    const extractedName = title.split("-")[0].trim();
    if (extractedName && extractedName.length > 2 && extractedName.split(" ").length >= 2) {
      let clients: Client[] = [];
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("crocodil_clients");
        if (stored) clients = JSON.parse(stored);
      }
      
      const existing = clients.find(c => {
        const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
        return fullName.includes(extractedName.toLowerCase()) || extractedName.toLowerCase().includes(fullName);
      });

      if (existing) {
        clientId = existing.id;
      } else {
        const names = extractedName.split(" ");
        const lastName = names.pop() || "";
        const firstName = names.join(" ");
        
        const newClient = saveClient({
          firstName,
          lastName,
          phone: "",
          email: "",
          birthDate: "",
          gender: "belirtilmemiş",
          handedness: "sağ",
          status: "aktif",
        });
        clientId = newClient.id;
      }
    }

    calendarEvents.push({
      id: "google_" + item.id,
      title: title,
      start: start,
      end: end,
      clientId: clientId,
      type: "google", // Error 2 fixed
    });
  }

  return calendarEvents;
}
