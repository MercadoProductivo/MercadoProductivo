/**
 * Tipos para Pusher Client y eventos
 */

export interface PusherChannel {
  bind(eventName: string, callback: (data: unknown) => void): void;
  unbind(eventName: string, callback?: (data: unknown) => void): void;
  trigger(eventName: string, data: unknown): boolean;
  name: string;
}

export interface PusherClient {
  subscribe(channelName: string): PusherChannel;
  unsubscribe(channelName: string): void;
  channel(channelName: string): PusherChannel | null;
  allChannels(): PusherChannel[];
  disconnect(): void;
  connection: {
    state: string;
    bind(event: string, callback: () => void): void;
    unbind(event: string, callback?: () => void): void;
  };
}

export interface SubscriptionCallbacks {
  onSubscriptionSucceeded?: () => void;
  onSubscriptionError?: (status: number) => void;
}
