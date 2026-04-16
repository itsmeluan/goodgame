import type { MeetupStatus } from "@/types/domain";

export const OVERDUE_MEETUP_AFTER_MS = 60 * 60 * 1000;
export const AUTO_CLOSE_MEETUP_AFTER_MS = 24 * 60 * 60 * 1000;

export function resolveMeetupEffectiveStatus(
  meetup: Pick<{ status: MeetupStatus; startsAt: string }, "status" | "startsAt">,
  nowTimestamp: number
) {
  if (meetup.status === "closed" || meetup.status === "cancelled") {
    return meetup.status;
  }

  const startsAtTimestamp = new Date(meetup.startsAt).getTime();

  if (Number.isNaN(startsAtTimestamp)) {
    return meetup.status;
  }

  if (startsAtTimestamp <= nowTimestamp - AUTO_CLOSE_MEETUP_AFTER_MS) {
    return "closed" satisfies MeetupStatus;
  }

  return meetup.status;
}

export function isMeetupOverdue(
  meetup: Pick<{ status: MeetupStatus; startsAt: string }, "status" | "startsAt">,
  nowTimestamp: number
) {
  const effectiveStatus = resolveMeetupEffectiveStatus(meetup, nowTimestamp);

  if (effectiveStatus === "closed" || effectiveStatus === "cancelled") {
    return false;
  }

  const startsAtTimestamp = new Date(meetup.startsAt).getTime();

  if (Number.isNaN(startsAtTimestamp)) {
    return false;
  }

  return startsAtTimestamp <= nowTimestamp - OVERDUE_MEETUP_AFTER_MS;
}
