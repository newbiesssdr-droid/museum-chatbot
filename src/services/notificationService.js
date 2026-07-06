const API_BASE = "http://localhost:5000/api/notifications";

export async function fetchNotifications(firebaseUser) {
  if (!firebaseUser) return { success: false, notifications: [] };
  const token = await firebaseUser.getIdToken();
  const resp = await fetch(API_BASE, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  return resp.json();
}

export async function fetchUnreadCount(firebaseUser) {
  if (!firebaseUser) return { success: false, count: 0 };
  const token = await firebaseUser.getIdToken();
  const resp = await fetch(`${API_BASE}/unread-count`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  return resp.json();
}

export async function markNotificationAsRead(firebaseUser, notificationId) {
  if (!firebaseUser || !notificationId) return { success: false };
  const token = await firebaseUser.getIdToken();
  const resp = await fetch(`${API_BASE}/${notificationId}/read`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  return resp.json();
}

export async function markAllNotificationsAsRead(firebaseUser) {
  if (!firebaseUser) return { success: false };
  const token = await firebaseUser.getIdToken();
  const resp = await fetch(`${API_BASE}/read-all`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  return resp.json();
}
