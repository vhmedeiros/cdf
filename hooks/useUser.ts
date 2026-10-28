import useSWR from "swr";

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  features: string[];
}

export function useUser() {
  const { data: user, error, isLoading, mutate } = useSWR<UserProfile>("/api/v1/user");

  const isAdmin = Boolean(
    user?.features &&
      (user.features.includes("create:course") ||
        user.features.includes("create:invite") ||
        user.features.includes("read:course:all")),
  );

  return {
    user: user || null,
    isAdmin,
    isLoading,
    isLoggedIn: Boolean(user && !error),
    error,
    mutate,
  };
}
