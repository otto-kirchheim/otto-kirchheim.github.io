/**
 * Datenschutzerklaerung (Art. 13 DSGVO) als zweiter Abschnitt im Impressum-Drawer (`ImpressumDialog.tsx`). Die Angaben
 * spiegeln den tatsaechlichen Betrieb (Stand Oktober 2026): Hosting, Datenbank, Mailversand, Speicherdauern. Bei
 * Aenderungen an Diensten oder Fristen (z. B. TTL des Admin-Protokolls im Backend, Log-Aufbewahrung) hier nachziehen.
 * Kontaktdaten stehen nur im Impressum-Teil darueber, hier wird darauf verwiesen.
 */
export default function DatenschutzInhalt() {
  return (
    <section className="datenschutz" aria-labelledby="datenschutz-titel">
      <h2 id="datenschutz-titel">Datenschutzerklärung</h2>

      <p>
        <strong>1. Verantwortlicher</strong>
        <br />
        Jan Otto, Anschrift und Kontakt siehe Impressum oben. Ein Datenschutzbeauftragter ist nicht benannt (keine
        Pflicht nach Art. 37 DSGVO / § 38 BDSG).
      </p>

      <div>
        <strong>2. Welche Daten verarbeitet werden und wozu</strong>
        <ul>
          <li>
            Benutzerkonto (Benutzername, E-Mail-Adresse, Passwort nur als Hash, Passkeys, Sitzungen): Anmeldung und
            Schutz des Kontos – Art. 6 Abs. 1 lit. b DSGVO.
          </li>
          <li>
            Persönliche Angaben (Name, Personalnummer, Telefon, Betrieb/OE, Gewerk, Tätigkeitsstätte mit Adresse,
            Bundesland, Entfernungen, Tätigkeit, Entgeltgruppe): Ausfüllen der Formulare und Berechnungen – Art. 6 Abs.
            1 lit. b DSGVO.
          </li>
          <li>
            Erfasste Zeiten (Bereitschaft, Einsatzwechseltätigkeit, Zulagen, Entgeltausgleich, Vorgaben): Berechnung und
            PDF-Erstellung – Art. 6 Abs. 1 lit. b DSGVO.
          </li>
          <li>
            Admin-Protokoll (welcher Administrator wann was an welchem Konto geändert hat): Nachvollziehbarkeit und
            Missbrauchsschutz – Art. 6 Abs. 1 lit. f DSGVO.
          </li>
          <li>
            Technische Zugriffsdaten (IP-Adresse, Zeitpunkt, abgerufene Adresse, Browserkennung): Betrieb, Sicherheit,
            Fehlersuche – Art. 6 Abs. 1 lit. f DSGVO.
          </li>
        </ul>
        <p>
          Die Nutzung ist freiwillig; ohne die Angaben lassen sich die Formulare nicht erstellen. Es gibt keine
          automatisierte Entscheidungsfindung, keine Profilbildung, keine Werbung und kein Tracking.
        </p>
      </div>

      <p>
        <strong>3. Speicherung im Browser</strong>
        <br />
        Die App speichert Einstellungen, Zwischenstände und – falls „Merken“ gewählt ist – die gezeichnete Unterschrift
        im lokalen Speicher des Browsers. Die Unterschrift verlässt das Gerät nicht, sie wird nur in das lokal erzeugte
        PDF eingefügt. Diese Speicherung ist für den Dienst technisch erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG) und lässt
        sich über die Browsereinstellungen jederzeit löschen. Cookies zu Analyse- oder Werbezwecken werden nicht
        gesetzt.
      </p>

      <div>
        <strong>4. Empfänger und Dienstleister</strong>
        <ul>
          <li>
            Auslieferung der App: GitHub Pages (GitHub, Inc., USA). Beim Aufruf verarbeitet GitHub technische
            Zugriffsdaten (u. a. IP-Adresse). GitHub ist unter dem EU-US Data Privacy Framework zertifiziert; es gilt
            das GitHub Data Protection Agreement.
          </li>
          <li>
            Server: in der Regel ein vom Verantwortlichen selbst betriebener Server in Deutschland. Als Ausweichsystem
            Google Cloud Run, Region Frankfurt; Vertragspartner ist die Google Cloud EMEA Limited, Dublin, Irland, es
            gilt das Cloud Data Processing Addendum von Google.
          </li>
          <li>
            Datenbank: MongoDB Atlas (MongoDB, Inc.), gespeichert auf Google-Cloud-Servern in Belgien. Es gilt das Data
            Processing Agreement von MongoDB als Bestandteil der Cloud-Nutzungsbedingungen.
          </li>
          <li>
            E-Mail-Versand: Resend (Resend, Inc., USA) für die Bestätigung der E-Mail-Adresse. Übermittelt werden
            E-Mail-Adresse, Benutzername und der Bestätigungslink. Resend ist unter dem EU-US Data Privacy Framework
            zertifiziert; es gilt der Auftragsverarbeitungsvertrag von Resend.
          </li>
          <li>
            Feiertagsregion: OpenPLZ API (STÜBER SYSTEMS GmbH, Deutschland). Zur Bestimmung des Bundeslands für die
            Feiertage fragt der Browser die Postleitzahl der Tätigkeitsstätte ab; dabei erhält der Anbieter die
            IP-Adresse und die Postleitzahl.
          </li>
        </ul>
        <p>
          Eine Weitergabe an andere Dritte, insbesondere an den Arbeitgeber, findet nicht statt. Administratoren der App
          sehen die Daten der Konten ihres Teams, soweit sie dafür freigeschaltet sind.
        </p>
      </div>

      <div>
        <strong>5. Speicherdauer</strong>
        <ul>
          <li>
            Konto, persönliche Angaben und erfasste Zeiten: bis zur Löschung des Kontos; dabei werden Profil und alle
            erfassten Daten vollständig mitgelöscht.
          </li>
          <li>Sitzungen: bis zum Abmelden bzw. Ablauf der Anmeldung.</li>
          <li>Admin-Protokoll: 12 Monate, danach automatische Löschung.</li>
          <li>
            Technische Zugriffsdaten: Anwendungsprotokolle auf dem eigenen Server 14 Tage, Zugriffsprotokolle des
            vorgeschalteten Proxys höchstens 31 Tage, beim Ausweichsystem Google Cloud Run 30 Tage.
          </li>
          <li>Daten im Browser: bis zur Löschung durch den Nutzer.</li>
        </ul>
      </div>

      <p>
        <strong>6. Ihre Rechte</strong>
        <br />
        Sie haben das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der
        Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch gegen Verarbeitungen auf Grundlage
        berechtigter Interessen (Art. 21 DSGVO). Eine formlose E-Mail an die Adresse im Impressum genügt; das Konto wird
        dann gelöscht bzw. die Daten werden herausgegeben.
      </p>
      <p>
        Sie können sich außerdem bei einer Datenschutz-Aufsichtsbehörde beschweren (Art. 77 DSGVO), z. B. bei der für
        den Verantwortlichen zuständigen Behörde: Der Hessische Beauftragte für Datenschutz und Informationsfreiheit,
        Gustav-Stresemann-Ring 1, 65189 Wiesbaden.
      </p>

      <p className="farbe-gedaempft">Stand: Oktober 2026</p>
    </section>
  );
}
