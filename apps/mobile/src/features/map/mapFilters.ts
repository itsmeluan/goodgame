import { inferGameNameFromLabels, inferGameLabelsFromVenue } from "@/features/map/gameLabels";
import { calculateDistanceKm } from "@/lib/formatting";
import type { MeetupPost, VenueCard } from "@/types/domain";

export type DistanceFilter = "all" | 2 | 5 | 10 | 25;
export type PeriodFilter = "morning" | "afternoon" | "night";
export type MapEntityFilter = "meetups" | "venues";

type FilterOptions = {
  gameTypes: string[];
  formatNames: string[];
  userLat: number | null;
  userLng: number | null;
  distanceKm: DistanceFilter;
};

export function filterMeetups(
  meetups: MeetupPost[],
  options: FilterOptions & {
    periods: PeriodFilter[];
    dateFrom: string | null;
    dateTo: string | null;
  }
) {
  return meetups.filter((meetup) => {
    if (options.gameTypes.length) {
      const gameType = inferGameNameFromLabels([meetup.formatName]);

      if (!options.gameTypes.includes(gameType)) {
        return false;
      }
    }

    if (options.formatNames.length && !options.formatNames.includes(meetup.formatName)) {
      return false;
    }

    if (!passesDistanceFilter(meetup.lat, meetup.lng, options)) {
      return false;
    }

    if (!passesDateFilter(meetup.startsAt, options.dateFrom, options.dateTo)) {
      return false;
    }

    return passesPeriodFilter(meetup.startsAt, options.periods);
  });
}

export function filterVenues(venues: VenueCard[], options: FilterOptions) {
  return venues.filter((venue) => {
    if (options.gameTypes.length) {
      const venueGameTypes = inferGameLabelsFromVenue(venue);

      if (!venueGameTypes.some((gameType) => options.gameTypes.includes(gameType))) {
        return false;
      }
    }

    if (options.formatNames.length && !venue.formats.some((format) => options.formatNames.includes(format))) {
      return false;
    }

    return passesDistanceFilter(venue.lat, venue.lng, options);
  });
}

function passesDistanceFilter(lat: number, lng: number, options: FilterOptions) {
  if (options.distanceKm === "all") {
    return true;
  }

  const distance = calculateDistanceKm(options.userLat, options.userLng, lat, lng);

  if (distance === null) {
    return true;
  }

  return distance <= options.distanceKm;
}

function passesPeriodFilter(startsAt: string, periods: PeriodFilter[]) {
  if (!periods.length) {
    return true;
  }

  const hour = new Date(startsAt).getHours();

  return periods.some((period) => {
    if (period === "morning") {
      return hour >= 5 && hour < 12;
    }

    if (period === "afternoon") {
      return hour >= 12 && hour < 18;
    }

    return hour >= 18 || hour < 5;
  });
}

function passesDateFilter(startsAt: string, dateFrom: string | null, dateTo: string | null) {
  if (!dateFrom && !dateTo) {
    return true;
  }

  const value = new Date(startsAt);
  const targetDay = toDateKey(value);

  if (dateFrom && !dateTo) {
    return targetDay === dateFrom;
  }

  if (dateFrom && dateTo) {
    return targetDay >= dateFrom && targetDay <= dateTo;
  }

  return true;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
