declare module "@microsoft/power-apps/dist/internal/plugins/PluginBridge.js" {
  export function executePluginAsync<T = unknown>(
    pluginName: string,
    methodName: string,
    args: readonly unknown[],
  ): Promise<T>;
}
