import { AccountPage } from "@/features/map/components/AccountPage";
import { AlertsPage } from "@/features/map/components/AlertsPage";
import { BlockedUsersPage } from "@/features/map/components/BlockedUsersPage";
import { ChatsPage, type ChatListSection } from "@/features/map/components/ChatsPage";
import { FriendsPage } from "@/features/map/components/FriendsPage";
import { HistoryPage } from "@/features/map/components/HistoryPage";
import { PlacesPage, type VenueGameOption, type VenueKindOption } from "@/features/map/components/PlacesPage";
import { PlayerProfilePage } from "@/features/map/components/PlayerProfilePage";
import type {
  FriendActionCandidate,
  RecentPlayerCard,
} from "@/features/map/friendTypes";
import type { AddressSuggestion } from "@/lib/placeSearch";
import type {
  BlockedUserProfile,
  FriendProfile,
  InAppNotification,
  MeetupPost,
  PlayerProfile,
  PlayerSearchResult,
  PublicPlayerProfile,
  ReputationSummary,
  VenueCard,
  VenueKind,
  VenueSuggestion,
} from "@/types/domain";

type PageScreen =
  | "chats"
  | "alerts"
  | "places"
  | "account"
  | "friends"
  | "history"
  | "player"
  | "blocked";

type MapPageContentProps = {
  pageScreen: PageScreen;
  bottomInset: number;
  nowTimestamp: number;
  profile: PlayerProfile;
  reputationSummary: ReputationSummary;
  selectedChatMeetupId: string | null;
  chatSections: ChatListSection[];
  lastDashboardSyncAt: Date | null;
  lastAccountSyncAt: Date | null;
  lastFriendSyncAt: Date | null;
  markingNotificationsRead: boolean;
  unreadChatMeetupIds: Set<string>;
  notifications: InAppNotification[];
  notificationError: string | null;
  venues: VenueCard[];
  venueSuggestions: VenueSuggestion[];
  venueSuggestionName: string;
  onChangeVenueSuggestionName: (value: string) => void;
  venueSuggestionNeighborhood: string;
  onChangeVenueSuggestionNeighborhood: (value: string) => void;
  venueAddressQuery: string;
  venueAddressFocused: boolean;
  onChangeVenueAddressFocused: (focused: boolean) => void;
  onChangeVenueAddressQuery: (value: string) => void;
  venueAddressSuggestions: AddressSuggestion[];
  venueAddressLoading: boolean;
  onUseCurrentLocationForVenue: () => void;
  onUseTypedAddressForVenue: () => void;
  onSelectVenueAddressSuggestion: (suggestion: AddressSuggestion) => void;
  venueSuggestionDetails: string;
  onChangeVenueSuggestionDetails: (value: string) => void;
  venueKindOptions: readonly VenueKindOption[];
  selectedVenueKind: VenueKind;
  onSelectVenueKind: (kind: VenueKind) => void;
  venueGameOptions: VenueGameOption[];
  selectedVenueGameIds: string[];
  onToggleVenueGameId: (gameId: string) => void;
  venueSuggestionSuccess: string | null;
  locatingDraftPoint: boolean;
  hasSelectedVenueAddress: boolean;
  selectedVenueFormatCount: number;
  creatingMeetup: boolean;
  onCreateVenueSuggestion: () => void;
  onFocusVenueOnMap: (venueId: string) => void;
  onCreateMeetupAtVenue: (venueId: string) => void;
  historyMeetups: MeetupPost[];
  friendError: string | null;
  friendSuccess: string | null;
  incomingFriendRequests: FriendProfile[];
  friendRequestsExpanded: boolean;
  onToggleFriendRequests: () => void;
  acceptedFriends: FriendProfile[];
  outgoingFriendRequests: FriendProfile[];
  onlineFriendsCount: number;
  playerSearchQuery: string;
  onChangePlayerSearchQuery: (value: string) => void;
  onSearchPlayers: () => void;
  searchingPlayers: boolean;
  playerSearchResults: PlayerSearchResult[];
  recentPlayers: RecentPlayerCard[];
  friendActionId: string | null;
  safetyActionId: string | null;
  onOpenPlayerProfile: (userId: string) => void;
  onSendFriendRequest: (candidate: FriendActionCandidate) => void;
  onRespondToFriendRequest: (
    friendshipId: string,
    accept: boolean,
    candidate: FriendActionCandidate
  ) => void;
  onRemoveFriend: (userId: string) => void;
  onReportUser: (profile: PublicPlayerProfile) => void;
  onBlockUser: (profile: PublicPlayerProfile) => void;
  blockedUsers: BlockedUserProfile[];
  blockedUsersError: string | null;
  blockedUsersSuccess: string | null;
  loadingBlockedUsers: boolean;
  unblockingUserId: string | null;
  onOpenBlockedUsers: () => void;
  onUnblockUser: (user: BlockedUserProfile) => void;
  onProfileEdit: () => void;
  onSignOut: () => void;
  onDeleteAccount: () => void;
  viewedPlayerProfile: PublicPlayerProfile | null;
  loadingViewedPlayer: boolean;
  viewedPlayerError: string | null;
  incomingRequestFriendshipId: string | null;
  onMarkNotificationsRead: () => void;
  onOpenChat: (meetupId: string) => void;
  onOpenNotification: (notification: InAppNotification) => void;
  onClose: () => void;
};

