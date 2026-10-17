import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { meQueryKey, useMe, type HintSettings, type Me } from '../../auth/auth';

/** Every first-time hint in the app. Ids are stored on the server when a hint is closed, so never rename one. */
export type HintId = 'tour' | 'dashboard' | 'plan' | 'savings' | 'debt' | 'invest' | 'assets' | 'what-if' | 'tools';

/** Change the cached signed-in user's hint settings in place, so hints vanish the moment they're closed. */
function setHints(queryClient: ReturnType<typeof useQueryClient>, update: (hints: HintSettings) => HintSettings) {
  queryClient.setQueryData<Me | null>(meQueryKey, (me) => (me ? { ...me, hints: update(me.hints) } : me));
}

function useHintMutation<TVariables>(request: (variables: TVariables) => Promise<HintSettings>, optimistic: (hints: HintSettings, variables: TVariables) => HintSettings) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: meQueryKey });
      const before = queryClient.getQueryData<Me | null>(meQueryKey);
      setHints(queryClient, (hints) => optimistic(hints, variables));
      return { before };
    },
    // Put things back if the server didn't take it; the next visit would show the hint again anyway.
    onError: (_error, _variables, context) => {
      if (context?.before !== undefined) queryClient.setQueryData(meQueryKey, context.before);
    },
    onSuccess: (hints) => setHints(queryClient, () => hints),
  });
}

/** Close one hint for good. */
export function useDismissHint() {
  return useHintMutation(
    (id: HintId) => api.post<HintSettings>('/hints/dismiss', { id }),
    (hints, id) => ({ ...hints, dismissed: hints.dismissed.includes(id) ? hints.dismissed : [...hints.dismissed, id] }),
  );
}

/** Turn every hint off, or back on (which shows them all again from the start). */
export function useSetHintsOff() {
  return useHintMutation(
    (off: boolean) => api.put<HintSettings>('/hints', { off }),
    (hints, off) => (off ? { ...hints, off: true } : { off: false, dismissed: [] }),
  );
}

/** True when this signed-in person should see the hint. Signed-out visitors never see hints. */
export function useShowHint(id: HintId) {
  const { data: me } = useMe();
  return !!me && !me.hints.off && !me.hints.dismissed.includes(id);
}
