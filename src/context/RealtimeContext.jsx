import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import { useAuth } from "./AuthContext";
import { fetchUpdates } from "../services/apiClient";

/**
 * Live updates for the dashboard — new orders and new back-in-stock requests
 * arriving without anyone refreshing.
 *
 * The transport is polling, not a push stream. Shared hosting cannot hold a
 * Server-Sent Events connection open: PHP's max_execution_time cuts it off, and
 * every held connection occupies a worker until it does. So this asks the
 * server "anything since id N?" on an interval.
 *
 * The event API is deliberately transport-agnostic — components call
 * useRealtimeEvent("order:new", …) and know nothing about how it arrived, so
 * swapping to a real push stream later touches this file and nothing else.
 */

const RealtimeContext = createContext(null);

/**
 * Six seconds is brisk enough that a new order reaches the dashboard while the
 * customer is still on the confirmation screen, without hammering a shared
 * plan: ten requests a minute per open console.
 */
const POLL_MS = 6000;

/** Backoff when the server is unreachable, so an outage is not amplified. */
const ERROR_BACKOFF_MS = 30000;

export function RealtimeProvider({ children }) {
  const { isAdmin, isLoading } = useAuth();
  const listeners = useRef(new Map());
  const [connected, setConnected] = useState(false);

  /**
   * Bumped on the first successful poll and on every recovery after a failure.
   * Pages watch it to refetch, which is how anything missed during an outage
   * gets picked up.
   */
  const [readyCount, setReadyCount] = useState(0);

  const emit = useCallback((type, payload) => {
    // Copy before iterating: a handler may unsubscribe itself as it runs.
    for (const handler of [...(listeners.current.get(type) || [])]) {
      try {
        handler(payload);
      } catch (error) {
        console.error(`realtime ${type} handler failed`, error);
      }
    }
  }, []);

  useEffect(() => {
    // Only the dashboard polls. A storefront visitor has nothing to receive,
    // and the endpoint requires an admin token anyway.
    if (isLoading || !isAdmin) {
      setConnected(false);
      return undefined;
    }

    let stopped = false;
    let timer = null;
    // null means "not polled yet". The first response seeds the cursor without
    // emitting, so opening the console does not replay every existing order as
    // though it just arrived.
    let cursor = { order: null, notification: null };
    let healthy = false;

    const schedule = (delay) => {
      if (stopped) return;
      clearTimeout(timer);
      timer = setTimeout(poll, delay);
    };

    async function poll() {
      if (stopped) return;

      // Nothing on a hidden tab is visible to the admin, and browsers throttle
      // background timers anyway. The visibility handler polls immediately on
      // return, so nothing is lost by skipping.
      if (document.visibilityState === "hidden") {
        schedule(POLL_MS);
        return;
      }

      const seeding = cursor.order === null;

      try {
        const data = await fetchUpdates(cursor.order ?? 0, cursor.notification ?? 0);
        if (stopped) return;

        if (seeding) {
          cursor = {
            order: data.cursor?.order ?? 0,
            notification: data.cursor?.notification ?? 0,
          };
        } else {
          for (const order of data.orders || []) emit("order:new", order);
          for (const note of data.notifications || []) emit("notification:new", note);

          // Trust the server's cursor over the highest id seen: it advances even
          // on an empty poll.
          cursor = {
            order: Math.max(cursor.order, data.cursor?.order ?? 0),
            notification: Math.max(cursor.notification, data.cursor?.notification ?? 0),
          };
        }

        if (!healthy) {
          healthy = true;
          setConnected(true);
          setReadyCount((n) => n + 1);
        }
        schedule(POLL_MS);
      } catch {
        if (stopped) return;
        // A 401 lands here too. A failed poll deliberately does not bounce the
        // admin to the login screen mid-task; the next real action surfaces an
        // expired session properly.
        if (healthy) {
          healthy = false;
          setConnected(false);
        }
        schedule(ERROR_BACKOFF_MS);
      }
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") schedule(0);
    };
    document.addEventListener("visibilitychange", onVisible);

    poll();

    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [emit, isAdmin, isLoading]);

  const subscribe = useCallback((type, handler) => {
    if (!listeners.current.has(type)) listeners.current.set(type, new Set());
    listeners.current.get(type).add(handler);
    return () => listeners.current.get(type)?.delete(handler);
  }, []);

  const value = useMemo(
    () => ({ subscribe, connected, readyCount }),
    [subscribe, connected, readyCount]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export const useRealtime = () =>
  useContext(RealtimeContext) || {
    // Outside the provider, subscribing is a no-op rather than a crash.
    subscribe: () => () => {},
    connected: false,
    readyCount: 0,
  };

/**
 * Subscribes to one event type for the life of the component. The handler is
 * held in a ref so callers can pass an inline arrow without re-subscribing on
 * every render.
 */
export function useRealtimeEvent(type, handler) {
  const { subscribe } = useRealtime();
  const saved = useRef(handler);
  saved.current = handler;

  useEffect(
    () => subscribe(type, (payload) => saved.current?.(payload)),
    [subscribe, type]
  );
}

export default RealtimeContext;
