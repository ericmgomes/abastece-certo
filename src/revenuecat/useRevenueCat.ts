import { useEffect, useState } from "react";
import type { CustomerInfo } from "react-native-purchases";
import {
  addCustomerInfoListener,
  configureRevenueCat,
  getRevenueCatCustomerInfo,
  hasPremiumEntitlement,
  identifyRevenueCatCustomer,
  isRevenueCatSupported,
  logoutRevenueCatCustomer,
  presentPremiumPaywallIfNeeded,
  presentRevenueCatCustomerCenter,
  restoreRevenueCatPurchases
} from "./revenueCat";
import { trackEvent } from "../analytics";

export function useRevenueCat(appUserId?: string | null) {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const isSupported = isRevenueCatSupported();
  const isPremium = hasPremiumEntitlement(customerInfo);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      setReady(false);
      setLastError(null);

      if (!isSupported) {
        setCustomerInfo(null);
        setReady(true);
        return;
      }

      try {
        await configureRevenueCat(appUserId);
        const info = appUserId
          ? await identifyRevenueCatCustomer(appUserId)
          : await getRevenueCatCustomerInfo();

        if (!cancelled) {
          setCustomerInfo(info);
          trackEvent("revenuecat_configured", {
            auth_state: appUserId ? "authenticated" : "guest",
            is_premium: hasPremiumEntitlement(info)
          });
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Não foi possível iniciar assinaturas.";
          setLastError(message);
          trackEvent("revenuecat_error", {
            action: "configure"
          });
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    void start();

    return () => {
      cancelled = true;
    };
  }, [appUserId, isSupported]);

  useEffect(() => {
    if (!isSupported) {
      return undefined;
    }

    return addCustomerInfoListener((info) => {
      setCustomerInfo(info);
      trackEvent("revenuecat_customer_info_updated", {
        is_premium: hasPremiumEntitlement(info)
      });
    });
  }, [isSupported]);

  async function refreshCustomerInfo() {
    if (!isSupported) {
      return null;
    }

    const info = await getRevenueCatCustomerInfo(appUserId);
    setCustomerInfo(info);
    return info;
  }

  async function openPaywall() {
    if (!isSupported) {
      setLastError("Assinaturas estarão disponíveis nos apps para iOS e Android.");
      trackEvent("paywall_unavailable", {
        reason: "unsupported_platform"
      });
      return false;
    }

    setLoading(true);
    setLastError(null);
    trackEvent("paywall_opened", {
      auth_state: appUserId ? "authenticated" : "guest"
    });

    try {
      const completed = await presentPremiumPaywallIfNeeded(appUserId);
      const info = await refreshCustomerInfo();
      const premium = hasPremiumEntitlement(info);
      trackEvent("paywall_closed", {
        completed,
        is_premium: premium
      });
      return completed || premium;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível abrir o paywall.";
      setLastError(message);
      trackEvent("revenuecat_error", {
        action: "paywall"
      });
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function restorePurchases() {
    if (!isSupported) {
      setLastError("Assinaturas estarão disponíveis nos apps para iOS e Android.");
      return false;
    }

    setLoading(true);
    setLastError(null);
    trackEvent("restore_purchases_started");

    try {
      const result = await restoreRevenueCatPurchases(appUserId);
      setCustomerInfo(result.customerInfo);
      trackEvent("restore_purchases_finished", {
        is_premium: result.isPremium
      });
      return result.isPremium;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível restaurar compras.";
      setLastError(message);
      trackEvent("revenuecat_error", {
        action: "restore"
      });
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function openCustomerCenter() {
    if (!isSupported) {
      setLastError("A central de assinatura estará disponível nos apps para iOS e Android.");
      return;
    }

    setLoading(true);
    setLastError(null);
    trackEvent("customer_center_opened");

    try {
      await presentRevenueCatCustomerCenter(appUserId);
      await refreshCustomerInfo();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível abrir a central de assinatura.";
      setLastError(message);
      trackEvent("revenuecat_error", {
        action: "customer_center"
      });
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    if (!isSupported) {
      setCustomerInfo(null);
      return;
    }

    try {
      await logoutRevenueCatCustomer();
    } catch {
      // RevenueCat logout can fail if the SDK is not configured yet. The app logout still continues.
    } finally {
      setCustomerInfo(null);
    }
  }

  return {
    ready,
    loading,
    isSupported,
    isPremium,
    customerInfo,
    lastError,
    openPaywall,
    openCustomerCenter,
    restorePurchases,
    refreshCustomerInfo,
    logout
  };
}
