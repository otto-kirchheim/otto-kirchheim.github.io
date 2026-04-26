import { useEffect, useState } from 'preact/hooks';

const WEEKDAY_SLOTS: Array<{ tag: number; short: string }> = [
  { tag: 1, short: 'Mo' },
  { tag: 2, short: 'Di' },
  { tag: 3, short: 'Mi' },
  { tag: 4, short: 'Do' },
  { tag: 5, short: 'Fr' },
  { tag: 6, short: 'Sa' },
  { tag: 7, short: 'So' },
];

const SLOT_LOOKUP_BY_TAG: Record<number, number> = {
  1: 0,
  2: 1,
  3: 2,
  4: 3,
  5: 4,
  6: 5,
  7: 6,
};

const getSlotFromTag = (tag: number, Nwoche = false, allowSecondWeek = true): number => {
  const baseIndex = SLOT_LOOKUP_BY_TAG[tag] ?? 0;
  if (!allowSecondWeek) return baseIndex;
  return baseIndex + (Nwoche ? 7 : 0);
};

const getTagFromSlot = (slot: number): { tag: number; Nwoche: boolean } => {
  const normalizedSlot = Math.max(0, Math.min(13, slot));
  return {
    tag: WEEKDAY_SLOTS[normalizedSlot % 7].tag,
    Nwoche: normalizedSlot >= 7,
  };
};

const getSlotLabel = (slot: number): string => {
  const normalizedSlot = Math.max(0, Math.min(13, slot));
  const weekLabel = normalizedSlot >= 7 ? 'W2' : 'W1';
  return `${WEEKDAY_SLOTS[normalizedSlot % 7].short} ${weekLabel}`;
};

export type WeekRangeEditorProps = {
  selectorKey: string;
  label: string;
  start: { tag: number; Nwoche?: boolean };
  end: { tag: number; Nwoche?: boolean };
  startHasNwoche: boolean;
  disabled: boolean;
  onStartChange: (tag: number, Nwoche: boolean) => void;
  onEndChange: (tag: number, Nwoche: boolean) => void;
};

export function VorgabenBWeekRangeEditor({
  selectorKey,
  label,
  start,
  end,
  startHasNwoche,
  disabled,
  onStartChange,
  onEndChange,
}: WeekRangeEditorProps) {
  const [startSlot, setStartSlot] = useState<number>(0);
  const [endSlot, setEndSlot] = useState<number | null>(null);
  const [awaitingEndSelection, setAwaitingEndSelection] = useState<boolean>(false);
  const [dragAnchor, setDragAnchor] = useState<number | null>(null);

  useEffect(() => {
    if (awaitingEndSelection) return;

    const initialStartSlot =
      startHasNwoche && start.Nwoche && start.tag === 7
        ? getSlotFromTag(start.tag, false, true)
        : getSlotFromTag(start.tag, start.Nwoche, startHasNwoche);
    const initialEndSlot = Math.max(getSlotFromTag(end.tag, end.Nwoche, true), initialStartSlot);

    setStartSlot(initialStartSlot);
    setEndSlot(initialEndSlot);
    setDragAnchor(null);
  }, [selectorKey, start.tag, start.Nwoche, end.tag, end.Nwoche, startHasNwoche, awaitingEndSelection]);

  const updateByTap = (slot: number): void => {
    if (disabled) return;

    if (!awaitingEndSelection) {
      const nextStartSlot = startHasNwoche ? slot : slot % 7;
      const nextStart = getTagFromSlot(nextStartSlot);
      setStartSlot(nextStartSlot);
      setEndSlot(null);
      setAwaitingEndSelection(true);
      onStartChange(nextStart.tag, startHasNwoche ? nextStart.Nwoche : false);
      return;
    }

    const nextEndSlot = Math.max(slot, startSlot);
    const nextEnd = getTagFromSlot(nextEndSlot);
    setEndSlot(nextEndSlot);
    setAwaitingEndSelection(false);
    onEndChange(nextEnd.tag, nextEnd.Nwoche);
  };

  const handlePointerDown = (event: PointerEvent, slot: number): void => {
    if (disabled) return;

    if (event.pointerType === 'mouse') {
      const normalizedAnchor = startHasNwoche ? slot : slot % 7;
      const nextStart = getTagFromSlot(normalizedAnchor);
      setStartSlot(normalizedAnchor);
      setEndSlot(null);
      setDragAnchor(normalizedAnchor);
      setAwaitingEndSelection(true);
      onStartChange(nextStart.tag, startHasNwoche ? nextStart.Nwoche : false);
      return;
    }

    updateByTap(slot);
  };

  const handlePointerEnter = (slot: number): void => {
    if (disabled || dragAnchor === null) return;

    const nextStartSlot = Math.min(dragAnchor, slot);
    const nextEndSlot = Math.max(dragAnchor, slot);
    const nextStart = getTagFromSlot(nextStartSlot);
    const nextEnd = getTagFromSlot(nextEndSlot);

    setStartSlot(nextStartSlot);
    setEndSlot(nextEndSlot);
    onStartChange(nextStart.tag, startHasNwoche ? nextStart.Nwoche : false);
    onEndChange(nextEnd.tag, nextEnd.Nwoche);
  };

  const clearDrag = (): void => {
    if (dragAnchor === null) return;
    setDragAnchor(null);
    if (endSlot !== null) setAwaitingEndSelection(false);
  };

  const rangeText =
    endSlot === null ? `${getSlotLabel(startSlot)} -> ...` : `${getSlotLabel(startSlot)} -> ${getSlotLabel(endSlot)}`;

  return (
    <div class="mb-2">
      <div class="d-flex flex-wrap gap-2 align-items-baseline mb-2">
        <span class="form-label small fw-semibold mb-0">{label}</span>
        <span class="small text-body-secondary">Auswahl: {rangeText}</span>
      </div>

      <div
        class="d-grid"
        style="grid-template-columns: repeat(7, minmax(0, 1fr)); gap: .375rem;"
        onPointerUp={clearDrag}
        onPointerLeave={clearDrag}
      >
        {Array.from({ length: 14 }, (_, slot) => {
          const isStart = slot === startSlot;
          const isEnd = endSlot !== null && slot === endSlot;
          const isInRange = endSlot === null ? slot === startSlot : slot >= startSlot && slot <= endSlot;

          const variantClass = isStart
            ? 'btn-success'
            : isEnd
              ? 'btn-info'
              : isInRange
                ? 'btn-primary'
                : 'btn-outline-secondary';

          return (
            <button
              key={`${selectorKey}-${slot}`}
              type="button"
              class={`btn btn-sm ${variantClass} py-2`}
              disabled={disabled}
              onPointerDown={event => handlePointerDown(event, slot)}
              onPointerEnter={() => handlePointerEnter(slot)}
              onClick={() => updateByTap(slot)}
              aria-pressed={isStart || isEnd || isInRange}
            >
              {WEEKDAY_SLOTS[slot % 7].short}
            </button>
          );
        })}
      </div>
    </div>
  );
}
