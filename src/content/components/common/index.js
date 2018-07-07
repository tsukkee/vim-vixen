import InputComponent from './input';
import KeymapperComponent from './keymapper';
import FollowComponent from './follow';
import * as settingActions from 'content/actions/setting';
import messages from 'shared/messages';
import * as addonActions from '../../actions/addon';
import * as re from 'shared/utils/re';
import * as blacklists from 'shared/blacklists';

export default class Common {
  constructor(win, store) {
    const follow = new FollowComponent(win, store);
    const input = new InputComponent(win.document.body, store);
    const keymapper = new KeymapperComponent(store);

    input.onKey(key => follow.key(key));
    input.onKey(key => keymapper.key(key));

    this.win = win;
    this.store = store;
    this.prevEnabled = undefined;
    this.prevBlacklist = undefined;

    this.reloadSettings();

    messages.onMessage(this.onMessage.bind(this));
    store.subscribe(() => this.update());
  }

  onMessage(message) {
    switch (message.type) {
    case messages.SETTINGS_CHANGED:
      return this.reloadSettings();
    case messages.ADDON_TOGGLE_ENABLED:
      return this.store.dispatch(addonActions.toggleEnabled());
    }
  }

  update() {
    let enabled = this.store.getState().addon.enabled;
    if (enabled !== this.prevEnabled) {
      this.prevEnabled = enabled;

      browser.runtime.sendMessage({
        type: messages.ADDON_ENABLED_RESPONSE,
        enabled,
      });
    }

    let blacklist = this.store.getState().setting.blacklist;
    let str = JSON.stringify(blacklist)
    if (blacklist !== str) {
      this.prevBlacklist = str;
      if (blacklists.includes(blacklist, this.win.location)) {
        this.store.dispatch(addonActions.disable());
      } else {
        this.store.dispatch(addonActions.enable());
      }
    }
  }

  reloadSettings() {
    try {
      this.store.dispatch(settingActions.load());
    } catch (e) {
      // Sometime sendMessage fails when background script is not ready.
      console.warn(e);
      setTimeout(() => this.reloadSettings(), 500);
    }
  }
}
