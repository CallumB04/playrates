import type {
  AdminEventInput,
  AwardsDetail,
  AwardsSummary,
  EventKind,
  GameEventEntry,
  ShowcaseDetail,
  ShowcaseSummary,
} from "@playrates/shared";
import type { EventRow } from "./events.repository.js";

/** What a kind adds to an event's card: its art, and its own summary. */
export interface KindCard {
  covers: string[];
  artworkUrl: string | null;
  artworks: string[];
  awards: AwardsSummary | null;
  showcase: ShowcaseSummary | null;
}

/** And to the event's own page. */
export interface KindDetail extends Omit<KindCard, "awards" | "showcase"> {
  awards: AwardsDetail | null;
  showcase: ShowcaseDetail | null;
}

/** What a game did at one of a kind's events, by the event's id. */
export type KindGameEntry = Pick<GameEventEntry, "awards" | "showcase">;

export const NO_CARD: KindCard = {
  covers: [],
  artworkUrl: null,
  artworks: [],
  awards: null,
  showcase: null,
};

/**
 * One kind's part of an event, read with it and saved with it. A new kind
 * is a new entry in EVENT_KINDS and one of these, with tables of its own;
 * the events around it don't change.
 */
export interface EventKindPart {
  cards(events: EventRow[], at: Date): Promise<Map<number, KindCard>>;
  detail(event: EventRow, at: Date): Promise<KindDetail>;
  save(eventId: number, input: AdminEventInput): Promise<void>;
  /** Where a game turns up at this kind's events, by event id. */
  forGame(gameId: number, at: Date): Promise<Map<number, KindGameEntry>>;
}

export type EventKindParts = Record<EventKind, EventKindPart>;
