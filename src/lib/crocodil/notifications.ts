import { getClients, getGoals, getSessions, getCalendarEvents } from "./storage";
import { parseISO, differenceInDays, isPast, isFuture, addDays, isToday, isTomorrow, startOfDay } from "date-fns";

export interface AppNotification {
  id: string;
  type: "warning" | "info" | "success" | "error";
  title: string;
  message: string;
  link?: string;
  date: Date;
}

export async function getNotifications(): Promise<AppNotification[]> {
  const notifications: AppNotification[] = [];
  
  try {
    const [clients, goals, events, sessions] = await Promise.all([
      getClients(),
      getGoals(),
      getCalendarEvents(),
      getSessions()
    ]);

    const activeClients = clients.filter(c => c.status === "aktif");

    // 1. Deadline geçmiş hedefler
    goals.filter(g => g.status === "aktif" && g.deadline).forEach(goal => {
      const deadline = parseISO(goal.deadline!);
      if (isPast(deadline)) {
        const client = clients.find(c => c.id === goal.clientId);
        notifications.push({
          id: `goal-overdue-${goal.id}`,
          type: "error",
          title: "Hedef Süresi Doldu",
          message: `${client?.firstName || "Danışan"} için "${goal.description}" hedefinin tarihi geçti.`,
          link: `/crocodil/danisman/${goal.clientId}`,
          date: deadline
        });
      }
    });

    // 2. Tamamlanan hedefler
    goals.filter(g => g.status === "tamamlandı").forEach(goal => {
      // Sadece yeni tamamlananları göster
      const completedAt = parseISO(goal.createdAt); 
      if (differenceInDays(new Date(), completedAt) <= 14) { // Demo amaçlı 14 gün
        const client = clients.find(c => c.id === goal.clientId);
        notifications.push({
          id: `goal-completed-${goal.id}`,
          type: "success",
          title: "Hedef Tamamlandı",
          message: `${client?.firstName || "Danışan"} için "${goal.description}" hedefine ulaşıldı!`,
          link: `/crocodil/danisman/${goal.clientId}`,
          date: completedAt
        });
      }
    });

    // 3. Uzun süredir görülmeyen aktif hastalar (Örn: 28 günden fazla)
    activeClients.forEach(client => {
      const clientSessions = sessions.filter(s => s.clientId === client.id);
      if (clientSessions.length > 0) {
        const lastSessionDate = parseISO(clientSessions[0].sessionDate); // GetSessions is ordered desc
        if (differenceInDays(new Date(), lastSessionDate) >= 28) {
          notifications.push({
            id: `absent-client-${client.id}`,
            type: "warning",
            title: "Uzun Süredir Görülmeyen Danışan",
            message: `${client.firstName} ${client.lastName} en son ${differenceInDays(new Date(), lastSessionDate)} gün önce seansa katıldı.`,
            link: `/crocodil/danisman/${client.id}`,
            date: lastSessionDate
          });
        }
      }
    });

    // 4. Yaklaşan değerlendirme seansları
    events.filter(e => e.sessionType?.toLowerCase().includes("değerlendirme") || e.sessionType?.toLowerCase().includes("assessment")).forEach(event => {
      const eventDate = parseISO(event.start);
      if (isFuture(eventDate) && differenceInDays(eventDate, new Date()) <= 3) {
        notifications.push({
          id: `upcoming-assessment-${event.id}`,
          type: "info",
          title: "Yaklaşan Değerlendirme",
          message: `${event.title} için değerlendirme randevusu yaklaşıyor.`,
          link: `/crocodil/takvim`,
          date: eventDate
        });
      }
    });

    // 5. Bugüne ait terapiler (Günlük Özet)
    const todaysEvents = events.filter(e => isToday(parseISO(e.start)));
    if (todaysEvents.length > 0) {
      notifications.push({
        id: `todays-summary-${new Date().toISOString()}`,
        type: "info",
        title: "Bugünün Özeti",
        message: `Bugün toplam ${todaysEvents.length} randevunuz var.`,
        link: `/crocodil/takvim`,
        date: new Date()
      });
    }

    // 6. Sabit Saatli Seans Paketi Tamamlanma / Uzatma Bildirimleri
    try {
      const { getRecurringPackages } = await import("./storage");
      const packages = await getRecurringPackages();
      packages.filter(p => p.status === "aktif" || p.status === "uzatıldı").forEach(pkg => {
        const client = clients.find(c => c.id === pkg.clientId);
        const clientSessions = sessions.filter(s => s.clientId === pkg.clientId);
        const isEndReached = pkg.endDate ? isPast(parseISO(pkg.endDate)) || isToday(parseISO(pkg.endDate)) : false;
        const isSessionsCompleted = clientSessions.length >= pkg.totalSessions;

        if (isEndReached || isSessionsCompleted) {
          notifications.push({
            id: `package-completed-${pkg.id}`,
            type: "warning",
            title: "Seans Paketi Tamamlandı",
            message: `${client?.firstName || "Danışan"} için ${pkg.totalSessions} seanslık ${pkg.sessionType || "Terapi"} paketi tamamlandı! Paketi uzatabilir veya danışanı mezun edebilirsiniz.`,
            link: `/crocodil/danisman/${pkg.clientId}`,
            date: pkg.endDate ? parseISO(pkg.endDate) : new Date()
          });
        }
      });
    } catch {
      // sessiz
    }

  } catch (err: unknown) {
    // Supabase PGRST303 "JWT issued at future" — saat senkronizasyon farkından
    // kaynaklanan geçici bir token hatası. Bildirim yüklenemedi, sessizce devam et.
    const code = (err as { code?: string })?.code;
    const msg  = (err as { message?: string })?.message ?? "";
    const isJwtSkew = code === "PGRST303" || msg.includes("JWT issued at future") || msg.includes("future");

    if (!isJwtSkew) {
      console.warn("[Bildirimler] Beklenmeyen hata:", err);
    }
  }

  // Tarihe göre ters sırala (en yeni/en acil üstte)
  return notifications.sort((a, b) => b.date.getTime() - a.date.getTime());
}
