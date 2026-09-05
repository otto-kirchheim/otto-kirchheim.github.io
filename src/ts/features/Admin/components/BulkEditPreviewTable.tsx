import { CATEGORY_LABELS, FIELD_LABELS, type SimpleFieldKey } from '../utils/bulkEditOe';
import type { BulkApplyEntry, BulkApplyResult } from '../utils/api';

export type PreviewFieldKey = 'oe' | SimpleFieldKey | 'teamOes' | 'organizationOes';

const COLUMN_LABELS: Record<PreviewFieldKey, string> = {
  oe: 'OE',
  ...FIELD_LABELS,
  teamOes: 'Team-Admin-OEs',
  organizationOes: 'Org-Admin-OEs',
};

function DiffCell({ before, after }: { before: string; after: string }) {
  if (before === after) return <>{before || '–'}</>;
  return (
    <>
      <span className="text-body-secondary text-decoration-line-through">{before}</span>{' '}
      <span className="fw-semibold">{after}</span>
    </>
  );
}

function entryField(entry: BulkApplyEntry, field: PreviewFieldKey): { before: string; after: string } {
  return entry[field];
}

type Props = {
  preview: BulkApplyResult;
  activeFields: PreviewFieldKey[];
  showApplyFrom: boolean;
};

/** Vorschau-/Ergebnistabelle: rendert nur Spalten für tatsächlich aktivierte Felder. */
export function BulkEditPreviewTable({ preview, activeFields, showApplyFrom }: Props) {
  const columnCount = activeFields.length + (showApplyFrom ? 1 : 0);

  return (
    <div>
      <p className="mb-2">
        {preview.summary.ok} von {preview.summary.total} Benutzern werden geändert
        {preview.summary.skipped > 0 && `, ${preview.summary.skipped} übersprungen`}.
      </p>
      <div className="table-responsive" style={{ maxHeight: '50vh' }}>
        <table className="table table-sm align-middle">
          <thead>
            <tr>
              <th scope="col">Benutzer</th>
              {activeFields.map(field => (
                <th scope="col" key={field}>
                  {COLUMN_LABELS[field]}
                </th>
              ))}
              {showApplyFrom && <th scope="col">Übernahme</th>}
            </tr>
          </thead>
          <tbody>
            {preview.results.map(entry => (
              <tr key={entry.userId} className={entry.status === 'skipped' ? 'text-body-secondary' : undefined}>
                <td>{entry.userName}</td>
                {entry.status === 'skipped' ? (
                  <td colSpan={columnCount} className="fst-italic">
                    {entry.message}
                  </td>
                ) : (
                  <>
                    {activeFields.map(field => {
                      const diff = entryField(entry, field);
                      return (
                        <td key={field}>
                          <DiffCell before={diff.before} after={diff.after} />
                          {field === 'oe' && entry.message && (
                            <div className="small text-body-secondary fst-italic">{entry.message}</div>
                          )}
                        </td>
                      );
                    })}
                    {showApplyFrom && (
                      <td>
                        {entry.categoriesApplied.length === 0
                          ? '–'
                          : entry.categoriesApplied.map(category => CATEGORY_LABELS[category]).join(', ')}
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