export function MapPageContent({
  pageScreen,
  bottomInset,
  nowTimestamp,
  profile,
  reputationSummary,
  selectedChatMeetupId,
  chatSections,
  lastDashboardSyncAt,
  lastAccountSyncAt,
  lastFriendSyncAt,
  markingNotificationsRead,
  unreadChatMeetupIds,
  notifications,
  notificationError,
  venues,
  venueSuggestions,
  venueSuggestionName,
  onChangeVenueSuggestionName,
  venueSuggestionNeighborhood,
  onChangeVenueSuggestionNeighborhood,
  venueAddressQuery,
  venueAddressFocused,
  onChangeVenueAddressFocused,
  onChangeVenueAddressQuery,
  venueAddressSuggestions,
  venueAddressLoading,
  onUseCurrentLocationForVenue,
  onUseTypedAddressForVenue,
  onSelectVenueAddressSuggestion,
  venueSuggestionDetails,
  onChangeVenueSuggestionDetails,
  venueKindOptions,
  selectedVenueKind,
  onSelectVenueKind,
  venueGameOptions,
  selectedVenueGameIds,
  onToggleVenueGameId,
  venueSuggestionSuccess,
  locatingDraftPoint,
  hasSelectedVenueAddress,
  selectedVenueFormatCount,
  creatingMeetup,
  onCreateVenueSuggestion,
  onFocusVenueOnMap,
  onCreateMeetupAtVenue,
  historyMeetups,
  friendError,
  friendSuccess,
  incomingFriendRequests,
  friendRequestsExpanded,
  onToggleFriendRequests,
  acceptedFriends,
  outgoingFriendRequests,
  onlineFriendsCount,
  playerSearchQuery,
  onChangePlayerSearchQuery,
  onSearchPlayers,
  searchingPlayers,
  playerSearchResults,
  recentPlayers,
  friendActionId,
  safetyActionId,
  onOpenPlayerProfile,
  onSendFriendRequest,
  onRespondToFriendRequest,
  onRemoveFriend,
  onReportUser,
  onBlockUser,
  blockedUsers,
  blockedUsersError,
  blockedUsersSuccess,
  loadingBlockedUsers,
  unblockingUserId,
  onOpenBlockedUsers,
  onUnblockUser,
  onProfileEdit,
  onSignOut,
  onDeleteAccount,
  viewedPlayerProfile,
  loadingViewedPlayer,
  viewedPlayerError,
  incomingRequestFriendshipId,
  onMarkNotificationsRead,
  onOpenChat,
  onOpenNotification,
  onClose,
}: MapPageContentProps) {
  if (pageScreen === "chats") {
    return (
      <ChatsPage
        sections={chatSections}
        unreadChatMeetupIds={unreadChatMeetupIds}
        selectedChatMeetupId={selectedChatMeetupId}
        nowTimestamp={nowTimestamp}
        bottomInset={bottomInset}
        onOpenChat={onOpenChat}
        onClose={onClose}
      />
    );
  }

  if (pageScreen === "alerts") {
    return (
      <AlertsPage
        notifications={notifications}
        markingNotificationsRead={markingNotificationsRead}
        notificationError={notificationError}
        bottomInset={bottomInset}
        onMarkAll={onMarkNotificationsRead}
        onOpenNotification={onOpenNotification}
        onClose={onClose}
      />
    );
  }

  if (pageScreen === "places") {
    return (
      <PlacesPage
        venues={venues}
        venueSuggestions={venueSuggestions}
        lastDashboardSyncAt={lastDashboardSyncAt}
        lastAccountSyncAt={lastAccountSyncAt}
        bottomInset={bottomInset}
        profileLat={profile.lat}
        profileLng={profile.lng}
        venueSuggestionName={venueSuggestionName}
        onChangeVenueSuggestionName={onChangeVenueSuggestionName}
        venueSuggestionNeighborhood={venueSuggestionNeighborhood}
        onChangeVenueSuggestionNeighborhood={onChangeVenueSuggestionNeighborhood}
        venueAddressQuery={venueAddressQuery}
        venueAddressFocused={venueAddressFocused}
        onChangeVenueAddressFocused={onChangeVenueAddressFocused}
        onChangeVenueAddressQuery={onChangeVenueAddressQuery}
        venueAddressSuggestions={venueAddressSuggestions}
        venueAddressLoading={venueAddressLoading}
        onUseCurrentLocation={onUseCurrentLocationForVenue}
        onUseTypedAddress={onUseTypedAddressForVenue}
        onSelectAddressSuggestion={onSelectVenueAddressSuggestion}
        venueSuggestionDetails={venueSuggestionDetails}
        onChangeVenueSuggestionDetails={onChangeVenueSuggestionDetails}
        venueKindOptions={venueKindOptions}
        selectedVenueKind={selectedVenueKind}
        onSelectVenueKind={onSelectVenueKind}
        venueGameOptions={venueGameOptions}
        selectedVenueGameIds={selectedVenueGameIds}
        onToggleVenueGameId={onToggleVenueGameId}
        venueSuggestionSuccess={venueSuggestionSuccess}
        locatingDraftPoint={locatingDraftPoint}
        hasSelectedVenueAddress={hasSelectedVenueAddress}
        selectedVenueFormatCount={selectedVenueFormatCount}
        creatingMeetup={creatingMeetup}
        onCreateVenueSuggestion={onCreateVenueSuggestion}
        onFocusVenueOnMap={onFocusVenueOnMap}
        onCreateMeetupAtVenue={onCreateMeetupAtVenue}
        onClose={onClose}
      />
    );
  }

  if (pageScreen === "history") {
    return (
      <HistoryPage
        meetups={historyMeetups}
        lastDashboardSyncAt={lastDashboardSyncAt}
        bottomInset={bottomInset}
        onClose={onClose}
      />
    );
  }

  if (pageScreen === "friends") {
    return (
      <FriendsPage
        bottomInset={bottomInset}
        friendError={friendError}
        friendSuccess={friendSuccess}
        incomingFriendRequests={incomingFriendRequests}
        friendRequestsExpanded={friendRequestsExpanded}
        onToggleFriendRequests={onToggleFriendRequests}
        acceptedFriends={acceptedFriends}
        outgoingFriendRequests={outgoingFriendRequests}
        onlineFriendsCount={onlineFriendsCount}
        lastFriendSyncAt={lastFriendSyncAt}
        playerSearchQuery={playerSearchQuery}
        onChangePlayerSearchQuery={onChangePlayerSearchQuery}
        onSearchPlayers={onSearchPlayers}
        searchingPlayers={searchingPlayers}
        playerSearchResults={playerSearchResults}
        recentPlayers={recentPlayers}
        friendActionId={friendActionId}
        onOpenPlayerProfile={onOpenPlayerProfile}
        onSendFriendRequest={onSendFriendRequest}
        onRespondToFriendRequest={onRespondToFriendRequest}
        onRemoveFriend={onRemoveFriend}
        onClose={onClose}
      />
    );
  }

  if (pageScreen === "account") {
    return (
      <AccountPage
        profile={profile}
        reputationSummary={reputationSummary}
        lastAccountSyncAt={lastAccountSyncAt}
        blockedUsersCount={blockedUsers.length}
        bottomInset={bottomInset}
        onProfileEdit={onProfileEdit}
        onOpenBlockedUsers={onOpenBlockedUsers}
        onSignOut={onSignOut}
        onDeleteAccount={onDeleteAccount}
        onClose={onClose}
      />
    );
  }

  if (pageScreen === "blocked") {
    return (
      <BlockedUsersPage
        blockedUsers={blockedUsers}
        blockedUsersError={blockedUsersError}
        blockedUsersSuccess={blockedUsersSuccess}
        loadingBlockedUsers={loadingBlockedUsers}
        unblockingUserId={unblockingUserId}
        bottomInset={bottomInset}
        onUnblockUser={onUnblockUser}
        onClose={onClose}
      />
    );
  }

  return (
    <PlayerProfilePage
      profile={viewedPlayerProfile}
      loading={loadingViewedPlayer}
      error={viewedPlayerError}
      friendActionId={friendActionId}
      safetyActionId={safetyActionId}
      incomingRequestFriendshipId={incomingRequestFriendshipId}
      onSendFriendRequest={onSendFriendRequest}
      onRespondToFriendRequest={onRespondToFriendRequest}
      onRemoveFriend={onRemoveFriend}
      onReportUser={onReportUser}
      onBlockUser={onBlockUser}
    />
  );
}
