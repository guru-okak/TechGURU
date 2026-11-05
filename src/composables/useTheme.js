import { ref } from 'vue'

const STORAGE_KEY = 'techguru-theme'

const isDark = ref(false)
const initialized = ref(false)

function applyTheme(theme) {
  isDark.value = theme === 'dark'
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch (e) {
    /* localStorage может быть недоступен */
  }
}

function readSavedTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch (e) {
    return null
  }
}

export function useTheme() {
  if (!initialized.value) {
    const saved = readSavedTheme()
    const preferred = window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    applyTheme(saved || preferred)
    initialized.value = true
  }

  function toggleTheme() {
    applyTheme(isDark.value ? 'light' : 'dark')
  }

  function setTheme(theme) {
    applyTheme(theme === 'dark' ? 'dark' : 'light')
  }

  return { isDark, toggleTheme, setTheme }
}
