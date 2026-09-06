/*!
 * CustomSnackbar
 *
 * Copyright 2022-2026 Jan Otto
 */
import './CustomSnackbar.css';

interface ISnackbar {
  Open: () => SnackBar;
  Close: () => void;
}

interface SnackBarOptions {
  message: string;
  titel?: string;
  status?: Tstatus;
  timeout?: number | false;
  position?: Tposition;
  fixed?: boolean;
  dismissible?: boolean;
  container?: HTMLElement | string;
  width?: number;
  speed?: string | number;
  icon?: Ticon;
  actions?: { text: string; function?: () => void; dismiss?: boolean; class?: string[] }[];
}

type SnackBarOptionsAll = {
  message: string;
  status: Tstatus;
  timeout: number | false;
  position: Tposition;
  fixed: boolean;
  dismissible: boolean;
  container: HTMLElement | string;
  actions: { text: string; function?: () => void; dismiss?: boolean; class?: string[] }[];
  titel?: string;
  icon?: Ticon;
  width?: number;
  speed?: string | number;
};

type Tstatus =
  'green' | 'success' | 'warning' | 'alert' | 'orange' | 'danger' | 'error' | 'red' | 'info' | '' | undefined;
type Tposition = 'br' | 'tr' | 'tc' | 'tm' | 'bc' | 'bm' | 'tl' | 'bl';
type Ticon =
  | 'exclamation'
  | 'warn'
  | 'danger'
  | 'info'
  | 'question'
  | 'question-mark'
  | 'plus'
  | 'add'
  | '!'
  | '?'
  | '+'
  | (string & { fromT?: string });
type Tsemantik = 'adaptive' | 'successful' | 'warning' | 'critical' | 'informational';

/** App-Status auf DB-Semantik samt Standardsymbol abbilden. */
function semantikFuerStatus(status: Tstatus): { semantik: Tsemantik; icon: string } | null {
  switch (status) {
    case 'success':
    case 'green':
      return { semantik: 'successful', icon: 'check_circle' };
    case 'warning':
    case 'alert':
    case 'orange':
      return { semantik: 'warning', icon: 'exclamation_mark_triangle' };
    case 'danger':
    case 'error':
    case 'red':
      return { semantik: 'critical', icon: 'exclamation_mark_circle' };
    case 'info':
      return { semantik: 'informational', icon: 'information_circle' };
    default:
      // Ohne Status bleibt die Meldung neutral und ohne Symbol.
      return null;
  }
}

/** Alte Ein-Zeichen-Symbole auf DB-Symbolnamen abbilden; alles andere gilt bereits als DB-Name. */
function dbSymbol(icon: Ticon): string {
  switch (icon) {
    case 'exclamation':
    case 'warn':
    case 'danger':
    case '!':
      return 'exclamation_mark_triangle';
    case 'info':
      return 'information_circle';
    case 'question':
    case 'question-mark':
    case '?':
      return 'question_mark_circle';
    case 'plus':
    case 'add':
    case '+':
      return 'plus';
    default:
      return icon;
  }
}

export class SnackBar implements ISnackbar {
  private readonly _Element: HTMLDivElement;
  private readonly _Container: HTMLElement | HTMLDivElement;
  private readonly _Interval: ReturnType<typeof setTimeout> | undefined;
  private readonly _Inhalt: HTMLDivElement;
  private readonly _Options: SnackBarOptionsAll;

  public Open(this: SnackBar): SnackBar {
    this._Element.style.height = this._Inhalt.scrollHeight + 'px';
    this._Element.style.opacity = '1';
    this._Element.style.marginTop = '5px';
    this._Element.style.marginBottom = '5px';

    const addEventListener = () => {
      this._Element.removeEventListener('transitionend', addEventListener);
      // Keep expanded after opening; collapse only on explicit Close().
      this._Element.style.height = 'auto';
    };
    this._Element.addEventListener('transitionend', addEventListener);
    return this;
  }

