import { Component, type RefObject } from 'react';

import { getPasswordStrength } from '@/infrastructure/validation/passwordStrength';
import type { PasswordStrengthLevel } from '@/infrastructure/validation/passwordStrength';

const LEVELS: PasswordStrengthLevel[] = ['tooWeak', 'weak', 'medium', 'strong'];

const LEVEL_META: Record<PasswordStrengthLevel, { label: string; barClass: string; textClass: string }> = {
  tooWeak: { label: 'Zu schwach', barClass: 'bg-danger', textClass: 'text-danger' },
  weak: { label: 'Schwach', barClass: 'bg-warning', textClass: 'text-warning' },
  medium: { label: 'Mittel', barClass: 'bg-info', textClass: 'text-info' },
  strong: { label: 'Stark', barClass: 'bg-success', textClass: 'text-success' },
};

type Props = { passwordInputRef: RefObject<HTMLInputElement | null> };
type State = { level: PasswordStrengthLevel | null };

export default class PasswordStrengthMeter extends Component<Props, State> {
  state: State = { level: null };

  componentDidMount(): void {
    this.props.passwordInputRef.current?.addEventListener('input', this.handleInput);
  }

  componentWillUnmount(): void {
    this.props.passwordInputRef.current?.removeEventListener('input', this.handleInput);
  }

  handleInput = (event: Event): void => {
    const value = (event.target as HTMLInputElement).value;
    this.setState({ level: value ? getPasswordStrength(value) : null });
  };

  render() {
    const { level } = this.state;
    if (!level) return null;
    const score = LEVELS.indexOf(level) + 1;
    const meta = LEVEL_META[level];

    return (
      <div className="mt-1">
        <div className="d-flex gap-1">
          {LEVELS.map((levelName, index) => (
            <div key={levelName} className="progress flex-fill" style={{ height: '4px' }}>
              <div
                className={`progress-bar ${index + 1 <= score ? meta.barClass : 'bg-secondary-subtle'}`}
                style={{ width: '100%' }}
              />
            </div>
          ))}
        </div>
        <div className={`form-text ${meta.textClass}`}>{meta.label}</div>
      </div>
    );
  }
}
