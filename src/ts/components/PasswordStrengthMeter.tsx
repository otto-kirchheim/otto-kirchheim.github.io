import { DBInfotext } from '@db-ux/react-core-components';
import { Component, type RefObject } from 'react';

import { getPasswordStrength } from '@/infrastructure/validation/passwordStrength';
import type { PasswordStrengthLevel } from '@/infrastructure/validation/passwordStrength';

const LEVELS: PasswordStrengthLevel[] = ['tooWeak', 'weak', 'medium', 'strong'];

type Semantik = 'critical' | 'warning' | 'informational' | 'successful';

const LEVEL_META: Record<PasswordStrengthLevel, { label: string; semantik: Semantik }> = {
  tooWeak: { label: 'Zu schwach', semantik: 'critical' },
  weak: { label: 'Schwach', semantik: 'warning' },
  medium: { label: 'Mittel', semantik: 'informational' },
  strong: { label: 'Stark', semantik: 'successful' },
};

/** DB-Token des jeweiligen Semantik-Farbtons; inaktive Balken bleiben neutral. */
const BALKEN_FARBE: Record<Semantik, string> = {
  critical: 'var(--db-critical-origin-default)',
  warning: 'var(--db-warning-origin-default)',
  informational: 'var(--db-informational-origin-default)',
  successful: 'var(--db-successful-origin-default)',
};

type Props = { passwordInputRef: RefObject<HTMLInputElement | null> };
type State = { level: PasswordStrengthLevel | null };

/**
 * Vier-Balken-Anzeige der Passwortstaerke unter einem Passwortfeld. Lauscht per nativem
 * `input`-Listener am uebergebenen Feld (das Feld gehoert der Aufrufstelle) und rendert nichts,
 * solange das Feld leer ist.
 */
export default class PasswordStrengthMeter extends Component<Props, State> {
  state: State = { level: null };

  /** Registriert den `input`-Listener am Passwortfeld. */
  componentDidMount(): void {
    this.props.passwordInputRef.current?.addEventListener('input', this.handleInput);
  }

  /** Entfernt den `input`-Listener wieder. */
  componentWillUnmount(): void {
    this.props.passwordInputRef.current?.removeEventListener('input', this.handleInput);
  }

  /**
   * Berechnet die Staerkestufe neu; leeres Feld blendet die Anzeige aus (`level: null`).
   *
   * @param event - `input`-Event des Passwortfelds.
   */
  handleInput = (event: Event): void => {
    const value = (event.target as HTMLInputElement).value;
    this.setState({ level: value ? getPasswordStrength(value) : null });
  };

  /** Rendert die Balken (aktive in der Semantikfarbe, Rest neutral) und die Stufenbeschriftung. */
  render() {
    const { level } = this.state;
    if (!level) return null;
    const score = LEVELS.indexOf(level) + 1;
    const meta = LEVEL_META[level];

    return (
      <div className="mt-1">
        <div className="d-flex gap-1">
          {LEVELS.map((levelName, index) => (
            <div
              key={levelName}
              className="flex-fill"
              style={{
                height: '4px',
                borderRadius: 'var(--db-border-radius-full)',
                background:
                  index + 1 <= score ? BALKEN_FARBE[meta.semantik] : 'var(--db-adaptive-bg-basic-level-3-default)',
              }}
            />
          ))}
        </div>
        <DBInfotext semantic={meta.semantik} size="small" showIcon={false}>
          {meta.label}
        </DBInfotext>
      </div>
    );
  }
}
