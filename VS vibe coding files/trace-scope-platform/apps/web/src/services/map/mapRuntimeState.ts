export function shouldInitializeInteractiveMap(args: {
  hasContainer: boolean;
  tokenReady: boolean;
  hasMapInstance: boolean;
}) {
  const { hasContainer, tokenReady, hasMapInstance } = args;
  return hasContainer && tokenReady && !hasMapInstance;
}
