import {
  BlockInfo,
  BlockSize,
  CBLService,
  CBLStorageResult,
  Checksum,
  ChecksumService,
  FileReceipt,
  MessageCBLService,
  MessageEncryptionScheme,
  MessagePriority,
} from '@brightchain/brightchain-lib';
import {
  ECIESService,
  EmailString,
  getEnhancedIdProvider,
  Member,
  MemberType,
} from '@digitaldefiance/ecies-lib';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useShowcaseI18n } from '../i18n/ShowcaseI18nContext';
import { ShowcaseStrings } from '../i18n/showcaseStrings';
import './BrightChainSoupDemo.css';
import { EnhancedSoupVisualization } from './EnhancedSoupVisualization';
import { SessionIsolatedBrightChain } from './SessionIsolatedBrightChain';

interface ProcessStep {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  details?: string;
}

const ProcessStepIndicator: React.FC<{ step: ProcessStep }> = ({ step }) => {
  const getIcon = () => {
    switch (step.status) {
      case 'complete':
        return '✅';
      case 'processing':
        return '⏳';
      case 'error':
        return '❌';
      default:
        return '⭕';
    }
  };

  return (
    <div className={`process-step ${step.status}`}>
      <span className="step-icon">{getIcon()}</span>
      <div className="step-content">
        <div className="step-name">{step.name}</div>
        {step.details && <div className="step-details">{step.details}</div>}
      </div>
    </div>
  );
};

