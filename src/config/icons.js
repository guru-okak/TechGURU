// Набор линейных SVG-иконок (24x24, stroke = currentColor).
const wrap = (inner) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ` +
  `stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`

export const icons = {
  hob: wrap('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="2.5"/><circle cx="16" cy="8" r="2"/><circle cx="8" cy="16" r="2"/><circle cx="16" cy="16" r="2.5"/>'),
  // Навигация
  grid: wrap(
    '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
  ),
  clipboard: wrap(
    '<path d="M8 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M7 11h10M7 15h7"/>',
  ),
  plusCircle: wrap('<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>'),
  plus: wrap('<path d="M12 5v14M5 12h14"/>'),
  minus: wrap('<path d="M5 12h14"/>'),
  bell: wrap('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>'),
  user: wrap('<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>'),
  users: wrap(
    '<circle cx="9" cy="8" r="3.5"/><path d="M2 20v-1a7 7 0 0 1 14 0v1M17 5a3.5 3.5 0 0 1 0 7"/>',
  ),
  wrench: wrap(
    '<path d="M14.7 6.3a5 5 0 0 0-6.4 6.4L3 18l3 3 5.3-5.3a5 5 0 0 0 6.4-6.4L14 13l-3-3z"/>',
  ),
  box: wrap('<path d="m3 7 9-4 9 4-9 4zM3 7v10l9 4 9-4V7M12 11v10"/>'),
  truck: wrap(
    '<path d="M3 7h11v11H3zM14 11h4l3 3v4h-7z"/><circle cx="7.5" cy="19" r="2"/><circle cx="18" cy="19" r="2"/>',
  ),
  analytics: wrap('<path d="M3 3v18h18M7 14l4-4 4 3 5-7"/>'),

  // Действия / UI
  search: wrap('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'),
  calendar: wrap('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/>'),
  download: wrap('<path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16"/>'),
  chevronRight: wrap('<path d="m9 6 6 6-6 6"/>'),
  chevronDown: wrap('<path d="m6 9 6 6 6-6"/>'),
  arrowRight: wrap('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  arrowLeft: wrap('<path d="M19 12H5M11 18l-6-6 6-6"/>'),
  settings: wrap(
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>',
  ),
  logout: wrap(
    '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  ),
  sun: wrap(
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
  ),
  moon: wrap('<path d="M20.9 13A8.5 8.5 0 0 1 11 3.1 8.5 8.5 0 1 0 20.9 13Z"/>'),
  menu: wrap('<path d="M4 6h16M4 12h16M4 18h16"/>'),
  filter: wrap('<path d="M3 5h18l-7 8v6l-4-2v-4z"/>'),
  mapPin: wrap('<path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>'),
  xCircle: wrap('<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>'),
  phone: wrap('<path d="M5 3h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2Z"/>'),
  mail: wrap('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
  edit: wrap('<path d="M4 20h4l10-10-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>'),
  send: wrap('<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>'),
  moreVertical: wrap(
    '<circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none"/>',
  ),
  copy: wrap(
    '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
  ),

  // Устройства
  smartphone: wrap('<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/>'),
  laptop: wrap('<rect x="3" y="5" width="18" height="11" rx="1.5"/><path d="M2 20h20"/>'),
  tablet: wrap('<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M11 18h2"/>'),
  tv: wrap('<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>'),
  fridge: wrap('<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M6 10h12M9 6v2M9 13v3"/>'),
  washer: wrap(
    '<rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M8 6h.01M11 6h.01"/>',
  ),
  printer: wrap(
    '<path d="M7 8V3h10v5"/><rect x="4" y="8" width="16" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  ),

  // Статусы / уведомления
  check: wrap('<path d="m5 12.5 4.5 4.5L19 7"/>'),
  checkCircle: wrap('<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 5-5"/>'),
  infoCircle: wrap('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
  x: wrap('<path d="M6 6l12 12M18 6 6 18"/>'),
  alertTriangle: wrap(
    '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
  ),
  clock: wrap('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  lock: wrap('<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'),
  eye: wrap('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>'),
  eyeOff: wrap('<path d="M4 4l16 16"/><path d="M10.6 6.2A9.7 9.7 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-2.4 3.1M6.3 7.9A17 17 0 0 0 2 12s3.6 6 10 6a9.6 9.6 0 0 0 3.7-.7"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
  image: wrap('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m21 16-5-5L5 20"/>'),

  // Преимущества / каналы
  bolt: wrap('<path d="M13 2 3 14h7l-1 8 10-12h-7z"/>'),
  gear: wrap(
    '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 13.5a7.9 7.9 0 0 0 0-3l1.9-1.5-2-3.4-2.3.9a7.8 7.8 0 0 0-2.6-1.5L14 2h-4l-.4 2.5a7.8 7.8 0 0 0-2.6 1.5l-2.3-.9-2 3.4 1.9 1.5a7.9 7.9 0 0 0 0 3L2.7 15l2 3.4 2.3-.9a7.8 7.8 0 0 0 2.6 1.5L10 22h4l.4-2.5a7.8 7.8 0 0 0 2.6-1.5l2.3.9 2-3.4z"/>',
  ),
  shield: wrap('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>'),
  star: wrap('<path d="m12 3 2.9 5.9 6.1.9-4.5 4.3 1.1 6.1L12 17.8 6.4 20.2l1.1-6.1L3 9.8l6.1-.9z"/>'),
  bulb: wrap(
    '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z"/>',
  ),
  home: wrap('<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9v11h13V9M9 20v-6h6v6"/>'),
  store: wrap(
    '<path d="M3 9.5 5.5 4h13L21 9.5"/><path d="M4 9.5V20h16V9.5"/><path d="M3 9.5a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M9 20v-5h6v5"/>',
  ),
}

export function svg(name) {
  return icons[name] ?? ''
}
