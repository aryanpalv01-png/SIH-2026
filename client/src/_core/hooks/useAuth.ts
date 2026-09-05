import { trpc } from "@/lib/trpc";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/auth/login" } =
    options ?? {};
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      if (data?.token) {
        localStorage.setItem("veriscan_auth_token", data.token);
      }
      utils.auth.me.setData(undefined, data.user);
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (data) => {
      if (data?.token) {
        localStorage.setItem("veriscan_auth_token", data.token);
      }
      utils.auth.me.setData(undefined, data.user);
    },
  });

  const quickLoginMutation = trpc.auth.quickLogin.useMutation({
    onSuccess: (data) => {
      if (data?.token) {
        localStorage.setItem("veriscan_auth_token", data.token);
      }
      utils.auth.me.setData(undefined, data.user);
    },
  });

  const sendOtpMutation = trpc.auth.sendOtp.useMutation();

  const verifyOtpMutation = trpc.auth.verifyOtp.useMutation({
    onSuccess: (data) => {
      if (data?.token) {
        localStorage.setItem("veriscan_auth_token", data.token);
      }
      utils.auth.me.setData(undefined, data.user);
    },
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const sendOtp = useCallback(
    async (params: { email?: string; phone?: string }) => {
      return await sendOtpMutation.mutateAsync(params);
    },
    [sendOtpMutation]
  );

  const login = useCallback(
    async (params: { email: string; password: string }) => {
      const res = await loginMutation.mutateAsync(params);
      return res.user;
    },
    [loginMutation]
  );

  const verifyOtp = useCallback(
    async (params: { email?: string; phone?: string; token: string }) => {
      const res = await verifyOtpMutation.mutateAsync(params);
      return res.user;
    },
    [verifyOtpMutation]
  );

  const register = useCallback(
    async (params: { email: string; password: string; name: string }) => {
      const res = await registerMutation.mutateAsync(params);
      return res.user;
    },
    [registerMutation]
  );

  const quickLogin = useCallback(
    async (profile: "analyst" | "investigator" | "auditor" = "analyst") => {
      const res = await quickLoginMutation.mutateAsync({ profile });
      return res.user;
    },
    [quickLoginMutation]
  );

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // Ignore network errors
    } finally {
      // 1. Wipe local and session credentials
      localStorage.removeItem("veriscan_auth_token");
      localStorage.removeItem("veriscan_local_user");
      localStorage.removeItem("manus-cookie");
      localStorage.removeItem("manus-runtime-user-info");
      sessionStorage.clear();

      // 2. Clear browser cookies directly
      document.cookie = "app_session_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=None; Secure;";
      document.cookie = "app_session_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";

      // 3. Clear cache
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();

      // 4. Force hard redirect to login
      window.location.href = "/auth/login";
    }
  }, [logoutMutation, utils]);

  const loginAsDemo = useCallback(
    (customUser?: any) => {
      return quickLogin("analyst");
    },
    [quickLogin]
  );

  const state = useMemo(() => {
    const activeUser = meQuery.data ?? null;
    return {
      user: activeUser,
      loading:
        meQuery.isLoading ||
        loginMutation.isPending ||
        registerMutation.isPending ||
        quickLoginMutation.isPending ||
        sendOtpMutation.isPending ||
        verifyOtpMutation.isPending,
      error:
        meQuery.error?.message ||
        loginMutation.error?.message ||
        registerMutation.error?.message ||
        quickLoginMutation.error?.message ||
        sendOtpMutation.error?.message ||
        verifyOtpMutation.error?.message ||
        null,
      isAuthenticated: Boolean(activeUser),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    loginMutation.isPending,
    loginMutation.error,
    registerMutation.isPending,
    registerMutation.error,
    quickLoginMutation.isPending,
    quickLoginMutation.error,
    sendOtpMutation.isPending,
    sendOtpMutation.error,
    verifyOtpMutation.isPending,
    verifyOtpMutation.error,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname.startsWith("/auth")) return;

    window.location.href = redirectPath;
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
  ]);

  return {
    ...state,
    login,
    sendOtp,
    verifyOtp,
    register,
    quickLogin,
    loginAsDemo,
    logout,
    refresh: () => meQuery.refetch(),
  };
}
