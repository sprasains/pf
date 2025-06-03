import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useRouter } from 'next/router';
import api, { endpoints } from '@/utils/api';

interface Subscription {
  id: string;
  status: string;
  plan: {
    id: string;
    name: string;
    price: number;
    executionLimit: number;
  };
  currentExecutions: number;
  startedAt: string;
  trialEndsAt?: string;
}

export function useSubscription() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: subscription, isLoading, error } = useQuery<Subscription>(
    'subscription',
    () => api.get(endpoints.billing.subscription)
  );

  const createPortalSession = useMutation(
    () => api.post(endpoints.billing.portal),
    {
      onSuccess: (data) => {
        window.location.href = data.url;
      },
    }
  );

  const cancelSubscription = useMutation(
    (subscriptionId: string) => 
      api.delete(`${endpoints.billing.subscription}/${subscriptionId}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('subscription');
      },
    }
  );

  const upgradeSubscription = useMutation(
    (planId: string) => 
      api.post(endpoints.billing.subscription, { planId }),
    {
      onSuccess: (data) => {
        if (data.clientSecret) {
          router.push(`/billing/confirm?client_secret=${data.clientSecret}`);
        } else {
          queryClient.invalidateQueries('subscription');
        }
      },
    }
  );

  return {
    subscription,
    isLoading,
    error,
    createPortalSession: createPortalSession.mutate,
    cancelSubscription: cancelSubscription.mutate,
    upgradeSubscription: upgradeSubscription.mutate,
    isUpgrading: upgradeSubscription.isLoading,
    isCanceling: cancelSubscription.isLoading,
  };
} 