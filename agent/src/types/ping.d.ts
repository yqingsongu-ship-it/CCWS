declare module 'ping' {
  export interface PromiseResponse {
    alive: boolean;
    avg: number;
    max: number;
    min: number;
  }

  export interface PromiseOptions {
    min_reply?: number;
    timeout?: number;
    packetSize?: number;
  }

  export const promise: {
    probe(host: string, options?: PromiseOptions): Promise<PromiseResponse>;
  };
}