  public Close(this: SnackBar): void {
    if (this._Interval) clearTimeout(this._Interval);
    const snackbarHeight = this._Element.scrollHeight; // get the auto height as a px value

    const snackbarTransitions = this._Element.style.transition;
    this._Element.style.transition = '';
    requestAnimationFrame(() => {
      this._Element.style.height = snackbarHeight + 'px'; // set the auto height to the px height
      this._Element.style.opacity = '1';
      this._Element.style.marginTop = '0px';
      this._Element.style.marginBottom = '0px';
      this._Element.style.transition = snackbarTransitions;
      requestAnimationFrame(() => {
        this._Element.style.height = '0px';
        this._Element.style.opacity = '0';
      });
    });
    setTimeout(() => {
      this._Container.removeChild(this._Element);
    }, 1000);
  }

  constructor(options: SnackBarOptions) {
    this._Options = _setUserOptions(options);

    const _getPositionClass = (): string => {
      switch (this._Options.position) {
        case 'bl':
          return 'CustomSnackbar-container--bottom-left';
        case 'tl':
          return 'CustomSnackbar-container--top-left';
        case 'tr':
          return 'CustomSnackbar-container--top-right';
        case 'tc':
        case 'tm':
          return 'CustomSnackbar-container--top-center';
        case 'bc':
        case 'bm':
          return 'CustomSnackbar-container--bottom-center';
        default:
          return 'CustomSnackbar-container--bottom-right';
      }
    };

    const _setContainer = (): HTMLDivElement | HTMLElement => {
      const getOrFindContainer = (): HTMLDivElement | HTMLElement | null =>
        typeof this._Options.container === 'string'
          ? document.querySelector(this._Options.container)
          : this._Options.container;

      const createNewContainer = (target: HTMLDivElement | HTMLElement) => {
        const container = document.createElement('div');
        container.classList.add('CustomSnackbar-container');
        if (this._Options.fixed) container.classList.add('CustomSnackbar-container--fixed');
        target.appendChild(container);
        return container;
      };

      function getOrAddContainerIn(target: HTMLDivElement | HTMLElement): HTMLDivElement | HTMLElement {
        let node;
        const positionClass = _getPositionClass();
        if (target)
          for (let i = 0; i < target.children.length; i++) {
            node = target.children.item(i);
            if (
              node &&
              node.nodeType === 1 &&
              node.classList.length > 0 &&
              node.classList.contains('CustomSnackbar-container') &&
              node.classList.contains(positionClass)
            )
              return node as HTMLElement;
          }
        return createNewContainer(target);
      }

      let target: HTMLDivElement | HTMLElement | null = getOrFindContainer();
      if (target === undefined || target === null) {
        const containerName =
          typeof this._Options.container === 'string'
            ? this._Options.container
            : this._Options.container.tagName.toLowerCase();
        console.warn('SnackBar: Could not find target container ' + containerName);
        target = document.body; // default to the body as the container
      }
      return getOrAddContainerIn(target);
    };

    this._Container = _setContainer();

    const _applyPositionClasses = (): void => {
      this._Container.classList.add(_getPositionClass());
      const fixedClassName = 'CustomSnackbar-container--fixed';
      if (this._Options.fixed) {
        this._Container.classList.add(fixedClassName);
      } else {
        this._Container.classList.remove(fixedClassName);
      }
    };

    _applyPositionClasses();

    const _createMessage = (): { _Inhalt: HTMLDivElement; _Element: HTMLDivElement } => {
      const setWidth = (element: HTMLDivElement): void => {
        if (!this._Options.width) return;
        element.style.width = `${this._Options.width}px`;
      };

      const setSpeed = (element: HTMLDivElement): void => {
        const { speed } = this._Options;
        switch (typeof speed) {
          case 'number':
            element.style.transitionDuration = speed + 'ms';
            break;
          case 'string':
            element.style.transitionDuration = speed;
            break;
        }
      };

      /** Farbe und Symbol kommen bei der DB-Notification aus data-semantic/data-icon. */
      const applySemantikTo = (element: HTMLDivElement): void => {
        const abbildung = semantikFuerStatus(this._Options.status);
        element.dataset.semantic = abbildung?.semantik ?? 'adaptive';

        const symbol = this._Options.icon ? dbSymbol(this._Options.icon) : abbildung?.icon;
        if (!symbol) return;
        element.dataset.icon = symbol;
        element.dataset.showIcon = 'true';
      };

      const insertTitelTo = (element: HTMLDivElement): void => {
        if (!this._Options.titel) return;
        const kopf = document.createElement('header');
        kopf.dataset.area = 'head';
        kopf.classList.add('CustomSnackbar__title');
        kopf.textContent = this._Options.titel;
        element.appendChild(kopf);
      };

      const insertMessageTo = (element: HTMLDivElement): HTMLDivElement => {
        const wrapper = document.createElement('div');
        wrapper.classList.add('CustomSnackbar__message-wrapper');
        wrapper.dataset.area = 'content';
        const message = document.createElement('span');
        message.classList.add('CustomSnackbar__message');
        message.innerHTML = this._Options.message;
        wrapper.appendChild(message);
        element.appendChild(wrapper);
        return wrapper;
      };

      /** Aktionen liegen im Inhaltsbereich, damit das Notification-Raster nicht durcheinandergerät. */
      const addActionsTo = (wrapper: HTMLDivElement): void => {
        if (this._Options.actions.length === 0) return;

        const leiste = document.createElement('div');
        leiste.classList.add('CustomSnackbar__actions');

        const addAction = (action: SnackBarOptionsAll['actions'][0], index: number): void => {
          const button = document.createElement('button');
          button.type = 'button';
          button.classList.add(...['db-button', 'CustomSnackbar__action', ...(action.class ?? [])]);
          button.dataset.variant = index === 0 ? 'brand' : 'outlined';
          button.dataset.size = 'small';
          button.textContent = action.text;

          if (typeof action.function === 'function') {
            if (action.dismiss === true) {
              button.onclick = () => {
                if (action.function) action.function();
                this.Close();
              };
            } else button.onclick = action.function;
          } else button.onclick = this.Close.bind(this);

          leiste.appendChild(button);
        };

        this._Options.actions.forEach(addAction);
        wrapper.appendChild(leiste);
      };

      const addDismissButtonTo = (element: HTMLDivElement): void => {
        if (!this._Options.dismissible) return;
        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.classList.add('db-button', 'CustomSnackbar__close');
        closeButton.dataset.icon = 'cross';
        closeButton.dataset.variant = 'ghost';
        closeButton.dataset.size = 'small';
        closeButton.dataset.noText = 'true';
        closeButton.textContent = 'Schließen';
        closeButton.onclick = this.Close.bind(this);
        element.appendChild(closeButton);
      };

      function createWrapper(): HTMLDivElement {
        const outerElement = document.createElement('div');
        outerElement.classList.add('CustomSnackbar__wrapper');
        outerElement.style.height = '0px';
        outerElement.style.opacity = '0';
        outerElement.style.marginTop = '0px';
        outerElement.style.marginBottom = '0px';
        setWidth(outerElement);
        setSpeed(outerElement);
        return outerElement;
      }

      const createInnerSnackbar = (): HTMLDivElement => {
        const innerSnack = document.createElement('div');
        innerSnack.classList.add('CustomSnackbar', 'db-notification');
        innerSnack.dataset.variant = 'overlay';
        applySemantikTo(innerSnack);
        insertTitelTo(innerSnack);
        addActionsTo(insertMessageTo(innerSnack));
        addDismissButtonTo(innerSnack);
        return innerSnack;
      };

      const outerElement = createWrapper();
      const _Inhalt = createInnerSnackbar();
      outerElement.appendChild(_Inhalt);
      return { _Inhalt, _Element: outerElement };
    };

    const { _Inhalt, _Element } = _createMessage();
    this._Element = _Element;
    this._Inhalt = _Inhalt;
    this._Container.appendChild(this._Element);

    if (this._Options.timeout && this._Options.timeout > 0)
      this._Interval = setTimeout(() => this.Close.call(this), Number(this._Options.timeout));

    this.Open();

    function _setUserOptions(options: SnackBarOptions): SnackBarOptionsAll {
      return {
        message: options.message ?? 'Operation performed successfully.',
        dismissible: options.dismissible ?? true,
        timeout: options.timeout ?? 5000,
        status: options.status ?? 'info',
        actions: options.actions ?? [],
        fixed: options.fixed ?? false,
        position: options.position ?? 'br',
        container: options.container ?? document.body,
        titel: options.titel,
        width: options.width,
        speed: options.speed,
        icon: options.icon,
      };
    }
  }
}

export const createSnackBar = (userOptions: SnackBarOptions): SnackBar => {
  return new SnackBar(userOptions);
};
