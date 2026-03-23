declare module "event-source-polyfill" {
  export class EventSourcePolyfill extends EventSource {
    constructor(url: string, options?: EventSourcePolyfillInit);
  }

  export interface EventSourcePolyfillInit extends EventSourceInit {
    headers?: Record<string, string>;
    heartbeatTimeout?: number;
    withCredentials?: boolean;
  }
}