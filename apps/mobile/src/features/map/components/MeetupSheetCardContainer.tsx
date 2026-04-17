import { inferGameNameFromLabels } from "@/features/map/gameLabels";
import { isMeetupOverdue, resolveMeetupEffectiveStatus } from "@/features/map/meetupTiming";
import { formatCompactAddress, formatDateTime, formatDistanceKm, formatShortAddress } from "@/lib/formatting";
import type { AddressSuggestion } from "@/lib/placeSearch";
import type { MeetupPost } from "@/types/domain";

import { MeetupSheetCard } from "./MeetupSheetCard";

type MeetupSheetCardContainerProps = {
  mode: "detail" | "manage";
  meetup: MeetupPost;
  profileLat: number | null;
  profileLng: number | null;
  nowTimestamp: number;
  selectedMeetupId: string | null;
  expandedMeetupInfoId: string | null;
  expandedMeetupManageId: string | null;
  joiningMeetupId: string | null;
  leavingMeetupId: string | null;
  updatingMeetupAction: string | null;
  updatingMeetupLocationId: string | null;
  deletingEntityId: string | null;
  manageDateLabel: string;
  manageHour: string;
  manageMinute: string;
  manageAddressQuery: string;
  manageAddressFocused: boolean;
  manageAddressSuggestions: AddressSuggestion[];
  manageAddressLoading: boolean;
  onFocusMeetupOnMap: () => void;
  onOpenPlayerProfile: () => void;
  onJoinMeetup: () => void;
  onLeaveMeetup: () => void;
  onOpenChat: () => void;
  onToggleManage: () => void;
  onToggleInfo: () => void;
  onOpenManageCalendar: () => void;
  onOpenManageTimePicker: () => void;
  onOpenManageParticipants?: () => void;
  onOpenDetailParticipants?: () => void;
  onManageAddressFocusChange: (focused: boolean) => void;
  onManageAddressChange: (value: string) => void;
  onManageAddressUseCurrentLocation: () => void;
  onManageAddressUseTyped: () => void;
  onManageAddressSelect: (suggestion: AddressSuggestion) => void;
  onSaveEdits: () => void;
  onPromptClose: () => void;
  onPromptCancel: () => void;
  onPromptDelete: () => void;
};

export function MeetupSheetCardContainer({
  mode,
  meetup,
  profileLat,
  profileLng,
  nowTimestamp,
  selectedMeetupId,
  expandedMeetupInfoId,
  expandedMeetupManageId,
  joiningMeetupId,
  leavingMeetupId,
  updatingMeetupAction,
  updatingMeetupLocationId,
  deletingEntityId,
  manageDateLabel,
  manageHour,
  manageMinute,
  manageAddressQuery,
  manageAddressFocused,
  manageAddressSuggestions,
  manageAddressLoading,
  onFocusMeetupOnMap,
  onOpenPlayerProfile,
  onJoinMeetup,
  onLeaveMeetup,
  onOpenChat,
  onToggleManage,
  onToggleInfo,
  onOpenManageCalendar,
  onOpenManageTimePicker,
  onOpenManageParticipants,
  onOpenDetailParticipants,
  onManageAddressFocusChange,
  onManageAddressChange,
  onManageAddressUseCurrentLocation,
  onManageAddressUseTyped,
  onManageAddressSelect,
  onSaveEdits,
  onPromptClose,
  onPromptCancel,
  onPromptDelete,
}: MeetupSheetCardContainerProps) {
  const distanceLabel = formatDistanceKm(profileLat, profileLng, meetup.lat, meetup.lng);
  const effectiveStatus = resolveMeetupEffectiveStatus(meetup, nowTimestamp);
  const overdue = isMeetupOverdue(meetup, nowTimestamp);

  return (
    <MeetupSheetCard
      mode={mode}
      meetup={meetup}
      selected={meetup.id === selectedMeetupId}
      distanceLabel={distanceLabel}
      effectiveStatus={effectiveStatus}
      overdue={overdue}
      gameName={inferGameNameFromLabels([meetup.formatName])}
      formattedStartsAt={formatDateTime(meetup.startsAt)}
      locationLabel={
        formatShortAddress(meetup.addressLabel || meetup.locationHint) ||
        formatCompactAddress(meetup.addressLabel || meetup.locationHint) ||
        meetup.locationHint
      }
      infoOpen={expandedMeetupInfoId === meetup.id}
      manageOpen={expandedMeetupManageId === meetup.id}
      joining={joiningMeetupId === meetup.id}
      leaving={leavingMeetupId === meetup.id}
      savingEdits={updatingMeetupAction === "manage:save" || updatingMeetupLocationId === meetup.id}
      closing={updatingMeetupAction === "status:closed"}
      cancelling={updatingMeetupAction === "status:cancelled"}
      deleting={deletingEntityId === meetup.id}
      manageDateLabel={manageDateLabel}
      manageHour={manageHour}
      manageMinute={manageMinute}
      manageAddressQuery={manageAddressQuery}
      manageAddressFocused={manageAddressFocused}
      manageAddressSuggestions={manageAddressSuggestions}
      manageAddressLoading={manageAddressLoading}
      onFocusMeetupOnMap={onFocusMeetupOnMap}
      onOpenPlayerProfile={onOpenPlayerProfile}
      onJoinMeetup={onJoinMeetup}
      onLeaveMeetup={onLeaveMeetup}
      onOpenChat={onOpenChat}
      onToggleManage={onToggleManage}
      onToggleInfo={onToggleInfo}
      onOpenManageCalendar={onOpenManageCalendar}
      onOpenManageTimePicker={onOpenManageTimePicker}
      onOpenManageParticipants={onOpenManageParticipants}
      onOpenDetailParticipants={onOpenDetailParticipants}
      onManageAddressFocusChange={onManageAddressFocusChange}
      onManageAddressChange={onManageAddressChange}
      onManageAddressUseCurrentLocation={onManageAddressUseCurrentLocation}
      onManageAddressUseTyped={onManageAddressUseTyped}
      onManageAddressSelect={onManageAddressSelect}
      onSaveEdits={onSaveEdits}
      onPromptClose={onPromptClose}
      onPromptCancel={onPromptCancel}
      onPromptDelete={onPromptDelete}
    />
  );
}
