import { Platform } from "react-native";

const GTM_ID = "GTM-NXSFBVPL";

type AnalyticsValue = string | number | boolean | null | undefined;
type AnalyticsPayload = Record<string, AnalyticsValue>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

let initialized = false;

export function initAnalytics() {
  if (Platform.OS !== "web" || typeof window === "undefined" || typeof document === "undefined" || initialized) {
    return;
  }

  initialized = true;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({
    "gtm.start": Date.now(),
    event: "gtm.js"
  });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  document.head.appendChild(script);
}

export function trackScreen(screenName: string, payload: AnalyticsPayload = {}) {
  trackEvent("screen_view", {
    screen_name: screenName,
    ...payload
  });
}

export function trackEvent(event: string, payload: AnalyticsPayload = {}) {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return;
  }

  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({
    event,
    ...cleanPayload(payload)
  });
}

function cleanPayload(payload: AnalyticsPayload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );
}
