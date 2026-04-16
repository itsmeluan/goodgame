import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";

import { removeFriend, respondToFriendRequest, searchPlayers, sendFriendRequest } from "@/lib/api";
import type { FriendProfile, PlayerSearchResult, PublicPlayerProfile } from "@/types/domain";
import { isDemoId, toMessage } from "@/features/map/mapHelpers";
import {
  buildFriendProfileFromCandidate,
  type FriendActionCandidate,
} from "@/features/map/friendTypes";

type UseMapFriendActionsParams = {
  demoFriends: FriendProfile[];
  playerSearchQuery: string;
  setFriends: Dispatch<SetStateAction<FriendProfile[]>>;
  setLastFriendSyncAt: Dispatch<SetStateAction<Date | null>>;
  setViewedPlayerProfile: Dispatch<SetStateAction<PublicPlayerProfile | null>>;
  setFriendActionId: Dispatch<SetStateAction<string | null>>;
  setFriendError: Dispatch<SetStateAction<string | null>>;
  setFriendSuccess: Dispatch<SetStateAction<string | null>>;
  setSearchingPlayers: Dispatch<SetStateAction<boolean>>;
  setPlayerSearchResults: Dispatch<SetStateAction<PlayerSearchResult[]>>;
  loadFriends: () => Promise<void>;
};

export function useMapFriendActions({
  demoFriends,
  playerSearchQuery,
  setFriends,
  setLastFriendSyncAt,
  setViewedPlayerProfile,
  setFriendActionId,
  setFriendError,
  setFriendSuccess,
  setSearchingPlayers,
  setPlayerSearchResults,
  loadFriends,
}: UseMapFriendActionsParams) {
  const syncViewedPlayerRelationshipState = useCallback(
    (userId: string, relationshipState: PublicPlayerProfile["relationshipState"]) => {
      setViewedPlayerProfile((current) =>
        current && current.userId === userId ? { ...current, relationshipState } : current
      );
    },
    [setViewedPlayerProfile]
  );

  const applyDemoFriendMutation = useCallback(
    (transform: (current: FriendProfile[]) => FriendProfile[]) => {
      setFriends((current) => transform(current.length ? current : demoFriends));
      setLastFriendSyncAt(new Date());
    },
    [demoFriends, setFriends, setLastFriendSyncAt]
  );

  const handleSearchPlayers = useCallback(async () => {
    const normalizedQuery = playerSearchQuery.trim();

    if (!normalizedQuery) {
      setFriendError(null);
      setPlayerSearchResults([]);
      return;
    }

    try {
      setSearchingPlayers(true);
      setFriendError(null);
      const result = await searchPlayers(normalizedQuery);
      setPlayerSearchResults(result);
    } catch (searchError) {
      setFriendError(toMessage(searchError));
    } finally {
      setSearchingPlayers(false);
    }
  }, [playerSearchQuery, setFriendError, setPlayerSearchResults, setSearchingPlayers]);

  const handleSendFriendRequest = useCallback(
    async (targetUserId: string, candidate?: FriendActionCandidate) => {
      try {
        setFriendActionId(targetUserId);
        setFriendError(null);
        setFriendSuccess(null);

        if (isDemoId(targetUserId) && candidate) {
          applyDemoFriendMutation((current) => {
            const next = current.filter((friend) => friend.userId !== targetUserId);
            next.unshift(buildFriendProfileFromCandidate(candidate, "outgoing"));
            return next;
          });
          syncViewedPlayerRelationshipState(targetUserId, "outgoing");
          await handleSearchPlayers();
        } else {
          await sendFriendRequest(targetUserId);
          await Promise.all([loadFriends(), handleSearchPlayers()]);
          syncViewedPlayerRelationshipState(targetUserId, "outgoing");
        }

        setFriendSuccess("Convite enviado.");
      } catch (requestError) {
        setFriendError(toMessage(requestError));
      } finally {
        setFriendActionId(null);
      }
    },
    [
      applyDemoFriendMutation,
      handleSearchPlayers,
      loadFriends,
      setFriendActionId,
      setFriendError,
      setFriendSuccess,
      syncViewedPlayerRelationshipState,
    ]
  );

  const handleRespondToFriendRequest = useCallback(
    async (friendshipId: string, accept: boolean, candidate?: FriendActionCandidate) => {
      try {
        setFriendActionId(friendshipId);
        setFriendError(null);
        setFriendSuccess(null);

        if ((isDemoId(friendshipId) || isDemoId(candidate?.userId)) && candidate) {
          applyDemoFriendMutation((current) => {
            const next = current.filter((friend) => friend.userId !== candidate.userId);

            if (accept) {
              next.unshift(buildFriendProfileFromCandidate(candidate, "friend"));
            }

            return next;
          });
          syncViewedPlayerRelationshipState(candidate.userId, accept ? "friend" : "none");
          await handleSearchPlayers();
        } else {
          await respondToFriendRequest(friendshipId, accept);
          await Promise.all([loadFriends(), handleSearchPlayers()]);

          if (candidate) {
            syncViewedPlayerRelationshipState(candidate.userId, accept ? "friend" : "none");
          }
        }

        setFriendSuccess(accept ? "Amizade aceita." : "Convite recusado.");
      } catch (responseError) {
        setFriendError(toMessage(responseError));
      } finally {
        setFriendActionId(null);
      }
    },
    [
      applyDemoFriendMutation,
      handleSearchPlayers,
      loadFriends,
      setFriendActionId,
      setFriendError,
      setFriendSuccess,
      syncViewedPlayerRelationshipState,
    ]
  );

  const handleRemoveFriend = useCallback(
    async (otherUserId: string) => {
      try {
        setFriendActionId(otherUserId);
        setFriendError(null);
        setFriendSuccess(null);

        if (isDemoId(otherUserId)) {
          applyDemoFriendMutation((current) =>
            current.filter((friend) => friend.userId !== otherUserId)
          );
          syncViewedPlayerRelationshipState(otherUserId, "none");
          await handleSearchPlayers();
        } else {
          await removeFriend(otherUserId);
          await Promise.all([loadFriends(), handleSearchPlayers()]);
          syncViewedPlayerRelationshipState(otherUserId, "none");
        }

        setFriendSuccess("Amizade removida.");
      } catch (removeError) {
        setFriendError(toMessage(removeError));
      } finally {
        setFriendActionId(null);
      }
    },
    [
      applyDemoFriendMutation,
      handleSearchPlayers,
      loadFriends,
      setFriendActionId,
      setFriendError,
      setFriendSuccess,
      syncViewedPlayerRelationshipState,
    ]
  );

  return {
    handleSearchPlayers,
    handleSendFriendRequest,
    handleRespondToFriendRequest,
    handleRemoveFriend,
  };
}
