import {
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  InteractionManager,
  Keyboard,
  type KeyboardEvent,
  Linking,
  Platform,
  Share,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import type { Region } from "react-native-maps";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { RealtimeChannel } from "@supabase/supabase-js";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";

import { buildDemoBundle, buildEmptyDemoBundle } from "@/features/demo/demoData";
import type { ChatListSection } from "@/features/map/components/ChatsPage";
import { ProPlayerPaywallModal } from "@/features/monetization/ProPlayerPaywallModal";
import { MapHomeSurface } from "@/features/map/components/MapHomeSurface";
import { MapCircleActionButton } from "@/features/map/components/MapCircleActionButton";
import { AppNewsDetailOverlay } from "@/features/map/components/AppNewsDetailOverlay";
import { MeetupShareOverlay } from "@/features/map/components/MeetupShareOverlay";
import { MeetupSheetCardContainer } from "@/features/map/components/MeetupSheetCardContainer";
import { MeetupSheetParticipantsScene } from "@/features/map/components/MeetupSheetParticipantsScene";
import { MeetupSheetListRowContainer } from "@/features/map/components/MeetupSheetListRowContainer";
import { VenueSheetCardContainer } from "@/features/map/components/VenueSheetCardContainer";
import { VenueSheetListRowContainer } from "@/features/map/components/VenueSheetListRowContainer";
import {
  inferGameLabelsFromVenue,
  inferGameNameFromLabels,
  inferGameNameFromMeetup,
  slugifyGameLabel,
} from "@/features/map/gameLabels";
import type { MapSelectionGroup } from "@/features/map/InteractiveMap.types";
import { filterMeetups, filterVenues } from "@/features/map/mapFilters";
import { styles } from "@/features/map/MapHomeScreen.styles";
import type {
  DistanceFilter,
  MapEntityFilter,
  PeriodFilter,
} from "@/features/map/mapFilters";
import {
  buildCalendarCells,
  buildComposerStartsAtIso,
  formatCalendarMonthLabel,
  formatComposerDateLabel,
  formatFilterDateSummary,
  getComposerDateParts,
  parseComposerDate,
  snapComposerMinuteToQuarter,
  selectFilterDateRange,
  shiftCalendarMonth,
  startOfCalendarMonth,
  toCalendarDateKey,
} from "@/features/map/mapCalendar";
import {
  distanceOptions,
  entityFilterOptions,
  hostModeOptions,
  MEETUP_SORT_OPTIONS,
  periodOptions,
  TIME_HOURS,
  TIME_MINUTES,
  type ComposerMeetupMode,
} from "@/features/map/mapConfig";
import { buildDemoPublicProfiles, describeDemoPlayer } from "@/features/map/demoProfiles";
import type {
  FriendActionCandidate,
  RecentPlayerCard,
} from "@/features/map/friendTypes";
import {
  buildAddressSuggestionFromVenue,
  buildChatGroupsByGame,
  compareMeetups,
  compareVenuesByDistance,
  isDemoId,
  mapComposerMeetupModeToHostMode,
  mergeChatMessages,
  resolveCurrentLocationSuggestion,
  toMessage,
  type MeetupSortMode,
} from "@/features/map/mapHelpers";
import {
  buildBufferedBoundsFromRegion,
  mergeById,
  shouldRefreshViewportBounds,
  type ViewportFeedBounds,
} from "@/features/map/viewport";
import { isMeetupOverdue, resolveMeetupEffectiveStatus } from "@/features/map/meetupTiming";
import {
  buildDetailTagFilterForBoundsRpc,
  deriveFilterDetailKindsFromFormats,
  detailTagsSatisfiedForFormat,
  getFormatDetailKind,
  pruneFilterDetailTagsForSelectedFormats,
  pruneFormatDetailTagsForFormat,
  type FormatDetailTags,
} from "@/lib/formatDetailTags";
import {
  buildExternalShareContent,
  buildMeetupShareMessageBody,
  parseMeetupIdFromIncomingUrl,
} from "@/lib/meetupShare";
import {
  buildExternalVenueShareContent,
  buildVenueShareMessageBody,
  parseVenueIdFromIncomingUrl,
} from "@/lib/venueShare";
import { useMapFriendActions } from "@/features/map/useMapFriendActions";
import { useMapNotificationActions } from "@/features/map/useMapNotificationActions";
import { useMapVenueActions } from "@/features/map/useMapVenueActions";
import {
  useGamesSheetPanResponder,
  useGamesSheetSectionPanResponder,
  usePageDismissPanResponder,
  useDrawerPanResponders,
  useChatRoomBackPanResponder,
} from "@/features/map/useMapPanResponders";
import { toggleMultiValue } from "@/features/map/components/FormatDetailTagBlock";
import { useAddressSuggestionSearch } from "@/features/map/useAddressSuggestionSearch";
import {
  blockUser,
  countUnreadAppNews,
  createMeetup,
  deleteMyMeetup,
  deleteMyAccount,
  dismissAppNewsColdStart,
  getDashboardData,
  getDashboardFeedInBounds,
  getMyBlockedUsers,
  getMeetupMessagesAfter,
  getFriendOverview,
  getMeetupMessages,
  getMeetupMemberPresence,
  getOrCreatePrivateChat,
  getPrivateMessages,
  getPrivateMessagesAfter,
  getMyNotifications,
  getMyReputationSummary,
  getMyVenueSuggestions,
  getPublicPlayerProfile,
  joinMeetup,
  listAppNewsColdStartQueue,
  listPrivateChats,
  leaveMeetup,
  removeMeetupMember,
  reportUser,
  rateMeetupPlayer,
  sendMeetupMessage,
  sendPrivateMessage,
  startProTrial,
  setMyAttendanceStatus,
  signOut,
  unblockUser,
  uploadMeetupChatImage,
  updateMyMeetup,
  updateMyMeetupLocation,
} from "@/lib/api";
import { consumePendingAppNewsMapOverlayAfterSignIn } from "@/lib/appNewsOverlayAfterSignIn";
import { analyticsCapture, analyticsScreen } from "@/lib/analytics";
import { appInfo } from "@/lib/appInfo";
import { env } from "@/lib/env";
import {
  formatShortAddress,
  parseLocalDateTimeInput,
  toLocalDateTimeInput,
} from "@/lib/formatting";
import { triggerHaptic } from "@/lib/haptics";
import { isUserPro } from "@/lib/proPlayer";
import { resolveTypedAddress, type AddressSuggestion } from "@/lib/placeSearch";
import { supabase } from "@/lib/supabase";
import { palette, spacing } from "@/theme/tokens";
import type {
  AppNewsItem,
  AttendanceStatus,
  BlockedUserProfile,
  CatalogFormat,
  CatalogGame,
  ChatMessage,
  FriendProfile,
  InAppNotification,
  MapCoordinate,
  MeetupMemberPresence,
  MeetupPost,
  MeetupStatus,
  PlayerProfile,
  PlayerSearchResult,
  PrivateChatSummary,
  PublicPlayerProfile,
  ReputationSummary,
  VenueCard,
  VenueKind,
  VenueSuggestion,
} from "@/types/domain";

type MapHomeScreenProps = {
  profile: PlayerProfile;
  onProfileEdit: () => void;
  onProfileRefresh?: () => void | Promise<void>;
};

// O backend ainda exige um smallint entre 2 e 12, mas a capacidade não é mais
// exposta ao usuário nem usada para limitar entrada na partida.
const DEFAULT_MEETUP_CAPACITY = 12;
/** Matches `meetup_posts.title` check constraint in the database. */
const MEETUP_TITLE_MIN_LENGTH = 4;
const MEETUP_TITLE_MAX_LENGTH = 80;

type AppScreen =
  | "map"
  | "chats"
  | "alerts"
  | "novidades"
  | "places"
  | "account"
  | "friends"
  | "history"
  | "nearby_players"
  | "feedback"
  | "player";
type PageScreen =
  | "chats"
  | "alerts"
  | "novidades"
  | "places"
  | "account"
  | "friends"
  | "history"
  | "nearby_players"
  | "feedback"
  | "player";
type ChatViewMode = "list" | "room";

/** Captured when entering chat room so Voltar restores the previous sheet/scene (not always the map). */
type ChatReturnSnapshot = {
  activeScreen: AppScreen;
  pageScreen: PageScreen;
  chatViewMode: ChatViewMode;
};

type PlayerReturnContext = {
  activeScreen: Exclude<AppScreen, "player">;
  pageScreen: Exclude<PageScreen, "player"> | null;
};
const venueKindOptions = [
  ["public_place", "Local público"],
  ["specialty_store", "Loja especializada"],
] as const;
const COMPOSER_OPEN_OFFSET = 28;

export function MapHomeScreen({ profile, onProfileEdit, onProfileRefresh }: MapHomeScreenProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [nowTimestamp, setNowTimestamp] = useState(() => Date.now());

  const [activeScreen, setActiveScreen] = useState<AppScreen>("map");
  const [pageScreen, setPageScreen] = useState<PageScreen>("chats");
  const [chatViewMode, setChatViewMode] = useState<ChatViewMode>("list");
  /** Nested ChatsPage routes (game group → meetup list). Lifted so it survives chat room overlay / remounts. */
  const [chatsRouteStackKeys, setChatsRouteStackKeys] = useState<string[]>([]);
  const chatReturnSnapshotRef = useRef<ChatReturnSnapshot | null>(null);
  const [proPaywallVisible, setProPaywallVisible] = useState(false);
  const [proTrialStarting, setProTrialStarting] = useState(false);
  useEffect(() => {
    if (pageScreen !== "chats") {
      setChatsRouteStackKeys([]);
    }
  }, [pageScreen]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formats, setFormats] = useState<CatalogFormat[]>([]);
  const [games, setGames] = useState<CatalogGame[]>([]);
  const [venues, setVenues] = useState<VenueCard[]>([]);
  const [meetups, setMeetups] = useState<MeetupPost[]>([]);
  const [optimisticVenues, setOptimisticVenues] = useState<VenueCard[]>([]);
  const [optimisticMeetups, setOptimisticMeetups] = useState<MeetupPost[]>([]);
  const [mapFeedVenues, setMapFeedVenues] = useState<VenueCard[] | null>(null);
  const [mapFeedMeetups, setMapFeedMeetups] = useState<MeetupPost[] | null>(null);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadAppNewsCount, setUnreadAppNewsCount] = useState(0);
  const [coldStartAppNewsQueue, setColdStartAppNewsQueue] = useState<AppNewsItem[]>([]);
  const coldStartAppNews = coldStartAppNewsQueue[0] ?? null;
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [meetupPresence, setMeetupPresence] = useState<MeetupMemberPresence[]>([]);
  const [reputationSummary, setReputationSummary] = useState<ReputationSummary>({
    averageRating: 0,
    ratingsCount: 0,
    attendedCount: 0,
    noShowCount: 0,
    hostedCount: 0,
  });
  const [venueSuggestions, setVenueSuggestions] = useState<VenueSuggestion[]>([]);
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const [playerSearchResults, setPlayerSearchResults] = useState<PlayerSearchResult[]>([]);
  const [searchingPlayers, setSearchingPlayers] = useState(false);
  const [loadingMeetupPresence, setLoadingMeetupPresence] = useState(false);
  const [friendActionId, setFriendActionId] = useState<string | null>(null);
  const [safetyActionId, setSafetyActionId] = useState<string | null>(null);
  const [unblockingUserId, setUnblockingUserId] = useState<string | null>(null);
  const [ratingActionId, setRatingActionId] = useState<string | null>(null);
  const [friendError, setFriendError] = useState<string | null>(null);
  const [friendSuccess, setFriendSuccess] = useState<string | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserProfile[]>([]);
  const [loadingBlockedUsers, setLoadingBlockedUsers] = useState(false);
  const [blockedUsersError, setBlockedUsersError] = useState<string | null>(null);
  const [blockedUsersSuccess, setBlockedUsersSuccess] = useState<string | null>(null);
  const [venueSuggestionSuccess, setVenueSuggestionSuccess] = useState<string | null>(null);
  const [selectedMeetupId, setSelectedMeetupId] = useState<string | null>(null);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [selectedMapGroup, setSelectedMapGroup] = useState<MapSelectionGroup | null>(null);
  const [pinCalloutDismissNonce, setPinCalloutDismissNonce] = useState(0);
  const [selectedChatMeetupId, setSelectedChatMeetupId] = useState<string | null>(null);
  const [selectedPrivateChatId, setSelectedPrivateChatId] = useState<string | null>(null);
  const [privateChatPeer, setPrivateChatPeer] = useState<{
    userId: string;
    displayName: string;
    handle: string;
    avatarUrl: string | null;
    isPro?: boolean;
    proExpiresAt?: string | null;
    canSendMessages: boolean;
  } | null>(null);
  const [privateChatsList, setPrivateChatsList] = useState<PrivateChatSummary[]>([]);
  const [loadingPrivateChats, setLoadingPrivateChats] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mapViewportRegion, setMapViewportRegion] = useState<Region | null>(null);
  const [messageBody, setMessageBody] = useState("");
  const [replyingToMessageId, setReplyingToMessageId] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [viewedPlayerUserId, setViewedPlayerUserId] = useState<string | null>(null);
  const [viewedPlayerProfile, setViewedPlayerProfile] = useState<PublicPlayerProfile | null>(null);
  const [loadingViewedPlayer, setLoadingViewedPlayer] = useState(false);
  const [viewedPlayerError, setViewedPlayerError] = useState<string | null>(null);
  const [playerReturnContext, setPlayerReturnContext] = useState<PlayerReturnContext>({
    activeScreen: "map",
    pageScreen: null,
  });
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [joiningMeetupId, setJoiningMeetupId] = useState<string | null>(null);
  const [leavingMeetupId, setLeavingMeetupId] = useState<string | null>(null);
  const [creatingMeetup, setCreatingMeetup] = useState(false);
  const [updatingMeetupAction, setUpdatingMeetupAction] = useState<string | null>(null);
  const [markingNotificationsRead, setMarkingNotificationsRead] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [locatingDraftPoint, setLocatingDraftPoint] = useState(false);
  const [lastDashboardSyncAt, setLastDashboardSyncAt] = useState<Date | null>(null);
  const [lastMessageSyncAt, setLastMessageSyncAt] = useState<Date | null>(null);
  const [, setLastNotificationSyncAt] = useState<Date | null>(null);
  const [lastFriendSyncAt, setLastFriendSyncAt] = useState<Date | null>(null);
  const [lastAccountSyncAt, setLastAccountSyncAt] = useState<Date | null>(null);
  const [meetupTitle, setMeetupTitle] = useState("");
  const [meetupDescription, setMeetupDescription] = useState("");
  const [selectedComposerGameId, setSelectedComposerGameId] = useState<string | null>(null);
  const [selectedFormatId, setSelectedFormatId] = useState<string | null>(null);
  const [composerFormatDetailTags, setComposerFormatDetailTags] = useState<FormatDetailTags>({});
  const [hostMode, setHostMode] = useState<ComposerMeetupMode>(
    "public_place"
  );
  const [composerDate, setComposerDate] = useState(() =>
    getComposerDateParts(new Date(Date.now() + 2 * 60 * 60 * 1000)).date
  );
  const [composerHour, setComposerHour] = useState(() =>
    getComposerDateParts(new Date(Date.now() + 2 * 60 * 60 * 1000)).hour
  );
  const [composerMinute, setComposerMinute] = useState(() =>
    snapComposerMinuteToQuarter(
      getComposerDateParts(new Date(Date.now() + 2 * 60 * 60 * 1000)).minute
    )
  );
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [calendarMonthCursor, setCalendarMonthCursor] = useState(() =>
    startOfCalendarMonth(new Date(Date.now() + 2 * 60 * 60 * 1000))
  );
  const [composerAddressQuery, setComposerAddressQuery] = useState(profile.neighborhood ?? "");
  const [composerAddressSuggestions, setComposerAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [composerAddressLoading, setComposerAddressLoading] = useState(false);
  const [composerSelectedAddress, setComposerSelectedAddress] = useState<AddressSuggestion | null>(
    null
  );
  const [venueAddressQuery, setVenueAddressQuery] = useState("");
  const [venueAddressSuggestions, setVenueAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [venueAddressLoading, setVenueAddressLoading] = useState(false);
  const [venueSelectedAddress, setVenueSelectedAddress] = useState<AddressSuggestion | null>(null);
  const [manageAddressQuery, setManageAddressQuery] = useState("");
  const [manageAddressSuggestions, setManageAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [manageAddressLoading, setManageAddressLoading] = useState(false);
  const [manageSelectedAddress, setManageSelectedAddress] = useState<AddressSuggestion | null>(null);
  const [manageVenueName, setManageVenueName] = useState("");
  const [manageVenueNeighborhood, setManageVenueNeighborhood] = useState("");
  const [manageVenueDetails, setManageVenueDetails] = useState("");
  const [manageVenueKind, setManageVenueKind] = useState<VenueKind>("public_place");
  const [manageVenueGameIds, setManageVenueGameIds] = useState<string[]>([]);
  const [manageVenueAddressQuery, setManageVenueAddressQuery] = useState("");
  const [manageVenueAddressSuggestions, setManageVenueAddressSuggestions] = useState<
    AddressSuggestion[]
  >([]);
  const [manageVenueAddressLoading, setManageVenueAddressLoading] = useState(false);
  const [manageVenueSelectedAddress, setManageVenueSelectedAddress] =
    useState<AddressSuggestion | null>(null);
  const [composerAddressFocused, setComposerAddressFocused] = useState(false);
  const [venueAddressFocused, setVenueAddressFocused] = useState(false);
  const [manageAddressFocused, setManageAddressFocused] = useState(false);
  const [manageVenueAddressFocused, setManageVenueAddressFocused] = useState(false);
  const [updatingMeetupLocationId, setUpdatingMeetupLocationId] = useState<string | null>(null);
  const [updatingVenueId, setUpdatingVenueId] = useState<string | null>(null);
  const [draftCoordinate, setDraftCoordinate] = useState<MapCoordinate | null>(null);
  const [entityFilters, setEntityFilters] = useState<MapEntityFilter[]>(["meetups", "venues"]);
  const [selectedGameFilterIds, setSelectedGameFilterIds] = useState<string[]>([]);
  const [selectedFormatFilterIds, setSelectedFormatFilterIds] = useState<string[]>([]);
  const [filterDetailTags, setFilterDetailTags] = useState<FormatDetailTags>({});
  const [distanceFilter, setDistanceFilter] = useState<DistanceFilter>("all");
  const [periodFilters, setPeriodFilters] = useState<PeriodFilter[]>([]);
  const [filterDateFrom, setFilterDateFrom] = useState<string | null>(null);
  const [filterDateTo, setFilterDateTo] = useState<string | null>(null);
  const [filterDateOpen, setFilterDateOpen] = useState(false);
  const [filterCalendarMonthCursor, setFilterCalendarMonthCursor] = useState(() =>
    startOfCalendarMonth(new Date())
  );
  const [manageDate, setManageDate] = useState<string | null>(null);
  const [manageHour, setManageHour] = useState("19");
  const [manageMinute, setManageMinute] = useState("00");
  const [manageCalendarOpen, setManageCalendarOpen] = useState(false);
  const [manageTimePickerOpen, setManageTimePickerOpen] = useState(false);
  const [manageCalendarMonthCursor, setManageCalendarMonthCursor] = useState(() =>
    startOfCalendarMonth(new Date())
  );
  const [venueSuggestionName, setVenueSuggestionName] = useState("");
  const [venueSuggestionNeighborhood, setVenueSuggestionNeighborhood] = useState(
    profile.neighborhood ?? ""
  );
  const [venueSuggestionDetails, setVenueSuggestionDetails] = useState("");
  const [selectedVenueKind, setSelectedVenueKind] = useState<VenueKind>("public_place");
  const [selectedVenueGameIds, setSelectedVenueGameIds] = useState<string[]>([]);
  const [venueComposerOpen, setVenueComposerOpen] = useState(false);
  const [friendRequestsExpanded, setFriendRequestsExpanded] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPanel, setDrawerPanel] = useState<"root" | "chats">("root");
  const [expandedDrawerChatGroupIds, setExpandedDrawerChatGroupIds] = useState<
    Record<string, boolean>
  >({});
  const [expandedChatGroupIds, setExpandedChatGroupIds] = useState<Record<string, boolean>>({});
  const [expandedGameGroups, setExpandedGameGroups] = useState<Record<string, boolean>>({});
  const [gamesSheetSection, setGamesSheetSection] = useState<"meetups" | "venues">("meetups");
  const [meetupSortMode, setMeetupSortMode] = useState<MeetupSortMode>("distance_asc");
  const [meetupSortMenuOpen, setMeetupSortMenuOpen] = useState(false);
  const [hidePastMeetups, setHidePastMeetups] = useState(false);
  const [gamesSheetPreviewMode, setGamesSheetPreviewMode] = useState(false);
  const [expandedMeetupInfoId, setExpandedMeetupInfoId] = useState<string | null>(null);
  const [expandedMeetupManageId, setExpandedMeetupManageId] = useState<string | null>(null);
  const [externalMeetupManageRequest, setExternalMeetupManageRequest] = useState<{
    groupId: string;
    meetupId: string;
  } | null>(null);
  const [externalMeetupDetailRequest, setExternalMeetupDetailRequest] = useState<{
    groupId: string;
    meetupId: string;
  } | null>(null);
  const [externalVenueDetailRequest, setExternalVenueDetailRequest] = useState<{
    venueId: string;
  } | null>(null);
  type MapShareOverlayTarget =
    | { kind: "meetup"; meetup: MeetupPost }
    | { kind: "venue"; venue: VenueCard };
  const [mapShareOverlayTarget, setMapShareOverlayTarget] = useState<MapShareOverlayTarget | null>(
    null
  );
  const pendingMapShareTargetRef = useRef<MapShareOverlayTarget | null>(null);
  const openMeetupFromShareLinkRef = useRef<(meetupId: string) => void>(() => {});
  const openVenueFromShareLinkRef = useRef<(venueId: string) => void>(() => {});
  const [, setExpandedVenueInfoId] = useState<string | null>(null);
  const [expandedVenueManageId, setExpandedVenueManageId] = useState<string | null>(null);
  const [deletingEntityId, setDeletingEntityId] = useState<string | null>(null);
  const [removingMeetupMemberId, setRemovingMeetupMemberId] = useState<string | null>(null);
  const [entityActionSuccess, setEntityActionSuccess] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerKeyboardHeight, setComposerKeyboardHeight] = useState(0);
  const [uploadingChatImage, setUploadingChatImage] = useState(false);
  const [demoMeetupOverrides, setDemoMeetupOverrides] = useState<
    Record<string, Partial<MeetupPost>>
  >({});
  const [demoNotifications, setDemoNotifications] = useState<InAppNotification[]>([]);
  const [demoMeetupPresenceById, setDemoMeetupPresenceById] = useState<
    Record<string, MeetupMemberPresence[]>
  >({});
  const [sheetMeetupPresenceById, setSheetMeetupPresenceById] = useState<
    Record<string, MeetupMemberPresence[]>
  >({});
  const [sheetMeetupPresenceLoadingId, setSheetMeetupPresenceLoadingId] = useState<string | null>(
    null
  );
  const [demoMessagesByMeetupId, setDemoMessagesByMeetupId] = useState<
    Record<string, ChatMessage[]>
  >({});
  const [gamesSheetExpanded, setGamesSheetExpanded] = useState(false);
  const drawerWidth = Math.min(Math.max(width * 0.76, 280), 340);
  const drawerTranslateX = useRef(new Animated.Value(-drawerWidth)).current;
  const drawerBackdropOpacity = useRef(new Animated.Value(0)).current;
  const drawerPanelProgress = useRef(new Animated.Value(0)).current;
  const previousDrawerWidthRef = useRef(drawerWidth);
  const currentDrawerTranslateXRef = useRef(-drawerWidth);
  const drawerPanStartRef = useRef(-drawerWidth);
  const loadDashboardRef = useRef<(mode?: "initial" | "refresh") => Promise<void>>(async () => {});
  const loadMapEntitiesRef = useRef<(mode?: "initial" | "refresh") => Promise<void>>(async () => {});
  const loadNotificationsRef = useRef<() => Promise<void>>(async () => {});
  const loadFriendsRef = useRef<() => Promise<void>>(async () => {});
  const loadAccountDataRef = useRef<() => Promise<void>>(async () => {});
  const syncMessagesRef = useRef<(mode?: "full" | "incremental") => Promise<void>>(async () => {});
  const openPrivateChatByIdRef = useRef<(chatId: string) => Promise<void>>(async () => {});
  const messagesRef = useRef<ChatMessage[]>([]);
  const snapGamesSheetToNearestRef = useRef<(targetValue: number, velocity?: number) => void>(
    () => {}
  );
  const switchGamesSheetSectionRef = useRef<
    (
      nextSection: "meetups" | "venues",
      options?: { animate?: boolean; direction?: "left" | "right" | "none" }
    ) => void
  >(() => {});
  const animateGamesSheetRef = useRef<(expanded: boolean) => void>(() => {});
  const animatePageOutToMapRef = useRef<(onClosed?: () => void) => void>(() => {});
  const animatePageInRef = useRef<() => void>(() => {});
  const closeComposerRef = useRef<(animated?: boolean) => void>(() => {});
  const closeCurrentPageToMapRef = useRef<() => void>(() => {});
  const closePlayerProfileRef = useRef<() => void>(() => {});
  const cancelVenueComposerRef = useRef<() => void>(() => {});
  const handleMarkNotificationsReadRef = useRef<(notificationIds?: string[]) => Promise<void>>(
    async () => {}
  );

  const deferredEntityFilters = useDeferredValue(entityFilters);
  const deferredGameFilterIds = useDeferredValue(selectedGameFilterIds);
  const deferredFormatFilterIds = useDeferredValue(selectedFormatFilterIds);
  const deferredFilterDetailTags = useDeferredValue(filterDetailTags);
  const deferredDistanceFilter = useDeferredValue(distanceFilter);
  const deferredPeriodFilters = useDeferredValue(periodFilters);
  const demoBundle = useMemo(
    () => (env.enableDemoMode ? buildDemoBundle(profile) : buildEmptyDemoBundle()),
    [profile]
  );
  const allVenues = useMemo(
    () => mergeById(optimisticVenues, venues),
    [optimisticVenues, venues]
  );
  const allMeetups = useMemo(
    () => mergeById(optimisticMeetups, meetups),
    [meetups, optimisticMeetups]
  );
  const demoPublicProfilesByUserId = useMemo(
    () => buildDemoPublicProfiles(profile, demoBundle),
    [demoBundle, profile]
  );
  const memberMeetups = useMemo(
    () => allMeetups.filter((item) => item.isMember || item.isCreator),
    [allMeetups]
  );
  const mapFeedMeetupFallback = useMemo(
    () => (mapFeedMeetups === null ? meetups : mapFeedMeetups),
    [mapFeedMeetups, meetups]
  );
  const mapFeedVenueFallback = useMemo(
    () => (mapFeedVenues === null ? venues : mapFeedVenues),
    [mapFeedVenues, venues]
  );
  const demoChatMeetups = useMemo(
    () =>
      demoBundle.chatMeetups.map((meetup) => ({
        ...meetup,
        ...demoMeetupOverrides[meetup.id],
      })),
    [demoBundle.chatMeetups, demoMeetupOverrides]
  );
  const effectiveNotifications =
    notifications.length > 0
      ? notifications
      : demoNotifications.length > 0
        ? demoNotifications
        : demoBundle.notifications;
  const effectiveFriends = friends.length > 0 ? friends : demoBundle.friends;
  const effectiveChatMeetups =
    memberMeetups.length > 0 ? memberMeetups : demoChatMeetups;
  const historyMeetups = useMemo(
    () =>
      [...allMeetups]
        .filter((item) => item.status === "closed" || item.status === "cancelled")
        .sort(
          (left, right) => new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime()
        ),
    [allMeetups]
  );

  useEffect(() => {
    setDemoNotifications((current) => {
      const next = demoBundle.notifications;

      if (!current.length) {
        return next;
      }

      const readAtById = new Map(current.map((item) => [item.id, item.readAt]));

      return next.map((item) => ({
        ...item,
        readAt: readAtById.get(item.id) ?? item.readAt,
      }));
    });
  }, [demoBundle.notifications]);

  const filtersActive =
    entityFilters.length !== 2 ||
    selectedGameFilterIds.length > 0 ||
    selectedFormatFilterIds.length > 0 ||
    distanceFilter !== "all" ||
    periodFilters.length > 0 ||
    filterDateFrom !== null ||
    filterDateTo !== null;
  const activeFilterCount =
    Number(entityFilters.length !== 2) +
    Number(selectedGameFilterIds.length > 0) +
    Number(selectedFormatFilterIds.length > 0) +
    Number(distanceFilter !== "all") +
    Number(periodFilters.length > 0) +
    Number(filterDateFrom !== null || filterDateTo !== null);
  const sectionDistanceReference =
    distanceFilter === "all" ? "raio: qualquer distância" : `raio: até ${distanceFilter} km`;

  const venueGameOptions = useMemo(() => {
    const groups = new Map<
      string,
      {
        id: string;
        label: string;
        formatIds: string[];
      }
    >();

    formats.forEach((format) => {
      const catalogName = games.find((game) => game.id === format.gameId)?.name;
      const label = catalogName ?? inferGameNameFromLabels([format.name]);
      const id = format.gameId;
      const existing = groups.get(id);

      if (existing) {
        existing.formatIds.push(format.id);
        return;
      }

      groups.set(id, {
        id,
        label,
        formatIds: [format.id],
      });
    });

    return Array.from(groups.values()).sort((left, right) => left.label.localeCompare(right.label));
  }, [formats, games]);

  const selectedVenueFormatIds = useMemo(
    () =>
      venueGameOptions
        .filter((game) => selectedVenueGameIds.includes(game.id))
        .flatMap((game) => game.formatIds),
    [selectedVenueGameIds, venueGameOptions]
  );

  const composerGameOptions = useMemo(
    () => venueGameOptions.map((game) => ({ id: game.id, label: game.label })),
    [venueGameOptions]
  );

  const composerFormatOptions = useMemo(() => {
    if (!selectedComposerGameId) {
      return [];
    }

    return formats.filter((format) => format.gameId === selectedComposerGameId);
  }, [formats, selectedComposerGameId]);

  const composerFormat = useMemo(
    () => formats.find((item) => item.id === selectedFormatId),
    [formats, selectedFormatId]
  );

  const composerGameSlug = useMemo(
    () => games.find((item) => item.id === selectedComposerGameId)?.slug,
    [games, selectedComposerGameId]
  );

  const composerDetailKind = useMemo(
    () => getFormatDetailKind(composerGameSlug, composerFormat?.slug, composerFormat?.name),
    [composerFormat?.name, composerFormat?.slug, composerGameSlug]
  );

  const composerDetailSelected = useMemo(() => {
    if (!composerDetailKind) {
      return [];
    }

    const tags = composerFormatDetailTags;
    if (composerDetailKind === "magic_commander") {
      return tags.magic_brackets ?? [];
    }
    if (composerDetailKind === "magic_match") {
      return tags.magic_match_types ?? [];
    }
    if (composerDetailKind === "yugioh") {
      return tags.yugioh_power_levels ?? [];
    }
    if (composerDetailKind === "pokemon") {
      return tags.pokemon_deck_tiers ?? [];
    }

    return [];
  }, [composerDetailKind, composerFormatDetailTags]);

  const handleToggleComposerFormatDetail = useCallback(
    (value: string) => {
      setComposerFormatDetailTags((prev) => {
        const fmt = formats.find((f) => f.id === selectedFormatId);
        const kind = getFormatDetailKind(
          games.find((g) => g.id === selectedComposerGameId)?.slug,
          fmt?.slug,
          fmt?.name
        );
        if (!kind) {
          return prev;
        }

        const next: FormatDetailTags = { ...prev };
        if (kind === "magic_commander") {
          next.magic_brackets = toggleMultiValue(prev.magic_brackets ?? [], value);
        } else if (kind === "magic_match") {
          next.magic_match_types = toggleMultiValue(prev.magic_match_types ?? [], value);
        } else if (kind === "yugioh") {
          next.yugioh_power_levels = toggleMultiValue(prev.yugioh_power_levels ?? [], value);
        } else {
          next.pokemon_deck_tiers = toggleMultiValue(prev.pokemon_deck_tiers ?? [], value);
        }

        return next;
      });
    },
    [formats, games, selectedComposerGameId, selectedFormatId]
  );

  const composerDetailTagsSatisfied = useMemo(
    () =>
      detailTagsSatisfiedForFormat(
        composerGameSlug,
        composerFormat?.slug,
        composerFormatDetailTags,
        composerFormat?.name
      ),
    [composerFormat?.name, composerFormat?.slug, composerFormatDetailTags, composerGameSlug]
  );

  const availableComposerVenues = useMemo(() => {
    if (hostMode === "specialty_store") {
      return allVenues.filter((venue) => venue.kind === "specialty_store");
    }

    if (hostMode === "public_place") {
      return allVenues.filter((venue) => venue.kind === "public_place");
    }

    return allVenues;
  }, [allVenues, hostMode]);

  const managedVenueFormatIds = useMemo(
    () =>
      venueGameOptions
        .filter((game) => manageVenueGameIds.includes(game.id))
        .flatMap((game) => game.formatIds),
    [manageVenueGameIds, venueGameOptions]
  );
  const addressSearchNearHint = useMemo(
    () =>
      profile.lat != null && profile.lng != null
        ? { latitude: profile.lat, longitude: profile.lng }
        : null,
    [profile.lat, profile.lng]
  );

  const handleComposerAddressSearchError = useCallback((searchError: unknown) => {
    setComposerError(toMessage(searchError));
  }, []);

  const handleManageAddressSearchError = useCallback((searchError: unknown) => {
    setMessageError(toMessage(searchError));
  }, []);

  const handleVenueAddressSearchError = useCallback((searchError: unknown) => {
    setError(toMessage(searchError));
  }, []);

  const handleUseTypedAddressForMeetup = useCallback(async () => {
    const nextQuery = composerAddressQuery.trim();

    if (nextQuery.length < 5) {
      setComposerError("Digite o endereço com rua e número para posicionar o jogo.");
      return;
    }

    try {
      setComposerError(null);
      setComposerAddressLoading(true);
      const resolvedAddress = await resolveTypedAddress(nextQuery, { near: addressSearchNearHint });

      if (!resolvedAddress) {
        throw new Error(
          "Não conseguimos localizar esse endereço. Tente incluir número, bairro ou cidade."
        );
      }

      setComposerSelectedAddress(resolvedAddress);
      setComposerAddressQuery(resolvedAddress.fullLabel);
      setComposerAddressSuggestions([]);
      setComposerAddressFocused(false);
      setSelectedVenueId(null);
      setDraftCoordinate({
        latitude: resolvedAddress.latitude,
        longitude: resolvedAddress.longitude,
      });
    } catch (resolveError) {
      setComposerError(toMessage(resolveError));
    } finally {
      setComposerAddressLoading(false);
    }
  }, [addressSearchNearHint, composerAddressQuery]);

  const handleUseTypedAddressForManageMeetup = useCallback(async () => {
    const nextQuery = manageAddressQuery.trim();

    if (nextQuery.length < 5) {
      setMessageError("Digite o endereço com rua e número para posicionar o jogo.");
      return;
    }

    try {
      setMessageError(null);
      setManageAddressLoading(true);
      const resolvedAddress = await resolveTypedAddress(nextQuery, { near: addressSearchNearHint });

      if (!resolvedAddress) {
        throw new Error(
          "Não conseguimos localizar esse endereço. Tente incluir número, bairro ou cidade."
        );
      }

      setManageSelectedAddress(resolvedAddress);
      setManageAddressQuery(resolvedAddress.fullLabel);
      setManageAddressSuggestions([]);
      setManageAddressFocused(false);
    } catch (resolveError) {
      setMessageError(toMessage(resolveError));
    } finally {
      setManageAddressLoading(false);
    }
  }, [addressSearchNearHint, manageAddressQuery]);

  useAddressSuggestionSearch({
    enabled: composerOpen && selectedVenueId === null && composerAddressFocused,
    query: composerAddressQuery,
    selectedAddress: composerSelectedAddress,
    near: addressSearchNearHint,
    setSuggestions: setComposerAddressSuggestions,
    setLoading: setComposerAddressLoading,
    onError: handleComposerAddressSearchError,
  });

  useAddressSuggestionSearch({
    enabled: Boolean(expandedMeetupManageId) && manageAddressFocused,
    query: manageAddressQuery,
    selectedAddress: manageSelectedAddress,
    near: addressSearchNearHint,
    setSuggestions: setManageAddressSuggestions,
    setLoading: setManageAddressLoading,
    onError: handleManageAddressSearchError,
  });

  useAddressSuggestionSearch({
    enabled: venueComposerOpen && venueAddressFocused,
    query: venueAddressQuery,
    selectedAddress: venueSelectedAddress,
    near: addressSearchNearHint,
    setSuggestions: setVenueAddressSuggestions,
    setLoading: setVenueAddressLoading,
    onError: handleVenueAddressSearchError,
  });

  useAddressSuggestionSearch({
    enabled: Boolean(expandedVenueManageId) && manageVenueAddressFocused,
    query: manageVenueAddressQuery,
    selectedAddress: manageVenueSelectedAddress,
    near: addressSearchNearHint,
    setSuggestions: setManageVenueAddressSuggestions,
    setLoading: setManageVenueAddressLoading,
    onError: handleVenueAddressSearchError,
  });

  const selectedGameFilterLabels = useMemo(
    () =>
      venueGameOptions
        .filter((game) => deferredGameFilterIds.includes(game.id))
        .map((game) => game.label),
    [deferredGameFilterIds, venueGameOptions]
  );

  const selectedFormatFilterNames = useMemo(
    () =>
      formats
        .filter((format) => deferredFormatFilterIds.includes(format.id))
        .map((format) => format.name),
    [deferredFormatFilterIds, formats]
  );

  const feedPriorityMeetups = useMemo(() => {
    const byId = new Map<string, MeetupPost>();

    const push = (meetup: MeetupPost | null | undefined) => {
      if (meetup) {
        byId.set(meetup.id, meetup);
      }
    };

    push(selectedMeetupId ? allMeetups.find((item) => item.id === selectedMeetupId) : null);
    selectedMapGroup?.meetupIds.forEach((meetupId) =>
      push(allMeetups.find((meetup) => meetup.id === meetupId))
    );
    memberMeetups.forEach(push);
    optimisticMeetups.forEach(push);

    return Array.from(byId.values());
  }, [allMeetups, memberMeetups, optimisticMeetups, selectedMapGroup, selectedMeetupId]);

  const feedPriorityVenues = useMemo(() => {
    const byId = new Map<string, VenueCard>();

    const push = (venue: VenueCard | null | undefined) => {
      if (venue) {
        byId.set(venue.id, venue);
      }
    };

    push(selectedVenueId ? allVenues.find((item) => item.id === selectedVenueId) : null);
    selectedMapGroup?.venueIds.forEach((venueId) =>
      push(allVenues.find((venue) => venue.id === venueId))
    );
    optimisticVenues.forEach(push);

    return Array.from(byId.values());
  }, [allVenues, optimisticVenues, selectedMapGroup, selectedVenueId]);

  const feedMeetupsSource = useMemo(
    () => mergeById(feedPriorityMeetups, mapFeedMeetupFallback),
    [feedPriorityMeetups, mapFeedMeetupFallback]
  );

  const feedVenuesSource = useMemo(
    () => mergeById(feedPriorityVenues, mapFeedVenueFallback),
    [feedPriorityVenues, mapFeedVenueFallback]
  );

  const visibleFormatGroups = useMemo(
    () =>
      venueGameOptions
        .filter((game) => selectedGameFilterIds.includes(game.id))
        .map((game) => ({
          ...game,
          formats: formats.filter((format) => game.formatIds.includes(format.id)),
        })),
    [formats, selectedGameFilterIds, venueGameOptions]
  );

  useEffect(() => {
    setFilterDetailTags((prev) =>
      pruneFilterDetailTagsForSelectedFormats(prev, selectedFormatFilterIds, formats, games)
    );
  }, [formats, games, selectedFormatFilterIds]);

  const mapFilterDetailSections = useMemo(() => {
    const kinds = deriveFilterDetailKindsFromFormats(selectedFormatFilterIds, formats, games);
    return kinds.map((kind) => ({
      kind,
      selected:
        kind === "magic_commander"
          ? filterDetailTags.magic_brackets ?? []
          : kind === "magic_match"
            ? filterDetailTags.magic_match_types ?? []
            : kind === "yugioh"
              ? filterDetailTags.yugioh_power_levels ?? []
              : filterDetailTags.pokemon_deck_tiers ?? [],
      onToggle: (value: string) => {
        setFilterDetailTags((prev) => {
          const key =
            kind === "magic_commander"
              ? "magic_brackets"
              : kind === "magic_match"
                ? "magic_match_types"
                : kind === "yugioh"
                  ? "yugioh_power_levels"
                  : "pokemon_deck_tiers";
          const cur = (prev[key] as string[] | undefined) ?? [];
          return { ...prev, [key]: toggleMultiValue(cur, value) };
        });
      },
    }));
  }, [filterDetailTags, formats, games, selectedFormatFilterIds]);

  const filteredMeetups = useMemo(
    () =>
      deferredEntityFilters.includes("meetups")
        ? filterMeetups(feedMeetupsSource, {
            gameTypes: selectedGameFilterLabels,
            formatNames: selectedFormatFilterNames,
            userLat: profile.lat,
            userLng: profile.lng,
            distanceKm: deferredDistanceFilter,
            periods: deferredPeriodFilters,
            dateFrom: filterDateFrom,
            dateTo: filterDateTo,
            detailTagFilter: deferredFilterDetailTags,
            formatsCatalog: formats,
          })
            .filter((meetup) => {
              const effectiveStatus = resolveMeetupEffectiveStatus(meetup, nowTimestamp);
              return effectiveStatus !== "closed" && effectiveStatus !== "cancelled";
            })
        : [],
    [
      deferredEntityFilters,
      deferredDistanceFilter,
      deferredFilterDetailTags,
      deferredPeriodFilters,
      filterDateFrom,
      filterDateTo,
      formats,
      profile.lat,
      profile.lng,
      selectedFormatFilterNames,
      selectedGameFilterLabels,
      nowTimestamp,
      feedMeetupsSource,
    ]
  );

  const filteredVenues = useMemo(
    () =>
      deferredEntityFilters.includes("venues")
        ? filterVenues(feedVenuesSource, {
            gameTypes: selectedGameFilterLabels,
            formatNames: selectedFormatFilterNames,
            userLat: profile.lat,
            userLng: profile.lng,
            distanceKm: deferredDistanceFilter,
          })
        : [],
    [
      deferredEntityFilters,
      deferredDistanceFilter,
      profile.lat,
      profile.lng,
      selectedFormatFilterNames,
      selectedGameFilterLabels,
      feedVenuesSource,
    ]
  );

  const selectedMeetup = useMemo(
    () => allMeetups.find((item) => item.id === selectedMeetupId) ?? null,
    [allMeetups, selectedMeetupId]
  );

  const selectedVenue = useMemo(
    () => allVenues.find((item) => item.id === selectedVenueId) ?? null,
    [allVenues, selectedVenueId]
  );

  const selectedChatMeetup = useMemo(() => {
    if (selectedPrivateChatId) {
      return null;
    }

    const explicitSelection =
      selectedChatMeetupId === null
        ? null
        : effectiveChatMeetups.find(
            (item) => item.id === selectedChatMeetupId && (item.isMember || item.isCreator)
          ) ?? null;

    if (explicitSelection) {
      return explicitSelection;
    }

    if (selectedMeetup && (selectedMeetup.isMember || selectedMeetup.isCreator)) {
      return selectedMeetup;
    }

    return effectiveChatMeetups[0] ?? null;
  }, [effectiveChatMeetups, selectedChatMeetupId, selectedMeetup, selectedPrivateChatId]);

  const effectiveSelectedChatMeetup = useMemo(
    () =>
      selectedChatMeetup
        ? {
            ...selectedChatMeetup,
            status: resolveMeetupEffectiveStatus(selectedChatMeetup, nowTimestamp),
          }
        : null,
    [nowTimestamp, selectedChatMeetup]
  );

  const selectedChatAllowsMessages =
    selectedPrivateChatId && privateChatPeer
      ? privateChatPeer.canSendMessages
      : effectiveSelectedChatMeetup !== null &&
        effectiveSelectedChatMeetup.status !== "closed" &&
        effectiveSelectedChatMeetup.status !== "cancelled";

  const canRateSelectedChatMeetup =
    !selectedPrivateChatId &&
    effectiveSelectedChatMeetup !== null &&
    new Date(effectiveSelectedChatMeetup.startsAt).getTime() <= Date.now() - 15 * 60 * 1000;
  const selectedChatIsDemo = isDemoId(effectiveSelectedChatMeetup?.id);
  const effectiveMeetupPresence = useMemo(
    () =>
      effectiveSelectedChatMeetup && selectedChatIsDemo
        ? demoMeetupPresenceById[effectiveSelectedChatMeetup.id] ??
          demoBundle.meetupPresenceById[effectiveSelectedChatMeetup.id] ??
          []
        : meetupPresence,
    [
      demoBundle.meetupPresenceById,
      demoMeetupPresenceById,
      effectiveSelectedChatMeetup,
      meetupPresence,
      selectedChatIsDemo,
    ]
  );

  const loadSheetMeetupPresence = useCallback(
    async (meetupId: string) => {
      if (isDemoId(meetupId)) {
        const next =
          demoMeetupPresenceById[meetupId] ?? demoBundle.meetupPresenceById[meetupId] ?? [];
        setSheetMeetupPresenceById((current) => ({ ...current, [meetupId]: next }));
        return;
      }

      setSheetMeetupPresenceLoadingId(meetupId);
      try {
        const result = await getMeetupMemberPresence(meetupId);
        setSheetMeetupPresenceById((current) => ({ ...current, [meetupId]: result }));
      } catch (fetchError) {
        setMessageError(toMessage(fetchError));
      } finally {
        setSheetMeetupPresenceLoadingId((prev) => (prev === meetupId ? null : prev));
      }
    },
    [demoBundle.meetupPresenceById, demoMeetupPresenceById]
  );

  const resolvePresenceForSheetMeetup = useCallback(
    (meetup: MeetupPost) => {
      if (effectiveSelectedChatMeetup?.id === meetup.id) {
        return effectiveMeetupPresence;
      }

      if (isDemoId(meetup.id)) {
        return (
          demoMeetupPresenceById[meetup.id] ??
          demoBundle.meetupPresenceById[meetup.id] ??
          sheetMeetupPresenceById[meetup.id] ??
          []
        );
      }

      return sheetMeetupPresenceById[meetup.id] ?? [];
    },
    [
      demoBundle.meetupPresenceById,
      demoMeetupPresenceById,
      effectiveMeetupPresence,
      effectiveSelectedChatMeetup?.id,
      sheetMeetupPresenceById,
    ]
  );

  const resolveLoadingForSheetMeetup = useCallback(
    (meetup: MeetupPost) => {
      if (effectiveSelectedChatMeetup?.id === meetup.id) {
        return loadingMeetupPresence;
      }

      if (isDemoId(meetup.id)) {
        return false;
      }

      return sheetMeetupPresenceLoadingId === meetup.id;
    },
    [
      effectiveSelectedChatMeetup?.id,
      loadingMeetupPresence,
      sheetMeetupPresenceLoadingId,
    ]
  );

  const effectiveMessages = useMemo(
    () =>
      effectiveSelectedChatMeetup && selectedChatIsDemo
        ? demoMessagesByMeetupId[effectiveSelectedChatMeetup.id] ??
          demoBundle.messagesByMeetupId[effectiveSelectedChatMeetup.id] ??
          []
        : messages,
    [
      demoBundle.messagesByMeetupId,
      demoMessagesByMeetupId,
      effectiveSelectedChatMeetup,
      messages,
      selectedChatIsDemo,
    ]
  );
  const replyingToMessage = useMemo(
    () =>
      replyingToMessageId === null
        ? null
        : effectiveMessages.find((message) => message.id === replyingToMessageId) ?? null,
    [effectiveMessages, replyingToMessageId]
  );

  const unreadChatCount = useMemo(
    () =>
      effectiveNotifications.filter(
        (item) => item.readAt === null && item.kind === "message_received"
      ).length,
    [effectiveNotifications]
  );
  const unreadChatMeetupIds = useMemo(
    () =>
      new Set(
        effectiveNotifications
          .filter(
            (item) =>
              item.kind === "message_received" &&
              item.readAt === null &&
              typeof item.meetupId === "string" &&
              item.meetupId.length > 0
          )
          .map((item) => item.meetupId as string)
      ),
    [effectiveNotifications]
  );
  const unreadPrivateChatIds = useMemo(
    () =>
      new Set(
        effectiveNotifications
          .filter(
            (item) =>
              item.kind === "message_received" &&
              item.readAt === null &&
              typeof item.privateChatId === "string" &&
              item.privateChatId.length > 0
          )
          .map((item) => item.privateChatId as string)
      ),
    [effectiveNotifications]
  );
  const unreadAlertCount = useMemo(
    () =>
      effectiveNotifications.filter(
        (item) => item.readAt === null && item.kind !== "message_received"
      ).length,
    [effectiveNotifications]
  );
  const hasUnreadMenuIndicator =
    unreadChatCount > 0 || unreadAlertCount > 0 || unreadAppNewsCount > 0;

  const onlineFriends = useMemo(
    () => effectiveFriends.filter((friend) => friend.state === "friend" && friend.isOnline),
    [effectiveFriends]
  );

  const incomingFriendRequests = useMemo(
    () => effectiveFriends.filter((friend) => friend.state === "incoming"),
    [effectiveFriends]
  );
  const incomingFriendRequestsCount = incomingFriendRequests.length;

  const acceptedFriends = useMemo(
    () => effectiveFriends.filter((friend) => friend.state === "friend"),
    [effectiveFriends]
  );

  const outgoingFriendRequests = useMemo(
    () => effectiveFriends.filter((friend) => friend.state === "outgoing"),
    [effectiveFriends]
  );
  const relationshipStateByUserId = useMemo(() => {
    const map = new Map<string, PublicPlayerProfile["relationshipState"]>();

    effectiveFriends.forEach((friend) => {
      map.set(friend.userId, friend.state);
    });

    return map;
  }, [effectiveFriends]);

  useEffect(() => {
    setPlayerSearchResults((current) => {
      let changed = false;

      const next = current.map((player) => {
        const relationshipState = relationshipStateByUserId.get(player.userId) ?? "none";

        if (player.relationshipState === relationshipState) {
          return player;
        }

        changed = true;
        return {
          ...player,
          relationshipState,
        };
      });

      return changed ? next : current;
    });

    setViewedPlayerProfile((current) => {
      if (!current) {
        return current;
      }

      const relationshipState = relationshipStateByUserId.get(current.userId) ?? "none";

      if (current.relationshipState === relationshipState) {
        return current;
      }

      return {
        ...current,
        relationshipState,
      };
    });
  }, [relationshipStateByUserId]);

  useEffect(() => {
    if (!friendSuccess) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setFriendSuccess((current) => (current === friendSuccess ? null : current));
    }, 3200);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [friendSuccess]);

  useEffect(() => {
    if (!blockedUsersSuccess) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setBlockedUsersSuccess((current) => (current === blockedUsersSuccess ? null : current));
    }, 3200);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [blockedUsersSuccess]);

  const activeChatMeetups = useMemo(
    () =>
      effectiveChatMeetups
        .filter((meetup) => {
          const effectiveStatus = resolveMeetupEffectiveStatus(meetup, nowTimestamp);
          return effectiveStatus !== "closed" && effectiveStatus !== "cancelled";
        })
        .sort((left, right) =>
          compareMeetups(left, right, {
            mode: "distance_asc",
            profileLat: profile.lat,
            profileLng: profile.lng,
            nowTimestamp,
          })
        ),
    [effectiveChatMeetups, nowTimestamp, profile.lat, profile.lng]
  );

  const archivedChatMeetups = useMemo(
    () =>
      effectiveChatMeetups
        .filter((meetup) => {
          const effectiveStatus = resolveMeetupEffectiveStatus(meetup, nowTimestamp);
          return effectiveStatus === "closed" || effectiveStatus === "cancelled";
        })
        .sort((left, right) =>
          compareMeetups(left, right, {
            mode: "date_desc",
            profileLat: profile.lat,
            profileLng: profile.lng,
            nowTimestamp,
          })
        ),
    [effectiveChatMeetups, nowTimestamp, profile.lat, profile.lng]
  );

  const memberMeetupsByGame = useMemo(
    () => buildChatGroupsByGame(activeChatMeetups),
    [activeChatMeetups]
  );
  const chatListSections = useMemo<ChatListSection[]>(() => {
    const sections: ChatListSection[] = memberMeetupsByGame.map((game) => ({
      id: game.id,
      title: game.label,
      meta: `${game.chats.length} grupo(s) em que você participa`,
      chats: game.chats,
      expanded: expandedChatGroupIds[game.id] ?? true,
    }));

    if (archivedChatMeetups.length) {
      sections.push({
        id: "archived",
        title: "Encerrados",
        meta: `${archivedChatMeetups.length} grupo(s) encerrado(s) ou cancelado(s)`,
        chats: archivedChatMeetups,
        expanded: expandedChatGroupIds.archived ?? true,
        archived: true,
      });
    }

    return sections;
  }, [archivedChatMeetups, expandedChatGroupIds, memberMeetupsByGame]);

  useEffect(() => {
    setExpandedChatGroupIds((current) => {
      const next: Record<string, boolean> = {};

      memberMeetupsByGame.forEach((group) => {
        next[group.id] = current[group.id] ?? true;
      });
      if (archivedChatMeetups.length) {
        next.archived = current.archived ?? true;
      }

      const sameKeys =
        Object.keys(current).length === Object.keys(next).length &&
        Object.keys(next).every((key) => current[key] === next[key]);

      return sameKeys ? current : next;
    });
  }, [archivedChatMeetups.length, memberMeetupsByGame]);

  useEffect(() => {
    setExpandedDrawerChatGroupIds((current) => {
      const next: Record<string, boolean> = {};

      memberMeetupsByGame.forEach((group) => {
        next[group.id] = current[group.id] ?? true;
      });
      if (archivedChatMeetups.length) {
        next.archived = current.archived ?? true;
      }

      const sameKeys =
        Object.keys(current).length === Object.keys(next).length &&
        Object.keys(next).every((key) => current[key] === next[key]);

      return sameKeys ? current : next;
    });
  }, [archivedChatMeetups.length, memberMeetupsByGame]);

  const recentPlayers = useMemo(() => {
    const playersByUserId = new Map<string, RecentPlayerCard>();

    const considerPlayer = (candidate: FriendActionCandidate, playedAt: string) => {
      if (candidate.userId === profile.userId) {
        return;
      }

      const nextPlayedAt = new Date(playedAt).getTime();
      const existing = playersByUserId.get(candidate.userId);
      const existingPlayedAt = existing ? new Date(existing.playedAt).getTime() : -Infinity;

      if (existing && existingPlayedAt >= nextPlayedAt) {
        return;
      }

      playersByUserId.set(candidate.userId, {
        ...candidate,
        relationshipState: relationshipStateByUserId.get(candidate.userId) ?? "none",
        playedAt,
      });
    };

    [...memberMeetups]
      .sort((left, right) => new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime())
      .forEach((meetup) => {
        if (meetup.creatorUserId !== profile.userId) {
          considerPlayer(
            {
              userId: meetup.creatorUserId,
              displayName: meetup.creatorDisplayName,
              handle: meetup.creatorHandle,
              neighborhood: meetup.creatorNeighborhood,
              bio: meetup.creatorBio,
              avatarPath: null,
              avatarUrl: null,
              isOnline: false,
              lastSeenAt: null,
            },
            meetup.startsAt
          );
        }
      });

    if (playersByUserId.size < 3) {
      [...demoBundle.chatMeetups]
        .sort((left, right) => new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime())
        .forEach((meetup) => {
          if (meetup.creatorUserId !== profile.userId) {
            considerPlayer(
              {
                userId: meetup.creatorUserId,
                displayName: meetup.creatorDisplayName,
                handle: meetup.creatorHandle,
                neighborhood: meetup.creatorNeighborhood,
                bio: meetup.creatorBio,
                avatarPath: null,
                avatarUrl: null,
                isOnline: false,
                lastSeenAt: null,
              },
              meetup.startsAt
            );
          }

          (demoBundle.meetupPresenceById[meetup.id] ?? []).forEach((member) => {
            considerPlayer(
              {
                userId: member.userId,
                displayName: member.displayName,
                handle: member.handle,
                neighborhood: meetup.locationHint,
                bio: describeDemoPlayer(member.handle),
                avatarPath: member.avatarPath,
                avatarUrl: member.avatarUrl,
                isOnline:
                  member.attendanceStatus === "confirmed" ||
                  member.attendanceStatus === "on_the_way" ||
                  member.attendanceStatus === "arrived",
                lastSeenAt: null,
              },
              meetup.startsAt
            );
          });
        });
    }

    return [...playersByUserId.values()]
      .sort((left, right) => new Date(right.playedAt).getTime() - new Date(left.playedAt).getTime())
      .slice(0, 3);
  }, [demoBundle, memberMeetups, profile.userId, relationshipStateByUserId]);

  const incomingRequestForViewedPlayer = useMemo(
    () =>
      viewedPlayerProfile
        ? incomingFriendRequests.find((friend) => friend.userId === viewedPlayerProfile.userId) ?? null
        : null,
    [incomingFriendRequests, viewedPlayerProfile]
  );

  const previewMeetupIds = useMemo(
    () =>
      gamesSheetPreviewMode && gamesSheetSection === "meetups" && selectedMapGroup?.meetupIds.length
        ? new Set(selectedMapGroup.meetupIds)
        : null,
    [gamesSheetPreviewMode, gamesSheetSection, selectedMapGroup]
  );

  const previewVenueIds = useMemo(
    () =>
      gamesSheetPreviewMode && gamesSheetSection === "venues" && selectedMapGroup?.venueIds.length
        ? new Set(selectedMapGroup.venueIds)
        : null,
    [gamesSheetPreviewMode, gamesSheetSection, selectedMapGroup]
  );

  const visibleMeetupsForSheet = useMemo(
    () =>
      previewMeetupIds
        ? filteredMeetups.filter((meetup) => previewMeetupIds.has(meetup.id))
        : filteredMeetups,
    [filteredMeetups, previewMeetupIds]
  );

  const displayMeetupsForSheet = useMemo(
    () =>
      hidePastMeetups
        ? visibleMeetupsForSheet.filter((meetup) => !isMeetupOverdue(meetup, nowTimestamp))
        : visibleMeetupsForSheet,
    [hidePastMeetups, nowTimestamp, visibleMeetupsForSheet]
  );

  const visibleVenuesForSheet = useMemo(
    () =>
      previewVenueIds
        ? filteredVenues.filter((venue) => previewVenueIds.has(venue.id))
        : filteredVenues,
    [filteredVenues, previewVenueIds]
  );

  const shouldPrioritizeSelectedMeetup =
    Boolean(gamesSheetPreviewMode || selectedMapGroup?.meetupIds.length) && selectedMeetupId !== null;
  const shouldPrioritizeSelectedVenue =
    Boolean(gamesSheetPreviewMode || selectedMapGroup?.venueIds.length) && selectedVenueId !== null;

  const sortedVisibleMeetupsForSheet = useMemo(
    () =>
      [...displayMeetupsForSheet].sort((left, right) =>
        compareMeetups(left, right, {
          mode: meetupSortMode,
          profileLat: profile.lat,
          profileLng: profile.lng,
          nowTimestamp,
          prioritizeMeetupId: shouldPrioritizeSelectedMeetup ? selectedMeetupId : null,
        })
      ),
    [
      meetupSortMode,
      nowTimestamp,
      profile.lat,
      profile.lng,
      selectedMeetupId,
      shouldPrioritizeSelectedMeetup,
      displayMeetupsForSheet,
    ]
  );

  const sortedFilteredVenues = useMemo(
    () =>
      [...filteredVenues].sort((left, right) =>
        compareVenuesByDistance(left, right, {
          profileLat: profile.lat,
          profileLng: profile.lng,
        })
      ),
    [filteredVenues, profile.lat, profile.lng]
  );

  const mapFeedByGame = useMemo(() => {
    const groups = new Map<
      string,
      {
        id: string;
        label: string;
        meetups: MeetupPost[];
      }
    >();

    function ensureGroup(gameLabel: string) {
      const groupId = slugifyGameLabel(gameLabel);
      const existing = groups.get(groupId);

      if (existing) {
        return existing;
      }

      const created = {
        id: groupId,
        label: gameLabel,
        meetups: [] as MeetupPost[],
      };

      groups.set(groupId, created);
      return created;
    }

    sortedVisibleMeetupsForSheet.forEach((meetup) => {
      ensureGroup(inferGameNameFromMeetup(meetup)).meetups.push(meetup);
    });

    return Array.from(groups.values());
  }, [sortedVisibleMeetupsForSheet]);

  const orderedGameGroups = useMemo(
    () =>
      mapFeedByGame.map((group) => ({
        ...group,
        meetups: [...group.meetups].sort((left, right) =>
          compareMeetups(left, right, {
            mode: meetupSortMode,
            profileLat: profile.lat,
            profileLng: profile.lng,
            nowTimestamp,
            prioritizeMeetupId: shouldPrioritizeSelectedMeetup ? selectedMeetupId : null,
          })
        ),
      })),
    [
      mapFeedByGame,
      meetupSortMode,
      nowTimestamp,
      profile.lat,
      profile.lng,
      selectedMeetupId,
      shouldPrioritizeSelectedMeetup,
    ]
  );

  const orderedVenues = useMemo(
    () =>
      [...visibleVenuesForSheet].sort((left, right) => {
        if (shouldPrioritizeSelectedVenue && left.id === selectedVenueId) {
          return -1;
        }

        if (shouldPrioritizeSelectedVenue && right.id === selectedVenueId) {
          return 1;
        }

        return compareVenuesByDistance(left, right, {
          profileLat: profile.lat,
          profileLng: profile.lng,
        });
      }),
    [
      profile.lat,
      profile.lng,
      selectedVenueId,
      shouldPrioritizeSelectedVenue,
      visibleVenuesForSheet,
    ]
  );

  const renderMeetupSheetListItem = (
    meetup: MeetupPost,
    openDetail: () => void,
    separator: boolean
  ) => (
    <MeetupSheetListRowContainer
      meetup={meetup}
      profileLat={profile.lat}
      profileLng={profile.lng}
      nowTimestamp={nowTimestamp}
      selectedMeetupId={selectedMeetupId}
      separator={separator}
      onPress={() => {
        setSelectedMeetupId(meetup.id);
        openDetail();
      }}
    />
  );

  const renderMeetupSheetDetail = (
    meetup: MeetupPost,
    openManage: () => void,
    openParticipants: () => void
  ) => (
    <MeetupSheetCardContainer
      mode="detail"
      meetup={meetup}
      profileLat={profile.lat}
      profileLng={profile.lng}
      nowTimestamp={nowTimestamp}
      selectedMeetupId={selectedMeetupId}
      expandedMeetupInfoId={expandedMeetupInfoId}
      expandedMeetupManageId={expandedMeetupManageId}
      joiningMeetupId={joiningMeetupId}
      leavingMeetupId={leavingMeetupId}
      updatingMeetupAction={updatingMeetupAction}
      updatingMeetupLocationId={updatingMeetupLocationId}
      deletingEntityId={deletingEntityId}
      manageDateLabel={manageDate ? formatComposerDateLabel(manageDate) : "Escolha a data"}
      manageHour={manageHour}
      manageMinute={manageMinute}
      manageAddressQuery={manageAddressQuery}
      manageAddressFocused={manageAddressFocused}
      manageAddressSuggestions={manageAddressSuggestions}
      manageAddressLoading={manageAddressLoading}
      onFocusMeetupOnMap={() => focusMeetupOnMap(meetup.id)}
      onShareMeetup={() => setMapShareOverlayTarget({ kind: "meetup", meetup })}
      onOpenPlayerProfile={() => openPlayerProfile(meetup.creatorUserId)}
      onJoinMeetup={() => void handleJoinMeetup(meetup.id)}
      onLeaveMeetup={() => void handleLeaveMeetup(meetup.id)}
      onOpenChat={() => openChat(meetup.id)}
      onToggleManage={() => {
        setSelectedMeetupId(meetup.id);
        openManage();
        setExpandedMeetupInfoId((current) => (current === meetup.id ? null : current));
      }}
      onToggleInfo={() => {
        setSelectedMeetupId(meetup.id);
        setExpandedMeetupInfoId((current) => (current === meetup.id ? null : meetup.id));
        setExpandedMeetupManageId((current) => (current === meetup.id ? null : current));
      }}
      onOpenManageCalendar={() =>
        dismissKeyboardThen(() => {
          setManageTimePickerOpen(false);
          setManageCalendarMonthCursor(
            startOfCalendarMonth(
              parseComposerDate(manageDate ?? toCalendarDateKey(new Date()))
            )
          );
          setManageCalendarOpen(true);
        })
      }
      onOpenManageTimePicker={() =>
        dismissKeyboardThen(() => {
          setManageCalendarOpen(false);
          setManageTimePickerOpen(true);
        })
      }
      onOpenDetailParticipants={openParticipants}
      onManageAddressFocusChange={setManageAddressFocused}
      onManageAddressChange={(value) => {
        setManageAddressQuery(value);
        setManageSelectedAddress(null);
      }}
      onManageAddressUseCurrentLocation={() => {
        void handleUseCurrentLocationForManage();
      }}
      onManageAddressUseTyped={() => {
        void handleUseTypedAddressForManageMeetup();
      }}
      onManageAddressSelect={(suggestion) => {
        setManageSelectedAddress(suggestion);
        setManageAddressQuery(suggestion.fullLabel);
        setManageAddressSuggestions([]);
      }}
      onSaveEdits={() => void handleSaveMeetupEdits(meetup)}
      onPromptClose={() => promptMeetupStatusChange(meetup, "closed")}
      onPromptCancel={() => promptMeetupStatusChange(meetup, "cancelled")}
      onPromptDelete={() => promptDeleteMeetup(meetup)}
    />
  );

  const renderMeetupSheetManage = (
    meetup: MeetupPost,
    openManageParticipants: () => void
  ) => (
    <MeetupSheetCardContainer
      mode="manage"
      meetup={meetup}
      profileLat={profile.lat}
      profileLng={profile.lng}
      nowTimestamp={nowTimestamp}
      selectedMeetupId={selectedMeetupId}
      expandedMeetupInfoId={expandedMeetupInfoId}
      expandedMeetupManageId={expandedMeetupManageId}
      joiningMeetupId={joiningMeetupId}
      leavingMeetupId={leavingMeetupId}
      updatingMeetupAction={updatingMeetupAction}
      updatingMeetupLocationId={updatingMeetupLocationId}
      deletingEntityId={deletingEntityId}
      manageDateLabel={manageDate ? formatComposerDateLabel(manageDate) : "Escolha a data"}
      manageHour={manageHour}
      manageMinute={manageMinute}
      manageAddressQuery={manageAddressQuery}
      manageAddressFocused={manageAddressFocused}
      manageAddressSuggestions={manageAddressSuggestions}
      manageAddressLoading={manageAddressLoading}
      onFocusMeetupOnMap={() => focusMeetupOnMap(meetup.id)}
      onOpenPlayerProfile={() => openPlayerProfile(meetup.creatorUserId)}
      onJoinMeetup={() => void handleJoinMeetup(meetup.id)}
      onLeaveMeetup={() => void handleLeaveMeetup(meetup.id)}
      onOpenChat={() => openChat(meetup.id)}
      onToggleManage={() => {
        setSelectedMeetupId(meetup.id);
      }}
      onToggleInfo={() => {
        setSelectedMeetupId(meetup.id);
        setExpandedMeetupInfoId((current) => (current === meetup.id ? null : meetup.id));
        setExpandedMeetupManageId((current) => (current === meetup.id ? null : current));
      }}
      onOpenManageCalendar={() =>
        dismissKeyboardThen(() => {
          setManageTimePickerOpen(false);
          setManageCalendarMonthCursor(
            startOfCalendarMonth(
              parseComposerDate(manageDate ?? toCalendarDateKey(new Date()))
            )
          );
          setManageCalendarOpen(true);
        })
      }
      onOpenManageTimePicker={() =>
        dismissKeyboardThen(() => {
          setManageCalendarOpen(false);
          setManageTimePickerOpen(true);
        })
      }
      onOpenManageParticipants={openManageParticipants}
      onManageAddressFocusChange={setManageAddressFocused}
      onManageAddressChange={(value) => {
        setManageAddressQuery(value);
        setManageSelectedAddress(null);
      }}
      onManageAddressUseCurrentLocation={() => {
        void handleUseCurrentLocationForManage();
      }}
      onManageAddressUseTyped={() => {
        void handleUseTypedAddressForManageMeetup();
      }}
      onManageAddressSelect={(suggestion) => {
        setManageSelectedAddress(suggestion);
        setManageAddressQuery(suggestion.fullLabel);
        setManageAddressSuggestions([]);
      }}
      onSaveEdits={() => void handleSaveMeetupEdits(meetup)}
      onPromptClose={() => promptMeetupStatusChange(meetup, "closed")}
      onPromptCancel={() => promptMeetupStatusChange(meetup, "cancelled")}
      onPromptDelete={() => promptDeleteMeetup(meetup)}
    />
  );

  const renderMeetupSheetParticipants = (meetup: MeetupPost) => (
    <MeetupSheetParticipantsScene
      meetup={meetup}
      meetupPresence={resolvePresenceForSheetMeetup(meetup)}
      loadingMeetupPresence={resolveLoadingForSheetMeetup(meetup)}
      onOpenPlayerProfile={openPlayerProfile}
      onRemoveParticipant={(userId) => {
        const member = resolvePresenceForSheetMeetup(meetup).find((m) => m.userId === userId);
        if (member) {
          promptRemoveMeetupMember(member, meetup);
        }
      }}
      removingParticipantId={removingMeetupMemberId}
      onRequestPresence={loadSheetMeetupPresence}
    />
  );

  const renderVenueSheetListItem = (
    venue: VenueCard,
    openDetail: () => void,
    separator: boolean
  ) => (
    <VenueSheetListRowContainer
      venue={venue}
      profileLat={profile.lat}
      profileLng={profile.lng}
      selectedVenueId={selectedVenueId}
      profileUserId={profile.userId}
      separator={separator}
      onPress={() => {
        setSelectedVenueId(venue.id);
        openDetail();
      }}
    />
  );

  const renderVenueSheetDetail = (venue: VenueCard, openManage: () => void) => (
    <VenueSheetCardContainer
      mode="detail"
      venue={venue}
      profileLat={profile.lat}
      profileLng={profile.lng}
      profileUserId={profile.userId}
      selectedVenueId={selectedVenueId}
      updatingVenueId={updatingVenueId}
      deletingEntityId={deletingEntityId}
      manageVenueName={manageVenueName}
      manageVenueAddressQuery={manageVenueAddressQuery}
      manageVenueAddressFocused={manageVenueAddressFocused}
      manageVenueAddressSuggestions={manageVenueAddressSuggestions}
      manageVenueAddressLoading={manageVenueAddressLoading}
      manageVenueDetails={manageVenueDetails}
      manageVenueKind={manageVenueKind}
      manageVenueGameIds={manageVenueGameIds}
      venueKindOptions={venueKindOptions}
      venueGameOptions={venueGameOptions}
      onFocusVenueOnMap={() => focusVenueOnMap(venue.id)}
      onShareVenue={() => setMapShareOverlayTarget({ kind: "venue", venue })}
      onCreateMeetupAtVenue={() => {
        setSelectedVenueId(venue.id);
        openComposerSheet();
      }}
      onToggleManage={() => {
        setSelectedVenueId(venue.id);
        openManage();
      }}
      onManageVenueNameChange={setManageVenueName}
      onManageVenueAddressFocusChange={setManageVenueAddressFocused}
      onManageVenueAddressChange={(value) => {
        setManageVenueAddressQuery(value);
        setManageVenueSelectedAddress(null);
      }}
      onManageVenueAddressUseCurrentLocation={() => {
        void handleUseCurrentLocationForManageVenue();
      }}
      onManageVenueAddressUseTyped={() => {
        void handleResolveTypedManageVenueAddress();
      }}
      onManageVenueAddressSelect={(suggestion) => {
        setManageVenueSelectedAddress(suggestion);
        setManageVenueAddressQuery(suggestion.fullLabel);
        setManageVenueAddressSuggestions([]);
        if (suggestion.subtitle) {
          setManageVenueNeighborhood(suggestion.subtitle);
        }
      }}
      onManageVenueDetailsChange={setManageVenueDetails}
      onSelectManageVenueKind={setManageVenueKind}
      onToggleManageVenueGame={(gameId) =>
        setManageVenueGameIds((current) =>
          current.includes(gameId)
            ? current.filter((item) => item !== gameId)
            : [...current, gameId]
        )
      }
      onSaveVenueEdits={() => void handleSaveVenueEdits(venue)}
      onPromptDeleteVenue={() => promptDeleteVenue(venue)}
    />
  );

  const renderVenueSheetManage = (venue: VenueCard) => (
    <VenueSheetCardContainer
      mode="manage"
      venue={venue}
      profileLat={profile.lat}
      profileLng={profile.lng}
      profileUserId={profile.userId}
      selectedVenueId={selectedVenueId}
      updatingVenueId={updatingVenueId}
      deletingEntityId={deletingEntityId}
      manageVenueName={manageVenueName}
      manageVenueAddressQuery={manageVenueAddressQuery}
      manageVenueAddressFocused={manageVenueAddressFocused}
      manageVenueAddressSuggestions={manageVenueAddressSuggestions}
      manageVenueAddressLoading={manageVenueAddressLoading}
      manageVenueDetails={manageVenueDetails}
      manageVenueKind={manageVenueKind}
      manageVenueGameIds={manageVenueGameIds}
      venueKindOptions={venueKindOptions}
      venueGameOptions={venueGameOptions}
      onFocusVenueOnMap={() => focusVenueOnMap(venue.id)}
      onCreateMeetupAtVenue={() => {
        setSelectedVenueId(venue.id);
        openComposerSheet();
      }}
      onManageVenueNameChange={setManageVenueName}
      onManageVenueAddressFocusChange={setManageVenueAddressFocused}
      onManageVenueAddressChange={(value) => {
        setManageVenueAddressQuery(value);
        setManageVenueSelectedAddress(null);
      }}
      onManageVenueAddressUseCurrentLocation={() => {
        void handleUseCurrentLocationForManageVenue();
      }}
      onManageVenueAddressUseTyped={() => {
        void handleResolveTypedManageVenueAddress();
      }}
      onManageVenueAddressSelect={(suggestion) => {
        setManageVenueSelectedAddress(suggestion);
        setManageVenueAddressQuery(suggestion.fullLabel);
        setManageVenueAddressSuggestions([]);
        if (suggestion.subtitle) {
          setManageVenueNeighborhood(suggestion.subtitle);
        }
      }}
      onManageVenueDetailsChange={setManageVenueDetails}
      onSelectManageVenueKind={setManageVenueKind}
      onToggleManageVenueGame={(gameId) =>
        setManageVenueGameIds((current) =>
          current.includes(gameId)
            ? current.filter((item) => item !== gameId)
            : [...current, gameId]
        )
      }
      onSaveVenueEdits={() => void handleSaveVenueEdits(venue)}
      onPromptDeleteVenue={() => promptDeleteVenue(venue)}
    />
  );

  const venuesSheetComposer = (
    <MapCircleActionButton
      icon="add"
      pillLabel="Novo Local"
      accessibilityLabel="Novo Local"
      onPress={() => setVenueComposerOpen(true)}
    />
  );

  const gamesSheetTop = insets.top + 92;
  const gamesSheetHeight = Math.max(height - gamesSheetTop + insets.bottom, 420);
  const composerTopGap = insets.top + 72;
  const composerSheetHeight = Math.max(height - composerTopGap, 560);
  const composerFooterReserve = 104 + insets.bottom;
  const defaultGamesSheetPeek = 150;
  const previewGamesSheetPeek = Math.min(Math.max(380, height * 0.48), 448);
  const gamesSheetPeek = gamesSheetPreviewMode ? previewGamesSheetPeek : defaultGamesSheetPeek;
  const filterCloseTop = insets.top + 10 + 56 + 10;
  const filterPanelTop = filterCloseTop + 56 + spacing.sm;
  const filterPanelMaxHeight = Math.min(
    Math.max(height - filterPanelTop - insets.bottom - spacing.lg, 360),
    620
  );
  const defaultCollapsedGamesSheetOffset = Math.max(gamesSheetHeight - defaultGamesSheetPeek, 0);
  const previewGamesSheetOffset = Math.max(gamesSheetHeight - previewGamesSheetPeek, 0);
  const collapsedGamesSheetOffset = defaultCollapsedGamesSheetOffset;
  const gamesSheetTranslateY = useRef(new Animated.Value(collapsedGamesSheetOffset)).current;
  const currentGamesSheetValueRef = useRef(collapsedGamesSheetOffset);
  const sheetPanStartRef = useRef(collapsedGamesSheetOffset);
  const gamesSheetExpandedRef = useRef(false);
  const gamesSheetPreviewModeRef = useRef(false);
  const gamesSectionTranslateX = useRef(new Animated.Value(0)).current;
  const gamesSectionOpacity = useRef(new Animated.Value(1)).current;
  const composerSheetTranslateY = useRef(new Animated.Value(0)).current;
  const currentComposerSheetValueRef = useRef(0);
  const pageTranslateY = useRef(new Animated.Value(height)).current;
  /** Horizontal slide for chat room when opened from chat list (right →). */
  const chatRoomTranslateX = useRef(new Animated.Value(0)).current;
  const currentChatRoomTranslateXRef = useRef(0);
  const chatRoomPanStartRef = useRef(0);
  const currentPageTranslateYRef = useRef(height);
  const pagePanStartRef = useRef(0);
  const pageLayerOpacity = useMemo(
    () =>
      pageTranslateY.interpolate({
        inputRange: [0, height * 0.32, height],
        outputRange: [1, 0.98, 0],
        extrapolate: "clamp",
      }),
    [height, pageTranslateY]
  );
  const pageLayerScale = useMemo(
    () =>
      pageTranslateY.interpolate({
        inputRange: [0, height],
        outputRange: [1, 0.988],
        extrapolate: "clamp",
      }),
    [height, pageTranslateY]
  );
  const dashboardRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const friendsRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notificationsRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const meetupPresenceRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapFeedRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastViewportFeedBoundsRef = useRef<ViewportFeedBounds | null>(null);
  const viewportFeedSupportedRef = useRef(true);

  useEffect(() => {
    const nextScreen =
      activeScreen === "map"
        ? "map_home"
        : activeScreen === "player"
          ? "player_profile"
          : activeScreen;

    analyticsScreen(nextScreen, {
      page_screen: activeScreen === "map" ? null : pageScreen,
      chat_view_mode: activeScreen === "chats" ? chatViewMode : null,
    });
  }, [activeScreen, chatViewMode, pageScreen]);

  useEffect(() => {
    const listenerId = gamesSheetTranslateY.addListener(({ value }) => {
      currentGamesSheetValueRef.current = value;
    });

    return () => {
      gamesSheetTranslateY.removeListener(listenerId);
    };
  }, [gamesSheetTranslateY]);

  useEffect(() => {
    gamesSheetExpandedRef.current = gamesSheetExpanded;
  }, [gamesSheetExpanded]);

  useEffect(() => {
    gamesSheetPreviewModeRef.current = gamesSheetPreviewMode;
  }, [gamesSheetPreviewMode]);

  useEffect(() => {
    const nextValue = gamesSheetExpandedRef.current
      ? 0
      : gamesSheetPreviewModeRef.current
        ? previewGamesSheetOffset
        : collapsedGamesSheetOffset;
    gamesSheetTranslateY.setValue(nextValue);
    currentGamesSheetValueRef.current = nextValue;
  }, [
    collapsedGamesSheetOffset,
    gamesSheetTranslateY,
    previewGamesSheetOffset,
  ]);

  useEffect(() => {
    const listenerId = composerSheetTranslateY.addListener(({ value }) => {
      currentComposerSheetValueRef.current = value;
    });

    return () => {
      composerSheetTranslateY.removeListener(listenerId);
    };
  }, [composerSheetTranslateY]);

  useEffect(() => {
    const listenerId = pageTranslateY.addListener(({ value }) => {
      currentPageTranslateYRef.current = value;
    });

    return () => {
      pageTranslateY.removeListener(listenerId);
    };
  }, [pageTranslateY]);

  useEffect(
    () => () => {
      if (dashboardRefreshTimerRef.current) {
        clearTimeout(dashboardRefreshTimerRef.current);
      }
      if (friendsRefreshTimerRef.current) {
        clearTimeout(friendsRefreshTimerRef.current);
      }
      if (notificationsRefreshTimerRef.current) {
        clearTimeout(notificationsRefreshTimerRef.current);
      }
      if (messagesRefreshTimerRef.current) {
        clearTimeout(messagesRefreshTimerRef.current);
      }
      if (meetupPresenceRefreshTimerRef.current) {
        clearTimeout(meetupPresenceRefreshTimerRef.current);
      }
    },
    []
  );

  useLayoutEffect(() => {
    if (!composerOpen && !venueComposerOpen) {
      return;
    }
    composerSheetTranslateY.setValue(COMPOSER_OPEN_OFFSET);
    currentComposerSheetValueRef.current = COMPOSER_OPEN_OFFSET;
    Animated.spring(composerSheetTranslateY, {
      toValue: 0,
      damping: 24,
      stiffness: 260,
      mass: 0.95,
      useNativeDriver: true,
    }).start();
  }, [composerOpen, venueComposerOpen, composerSheetTranslateY]);

  useEffect(() => {
    if (!composerOpen) {
      setCalendarOpen(false);
      setTimePickerOpen(false);
      setComposerKeyboardHeight(0);
    }
  }, [composerOpen]);

  useEffect(() => {
    if (!composerOpen) {
      return;
    }

    const handleKeyboardShow = (event: KeyboardEvent) => {
      const keyboardHeight = Math.max((event?.endCoordinates?.height ?? 0) - insets.bottom, 0);
      setComposerKeyboardHeight(keyboardHeight);
    };

    const handleKeyboardHide = () => {
      setComposerKeyboardHeight(0);
    };

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const frameEvent = Platform.OS === "ios" ? "keyboardWillChangeFrame" : "keyboardDidShow";

    const showSubscription = Keyboard.addListener(showEvent, handleKeyboardShow);
    const frameSubscription = Keyboard.addListener(frameEvent, handleKeyboardShow);
    const hideSubscription = Keyboard.addListener(hideEvent, handleKeyboardHide);

    return () => {
      showSubscription.remove();
      frameSubscription.remove();
      hideSubscription.remove();
    };
  }, [composerOpen, insets.bottom]);

  useEffect(() => {
    if (selectedVenueGameIds.length || !venueGameOptions.length) {
      return;
    }

    setSelectedVenueGameIds([venueGameOptions[0].id]);
  }, [selectedVenueGameIds.length, venueGameOptions]);

  const gamesSheetPanResponder = useGamesSheetPanResponder({
    defaultCollapsedGamesSheetOffset,
    venueComposerOpen,
    gamesSheetTranslateY,
    currentGamesSheetValueRef,
    sheetPanStartRef,
    snapGamesSheetToNearestRef,
    cancelVenueComposerRef,
  });

  const gamesSheetSectionPanResponder = useGamesSheetSectionPanResponder({
    gamesSheetSection,
    gamesSectionTranslateX,
    gamesSectionOpacity,
    switchGamesSheetSectionRef,
  });

  const pageDismissPanResponder = usePageDismissPanResponder({
    activeScreen,
    height,
    pageTranslateY,
    currentPageTranslateYRef,
    pagePanStartRef,
    animatePageInRef,
    closeCurrentPageToMapRef,
    closePlayerProfileRef,
  });

  const animateDrawerVisibility = useCallback(
    (open: boolean, onComplete?: () => void) => {
      Animated.parallel([
        Animated.spring(drawerTranslateX, {
          toValue: open ? 0 : -drawerWidth,
          damping: 28,
          stiffness: 250,
          mass: 0.96,
          overshootClamping: true,
          useNativeDriver: true,
        }),
        Animated.timing(drawerBackdropOpacity, {
          toValue: open ? 1 : 0,
          duration: open ? 220 : 180,
          easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          onComplete?.();
        }
      });
    },
    [drawerBackdropOpacity, drawerTranslateX, drawerWidth]
  );

  const drawerPanResponders = useDrawerPanResponders({
    edgeSwipeEnabled:
      activeScreen === "map" && !drawerOpen && !filtersOpen && !composerOpen && !venueComposerOpen,
    drawerOpen,
    drawerWidth,
    drawerTranslateX,
    drawerBackdropOpacity,
    currentDrawerTranslateXRef,
    drawerPanStartRef,
    animateDrawerVisibility,
    onOpenDrawer: () => {
      openDrawer();
    },
    onCloseDrawer: () => {
      dismissPinCallout();
      animateDrawerVisibility(false, () => {
        setDrawerOpen(false);
        closeDrawerSubmenus();
      });
    },
  });

  const chatRoomBackPanResponder = useChatRoomBackPanResponder({
    enabled: activeScreen === "chats" && chatViewMode === "room",
    screenWidth: width,
    chatRoomTranslateX,
    currentChatRoomTranslateXRef,
    chatRoomPanStartRef,
    onBack: () => closeChatScreen({ animateRoomExit: true }),
  });

  useEffect(() => {
    const translateListenerId = drawerTranslateX.addListener(({ value }) => {
      currentDrawerTranslateXRef.current = value;
    });

    return () => {
      drawerTranslateX.removeListener(translateListenerId);
    };
  }, [drawerTranslateX]);

  useEffect(() => {
    if (!drawerOpen && previousDrawerWidthRef.current !== drawerWidth) {
      drawerTranslateX.setValue(-drawerWidth);
      drawerBackdropOpacity.setValue(0);
    }

    previousDrawerWidthRef.current = drawerWidth;
  }, [drawerBackdropOpacity, drawerOpen, drawerTranslateX, drawerWidth]);

  useEffect(() => {
    animateDrawerVisibility(drawerOpen);
  }, [animateDrawerVisibility, drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) {
      drawerPanelProgress.setValue(0);
      setDrawerPanel("root");
      setExpandedDrawerChatGroupIds({});
    }
  }, [drawerOpen, drawerPanelProgress]);

  useEffect(() => {
    void loadDashboardRef.current();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedMeetupId && !allMeetups.some((item) => item.id === selectedMeetupId)) {
      setSelectedMeetupId(null);
    }
  }, [allMeetups, selectedMeetupId]);

  useEffect(() => {
    if (selectedVenueId && !allVenues.some((item) => item.id === selectedVenueId)) {
      setSelectedVenueId(null);
    }
  }, [allVenues, selectedVenueId]);

  useEffect(() => {
    if (!selectedMeetupId) {
      return;
    }

    const meetup = allMeetups.find((item) => item.id === selectedMeetupId);

    if (!meetup) {
      return;
    }

    const groupId = slugifyGameLabel(inferGameNameFromMeetup(meetup));
    setExpandedGameGroups((current) => ({
      ...current,
      [groupId]: true,
    }));
  }, [allMeetups, selectedMeetupId]);

  useEffect(() => {
    if (gamesSheetSection !== "meetups" || !gamesSheetExpanded) {
      setMeetupSortMenuOpen(false);
    }
  }, [gamesSheetExpanded, gamesSheetSection]);

  useEffect(() => {
    if (
      selectedChatMeetupId &&
      !allMeetups.some(
        (item) => item.id === selectedChatMeetupId && (item.isMember || item.isCreator)
      )
    ) {
      setSelectedChatMeetupId(null);
    }
  }, [allMeetups, selectedChatMeetupId]);

  useEffect(() => {
    if (!meetups.length) {
      return;
    }

    setOptimisticMeetups((current) =>
      current.filter((item) => !meetups.some((realMeetup) => realMeetup.id === item.id))
    );
  }, [meetups]);

  useEffect(() => {
    if (!venues.length) {
      return;
    }

    setOptimisticVenues((current) =>
      current.filter((item) => !venues.some((realVenue) => realVenue.id === item.id))
    );
  }, [venues]);

  useEffect(() => {
    setReplyingToMessageId(null);
  }, [selectedChatMeetup?.id]);

  useEffect(() => {
    if (
      replyingToMessageId !== null &&
      !effectiveMessages.some((message) => message.id === replyingToMessageId)
    ) {
      setReplyingToMessageId(null);
    }
  }, [effectiveMessages, replyingToMessageId]);

  useEffect(() => {
    if (!viewedPlayerUserId || viewedPlayerUserId === profile.userId) {
      setViewedPlayerProfile(null);
      setLoadingViewedPlayer(false);
      setViewedPlayerError(null);
      return;
    }

    const demoProfile = demoPublicProfilesByUserId[viewedPlayerUserId] ?? null;

    if (demoProfile) {
      setViewedPlayerProfile(demoProfile);
      setLoadingViewedPlayer(false);
      setViewedPlayerError(null);
      return;
    }

    const targetUserId = viewedPlayerUserId;
    let active = true;

    async function loadViewedPlayer() {
      try {
        setLoadingViewedPlayer(true);
        setViewedPlayerError(null);
        const result = await getPublicPlayerProfile(targetUserId);

        if (!active) {
          return;
        }

        setViewedPlayerProfile(result);
      } catch (playerError) {
        if (!active) {
          return;
        }

        setViewedPlayerError(toMessage(playerError));
      } finally {
        if (active) {
          setLoadingViewedPlayer(false);
        }
      }
    }

    void loadViewedPlayer();

    return () => {
      active = false;
    };
  }, [demoPublicProfilesByUserId, profile.userId, viewedPlayerUserId]);

  useEffect(() => {
    if (!expandedMeetupManageId) {
      setManageAddressQuery("");
      setManageSelectedAddress(null);
      setManageAddressSuggestions([]);
      setManageAddressFocused(false);
      setManageDate(null);
      setManageCalendarOpen(false);
      setManageTimePickerOpen(false);
      return;
    }

    const meetup = allMeetups.find((item) => item.id === expandedMeetupManageId);

    if (!meetup) {
      return;
    }

    setManageAddressQuery(meetup.addressLabel || meetup.locationHint);
    setManageSelectedAddress(null);
    setManageAddressSuggestions([]);
    setManageAddressFocused(false);
    const manageDateParts = getComposerDateParts(new Date(meetup.startsAt));
    setManageDate(manageDateParts.date);
    setManageHour(manageDateParts.hour);
    setManageMinute(manageDateParts.minute);
    setManageCalendarMonthCursor(startOfCalendarMonth(new Date(meetup.startsAt)));
  }, [allMeetups, expandedMeetupManageId]);

  useEffect(() => {
    if (!expandedVenueManageId) {
      setManageVenueName("");
      setManageVenueNeighborhood("");
      setManageVenueDetails("");
      setManageVenueKind("public_place");
      setManageVenueGameIds([]);
      setManageVenueAddressQuery("");
      setManageVenueSelectedAddress(null);
      setManageVenueAddressSuggestions([]);
      setManageVenueAddressFocused(false);
      return;
    }

    const venue = allVenues.find((item) => item.id === expandedVenueManageId);

    if (!venue) {
      return;
    }

    setManageVenueName(venue.name);
    setManageVenueNeighborhood(venue.neighborhood);
    setManageVenueDetails(venue.details ?? "");
    setManageVenueKind(venue.kind);
    setManageVenueGameIds(
      venueGameOptions
        .filter((game) => inferGameLabelsFromVenue(venue).includes(game.label))
        .map((game) => game.id)
    );
    setManageVenueAddressQuery(venue.address ?? "");
    setManageVenueSelectedAddress(
      venue.address
        ? {
            id: `venue-manage-${venue.id}`,
            title: formatShortAddress(venue.address) || venue.name,
            subtitle: venue.neighborhood,
            fullLabel: venue.address,
            latitude: venue.lat,
            longitude: venue.lng,
          }
        : null
    );
    setManageVenueAddressSuggestions([]);
    setManageVenueAddressFocused(false);
  }, [allVenues, expandedVenueManageId, venueGameOptions]);

  useEffect(() => {
    if (!entityActionSuccess) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setEntityActionSuccess(null);
    }, 2800);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [entityActionSuccess]);

  useEffect(() => {
    if (activeScreen !== "map") {
      setFiltersOpen(false);
      closeComposerRef.current();
    }
  }, [activeScreen]);

  useEffect(() => {
    if (activeScreen === "map" || drawerOpen || filtersOpen || composerOpen) {
      Keyboard.dismiss();
    }
  }, [activeScreen, composerOpen, drawerOpen, filtersOpen]);

  useEffect(() => {
    if (!selectedComposerGameId) {
      if (selectedFormatId !== null) {
        setSelectedFormatId(null);
      }
      return;
    }

    if (
      selectedFormatId &&
      !formats.some(
        (format) => format.id === selectedFormatId && format.gameId === selectedComposerGameId
      )
    ) {
      setSelectedFormatId(null);
    }
  }, [formats, selectedComposerGameId, selectedFormatId]);

  useEffect(() => {
    if (!composerOpen || !selectedVenueId) {
      return;
    }

    if (!availableComposerVenues.some((venue) => venue.id === selectedVenueId)) {
      setSelectedVenueId(null);
    }
  }, [availableComposerVenues, composerOpen, selectedVenueId]);

  useEffect(() => {
    const gameSlug = games.find((g) => g.id === selectedComposerGameId)?.slug;
    const fmt = formats.find((f) => f.id === selectedFormatId);
    setComposerFormatDetailTags((prev) =>
      pruneFormatDetailTagsForFormat(gameSlug, fmt?.slug, prev, fmt?.name)
    );
  }, [formats, games, selectedComposerGameId, selectedFormatId]);

  useEffect(() => {
    if (!composerOpen || !selectedVenueId) {
      return;
    }

    const venue = allVenues.find((item) => item.id === selectedVenueId);

    if (!venue) {
      return;
    }

    const nextAddress = buildAddressSuggestionFromVenue(venue);
    setComposerSelectedAddress(nextAddress);
    setComposerAddressQuery(nextAddress.fullLabel);
    setComposerAddressSuggestions([]);
  }, [allVenues, composerOpen, selectedVenueId]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const fetchViewportDashboardFeed = useCallback(
    async (region: Region, options?: { force?: boolean }) => {
      if (!viewportFeedSupportedRef.current) {
        return null;
      }

      const bounds = buildBufferedBoundsFromRegion(region, 0.42);

      if (
        !options?.force &&
        !shouldRefreshViewportBounds(lastViewportFeedBoundsRef.current, bounds)
      ) {
        return null;
      }

      try {
        const rpcDetailFilter = buildDetailTagFilterForBoundsRpc(
          deferredFilterDetailTags,
          games,
          formats,
          deferredGameFilterIds,
          deferredFormatFilterIds
        );

        const feed = await getDashboardFeedInBounds({
          ...bounds,
          detailTagFilter: rpcDetailFilter,
        });
        lastViewportFeedBoundsRef.current = bounds;
        setMapFeedMeetups(feed.meetups);
        setMapFeedVenues(feed.venues);
        return feed;
      } catch (feedError) {
        const message = toMessage(feedError).toLowerCase();
        const missingRpc =
          message.includes("list_venue_cards_in_bounds") ||
          message.includes("list_meetup_cards_in_bounds") ||
          message.includes("does not exist") ||
          message.includes("could not find the function");

        if (missingRpc) {
          viewportFeedSupportedRef.current = false;
        }

        // O feed por bounds é um refinamento de escala. Em ambientes onde a RPC
        // ainda não existe, fazemos fallback silencioso para o feed completo.
        return null;
      }
    },
    [deferredFilterDetailTags, deferredFormatFilterIds, deferredGameFilterIds, formats, games]
  );

  async function syncMapEntities(closeExpired = false) {
    const data = await getDashboardData({ closeExpired });
    setGames(data.games);
    setFormats(data.formats);
    setVenues(data.venues);
    setMeetups(data.meetups);
    if (mapViewportRegion) {
      const feed = await fetchViewportDashboardFeed(mapViewportRegion, { force: true });

      if (!feed) {
        setMapFeedVenues(data.venues);
        setMapFeedMeetups(data.meetups);
      }
    } else {
      lastViewportFeedBoundsRef.current = null;
      setMapFeedVenues(data.venues);
      setMapFeedMeetups(data.meetups);
    }
    setLastDashboardSyncAt(new Date());
  }

  async function syncDashboard(mode: "initial" | "refresh" = "initial") {
    try {
      if (mode === "initial") {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError(null);
      const [data, nextNotifications, nextFriends, nextUnreadNews] = await Promise.all([
        getDashboardData({ closeExpired: true }),
        getMyNotifications(),
        getFriendOverview(),
        countUnreadAppNews().catch(() => 0),
      ]);
      setGames(data.games);
      setFormats(data.formats);
      setVenues(data.venues);
      setMeetups(data.meetups);
      setMapFeedVenues(data.venues);
      setMapFeedMeetups(data.meetups);
      lastViewportFeedBoundsRef.current = null;
      setNotifications(nextNotifications);
      setFriends(nextFriends);
      setUnreadAppNewsCount(
        typeof nextUnreadNews === "number" && !Number.isNaN(nextUnreadNews) ? nextUnreadNews : 0
      );
      setLastDashboardSyncAt(new Date());
      setLastNotificationSyncAt(new Date());
      setLastFriendSyncAt(new Date());
      setNotificationError(null);
      setFriendError(null);
    } catch (dashboardError) {
      setError(toMessage(dashboardError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function syncMeetupMessages(meetupId: string, mode: "full" | "incremental" = "full") {
    try {
      if (mode === "full") {
        setLoadingMessages(true);
      }

      setMessageError(null);
      const latestSentAt =
        mode === "incremental"
          ? messagesRef.current[messagesRef.current.length - 1]?.sentAt ?? null
          : null;
      const result =
        mode === "incremental" && latestSentAt
          ? await getMeetupMessagesAfter(meetupId, latestSentAt)
          : await getMeetupMessages(meetupId);

      if (mode === "incremental" && latestSentAt) {
        if (result.length) {
          setMessages((current) => mergeChatMessages(current, result));
        }
      } else {
        setMessages(result);
      }

      setLastMessageSyncAt(new Date());
    } catch (fetchError) {
      setMessageError(toMessage(fetchError));
    } finally {
      if (mode === "full") {
        setLoadingMessages(false);
      }
    }
  }

  async function syncPrivateMessages(chatId: string, mode: "full" | "incremental" = "full") {
    try {
      if (mode === "full") {
        setLoadingMessages(true);
      }

      setMessageError(null);
      const latestSentAt =
        mode === "incremental"
          ? messagesRef.current[messagesRef.current.length - 1]?.sentAt ?? null
          : null;
      const result =
        mode === "incremental" && latestSentAt
          ? await getPrivateMessagesAfter(chatId, latestSentAt)
          : await getPrivateMessages(chatId);

      if (mode === "incremental" && latestSentAt) {
        if (result.length) {
          setMessages((current) => mergeChatMessages(current, result));
        }
      } else {
        setMessages(result);
      }

      setLastMessageSyncAt(new Date());
    } catch (fetchError) {
      setMessageError(toMessage(fetchError));
    } finally {
      if (mode === "full") {
        setLoadingMessages(false);
      }
    }
  }


  async function syncMeetupPresence(meetupId: string) {
    try {
      setLoadingMeetupPresence(true);
      const result = await getMeetupMemberPresence(meetupId);
      setMeetupPresence(result);
    } catch (presenceError) {
      setMessageError(toMessage(presenceError));
    } finally {
      setLoadingMeetupPresence(false);
    }
  }

  async function syncAccountData() {
    try {
      setBlockedUsersError(null);
      setLoadingBlockedUsers(true);

      const [nextReputationSummary, nextVenueSuggestions, nextBlockedUsers] = await Promise.all([
        getMyReputationSummary(),
        getMyVenueSuggestions(),
        getMyBlockedUsers(),
      ]);

      setReputationSummary(nextReputationSummary);
      setVenueSuggestions(nextVenueSuggestions);
      setBlockedUsers(nextBlockedUsers);
      setLastAccountSyncAt(new Date());
      setVenueSuggestionSuccess(null);
    } catch (accountDataError) {
      setError(toMessage(accountDataError));
      setBlockedUsersError(toMessage(accountDataError));
    } finally {
      setLoadingBlockedUsers(false);
    }
  }

  const refreshAppNewsUnreadCount = useCallback(async () => {
    try {
      const n = await countUnreadAppNews();
      setUnreadAppNewsCount(n);
    } catch {
      setUnreadAppNewsCount(0);
    }
  }, []);

  useEffect(() => {
    if (loading || activeScreen !== "map") {
      return;
    }
    if (!consumePendingAppNewsMapOverlayAfterSignIn()) {
      return;
    }
    void (async () => {
      try {
        const items = await listAppNewsColdStartQueue();
        if (items.length) {
          setColdStartAppNewsQueue(items);
        }
      } catch {
        // RPC pode não existir no backend ainda
      }
    })();
  }, [loading, activeScreen]);

  const handleDismissColdStartAppNews = useCallback(() => {
    const id = coldStartAppNews?.id;
    setColdStartAppNewsQueue((current) => current.slice(1));
    if (!id) {
      return;
    }
    void dismissAppNewsColdStart(id)
      .then(() => refreshAppNewsUnreadCount())
      .catch(() => {});
  }, [coldStartAppNews, refreshAppNewsUnreadCount]);

  useEffect(() => {
    if (activeScreen !== "map" || !mapViewportRegion || !viewportFeedSupportedRef.current) {
      return;
    }

    if (mapFeedRefreshTimerRef.current) {
      clearTimeout(mapFeedRefreshTimerRef.current);
    }

    mapFeedRefreshTimerRef.current = setTimeout(() => {
      mapFeedRefreshTimerRef.current = null;

      void fetchViewportDashboardFeed(mapViewportRegion);
    }, 220);

    return () => {
      if (mapFeedRefreshTimerRef.current) {
        clearTimeout(mapFeedRefreshTimerRef.current);
        mapFeedRefreshTimerRef.current = null;
      }
    };
  }, [activeScreen, fetchViewportDashboardFeed, mapViewportRegion]);

  const scheduleDashboardRefresh = useCallback((delay = 280) => {
    if (dashboardRefreshTimerRef.current) {
      clearTimeout(dashboardRefreshTimerRef.current);
    }

    dashboardRefreshTimerRef.current = setTimeout(() => {
      dashboardRefreshTimerRef.current = null;
      void loadMapEntitiesRef.current("refresh");
    }, delay);
  }, []);

  const scheduleFriendsRefresh = useCallback((delay = 280) => {
    if (friendsRefreshTimerRef.current) {
      clearTimeout(friendsRefreshTimerRef.current);
    }

    friendsRefreshTimerRef.current = setTimeout(() => {
      friendsRefreshTimerRef.current = null;
      void loadFriendsRef.current();
    }, delay);
  }, []);

  const scheduleNotificationsRefresh = useCallback((delay = 220) => {
    if (notificationsRefreshTimerRef.current) {
      clearTimeout(notificationsRefreshTimerRef.current);
    }

    notificationsRefreshTimerRef.current = setTimeout(() => {
      notificationsRefreshTimerRef.current = null;
      void loadNotificationsRef.current();
    }, delay);
  }, []);

  const scheduleMessagesSync = useCallback((delay = 140) => {
    if (messagesRefreshTimerRef.current) {
      clearTimeout(messagesRefreshTimerRef.current);
    }

    messagesRefreshTimerRef.current = setTimeout(() => {
      messagesRefreshTimerRef.current = null;
      void syncMessagesRef.current("incremental");
    }, delay);
  }, []);

  const scheduleMeetupPresenceSync = useCallback((meetupId: string, delay = 160) => {
    if (meetupPresenceRefreshTimerRef.current) {
      clearTimeout(meetupPresenceRefreshTimerRef.current);
    }

    meetupPresenceRefreshTimerRef.current = setTimeout(() => {
      meetupPresenceRefreshTimerRef.current = null;
      void syncMeetupPresence(meetupId);
    }, delay);
  }, []);

  const refreshPrivateChatsList = useCallback(async () => {
    try {
      setLoadingPrivateChats(true);
      const rows = await listPrivateChats();
      setPrivateChatsList(rows);
    } catch {
      // RPC pode não existir em ambientes antigos; lista fica vazia.
    } finally {
      setLoadingPrivateChats(false);
    }
  }, []);

  useEffect(() => {
    if (activeScreen !== "chats" || chatViewMode !== "list") {
      return;
    }

    void refreshPrivateChatsList();
  }, [activeScreen, chatViewMode, refreshPrivateChatsList]);

  loadDashboardRef.current = syncDashboard;
  loadMapEntitiesRef.current = async () => {
    try {
      await syncMapEntities(false);
    } catch (fetchError) {
      setError(toMessage(fetchError));
    }
  };
  loadNotificationsRef.current = async () => {
    try {
      setNotificationError(null);
      const result = await getMyNotifications();
      setNotifications(result);
      setLastNotificationSyncAt(new Date());
    } catch (fetchError) {
      setNotificationError(toMessage(fetchError));
    }
  };
  loadFriendsRef.current = async () => {
    try {
      setFriendError(null);
      const result = await getFriendOverview();
      setFriends(result);
      setLastFriendSyncAt(new Date());
    } catch (fetchError) {
      setFriendError(toMessage(fetchError));
    }
  };
  syncMessagesRef.current = async (mode: "full" | "incremental" = "full") => {
    if (selectedPrivateChatId) {
      await syncPrivateMessages(selectedPrivateChatId, mode);
      return;
    }
    if (selectedChatMeetupId) {
      await syncMeetupMessages(selectedChatMeetupId, mode);
    }
  };
  loadAccountDataRef.current = syncAccountData;

  useEffect(() => {
    void loadAccountDataRef.current();
  }, []);

  useEffect(() => {
    const refreshIntervalId = setInterval(() => {
      scheduleFriendsRefresh(0);
    }, 45000);

    return () => {
      clearInterval(refreshIntervalId);
    };
  }, [scheduleFriendsRefresh]);

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meetup_posts" },
        () => {
          scheduleDashboardRefresh();
          scheduleNotificationsRefresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meetup_members" },
        () => {
          scheduleDashboardRefresh();
          scheduleNotificationsRefresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friendships" },
        () => {
          scheduleFriendsRefresh();
          scheduleNotificationsRefresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_blocks" },
        () => {
          scheduleDashboardRefresh();
          scheduleFriendsRefresh();
          void loadAccountDataRef.current();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_presence" },
        () => {
          scheduleFriendsRefresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${profile.userId}`,
        },
        () => {
          scheduleNotificationsRefresh();
        }
      )
      .subscribe(() => {});

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [
    profile.userId,
    scheduleDashboardRefresh,
    scheduleFriendsRefresh,
    scheduleNotificationsRefresh,
  ]);

  useEffect(() => {
    if (!selectedPrivateChatId) {
      return;
    }

    let channel: RealtimeChannel | null = null;
    setMeetupPresence([]);

    void syncMessagesRef.current("full");

    channel = supabase
      .channel(`private-chat:${selectedPrivateChatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "private_messages",
          filter: `chat_id=eq.${selectedPrivateChatId}`,
        },
        () => {
          scheduleMessagesSync();
          scheduleNotificationsRefresh();
        }
      )
      .subscribe(() => {});

    return () => {
      setMessages([]);
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [scheduleMessagesSync, scheduleNotificationsRefresh, selectedPrivateChatId]);

  useEffect(() => {
    if (selectedPrivateChatId) {
      return;
    }

    const activeMeetup = selectedChatMeetup;

    if (!activeMeetup?.isMember && !activeMeetup?.isCreator) {
      setMessages([]);
      setMeetupPresence([]);
      return;
    }

    if (isDemoId(activeMeetup.id)) {
      setMessages(demoBundle.messagesByMeetupId[activeMeetup.id] ?? []);
      setMeetupPresence(demoBundle.meetupPresenceById[activeMeetup.id] ?? []);
      setLastMessageSyncAt(new Date());
      return;
    }

    const activeMeetupId = activeMeetup.id;
    let channel: RealtimeChannel | null = null;

    void syncMessagesRef.current("full");
    void syncMeetupPresence(activeMeetupId);

    channel = supabase
      .channel(`meetup-group:${activeMeetupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "meetup_messages",
          filter: `meetup_id=eq.${activeMeetupId}`,
        },
        () => {
          scheduleMessagesSync();
          scheduleNotificationsRefresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "meetup_members",
          filter: `meetup_id=eq.${activeMeetupId}`,
        },
        () => {
          scheduleDashboardRefresh();
          scheduleMeetupPresenceSync(activeMeetupId);
          scheduleNotificationsRefresh();
        }
      )
      .subscribe(() => {});

    return () => {
      setMeetupPresence([]);
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [
    demoBundle.meetupPresenceById,
    demoBundle.messagesByMeetupId,
    scheduleDashboardRefresh,
    scheduleMeetupPresenceSync,
    scheduleMessagesSync,
    scheduleNotificationsRefresh,
    selectedChatMeetup,
    selectedPrivateChatId,
  ]);

  useEffect(() => {
    if (activeScreen !== "chats" || chatViewMode !== "room") {
      return;
    }

    if (selectedPrivateChatId) {
      const unreadIds = effectiveNotifications
        .filter(
          (item) =>
            item.kind === "message_received" &&
            item.privateChatId === selectedPrivateChatId &&
            item.readAt === null
        )
        .map((item) => item.id);

      if (unreadIds.length) {
        void handleMarkNotificationsReadRef.current(unreadIds);
      }
      return;
    }

    if (!selectedChatMeetupId) {
      return;
    }

    const unreadChatNotificationIds = effectiveNotifications
      .filter(
        (item) =>
          item.kind === "message_received" &&
          item.meetupId === selectedChatMeetupId &&
          item.readAt === null
      )
      .map((item) => item.id);

    if (!unreadChatNotificationIds.length) {
      return;
    }

    void handleMarkNotificationsReadRef.current(unreadChatNotificationIds);
  }, [
    activeScreen,
    chatViewMode,
    effectiveNotifications,
    selectedChatMeetupId,
    selectedPrivateChatId,
  ]);

  async function handleCreateMeetup() {
    try {
      setCreatingMeetup(true);
      setComposerError(null);

      const startsAt = buildComposerStartsAtIso({
        date: composerDate,
        hour: composerHour,
        minute: composerMinute,
      });

      if (!startsAt) {
        throw new Error("Escolha uma data e um horário válidos para o jogo.");
      }

      if (!selectedComposerGameId) {
        throw new Error("Escolha primeiro o tipo de jogo da partida.");
      }

      if (!selectedFormatId) {
        throw new Error("Selecione um formato antes de publicar o jogo.");
      }

      const resolvedHostMode = mapComposerMeetupModeToHostMode(hostMode);

      const venue = allVenues.find((item) => item.id === selectedVenueId);
      const searchedCoordinate = composerSelectedAddress
        ? {
            latitude: composerSelectedAddress.latitude,
            longitude: composerSelectedAddress.longitude,
          }
        : null;
      const chosenCoordinate = venue ? null : searchedCoordinate;

      if (!venue && !chosenCoordinate) {
        throw new Error("Selecione um local cadastrado ou pesquise um endereço para o jogo.");
      }

      const trimmedMeetupTitle = meetupTitle.trim();
      if (trimmedMeetupTitle.length < MEETUP_TITLE_MIN_LENGTH) {
        throw new Error(
          `O título precisa ter pelo menos ${MEETUP_TITLE_MIN_LENGTH} caracteres. Acrescente um pouco mais de contexto (ex.: "EDH casual na praça").`
        );
      }
      if (trimmedMeetupTitle.length > MEETUP_TITLE_MAX_LENGTH) {
        throw new Error(`O título pode ter no máximo ${MEETUP_TITLE_MAX_LENGTH} caracteres.`);
      }

      const selectedFormatForCreate = formats.find((item) => item.id === selectedFormatId);
      const selectedGameForCreate = games.find((item) => item.id === selectedComposerGameId);
      const prunedComposerDetailTags = pruneFormatDetailTagsForFormat(
        selectedGameForCreate?.slug,
        selectedFormatForCreate?.slug,
        composerFormatDetailTags,
        selectedFormatForCreate?.name
      );

      const createdMeetupId = await createMeetup({
        title: trimmedMeetupTitle,
        description: meetupDescription,
        formatId: selectedFormatId,
        hostMode: resolvedHostMode,
        startsAt,
        maxPlayers: DEFAULT_MEETUP_CAPACITY,
        lat: venue ? null : chosenCoordinate?.latitude ?? null,
        lng: venue ? null : chosenCoordinate?.longitude ?? null,
        venueId: venue?.id ?? null,
        addressLabel: venue ? venue.address ?? venue.name : composerSelectedAddress?.fullLabel ?? null,
        formatDetailTags: prunedComposerDetailTags,
      });

      const selectedFormat = selectedFormatForCreate;
      const selectedFormatName = selectedFormat?.name ?? "Casual";
      const optimisticMeetup: MeetupPost = {
        id: createdMeetupId,
        title: meetupTitle.trim(),
        description: meetupDescription.trim(),
        formatName: selectedFormatName,
        gameSlug: selectedFormat?.gameSlug ?? "",
        formatDetailTags: prunedComposerDetailTags,
        startsAt,
        hostMode: resolvedHostMode,
        status: "open",
        maxPlayers: DEFAULT_MEETUP_CAPACITY,
        joinedPlayers: 0,
        confirmedPlayers: 0,
        lat: venue ? venue.lat : chosenCoordinate?.latitude ?? -23.5679,
        lng: venue ? venue.lng : chosenCoordinate?.longitude ?? -46.6527,
        venueName: venue?.name ?? null,
        addressLabel:
          venue?.address ??
          venue?.name ??
          composerSelectedAddress?.fullLabel ??
          "Região aproximada",
        locationHint:
          venue?.name ??
          composerSelectedAddress?.title ??
          "Região aproximada",
        isLocationExact: true,
        chatImagePath: null,
        chatImageUrl: null,
        creatorUserId: profile.userId,
        creatorDisplayName: profile.displayName,
        creatorHandle: profile.handle,
        creatorBio: profile.bio,
        creatorNeighborhood: profile.neighborhood,
        creatorCanHost: profile.canHost,
        isMember: false,
        isCreator: true,
      };

      setOptimisticMeetups((current) => [
        optimisticMeetup,
        ...current.filter((item) => item.id !== createdMeetupId),
      ]);

      setMeetupTitle("");
      setMeetupDescription("");
      setSelectedComposerGameId(null);
      setSelectedFormatId(null);
      setComposerFormatDetailTags({});
      setHostMode("public_place");
      setSelectedVenueId(null);
      setComposerAddressQuery("");
      setComposerSelectedAddress(null);
      setComposerAddressSuggestions([]);
      const resetDateParts = getComposerDateParts(new Date(Date.now() + 2 * 60 * 60 * 1000));
      setComposerDate(resetDateParts.date);
      setComposerHour(resetDateParts.hour);
      setComposerMinute(snapComposerMinuteToQuarter(resetDateParts.minute));
      setDraftCoordinate(null);
      closeComposer();
      await loadDashboardRef.current("refresh");
      setSelectedMeetupId(createdMeetupId);
      setSelectedChatMeetupId(createdMeetupId);
      switchGamesSheetSection("meetups", { animate: false });
      setGamesSheetPreviewMode(true);
      setActiveScreen("map");
      animateGamesSheet(false);
    } catch (createError) {
      setComposerError(toMessage(createError));
    } finally {
      setCreatingMeetup(false);
    }
  }

  async function handleJoinMeetup(meetupId: string) {
    try {
      setJoiningMeetupId(meetupId);
      setMessageError(null);
      setEntityActionSuccess(null);
      await joinMeetup(meetupId);
      await loadDashboardRef.current("refresh");
      setSelectedMeetupId(meetupId);
      setSelectedChatMeetupId(meetupId);
      setExpandedMeetupInfoId(meetupId);
      setEntityActionSuccess(
        "Você entrou na partida. Abra os detalhes para acessar o chat e marcar seu status."
      );
    } catch (joinError) {
      const nextMessage = toMessage(joinError);
      setMessageError(nextMessage);
    } finally {
      setJoiningMeetupId(null);
    }
  }

  async function handleLeaveMeetup(meetupId: string) {
    try {
      setLeavingMeetupId(meetupId);
      setEntityActionSuccess(null);
      await leaveMeetup(meetupId);
      if (selectedChatMeetupId === meetupId) {
        setSelectedChatMeetupId(null);
        setChatViewMode("list");
      }
      setExpandedMeetupInfoId((current) => (current === meetupId ? null : current));
      setMessageBody("");
      await loadDashboardRef.current("refresh");
      await loadNotificationsRef.current();
      setEntityActionSuccess("Você saiu da partida.");
    } catch (leaveError) {
      setMessageError(toMessage(leaveError));
    } finally {
      setLeavingMeetupId(null);
    }
  }

  async function handleUpdateMeetup(input: {
    meetupId?: string;
    maxPlayers?: number;
    status?: MeetupStatus;
    startsAt?: string | null;
    actionKey: string;
  }) {
    const targetMeetupId = input.meetupId ?? selectedMeetup?.id ?? null;

    if (!targetMeetupId) {
      return false;
    }

    try {
      setUpdatingMeetupAction(input.actionKey);
      setMessageError(null);
      await updateMyMeetup({
        meetupId: targetMeetupId,
        maxPlayers: input.maxPlayers,
        status: input.status,
        startsAt: input.startsAt ?? null,
      });
      await loadDashboardRef.current("refresh");
      await loadNotificationsRef.current();
      return true;
    } catch (updateError) {
      setMessageError(toMessage(updateError));
      return false;
    } finally {
      setUpdatingMeetupAction(null);
    }
  }

  async function handleUpdateMeetupLocation(
    meetup: MeetupPost,
    options?: { closeAfter?: boolean; showSuccess?: boolean }
  ) {
    if (!manageSelectedAddress) {
      setMessageError("Pesquise e selecione um endereço antes de salvar o local.");
      return false;
    }

    try {
      setUpdatingMeetupLocationId(meetup.id);
      setMessageError(null);
      await updateMyMeetupLocation({
        meetupId: meetup.id,
        lat: manageSelectedAddress.latitude,
        lng: manageSelectedAddress.longitude,
        addressLabel: manageSelectedAddress.fullLabel,
      });

      setOptimisticMeetups((current) =>
        current.map((item) =>
          item.id === meetup.id
            ? {
                ...item,
                lat: manageSelectedAddress.latitude,
                lng: manageSelectedAddress.longitude,
                venueName: null,
                addressLabel: manageSelectedAddress.fullLabel,
                locationHint: manageSelectedAddress.title,
                isLocationExact: true,
              }
            : item
        )
      );
      setSelectedMeetupId(meetup.id);
      setManageAddressSuggestions([]);
      await loadDashboardRef.current("refresh");
      focusMeetupOnMap(meetup.id);
      if (options?.showSuccess !== false) {
        setEntityActionSuccess("Edições salvas.");
      }
      if (options?.closeAfter !== false) {
        setExpandedMeetupManageId(null);
      }
      return true;
    } catch (updateError) {
      setMessageError(toMessage(updateError));
      return false;
    } finally {
      setUpdatingMeetupLocationId(null);
    }
  }

  async function handleSaveMeetupEdits(meetup: MeetupPost) {
    if (!manageDate) {
      setMessageError("Escolha uma data antes de salvar a partida.");
      return;
    }

    const nextStartsAtInput = `${manageDate}T${manageHour}:${manageMinute}`;
    const nextStartsAt = parseLocalDateTimeInput(nextStartsAtInput);
    const currentStartsAt = parseLocalDateTimeInput(
      toLocalDateTimeInput(new Date(meetup.startsAt))
    );

    const hasScheduleChange = nextStartsAt !== currentStartsAt;
    const hasLocationChange =
      !!manageSelectedAddress &&
      (Math.abs(manageSelectedAddress.latitude - meetup.lat) > 0.000001 ||
        Math.abs(manageSelectedAddress.longitude - meetup.lng) > 0.000001 ||
        manageSelectedAddress.fullLabel !== (meetup.addressLabel || meetup.locationHint));

    if (!hasScheduleChange && !hasLocationChange) {
      setEntityActionSuccess("Nada mudou para salvar.");
      return;
    }

    setEntityActionSuccess(null);
    setMessageError(null);

    if (hasScheduleChange) {
      const success = await handleUpdateMeetup({
        meetupId: meetup.id,
        startsAt: hasScheduleChange ? nextStartsAt : undefined,
        actionKey: "manage:save",
      });

      if (!success) {
        return;
      }
    }

    if (hasLocationChange) {
      const locationSaved = await handleUpdateMeetupLocation(meetup, {
        closeAfter: false,
        showSuccess: false,
      });

      if (!locationSaved) {
        return;
      }
    }

    setExpandedMeetupManageId(null);
    setEntityActionSuccess("Edições salvas.");
  }

  async function handleUpdateChatMeetupStatus(status: "closed" | "cancelled") {
    if (!selectedChatMeetup) {
      return;
    }

    if (isDemoId(selectedChatMeetup.id)) {
      setDemoMeetupOverrides((current) => ({
        ...current,
        [selectedChatMeetup.id]: {
          ...(current[selectedChatMeetup.id] ?? {}),
          status,
        },
      }));
      return;
    }

    try {
      setUpdatingMeetupAction(`chat-status:${status}`);
      await updateMyMeetup({
        meetupId: selectedChatMeetup.id,
        status,
        startsAt: null,
      });
      await loadDashboardRef.current("refresh");
      await loadNotificationsRef.current();
    } catch (updateError) {
      setMessageError(toMessage(updateError));
    } finally {
      setUpdatingMeetupAction(null);
    }
  }

  async function handleSendMessage() {
    if (selectedPrivateChatId && privateChatPeer) {
      try {
        setSendingMessage(true);
        setMessageError(null);

        await sendPrivateMessage(selectedPrivateChatId, messageBody, replyingToMessageId);
        setMessageBody("");
        setReplyingToMessageId(null);
        await syncMessagesRef.current("incremental");
        try {
          const rows = await listPrivateChats();
          setPrivateChatsList(rows);
        } catch {
          // best-effort refresh da lista de conversas
        }
      } catch (sendError) {
        setMessageError(toMessage(sendError));
      } finally {
        setSendingMessage(false);
      }
      return;
    }

    if (!selectedChatMeetup) {
      return;
    }

    try {
      setSendingMessage(true);
      setMessageError(null);

      if (isDemoId(selectedChatMeetup.id)) {
        const replySource =
          replyingToMessageId === null
            ? null
            : (
                demoMessagesByMeetupId[selectedChatMeetup.id] ??
                demoBundle.messagesByMeetupId[selectedChatMeetup.id] ??
                []
              ).find((message) => message.id === replyingToMessageId) ?? null;
        const nextMessage: ChatMessage = {
          id: `demo-message-${Date.now()}`,
          authorId: profile.userId,
          authorName: profile.displayName,
          authorAvatarPath: profile.avatarPath,
          authorAvatarUrl: profile.avatarUrl,
          sentAt: new Date().toISOString(),
          body: messageBody.trim(),
          replyToMessageId: replySource?.id ?? null,
          replyPreviewAuthorName: replySource?.authorName ?? null,
          replyPreviewBody: replySource?.body ?? null,
        };

        setDemoMessagesByMeetupId((current) => ({
          ...current,
          [selectedChatMeetup.id]: [
            ...(current[selectedChatMeetup.id] ??
              demoBundle.messagesByMeetupId[selectedChatMeetup.id] ??
              []),
            nextMessage,
          ],
        }));
        setMessageBody("");
        setReplyingToMessageId(null);
        setLastMessageSyncAt(new Date());
        return;
      }

      await sendMeetupMessage(selectedChatMeetup.id, messageBody, replyingToMessageId);
      setMessageBody("");
      setReplyingToMessageId(null);
      await syncMessagesRef.current("incremental");
    } catch (sendError) {
      setMessageError(toMessage(sendError));
    } finally {
      setSendingMessage(false);
    }
  }

  async function handleUseCurrentLocationForMeetup() {
    try {
      setLocatingDraftPoint(true);
      setComposerError(null);
      setComposerAddressFocused(false);
      const currentLocation = await resolveCurrentLocationSuggestion();
      setSelectedVenueId(null);
      setComposerSelectedAddress(currentLocation);
      setComposerAddressQuery(currentLocation.fullLabel);
      setComposerAddressSuggestions([]);
      setDraftCoordinate({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      });
    } catch (locationError) {
      setComposerError(toMessage(locationError));
    } finally {
      setLocatingDraftPoint(false);
    }
  }

  async function handleUseCurrentLocationForManage() {
    try {
      setLocatingDraftPoint(true);
      setMessageError(null);
      setManageAddressFocused(false);
      const currentLocation = await resolveCurrentLocationSuggestion();
      setManageSelectedAddress(currentLocation);
      setManageAddressQuery(currentLocation.fullLabel);
      setManageAddressSuggestions([]);
    } catch (locationError) {
      setMessageError(toMessage(locationError));
    } finally {
      setLocatingDraftPoint(false);
    }
  }

  async function handleUpdateAttendanceStatus(status: AttendanceStatus) {
    if (!selectedChatMeetup) {
      return;
    }

    try {
      setUpdatingMeetupAction(`attendance:${status}`);
      setMessageError(null);

      if (isDemoId(selectedChatMeetup.id)) {
        setDemoMeetupPresenceById((current) => {
          const source =
            current[selectedChatMeetup.id] ??
            demoBundle.meetupPresenceById[selectedChatMeetup.id] ??
            [];

          return {
            ...current,
            [selectedChatMeetup.id]: source.map((member) =>
              member.userId === profile.userId
                ? {
                    ...member,
                    attendanceStatus: status,
                  }
                : member
            ),
          };
        });
        return;
      }

      await setMyAttendanceStatus(selectedChatMeetup.id, status);
      await Promise.all([
        loadDashboardRef.current("refresh"),
        syncMeetupPresence(selectedChatMeetup.id),
        loadNotificationsRef.current(),
      ]);
    } catch (attendanceError) {
      setMessageError(toMessage(attendanceError));
    } finally {
      setUpdatingMeetupAction(null);
    }
  }

  async function handleRateMember(
    reviewedUserId: string,
    attended: boolean,
    rating?: number
  ) {
    if (!selectedChatMeetup) {
      return;
    }

    try {
      setRatingActionId(reviewedUserId);
      setMessageError(null);

      if (isDemoId(selectedChatMeetup.id)) {
        setEntityActionSuccess(
          attended ? "Avaliação de demonstração registrada." : "No-show de demonstração registrado."
        );
        return;
      }

      await rateMeetupPlayer({
        meetupId: selectedChatMeetup.id,
        reviewedUserId,
        attended,
        rating: attended ? rating ?? 5 : null,
      });
      await loadAccountDataRef.current();
      setEntityActionSuccess(attended ? "Avaliação registrada." : "No-show registrado.");
    } catch (ratingError) {
      setMessageError(toMessage(ratingError));
      throw ratingError;
    } finally {
      setRatingActionId(null);
    }
  }

  function promptDeleteMeetup(meetup: MeetupPost) {
    Alert.alert("Excluir jogo", `Excluir "${meetup.title}"? Essa ação é permanente.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir agora",
        style: "destructive",
        onPress: () => {
          void handleDeleteMeetup(meetup);
        },
      },
    ]);
  }

  function promptMeetupStatusChange(meetup: MeetupPost, status: "closed" | "cancelled") {
    const title = status === "closed" ? "Encerrar partida" : "Cancelar partida";
    const body =
      status === "closed"
        ? `Encerrar "${meetup.title}"? Essa ação é permanente e depois você poderá consultar a partida no histórico do menu principal.`
        : `Cancelar "${meetup.title}"? Essa ação é permanente e depois você poderá consultar a partida no histórico do menu principal.`;

    Alert.alert(title, body, [
      { text: "Voltar", style: "cancel" },
      {
        text: status === "closed" ? "Encerrar" : "Cancelar partida",
        style: "destructive",
        onPress: () => {
          void handleUpdateMeetup({
            meetupId: meetup.id,
            status,
            actionKey: `status:${status}`,
          });
        },
      },
    ]);
  }

  function promptChatMeetupStatusChange(status: "closed" | "cancelled") {
    if (!selectedChatMeetup) {
      return;
    }

    const title = status === "closed" ? "Encerrar partida" : "Cancelar partida";
    const body =
      status === "closed"
        ? `Encerrar "${selectedChatMeetup.title}"? Essa ação é permanente e depois você poderá consultar a partida no histórico do menu principal.`
        : `Cancelar "${selectedChatMeetup.title}"? Essa ação é permanente e depois você poderá consultar a partida no histórico do menu principal.`;

    Alert.alert(title, body, [
      { text: "Voltar", style: "cancel" },
      {
        text: status === "closed" ? "Encerrar" : "Cancelar partida",
        style: "destructive",
        onPress: () => {
          void handleUpdateChatMeetupStatus(status);
        },
      },
    ]);
  }

  async function handleDeleteMeetup(meetup: MeetupPost) {
    try {
      setDeletingEntityId(meetup.id);
      setMessageError(null);
      setComposerError(null);
      setError(null);
      setEntityActionSuccess(null);

      if (!isDemoId(meetup.id)) {
        await deleteMyMeetup(meetup.id);
      }

      setOptimisticMeetups((current) => current.filter((item) => item.id !== meetup.id));
      setMeetups((current) => current.filter((item) => item.id !== meetup.id));

      if (selectedMeetupId === meetup.id) {
        setSelectedMeetupId(null);
      }

      if (selectedChatMeetupId === meetup.id) {
        setSelectedChatMeetupId(null);
      }

      setExpandedMeetupInfoId((current) => (current === meetup.id ? null : current));
      setExpandedMeetupManageId((current) => (current === meetup.id ? null : current));
      setEntityActionSuccess("Jogo excluído do mapa.");
      await loadDashboardRef.current("refresh");
    } catch (deleteError) {
      const message = toMessage(deleteError);
      setError(message);
      Alert.alert("Não foi possível excluir o jogo", message);
    } finally {
      setDeletingEntityId(null);
    }
  }

  function promptDeleteVenue(venue: VenueCard) {
    Alert.alert("Excluir local", `Excluir "${venue.name}" do mapa? Essa ação é permanente.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir agora",
        style: "destructive",
        onPress: () => {
          void handleDeleteVenue(venue);
        },
      },
    ]);
  }

  async function handleDeleteVenue(venue: VenueCard) {
    try {
      await handleDeleteVenueAction(venue);
    } catch (deleteError) {
      Alert.alert("Não foi possível excluir o local", toMessage(deleteError));
    }
  }

  async function handleSaveVenueEdits(venue: VenueCard) {
    try {
      await handleSaveVenueEditsAction(venue);
    } catch (updateError) {
      Alert.alert("Não foi possível salvar o local", toMessage(updateError));
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
    } catch (signOutError) {
      setError(toMessage(signOutError));
    }
  }

  function handleDeleteAccountPress() {
    Alert.alert(
      "Excluir conta",
      "Essa ação é permanente e remove seu acesso, perfil, amizades, jogos, mensagens e demais dados associados à conta. Deseja continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: deletingAccount ? "Excluindo..." : "Excluir conta",
          style: "destructive",
          onPress: () => {
            void confirmDeleteAccount();
          },
        },
      ]
    );
  }

  async function confirmDeleteAccount() {
    try {
      setDeletingAccount(true);
      await deleteMyAccount();
      await signOut();
    } catch (deleteAccountError) {
      setError(toMessage(deleteAccountError));
    } finally {
      setDeletingAccount(false);
    }
  }

  function resetFilters() {
    setEntityFilters(["meetups", "venues"]);
    setSelectedGameFilterIds([]);
    setSelectedFormatFilterIds([]);
    setFilterDetailTags({});
    setDistanceFilter("all");
    setPeriodFilters([]);
    setFilterDateFrom(null);
    setFilterDateTo(null);
  }

  function animateGamesSheetTo(targetValue: number) {
    gamesSheetTranslateY.stopAnimation();
    Animated.spring(gamesSheetTranslateY, {
      toValue: targetValue,
      damping: 34,
      stiffness: 220,
      mass: 0.96,
      overshootClamping: true,
      restDisplacementThreshold: 0.5,
      restSpeedThreshold: 0.5,
      useNativeDriver: true,
    }).start();
  }

  function animateGamesSheet(expanded: boolean) {
    setGamesSheetExpanded(expanded);
    setGamesSheetPreviewMode(false);
    animateGamesSheetTo(expanded ? 0 : defaultCollapsedGamesSheetOffset);
  }

  function animateGamesSheetPreview() {
    setGamesSheetExpanded(false);
    setGamesSheetPreviewMode(true);
    animateGamesSheetTo(previewGamesSheetOffset);
  }

  function animateGamesSectionIn(direction: "left" | "right" | "none" = "none") {
    gamesSectionTranslateX.stopAnimation();
    gamesSectionOpacity.stopAnimation();
    const pageSlideDistance = Math.max(width * 0.82, 280);
    gamesSectionTranslateX.setValue(
      direction === "none" ? 0 : direction === "left" ? pageSlideDistance : -pageSlideDistance
    );
    gamesSectionOpacity.setValue(1);

    Animated.parallel([
      Animated.timing(gamesSectionTranslateX, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(gamesSectionOpacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }

  function switchGamesSheetSection(
    nextSection: "meetups" | "venues",
    options?: { animate?: boolean; direction?: "left" | "right" | "none" }
  ) {
    if (gamesSheetSection === nextSection) {
      return;
    }

    if (options?.animate === false) {
      setGamesSheetSection(nextSection);
      return;
    }
    setGamesSheetSection(nextSection);
    requestAnimationFrame(() => {
      animateGamesSectionIn(options?.direction ?? "none");
    });
  }
  switchGamesSheetSectionRef.current = switchGamesSheetSection;
  animateGamesSheetRef.current = animateGamesSheet;

  const {
    handleSearchPlayers,
    handleSendFriendRequest,
    handleRespondToFriendRequest,
    handleRemoveFriend,
  } = useMapFriendActions({
    demoFriends: demoBundle.friends,
    playerSearchQuery,
    setFriends,
    setLastFriendSyncAt,
    setViewedPlayerProfile,
    setFriendActionId,
    setFriendError,
    setFriendSuccess,
    setSearchingPlayers,
    setPlayerSearchResults,
    loadFriends: loadFriendsRef.current,
  });

  const blockPlayerFromProfile = useCallback(
    async (targetProfile: PublicPlayerProfile, reason: string) => {
      if (isDemoId(targetProfile.userId)) {
        Alert.alert(
          "Indisponível no modo demo",
          "Use uma conta real para testar denúncia e bloqueio."
        );
        return;
      }

      try {
        setSafetyActionId(`block:${targetProfile.userId}`);
        await blockUser({
          blockedUserId: targetProfile.userId,
          reason,
        });

        await Promise.allSettled([
          loadFriendsRef.current(),
          loadNotificationsRef.current(),
          loadDashboardRef.current("refresh"),
          loadAccountDataRef.current(),
        ]);

        Alert.alert(
          "Jogador bloqueado",
          `${targetProfile.displayName} foi bloqueado com sucesso.`,
          [
            {
              text: "OK",
              onPress: () => {
                closePlayerProfileRef.current();
              },
            },
          ]
        );
      } catch (blockError) {
        Alert.alert("Não foi possível bloquear", toMessage(blockError));
      } finally {
        setSafetyActionId(null);
      }
    },
    []
  );

  const submitPlayerReport = useCallback(
    async (targetProfile: PublicPlayerProfile, reason: string) => {
      if (isDemoId(targetProfile.userId)) {
        Alert.alert(
          "Indisponível no modo demo",
          "Use uma conta real para testar denúncia e bloqueio."
        );
        return;
      }

      try {
        setSafetyActionId(`report:${targetProfile.userId}`);
        await reportUser({
          reportedUserId: targetProfile.userId,
          reason,
        });
        Alert.alert(
          "Denúncia enviada",
          `Recebemos sua denúncia e vamos analisar esse comportamento. Se preferir, você também pode bloquear ${targetProfile.displayName} agora.`,
          [
            {
              text: "Agora não",
              style: "cancel",
            },
            {
              text: "Bloquear também",
              style: "destructive",
              onPress: () => {
                void blockPlayerFromProfile(
                  targetProfile,
                  "Bloqueado pelo usuário após denúncia no perfil público."
                );
              },
            },
          ],
          { cancelable: true }
        );
      } catch (reportError) {
        Alert.alert("Não foi possível denunciar", toMessage(reportError));
      } finally {
        setSafetyActionId(null);
      }
    },
    [blockPlayerFromProfile]
  );

  const promptReportPlayer = useCallback(
    (targetProfile: PublicPlayerProfile) => {
      Alert.alert(
        "Denunciar jogador",
        "Escolha o motivo que mais se aproxima do problema.",
        [
          {
            text: "Assédio ou ameaça",
            onPress: () => {
              void submitPlayerReport(targetProfile, "Assédio ou ameaça");
            },
          },
          {
            text: "Spam ou golpe",
            onPress: () => {
              void submitPlayerReport(targetProfile, "Spam ou golpe");
            },
          },
          {
            text: "Perfil falso",
            onPress: () => {
              void submitPlayerReport(targetProfile, "Perfil falso");
            },
          },
          {
            text: "Conteúdo impróprio",
            onPress: () => {
              void submitPlayerReport(targetProfile, "Conteúdo impróprio");
            },
          },
          {
            text: "Outro",
            onPress: () => {
              void submitPlayerReport(targetProfile, "Outro");
            },
          },
          {
            text: "Cancelar",
            style: "cancel",
          },
        ],
        { cancelable: true }
      );
    },
    [submitPlayerReport]
  );

  const handleBlockPlayer = useCallback(
    (targetProfile: PublicPlayerProfile) => {
      Alert.alert(
        "Bloquear jogador",
        `Você deixará de ver novas interações de ${targetProfile.displayName} e a amizade atual será encerrada, se existir.`,
        [
          {
            text: "Cancelar",
            style: "cancel",
          },
          {
            text: "Bloquear",
            style: "destructive",
            onPress: () => {
              void blockPlayerFromProfile(
                targetProfile,
                "Bloqueado pelo usuário no perfil público."
              );
            },
          },
        ],
        { cancelable: true }
      );
    },
    [blockPlayerFromProfile]
  );

  const handleUnblockPlayer = useCallback((blockedUser: BlockedUserProfile) => {
    Alert.alert(
      "Desbloquear jogador",
      `Deseja remover ${blockedUser.displayName} da sua lista de bloqueados?`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Desbloquear",
          onPress: () => {
            void (async () => {
              try {
                setUnblockingUserId(blockedUser.userId);
                setBlockedUsersError(null);
                setBlockedUsersSuccess(null);
                await unblockUser(blockedUser.userId);
                await Promise.allSettled([
                  loadAccountDataRef.current(),
                  loadFriendsRef.current(),
                  loadDashboardRef.current("refresh"),
                ]);
                setBlockedUsersSuccess("Jogador desbloqueado.");
              } catch (unblockError) {
                setBlockedUsersError(toMessage(unblockError));
              } finally {
                setUnblockingUserId(null);
              }
            })();
          },
        },
      ],
      { cancelable: true }
    );
  }, []);

  const { handleMarkNotificationsRead, handleOpenNotification, handlePushNotificationData } =
    useMapNotificationActions({
    notifications,
    effectiveNotifications,
    demoFallbackNotifications: demoBundle.notifications,
    setNotifications,
    setDemoNotifications,
    setLastNotificationSyncAt,
    setMarkingNotificationsRead,
    setNotificationError,
    openChat,
    openPrivateChatById: (chatId: string) => void openPrivateChatByIdRef.current(chatId),
    focusVenueOnMap,
    focusMeetupOnMap,
    resetFilters,
  });
  handleMarkNotificationsReadRef.current = handleMarkNotificationsRead;

  const handledNotificationResponseIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    function processResponse(response: Notifications.NotificationResponse) {
      const identifier =
        response.notification.request.identifier ||
        `${String(response.notification.date)}:${response.notification.request.content.title ?? ""}`;
      if (handledNotificationResponseIdsRef.current.has(identifier)) {
        return;
      }
      handledNotificationResponseIdsRef.current.add(identifier);

      InteractionManager.runAfterInteractions(() => {
        void handlePushNotificationData(response.notification.request.content.data);
      });
    }

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        processResponse(response);
      }
    });

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      processResponse(response);
    });

    return () => {
      subscription.remove();
    };
  }, [handlePushNotificationData]);

  const {
    handleUseCurrentLocationForVenue,
    handleUseCurrentLocationForManageVenue,
    handleResolveTypedVenueAddress,
    handleResolveTypedManageVenueAddress,
    handleCreateVenueSuggestion,
    handleDeleteVenue: handleDeleteVenueAction,
    handleSaveVenueEdits: handleSaveVenueEditsAction,
  } = useMapVenueActions({
    profile,
    venueGameOptions: venueGameOptions.map((game) => ({ id: game.id, label: game.label })),
    selectedVenueKind,
    selectedVenueGameIds,
    venueSuggestionName,
    venueSuggestionNeighborhood,
    venueAddressQuery,
    venueSelectedAddress,
    venueSuggestionDetails,
    manageVenueName,
    manageVenueNeighborhood,
    manageVenueAddressQuery,
    manageVenueSelectedAddress,
    manageVenueDetails,
    manageVenueKind,
    manageVenueGameIds,
    managedVenueFormatIds,
    selectedVenueFormatIds,
    setCreatingMeetup,
    setVenueSuggestionSuccess,
    setError,
    setLocatingDraftPoint,
    setVenueAddressFocused,
    setVenueAddressLoading,
    setVenueSelectedAddress,
    setVenueAddressQuery,
    setVenueAddressSuggestions,
    setVenueSuggestionNeighborhood,
    setOptimisticVenues,
    setSelectedVenueId,
    setSelectedMeetupId,
    switchGamesSheetSection,
    setGamesSheetPreviewMode,
    setActiveScreen,
    setVenueSuggestionName,
    setVenueSuggestionDetails,
    setSelectedVenueKind,
    setDraftCoordinate,
    setVenueComposerOpen,
    loadAccountData: loadAccountDataRef.current,
    loadDashboard: loadDashboardRef.current,
    animateGamesSheet,
    setDeletingEntityId,
    setVenues,
    selectedVenueId,
    setExpandedVenueInfoId,
    setExpandedVenueManageId,
    setEntityActionSuccess,
    setUpdatingVenueId,
    focusVenueOnMap,
    setManageVenueAddressFocused,
    setManageVenueAddressLoading,
    setManageVenueSelectedAddress,
    setManageVenueAddressQuery,
    setManageVenueAddressSuggestions,
    setManageVenueNeighborhood,
  });

  function snapGamesSheetToState(nextState: "expanded" | "preview" | "collapsed") {
    if (nextState === "expanded") {
      setGamesSheetExpanded(true);
      setGamesSheetPreviewMode(false);
      animateGamesSheetTo(0);
      return;
    }

    if (nextState === "preview") {
      animateGamesSheetPreview();
      return;
    }

    setGamesSheetExpanded(false);
    setGamesSheetPreviewMode(false);
    animateGamesSheetTo(defaultCollapsedGamesSheetOffset);
  }

  function resolveGamesSheetSnapPoint(currentValue: number, velocityY: number) {
    const topMidpoint = previewGamesSheetOffset / 2;
    const bottomMidpoint =
      previewGamesSheetOffset +
      (defaultCollapsedGamesSheetOffset - previewGamesSheetOffset) / 2;

    if (velocityY <= -0.35) {
      return currentValue > previewGamesSheetOffset + 28 ? "preview" : "expanded";
    }

    if (velocityY >= 0.35) {
      return currentValue < previewGamesSheetOffset - 28 ? "preview" : "collapsed";
    }

    if (currentValue <= topMidpoint) {
      return "expanded";
    }

    if (currentValue <= bottomMidpoint) {
      return "preview";
    }

    return "collapsed";
  }

  function snapGamesSheetToNearest(targetValue: number, velocity = 0) {
    snapGamesSheetToState(resolveGamesSheetSnapPoint(targetValue, velocity));
  }
  snapGamesSheetToNearestRef.current = snapGamesSheetToNearest;

  function animateComposerOut(onClosed?: () => void) {
    Animated.timing(composerSheetTranslateY, {
      toValue: height,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setComposerOpen(false);
      currentComposerSheetValueRef.current = 0;
      onClosed?.();
    });
  }

  function animatePageIn() {
    pageTranslateY.stopAnimation();
    Animated.spring(pageTranslateY, {
      toValue: 0,
      damping: 26,
      stiffness: 245,
      mass: 0.92,
      overshootClamping: true,
      useNativeDriver: true,
    }).start();
  }
  animatePageInRef.current = animatePageIn;

  function finalizePageToMap() {
    setDrawerOpen(false);
    closeDrawerSubmenus();
    setActiveScreen("map");
    pageTranslateY.setValue(height);
    currentPageTranslateYRef.current = height;
  }

  function animatePageOutToMap(onClosed?: () => void) {
    Keyboard.dismiss();
    setGamesSheetExpanded(false);
    gamesSheetTranslateY.setValue(collapsedGamesSheetOffset);
    currentGamesSheetValueRef.current = collapsedGamesSheetOffset;

    pageTranslateY.stopAnimation();
    Animated.timing(pageTranslateY, {
      toValue: height,
      duration: 228,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      finalizePageToMap();
      onClosed?.();
    });
  }
  animatePageOutToMapRef.current = animatePageOutToMap;

  function dismissKeyboardThen(action: () => void) {
    Keyboard.dismiss();
    setTimeout(action, Platform.OS === "ios" ? 90 : 16);
  }

  function closeCurrentPageToMap() {
    Keyboard.dismiss();
    chatReturnSnapshotRef.current = null;
    chatRoomTranslateX.setValue(0);
    setGamesSheetPreviewMode(false);

    if (activeScreen !== "map") {
      animatePageOutToMap();
      return;
    }

    finalizePageToMap();
  }
  closeCurrentPageToMapRef.current = closeCurrentPageToMap;

  function closeComposer(animated = true) {
    Keyboard.dismiss();
    setComposerError(null);
    setComposerFormatDetailTags({});
    setCalendarOpen(false);
    setTimePickerOpen(false);
    setComposerAddressFocused(false);
    setComposerAddressSuggestions([]);
    setDraftCoordinate(null);
    if (!composerOpen) {
      composerSheetTranslateY.setValue(0);
      currentComposerSheetValueRef.current = 0;
      return;
    }

    if (!animated) {
      setComposerOpen(false);
      composerSheetTranslateY.setValue(0);
      currentComposerSheetValueRef.current = 0;
      return;
    }

    animateComposerOut();
  }
  closeComposerRef.current = closeComposer;

  function cancelVenueComposer() {
    Keyboard.dismiss();
    setError(null);
    setVenueSuggestionSuccess(null);
    setVenueComposerOpen(false);
    setVenueAddressFocused(false);
    setVenueAddressQuery("");
    setVenueSelectedAddress(null);
    setVenueAddressSuggestions([]);
    setSelectedVenueKind("public_place");
    setSelectedVenueGameIds([]);
  }
  cancelVenueComposerRef.current = cancelVenueComposer;

  function openComposerSheet() {
    Keyboard.dismiss();
    setDrawerOpen(false);
    setFiltersOpen(false);
    setGamesSheetPreviewMode(false);
    animateGamesSheet(false);
    setComposerOpen(true);
  }

  function openDrawer() {
    Keyboard.dismiss();
    closeComposer(false);
    setFiltersOpen(false);
    setDrawerOpen(true);
  }

  function openDrawerRootPanel() {
    Animated.timing(drawerPanelProgress, {
      toValue: 0,
      duration: 210,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setDrawerPanel("root");
      }
    });
  }

  function openMap() {
    Keyboard.dismiss();
    closeComposer(false);
    setDrawerOpen(false);
    setDrawerPanel("root");
    drawerPanelProgress.setValue(0);
    setGamesSheetPreviewMode(false);
    chatReturnSnapshotRef.current = null;
    chatRoomTranslateX.setValue(0);
    if (activeScreen !== "map") {
      animatePageOutToMap();
      return;
    }

    setActiveScreen("map");
    animateGamesSheet(false);
  }

  function closeDrawerSubmenus() {
    setDrawerPanel("root");
    drawerPanelProgress.setValue(0);
  }

  function runAfterDrawerTransition(action: () => void) {
    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        action();
      });
    });
  }

  function runFromDrawer(action: () => void) {
    Keyboard.dismiss();
    closeComposer(false);
    dismissPinCallout();
    setDrawerOpen(false);
    closeDrawerSubmenus();

    if (activeScreen !== "map") {
      animatePageOutToMap(() => {
        runAfterDrawerTransition(action);
      });
      return;
    }

    runAfterDrawerTransition(action);
  }

  function openPageScreenFromMap(screen: Exclude<PageScreen, "player">, initialOffset = 24) {
    setPageScreen(screen);
    pageTranslateY.setValue(initialOffset);
    currentPageTranslateYRef.current = initialOffset;
    setActiveScreen(screen);
    animatePageIn();
  }

  function openChatsPage() {
    runFromDrawer(() => {
      setChatViewMode("list");
      setChatsRouteStackKeys([]);
      openPageScreenFromMap("chats");
    });
  }

  function openGames() {
    runFromDrawer(() => {
      setSelectedMeetupId(null);
      setSelectedVenueId(null);
      setVenueComposerOpen(false);
      switchGamesSheetSection("meetups", { animate: true, direction: "right" });
      setGamesSheetPreviewMode(false);
      setActiveScreen("map");
      animateGamesSheet(true);
    });
  }

  function openLocationsSheet() {
    runFromDrawer(() => {
      setSelectedMeetupId(null);
      setSelectedVenueId(null);
      setVenueComposerOpen(false);
      switchGamesSheetSection("venues", { animate: true, direction: "left" });
      setGamesSheetPreviewMode(false);
      setActiveScreen("map");
      animateGamesSheet(true);
    });
  }

  function openChat(meetupId?: string) {
    Keyboard.dismiss();
    closeComposer(false);
    setSelectedPrivateChatId(null);
    setPrivateChatPeer(null);
    const targetMeetup =
      meetupId === undefined
        ? selectedChatMeetup
        : effectiveChatMeetups.find((item) => item.id === meetupId) ??
          allMeetups.find((item) => item.id === meetupId) ??
          null;

    if (targetMeetup && !targetMeetup.isMember && !targetMeetup.isCreator) {
      setError("Entre na partida para acessar o chat.");
      return;
    }

    const openChatFromChatList = activeScreen === "chats" && chatViewMode === "list";

    chatReturnSnapshotRef.current = {
      activeScreen,
      pageScreen,
      chatViewMode,
    };

    if (openChatFromChatList) {
      chatRoomTranslateX.setValue(width);
    } else {
      chatRoomTranslateX.setValue(0);
    }

    setDrawerOpen(false);
    setChatViewMode("room");

    if (meetupId) {
      setSelectedMeetupId(meetupId);
      setSelectedChatMeetupId(meetupId);
      const unreadChatNotificationIds = effectiveNotifications
        .filter(
          (item) =>
            item.kind === "message_received" &&
            item.meetupId === meetupId &&
            item.readAt === null
        )
        .map((item) => item.id);

      if (unreadChatNotificationIds.length) {
        void handleMarkNotificationsRead(unreadChatNotificationIds);
      }
    }

    setPageScreen("chats");

    if (activeScreen === "map") {
      pageTranslateY.setValue(18);
      currentPageTranslateYRef.current = 18;
      setActiveScreen("chats");
      animatePageIn();
      return;
    }

    pageTranslateY.setValue(0);
    currentPageTranslateYRef.current = 0;
    setActiveScreen("chats");

    if (openChatFromChatList) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          Animated.spring(chatRoomTranslateX, {
            toValue: 0,
            damping: 28,
            stiffness: 300,
            mass: 0.88,
            overshootClamping: true,
            useNativeDriver: true,
          }).start();
        });
      });
    }
  }

  function openPrivateChatRoom(thread: PrivateChatSummary) {
    Keyboard.dismiss();
    closeComposer(false);
    setSelectedChatMeetupId(null);
    setSelectedPrivateChatId(thread.chatId);
    setPrivateChatPeer({
      userId: thread.otherUserId,
      displayName: thread.otherDisplayName,
      handle: thread.otherHandle,
      avatarUrl: thread.otherAvatarUrl,
      isPro: thread.otherIsPro,
      proExpiresAt: thread.otherProExpiresAt ?? null,
      canSendMessages: thread.canSendMessages,
    });

    const openChatFromChatList = activeScreen === "chats" && chatViewMode === "list";

    chatReturnSnapshotRef.current = {
      activeScreen,
      pageScreen,
      chatViewMode,
    };

    if (openChatFromChatList) {
      chatRoomTranslateX.setValue(width);
    } else {
      chatRoomTranslateX.setValue(0);
    }

    setDrawerOpen(false);
    setChatViewMode("room");

    const unreadPrivateIds = effectiveNotifications
      .filter(
        (item) =>
          item.kind === "message_received" &&
          item.privateChatId === thread.chatId &&
          item.readAt === null
      )
      .map((item) => item.id);

    if (unreadPrivateIds.length) {
      void handleMarkNotificationsRead(unreadPrivateIds);
    }

    setPageScreen("chats");

    if (activeScreen === "map") {
      pageTranslateY.setValue(18);
      currentPageTranslateYRef.current = 18;
      setActiveScreen("chats");
      animatePageIn();
      return;
    }

    pageTranslateY.setValue(0);
    currentPageTranslateYRef.current = 0;
    setActiveScreen("chats");

    if (openChatFromChatList) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          Animated.spring(chatRoomTranslateX, {
            toValue: 0,
            damping: 28,
            stiffness: 300,
            mass: 0.88,
            overshootClamping: true,
            useNativeDriver: true,
          }).start();
        });
      });
    }
  }

  function openChatThenMaybeSendShare(meetupId: string) {
    const pending = pendingMapShareTargetRef.current;
    openChat(meetupId);

    if (!pending) {
      return;
    }

    pendingMapShareTargetRef.current = null;

    InteractionManager.runAfterInteractions(() => {
      void (async () => {
        try {
          const body =
            pending.kind === "meetup"
              ? buildMeetupShareMessageBody(pending.meetup)
              : buildVenueShareMessageBody(pending.venue);
          await sendMeetupMessage(meetupId, body);
        } catch (shareError) {
          setMessageError(toMessage(shareError));
        }
      })();
    });
  }

  function openPrivateChatRoomThenMaybeSendShare(thread: PrivateChatSummary) {
    const pending = pendingMapShareTargetRef.current;
    openPrivateChatRoom(thread);

    if (!pending) {
      return;
    }

    pendingMapShareTargetRef.current = null;

    InteractionManager.runAfterInteractions(() => {
      void (async () => {
        try {
          const body =
            pending.kind === "meetup"
              ? buildMeetupShareMessageBody(pending.meetup)
              : buildVenueShareMessageBody(pending.venue);
          await sendPrivateMessage(thread.chatId, body);
        } catch (shareError) {
          setMessageError(toMessage(shareError));
        }
      })();
    });
  }

  async function handleOpenPrivateChatFromViewedProfile() {
    if (!viewedPlayerProfile || viewedPlayerProfile.userId === profile.userId) {
      return;
    }

    try {
      const { chatId, canSendMessages } = await getOrCreatePrivateChat(viewedPlayerProfile.userId);
      openPrivateChatRoom({
        chatId,
        otherUserId: viewedPlayerProfile.userId,
        otherDisplayName: viewedPlayerProfile.displayName,
        otherHandle: viewedPlayerProfile.handle,
        otherAvatarPath: viewedPlayerProfile.avatarPath,
        otherAvatarUrl: viewedPlayerProfile.avatarUrl,
        otherIsPro: viewedPlayerProfile.isPro,
        otherProExpiresAt: viewedPlayerProfile.proExpiresAt ?? null,
        lastMessageBody: null,
        lastMessageAt: null,
        canSendMessages,
      });
      try {
        const rows = await listPrivateChats();
        setPrivateChatsList(rows);
      } catch {
        // best-effort
      }
    } catch (fetchError) {
      setError(toMessage(fetchError));
    }
  }

  async function openPrivateChatById(chatId: string) {
    let row = privateChatsList.find((item) => item.chatId === chatId) ?? null;
    if (!row) {
      try {
        const rows = await listPrivateChats();
        setPrivateChatsList(rows);
        row = rows.find((item) => item.chatId === chatId) ?? null;
      } catch {
        return;
      }
    }
    if (row) {
      openPrivateChatRoom(row);
    }
  }

  function closeChatScreen(options?: { animateRoomExit?: boolean }) {
    Keyboard.dismiss();
    setSelectedPrivateChatId(null);
    setPrivateChatPeer(null);

    const snap = chatReturnSnapshotRef.current;
    chatReturnSnapshotRef.current = null;

    if (!snap) {
      openMap();
      return;
    }

    const finishClose = () => {
      if (snap.activeScreen === "map") {
        animatePageOutToMap(() => {
          setChatViewMode(snap.chatViewMode);
          setPageScreen(snap.pageScreen);
          chatRoomTranslateX.setValue(0);
          currentChatRoomTranslateXRef.current = 0;
        });
        return;
      }

      setChatViewMode(snap.chatViewMode);
      setPageScreen(snap.pageScreen);
      setActiveScreen(snap.activeScreen);
      pageTranslateY.setValue(0);
      currentPageTranslateYRef.current = 0;
    };

    if (options?.animateRoomExit) {
      Animated.timing(chatRoomTranslateX, {
        toValue: width,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) {
          return;
        }
        currentChatRoomTranslateXRef.current = width;
        finishClose();
      });
      return;
    }

    if (snap.activeScreen === "map") {
      finishClose();
      return;
    }

    const backToChatList = snap.activeScreen === "chats" && snap.chatViewMode === "list";

    if (backToChatList) {
      Animated.timing(chatRoomTranslateX, {
        toValue: width,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) {
          return;
        }
        setChatViewMode(snap.chatViewMode);
        setPageScreen(snap.pageScreen);
        setActiveScreen(snap.activeScreen);
        pageTranslateY.setValue(0);
        currentPageTranslateYRef.current = 0;
      });
      return;
    }

    finishClose();
  }

  function handleOpenMapFromPrivateChat() {
    Keyboard.dismiss();
    setSelectedPrivateChatId(null);
    setPrivateChatPeer(null);
    setChatViewMode("list");
    closeCurrentPageToMap();
  }

  function promptRemoveMeetupMember(member: MeetupMemberPresence, meetup: MeetupPost) {
    if (!meetup.isCreator || member.role === "creator") {
      return;
    }

    Alert.alert(
      "Remover participante",
      `Remover ${member.displayName} desta partida? A pessoa perderá acesso ao chat e à participação.`,
      [
        { text: "Voltar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: () => {
            void handleRemoveMeetupMember(meetup.id, member.userId);
          },
        },
      ]
    );
  }

  async function handleRemoveMeetupMember(meetupId: string, memberUserId: string) {
    const meetup = allMeetups.find((item) => item.id === meetupId);
    if (!meetup?.isCreator) {
      return;
    }

    try {
      setRemovingMeetupMemberId(memberUserId);
      setMessageError(null);
      await removeMeetupMember(meetupId, memberUserId);
      await Promise.all([loadDashboardRef.current("refresh"), loadNotificationsRef.current()]);
      const nextPresence = await getMeetupMemberPresence(meetupId);
      if (selectedChatMeetup?.id === meetupId) {
        setMeetupPresence(nextPresence);
      }
      setSheetMeetupPresenceById((current) => ({ ...current, [meetupId]: nextPresence }));
      setEntityActionSuccess("Participante removido da partida e do chat.");
    } catch (removeError) {
      setMessageError(toMessage(removeError));
    } finally {
      setRemovingMeetupMemberId(null);
    }
  }

  function openScreen(screen: Exclude<PageScreen, "player">) {
    if (screen === "places") {
      openLocationsSheet();
      return;
    }

    runFromDrawer(() => {
      openPageScreenFromMap(screen);
    });
  }

  function openProPaywall(source: string) {
    if (!env.proPlayerPaywallEnabled) {
      return;
    }

    analyticsCapture("paywall_opened", { source });
    setProPaywallVisible(true);
  }

  async function handleStartProTrial() {
    setProTrialStarting(true);
    try {
      await startProTrial();
      analyticsCapture("trial_started", {});
      setProPaywallVisible(false);
      await onProfileRefresh?.();
    } catch (trialError: unknown) {
      const message =
        trialError && typeof trialError === "object" && "message" in trialError
          ? String((trialError as { message?: string }).message)
          : String(trialError);

      if (message.toLowerCase().includes("trial")) {
        Alert.alert("Teste indisponível", "O teste grátis já foi usado nesta conta.");
      } else {
        Alert.alert("Não foi possível ativar", "Tente novamente em instantes.");
      }
    } finally {
      setProTrialStarting(false);
    }
  }

  function openAccount() {
    Keyboard.dismiss();
    closeComposer(false);
    setDrawerOpen(false);
    setPageScreen("account");

    if (activeScreen === "map") {
      pageTranslateY.setValue(18);
      currentPageTranslateYRef.current = 18;
      setActiveScreen("account");
      animatePageIn();
      return;
    }

    pageTranslateY.setValue(0);
    currentPageTranslateYRef.current = 0;
    setActiveScreen("account");
  }

  function openFriends() {
    Keyboard.dismiss();
    closeComposer(false);
    setDrawerOpen(false);
    setPageScreen("friends");

    if (activeScreen === "map") {
      pageTranslateY.setValue(18);
      currentPageTranslateYRef.current = 18;
      setActiveScreen("friends");
      animatePageIn();
      return;
    }

    pageTranslateY.setValue(0);
    currentPageTranslateYRef.current = 0;
    setActiveScreen("friends");
  }

  function closePlayerProfile() {
    Keyboard.dismiss();
    setViewedPlayerUserId(null);
    setViewedPlayerProfile(null);
    setLoadingViewedPlayer(false);
    setViewedPlayerError(null);

    if (playerReturnContext.activeScreen === "map") {
      openMap();
      return;
    }

    setDrawerOpen(false);
    pageTranslateY.setValue(0);
    currentPageTranslateYRef.current = 0;
    setPageScreen(playerReturnContext.pageScreen ?? "friends");
    setActiveScreen(playerReturnContext.activeScreen);
  }
  closePlayerProfileRef.current = closePlayerProfile;

  function openPlayerProfile(userId: string) {
    if (userId === profile.userId) {
      openAccount();
      return;
    }

    Keyboard.dismiss();
    closeComposer(false);
    setDrawerOpen(false);
    setPlayerReturnContext({
      activeScreen: activeScreen === "player" ? "map" : activeScreen,
      pageScreen:
        activeScreen === "map"
          ? null
          : activeScreen === "player"
            ? null
            : pageScreen === "player"
              ? null
              : pageScreen,
    });
    setViewedPlayerUserId(userId);
    setPageScreen("player");

    if (activeScreen === "map") {
      pageTranslateY.setValue(18);
      currentPageTranslateYRef.current = 18;
      setActiveScreen("player");
      animatePageIn();
      return;
    }

    pageTranslateY.setValue(0);
    currentPageTranslateYRef.current = 0;
    setActiveScreen("player");
  }

  function clearSelectedPin() {
    setSelectedMapGroup(null);
    setSelectedMeetupId(null);
    setSelectedVenueId(null);
    setGamesSheetPreviewMode(false);
    animateGamesSheet(false);
  }

  function dismissPinCallout() {
    setSelectedMapGroup(null);
    setSelectedMeetupId(null);
    setSelectedVenueId(null);
    setPinCalloutDismissNonce((current) => current + 1);
  }

  function handleSelectMeetupFromMap(meetupId: string) {
    const meetup = allMeetups.find((item) => item.id === meetupId);
    setSelectedMapGroup(null);
    setSelectedVenueId(null);
    setSelectedMeetupId(meetupId);
    switchGamesSheetSection("meetups", { animate: false });
    setGamesSheetPreviewMode(true);
    setActiveScreen("map");
    setVenueComposerOpen(false);

    if (meetup) {
      const groupId = slugifyGameLabel(inferGameNameFromMeetup(meetup));
      setExpandedGameGroups((current) => ({
        ...current,
        [groupId]: true,
      }));
    }

    animateGamesSheetPreview();
  }

  function handleSelectVenueFromMap(venueId: string) {
    setSelectedMapGroup(null);
    setSelectedMeetupId(null);
    setSelectedVenueId(venueId);
    switchGamesSheetSection("venues", { animate: false });
    setGamesSheetPreviewMode(true);
    setActiveScreen("map");
    setVenueComposerOpen(false);
    animateGamesSheetPreview();
  }

  function focusMeetupOnMap(meetupId: string, expandSheet = false) {
    const applyFocus = () => {
      setSelectedMapGroup(null);
      handleSelectMeetupFromMap(meetupId);

      if (expandSheet) {
        setGamesSheetPreviewMode(false);
        animateGamesSheet(true);
      }
    };

    if (activeScreen !== "map") {
      chatReturnSnapshotRef.current = null;
      animatePageOutToMap(() => {
        requestAnimationFrame(applyFocus);
      });
      return;
    }

    applyFocus();
  }

  function focusVenueOnMap(venueId: string, expandSheet = false) {
    const applyFocus = () => {
      setSelectedMapGroup(null);
      handleSelectVenueFromMap(venueId);

      if (expandSheet) {
        setGamesSheetPreviewMode(false);
        animateGamesSheet(true);
      }
    };

    if (activeScreen !== "map") {
      chatReturnSnapshotRef.current = null;
      animatePageOutToMap(() => {
        requestAnimationFrame(applyFocus);
      });
      return;
    }

    applyFocus();
  }

  function handleSelectMapGroup(group: MapSelectionGroup) {
    setSelectedMapGroup(group);
    setActiveScreen("map");
    setVenueComposerOpen(false);
    setGamesSheetPreviewMode(true);

    if (group.kind === "meetup" && group.primaryMeetupId) {
      const meetup = allMeetups.find((item) => item.id === group.primaryMeetupId) ?? null;
      setSelectedVenueId(null);
      setSelectedMeetupId(group.primaryMeetupId);
      switchGamesSheetSection("meetups", { animate: false });

      if (meetup) {
        const groupId = slugifyGameLabel(inferGameNameFromMeetup(meetup));
        setExpandedGameGroups((current) => ({
          ...current,
          [groupId]: true,
        }));
      }
    } else if (group.primaryVenueId) {
      setSelectedMeetupId(null);
      setSelectedVenueId(group.primaryVenueId);
      switchGamesSheetSection("venues", { animate: false });
    }

    animateGamesSheetPreview();
  }

  async function handlePickChatImage() {
    if (!selectedChatMeetup?.isCreator) {
      return;
    }

    try {
      setUploadingChatImage(true);
      setMessageError(null);

      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        throw new Error("Permita o acesso a Fotos para escolher a imagem do chat.");
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.82,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      const processedImage = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1024 } }],
        {
          base64: true,
          compress: 0.82,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      if (isDemoId(selectedChatMeetup.id)) {
        setDemoMeetupOverrides((current) => ({
          ...current,
          [selectedChatMeetup.id]: {
            ...(current[selectedChatMeetup.id] ?? {}),
            chatImageUrl: processedImage.uri,
            chatImagePath: null,
          },
        }));
        return;
      }

      await uploadMeetupChatImage({
        meetupId: selectedChatMeetup.id,
        imageUri: processedImage.uri,
        mimeType: "image/jpeg",
        base64: processedImage.base64 ?? null,
      });

      await loadDashboardRef.current("refresh");
      triggerHaptic("success");
    } catch (pickerError) {
      setMessageError(toMessage(pickerError));
    } finally {
      setUploadingChatImage(false);
    }
  }

  const consumeExternalMeetupManageRequest = useCallback(() => {
    setExternalMeetupManageRequest(null);
  }, []);

  const consumeExternalMeetupDetailRequest = useCallback(() => {
    setExternalMeetupDetailRequest(null);
  }, []);

  const consumeExternalVenueDetailRequest = useCallback(() => {
    setExternalVenueDetailRequest(null);
  }, []);

  const openMeetupManageEditorFromChat = useCallback(() => {
    const meetup = effectiveSelectedChatMeetup;
    if (!meetup?.isCreator) {
      return;
    }

    Keyboard.dismiss();
    closeComposerRef.current(false);
    setDrawerOpen(false);

    const groupId = slugifyGameLabel(inferGameNameFromMeetup(meetup));

    const apply = () => {
      switchGamesSheetSectionRef.current("meetups", { animate: false });
      setGamesSheetPreviewMode(false);
      animateGamesSheetRef.current(true);
      setExpandedGameGroups((current) => ({
        ...current,
        [groupId]: true,
      }));
      setExternalMeetupManageRequest({ groupId, meetupId: meetup.id });
    };

    if (activeScreen !== "map") {
      chatReturnSnapshotRef.current = null;
      animatePageOutToMapRef.current(() => {
        requestAnimationFrame(apply);
      });
      return;
    }

    apply();
  }, [activeScreen, effectiveSelectedChatMeetup]);

  useLayoutEffect(() => {
    openMeetupFromShareLinkRef.current = (meetupId: string) => {
      const meetup = allMeetups.find((item) => item.id === meetupId) ?? null;

      if (!meetup) {
        setError("Não encontramos essa partida.");
        return;
      }

      Keyboard.dismiss();
      closeComposer(false);
      setDrawerOpen(false);
      setExpandedMeetupInfoId(meetupId);
      handleSelectMeetupFromMap(meetupId);
      const groupId = slugifyGameLabel(inferGameNameFromMeetup(meetup));
      setExternalMeetupDetailRequest({ groupId, meetupId });
    };

    openVenueFromShareLinkRef.current = (venueId: string) => {
      const venue = allVenues.find((item) => item.id === venueId) ?? null;

      if (!venue) {
        setError("Não encontramos esse local.");
        return;
      }

      Keyboard.dismiss();
      closeComposer(false);
      setDrawerOpen(false);
      handleSelectVenueFromMap(venueId);
      setExternalVenueDetailRequest({ venueId });
    };
  });

  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) {
        return;
      }

      const meetupId = parseMeetupIdFromIncomingUrl(url);
      if (meetupId) {
        openMeetupFromShareLinkRef.current(meetupId);
        return;
      }

      const venueId = parseVenueIdFromIncomingUrl(url);
      if (venueId) {
        openVenueFromShareLinkRef.current(venueId);
      }
    };

    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleUrl(url);
    });

    void Linking.getInitialURL().then((url) => {
      handleUrl(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (pageScreen !== "chats") {
      pendingMapShareTargetRef.current = null;
    }
  }, [pageScreen]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingSafeArea}>
        <View style={styles.loadingState}>
          <ActivityIndicator color={palette.ember} size="large" />
          <Text style={styles.loadingTitle}>Preparando o mapa</Text>
          <Text style={styles.loadingText}>Sincronizando jogos, grupos, locais e amigos.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const screenLayerProps = {
    active: activeScreen === "map",
    mapProps: {
      profile,
      visibleRadiusKm: distanceFilter === "all" ? null : distanceFilter,
      meetups: filteredMeetups,
      venues: filteredVenues,
      selectedMeetupId,
      selectedVenueId,
      selectedMapGroupKey: selectedMapGroup?.key ?? null,
      draftCoordinate: selectedVenue ? null : draftCoordinate,
      immersive: true,
      allowDraftSelection: false,
      bottomOverlayHeight: activeScreen === "map" && gamesSheetPreviewMode ? gamesSheetPeek : 0,
      onVisibleRegionChange: setMapViewportRegion,
      onSelectMeetup: handleSelectMeetupFromMap,
      onSelectVenue: handleSelectVenueFromMap,
      onSelectMapGroup: handleSelectMapGroup,
      onClearSelection: clearSelectedPin,
      pinCalloutDismissNonce,
      onSelectDraftCoordinate: (coordinate: MapCoordinate) => {
        setSelectedVenueId(null);
        setDraftCoordinate(coordinate);
      },
    },
    topOverlay: {
      onDismissPinCallout: dismissPinCallout,
      profileName: profile.displayName,
      profileAvatarUrl: profile.avatarUrl,
      showUnreadMenuIndicator: hasUnreadMenuIndicator,
      incomingFriendRequestsCount,
      filtersActive,
      filtersOpen,
      activeFilterCount,
      error,
      refreshing,
      onOpenDrawer: openDrawer,
      onToggleFilters: () => {
        setDrawerOpen(false);
        closeComposer();
        setFiltersOpen((current) => !current);
      },
      onOpenAccount: openAccount,
      onOpenFriends: openFriends,
      onOpenComposer: openComposerSheet,
      profileIsPro: isUserPro(profile),
    },
    drawerEdgePanHandlers: drawerPanResponders.edgePanResponder.panHandlers,
    gamesSheet: {
      onDismissPinCallout: dismissPinCallout,
      top: gamesSheetTop,
      height: gamesSheetHeight,
      translateY: gamesSheetTranslateY,
      expanded: gamesSheetExpanded,
      meetupCount: filteredMeetups.length,
      venueCount: filteredVenues.length,
      section: gamesSheetSection,
      managedMeetupId: expandedMeetupManageId,
      sortMenuOpen: meetupSortMenuOpen,
      sortMode: meetupSortMode,
      sortOptions: MEETUP_SORT_OPTIONS,
      headerPanHandlers: gamesSheetPanResponder.panHandlers,
      contentBottomPadding: insets.bottom + spacing.xxl,
      sectionOpacity: gamesSectionOpacity,
      sectionTranslateX: gamesSectionTranslateX,
      sectionPanHandlers: gamesSheetSectionPanResponder.panHandlers,
      entityActionSuccess,
      titleNote: sectionDistanceReference,
      nowTimestamp,
      meetupGroups: orderedGameGroups,
      expandedGroupIds: expandedGameGroups,
      hidePastLabel: hidePastMeetups ? "Mostrar jogos passados" : "Ocultar jogos passados",
      venues: orderedVenues,
      expandedVenueManageId,
      venuesComposer: venuesSheetComposer,
      onToggleSortMenu: () => setMeetupSortMenuOpen((current) => !current),
      onSelectSort: (value: MeetupSortMode) => {
        setMeetupSortMode(value);
        setMeetupSortMenuOpen(false);
      },
      onSelectMeetups: () =>
        {
          setMeetupSortMenuOpen(false);
          switchGamesSheetSection("meetups", {
            animate: true,
            direction: "right",
          });
        },
      onSelectVenues: () =>
        {
          setMeetupSortMenuOpen(false);
          switchGamesSheetSection("venues", {
            animate: true,
            direction: "left",
          });
        },
      onToggleHidePast: () => setHidePastMeetups((current) => !current),
      onToggleGroup: (groupId: string) =>
        setExpandedGameGroups((current) => ({
          ...current,
          [groupId]: !(current[groupId] ?? false),
        })),
      onOpenManageMeetup: (meetup: MeetupPost) => {
        setSelectedMeetupId(meetup.id);
        setExpandedMeetupManageId(meetup.id);
        setExpandedMeetupInfoId((current) => (current === meetup.id ? null : current));
      },
      onCloseManageMeetup: (meetup: MeetupPost) => {
        setExpandedMeetupManageId((current) => (current === meetup.id ? null : current));
      },
      onOpenManageVenue: (venue: VenueCard) => {
        setSelectedVenueId(venue.id);
        setExpandedVenueManageId(venue.id);
      },
      onCloseManageVenue: (venue: VenueCard) => {
        setExpandedVenueManageId((current) => (current === venue.id ? null : current));
      },
      renderMeetupListItem: renderMeetupSheetListItem,
      renderMeetupDetail: renderMeetupSheetDetail,
      renderMeetupManage: renderMeetupSheetManage,
      renderMeetupParticipants: renderMeetupSheetParticipants,
      externalMeetupManageRequest,
      onConsumedExternalMeetupManageRequest: consumeExternalMeetupManageRequest,
      externalMeetupDetailRequest,
      onConsumedExternalMeetupDetailRequest: consumeExternalMeetupDetailRequest,
      resolveMeetupById: (meetupId: string) =>
        allMeetups.find((item) => item.id === meetupId) ?? null,
      externalVenueDetailRequest,
      onConsumedExternalVenueDetailRequest: consumeExternalVenueDetailRequest,
      resolveVenueById: (venueId: string) => allVenues.find((item) => item.id === venueId) ?? null,
      renderVenueListItem: renderVenueSheetListItem,
      renderVenueDetail: renderVenueSheetDetail,
      renderVenueManage: renderVenueSheetManage,
    },
  };

  const pageLayerProps = {
    active: activeScreen !== "map",
    opacity: pageLayerOpacity,
    translateY: pageTranslateY,
    scale: pageLayerScale,
    chatRoomTranslateX,
    pageScreen,
    chatViewMode,
    profileName: profile.displayName,
    profileAvatarUrl: profile.avatarUrl,
    profileIsPro: isUserPro(profile),
    showUnreadMenuIndicator: hasUnreadMenuIndicator,
    dismissPanHandlers: pageDismissPanResponder.panHandlers,
    chatRoomEdgePanHandlers: chatRoomBackPanResponder.panHandlers,
    chatScreenProps: {
      currentUserId: profile.userId,
      threadKind: (selectedPrivateChatId ? "private" : "meetup") as "meetup" | "private",
      privatePeer: privateChatPeer,
      meetup: effectiveSelectedChatMeetup,
      meetupPresence: effectiveMeetupPresence,
      messages: effectiveMessages,
      lastMessageSyncAt,
      loadingMessages,
      loadingMeetupPresence,
      selectedChatAllowsMessages,
      messageBody,
      messageError,
      sendingMessage,
      updatingMeetupAction,
      removingParticipantId: removingMeetupMemberId,
      leavingMeetup: effectiveSelectedChatMeetup
        ? leavingMeetupId === effectiveSelectedChatMeetup.id
        : false,
      ratingActionId,
      canRateSelectedChatMeetup,
      replyingToMessage,
      onBack: () => closeChatScreen(),
      onOpenPlayerProfile: openPlayerProfile,
      onReplyToMessage: (messageId: string) => setReplyingToMessageId(messageId),
      onClearReply: () => setReplyingToMessageId(null),
      onChangeMessageBody: setMessageBody,
      onSendMessage: () => void handleSendMessage(),
      onOpenMeetupPinOnMap: () =>
        effectiveSelectedChatMeetup && !selectedChatIsDemo
          ? focusMeetupOnMap(effectiveSelectedChatMeetup.id, false)
          : openMap(),
      onEditMeetup: openMeetupManageEditorFromChat,
      onLeaveMeetup: () =>
        effectiveSelectedChatMeetup
          ? void handleLeaveMeetup(effectiveSelectedChatMeetup.id)
          : undefined,
      onUpdateAttendanceStatus: (status: AttendanceStatus) =>
        void handleUpdateAttendanceStatus(status),
      onUpdateMeetupStatus: (status: "closed" | "cancelled") =>
        promptChatMeetupStatusChange(status),
      onRemoveParticipant: (userId: string) =>
        effectiveSelectedChatMeetup
          ? promptRemoveMeetupMember(
              effectiveMeetupPresence.find((member) => member.userId === userId) ?? {
                userId,
                displayName: "Participante",
                handle: "",
                avatarPath: null,
                avatarUrl: null,
                attendanceStatus: "interested",
                role: "participant",
                joinedAt: new Date().toISOString(),
              },
              effectiveSelectedChatMeetup
            )
          : undefined,
      onRateMember: (reviewedUserId: string, attended: boolean, rating?: number) =>
        handleRateMember(
          reviewedUserId,
          attended,
          attended ? (rating ?? 5) : undefined
        ),
      onPickChatImage: () => void handlePickChatImage(),
      pickingChatImage: uploadingChatImage,
      onOpenMapDirect: selectedPrivateChatId ? handleOpenMapFromPrivateChat : undefined,
      onOpenSharedMeetupDeepLink: (meetupId: string) => {
        openMeetupFromShareLinkRef.current(meetupId);
      },
      onOpenSharedVenueDeepLink: (venueId: string) => {
        openVenueFromShareLinkRef.current(venueId);
      },
    },
    pageContentProps: {
      pageScreen,
      bottomInset: insets.bottom,
      nowTimestamp,
      profile,
      reputationSummary,
      chatSections: chatListSections,
      privateChats: privateChatsList,
      loadingPrivateChats,
      chatsRouteStackKeys,
      onChatsRouteStackChange: setChatsRouteStackKeys,
      lastDashboardSyncAt,
      lastAccountSyncAt,
      lastFriendSyncAt,
      markingNotificationsRead,
      unreadChatMeetupIds,
      unreadPrivateChatIds,
      notifications: effectiveNotifications,
      notificationError,
      venues: sortedFilteredVenues,
      venueSuggestions,
      venueSuggestionName,
      onChangeVenueSuggestionName: setVenueSuggestionName,
      venueAddressQuery,
      venueAddressFocused,
      onChangeVenueAddressFocused: setVenueAddressFocused,
      onChangeVenueAddressQuery: (value: string) => {
        setVenueAddressQuery(value);
        setVenueSelectedAddress(null);
      },
      venueAddressSuggestions,
      venueAddressLoading,
      onUseCurrentLocationForVenue: () => {
        void handleUseCurrentLocationForVenue();
      },
      onUseTypedAddressForVenue: () => {
        void handleResolveTypedVenueAddress();
      },
      onSelectVenueAddressSuggestion: (suggestion: AddressSuggestion) => {
        setVenueSelectedAddress(suggestion);
        setVenueAddressQuery(suggestion.fullLabel);
        setVenueAddressSuggestions([]);
        if (suggestion.subtitle) {
          setVenueSuggestionNeighborhood(suggestion.subtitle);
        }
      },
      venueSuggestionDetails,
      onChangeVenueSuggestionDetails: setVenueSuggestionDetails,
      venueKindOptions,
      selectedVenueKind,
      onSelectVenueKind: setSelectedVenueKind,
      venueGameOptions,
      selectedVenueGameIds,
      onToggleVenueGameId: (gameId: string) =>
        setSelectedVenueGameIds((current) =>
          current.includes(gameId)
            ? current.filter((item) => item !== gameId)
            : [...current, gameId]
        ),
      venueSuggestionSuccess,
      locatingDraftPoint,
      hasSelectedVenueAddress: Boolean(venueSelectedAddress),
      selectedVenueFormatCount: selectedVenueFormatIds.length,
      creatingMeetup,
      onCreateVenueSuggestion: () => {
        void handleCreateVenueSuggestion();
      },
      onFocusVenueOnMap: focusVenueOnMap,
      onCreateMeetupAtVenue: (venueId: string) => {
        setSelectedVenueId(venueId);
        setActiveScreen("map");
        openComposerSheet();
      },
      historyMeetups,
      friendError,
      friendSuccess,
      incomingFriendRequests,
      friendRequestsExpanded,
      onToggleFriendRequests: () => setFriendRequestsExpanded((current) => !current),
      acceptedFriends,
      outgoingFriendRequests,
      onlineFriendsCount: onlineFriends.length,
      playerSearchQuery,
      onChangePlayerSearchQuery: setPlayerSearchQuery,
      onSearchPlayers: () => {
        void handleSearchPlayers();
      },
      searchingPlayers,
      playerSearchResults,
      recentPlayers,
      friendActionId,
      safetyActionId,
      onOpenPlayerProfile: openPlayerProfile,
      onSendFriendRequest: (candidate: FriendActionCandidate) => {
        void handleSendFriendRequest(candidate.userId, candidate);
      },
      onRespondToFriendRequest: (
        friendshipId: string,
        accept: boolean,
        candidate: FriendActionCandidate
      ) => {
        void handleRespondToFriendRequest(friendshipId, accept, candidate);
      },
      onRemoveFriend: (userId: string) => {
        void handleRemoveFriend(userId);
      },
      onReportUser: (targetProfile: PublicPlayerProfile) => {
        promptReportPlayer(targetProfile);
      },
      onBlockUser: (targetProfile: PublicPlayerProfile) => {
        handleBlockPlayer(targetProfile);
      },
      blockedUsers,
      blockedUsersError,
      blockedUsersSuccess,
      loadingBlockedUsers,
      unblockingUserId,
      onEnterBlockedUsersScene: () => void loadAccountDataRef.current(),
      onUnblockUser: (user: BlockedUserProfile) => {
        handleUnblockPlayer(user);
      },
      onProfileEdit,
      onSignOut: () => {
        void handleSignOut();
      },
      onDeleteAccount: handleDeleteAccountPress,
      viewedPlayerProfile,
      loadingViewedPlayer,
      viewedPlayerError,
      incomingRequestFriendshipId: incomingRequestForViewedPlayer?.friendshipId ?? null,
      onMarkNotificationsRead: () =>
        void handleMarkNotificationsRead(
          pageScreen === "chats"
            ? effectiveNotifications
                .filter((item) => item.kind === "message_received" && item.readAt === null)
                .map((item) => item.id)
            : undefined
        ),
      onOpenChat: openChatThenMaybeSendShare,
      onOpenPrivateChat: openPrivateChatRoomThenMaybeSendShare,
      onOpenPrivateChatFromViewedProfile: handleOpenPrivateChatFromViewedProfile,
      onOpenNotification: (notification: InAppNotification) => {
        void handleOpenNotification(notification);
      },
      onOpenProPaywall: openProPaywall,
      onAppNewsInboxOpened: refreshAppNewsUnreadCount,
      onClose: closeCurrentPageToMap,
    },
    onOpenMenu: openDrawer,
    onOpenAccount: openAccount,
    onCloseCurrentPage: closeCurrentPageToMap,
    onClosePlayerProfile: closePlayerProfile,
  };

  const drawerProps = {
    open: drawerOpen,
    width: drawerWidth,
    translateX: drawerTranslateX,
    backdropOpacity: drawerBackdropOpacity,
    panelProgress: drawerPanelProgress,
    panel: drawerPanel,
    mapActive: activeScreen === "map" && !gamesSheetExpanded,
    gamesActive: activeScreen === "map" && gamesSheetExpanded && gamesSheetSection === "meetups",
    novidadesActive: activeScreen === "novidades",
    alertsActive: activeScreen === "alerts",
    chatsActive: activeScreen === "chats",
    placesActive: activeScreen === "map" && gamesSheetExpanded && gamesSheetSection === "venues",
    historyActive: activeScreen === "history",
    nearbyPlayersActive: activeScreen === "nearby_players",
    feedbackActive: activeScreen === "feedback",
    unreadChatCount,
    unreadAlertCount,
    unreadNovidadesCount: unreadAppNewsCount,
    onlineFriends,
    appVersion: appInfo.version,
    chatGroups: memberMeetupsByGame,
    archivedChats: archivedChatMeetups,
    expandedChatGroupIds: expandedDrawerChatGroupIds,
    unreadChatMeetupIds,
    nowTimestamp,
    onClose: () => {
      dismissPinCallout();
      setDrawerOpen(false);
    },
    onOpenMap: openMap,
    onOpenGames: openGames,
    onOpenNovidades: () => openScreen("novidades"),
    onOpenChats: openChatsPage,
    onOpenAlerts: () => openScreen("alerts"),
    onOpenPlaces: () => openScreen("places"),
    onOpenHistory: () => openScreen("history"),
    onOpenNearbyPlayers: () => openScreen("nearby_players"),
    onOpenFeedback: () => openScreen("feedback"),
    onOpenPlayerProfile: openPlayerProfile,
    onBackToRoot: openDrawerRootPanel,
    onToggleChatGroup: (groupId: string) =>
      setExpandedDrawerChatGroupIds((current) => ({
        ...current,
        [groupId]: !(current[groupId] ?? true),
      })),
    onOpenChat: openChatThenMaybeSendShare,
    panHandlers: drawerPanResponders.drawerPanResponder.panHandlers,
  };

  const modalLayerProps = {
    filtersProps: {
      visible: filtersOpen,
      filteredMeetupCount: filteredMeetups.length,
      filteredVenueCount: filteredVenues.length,
      filterCloseTop: filterCloseTop,
      filterPanelTop: filterPanelTop,
      filterPanelMaxHeight: filterPanelMaxHeight,
      entityFilterOptions,
      entityFilters,
      onToggleEntityFilter: (value: MapEntityFilter) =>
        setEntityFilters((current) => {
          const next = current.includes(value)
            ? current.filter((item) => item !== value)
            : [...current, value];

          return next.length ? next : current;
        }),
      venueGameOptions: venueGameOptions.map((game) => ({ id: game.id, label: game.label })),
      selectedGameFilterIds,
      onToggleGameFilter: (gameId: string) =>
        setSelectedGameFilterIds((current) => {
          const next = current.includes(gameId)
            ? current.filter((item) => item !== gameId)
            : [...current, gameId];
          const game = venueGameOptions.find((item) => item.id === gameId);

          if (game && !next.includes(gameId)) {
            setSelectedFormatFilterIds((formatsCurrent) =>
              formatsCurrent.filter((formatId) => !game.formatIds.includes(formatId))
            );
          }

          return next;
        }),
      visibleFormatGroups,
      selectedFormatFilterIds,
      onToggleFormatFilter: (formatId: string) =>
        setSelectedFormatFilterIds((current) =>
          current.includes(formatId)
            ? current.filter((item) => item !== formatId)
            : [...current, formatId]
        ),
      filterDetailSections: mapFilterDetailSections,
      distanceOptions,
      distanceFilter,
      onSelectDistanceFilter: setDistanceFilter,
      filterDateSummary: formatFilterDateSummary(filterDateFrom, filterDateTo),
      onOpenDatePicker: () => {
        Keyboard.dismiss();
        setFilterCalendarMonthCursor(
          startOfCalendarMonth(parseComposerDate(filterDateFrom ?? toCalendarDateKey(new Date())))
        );
        setFilterDateOpen(true);
      },
      periodOptions,
      periodFilters,
      onClearPeriods: () => setPeriodFilters([]),
      onTogglePeriodFilter: (value: PeriodFilter) =>
        setPeriodFilters((current) =>
          current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
        ),
      onResetFilters: resetFilters,
      onApplyFilters: () => setFiltersOpen(false),
      filterDateOpen,
      filterCalendarMonthLabel: formatCalendarMonthLabel(filterCalendarMonthCursor),
      filterCalendarCells: buildCalendarCells(filterCalendarMonthCursor),
      filterDateFrom,
      filterDateTo,
      onShiftFilterMonth: (amount: number) =>
        setFilterCalendarMonthCursor((current) => shiftCalendarMonth(current, amount)),
      onSelectFilterDate: (selectedDate: string) => {
        const next = selectFilterDateRange({
          currentStart: filterDateFrom,
          currentEnd: filterDateTo,
          selectedDate,
        });
        setFilterDateFrom(next.start);
        setFilterDateTo(next.end);
      },
      onClearFilterDate: () => {
        setFilterDateFrom(null);
        setFilterDateTo(null);
      },
      onUseFilterDate: () => setFilterDateOpen(false),
      onClose: () => setFiltersOpen(false),
    },
    composerVisible: composerOpen,
    onCloseComposer: () => closeComposer(),
    venueComposerVisible: venueComposerOpen,
    onCloseVenueComposer: cancelVenueComposer,
    manageCalendarOverlay: {
      open: manageCalendarOpen,
      monthLabel: formatCalendarMonthLabel(manageCalendarMonthCursor),
      cells: buildCalendarCells(manageCalendarMonthCursor),
      selectedDateKey: manageDate ?? "",
      onShiftMonth: (amount: number) =>
        setManageCalendarMonthCursor((current) => shiftCalendarMonth(current, amount)),
      onSelectDate: (dateKey: string, date: Date) => {
        setManageDate(dateKey);
        setManageCalendarMonthCursor(startOfCalendarMonth(date));
        setManageCalendarOpen(false);
      },
      onClose: () => setManageCalendarOpen(false),
    },
    manageTimeOverlay: {
      open: manageTimePickerOpen,
      selectedHour: manageHour,
      selectedMinute: manageMinute,
      hours: TIME_HOURS,
      minutes: TIME_MINUTES,
      onChangeHour: setManageHour,
      onChangeMinute: setManageMinute,
      onClose: () => setManageTimePickerOpen(false),
      onConfirm: () => setManageTimePickerOpen(false),
    },
    composerSheetProps: {
      sheetHeight: composerSheetHeight,
      bottomInset: insets.bottom,
      translateY: composerSheetTranslateY,
      keyboardPadding: composerFooterReserve + composerKeyboardHeight,
      gameOptions: composerGameOptions,
      selectedGameId: selectedComposerGameId,
      onSelectGame: setSelectedComposerGameId,
      meetupTitle,
      onChangeMeetupTitle: setMeetupTitle,
      meetupDescription,
      onChangeMeetupDescription: setMeetupDescription,
      composerDateLabel: formatComposerDateLabel(composerDate),
      composerHour,
      composerMinute,
      onOpenCalendar: () => {
        dismissKeyboardThen(() => {
          setTimePickerOpen(false);
          setCalendarMonthCursor(startOfCalendarMonth(parseComposerDate(composerDate)));
          setCalendarOpen(true);
        });
      },
      onOpenTimePicker: () => {
        dismissKeyboardThen(() => {
          setCalendarOpen(false);
          setTimePickerOpen(true);
        });
      },
      showFormatSection: Boolean(selectedComposerGameId),
      formatOptions: composerFormatOptions,
      selectedFormatId,
      onSelectFormat: setSelectedFormatId,
      formatDetailKind: composerDetailKind,
      formatDetailSelected: composerDetailSelected,
      onToggleFormatDetail: handleToggleComposerFormatDetail,
      hostModeOptions,
      hostMode,
      onSelectHostMode: (value: string) => {
        const next = value as ComposerMeetupMode;
        setHostMode(next);
        if (next !== "public_place" && next !== "specialty_store") {
          setSelectedVenueId(null);
        }
      },
      selectedVenueId,
      availableVenues: availableComposerVenues,
      onSelectVenue: (venue: VenueCard) => {
        setSelectedVenueId(venue.id);
        setHostMode(venue.kind === "specialty_store" ? "specialty_store" : "public_place");
        setComposerAddressSuggestions([]);
        setDraftCoordinate(null);
      },
      addressQuery: composerAddressQuery,
      addressFocused: composerAddressFocused,
      onAddressFocusChange: setComposerAddressFocused,
      onAddressChange: (value: string) => {
        setComposerAddressQuery(value);
        setComposerSelectedAddress(null);
        setDraftCoordinate(null);
        if (value.trim()) {
          setSelectedVenueId(null);
        }
      },
      addressSuggestions: composerAddressSuggestions,
      addressLoading: composerAddressLoading,
      onUseCurrentLocation: () => {
        void handleUseCurrentLocationForMeetup();
      },
      onUseTypedAddress: () => {
        void handleUseTypedAddressForMeetup();
      },
      onSelectAddressSuggestion: (suggestion: AddressSuggestion) => {
        setComposerSelectedAddress(suggestion);
        setComposerAddressQuery(suggestion.fullLabel);
        setComposerAddressSuggestions([]);
        setSelectedVenueId(null);
        setDraftCoordinate({
          latitude: suggestion.latitude,
          longitude: suggestion.longitude,
        });
      },
      errorMessage: composerError,
      onClose: () => closeComposer(),
      creatingMeetup,
      publishDisabled:
        !selectedComposerGameId ||
        !selectedFormatId ||
        !composerDetailTagsSatisfied ||
        meetupTitle.trim().length < MEETUP_TITLE_MIN_LENGTH ||
        meetupTitle.trim().length > MEETUP_TITLE_MAX_LENGTH,
      onPublish: () => void handleCreateMeetup(),
      calendarOpen,
      calendarMonthLabel: formatCalendarMonthLabel(calendarMonthCursor),
      calendarCells: buildCalendarCells(calendarMonthCursor),
      selectedDateKey: composerDate,
      onShiftCalendarMonth: (amount: number) =>
        setCalendarMonthCursor((current) => shiftCalendarMonth(current, amount)),
      onSelectCalendarDate: (dateKey: string, date: Date) => {
        setComposerDate(dateKey);
        setCalendarMonthCursor(startOfCalendarMonth(date));
        setCalendarOpen(false);
      },
      onCloseCalendar: () => setCalendarOpen(false),
      timePickerOpen,
      onCloseTimePicker: () => setTimePickerOpen(false),
      onConfirmTimePicker: () => setTimePickerOpen(false),
      onChangeHour: setComposerHour,
      onChangeMinute: setComposerMinute,
      timeHours: TIME_HOURS,
      timeMinutes: TIME_MINUTES,
    },
    venueComposerSheetProps: {
      sheetHeight: composerSheetHeight,
      translateY: composerSheetTranslateY,
      bottomInset: insets.bottom,
      keyboardPadding: composerFooterReserve + composerKeyboardHeight,
      name: venueSuggestionName,
      addressQuery: venueAddressQuery,
      addressFocused: venueAddressFocused,
      addressSuggestions: venueAddressSuggestions,
      addressLoading: venueAddressLoading,
      details: venueSuggestionDetails,
      venueKindOptions,
      selectedVenueKind,
      venueGameOptions,
      selectedVenueGameIds,
      successMessage: venueSuggestionSuccess,
      locatingDraftPoint,
      hasSelectedVenueAddress: Boolean(venueSelectedAddress),
      selectedVenueFormatCount: selectedVenueFormatIds.length,
      submitting: creatingMeetup,
      onClose: cancelVenueComposer,
      onChangeName: setVenueSuggestionName,
      onChangeAddressFocused: setVenueAddressFocused,
      onChangeAddressQuery: (value: string) => {
        setVenueAddressQuery(value);
        setVenueSelectedAddress(null);
      },
      onUseCurrentLocation: () => {
        void handleUseCurrentLocationForVenue();
      },
      onUseTypedAddress: () => {
        void handleResolveTypedVenueAddress();
      },
      onSelectAddressSuggestion: (suggestion: AddressSuggestion) => {
        setVenueSelectedAddress(suggestion);
        setVenueAddressQuery(suggestion.fullLabel);
        setVenueAddressSuggestions([]);
        if (suggestion.subtitle) {
          setVenueSuggestionNeighborhood(suggestion.subtitle);
        }
      },
      onChangeDetails: setVenueSuggestionDetails,
      onSelectVenueKind: setSelectedVenueKind,
      onToggleVenueGameId: (gameId: string) =>
        setSelectedVenueGameIds((current) =>
          current.includes(gameId)
            ? current.filter((item) => item !== gameId)
            : [...current, gameId]
        ),
      onSubmit: () => void handleCreateVenueSuggestion(),
    },
  };

  openPrivateChatByIdRef.current = openPrivateChatById;

  return (
    <>
      <StatusBar style="light" />
      <MapHomeSurface
        screenLayerProps={screenLayerProps}
        pageLayerProps={pageLayerProps}
        drawerProps={drawerProps}
        modalLayerProps={modalLayerProps}
      />
      {env.proPlayerPaywallEnabled ? (
        <ProPlayerPaywallModal
          visible={proPaywallVisible}
          onClose={() => {
            setProPaywallVisible(false);
          }}
          onStartTrial={() => {
            void handleStartProTrial();
          }}
          startingTrial={proTrialStarting}
        />
      ) : null}
      <MeetupShareOverlay
        visible={mapShareOverlayTarget !== null}
        headline={
          mapShareOverlayTarget?.kind === "meetup"
            ? mapShareOverlayTarget.meetup.title
            : mapShareOverlayTarget?.kind === "venue"
              ? mapShareOverlayTarget.venue.name
              : ""
        }
        onClose={() => setMapShareOverlayTarget(null)}
        onShareInChat={() => {
          if (!mapShareOverlayTarget) {
            return;
          }

          const next = mapShareOverlayTarget;
          setMapShareOverlayTarget(null);
          pendingMapShareTargetRef.current = next;
          openChatsPage();
        }}
        onShareExternal={() => {
          if (!mapShareOverlayTarget) {
            return;
          }

          const next = mapShareOverlayTarget;
          setMapShareOverlayTarget(null);

          const { message } =
            next.kind === "meetup"
              ? buildExternalShareContent(next.meetup.id)
              : buildExternalVenueShareContent(next.venue.id);

          const runShare = () => {
            void Share.share(
              Platform.OS === "ios"
                ? {
                    title: "Good Game",
                    message,
                  }
                : {
                    title: "Good Game",
                    message: `${message}`,
                  }
            ).catch((shareError: unknown) => {
              if (__DEV__) {
                console.warn("[share]", shareError);
              }
            });
          };

          InteractionManager.runAfterInteractions(() => {
            setTimeout(runShare, Platform.OS === "ios" ? 350 : 0);
          });
        }}
      />
      <AppNewsDetailOverlay
        visible={coldStartAppNews !== null}
        item={coldStartAppNews}
        onClose={handleDismissColdStartAppNews}
      />
    </>
  );
}
