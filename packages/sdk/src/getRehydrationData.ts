export function getRehydrationData(): string {
  const overridesScript = document.getElementById('__OUTSMARTLY_DATA__');
  if (!overridesScript) {
    console.error(
      `No <script id="__OUTSMARTLY_DATA__" type="application/json"> could be found.`,
    );
    return '';
  }

  return overridesScript.textContent!;
}
