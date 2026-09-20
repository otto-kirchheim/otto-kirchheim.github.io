import { DBButton, DBDrawer, DBDrawerFooter, DBDrawerHeader, DBLink } from '@db-ux/react-core-components';

/**
 * Telefonnummer, aus Zeichen zusammengesetzt: kein zusammenhaengender String im Bundle, den
 * simple Scraper direkt faenden (gleiches gilt fuer die Mail-Adresse).
 *
 * @returns Nummer in der angezeigten Schreibweise ("+49(0)...").
 */
function kontaktTelefon(): string {
  const country = ['+', '4', '9', '(', '0', ')'];
  const number = ['1', '7', '0', '-', '6', '7', '0', '8', '6', '9', '2'];
  return `${country.join('')}${number.join('')}`;
}

/**
 * Baut das `tel:`-Ziel aus der angezeigten Nummer: ohne "(0)" (internationale Schreibweise) und Sonderzeichen.
 *
 * @returns `tel:`-URI.
 */
function kontaktTelefonLink(): string {
  return `tel:${kontaktTelefon()
    .replace('(0)', '')
    .replace(/[^\d+]/g, '')}`;
}

/**
 * E-Mail-Adresse, aus Zeichen zusammengesetzt (siehe `kontaktTelefon`).
 *
 * @returns Mail-Adresse.
 */
function kontaktMail(): string {
  const local = ['j', 'a', 'n', 'o', 't', 't', 'o', '1', '9', '8', '9'].join('');
  const domain = ['g', 'm', 'a', 'i', 'l', '.', 'c', 'o', 'm'].join('');
  return `${local}@${domain}`;
}

/**
 * Impressum als `DBDrawer` mit `DBDrawerHeader`/`DBDrawerFooter`. Ausloeser ist der Impressum-Knopf in
 * `AppFooter.tsx`, der `open`/`onClose` haelt.
 *
 * @param props - `open` steuert die Sichtbarkeit, `onClose` wird beim Schliessen (Header-X, Footer-Knopf) aufgerufen.
 */
export default function ImpressumDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mail = kontaktMail();

  return (
    <DBDrawer
      open={open}
      direction="to-left"
      showSpacing={false}
      rounded
      onClose={onClose}
      header={<DBDrawerHeader text="Impressum" closeButtonText="Schließen" />}
      footer={
        <DBDrawerFooter>
          {/* Der Footer-Knopf braucht einen eigenen `onClick`: nur `DBDrawerHeader`s eingebauter X-Knopf
              ist ueber `onClose` verdrahtet. */}
          <DBButton type="button" variant="filled" onClick={onClose}>
            Schließen
          </DBButton>
        </DBDrawerFooter>
      }
    >
      <div className="impressum">
        <p className="mb-4">Angaben gemäß § 5 TMG</p>
        <p>
          Jan Otto
          <br />
          Weingarten 7 <br />
          36272 Niederaula
          <br />
        </p>
        <p>
          <strong>Kontakt:</strong>
          <br />
          Telefon:{' '}
          <DBLink href={kontaktTelefonLink()} variant="inline" showIcon={false}>
            {kontaktTelefon()}
          </DBLink>
          <br />
          E-Mail:{' '}
          <DBLink href={`mailto:${mail}`} variant="inline" showIcon={false}>
            {mail}
          </DBLink>
        </p>
        <p>
          <strong>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV:</strong>
          <br />
          Jan Otto
        </p>
        <p>
          <strong>Hinweis zur Anwendung</strong>
          <br />
          Diese Anwendung dient der digitalen Erfassung und Berechnung von Nebengeld-Daten.
        </p>
        <p>
          <strong>Haftung für Inhalte und Links</strong>
          <br />
          Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Gewähr für die Aktualität, Richtigkeit und
          Vollständigkeit der bereitgestellten Informationen. Für Inhalte externer Links sind ausschließlich deren
          Betreiber verantwortlich.
        </p>
        <p>
          <strong>Urheberrecht</strong>
          <br />
          Die durch den Betreiber erstellten Inhalte unterliegen dem deutschen Urheberrecht. Eine Nutzung außerhalb der
          Grenzen des Urheberrechts bedarf der vorherigen Zustimmung.
        </p>
      </div>
    </DBDrawer>
  );
}
