/** Sekunden als knappen, passend skalierten Uptime-Text (Min./Std./Tage). */
export function formatUptime(seconds: number): { value: string; unit: string } {
  if (seconds < 3600) return { value: Math.round(seconds / 60).toString(), unit: 'Min.' };
  if (seconds < 86400) return { value: Math.round(seconds / 3600).toString(), unit: 'Std.' };
  const days = seconds / 86400;
  return { value: days.toFixed(days < 10 ? 1 : 0), unit: 'Tage' };
}
