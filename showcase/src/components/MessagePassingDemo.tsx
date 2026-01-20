/* eslint-disable @nx/enforce-module-boundaries */
import {
  BlockSize,
  CBLService,
  ChecksumService,
  MemoryBlockStore,
  MessageCBLService,
  MessageEncryptionScheme,
  MessagePriority,
} from '@brightchain/brightchain-lib';
import {
  ECIESService,
  EmailString,
  Member,
  MemberType,
} from '@digitaldefiance/ecies-lib';
import React, { useCallback, useEffect, useState } from 'react';

interface Message {
  id: string;
  content: string;
  senderId: string;
  recipients: string[];
  timestamp: Date;
}

export const MessagePassingDemo: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageContent, setMessageContent] = useState('');
  const [senderId, setSenderId] = useState('user1');
  const [recipientId, setRecipientId] = useState('user2');
  const [messageCBL, setMessageCBL] = useState<MessageCBLService | null>(null);
  const [creator, setCreator] = useState<Member | null>(null);

  useEffect(() => {
    const init = async () => {
      const blockStore = new MemoryBlockStore(BlockSize.Small);
      const checksumService = new ChecksumService();
      const eciesService = new ECIESService();
      const cblService = new CBLService(checksumService, eciesService);
      const service = new MessageCBLService(
        cblService,
        checksumService,
        blockStore,
        undefined,
      );
      setMessageCBL(service);

      const memberWithMnemonic = await Member.newMember(
        eciesService,
        MemberType.User,
        'demo-user',
        new EmailString('demo@example.com'),
      );
      setCreator(memberWithMnemonic.member);
    };
    init();
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!messageContent.trim() || !messageCBL || !creator) return;

    try {
      const content = new TextEncoder().encode(messageContent);

      const { messageId } = await messageCBL.createMessage(content, creator, {
        messageType: 'chat',
        senderId,
        recipients: [recipientId],
        priority: MessagePriority.NORMAL,
        encryptionScheme: MessageEncryptionScheme.NONE,
      });

      const newMessage: Message = {
        id: messageId,
        content: messageContent,
        senderId,
        recipients: [recipientId],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, newMessage]);
      setMessageContent('');
    } catch (error) {
      console.error('Failed to send message:', error);
      alert(
        `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }, [messageContent, senderId, recipientId, messageCBL, creator]);

  const handleRetrieveMessage = useCallback(
    async (messageId: string) => {
      try {
        const content = await messageCBL.getMessageContent(messageId);
        const text = new TextDecoder().decode(content);
        alert(`Message content: ${text}`);
      } catch (error) {
        console.error('Failed to retrieve message:', error);
        alert(
          `Failed to retrieve message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    },
    [messageCBL],
  );

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>💬 BrightChain Message Passing Demo</h1>
      <p>Send messages stored as CBL blocks in the soup!</p>

      {!messageCBL || !creator ? (
        <p>Initializing...</p>
      ) : (
        <>
          <div
            style={{
              marginBottom: '20px',
              padding: '20px',
              border: '1px solid #ccc',
              borderRadius: '8px',
            }}
          >
            <h3>Send Message</h3>
            <div style={{ marginBottom: '10px' }}>
              <label>From: </label>
              <input
                type="text"
                value={senderId}
                onChange={(e) => setSenderId(e.target.value)}
                style={{ marginLeft: '10px', padding: '5px' }}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label>To: </label>
              <input
                type="text"
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                style={{ marginLeft: '10px', padding: '5px' }}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Type your message..."
                style={{ width: '100%', minHeight: '80px', padding: '10px' }}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!messageContent.trim()}
              style={{
                padding: '10px 20px',
                backgroundColor: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: messageContent.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              📤 Send Message
            </button>
          </div>

          <div>
            <h3>📬 Messages ({messages.length})</h3>
            {messages.length === 0 ? (
              <p>No messages yet. Send your first message! ✨</p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                    padding: '16px',
                    margin: '8px 0',
                    backgroundColor: '#f9f9f9',
                  }}
                >
                  <div style={{ marginBottom: '8px' }}>
                    <strong>From:</strong> {msg.senderId} → <strong>To:</strong>{' '}
                    {msg.recipients.join(', ')}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Message:</strong> {msg.content}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#666',
                      marginBottom: '8px',
                    }}
                  >
                    {msg.timestamp.toLocaleString()}
                  </div>
                  <button
                    onClick={() => handleRetrieveMessage(msg.id)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#2196f3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    📥 Retrieve from Soup
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};
