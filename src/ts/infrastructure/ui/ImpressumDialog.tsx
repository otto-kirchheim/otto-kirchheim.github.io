import { DBButton, DBDrawer, DBDrawerFooter, DBDrawerHeader } from '@db-ux/react-core-components';

/**
 * Phase K3: `<dialog id="impressum">` (index.html) als echter React-`DBDrawer`. Ausloeser ist
 * der Impressum-Knopf in `AppFooter.tsx`, der `open`/`onClose` haelt -- kein
 * `data-dialog-target`/`dbDialog.ts` mehr fuer diesen Dialog.
 *
 * Neuer Dialog, keine Altlast: nutzt `DBDrawer`s `header`/`footer`-Slots mit den echten
 * `DBDrawerHeader`/`DBDrawerFooter`-Komponenten statt der `MyModalHeader`/`dialog-koerper`/
 * `dialog-fuss`-Handkonvention der bestehenden Dialoge (die bleibt dort unangetastet -- der
 * Umstieg auf DB-UX-Komponenten gilt nur fuer neue Dialoge, nicht als Sweep ueber alte). Spart
 * die Handklassen: `.db-drawer-content`/`.db-drawer-footer` bringen Padding/Flex-Layout schon
 * mit (core-components CSS).
 *
 * Telefon/Mail bleiben als Zeichen-Array zusammengesetzt (wie zuvor in `main.ts`): kein
 * zusammenhaengender String im Bundle, den simple Scraper direkt fänden.
 */

function kontaktTelefon(): string {
  const country = ['+', '4', '9', '(', '0', ')'];
  const number = ['1', '7', '0', '-', '6', '7', '0', '8', '6', '9', '2'];
  return `${country.join('')}${number.join('')}`;
}

function kontaktMail(): string {
  const local = ['j', 'a', 'n', 'o', 't', 't', 'o', '1', '9', '8', '9'].join('');
  const domain = ['g', 'm', 'a', 'i', 'l', '.', 'c', 'o', 'm'].join('');
  return `${local}@${domain}`;
}

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
          {/* Kein `dbDialog.ts`/`data-action="close"` mehr (K3: eigener React-State) -- der
              Knopf braucht deshalb einen echten `onClick`, sonst tut er nichts (Bug-Fund:
              Schliessen-Knopf im Footer reagierte nicht; nur `DBDrawerHeader`s eingebauter
              X-Knopf war ueber `onClose` verdrahtet). */}
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
          Telefon: {kontaktTelefon()}
          <br />
          E-Mail: <a href={`mailto:${mail}`}>{mail}</a>
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