export const BrightChainSoupDemo: React.FC = () => {
  const { t } = useShowcaseI18n();
  const [brightChain, setBrightChain] =
    useState<SessionIsolatedBrightChain | null>(null);
  const [receipts, setReceipts] = useState<FileReceipt[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [animatingBlockIds, setAnimatingBlockIds] = useState<string[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<BlockInfo | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<{
    sessionId: string;
    blockCount: number;
    blockSize: number;
    blockIds: string[];
  } | null>(null);
  const [magnetUrlInput, setMagnetUrlInput] = useState('');
  const [showMagnetInput, setShowMagnetInput] = useState(false);
  const [showCblUpload, setShowCblUpload] = useState(false);

  const [messageCBL, setMessageCBL] = useState<MessageCBLService | null>(null);
  const [members, setMembers] = useState<Map<string, Member>>(new Map());
  const [creatorBlockIds, setCreatorBlockIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<
    Array<{
      id: string;
      content: string;
      senderId: string;
      recipients: string[];
      timestamp: Date;
    }>
  >([]);
  const [messageContent, setMessageContent] = useState('');
  const [senderId, setSenderId] = useState('user1');
  const [recipientId, setRecipientId] = useState('user2');
  const [showMessagePanel, setShowMessagePanel] = useState(false);

  // CBL Whitening state
  const [enableWhitening, setEnableWhitening] = useState(false);
  const [whiteningResult, setWhiteningResult] =
    useState<CBLStorageResult | null>(null);
  const [whiteningSteps, setWhiteningSteps] = useState<ProcessStep[]>([]);

  // Super CBL state
  const [superCblInfo, _setSuperCblInfo] = useState<{
    isSuperCbl: boolean;
    depth: number;
    subCblCount: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cblInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const newBrightChain = new SessionIsolatedBrightChain(BlockSize.Small);
        setBrightChain(newBrightChain);
        setDebugInfo(newBrightChain.getDebugInfo());

        const checksumService = new ChecksumService();
        const eciesService = new ECIESService<Uint8Array>();
        const enhancedProvider = getEnhancedIdProvider<Uint8Array>();
        const cblService = new CBLService<Uint8Array>(
          checksumService,
          eciesService,
          enhancedProvider,
        );
        const blockStore = newBrightChain.getBlockStore();
        const msgCBL = new MessageCBLService(
          cblService,
          checksumService,
          blockStore,
          undefined,
        );
        setMessageCBL(msgCBL);

        // Create initial member for demo user
        const memberWithMnemonic = await Member.newMember(
          eciesService,
          MemberType.User,
          'user1',
          new EmailString('user1@example.com'),
        );
        const initialMembers = new Map<string, Member>();
        initialMembers.set('user1', memberWithMnemonic.member);
        setMembers(initialMembers);

        // Store initial member document in the soup
        const memberData = JSON.stringify({
          id: memberWithMnemonic.member.id.toString(),
          name: memberWithMnemonic.member.name,
          publicKey: Array.from(memberWithMnemonic.member.publicKey),
        });
        const memberBytes = new TextEncoder().encode(memberData);
        const memberReceipt = await newBrightChain.storeFile(
          memberBytes,
          'member-user1.json',
        );
        setCreatorBlockIds(memberReceipt.blocks.map((b) => b.id));

        console.log('SessionIsolatedBrightChain initialized successfully');
        console.log(
          `Member stored in soup with ${memberReceipt.blocks.length} blocks`,
        );
      } catch (error) {
        console.error(
          'Failed to initialize SessionIsolatedBrightChain:',
          error,
        );
      }
    };
    init();
  }, []);

  const updateStep = (id: string, updates: Partial<ProcessStep>) => {
    setProcessSteps((prev) =>
      prev.map((step) => (step.id === id ? { ...step, ...updates } : step)),
    );
  };

  const handleFileUpload = useCallback(
    async (files: FileList) => {
      if (!brightChain) {
        console.error('SessionIsolatedBrightChain not initialized');
        return;
      }

      setIsProcessing(true);

      for (const file of Array.from(files)) {
        // Build process steps based on whether whitening is enabled
        const steps: ProcessStep[] = [
          { id: 'read', name: 'Reading file', status: 'pending' },
          { id: 'chunk', name: 'Breaking into chunks', status: 'pending' },
          { id: 'pad', name: 'Padding blocks', status: 'pending' },
          { id: 'hash', name: 'Calculating checksums', status: 'pending' },
          { id: 'store', name: 'Storing in block soup', status: 'pending' },
          { id: 'cbl', name: 'Creating CBL metadata', status: 'pending' },
        ];

        // Only add magnet URL step if whitening is enabled
        if (enableWhitening) {
          steps.push({
            id: 'magnet',
            name: 'Generating magnet URL',
            status: 'pending',
          });
        }

        setProcessSteps(steps);

        // Clear previous whitening result
        setWhiteningResult(null);

        // Initialize whitening steps if magnet URL generation is enabled
        if (enableWhitening) {
          const whiteningProcessSteps: ProcessStep[] = [
            { id: 'gen-w', name: 'Generating Whitener (W)', status: 'pending' },
            { id: 'xor', name: 'XOR: CBL ⊕ W = CBL*', status: 'pending' },
            {
              id: 'store-w',
              name: 'Storing Whitener block',
              status: 'pending',
            },
            { id: 'store-cblp', name: 'Storing CBL* block', status: 'pending' },
            {
              id: 'gen-magnet',
              name: 'Generating magnet URL',
              status: 'pending',
            },
          ];
          setWhiteningSteps(whiteningProcessSteps);
        }

        try {
          // Step 1: Read file
          updateStep('read', {
            status: 'processing',
            details: `Reading ${file.name} (${file.size} bytes)`,
          });
          await new Promise((resolve) => setTimeout(resolve, 500));
          const arrayBuffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          updateStep('read', { status: 'complete' });

          // Step 2: Break into chunks
          updateStep('chunk', {
            status: 'processing',
            details: `Block size: ${BlockSize.Small} bytes`,
          });
          await new Promise((resolve) => setTimeout(resolve, 300));
          const chunkCount = Math.ceil(
            uint8Array.length / (BlockSize.Small as number),
          );
          updateStep('chunk', {
            status: 'complete',
            details: `Created ${chunkCount} chunks`,
          });

          // Step 3: Pad blocks
          updateStep('pad', {
            status: 'processing',
            details: 'Adding random padding to blocks',
          });
          await new Promise((resolve) => setTimeout(resolve, 300));
          updateStep('pad', { status: 'complete' });

          // Step 4: Calculate checksums
          updateStep('hash', {
            status: 'processing',
            details: 'SHA-512 checksums for each block',
          });
          await new Promise((resolve) => setTimeout(resolve, 400));
          updateStep('hash', { status: 'complete' });

          // Step 5: Store in block soup
          updateStep('store', {
            status: 'processing',
            details: 'Adding soup cans to memory store',
          });
          await new Promise((resolve) => setTimeout(resolve, 500));

          let receipt;
          if (enableWhitening) {
            // Store with whitening to generate magnet URL
            const whiteningReceipt = await brightChain.storeFileWithWhitening(
              uint8Array,
              file.name,
            );
            receipt = whiteningReceipt;

            // Process whitening steps
            const updateWhiteningStep = (
              id: string,
              updates: Partial<ProcessStep>,
            ) => {
              setWhiteningSteps((prev) =>
                prev.map((step) =>
                  step.id === id ? { ...step, ...updates } : step,
                ),
              );
            };

            // Whitening step 1: Generate W
            updateWhiteningStep('gen-w', { status: 'processing' });
            await new Promise((resolve) => setTimeout(resolve, 300));
            updateWhiteningStep('gen-w', { status: 'complete' });

            // Whitening step 2: XOR
            updateWhiteningStep('xor', { status: 'processing' });
            await new Promise((resolve) => setTimeout(resolve, 300));
            updateWhiteningStep('xor', { status: 'complete' });

            // Whitening step 3: Store W
            updateWhiteningStep('store-w', { status: 'processing' });
            await new Promise((resolve) => setTimeout(resolve, 300));
            updateWhiteningStep('store-w', { status: 'complete' });

            // Whitening step 4: Store CBL*
            updateWhiteningStep('store-cblp', { status: 'processing' });
            await new Promise((resolve) => setTimeout(resolve, 300));
            updateWhiteningStep('store-cblp', { status: 'complete' });

            // Whitening step 5: Generate magnet URL
            updateWhiteningStep('gen-magnet', { status: 'processing' });
            await new Promise((resolve) => setTimeout(resolve, 200));
            updateWhiteningStep('gen-magnet', { status: 'complete' });

            // Store whitening result
            if (whiteningReceipt.whitening) {
              setWhiteningResult({
                blockId1: whiteningReceipt.whitening.blockId1,
                blockId2: whiteningReceipt.whitening.blockId2,
                blockSize: whiteningReceipt.whitening.blockSize,
                magnetUrl: whiteningReceipt.whitening.magnetUrl,
                block1ParityIds: whiteningReceipt.whitening.block1ParityIds,
                block2ParityIds: whiteningReceipt.whitening.block2ParityIds,
                isEncrypted: whiteningReceipt.whitening.isEncrypted,
              });
            }
          } else {
            // Store normally
            receipt = await brightChain.storeFile(uint8Array, file.name);
          }

          updateStep('store', {
            status: 'complete',
            details: `${receipt.blockCount} blocks stored`,
          });

          // Update debug info after storing
          setDebugInfo(brightChain.getDebugInfo());

          // Step 6: Create CBL
          updateStep('cbl', {
            status: 'processing',
            details: 'Creating Constituent Block List',
          });
          await new Promise((resolve) => setTimeout(resolve, 300));
          updateStep('cbl', {
            status: 'complete',
            details: `CBL: ${receipt.cblData.length} bytes`,
          });

          // Step 7: Generate magnet URL (only if whitening is enabled)
          if (enableWhitening) {
            updateStep('magnet', {
              status: 'processing',
              details: 'Creating magnet link',
            });
            await new Promise((resolve) => setTimeout(resolve, 200));
            updateStep('magnet', {
              status: 'complete',
              details: 'Ready for sharing!',
            });
          }

          setReceipts((prev) => [...prev, receipt]);

          // Update debug info
          setDebugInfo(brightChain.getDebugInfo());
        } catch (error) {
          console.error('Failed to store file:', error);
          setProcessSteps((prev) =>
            prev.map((step) =>
              step.status === 'processing'
                ? {
                    ...step,
                    status: 'error',
                    details:
                      error instanceof Error ? error.message : 'Unknown error',
                  }
                : step,
            ),
          );
        }
      }

      setIsProcessing(false);
      setTimeout(() => {
        setProcessSteps([]);
        setWhiteningSteps([]);
      }, 3000);
    },
    [brightChain, enableWhitening],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files) {
        handleFileUpload(e.dataTransfer.files);
      }
    },
    [handleFileUpload],
  );

  const handleRetrieve = useCallback(
    async (receipt: FileReceipt) => {
      if (!brightChain) {
        console.error('SessionIsolatedBrightChain not initialized');
        return;
      }

      try {
        // Animate blocks during retrieval
        const blockIds = receipt.blocks.map((b) => b.id);
        setAnimatingBlockIds(blockIds);

        // Animate each block sequentially
        for (const _block of receipt.blocks) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        const fileData = await brightChain.retrieveFile(receipt);
        const blob = new Blob([new Uint8Array(fileData)]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = receipt.fileName;
        a.click();
        URL.revokeObjectURL(url);

        console.log(
          `File "${receipt.fileName}" retrieved and downloaded successfully`,
        );
      } catch (error) {
        console.error('Failed to retrieve file:', error);
        alert(
          t(ShowcaseStrings.Soup_AlertRetrieveFailed, {
            ERROR: error instanceof Error ? error.message : 'Unknown error',
          }),
        );
      } finally {
        setAnimatingBlockIds([]);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [brightChain],
  );

  const handleDownloadCBL = useCallback((receipt: FileReceipt) => {
    const cblBlob = new Blob([new Uint8Array(receipt.cblData)], {
      type: 'application/octet-stream',
    });
    const url = URL.createObjectURL(cblBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${receipt.fileName}.cbl`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleBlockClick = useCallback((block: BlockInfo) => {
    setSelectedBlock(block);
    setAnimatingBlockIds([block.id]);
    setTimeout(() => setAnimatingBlockIds([]), 1000);
  }, []);

  const handleFileSelect = useCallback((fileId: string) => {
    setSelectedFileId(fileId);
  }, []);

  const handleCblUpload = useCallback(
    async (files: FileList) => {
      if (!brightChain || files.length === 0) return;

      const file = files[0];
      if (!file.name.endsWith('.cbl')) {
        alert(t(ShowcaseStrings.Soup_AlertUploadCBLOnly));
        return;
      }

      try {
        const arrayBuffer = await file.arrayBuffer();
        const cblData = new Uint8Array(arrayBuffer);
        const receipt = brightChain.parseCBL(cblData);

        console.log('CBL parsed successfully:', receipt);

        // Add to receipts so user can retrieve the file
        setReceipts((prev) => [...prev, receipt]);
        setShowCblUpload(false);

        alert(
          t(ShowcaseStrings.Soup_AlertCBLLoaded, {
            NAME: receipt.fileName,
            BLOCKS: String(receipt.blockCount),
          }),
        );
      } catch (error) {
        console.error('Failed to parse CBL:', error);
        alert(
          t(ShowcaseStrings.Soup_AlertParseCBLFailed, {
            ERROR: error instanceof Error ? error.message : 'Unknown error',
          }),
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [brightChain],
  );

  const handleMagnetUrlSubmit = useCallback(async () => {
    if (!brightChain || !magnetUrlInput.trim()) return;

    try {
      // Parse the whitened magnet URL
      const components = brightChain.parseWhitenedCBLMagnetUrl(magnetUrlInput);

      console.log('Magnet URL parsed successfully:', components);

      // Create reconstruction process steps
      const reconstructionSteps: ProcessStep[] = [
        {
          id: 'parse',
          name: 'Parsing magnet URL',
          status: 'complete',
        },
        { id: 'retrieve-b1', name: 'Retrieving Block 1', status: 'pending' },
        { id: 'retrieve-b2', name: 'Retrieving Block 2', status: 'pending' },
        {
          id: 'xor-reconstruct',
          name: 'XOR: Block1 ⊕ Block2 = CBL',
          status: 'pending',
        },
        {
          id: 'validate',
          name: 'Validating reconstructed CBL',
          status: 'pending',
        },
      ];

      // Add Super CBL reconstruction steps if needed
      // This will be populated dynamically if Super CBL is detected

      setWhiteningSteps(reconstructionSteps);

      const updateReconstructionStep = (
        id: string,
        updates: Partial<ProcessStep>,
      ) => {
        setWhiteningSteps((prev) =>
          prev.map((step) => (step.id === id ? { ...step, ...updates } : step)),
        );
      };

      // Step 1: Retrieve Block 1
      updateReconstructionStep('retrieve-b1', { status: 'processing' });
      await new Promise((resolve) => setTimeout(resolve, 300));
      updateReconstructionStep('retrieve-b1', { status: 'complete' });

      // Step 2: Retrieve Block 2
      updateReconstructionStep('retrieve-b2', { status: 'processing' });
      await new Promise((resolve) => setTimeout(resolve, 300));
      updateReconstructionStep('retrieve-b2', { status: 'complete' });

      // Step 3: XOR to reconstruct
      updateReconstructionStep('xor-reconstruct', { status: 'processing' });
      await new Promise((resolve) => setTimeout(resolve, 400));

      // Retrieve the file using the whitened CBL
      const fileData =
        await brightChain.retrieveFileFromWhitenedCBL(magnetUrlInput);

      updateReconstructionStep('xor-reconstruct', { status: 'complete' });

      // Step 4: Validate
      updateReconstructionStep('validate', { status: 'processing' });
      await new Promise((resolve) => setTimeout(resolve, 200));
      updateReconstructionStep('validate', { status: 'complete' });

      // Parse the CBL to create a receipt
      const receipt =
        await brightChain.parseWhitenedCBLForReceipt(magnetUrlInput);
      setReceipts((prev) => [...prev, receipt]);

      // Update debug info
      setDebugInfo(brightChain.getDebugInfo());

      // Download the reconstructed file
      const blob = new Blob([new Uint8Array(fileData)]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = receipt.fileName || 'reconstructed-file';
      a.click();
      URL.revokeObjectURL(url);

      setMagnetUrlInput('');
      setShowMagnetInput(false);

      alert(
        t(ShowcaseStrings.Soup_AlertReconstructed, {
          SIZE: String(fileData.length),
        }),
      );

      setTimeout(() => setWhiteningSteps([]), 3000);
    } catch (error) {
      console.error('Failed to process magnet URL:', error);
      alert(
        t(ShowcaseStrings.Soup_AlertMagnetFailed, {
          ERROR: error instanceof Error ? error.message : 'Unknown error',
        }),
      );

      // Mark current step as error
      setWhiteningSteps((prev) =>
        prev.map((step) =>
          step.status === 'processing'
            ? {
                ...step,
                status: 'error',
                details:
                  error instanceof Error ? error.message : 'Unknown error',
              }
            : step,
        ),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brightChain, magnetUrlInput]);

  const handleSendMessage = useCallback(async () => {
    if (!messageContent.trim() || !messageCBL || !brightChain) return;

    try {
      const eciesService = new ECIESService();

      // Get or create sender member
      let senderMember = members.get(senderId);
      if (!senderMember) {
        const memberWithMnemonic = await Member.newMember(
          eciesService,
          MemberType.User,
          senderId,
          new EmailString(`${senderId}@example.com`),
        );
        senderMember = memberWithMnemonic.member;
        setMembers((prev) => new Map(prev).set(senderId, senderMember!));

        // Store new member document with whitening
        const memberData = JSON.stringify({
          id: senderMember.id.toString(),
          name: senderMember.name,
          publicKey: Array.from(senderMember.publicKey),
        });
        const memberBytes = new TextEncoder().encode(memberData);
        await brightChain.storeFileWithWhitening(
          memberBytes,
          `member-${senderId}.json`,
        );
      }

      // Get or create recipient member
      let recipientMember = members.get(recipientId);
      if (!recipientMember) {
        const memberWithMnemonic = await Member.newMember(
          eciesService,
          MemberType.User,
          recipientId,
          new EmailString(`${recipientId}@example.com`),
        );
        recipientMember = memberWithMnemonic.member;
        setMembers((prev) => new Map(prev).set(recipientId, recipientMember!));

        // Store new member document with whitening
        const memberData = JSON.stringify({
          id: recipientMember.id.toString(),
          name: recipientMember.name,
          publicKey: Array.from(recipientMember.publicKey),
        });
        const memberBytes = new TextEncoder().encode(memberData);
        await brightChain.storeFileWithWhitening(
          memberBytes,
          `member-${recipientId}.json`,
        );
      }

      const content = new TextEncoder().encode(messageContent);

      const { messageId, contentBlockIds, magnetUrl } =
        await messageCBL.createMessage(content, senderMember, {
          messageType: 'chat',
          senderId,
          recipients: [recipientId],
          priority: MessagePriority.NORMAL,
          encryptionScheme: MessageEncryptionScheme.NONE,
        });

      const newMessage = {
        id: messageId,
        content: messageContent,
        senderId,
        recipients: [recipientId],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, newMessage]);

      // Create receipt for the message
      const messageReceipt: FileReceipt = {
        id: messageId,
        fileName: `Message: ${messageContent.substring(0, 30)}${messageContent.length > 30 ? '...' : ''}`,
        originalSize: content.length,
        blockCount: contentBlockIds?.length || 0,
        blocks: (contentBlockIds || []).map((id: string, index: number) => ({
          id,
          index,
          size: brightChain.getDebugInfo().blockSize,
          checksum: Checksum.fromHex(id),
        })),
        cblData: [],
        magnetUrl: magnetUrl || '',
        type: 'message',
        messageMetadata: {
          senderId,
          recipients: [recipientId],
          timestamp: new Date(),
          content: messageContent,
        },
      };

      setReceipts((prev) => [...prev, messageReceipt]);
      setMessageContent('');
      setDebugInfo(brightChain.getDebugInfo());
      alert(t(ShowcaseStrings.Soup_AlertMessageSent));
    } catch (error) {
      console.error('Failed to send message:', error);
      alert(
        t(ShowcaseStrings.Soup_AlertSendFailed, {
          ERROR: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageContent, senderId, recipientId, messageCBL, members, brightChain]);

  const handleRetrieveMessage = useCallback(
    async (messageId: string) => {
      if (!messageCBL) return;

      try {
        const content = await messageCBL.getMessageContent(messageId);
        const text = new TextDecoder().decode(content);
        alert(t(ShowcaseStrings.Soup_AlertMessageRetrieved, { TEXT: text }));
      } catch (error) {
        console.error('Failed to retrieve message:', error);
        alert(
          t(ShowcaseStrings.Soup_AlertRetrieveMessageFailed, {
            ERROR: error instanceof Error ? error.message : 'Unknown error',
          }),
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messageCBL],
  );

  return (
    <div className="brightchain-demo">
      <div className="demo-header">
        <h1 className="demo-title">{t(ShowcaseStrings.Soup_Title)}</h1>
        <p className="demo-subtitle">{t(ShowcaseStrings.Soup_Subtitle)}</p>
        <p className="session-info">
          <strong>{t(ShowcaseStrings.Soup_Session)}</strong>{' '}
          {debugInfo?.sessionId?.substring(0, 20)}...
          <span className="session-note">
            {t(ShowcaseStrings.Soup_DataClearsOnRefresh)}
          </span>
        </p>
      </div>

      {!brightChain ? (
        <div className="loading-container">
          <div className="upload-icon">⚙️</div>
          <p className="loading-text">{t(ShowcaseStrings.Soup_Initializing)}</p>
        </div>
      ) : (
        <div className="demo-grid">
          <div>
            {/* Unified Storage Section */}
            <div
              className="reconstruction-options"
              style={{ marginBottom: '20px' }}
            >
              <h3 className="reconstruction-header">
                <span>📦</span>
                {t(ShowcaseStrings.Soup_StoreInSoup)}
              </h3>

              {/* File Upload */}
              <div style={{ marginBottom: '15px' }}>
                <h4 style={{ margin: '10px 0' }}>
                  {t(ShowcaseStrings.Soup_StoreFiles)}
                </h4>
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  className={`upload-area ${dragOver ? 'drag-over' : ''}`}
                >
                  <span className="upload-icon">📁</span>
                  <p className="upload-text">
                    {t(ShowcaseStrings.Soup_DropFilesOrClick)}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={(e) =>
                      e.target.files && handleFileUpload(e.target.files)
                    }
                    className="upload-input"
                    disabled={isProcessing}
                    style={{ display: 'none' }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="upload-input"
                    disabled={isProcessing}
                  >
                    {t(ShowcaseStrings.Soup_ChooseFiles)}
                  </button>

                  {/* CBL Magnet URL Toggle - Grouped with Upload */}
                  <div
                    className="whitening-toggle"
                    style={{ marginTop: '1rem' }}
                  >
                    <label>
                      <input
                        type="checkbox"
                        checked={enableWhitening}
                        onChange={(e) => setEnableWhitening(e.target.checked)}
                      />
                      <span>{t(ShowcaseStrings.Soup_StoreCBLWithMagnet)}</span>
                    </label>
                    <p className="whitening-info">
                      {t(ShowcaseStrings.Soup_StoreCBLInfo)}
                    </p>
                  </div>
                </div>

                {/* Message Storage */}
                <div
                  style={{
                    marginTop: '15px',
                    padding: '15px',
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                    backgroundColor: '#f9f9f9',
                  }}
                >
                  <h4 style={{ marginTop: 0 }}>
                    {t(ShowcaseStrings.Soup_StoreMessages)}
                  </h4>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>
                      {t(ShowcaseStrings.Soup_From)}
                    </label>
                    <input
                      type="text"
                      value={senderId}
                      onChange={(e) => setSenderId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>
                      {t(ShowcaseStrings.Soup_To)}
                    </label>
                    <input
                      type="text"
                      value={recipientId}
                      onChange={(e) => setRecipientId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>
                      {t(ShowcaseStrings.Soup_Message)}
                    </label>
                    <textarea
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      placeholder={t(ShowcaseStrings.Soup_TypeMessage)}
                      style={{
                        width: '100%',
                        minHeight: '60px',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                      }}
                    />
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageContent.trim()}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: messageContent.trim()
                        ? '#4caf50'
                        : '#ccc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: messageContent.trim() ? 'pointer' : 'not-allowed',
                      width: '100%',
                    }}
                  >
                    {t(ShowcaseStrings.Soup_SendToSoup)}
                  </button>
                </div>
              </div>

              {/* Whitening Result Display */}
              {whiteningResult && (
                <div className="whitening-result">
                  <h4>{t(ShowcaseStrings.Soup_CBLStoredInSoup)}</h4>
                  {superCblInfo?.isSuperCbl && (
                    <div
                      style={{
                        marginBottom: '1rem',
                        padding: '10px',
                        backgroundColor: '#e3f2fd',
                        borderRadius: '4px',
                      }}
                    >
                      <strong>{t(ShowcaseStrings.Soup_SuperCBLUsed)}</strong>
                      <div style={{ fontSize: '14px', marginTop: '5px' }}>
                        <div>
                          {t(ShowcaseStrings.Soup_HierarchyDepth)}{' '}
                          {superCblInfo.depth}
                        </div>
                        <div>
                          {t(ShowcaseStrings.Soup_SubCBLs)}{' '}
                          {superCblInfo.subCblCount}
                        </div>
                        <div
                          style={{
                            fontSize: '12px',
                            color: '#666',
                            marginTop: '5px',
                          }}
                        >
                          {t(ShowcaseStrings.Soup_LargeFileSplit)}
                        </div>
                      </div>
                    </div>
                  )}
                  <p
                    className="whitening-info"
                    style={{ marginLeft: 0, marginBottom: '1rem' }}
                  >
                    {t(ShowcaseStrings.Soup_CBLStoredInfo)}
                  </p>
                  <div className="whitening-ids">
                    <div className="id-row">
                      <span>{t(ShowcaseStrings.Soup_Component1)}</span>
                      <code>
                        {whiteningResult.blockId1.substring(0, 20)}...
                      </code>
                    </div>
                    <div className="id-row">
                      <span>{t(ShowcaseStrings.Soup_Component2)}</span>
                      <code>
                        {whiteningResult.blockId2.substring(0, 20)}...
                      </code>
                    </div>
                  </div>
                  <div className="whitened-magnet">
                    <input
                      type="text"
                      value={whiteningResult.magnetUrl}
                      readOnly
                      onClick={(e) => e.currentTarget.select()}
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard
                          .writeText(whiteningResult.magnetUrl)
                          .then(() => {
                            alert(t(ShowcaseStrings.Soup_AlertCopied));
                          })
                          .catch(() => {
                            // Fallback for older browsers
                            const input = document.createElement('input');
                            input.value = whiteningResult.magnetUrl;
                            document.body.appendChild(input);
                            input.select();
                            document.execCommand('copy');
                            document.body.removeChild(input);
                            alert(t(ShowcaseStrings.Soup_AlertCopied));
                          });
                      }}
                    >
                      {t(ShowcaseStrings.Soup_Copy)}
                    </button>
                  </div>
                </div>
              )}

              {/* Reconstruction Options */}
              <div className="reconstruction-options">
                <h3 className="reconstruction-header">
                  <span>🔄</span>
                  {t(ShowcaseStrings.Soup_RetrieveFromSoup)}
                </h3>
                <div className="reconstruction-buttons">
                  <button
                    onClick={() => setShowCblUpload(!showCblUpload)}
                    className="reconstruction-btn"
                  >
                    <span>📄</span>
                    {t(ShowcaseStrings.Soup_UploadCBLFile)}
                  </button>
                  <button
                    onClick={() => setShowMagnetInput(!showMagnetInput)}
                    className="reconstruction-btn"
                  >
                    <span>🧲</span>
                    {t(ShowcaseStrings.Soup_UseMagnetURL)}
                  </button>
                </div>

                {/* CBL Upload Section */}
                {showCblUpload && (
                  <div className="cbl-upload-section">
                    <p className="cbl-info">
                      {t(ShowcaseStrings.Soup_CBLUploadInfo)}
                    </p>
                    <input
                      ref={cblInputRef}
                      type="file"
                      accept=".cbl"
                      onChange={(e) =>
                        e.target.files && handleCblUpload(e.target.files)
                      }
                      style={{ display: 'none' }}
                    />
                    <button
                      onClick={() => cblInputRef.current?.click()}
                      className="cbl-upload-btn"
                    >
                      <span>📂</span>
                      {t(ShowcaseStrings.Soup_ChooseCBLFile)}
                    </button>
                  </div>
                )}

                {/* Magnet URL Input Section */}
                {showMagnetInput && (
                  <div className="magnet-input-section">
                    <p className="magnet-info">
                      {t(ShowcaseStrings.Soup_MagnetURLInfo)}
                    </p>
                    <div className="magnet-input-group">
                      <input
                        type="text"
                        value={magnetUrlInput}
                        onChange={(e) => setMagnetUrlInput(e.target.value)}
                        placeholder={t(ShowcaseStrings.Soup_MagnetPlaceholder)}
                        className="magnet-text-input"
                      />
                      <button
                        onClick={handleMagnetUrlSubmit}
                        className="magnet-submit-btn"
                        disabled={!magnetUrlInput.trim()}
                      >
                        {t(ShowcaseStrings.Soup_Load)}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Message Passing Panel */}
              <div
                className="reconstruction-options"
                style={{ marginTop: '20px' }}
              >
                <h3 className="reconstruction-header">
                  <span>💬</span>
                  {t(ShowcaseStrings.Soup_MessagePassing)}
                </h3>
                <button
                  onClick={() => setShowMessagePanel(!showMessagePanel)}
                  className="reconstruction-btn"
                  style={{ width: '100%' }}
                >
                  <span>{showMessagePanel ? '▼' : '▶'}</span>
                  {showMessagePanel
                    ? t(ShowcaseStrings.Soup_HideMessagePanel)
                    : t(ShowcaseStrings.Soup_ShowMessagePanel)}
                </button>

                {showMessagePanel && (
                  <div style={{ marginTop: '15px' }}>
                    <div
                      style={{
                        marginBottom: '15px',
                        padding: '15px',
                        border: '1px solid #ccc',
                        borderRadius: '8px',
                        backgroundColor: '#f9f9f9',
                      }}
                    >
                      <h4 style={{ marginTop: 0 }}>
                        {t(ShowcaseStrings.Soup_SendMessage)}
                      </h4>
                      <div style={{ marginBottom: '10px' }}>
                        <label
                          style={{ display: 'block', marginBottom: '5px' }}
                        >
                          {t(ShowcaseStrings.Soup_From)}
                        </label>
                        <input
                          type="text"
                          value={senderId}
                          onChange={(e) => setSenderId(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px',
                            borderRadius: '4px',
                            border: '1px solid #ccc',
                          }}
                        />
                      </div>
                      <div style={{ marginBottom: '10px' }}>
                        <label
                          style={{ display: 'block', marginBottom: '5px' }}
                        >
                          {t(ShowcaseStrings.Soup_To)}
                        </label>
                        <input
                          type="text"
                          value={recipientId}
                          onChange={(e) => setRecipientId(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px',
                            borderRadius: '4px',
                            border: '1px solid #ccc',
                          }}
                        />
                      </div>
                      <div style={{ marginBottom: '10px' }}>
                        <label
                          style={{ display: 'block', marginBottom: '5px' }}
                        >
                          {t(ShowcaseStrings.Soup_Message)}
                        </label>
                        <textarea
                          value={messageContent}
                          onChange={(e) => setMessageContent(e.target.value)}
                          placeholder={t(ShowcaseStrings.Soup_TypeMessage)}
                          style={{
                            width: '100%',
                            minHeight: '80px',
                            padding: '8px',
                            borderRadius: '4px',
                            border: '1px solid #ccc',
                          }}
                        />
                      </div>
                      <button
                        onClick={handleSendMessage}
                        disabled={!messageContent.trim()}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: messageContent.trim()
                            ? '#4caf50'
                            : '#ccc',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: messageContent.trim()
                            ? 'pointer'
                            : 'not-allowed',
                          width: '100%',
                        }}
                      >
                        {t(ShowcaseStrings.Soup_SendMessage)}
                      </button>
                    </div>

                    <div>
                      <h4>
                        {t(ShowcaseStrings.Soup_MessagesTemplate).replace(
                          '{COUNT}',
                          String(messages.length),
                        )}
                      </h4>
                      {messages.length === 0 ? (
                        <p style={{ color: '#666', fontStyle: 'italic' }}>
                          {t(ShowcaseStrings.Soup_NoMessagesYet)}
                        </p>
                      ) : (
                        messages.map((msg) => (
                          <div
                            key={msg.id}
                            style={{
                              border: '1px solid #ccc',
                              borderRadius: '8px',
                              padding: '12px',
                              margin: '8px 0',
                              backgroundColor: '#fff',
                            }}
                          >
                            <div
                              style={{ marginBottom: '6px', fontSize: '12px' }}
                            >
                              <strong>{t(ShowcaseStrings.Soup_From)}</strong>{' '}
                              {msg.senderId} →{' '}
                              <strong>{t(ShowcaseStrings.Soup_To)}</strong>{' '}
                              {msg.recipients.join(', ')}
                            </div>
                            <div
                              style={{
                                marginBottom: '6px',
                                padding: '8px',
                                backgroundColor: '#f5f5f5',
                                borderRadius: '4px',
                              }}
                            >
                              {msg.content}
                            </div>
                            <div
                              style={{
                                fontSize: '11px',
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
                                fontSize: '12px',
                              }}
                            >
                              {t(ShowcaseStrings.Soup_RetrieveFromSoupBtn)}
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Stored Messages */}
              {messages.length > 0 && (
                <div className="file-actions-section">
                  <h3 className="actions-header">
                    <span>💬</span>
                    {t(ShowcaseStrings.Soup_StoredMessages)}
                  </h3>
                  <div className="actions-grid">
                    {messages.map((msg) => (
                      <div key={msg.id} className="action-card">
                        <div className="action-card-header">
                          <span>💬</span>
                          <h4>
                            {msg.senderId} → {msg.recipients.join(', ')}
                          </h4>
                        </div>
                        <div
                          style={{
                            padding: '8px',
                            backgroundColor: '#f5f5f5',
                            borderRadius: '4px',
                            marginBottom: '8px',
                          }}
                        >
                          {msg.content}
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#666',
                            marginBottom: '8px',
                          }}
                        >
                          {msg.timestamp.toLocaleString()}
                        </div>
                        <button
                          onClick={() => handleRetrieveMessage(msg.id)}
                          className="action-btn primary"
                        >
                          <span>📥</span>
                          {t(ShowcaseStrings.Soup_RetrieveFromSoupBtn)}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced Soup Visualization */}
            <EnhancedSoupVisualization
              files={receipts}
              selectedFileId={selectedFileId}
              onFileSelect={handleFileSelect}
              onBlockClick={handleBlockClick}
              animatingBlockIds={animatingBlockIds}
              showConnections={true}
              allBlockIds={debugInfo?.blockIds}
              memberBlockIds={creatorBlockIds}
            />

            {/* File Actions */}
            {receipts.length > 0 && (
              <div className="file-actions-section">
                <h3 className="actions-header">
                  <span>⚡</span>
                  {t(ShowcaseStrings.Soup_StoredFilesAndMessages)}
                </h3>
                <div className="actions-grid">
                  {receipts.map((receipt) => (
                    <div key={receipt.id} className="action-card">
                      <div className="action-card-header">
                        <span>{receipt.type === 'message' ? '💬' : '📄'}</span>
                        <h4>{receipt.fileName}</h4>
                        <button
                          className="delete-file-btn"
                          onClick={() => {
                            if (
                              confirm(
                                t(ShowcaseStrings.Soup_RemoveConfirmTemplate, {
                                  NAME: receipt.fileName,
                                }),
                              )
                            ) {
                              setReceipts((prev) =>
                                prev.filter((r) => r.id !== receipt.id),
                              );
                              if (selectedFileId === receipt.id) {
                                setSelectedFileId(null);
                              }
                            }
                          }}
                          title={t(ShowcaseStrings.Soup_RemoveFromList)}
                        >
                          ✕
                        </button>
                      </div>
                      {receipt.type === 'message' &&
                        receipt.messageMetadata && (
                          <div
                            style={{
                              fontSize: '12px',
                              marginBottom: '8px',
                              color: '#666',
                            }}
                          >
                            <div>
                              <strong>{t(ShowcaseStrings.Soup_From)}</strong>{' '}
                              {receipt.messageMetadata.senderId}
                            </div>
                            <div>
                              <strong>{t(ShowcaseStrings.Soup_To)}</strong>{' '}
                              {receipt.messageMetadata.recipients.join(', ')}
                            </div>
                            <div>
                              <strong>{t(ShowcaseStrings.Soup_Time)}:</strong>{' '}
                              {receipt.messageMetadata.timestamp.toLocaleString()}
                            </div>
                          </div>
                        )}
                      <div className="action-buttons">
                        {receipt.type === 'message' ? (
                          <button
                            onClick={() => handleRetrieveMessage(receipt.id)}
                            className="action-btn primary"
                          >
                            <span>📥</span>
                            {t(ShowcaseStrings.Soup_RetrieveMessage)}
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleRetrieve(receipt)}
                              className="action-btn primary"
                              disabled={isProcessing}
                            >
                              <span>📥</span>
                              {t(ShowcaseStrings.Soup_RetrieveFile)}
                            </button>
                            <button
                              onClick={() => handleDownloadCBL(receipt)}
                              className="action-btn secondary"
                            >
                              <span>📄</span>
                              {t(ShowcaseStrings.Soup_DownloadCBL)}
                            </button>
                          </>
                        )}
                      </div>
                      {/* Show magnet URL section if this receipt has whitening */}
                      {(receipt as { whitening?: { magnetUrl: string } })
                        .whitening && (
                        <details className="magnet-details">
                          <summary className="magnet-summary">
                            {t(ShowcaseStrings.Soup_MagnetURL)}
                          </summary>
                          <div className="magnet-url-container">
                            <input
                              type="text"
                              value={
                                (
                                  receipt as {
                                    whitening?: { magnetUrl: string };
                                  }
                                ).whitening?.magnetUrl || ''
                              }
                              readOnly
                              className="magnet-input"
                              onClick={(e) => e.currentTarget.select()}
                            />
                            <button
                              className="copy-magnet-btn"
                              onClick={() => {
                                const magnetUrl =
                                  (
                                    receipt as {
                                      whitening?: { magnetUrl: string };
                                    }
                                  ).whitening?.magnetUrl || '';
                                navigator.clipboard
                                  .writeText(magnetUrl)
                                  .then(() => {
                                    alert(t(ShowcaseStrings.Soup_AlertCopied));
                                  })
                                  .catch(() => {
                                    // Fallback for older browsers
                                    const input =
                                      document.createElement('input');
                                    input.value = magnetUrl;
                                    document.body.appendChild(input);
                                    input.select();
                                    document.execCommand('copy');
                                    document.body.removeChild(input);
                                    alert(t(ShowcaseStrings.Soup_AlertCopied));
                                  });
                              }}
                              title="Copy to clipboard"
                            >
                              {t(ShowcaseStrings.Soup_Copy)}
                            </button>
                          </div>
                          <div className="magnet-url-info">
                            <small>
                              {t(ShowcaseStrings.Soup_WhitenedCBLInfo)}
                            </small>
                          </div>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="demo-sidebar">
            {/* Process Steps */}
            {processSteps.length > 0 && (
              <div className="process-steps">
                <h3 className="process-header">
                  <span>🔄</span>
                  {t(ShowcaseStrings.Soup_ProcessingSteps)}
                </h3>
                {processSteps.map((step) => (
                  <ProcessStepIndicator key={step.id} step={step} />
                ))}
              </div>
            )}

            {/* Whitening Steps */}
            {whiteningSteps.length > 0 && (
              <div className="process-steps whitening-steps">
                <h3 className="process-header">
                  <span>🔐</span>
                  {t(ShowcaseStrings.Soup_CBLStorageSteps)}
                </h3>
                {whiteningSteps.map((step) => (
                  <ProcessStepIndicator key={step.id} step={step} />
                ))}
              </div>
            )}

            {/* Selected Block Info */}
            {selectedBlock && (
              <div className="block-details">
                <h3 className="block-details-header">
                  <span>🥫</span>
                  {t(ShowcaseStrings.Soup_BlockDetails)}
                </h3>
                <div className="block-info">
                  <p>
                    <strong>{t(ShowcaseStrings.Soup_Index)}</strong> #
                    {selectedBlock.index}
                  </p>
                  <p>
                    <strong>{t(ShowcaseStrings.Soup_Size)}</strong>{' '}
                    {selectedBlock.size} bytes
                  </p>
                  <p>
                    <strong>{t(ShowcaseStrings.Soup_Id)}</strong>
                  </p>
                  <div className="block-id">{selectedBlock.id}</div>
                  <p>
                    <strong>{t(ShowcaseStrings.Soup_Color)}</strong>
                    <span
                      className="block-color-swatch"
                      style={{
                        backgroundColor: `hsl(${(selectedBlock.index * 137.5) % 360}, 70%, 60%)`,
                      }}
                    />
                  </p>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="stats-panel">
              <h3 className="stats-header">
                <span>📊</span>
                {t(ShowcaseStrings.Soup_SoupStats)}
              </h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <span>{t(ShowcaseStrings.Soup_TotalFiles)}</span>
                  <span className="stat-value">{receipts.length}</span>
                </div>
                <div className="stat-item">
                  <span>{t(ShowcaseStrings.Soup_TotalBlocks)}</span>
                  <span className="stat-value">
                    {debugInfo?.blockCount || 0}
                  </span>
                </div>
                <div className="stat-item">
                  <span>{t(ShowcaseStrings.Soup_BlockSize)}</span>
                  <span className="stat-value">{BlockSize.Small} bytes</span>
                </div>
              </div>
            </div>

            {/* Debug Panel */}
            {debugInfo && (
              <div className="debug-panel">
                <h3 className="debug-header">
                  <span>🔧</span>
                  {t(ShowcaseStrings.Soup_SessionDebug)}
                </h3>
                <div className="debug-info">
                  <p>
                    <strong>{t(ShowcaseStrings.Soup_SessionId)}</strong>
                  </p>
                  <div className="session-id">{debugInfo.sessionId}</div>
                  <p>
                    <strong>{t(ShowcaseStrings.Soup_BlocksInMemory)}</strong>{' '}
                    {debugInfo.blockCount}
                  </p>
                  <p>
                    <strong>{t(ShowcaseStrings.Soup_BlockSize)}</strong>{' '}
                    {debugInfo.blockSize} bytes
                  </p>
                  {debugInfo.blockIds.length > 0 && (
                    <>
                      <p>
                        <strong>{t(ShowcaseStrings.Soup_BlockIds)}</strong>
                      </p>
                      <div className="block-ids">
                        {debugInfo.blockIds.map((id: string, index: number) => (
                          <div key={index} className="block-id-item">
                            {id}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  <button
                    onClick={() => {
                      if (brightChain) {
                        brightChain.clearSession();
                        setReceipts([]);
                        setDebugInfo(brightChain.getDebugInfo());
                        console.log('Session cleared manually');
                      }
                    }}
                    className="clear-session-btn"
                  >
                    {t(ShowcaseStrings.Soup_ClearSession)}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
