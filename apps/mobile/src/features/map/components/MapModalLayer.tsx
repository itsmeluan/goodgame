import type { ComponentProps } from "react";

import { MapCalendarPopover } from "@/features/map/components/MapCalendarPopover";
import { MapFiltersModal } from "@/features/map/components/MapFiltersModal";
import { MapTimePickerPopover } from "@/features/map/components/MapTimePickerPopover";
import { MeetupComposerModal } from "@/features/map/components/MeetupComposerModal";
import { NewMeetupComposerSheet } from "@/features/map/components/NewMeetupComposerSheet";
import { VenuesSheetComposer } from "@/features/map/components/VenuesSheetComposer";

type MapFiltersModalProps = ComponentProps<typeof MapFiltersModal>;
type NewMeetupComposerSheetProps = ComponentProps<typeof NewMeetupComposerSheet>;
type VenuesSheetComposerProps = ComponentProps<typeof VenuesSheetComposer>;

type CalendarOverlayProps = {
  open: boolean;
  monthLabel: string;
  cells: ComponentProps<typeof MapCalendarPopover>["cells"];
  selectedDateKey: string;
  onShiftMonth: (amount: number) => void;
  onSelectDate: (dateKey: string, date: Date) => void;
  onClose: () => void;
};

type TimeOverlayProps = {
  open: boolean;
  selectedHour: string;
  selectedMinute: string;
  hours: string[];
  minutes: string[];
  onChangeHour: (value: string) => void;
  onChangeMinute: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

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
}: MapModalLayerProps) {
  return (
    <>
      <MapFiltersModal {...filtersProps} />

      {manageCalendarOverlay.open ? (
        <MapCalendarPopover
          title="Escolha a data"
          monthLabel={manageCalendarOverlay.monthLabel}
          cells={manageCalendarOverlay.cells}
          selectedDateKey={manageCalendarOverlay.selectedDateKey}
          onShiftMonth={manageCalendarOverlay.onShiftMonth}
          onSelectDate={manageCalendarOverlay.onSelectDate}
          onClose={manageCalendarOverlay.onClose}
        />
      ) : null}

      {manageTimeOverlay.open ? (
        <MapTimePickerPopover
          title="Escolha o horário"
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
      >
        <NewMeetupComposerSheet {...composerSheetProps} />
      </MeetupComposerModal>

      <MeetupComposerModal
        visible={venueComposerVisible}
        onClose={onCloseVenueComposer}
      >
        <VenuesSheetComposer {...venueComposerSheetProps} />
      </MeetupComposerModal>
    </>
  );
}
