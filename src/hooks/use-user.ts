import { useQuery } from '@tanstack/react-query';
import { getContext } from '@microsoft/power-apps/app';

const DEV_FALLBACK_USER = {
  fullName: import.meta.env.VITE_DEV_USER_NAME?.trim() || 'Local Developer',
  userPrincipalName:
    import.meta.env.VITE_DEV_USER_EMAIL?.trim() || 'local.dev@localhost',
};

export const useUser = () => {
  return useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      if (typeof window !== 'undefined' && window.self === window.top) {
        return DEV_FALLBACK_USER;
      }
      const context = await getContext();
      return context.user;
    },
  });
};
