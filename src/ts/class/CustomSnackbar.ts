/*!
 * CustomSnackbar
 *
 * Copyright 2022-2026 Jan Otto
 */

interface ISnackbar {
  Open: () => SnackBar;
  Close: () => void;
}

interface SnackBarOptions {
  message: string;
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
  icon?: Ticon;
  width?: number;
  speed?: string | number;
};

type Tstatus =
  | 'green'
  | 'success'
  | 'warning'
  | 'alert'
  | 'orange'
  | 'danger'
  | 'error'
  | 'red'
  | 'info'
  | ''
  | undefined;
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

export class SnackBar implements ISnackbar {
  private readonly _Element: HTMLDivElement;
  private readonly _Container: HTMLElement | HTMLDivElement;
  private readonly _Interval: ReturnType<typeof setTimeout> | undefined;
  private readonly _Message: HTMLSpanElement;
  private readonly _MessageWrapper: HTMLDivElement | Element;
  private readonly _Options: SnackBarOptionsAll;

  public Open(this: SnackBar): SnackBar {
    const getMessageHeight = (): number => {
      const wrapperStyles = window.getComputedStyle(this._MessageWrapper);
      return (
        this._Message.scrollHeight +
        parseFloat(wrapperStyles.getPropertyValue('padding-top')) +
        parseFloat(wrapperStyles.getPropertyValue('padding-bottom'))
      );
    };

    const contentHeight = getMessageHeight();
    this._Element.style.height = contentHeight + 'px';
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

    const _createMessage = (): {
      _Message: HTMLSpanElement;
      _MessageWrapper: HTMLDivElement;
      _Element: HTMLDivElement;
    } => {
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

      const applyColorAndIconTo = (element: HTMLDivElement): void => {
        if (!this._Options.status) return;
        const status = document.createElement('span');
        status.classList.add('CustomSnackbar__status');

        const applyColorTo = (el: HTMLSpanElement): void => {
          switch (this._Options.status) {
            case 'success':
            case 'green':
              el.classList.add('CustomSnackbar--success');
              break;
            case 'warning':
            case 'alert':
            case 'orange':
              el.classList.add('CustomSnackbar--warning');
              break;
            case 'danger':
            case 'error':
            case 'red':
              el.classList.add('CustomSnackbar--danger');
              break;
            default:
              el.classList.add('CustomSnackbar--info');
              break;
          }
        };

        const applyIconTo = (statusElement: HTMLSpanElement): void => {
          if (!this._Options.icon) return;
          statusElement.classList.add('CustomSnackbar__status--with-icon');
          // Keep left padding and status strip width in sync to avoid overlap on narrow layouts.
          const iconWidth = 'calc(var(--snackbar-icon-size) + (var(--snackbar-status-icon-padding) * 2))';
          element.style.setProperty('--snackbar-status-width', iconWidth);

          const icon = document.createElement('span');
          icon.classList.add('CustomSnackbar__icon');

          switch (this._Options.icon) {
            case 'exclamation':
            case 'warn':
            case 'danger':
              icon.innerText = '!';
              break;
            case 'info':
            case 'question':
            case 'question-mark':
              icon.innerText = '?';
              break;
            case 'plus':
            case 'add':
              icon.innerText = '+';
              break;
            default:
              if (this._Options.icon.length > 1) {
                console.warn('Invalid icon character provided: ', this._Options.icon);
              }
              icon.innerText = this._Options.icon.substring(0, 1);
              break;
          }
          statusElement.appendChild(icon);
        };

        applyColorTo(status);
        applyIconTo(status);
        element.appendChild(status);
      };

      const insertMessageTo = (
        element: HTMLDivElement,
      ): {
        _Message: HTMLSpanElement;
        _MessageWrapper: HTMLDivElement;
      } => {
        const _MessageWrapper = document.createElement('div');
        _MessageWrapper.classList.add('CustomSnackbar__message-wrapper');
        const _Message = document.createElement('span');
        _Message.classList.add('CustomSnackbar__message');
        _Message.innerHTML = this._Options.message;
        _MessageWrapper.appendChild(_Message);
        element.appendChild(_MessageWrapper);
        return { _Message, _MessageWrapper };
      };

      const addActionsTo = (element: HTMLDivElement): void => {
        if (typeof this._Options.actions !== 'object') return;

        const addAction = (el: HTMLDivElement, action: SnackBarOptionsAll['actions'][0]): void => {
          const button = document.createElement('span');
          button.classList.add(...['CustomSnackbar__action', ...(action.class ?? [])]);
          button.textContent = action.text;

          if (typeof action.function === 'function') {
            if (action.dismiss === true) {
              button.onclick = () => {
                if (action.function) action.function();
                this.Close();
              };
            } else button.onclick = action.function;
          } else button.onclick = this.Close.bind(this);

          el.appendChild(button);
        };

        this._Options.actions.forEach((action): void => addAction(element, action));
      };

      const addDismissButtonTo = (element: HTMLDivElement): void => {
        if (!this._Options.dismissible) return;
        const closeButton = document.createElement('span');
        closeButton.classList.add('CustomSnackbar__close');
        closeButton.innerText = '×';
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

      function createInnerSnackbar() {
        const innerSnack = document.createElement('div');
        innerSnack.classList.add('CustomSnackbar', 'CustomSnackbar--show');
        applyColorAndIconTo(innerSnack);
        const { _Message, _MessageWrapper } = insertMessageTo(innerSnack);
        addActionsTo(innerSnack);
        addDismissButtonTo(innerSnack);
        return { _Message, _MessageWrapper, innerSnack };
      }

      const outerElement = createWrapper();
      const { _Message, _MessageWrapper, innerSnack } = createInnerSnackbar();
      outerElement.appendChild(innerSnack);
      return { _Message, _MessageWrapper, _Element: outerElement };
    };

    const { _Message, _MessageWrapper, _Element } = _createMessage();
    this._Element = _Element;
    this._Message = _Message;
    this._MessageWrapper = _MessageWrapper;
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
