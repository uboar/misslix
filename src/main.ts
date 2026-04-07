import { mount } from 'svelte'
import App from './App.svelte'
import './app.css'
import { setupGlobalTwemoji } from './lib/emoji/twemojiSetup'

const FONT_TIMEOUT_MS = 3000;

Promise.race([
  document.fonts.ready,
  new Promise<void>(resolve => setTimeout(resolve, FONT_TIMEOUT_MS))
]).finally(() => {
  document.documentElement.classList.remove('fonts-loading');
});

const app = mount(App, {
  target: document.getElementById('app')!,
})

setupGlobalTwemoji();

export default app
