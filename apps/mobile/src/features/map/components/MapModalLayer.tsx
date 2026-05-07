import type { ComponentProps, ReactNode } from "react";

import { MapFiltersModal } from "@/features/map/components/MapFiltersModal";
import { MeetupComposerModal } from "@/features/map/components/MeetupComposerModal";
import { NewMeetupCalendarOverlay } from "@/features/map/components/NewMeetupCalendarOverlay";
import { NewMeetupComposerSheet } from "@/features/map/components/NewMeetupComposerSheet";
import { NewMeetupTimeOverlay } from "@/features/map/components/NewMeetupTimeOverlay";
import { VenuesSheetComposer } from "@/features/map/components/VenuesSheetComposer";

type MapFiltersModalProps = ComponentProps<typeof MapFiltersModal>;
type NewMeetupComposerSheetProps = ComponentProps<typeof NewMeetupComposerSheet>;
type VenuesSheetComposerProps = ComponentProps<typeof VenuesSheetComposer>;

/** Same picker UI as "Novo jogo" (`NewMeetupComposerSheet`). */
type CalendarOverlayProps = { open: boolean } & ComponentProps<typeof NewMeetupCalendarOverlay>;

type TimeOverlayProps = { open: boolean } & ComponentProps<typeof NewMeetupTimeOverlay>;

export type MapModalLayerProps = {
  filtersProps: MapFiltersModalProps;
  composerVisible: boolean;
  onCloseComposer: () => void;
  composerSheetProps: NewMeetupComposerSheetProps;
  venueComposerVisible: boolean;
  onCloseVenueComposer: () => void;
  venueComposerSheetProps: VenuesSheetComposerProps;
  manageCalendarOverlay: CalendarOverlayProps;
  manageTimeOverlay: TimeOverlayProps;
  topOverlay?: ReactNode;
};

export function MapModalLayer({
  filtersProps,
  composerVisible,
  onCloseComposer,
  composerSheetProps,
  venueComposerVisible,
  onCloseVenueComposer,
  venueComposerSheetProps,
  manageCalendarOverlay,
  manageTimeOverlay,
  topOverlay,
}: MapModalLayerProps) {
  return (
    <>
      <MapFiltersModal {...filtersProps} />

      {manageCalendarOverlay.open ? (
        <NewMeetupCalendarOverlay
          monthLabel={manageCalendarOverlay.monthLabel}
          cells={manageCalendarOverlay.cells}
          selectedDateKey={manageCalendarOverlay.selectedDateKey}
          onShiftMonth={manageCalendarOverlay.onShiftMonth}
          onSelectDate={manageCalendarOverlay.onSelectDate}
          onClose={manageCalendarOverlay.onClose}
        />
      ) : null}

      {manageTimeOverlay.open ? (
        <NewMeetupTimeOverlay
          selectedHour={manageTimeOverlay.selectedHour}
          selectedMinute={manageTimeOverlay.selectedMinute}
          hours={manageTimeOverlay.hours}
          minutes={manageTimeOverlay.minutes}
          onChangeHour={manageTimeOverlay.onChangeHour}
          onChangeMinute={manageTimeOverlay.onChangeMinute}
          onClose={manageTimeOverlay.onClose}
          onConfirm={manageTimeOverlay.onConfirm}
        />
      ) : null}

      <MeetupComposerModal
        visible={composerVisible}
        onClose={onCloseComposer}
        overlayContent={composerVisible ? topOverlay : undefined}
      >
        <NewMeetupComposerSheet {...composerSheetProps} />
      </MeetupComposerModal>

      <MeetupComposerModal
        visible={venueComposerVisible}
        onClose={onCloseVenueComposer}
        overlayContent={venueComposerVisible ? topOverlay : undefined}
      >
        <VenuesSheetComposer {...venueComposerSheetProps} />
      </MeetupComposerModal>
    </>
  );
}
