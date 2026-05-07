import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useEffectEvent,
  useRef,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authQueryKeys, authService } from "@/features/auth/Auth.service";
import type { AuthSession, LoginFormValues, RegisterFormValues } from "@/features/auth/Auth.types";

const AUTH_ACTIVITY_INTERVAL_MS = 45_000;

type AuthContextValue = {
  session: AuthSession | null;
  loading: boolean;
  login: (values: LoginFormValues) => Promise<AuthSession>;
  register: (values: RegisterFormValues) => Promise<AuthSession>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<AuthSession | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function useAuthActivityHeartbeat(session: AuthSession | null) {
  const queryClient = useQueryClient();
  const lastActivityAtRef = useRef(Date.now());
  const lastHeartbeatAtRef = useRef(0);

  const syncSession = useEffectEvent(async () => {
    const nextSession = await authService.touch();
    startTransition(() => {
      queryClient.setQueryData(authQueryKeys.session(), nextSession);
    });
  });

  useEffect(() => {
    if (!session) {
      return;
    }

    lastActivityAtRef.current = Date.now();
    lastHeartbeatAtRef.current = 0;

    const markActivity = () => {
      lastActivityAtRef.current = Date.now();
    };

    const intervalId = window.setInterval(() => {
      if (lastActivityAtRef.current <= lastHeartbeatAtRef.current) {
        return;
      }

      lastHeartbeatAtRef.current = Date.now();
      void syncSession();
    }, AUTH_ACTIVITY_INTERVAL_MS);

    window.addEventListener("pointerdown", markActivity);
    window.addEventListener("keydown", markActivity);
    window.addEventListener("scroll", markActivity, { passive: true });

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("pointerdown", markActivity);
      window.removeEventListener("keydown", markActivity);
      window.removeEventListener("scroll", markActivity);
    };
  }, [session, syncSession]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: authQueryKeys.session(),
    queryFn: ({ signal }) => authService.getSession(signal),
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: (values: LoginFormValues) =>
      authService.login({
        email: values.email.trim().toLowerCase(),
        password: values.password,
      }),
    onSuccess: (session) => {
      queryClient.setQueryData(authQueryKeys.session(), session);
    },
  });

  const registerMutation = useMutation({
    mutationFn: (values: RegisterFormValues) =>
      authService.register({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
      }),
    onSuccess: (session) => {
      queryClient.setQueryData(authQueryKeys.session(), session);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      queryClient.setQueryData(authQueryKeys.session(), null);
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== "auth",
      });
    },
  });

  useAuthActivityHeartbeat(sessionQuery.data ?? null);

  const contextValue: AuthContextValue = {
    session: sessionQuery.data ?? null,
    loading: sessionQuery.isPending,
    login: (values) => loginMutation.mutateAsync(values),
    register: (values) => registerMutation.mutateAsync(values),
    logout: async () => {
      await logoutMutation.mutateAsync();
    },
    refreshSession: async () => {
      const nextSession = await queryClient.fetchQuery({
        queryKey: authQueryKeys.session(),
        queryFn: ({ signal }) => authService.getSession(signal),
        retry: false,
      });
      return nextSession;
    },
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
