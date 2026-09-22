/**
 * Vergleicht zwei Versionen der Form "major.minor" (weitere Segmente werden ignoriert).
 *
 * @param version1 - Erste Version.
 * @param version2 - Zweite Version.
 * @returns Negativ, wenn `version1` aelter ist, positiv wenn neuer, 0 bei gleichem major/minor.
 */
export default function compareVersion(version1: string, version2: string): number {
  const [major1, minor1] = version1.split('.').map(Number);
  const [major2, minor2] = version2.split('.').map(Number);
  return major1 - major2 || minor1 - minor2;
}
