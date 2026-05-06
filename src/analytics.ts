import { Platform } from "react-native";

const GA4_MEASUREMENT_ID = "G-S83NNJLEYP";

type AnalyticsValue = string | number | boolean | null | undefined;
type AnalyticsPayload = Record<string, AnalyticsValue>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
  }
}

let initialized = false;

export function initAnalytics() {
  if (Platform.OS !== "web" || typeof window === "undefined" || typeof document === "undefined" || initialized) {
    return;
  }

  initialized = true;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = window.gtag ?? function gtag() {
    window.dataLayer?.push(arguments as unknown as Record<string, unknown>);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA4_MEASUREMENT_ID, {
    send_page_view: false
  });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`;
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

  const cleanEventPayload = cleanPayload(payload);
  window.gtag?.("event", event, {
    ...cleanEventPayload
  });
}

function cleanPayload(payload: AnalyticsPayload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );
}
