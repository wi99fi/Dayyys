import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  getGetPlannerSnapshotQueryKey,
  useGetPlannerSnapshot,
  useSavePlannerEvents,
  useSavePlannerShopping,
  useSavePlannerTasks,
  type PlannerEvent,
  type PlannerSnapshot,
  type PlannerTask,
  type ShoppingItem,
} from "@workspace/api-client-react";
import { useAuth } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import { setAuthTokenGetter } from "@workspace/api-client-react";

type PlannerContextValue = {
  events: PlannerEvent[];
  tasks: PlannerTask[];
  shopping: ShoppingItem[];
  isLoading: boolean;
  isError: boolean;
  errorMessage: string;
  saveEvents: (items: PlannerEvent[]) => Promise<void>;
  saveTasks: (items: PlannerTask[]) => Promise<void>;
  saveShopping: (items: ShoppingItem[]) => Promise<void>;
  reload: () => Promise<unknown>;
};

const EMPTY: PlannerSnapshot = { events: [], tasks: [], shopping: [] };
const PlannerContext = createContext<PlannerContextValue | null>(null);

export function PlannerProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, getToken } = useAuth();
  const [authReady, setAuthReady] = useState(false);
  const queryClient = useQueryClient();
  const queryKey = getGetPlannerSnapshotQueryKey();
  const query = useGetPlannerSnapshot({
    query: { queryKey, enabled: Boolean(isSignedIn && authReady), retry: 1 },
  });
  const eventMutation = useSavePlannerEvents();
  const taskMutation = useSavePlannerTasks();
  const shoppingMutation = useSavePlannerShopping();
  const writeQueue = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    setAuthReady(true);
    return () => setAuthTokenGetter(null);
  }, [getToken]);

  const queueWrite = useCallback(
    (write: () => Promise<unknown>) => {
      const next = writeQueue.current.catch(() => undefined).then(write);
      writeQueue.current = next;
      return next;
    },
    [],
  );

  const saveEvents = useCallback(async (items: PlannerEvent[]) => {
    const previous = queryClient.getQueryData<PlannerSnapshot>(queryKey) ?? EMPTY;
    queryClient.setQueryData(queryKey, { ...previous, events: items });
    try {
      await queueWrite(() => eventMutation.mutateAsync({ data: { items } }));
    } catch (error) {
      await queryClient.invalidateQueries({ queryKey });
      throw error;
    }
  }, [eventMutation, queryClient, queryKey, queueWrite]);

  const saveTasks = useCallback(async (items: PlannerTask[]) => {
    const previous = queryClient.getQueryData<PlannerSnapshot>(queryKey) ?? EMPTY;
    queryClient.setQueryData(queryKey, { ...previous, tasks: items });
    try {
      await queueWrite(() => taskMutation.mutateAsync({ data: { items } }));
    } catch (error) {
      await queryClient.invalidateQueries({ queryKey });
      throw error;
    }
  }, [queryClient, queryKey, queueWrite, taskMutation]);

  const saveShopping = useCallback(async (items: ShoppingItem[]) => {
    const previous = queryClient.getQueryData<PlannerSnapshot>(queryKey) ?? EMPTY;
    queryClient.setQueryData(queryKey, { ...previous, shopping: items });
    try {
      await queueWrite(() => shoppingMutation.mutateAsync({ data: { items } }));
    } catch (error) {
      await queryClient.invalidateQueries({ queryKey });
      throw error;
    }
  }, [queryClient, queryKey, queueWrite, shoppingMutation]);

  const value = useMemo<PlannerContextValue>(() => ({
    events: query.data?.events ?? [],
    tasks: query.data?.tasks ?? [],
    shopping: query.data?.shopping ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    errorMessage: query.error instanceof Error ? query.error.message : "تعذر الاتصال بالتخزين السحابي",
    saveEvents,
    saveTasks,
    saveShopping,
    reload: query.refetch,
  }), [query.data, query.error, query.isError, query.isLoading, query.refetch, saveEvents, saveShopping, saveTasks]);

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

export function usePlanner() {
  const value = useContext(PlannerContext);
  if (!value) throw new Error("usePlanner must be used within PlannerProvider");
  return value;
}