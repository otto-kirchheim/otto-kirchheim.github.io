import { useEffect, useMemo, useState } from 'preact/hooks';
import { createSnackBar } from '../../../class/CustomSnackbar';
import { confirmDialog } from '../../../infrastructure/ui/confirmDialog';
import dayjs from '../../../infrastructure/date/configDayjs';
import {
  deleteVorgabeByYear,
  fetchVorgabeByYear,
  fetchVorgabenYears,
  upsertVorgabeByYear,
  type BackendVorgabe,
} from '../utils/api';

export function AdminVorgabenEditor() {
  const [entries, setEntries] = useState<BackendVorgabe[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [monthEntries, setMonthEntries] = useState<Array<{ key: number; value: Record<string, string | undefined> }>>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const GELD_FIELDS = [
    'Tarifkraft',
    'Besoldungsgruppe A 8',
    'Besoldungsgruppe A 9',
    'PrivatPKWTarif',
    'PrivatPKWBeamter',
    'Fahrentsch',
    'A',
    'B',
    'C',
    'SIPO',
    'TE8',
    'TE14',
    'TE24',
    'BE8',
    'BE14',
    'LRE1',
    'LRE2',
    'LRE3',
  ] as const;

  const sortedYears = useMemo(() => [...entries].sort((a, b) => b._id - a._id), [entries]);

  function toFormEntries(data: BackendVorgabe['Vorgaben'] | undefined) {
    return [...(data ?? [])]
      .map(entry => ({
        key: entry.key,
        value: Object.fromEntries(
          Object.entries(entry.value ?? {}).map(([field, value]) => [
            field,
            typeof value === 'number' && Number.isFinite(value) ? String(value) : undefined,
          ]),
        ),
      }))
      .sort((a, b) => a.key - b.key);
  }

  function parseLocalizedNumber(raw: string): number | undefined {
    const normalized = raw.trim().replace(',', '.');
    if (!normalized) return undefined;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  async function reload(): Promise<BackendVorgabe[]> {
    setLoading(true);
    try {
      const years = await fetchVorgabenYears();
      setEntries(years);
      if (!selectedYear && years.length > 0) {
        const nextYear = Math.max(...years.map(v => v._id));
        await handleSelectYear(nextYear, years);
      }
      return years;
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectYear(year: number, currentEntries?: BackendVorgabe[]) {
    setSelectedYear(year);
    const source = currentEntries ?? entries;
    const local = source.find(v => v._id === year);
    if (local) {
      setMonthEntries(toFormEntries(local.Vorgaben));
      return;
    }
    const fetched = await fetchVorgabeByYear(year);
    setMonthEntries(toFormEntries(fetched.Vorgaben));
  }

  async function handleCreateYear() {
    const input = window.prompt('Neues Jahr fuer Vorgaben:', `${dayjs().year()}`);
    if (!input) return;
    const year = Number.parseInt(input, 10);
    if (!Number.isInteger(year) || year < 2020) {
      createSnackBar({ message: 'Ungueltiges Jahr', status: 'error', timeout: 2500 });
      return;
    }
    setSelectedYear(year);
    setMonthEntries([{ key: 1, value: {} }]);
  }

  function addMonthEntry() {
    const nextMonth = Math.max(0, ...monthEntries.map(entry => entry.key)) + 1;
    const boundedMonth = Math.min(12, nextMonth);
    setMonthEntries(current => [...current, { key: boundedMonth, value: {} }]);
  }

  function removeMonthEntry(index: number) {
    setMonthEntries(current => current.filter((_, i) => i !== index));
  }

  function updateMonthKey(index: number, month: number) {
    setMonthEntries(current => {
      const next = [...current];
      if (next[index]?.key === 1) return current;
      next[index] = { ...next[index], key: Math.max(1, Math.min(12, month || 1)) };
      return next;
    });
  }

  function updateField(index: number, field: string, inputValue: string) {
    setMonthEntries(current => {
      const next = [...current];
      const currentEntry = next[index];
      const value = { ...(currentEntry?.value ?? {}) };
      const normalized = inputValue.replace(',', '.');
      if (normalized.trim() === '') delete value[field];
      else value[field] = normalized;
      next[index] = { ...currentEntry, value };
      return next;
    });
  }

  function normalizeEntries(raw: Array<{ key: number; value: Record<string, string | undefined> }>) {
    return [...raw]
      .filter(entry => Number.isInteger(entry.key) && entry.key >= 1 && entry.key <= 12)
      .map(entry => ({
        key: entry.key,
        value: Object.fromEntries(
          Object.entries(entry.value ?? {})
            .map(([field, rawValue]) => [field, parseLocalizedNumber(rawValue ?? '')] as const)
            .filter(([, value]) => typeof value === 'number' && Number.isFinite(value)),
        ),
      }))
      .sort((a, b) => a.key - b.key);
  }

  async function handleSave() {
    if (!selectedYear) return;
    const parsed = normalizeEntries(monthEntries);

    if (parsed.length === 0) {
      createSnackBar({
        message: 'Mindestens ein gueltiger Monatseintrag ist erforderlich.',
        status: 'error',
        timeout: 3000,
      });
      return;
    }

    setSaving(true);
    try {
      const updated = await upsertVorgabeByYear(selectedYear, parsed);
      setEntries(current => {
        const withoutYear = current.filter(entry => entry._id !== selectedYear);
        return [...withoutYear, updated].sort((a, b) => b._id - a._id);
      });
      setMonthEntries(toFormEntries(updated.Vorgaben));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedYear) return;
    if (!(await confirmDialog(`Vorgaben für ${selectedYear} wirklich löschen?`))) return;
    setSaving(true);
    try {
      await deleteVorgabeByYear(selectedYear);
      const years = await reload();
      const nextYears = years.filter(v => v._id !== selectedYear).map(v => v._id);
      const next = nextYears[0] ?? null;
      setSelectedYear(next);
      setMonthEntries(next ? toFormEntries(years.find(v => v._id === next)?.Vorgaben) : []);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  return (
    <div>
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5 class="mb-0">VorgabenGeld</h5>
        <button class="btn btn-sm btn-outline-primary" onClick={handleCreateYear} data-disabler>
          Jahr anlegen
        </button>
      </div>

      <div class="row g-2 mb-3">
        <div class="col-12 col-md-4">
          <label class="form-label">Jahr</label>
          <select
            class="form-select"
            value={selectedYear ?? ''}
            onChange={e => handleSelectYear(Number((e.target as HTMLSelectElement).value))}
            disabled={loading || saving}
          >
            <option value="" disabled>
              Bitte wählen
            </option>
            {sortedYears.map(v => (
              <option key={v._id} value={v._id}>
                {v._id}
              </option>
            ))}
            {selectedYear && !sortedYears.some(v => v._id === selectedYear) && (
              <option value={selectedYear}>{selectedYear}</option>
            )}
          </select>
        </div>
      </div>

      <div class="d-flex justify-content-between align-items-center mb-2">
        <label class="form-label mb-0">Monatswerte</label>
        <button
          class="btn btn-sm btn-outline-secondary"
          onClick={addMonthEntry}
          disabled={loading || saving || !selectedYear}
          data-disabler
        >
          Monat hinzufügen
        </button>
      </div>

      <div class="d-flex flex-column gap-3">
        {monthEntries.length === 0 && <div class="alert alert-secondary mb-0">Keine Monatswerte vorhanden.</div>}

        {monthEntries.map((entry, index) => (
          <div key={`${entry.key}-${index}`} class="border rounded p-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <div class="d-flex align-items-center gap-2">
                <label class="form-label mb-0 small fw-semibold">Monat</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  class="form-control form-control-sm"
                  style="width: 5.5rem"
                  value={entry.key}
                  onInput={e => updateMonthKey(index, Number((e.target as HTMLInputElement).value))}
                  disabled={loading || saving || !selectedYear || entry.key === 1}
                />
              </div>

              <button
                class="btn btn-sm btn-outline-danger"
                onClick={() => removeMonthEntry(index)}
                disabled={loading || saving || !selectedYear || monthEntries.length <= 1}
                data-disabler
              >
                Entfernen
              </button>
            </div>

            <div class="row g-2">
              {GELD_FIELDS.map(field => (
                <div class="col-12 col-md-6 col-xl-4" key={`${entry.key}-${field}`}>
                  <label class="form-label small mb-1">{field}</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    class="form-control form-control-sm"
                    value={entry.value[field] ?? ''}
                    onInput={e => updateField(index, field, (e.target as HTMLInputElement).value)}
                    disabled={loading || saving || !selectedYear}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div class="d-flex gap-2 mt-3">
        <button
          class="btn btn-primary"
          onClick={handleSave}
          disabled={saving || loading || !selectedYear}
          data-disabler
        >
          {saving ? 'Speichert...' : 'Speichern'}
        </button>
        <button
          class="btn btn-outline-danger"
          onClick={handleDelete}
          disabled={saving || loading || !selectedYear}
          data-disabler
        >
          Löschen
        </button>
      </div>
    </div>
  );
}
