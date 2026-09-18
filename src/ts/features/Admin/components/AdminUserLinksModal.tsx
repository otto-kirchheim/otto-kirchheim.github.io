import { useState } from 'react';

import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import { DbFeld, MyModalHeader } from '@/components';
import { DBButton } from '@db-ux/react-core-components';
import { issueVerificationLink, issuePasswordResetLink, type AdminIssuedLink } from '../utils/api';

type LinkKind = 'verification' | 'reset';

const LINK_CONFIG: Record<
  LinkKind,
  {
    heading: string;
    description: string;
    validity: string;
    issue: (userId: string) => Promise<AdminIssuedLink>;
  }
> = {
  verification: {
    heading: 'Verifizierungs-Link',
    description: 'Bestätigt die E-Mail-Adresse des Benutzers ohne Klick auf die Verifizierungs-Mail.',
    validity: '48 Stunden',
    issue: issueVerificationLink,
  },
  reset: {
    heading: 'Passwort-Reset-Link',
    description: 'Erlaubt dem Benutzer, ein neues Passwort zu setzen – auch ohne verifizierte E-Mail.',
    validity: '2 Stunden',
    issue: issuePasswordResetLink,
  },
};

function buildShareText(kind: LinkKind, userName: string, url: string): string {
  if (kind === 'verification') {
    return [
      `Hallo ${userName},`,
      '',
      'bitte bestätige deine E-Mail-Adresse für DB-Nebengeld über folgenden Link:',
      url,
      '',
      `Der Link ist ${LINK_CONFIG.verification.validity} gültig.`,
    ].join('\n');
  }

  return [
    `Hallo ${userName},`,
    '',
    'über folgenden Link kannst du dein Passwort für DB-Nebengeld neu setzen:',
    url,
    '',
    `Der Link ist ${LINK_CONFIG.reset.validity} gültig.`,
  ].join('\n');
}

async function copyToClipboard(text: string, successMessage: string): Promise<void> {
  try {
    // Benötigt einen Secure Context (HTTPS/localhost) – im Produktivsystem gegeben.
    await navigator.clipboard.writeText(text);
    createSnackBar({ message: successMessage, status: 'success', timeout: 2000 });
  } catch {
    createSnackBar({
      message: 'Kopieren fehlgeschlagen – bitte Link manuell markieren',
      status: 'error',
      timeout: 3000,
    });
  }
}

function LinkSection({
  kind,
  userId,
  userName,
  disabledHint,
}: {
  kind: LinkKind;
  userId: string;
  userName: string;
  disabledHint?: string;
}) {
  const config = LINK_CONFIG[kind];
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<AdminIssuedLink | null>(null);
  const [error, setError] = useState('');

  async function handleIssue(): Promise<void> {
    setLoading(true);
    setError('');
    try {
      setLink(await config.issue(userId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border p-2 mb-2">
      <p className="fw-semibold mb-1">{config.heading}</p>
      <p className="small text-body-secondary mb-2">
        {config.description} Gültigkeit: {config.validity}.
      </p>

      {disabledHint ? (
        <p className="small text-success mb-0">{disabledHint}</p>
      ) : (
        <>
          {!link && (
            <DBButton
              variant="outlined"
              size="small"
              type="button"
              disabled={loading}
              onClick={() => void handleIssue()}
            >
              {loading ? (
                <>
                  <span className="laedt me-1" data-size="small" role="status" />
                  Erzeugen…
                </>
              ) : (
                'Link erzeugen'
              )}
            </DBButton>
          )}

          {link && (
            <>
              <DbFeld
                beschriftung="Einladungslink"
                dicht
                className="mb-2"
                feldKlasse="font-monospace"
                type="text"
                readOnly
                value={link.url}
                onFocus={e => e.target.select()}
              />
              <div className="d-flex flex-wrap gap-2">
                <DBButton
                  variant="outlined"
                  size="small"
                  type="button"
                  icon="link_chain"
                  onClick={() => void copyToClipboard(link.url, 'Link kopiert')}
                >
                  Link kopieren
                </DBButton>
                <DBButton
                  variant="outlined"
                  size="small"
                  type="button"
                  icon="copy"
                  onClick={() => void copyToClipboard(buildShareText(kind, userName, link.url), 'Text kopiert')}
                >
                  Text kopieren
                </DBButton>
              </div>
              {!link.mailSent && (
                <p className="small text-warning-emphasis mt-2 mb-0">
                  E-Mail-Versand fehlgeschlagen oder deaktiviert – bitte den Link manuell weitergeben.
                </p>
              )}
            </>
          )}

          {error && <p className="small text-danger mt-2 mb-0">{error}</p>}
        </>
      )}
    </div>
  );
}

export function AdminUserLinksModal({
  userId,
  userName,
  emailVerified,
}: {
  userId: string;
  userName: string;
  emailVerified: boolean;
}) {
  return (
    <div className="dialog-rumpf">
      <MyModalHeader title={`Login-Hilfe: ${userName}`} />
      <div className="dialog-koerper">
        <p className="small text-body-secondary">
          Die Links werden nur einmal angezeigt und nicht gespeichert. Bitte per DB-Mail oder Teams an den Benutzer
          weitergeben – so umgehst du den Konzern-Spamfilter.
        </p>
        <LinkSection
          kind="verification"
          userId={userId}
          userName={userName}
          disabledHint={emailVerified ? 'E-Mail ist bereits verifiziert – kein Link nötig.' : undefined}
        />
        <LinkSection kind="reset" userId={userId} userName={userName} />
      </div>
      <div className="dialog-fuss">
        <DBButton variant="filled" type="button" data-dialog-dismiss="modal">
          Schließen
        </DBButton>
      </div>
    </div>
  );
}
