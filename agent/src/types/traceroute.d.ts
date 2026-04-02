declare module 'traceroute' {
  export function trace(host: string, options?: any): Promise<any>;
}
