import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo, useState } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  // Login is started via startLogin() in the effect below, only when we actually
  // navigate — never during render. startLogin() mints a one-time nonce + writes
  // the state cookie, so calling it per render would overwrite the cookie and
  // desync it from an in-flight login's `state`.
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const [localUser, setLocalUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem("veriscan_local_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        // Ignored
      }
    } finally {
      localStorage.removeItem("veriscan_local_user");
      setLocalUser(null);
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const loginAsDemo = useCallback((customUser?: any) => {
    const demoUser = customUser || {
      id: 1,
      openId: "demo-analyst-001",
      name: "Institutional Analyst",
      email: "analyst@veriscan.internal",
      role: "admin",
    };
    localStorage.setItem("veriscan_local_user", JSON.stringify(demoUser));
    setLocalUser(demoUser);
    return demoUser;
  }, []);

  const state = useMemo(() => {
    const activeUser = meQuery.data ?? localUser ?? null;
    localStorage.setItem(
      "manus-runtime-user-info",
      JSON.stringify(activeUser)
    );
    return {
      user: activeUser,
      loading: meQuery.isLoading && !localUser,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(activeUser),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    localUser,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (redirectPath && window.location.pathname === redirectPath) return;

    // Navigate at this moment only. startLogin() mints the nonce + cookie itself.
    if (redirectPath) {
      window.location.href = redirectPath;
    } else {
      startLogin();
    }
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
    loginAsDemo,
  };
}
