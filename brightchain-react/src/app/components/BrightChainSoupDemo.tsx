/**
 * BrightChainSoupDemo — Full-featured demo ported from the standalone showcase app.
 *
 * Demonstrates:
 *  - File upload → chunking → padding → checksumming → block soup storage
 *  - CBL (Constituent Block List) creation and download
 *  - CBL whitening with XOR and magnet URL generation
 *  - File retrieval from block soup via receipt, CBL upload, or magnet URL
 *  - Message passing stored as CBL blocks in the soup
 *  - Visual block soup grid with file-based highlighting
 *  - Process step indicators and session debug info
 */

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
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FileReceiptWithWhitening,
  SessionIsolatedBrightChain,
} from './showcase/SessionIsolatedBrightChain';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProcessStep {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  details?: string;
}

interface DemoMessage {
  id: string;
  content: string;
  senderId: string;
  recipients: string[];
  timestamp: Date;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const StepIndicator: React.FC<{ step: ProcessStep }> = ({ step }) => {
  const icon =
    step.status === 'complete'
      ? '✅'
      : step.status === 'processing'
        ? '⏳'
        : step.status === 'error'
          ? '❌'
          : '⭕';
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 0.5,
        px: 1,
        borderRadius: 1,
        bgcolor:
          step.status === 'processing'
            ? 'info.main'
            : step.status === 'complete'
              ? 'success.main'
              : step.status === 'error'
                ? 'error.main'
                : 'action.hover',
        color: step.status === 'pending' ? 'text.secondary' : 'common.white',
        opacity: step.status === 'pending' ? 0.6 : 1,
        transition: 'all 0.3s',
      }}
    >
      <Typography variant="body2">{icon}</Typography>
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" fontWeight={600}>
          {step.name}
        </Typography>
        {step.details && (
          <Typography variant="caption" display="block">
            {step.details}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

/** Colourful block in the soup grid */
const SoupCan: React.FC<{
  blockId: string;
  index: number;
  highlighted: boolean;
  animating: boolean;
  isMember: boolean;
  onClick: () => void;
}> = ({ blockId, index, highlighted, animating, isMember, onClick }) => {
  const hue = (index * 137.5) % 360;
  return (
    <Tooltip title={`Block #${index} — ${blockId.substring(0, 16)}…`} arrow>
      <Box
        onClick={onClick}
        sx={{
          width: 64,
          height: 80,
          borderRadius: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          bgcolor: `hsl(${hue}, 70%, ${highlighted ? 75 : 55}%)`,
          border: highlighted ? '2px solid' : '2px solid transparent',
          borderColor: highlighted ? 'primary.main' : 'transparent',
          boxShadow: animating ? 6 : highlighted ? 3 : 1,
          transition: 'all 0.3s',
          transform: animating ? 'scale(1.15)' : 'scale(1)',
          '&:hover': {
            transform: 'translateY(-3px) scale(1.05)',
            boxShadow: 4,
          },
          color: 'common.white',
          textShadow: '1px 1px 2px rgba(0,0,0,0.6)',
          userSelect: 'none',
        }}
      >
        <Typography variant="body2" fontSize={18}>
          {isMember ? '👤' : '🥫'}
        </Typography>
        <Typography variant="caption" fontWeight={700} fontSize={10}>
          #{index}
        </Typography>
      </Box>
    </Tooltip>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const BrightChainSoupDemo: React.FC = () => {
  // Core state
  const [brightChain, setBrightChain] =
    useState<SessionIsolatedBrightChain | null>(null);
  const [receipts, setReceipts] = useState<FileReceipt[]>([]);
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([]);
  const [whiteningSteps, setWhiteningSteps] = useState<ProcessStep[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Visualization state
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<BlockInfo | null>(null);
  const [animatingBlockIds, setAnimatingBlockIds] = useState<string[]>([]);
  const [debugInfo, setDebugInfo] = useState<{
    sessionId: string;
    blockCount: number;
    blockSize: number;
    blockIds: string[];
  } | null>(null);

  // Whitening / magnet state
  const [enableWhitening, setEnableWhitening] = useState(false);
  const [whiteningResult, setWhiteningResult] =
    useState<CBLStorageResult | null>(null);
  const [magnetUrlInput, setMagnetUrlInput] = useState('');
  const [showMagnetInput, setShowMagnetInput] = useState(false);
  const [showCblUpload, setShowCblUpload] = useState(false);

  // Messaging state
  const [messageCBL, setMessageCBL] = useState<MessageCBLService | null>(null);
  const [members, setMembers] = useState<Map<string, Member>>(new Map());
  const [creatorBlockIds, setCreatorBlockIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<DemoMessage[]>([]);
  const [messageContent, setMessageContent] = useState('');
  const [senderId, setSenderId] = useState('user1');
  const [recipientId, setRecipientId] = useState('user2');
  const [showMessagePanel, setShowMessagePanel] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cblInputRef = useRef<HTMLInputElement>(null);

  // ---- Initialization ----
  useEffect(() => {
    const init = async () => {
      try {
        const bc = new SessionIsolatedBrightChain(BlockSize.Small);
        setBrightChain(bc);
        setDebugInfo(bc.getDebugInfo());

        const checksumService = new ChecksumService();
        const eciesService = new ECIESService<Uint8Array>();
        const enhancedProvider = getEnhancedIdProvider<Uint8Array>();
        const cblService = new CBLService<Uint8Array>(
          checksumService,
          eciesService,
          enhancedProvider,
        );
        const blockStore = bc.getBlockStore();
        const msgCBL = new MessageCBLService(
          cblService,
          checksumService,
          blockStore,
          undefined,
        );
        setMessageCBL(msgCBL);

        // Create initial member
        const { member } = await Member.newMember(
          eciesService,
          MemberType.User,
          'user1',
          new EmailString('user1@example.com'),
        );
        const initialMembers = new Map<string, Member>();
        initialMembers.set('user1', member);
        setMembers(initialMembers);

        // Store member document in the soup
        const memberData = JSON.stringify({
          id: member.id.toString(),
          name: member.name,
          publicKey: Array.from(member.publicKey),
        });
        const memberReceipt = await bc.storeFile(
          new TextEncoder().encode(memberData),
          'member-user1.json',
        );
        setCreatorBlockIds(memberReceipt.blocks.map((b) => b.id));
        setDebugInfo(bc.getDebugInfo());
      } catch (error) {
        console.error('Failed to initialize:', error);
      }
    };
    init();
  }, []);

  // ---- Helpers ----
  const updateStep = (id: string, updates: Partial<ProcessStep>) => {
    setProcessSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    );
  };

  const updateWhiteningStep = (id: string, updates: Partial<ProcessStep>) => {
    setWhiteningSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    );
  };

  const highlightedBlockIds = React.useMemo(() => {
    if (!selectedFileId) return new Set<string>();
    const file = receipts.find((r) => r.id === selectedFileId);
    return new Set(file?.blocks.map((b) => b.id) ?? []);
  }, [selectedFileId, receipts]);

  const memberBlockIdSet = React.useMemo(
    () => new Set(creatorBlockIds),
    [creatorBlockIds],
  );

  // ---- File upload ----
  const handleFileUpload = useCallback(
    async (files: FileList) => {
      if (!brightChain) return;
      setIsProcessing(true);

      for (const file of Array.from(files)) {
        const steps: ProcessStep[] = [
          { id: 'read', name: 'Reading file', status: 'pending' },
          { id: 'chunk', name: 'Breaking into chunks', status: 'pending' },
          { id: 'pad', name: 'Padding blocks', status: 'pending' },
          { id: 'hash', name: 'Calculating checksums', status: 'pending' },
          { id: 'store', name: 'Storing in block soup', status: 'pending' },
          { id: 'cbl', name: 'Creating CBL metadata', status: 'pending' },
        ];
        if (enableWhitening) {
          steps.push({
            id: 'magnet',
            name: 'Generating magnet URL',
            status: 'pending',
          });
        }
        setProcessSteps(steps);
        setWhiteningResult(null);

        if (enableWhitening) {
          setWhiteningSteps([
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
          ]);
        }

        try {
          // Step 1: Read
          updateStep('read', {
            status: 'processing',
            details: `${file.name} (${file.size} bytes)`,
          });
          await new Promise((r) => setTimeout(r, 400));
          const uint8 = new Uint8Array(await file.arrayBuffer());
          updateStep('read', { status: 'complete' });

          // Step 2: Chunk
          updateStep('chunk', {
            status: 'processing',
            details: `Block size: ${BlockSize.Small} bytes`,
          });
          await new Promise((r) => setTimeout(r, 250));
          const chunkCount = Math.ceil(
            uint8.length / (BlockSize.Small as number),
          );
          updateStep('chunk', {
            status: 'complete',
            details: `${chunkCount} chunks`,
          });

          // Step 3: Pad
          updateStep('pad', {
            status: 'processing',
            details: 'Random padding',
          });
          await new Promise((r) => setTimeout(r, 250));
          updateStep('pad', { status: 'complete' });

          // Step 4: Hash
          updateStep('hash', {
            status: 'processing',
            details: 'SHA-512 checksums',
          });
          await new Promise((r) => setTimeout(r, 300));
          updateStep('hash', { status: 'complete' });

          // Step 5: Store
          updateStep('store', {
            status: 'processing',
            details: 'Adding to memory store',
          });
          await new Promise((r) => setTimeout(r, 400));

          let receipt: FileReceipt;
          if (enableWhitening) {
            const wr = await brightChain.storeFileWithWhitening(
              uint8,
              file.name,
            );
            receipt = wr;

            // Animate whitening steps
            for (const sid of [
              'gen-w',
              'xor',
              'store-w',
              'store-cblp',
              'gen-magnet',
            ]) {
              updateWhiteningStep(sid, { status: 'processing' });
              await new Promise((r) => setTimeout(r, 250));
              updateWhiteningStep(sid, { status: 'complete' });
            }

            if (wr.whitening) {
              setWhiteningResult({
                blockId1: wr.whitening.blockId1,
                blockId2: wr.whitening.blockId2,
                blockSize: wr.whitening.blockSize,
                magnetUrl: wr.whitening.magnetUrl,
                block1ParityIds: wr.whitening.block1ParityIds,
                block2ParityIds: wr.whitening.block2ParityIds,
                isEncrypted: wr.whitening.isEncrypted,
              });
            }
          } else {
            receipt = await brightChain.storeFile(uint8, file.name);
          }

          updateStep('store', {
            status: 'complete',
            details: `${receipt.blockCount} blocks stored`,
          });
          setDebugInfo(brightChain.getDebugInfo());

          // Step 6: CBL
          updateStep('cbl', {
            status: 'processing',
            details: 'Creating Constituent Block List',
          });
          await new Promise((r) => setTimeout(r, 250));
          updateStep('cbl', {
            status: 'complete',
            details: `${receipt.cblData.length} bytes`,
          });

          if (enableWhitening) {
            updateStep('magnet', { status: 'processing' });
            await new Promise((r) => setTimeout(r, 200));
            updateStep('magnet', {
              status: 'complete',
              details: 'Ready for sharing',
            });
          }

          setReceipts((prev) => [...prev, receipt]);
          setDebugInfo(brightChain.getDebugInfo());
        } catch (error) {
          console.error('Store failed:', error);
          setProcessSteps((prev) =>
            prev.map((s) =>
              s.status === 'processing'
                ? {
                    ...s,
                    status: 'error',
                    details:
                      error instanceof Error ? error.message : 'Unknown error',
                  }
                : s,
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

  // ---- Retrieval ----
  const handleRetrieve = useCallback(
    async (receipt: FileReceipt) => {
      if (!brightChain) return;
      try {
        const blockIds = receipt.blocks.map((b) => b.id);
        setAnimatingBlockIds(blockIds);
        await new Promise((r) => setTimeout(r, 600));

        const fileData = await brightChain.retrieveFile(receipt);
        const blob = new Blob([new Uint8Array(fileData)]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = receipt.fileName;
        a.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        alert(
          `Retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      } finally {
        setAnimatingBlockIds([]);
      }
    },
    [brightChain],
  );

  const handleDownloadCBL = useCallback((receipt: FileReceipt) => {
    const blob = new Blob([new Uint8Array(receipt.cblData)], {
      type: 'application/octet-stream',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${receipt.fileName}.cbl`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleCblUpload = useCallback(
    async (files: FileList) => {
      if (!brightChain || files.length === 0) return;
      const file = files[0];
      if (!file.name.endsWith('.cbl')) {
        alert('Please upload a .cbl file');
        return;
      }
      try {
        const cblData = new Uint8Array(await file.arrayBuffer());
        const receipt = brightChain.parseCBL(cblData);
        setReceipts((prev) => [...prev, receipt]);
        setShowCblUpload(false);
        alert(`CBL loaded: ${receipt.fileName} (${receipt.blockCount} blocks)`);
      } catch (error) {
        alert(
          `CBL parse failed: ${error instanceof Error ? error.message : 'Unknown'}`,
        );
      }
    },
    [brightChain],
  );

  const handleMagnetUrlSubmit = useCallback(async () => {
    if (!brightChain || !magnetUrlInput.trim()) return;
    try {
      setWhiteningSteps([
        { id: 'parse', name: 'Parsing magnet URL', status: 'complete' },
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
      ]);

      for (const sid of ['retrieve-b1', 'retrieve-b2', 'xor-reconstruct']) {
        updateWhiteningStep(sid, { status: 'processing' });
        await new Promise((r) => setTimeout(r, 300));
        updateWhiteningStep(sid, { status: 'complete' });
      }

      const fileData =
        await brightChain.retrieveFileFromWhitenedCBL(magnetUrlInput);
      updateWhiteningStep('validate', { status: 'processing' });
      await new Promise((r) => setTimeout(r, 200));
      updateWhiteningStep('validate', { status: 'complete' });

      const receipt =
        await brightChain.parseWhitenedCBLForReceipt(magnetUrlInput);
      setReceipts((prev) => [...prev, receipt]);
      setDebugInfo(brightChain.getDebugInfo());

      // Download
      const blob = new Blob([new Uint8Array(fileData)]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = receipt.fileName || 'reconstructed-file';
      a.click();
      URL.revokeObjectURL(url);

      setMagnetUrlInput('');
      setShowMagnetInput(false);
      alert(`File reconstructed (${fileData.length} bytes) and downloaded.`);
      setTimeout(() => setWhiteningSteps([]), 3000);
    } catch (error) {
      alert(
        `Magnet URL failed: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
      setWhiteningSteps((prev) =>
        prev.map((s) =>
          s.status === 'processing'
            ? {
                ...s,
                status: 'error',
                details: error instanceof Error ? error.message : 'Unknown',
              }
            : s,
        ),
      );
    }
  }, [brightChain, magnetUrlInput]);

  // ---- Messaging ----
  const handleSendMessage = useCallback(async () => {
    if (!messageContent.trim() || !messageCBL || !brightChain) return;
    try {
      const eciesService = new ECIESService();

      let senderMember = members.get(senderId);
      if (!senderMember) {
        const { member } = await Member.newMember(
          eciesService,
          MemberType.User,
          senderId,
          new EmailString(`${senderId}@example.com`),
        );
        senderMember = member;
        setMembers((prev) => new Map(prev).set(senderId, member));
        const memberBytes = new TextEncoder().encode(
          JSON.stringify({
            id: member.id.toString(),
            name: member.name,
            publicKey: Array.from(member.publicKey),
          }),
        );
        await brightChain.storeFileWithWhitening(
          memberBytes,
          `member-${senderId}.json`,
        );
      }

      let recipientMember = members.get(recipientId);
      if (!recipientMember) {
        const { member } = await Member.newMember(
          eciesService,
          MemberType.User,
          recipientId,
          new EmailString(`${recipientId}@example.com`),
        );
        recipientMember = member;
        setMembers((prev) => new Map(prev).set(recipientId, member));
        const memberBytes = new TextEncoder().encode(
          JSON.stringify({
            id: member.id.toString(),
            name: member.name,
            publicKey: Array.from(member.publicKey),
          }),
        );
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

      setMessages((prev) => [
        ...prev,
        {
          id: messageId,
          content: messageContent,
          senderId,
          recipients: [recipientId],
          timestamp: new Date(),
        },
      ]);

      const messageReceipt: FileReceipt = {
        id: messageId,
        fileName: `Message: ${messageContent.substring(0, 30)}${messageContent.length > 30 ? '…' : ''}`,
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
    } catch (error) {
      alert(
        `Send failed: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
    }
  }, [messageContent, senderId, recipientId, messageCBL, members, brightChain]);

  const handleRetrieveMessage = useCallback(
    async (messageId: string) => {
      if (!messageCBL) return;
      try {
        const content = await messageCBL.getMessageContent(messageId);
        alert(`Message from soup:\n\n${new TextDecoder().decode(content)}`);
      } catch (error) {
        alert(
          `Retrieve failed: ${error instanceof Error ? error.message : 'Unknown'}`,
        );
      }
    },
    [messageCBL],
  );

  // ---- Drop handler ----
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files) handleFileUpload(e.dataTransfer.files);
    },
    [handleFileUpload],
  );

  // ---- Render ----
  if (!brightChain) {
    return (
      <Container maxWidth="lg" sx={{ py: 6, textAlign: 'center' }}>
        <Typography variant="h5">⚙️ Initializing BrightChain…</Typography>
        <LinearProgress sx={{ mt: 2, maxWidth: 400, mx: 'auto' }} />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          🥫 BrightChain Soup Can Demo
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Store files and messages as blocks in the decentralised block soup.
          Everything becomes colourful soup cans!
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontFamily: 'monospace' }}
        >
          Session: {debugInfo?.sessionId?.substring(0, 24)}… (clears on refresh)
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* ===== LEFT COLUMN: Controls ===== */}
        <Grid size={{ xs: 12, md: 8 }}>
          {/* ---- Store Data Section ---- */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              📦 Store Data in Block Soup
            </Typography>

            {/* File Upload */}
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              📁 Store Files
            </Typography>
            <Box
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              sx={{
                border: '2px dashed',
                borderColor: dragOver ? 'primary.main' : 'divider',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                bgcolor: dragOver ? 'action.hover' : 'transparent',
                transition: 'all 0.2s',
                cursor: 'pointer',
                mb: 2,
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Typography variant="h5" sx={{ mb: 1 }}>
                📁
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Drop files here or click to upload
              </Typography>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) =>
                  e.target.files && handleFileUpload(e.target.files)
                }
                style={{ display: 'none' }}
                disabled={isProcessing}
              />
              <Button
                variant="contained"
                size="small"
                sx={{ mt: 1 }}
                disabled={isProcessing}
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Choose Files
              </Button>
            </Box>

            {/* Whitening toggle */}
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mb: 2 }}
            >
              <Switch
                checked={enableWhitening}
                onChange={(e) => setEnableWhitening(e.target.checked)}
                size="small"
                inputProps={{ 'aria-label': 'Enable CBL whitening' }}
              />
              <Typography variant="body2">
                🔐 Store CBL in soup with magnet URL
              </Typography>
            </Stack>
            {enableWhitening && (
              <Alert severity="info" sx={{ mb: 2 }}>
                The CBL will be stored in the block soup using XOR whitening and
                a shareable magnet URL will be generated.
              </Alert>
            )}

            {/* Whitening result */}
            {whiteningResult && (
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    🔐 CBL Stored in Soup
                  </Typography>
                  <Typography
                    variant="caption"
                    display="block"
                    color="text.secondary"
                  >
                    Component 1: {whiteningResult.blockId1.substring(0, 24)}…
                  </Typography>
                  <Typography
                    variant="caption"
                    display="block"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    Component 2: {whiteningResult.blockId2.substring(0, 24)}…
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                      size="small"
                      value={whiteningResult.magnetUrl}
                      slotProps={{ input: { readOnly: true } }}
                      sx={{
                        flex: 1,
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                      }}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      inputProps={{ 'aria-label': 'Magnet URL' }}
                    />
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        navigator.clipboard
                          .writeText(whiteningResult.magnetUrl)
                          .then(
                            () => alert('Copied!'),
                            () => alert('Copy failed'),
                          );
                      }}
                    >
                      📋 Copy
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Retrieve from Soup */}
            <Typography variant="h6" gutterBottom>
              🔄 Retrieve from Soup
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setShowCblUpload(!showCblUpload)}
              >
                📄 Upload CBL File
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setShowMagnetInput(!showMagnetInput)}
              >
                🧲 Use Magnet URL
              </Button>
            </Stack>

            {showCblUpload && (
              <Card variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  Upload a .cbl file to reconstruct the original file. Blocks
                  must already be in the soup.
                </Typography>
                <input
                  ref={cblInputRef}
                  type="file"
                  accept=".cbl"
                  onChange={(e) =>
                    e.target.files && handleCblUpload(e.target.files)
                  }
                  style={{ display: 'none' }}
                />
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => cblInputRef.current?.click()}
                >
                  📂 Choose CBL File
                </Button>
              </Card>
            )}

            {showMagnetInput && (
              <Card variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  Paste a magnet URL to retrieve the file from its whitened CBL
                  components.
                </Typography>
                <Stack direction="row" spacing={1}>
                  <TextField
                    size="small"
                    value={magnetUrlInput}
                    onChange={(e) => setMagnetUrlInput(e.target.value)}
                    placeholder="magnet:?xt=urn:brightchain:cbl&bs=…"
                    sx={{ flex: 1 }}
                    inputProps={{ 'aria-label': 'Magnet URL input' }}
                  />
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleMagnetUrlSubmit}
                    disabled={!magnetUrlInput.trim()}
                  >
                    Load
                  </Button>
                </Stack>
              </Card>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Message Passing */}
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Typography variant="h6">💬 Message Passing</Typography>
              <Button
                size="small"
                onClick={() => setShowMessagePanel(!showMessagePanel)}
              >
                {showMessagePanel ? '▼ Hide' : '▶ Show'}
              </Button>
            </Stack>

            {showMessagePanel && (
              <Box sx={{ mt: 2 }}>
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      size="small"
                      label="From"
                      value={senderId}
                      onChange={(e) => setSenderId(e.target.value)}
                      sx={{ flex: 1 }}
                      inputProps={{ 'aria-label': 'Sender ID' }}
                    />
                    <TextField
                      size="small"
                      label="To"
                      value={recipientId}
                      onChange={(e) => setRecipientId(e.target.value)}
                      sx={{ flex: 1 }}
                      inputProps={{ 'aria-label': 'Recipient ID' }}
                    />
                  </Stack>
                  <TextField
                    size="small"
                    label="Message"
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="Type your message…"
                    multiline
                    rows={2}
                    inputProps={{ 'aria-label': 'Message content' }}
                  />
                  <Button
                    variant="contained"
                    onClick={handleSendMessage}
                    disabled={!messageContent.trim()}
                  >
                    📤 Send Message to Soup
                  </Button>
                </Stack>

                {messages.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      📬 Messages ({messages.length})
                    </Typography>
                    <Stack spacing={1}>
                      {messages.map((msg) => (
                        <Card key={msg.id} variant="outlined">
                          <CardContent
                            sx={{ py: 1, '&:last-child': { pb: 1 } }}
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {msg.senderId} → {msg.recipients.join(', ')} ·{' '}
                              {msg.timestamp.toLocaleTimeString()}
                            </Typography>
                            <Typography variant="body2" sx={{ my: 0.5 }}>
                              {msg.content}
                            </Typography>
                            <Button
                              size="small"
                              onClick={() => handleRetrieveMessage(msg.id)}
                            >
                              📥 Retrieve from Soup
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  </Box>
                )}
              </Box>
            )}
          </Paper>

          {/* ---- Block Soup Visualization ---- */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 2 }}
            >
              <Typography variant="h6">
                🥫 Block Soup ({debugInfo?.blockCount ?? 0} blocks)
              </Typography>
              {selectedFileId && (
                <Chip
                  label={`Showing: ${receipts.find((r) => r.id === selectedFileId)?.fileName}`}
                  onDelete={() => setSelectedFileId(null)}
                  size="small"
                  color="primary"
                />
              )}
            </Stack>

            {/* File selector chips */}
            {receipts.length > 0 && (
              <Stack
                direction="row"
                spacing={1}
                sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5 }}
              >
                {receipts.map((r) => (
                  <Chip
                    key={r.id}
                    label={`${r.type === 'message' ? '💬' : '📄'} ${r.fileName}`}
                    variant={selectedFileId === r.id ? 'filled' : 'outlined'}
                    color={selectedFileId === r.id ? 'primary' : 'default'}
                    onClick={() =>
                      setSelectedFileId(selectedFileId === r.id ? null : r.id)
                    }
                    size="small"
                  />
                ))}
              </Stack>
            )}

            {/* Soup grid */}
            {debugInfo && debugInfo.blockIds.length > 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1.5,
                  p: 2,
                  border: '2px dashed',
                  borderColor: 'divider',
                  borderRadius: 2,
                  minHeight: 120,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {debugInfo.blockIds.map((blockId, index) => (
                  <SoupCan
                    key={blockId}
                    blockId={blockId}
                    index={index}
                    highlighted={highlightedBlockIds.has(blockId)}
                    animating={animatingBlockIds.includes(blockId)}
                    isMember={memberBlockIdSet.has(blockId)}
                    onClick={() => {
                      const fileBlock = receipts
                        .flatMap((r) => r.blocks)
                        .find((b) => b.id === blockId);
                      if (fileBlock) {
                        setSelectedBlock(fileBlock);
                        setAnimatingBlockIds([blockId]);
                        setTimeout(() => setAnimatingBlockIds([]), 800);
                      }
                    }}
                  />
                ))}
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                <Typography variant="h4">🍲</Typography>
                <Typography variant="body1">Empty Soup</Typography>
                <Typography variant="body2">
                  Upload files to see them transformed into colourful soup cans.
                </Typography>
              </Box>
            )}
          </Paper>

          {/* ---- Stored Files & Messages ---- */}
          {receipts.length > 0 && (
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                ⚡ Stored Files &amp; Messages
              </Typography>
              <Grid container spacing={2}>
                {receipts.map((receipt) => (
                  <Grid key={receipt.id} size={{ xs: 12, sm: 6 }}>
                    <Card variant="outlined">
                      <CardContent>
                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                        >
                          <Typography variant="subtitle2">
                            {receipt.type === 'message' ? '💬' : '📄'}{' '}
                            {receipt.fileName}
                          </Typography>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => {
                              setReceipts((prev) =>
                                prev.filter((r) => r.id !== receipt.id),
                              );
                              if (selectedFileId === receipt.id)
                                setSelectedFileId(null);
                            }}
                          >
                            ✕
                          </Button>
                        </Stack>
                        {receipt.type === 'message' &&
                          receipt.messageMetadata && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                            >
                              {receipt.messageMetadata.senderId} →{' '}
                              {receipt.messageMetadata.recipients.join(', ')}
                            </Typography>
                          )}
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                          sx={{ mb: 1 }}
                        >
                          {receipt.blockCount} blocks · {receipt.originalSize}{' '}
                          bytes
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={1}
                          flexWrap="wrap"
                          useFlexGap
                        >
                          {receipt.type === 'message' ? (
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => handleRetrieveMessage(receipt.id)}
                            >
                              📥 Retrieve
                            </Button>
                          ) : (
                            <>
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => handleRetrieve(receipt)}
                                disabled={isProcessing}
                              >
                                📥 Retrieve
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => handleDownloadCBL(receipt)}
                              >
                                📄 CBL
                              </Button>
                            </>
                          )}
                        </Stack>
                        {/* Magnet URL for whitened receipts */}
                        {(receipt as FileReceiptWithWhitening).whitening && (
                          <Box sx={{ mt: 1 }}>
                            <TextField
                              size="small"
                              fullWidth
                              value={
                                (receipt as FileReceiptWithWhitening).whitening
                                  ?.magnetUrl ?? ''
                              }
                              slotProps={{ input: { readOnly: true } }}
                              onClick={(e) =>
                                (e.target as HTMLInputElement).select()
                              }
                              label="🧲 Magnet URL"
                              inputProps={{
                                'aria-label': 'Magnet URL for this file',
                              }}
                            />
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}
        </Grid>

        {/* ===== RIGHT COLUMN: Sidebar ===== */}
        <Grid size={{ xs: 12, md: 4 }}>
          {/* Process Steps */}
          {processSteps.length > 0 && (
            <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                🔄 Processing Steps
              </Typography>
              <Stack spacing={0.5}>
                {processSteps.map((step) => (
                  <StepIndicator key={step.id} step={step} />
                ))}
              </Stack>
            </Paper>
          )}

          {/* Whitening Steps */}
          {whiteningSteps.length > 0 && (
            <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                🔐 CBL Storage Steps
              </Typography>
              <Stack spacing={0.5}>
                {whiteningSteps.map((step) => (
                  <StepIndicator key={step.id} step={step} />
                ))}
              </Stack>
            </Paper>
          )}

          {/* Selected Block Info */}
          {selectedBlock && (
            <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                🥫 Block Details
              </Typography>
              <Typography variant="body2">
                Index: #{selectedBlock.index}
              </Typography>
              <Typography variant="body2">
                Size: {selectedBlock.size} bytes
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontFamily: 'monospace',
                  wordBreak: 'break-all',
                  display: 'block',
                  mt: 0.5,
                }}
              >
                ID: {selectedBlock.id}
              </Typography>
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: 1,
                  mt: 1,
                  bgcolor: `hsl(${(selectedBlock.index * 137.5) % 360}, 70%, 60%)`,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              />
            </Paper>
          )}

          {/* Stats */}
          <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              📊 Soup Stats
            </Typography>
            <Stack spacing={0.5}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Total Files:
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {receipts.length}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Total Blocks:
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {debugInfo?.blockCount ?? 0}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Block Size:
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {BlockSize.Small} bytes
                </Typography>
              </Stack>
            </Stack>
          </Paper>

          {/* Debug Panel */}
          {debugInfo && (
            <Paper
              elevation={0}
              sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}
            >
              <Typography variant="subtitle2" gutterBottom>
                🔧 Session Debug
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontFamily: 'monospace',
                  wordBreak: 'break-all',
                  display: 'block',
                  mb: 1,
                }}
              >
                {debugInfo.sessionId}
              </Typography>
              <Typography variant="caption" display="block">
                Blocks in memory: {debugInfo.blockCount}
              </Typography>
              <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                Block size: {debugInfo.blockSize} bytes
              </Typography>
              {debugInfo.blockIds.length > 0 && (
                <Box sx={{ maxHeight: 100, overflow: 'auto', mt: 1 }}>
                  {debugInfo.blockIds.map((id, i) => (
                    <Typography
                      key={i}
                      variant="caption"
                      sx={{
                        fontFamily: 'monospace',
                        display: 'block',
                        fontSize: '0.65rem',
                      }}
                    >
                      {id.substring(0, 32)}…
                    </Typography>
                  ))}
                </Box>
              )}
              <Button
                size="small"
                color="error"
                sx={{ mt: 1 }}
                onClick={() => {
                  brightChain.clearSession();
                  setReceipts([]);
                  setMessages([]);
                  setDebugInfo(brightChain.getDebugInfo());
                }}
              >
                Clear Session
              </Button>
            </Paper>
          )}
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      {/* How It Works */}
      <Paper
        elevation={0}
        sx={{ p: 3, bgcolor: 'action.hover', borderRadius: 2 }}
      >
        <Typography variant="h6" gutterBottom>
          How BrightChain Soup Works
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>1. Chunking &amp; Padding:</strong> Your file is broken into
          fixed-size blocks ({BlockSize.Small} bytes). Each block is padded with
          random data to fill the block size, making all blocks uniform.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>2. Checksumming:</strong> Each block gets a SHA-512 checksum
          that serves as its unique ID in the soup. The checksum reveals nothing
          about the content.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>3. CBL (Constituent Block List):</strong> A metadata record
          listing all block IDs needed to reconstruct the file. You can download
          the CBL or store it in the soup with whitening.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>4. XOR Whitening:</strong> The CBL is XORed with a random
          block (W) to produce CBL*. Both W and CBL* are stored in the soup. A
          magnet URL references both blocks. To reconstruct: W ⊕ CBL* = CBL.
        </Typography>
        <Typography variant="body2">
          <strong>5. Owner-Free Storage:</strong> Every block in the soup looks
          random. Without the CBL (or magnet URL), the data is indistinguishable
          from noise. No single block reveals its origin or content.
        </Typography>
      </Paper>
    </Container>
  );
};
