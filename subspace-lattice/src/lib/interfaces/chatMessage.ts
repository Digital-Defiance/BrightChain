export interface IChatMessage<TId = string> {
  id: TId;
  senderId: TId | 'SYSTEM';
  text: string;
  timestamp: Date;
  isSystemMessage?: boolean;
}
