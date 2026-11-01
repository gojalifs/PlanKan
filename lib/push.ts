const FCM_URL = "https://fcm.googleapis.com/fcm/send";

export async function sendPush(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ sent: number; skipped: boolean }> {
  const serverKey = process.env.FCM_SERVER_KEY;
  if (!serverKey || tokens.length === 0) {
    return { sent: 0, skipped: true };
  }

  let sent = 0;
  for (const token of tokens) {
    try {
      const res = await fetch(FCM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `key=${serverKey}`,
        },
        body: JSON.stringify({
          to: token,
          notification: { title, body },
          data: data ?? {},
        }),
      });
      if (res.ok) sent += 1;
    } catch {
      // Best-effort: jangan gagalkan flow utama.
    }
  }
  return { sent, skipped: false };
}
