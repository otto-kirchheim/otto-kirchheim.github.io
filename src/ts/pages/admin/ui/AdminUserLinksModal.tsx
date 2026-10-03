import { useState } from 'react';

import { Gruppe } from '@/shared/ui/gruppe/Gruppe';
import { createSnackBar } from '@/shared/ui/snackbar/CustomSnackbar';
import { DbFeld } from '@/shared/ui/form/DbFeld';
import MyModalHeader from '@/shared/ui/modal/MyModalHeader';
import { DBButton, DBLoadingIndicator, DBStack } from '@db-ux/react-core-components';
import { issueVerificationLink, issuePasswordResetLink, type AdminIssuedLink } from '../api/api';

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

/**
 * Baut die Nachricht, die der Admin dem Benutzer zusammen mit dem Link schicken kann.
 *
 * @param kind - Link-Art (Verifizierung oder Passwort-Reset).
 * @param userName - Anzeigename für die Anrede.
 * @param url - Der erzeugte Link.
 * @returns Mehrzeiliger Text zum Weitergeben an den Benutzer, inkl. Gültigkeitsdauer.
 */
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

/**
 * Kopiert Text in die Zwischenablage und meldet Erfolg oder Fehler per Snackbar.
 *
 * @param text - Zu kopierender Text.
 * @param successMessage - Text der Erfolgs-Snackbar.
 */
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

/**
 * Abschnitt zum Erzeugen und Kopieren eines Verifizierungs- oder Passwort-Reset-Links.
 *
 * @param props - `kind` (Link-Art), `userId`, `userName` und optional `disabledHint` (ersetzt den Button durch einen Hinweis).
 */
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

  /**
   * Fordert einen neuen Link beim Backend an; Fehler werden im Abschnitt angezeigt.
   */
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
    <Gruppe className="luft-unten-xs">
      <p className="fett luft-unten-2xs">{config.heading}</p>
      <p className="zelle-klein farbe-gedaempft luft-unten-xs">
        {config.description} Gültigkeit: {config.validity}.
      </p>

      {disabledHint ? (
        <p className="zelle-klein farbe-erfolg ohne-luft-unten">{disabledHint}</p>
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
              <DBLoadingIndicator overlay autoDisable={false} state={loading ? 'active' : 'inactive'}>
                Erzeugt
              </DBLoadingIndicator>
              {loading ? 'Erzeugen…' : 'Link erzeugen'}
            </DBButton>
          )}

          {link && (
            <>
              <DbFeld
                beschriftung="Einladungslink"
                dicht
                className="luft-unten-xs"
                feldKlasse="schrift-mono"
                type="text"
                readOnly
                value={link.url}
                onFocus={e => e.target.select()}
              />
              <DBStack direction="row" wrap gap="x-small">
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
              </DBStack>
              {!link.mailSent && (
                <p className="zelle-klein farbe-warnung luft-oben-xs ohne-luft-unten">
                  E-Mail-Versand fehlgeschlagen oder deaktiviert – bitte den Link manuell weitergeben.
                </p>
              )}
            </>
          )}

          {error && <p className="zelle-klein farbe-gefahr luft-oben-xs ohne-luft-unten">{error}</p>}
        </>
      )}
    </Gruppe>
  );
}

/**
 * Dialog mit Login-Hilfe-Links (Verifizierung, Passwort-Reset) für einen Benutzer.
 *
 * @param props - Benutzer (`userId`, `userName`) und ob seine E-Mail bereits verifiziert ist (dann entfällt der Verifizierungs-Link).
 */
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
        <p className="zelle-klein farbe-gedaempft">
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
