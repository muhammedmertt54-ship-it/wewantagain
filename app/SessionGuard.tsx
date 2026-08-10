"use client";

import { useCallback, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

export default function SessionGuard() {
  const checkingRef = useRef(false);

  const checkSession = useCallback(async () => {
    if (checkingRef.current) {
      return;
    }

    checkingRef.current = true;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        return;
      }

      const response = await fetch(
        "/api/account/session-status",
        {
          method: "GET",

          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },

          cache: "no-store",
        }
      );

      const data = await response.json();

      if (
        response.status === 401 ||
        response.status === 403 ||
        data?.valid === false
      ) {
        await supabase.auth.signOut();

        window.location.href =
          "/signin?reason=session-ended";

        return;
      }
    } catch (error) {
      console.error(
        "Session guard check failed:",
        error
      );

      // Sunucu geçici olarak erişilemezse
      // kullanıcıyı yanlışlıkla çıkış yaptırmıyoruz.
    } finally {
      checkingRef.current = false;
    }
  }, []);

  useEffect(() => {
    checkSession();

    const interval = window.setInterval(
      checkSession,
      15000
    );

    function handleFocus() {
      checkSession();
    }

    function handleVisibility() {
      if (
        document.visibilityState === "visible"
      ) {
        checkSession();
      }
    }

    window.addEventListener(
      "focus",
      handleFocus
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event) => {
        if (
          event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED"
        ) {
          setTimeout(
            checkSession,
            250
          );
        }
      }
    );

    return () => {
      window.clearInterval(interval);

      window.removeEventListener(
        "focus",
        handleFocus
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );

      subscription.unsubscribe();
    };
  }, [checkSession]);

  return null;
}