import type {
  IAuthorizedSigner,
  IBrightTrustPolicy,
  IGovernanceAction,
  ILedgerEntry,
  ILedgerSigner,
  ILedgerValidationResult,
} from '@brightchain/brightchain-lib';
import {
  BlockSize,
  BrowserSignatureVerifier,
  ChecksumService,
  GovernanceActionType,
  GovernancePayloadSerializer,
  Ledger,
  LedgerChainValidator,
  LedgerEntrySerializer,
  MemoryBlockStore,
  QuorumType,
  SignerRole,
  SignerStatus,
} from '@brightchain/brightchain-lib';
import {
  ECIESService,
  EmailString,
  Member,
  MemberType,
  type SignatureUint8Array,
} from '@digitaldefiance/ecies-lib';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useShowcaseI18n } from '../i18n/ShowcaseI18nContext';
import { ShowcaseStrings } from '../i18n/showcaseStrings';
import './LedgerDemo.css';

// ── Helpers ──────────────────────────────────────────────────────────

/** Create a real SECP256k1 signer from a Member instance. */
function memberToSigner(
  member: Member<Uint8Array>,
  name: string,
  id: number,
): DemoSigner {
  return {
    name,
    seed: id,
    publicKey: member.publicKey,
    sign: (data: Uint8Array) => member.sign(data) as SignatureUint8Array,
    member,
  };
}

/** Create a new real signer asynchronously. */
async function createRealSigner(
  eciesService: ECIESService<Uint8Array>,
  name: string,
  id: number,
): Promise<DemoSigner> {
  const { member } = Member.newMember(
    eciesService,
    MemberType.User,
    name,
    new EmailString(
      `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@demo.brightchain.org`,
    ),
  );
  return memberToSigner(member, name, id);
}

function hexShort(
  data: Uint8Array | { toHex?: () => string },
  len = 8,
): string {
  if (data && typeof (data as { toHex?: () => string }).toHex === 'function') {
    return (data as { toHex: () => string }).toHex().substring(0, len) + '…';
  }
  return (
    Array.from(data as Uint8Array, (b) => b.toString(16).padStart(2, '0'))
      .join('')
      .substring(0, len) + '…'
  );
}

function signerName(signers: DemoSigner[], publicKey: Uint8Array): string {
  const match = signers.find(
    (s) =>
      s.publicKey.length === publicKey.length &&
      s.publicKey.every((b, i) => b === publicKey[i]),
  );
  return match?.name ?? hexShort(publicKey, 6);
}

interface DemoSigner extends ILedgerSigner {
  name: string;
  seed: number;
  member: Member<Uint8Array>;
}

interface LogEntry {
  id: number;
  time: string;
  message: string;
  type: 'append' | 'governance' | 'error' | 'info';
}

interface DisplayEntry {
  entry: ILedgerEntry;
  type: 'genesis' | 'governance' | 'data';
  payloadPreview: string;
  isNew: boolean;
}

// ── Component ────────────────────────────────────────────────────────

export const LedgerDemo: React.FC = () => {
  const { t } = useShowcaseI18n();
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [govSerializer] = useState(() => new GovernancePayloadSerializer());
  const [serializer] = useState(
    () => new LedgerEntrySerializer(new ChecksumService()),
  );
  const [, setStore] = useState<MemoryBlockStore | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Signers
  const [signers, setSigners] = useState<DemoSigner[]>([]);
  const [activeSigner, setActiveSigner] = useState<DemoSigner | null>(null);
  const [authorizedSigners, setAuthorizedSigners] = useState<
    IAuthorizedSigner[]
  >([]);
  const [brightTrustPolicy, setBrightTrustPolicy] = useState<
    IBrightTrustPolicy | undefined
  >();

  // Chain display
  const [entries, setEntries] = useState<DisplayEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<DisplayEntry | null>(null);
  const [chainLength, setChainLength] = useState(0);

  // Controls
  const [payloadText, setPayloadText] = useState('');
  const [newSignerName, setNewSignerName] = useState('');
  const [newSignerRole, setNewSignerRole] = useState<SignerRole>(
    SignerRole.Writer,
  );

  // Validation
  const [validationResult, setValidationResult] =
    useState<ILedgerValidationResult | null>(null);

  // Log
  const [log, setLog] = useState<LogEntry[]>([]);
  const logIdRef = useRef(0);
  const chainEndRef = useRef<HTMLDivElement>(null);
  const eciesServiceRef = useRef<ECIESService<Uint8Array> | null>(null);
  const nextSignerIdRef = useRef(3); // 1=Alice, 2=Bob, next starts at 3

  const addLog = useCallback(
    (message: string, type: LogEntry['type'] = 'info') => {
      const id = ++logIdRef.current;
      const time = new Date().toLocaleTimeString('en-US', { hour12: false });
      setLog((prev) => [{ id, time, message, type }, ...prev].slice(0, 50));
    },
    [],
  );

  // ── Refresh display state ──────────────────────────────────────────

  const refreshState = useCallback(
    async (l: Ledger, _allSigners: DemoSigner[]) => {
      const len = l.length;
      setChainLength(len);
      setAuthorizedSigners(l.getAuthorizedSigners());
      setBrightTrustPolicy(l.brightTrustPolicy);

      const displayEntries: DisplayEntry[] = [];
      for (let i = 0; i < len; i++) {
        const entry = await l.getEntry(i);
        let type: DisplayEntry['type'] = 'data';
        let payloadPreview = '';

        if (i === 0) {
          type = 'genesis';
          payloadPreview = 'Genesis: initial signer set';
        } else if (
          GovernancePayloadSerializer.isGovernancePayload(entry.payload)
        ) {
          type = 'governance';
          try {
            const parsed = govSerializer.deserialize(entry.payload);
            const actionNames = parsed.actions.map((a) => a.type).join(', ');
            payloadPreview = `Gov: ${actionNames}`;
          } catch {
            payloadPreview = 'Governance entry';
          }
        } else {
          try {
            const textBytes =
              entry.payload[0] === 0x00
                ? entry.payload.slice(1)
                : entry.payload;
            payloadPreview = new TextDecoder()
              .decode(textBytes)
              .substring(0, 40);
          } catch {
            payloadPreview = `${entry.payload.length} bytes`;
          }
        }

        displayEntries.push({
          entry,
          type,
          payloadPreview,
          isNew: i === len - 1 && len > 1,
        });
      }
      setEntries(displayEntries);

      setTimeout(
        () =>
          chainEndRef.current?.scrollIntoView({
            behavior: 'smooth',
            inline: 'end',
          }),
        100,
      );
    },
    [govSerializer],
  );

  // ── Initialize ledger ──────────────────────────────────────────────

  const initLedger = useCallback(async () => {
    const blockStore = new MemoryBlockStore(BlockSize.Small);
    setStore(blockStore);

    const eciesService = new ECIESService<Uint8Array>();
    const admin1 = await createRealSigner(eciesService, 'Alice (Admin)', 1);
    const writer1 = await createRealSigner(eciesService, 'Bob (Writer)', 2);
    const allSigners: DemoSigner[] = [admin1, writer1];
    setSigners(allSigners);
    setActiveSigner(admin1);
    // Store eciesService for later use when adding new signers
    eciesServiceRef.current = eciesService;

    const newLedger = new Ledger(
      blockStore,
      BlockSize.Small,
      serializer,
      'demo-ledger',
      govSerializer,
    );

    const genesisPayload = govSerializer.serializeGenesis({
      brightTrustPolicy: { type: QuorumType.Threshold, threshold: 1 },
      signers: [
        {
          publicKey: admin1.publicKey,
          role: SignerRole.Admin,
          status: SignerStatus.Active,
          metadata: new Map([['org', 'BrightChain']]),
        },
        {
          publicKey: writer1.publicKey,
          role: SignerRole.Writer,
          status: SignerStatus.Active,
          metadata: new Map([['org', 'BrightChain']]),
        },
      ],
    });

    await newLedger.append(genesisPayload, admin1);
    setLedger(newLedger);

    addLog('Ledger initialized with genesis block', 'info');
    addLog(`Admin: ${admin1.name}`, 'info');
    addLog(`Writer: ${writer1.name}`, 'info');

    await refreshState(newLedger, allSigners);
    setIsInitializing(false);
  }, [serializer, govSerializer, addLog, refreshState]);

  useEffect(() => {
    initLedger();
  }, [initLedger]);

  // ── Append data entry ──────────────────────────────────────────────

  const handleAppendData = useCallback(async () => {
    if (!ledger || !activeSigner || !payloadText.trim()) return;
    try {
      const textBytes = new TextEncoder().encode(payloadText);
      const payload = new Uint8Array(1 + textBytes.length);
      payload[0] = 0x00;
      payload.set(textBytes, 1);

      await ledger.append(payload, activeSigner);
      addLog(
        `Entry appended by ${activeSigner.name}: "${payloadText.substring(0, 30)}"`,
        'append',
      );
      setPayloadText('');
      await refreshState(ledger, signers);
    } catch (err) {
      addLog(
        `Append failed: ${err instanceof Error ? err.message : 'Unknown'}`,
        'error',
      );
    }
  }, [ledger, activeSigner, payloadText, signers, addLog, refreshState]);

  // ── Governance actions ─────────────────────────────────────────────

  const handleGovernanceAction = useCallback(
    async (actions: IGovernanceAction[], description: string) => {
      if (!ledger || !activeSigner) return;
      try {
        await ledger.appendGovernance(actions, activeSigner);
        addLog(`Governance: ${description}`, 'governance');
        await refreshState(ledger, signers);
      } catch (err) {
        addLog(
          `Governance failed: ${err instanceof Error ? err.message : 'Unknown'}`,
          'error',
        );
      }
    },
    [ledger, activeSigner, signers, addLog, refreshState],
  );

  const handleAddSigner = useCallback(async () => {
    if (!newSignerName.trim() || !eciesServiceRef.current) return;
    const id = nextSignerIdRef.current++;
    const newSigner = await createRealSigner(
      eciesServiceRef.current,
      newSignerName,
      id,
    );
    const updatedSigners = [...signers, newSigner];
    setSigners(updatedSigners);

    await handleGovernanceAction(
      [
        {
          type: GovernanceActionType.AddSigner,
          publicKey: newSigner.publicKey,
          role: newSignerRole,
        },
      ],
      `Added ${newSignerName} as ${newSignerRole}`,
    );
    setNewSignerName('');
  }, [newSignerName, newSignerRole, signers, handleGovernanceAction]);

  const handleSuspendSigner = useCallback(
    async (signer: IAuthorizedSigner) => {
      await handleGovernanceAction(
        [
          {
            type: GovernanceActionType.SuspendSigner,
            publicKey: signer.publicKey,
          },
        ],
        `Suspended ${signerName(signers, signer.publicKey)}`,
      );
    },
    [signers, handleGovernanceAction],
  );

  const handleReactivateSigner = useCallback(
    async (signer: IAuthorizedSigner) => {
      await handleGovernanceAction(
        [
          {
            type: GovernanceActionType.ReactivateSigner,
            publicKey: signer.publicKey,
          },
        ],
        `Reactivated ${signerName(signers, signer.publicKey)}`,
      );
    },
    [signers, handleGovernanceAction],
  );

  const handleRemoveSigner = useCallback(
    async (signer: IAuthorizedSigner) => {
      await handleGovernanceAction(
        [
          {
            type: GovernanceActionType.RemoveSigner,
            publicKey: signer.publicKey,
          },
        ],
        `Retired ${signerName(signers, signer.publicKey)}`,
      );
    },
    [signers, handleGovernanceAction],
  );

  const handleChangeRole = useCallback(
    async (signer: IAuthorizedSigner, newRole: SignerRole) => {
      await handleGovernanceAction(
        [
          {
            type: GovernanceActionType.ChangeRole,
            publicKey: signer.publicKey,
            newRole,
          },
        ],
        `Changed ${signerName(signers, signer.publicKey)} to ${newRole}`,
      );
    },
    [signers, handleGovernanceAction],
  );

  // ── Validate chain ─────────────────────────────────────────────────

  const handleValidate = useCallback(async () => {
    if (!ledger) return;
    try {
      const allEntries: ILedgerEntry[] = [];
      for (let i = 0; i < ledger.length; i++) {
        allEntries.push(await ledger.getEntry(i));
      }

      // Use BrowserSignatureVerifier — lightweight verifier that calls
      // @noble/curves directly without needing an ECIESService instance.
      const verifier = new BrowserSignatureVerifier();
      const validator = new LedgerChainValidator(
        serializer,
        verifier,
        govSerializer,
      );
      const result = validator.validateAll(allEntries);
      setValidationResult(result);
      addLog(
        result.isValid
          ? `Chain valid! ${result.entriesChecked} entries verified ✓`
          : `Chain INVALID: ${result.errors.length} error(s)`,
        result.isValid ? 'info' : 'error',
      );
    } catch (err) {
      addLog(
        `Validation error: ${err instanceof Error ? err.message : 'Unknown'}`,
        'error',
      );
    }
  }, [ledger, serializer, govSerializer, addLog]);

  // ── Reset ──────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setLedger(null);
    setEntries([]);
    setSelectedEntry(null);
    setLog([]);
    setValidationResult(null);
    setChainLength(0);
    setIsInitializing(true);
    nextSignerIdRef.current = 3;
    eciesServiceRef.current = null;
    initLedger();
  }, [initLedger]);

  // ── Render ─────────────────────────────────────────────────────────

  const activeAdminCount = authorizedSigners.filter(
    (s) => s.role === SignerRole.Admin && s.status === SignerStatus.Active,
  ).length;

  return (
    <div className="ledger-demo">
      <div className="demo-header">
        <h1 className="demo-title">{t(ShowcaseStrings.Ledger_Title)}</h1>
        <p className="demo-subtitle">{t(ShowcaseStrings.Ledger_Subtitle)}</p>
      </div>

      {isInitializing && (
        <div className="ledger-initializing">
          <div className="initializing-spinner" />
          <p>{t(ShowcaseStrings.Ledger_Initializing)}</p>
        </div>
      )}

      {!isInitializing && (
        <>
          {/* Stats Bar */}
          <div className="stats-bar">
            <div className="stat-item">
              <span className="stat-value">{chainLength}</span>
              <span className="stat-label">
                {t(ShowcaseStrings.Ledger_Entries)}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-value">
                {
                  authorizedSigners.filter(
                    (s) => s.status === SignerStatus.Active,
                  ).length
                }
              </span>
              <span className="stat-label">
                {t(ShowcaseStrings.Ledger_ActiveSigners)}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{activeAdminCount}</span>
              <span className="stat-label">
                {t(ShowcaseStrings.Ledger_Admins)}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-value">
                {brightTrustPolicy?.type ?? '—'}
              </span>
              <span className="stat-label">
                {t(ShowcaseStrings.Ledger_BrightTrust)}
              </span>
            </div>
            <div
              style={{
                marginLeft: 'auto',
                display: 'flex',
                gap: '0.5rem',
              }}
            >
              <button className="secondary-btn" onClick={handleValidate}>
                {t(ShowcaseStrings.Ledger_ValidateChain)}
              </button>
              <button className="secondary-btn" onClick={handleReset}>
                {t(ShowcaseStrings.Ledger_Reset)}
              </button>
            </div>
          </div>

          {validationResult && (
            <div
              className={`validation-result ${validationResult.isValid ? 'valid' : 'invalid'}`}
            >
              {validationResult.isValid
                ? `✅ Chain integrity verified — ${validationResult.entriesChecked} entries, all hashes and signatures valid`
                : `❌ Chain invalid — ${validationResult.errors.map((e) => `#${e.sequenceNumber}: ${e.errorType}`).join(', ')}`}
            </div>
          )}

          <div className="ledger-layout">
            {/* Left Sidebar */}
            <div>
              {/* Active Signer Selector */}
              <div className="ledger-panel">
                <h3>{t(ShowcaseStrings.Ledger_ActiveSigner)}</h3>
                <select
                  className="control-select"
                  value={activeSigner?.seed ?? ''}
                  onChange={(e) => {
                    const s = signers.find(
                      (s) => s.seed === Number(e.target.value),
                    );
                    if (s) setActiveSigner(s);
                  }}
                >
                  {signers.map((s) => (
                    <option key={s.seed} value={s.seed}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Append Data */}
              <div className="ledger-panel">
                <h3>{t(ShowcaseStrings.Ledger_AppendEntry)}</h3>
                <div className="ledger-controls">
                  <div className="control-group">
                    <label>{t(ShowcaseStrings.Ledger_PayloadLabel)}</label>
                    <input
                      className="control-input"
                      type="text"
                      placeholder={t(ShowcaseStrings.Ledger_PayloadPlaceholder)}
                      value={payloadText}
                      onChange={(e) => setPayloadText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAppendData()}
                    />
                  </div>
                  <button
                    className="primary-btn"
                    onClick={handleAppendData}
                    disabled={!payloadText.trim()}
                  >
                    {t(ShowcaseStrings.Ledger_AppendBtn)}
                  </button>
                </div>
              </div>

              {/* Signer Management */}
              <div className="ledger-panel">
                <h3>{t(ShowcaseStrings.Ledger_AuthorizedSigners)}</h3>
                {brightTrustPolicy && (
                  <div className="brightTrust-info">
                    BrightTrust: {brightTrustPolicy.type}
                    {brightTrustPolicy.threshold
                      ? ` (${brightTrustPolicy.threshold})`
                      : ''}
                    {' · '}
                    {activeAdminCount} active admin
                    {activeAdminCount !== 1 ? 's' : ''}
                  </div>
                )}
                {authorizedSigners.map((as, i) => (
                  <div
                    key={i}
                    className={`signer-card ${as.role} ${as.status}`}
                  >
                    <div className="signer-name">
                      {signerName(signers, as.publicKey)}
                    </div>
                    <div className="signer-meta">
                      <span className={`signer-badge role-${as.role}`}>
                        {as.role}
                      </span>
                      <span className={`signer-badge status-${as.status}`}>
                        {as.status}
                      </span>
                    </div>
                    {as.status !== SignerStatus.Retired && activeSigner && (
                      <div className="signer-actions">
                        {as.status === SignerStatus.Active &&
                          as.role !== SignerRole.Admin && (
                            <button
                              className="action-btn danger"
                              onClick={() => handleSuspendSigner(as)}
                            >
                              {t(ShowcaseStrings.Ledger_Suspend)}
                            </button>
                          )}
                        {as.status === SignerStatus.Active &&
                          as.role === SignerRole.Admin &&
                          activeAdminCount > 1 && (
                            <button
                              className="action-btn danger"
                              onClick={() => handleSuspendSigner(as)}
                            >
                              {t(ShowcaseStrings.Ledger_Suspend)}
                            </button>
                          )}
                        {as.status === SignerStatus.Suspended && (
                          <button
                            className="action-btn"
                            onClick={() => handleReactivateSigner(as)}
                          >
                            {t(ShowcaseStrings.Ledger_Reactivate)}
                          </button>
                        )}
                        {as.role === SignerRole.Writer &&
                          as.status === SignerStatus.Active && (
                            <button
                              className="action-btn"
                              onClick={() =>
                                handleChangeRole(as, SignerRole.Admin)
                              }
                            >
                              {t(ShowcaseStrings.Ledger_ToAdmin)}
                            </button>
                          )}
                        {as.role === SignerRole.Admin &&
                          activeAdminCount > 1 &&
                          as.status === SignerStatus.Active && (
                            <button
                              className="action-btn"
                              onClick={() =>
                                handleChangeRole(as, SignerRole.Writer)
                              }
                            >
                              {t(ShowcaseStrings.Ledger_ToWriter)}
                            </button>
                          )}
                        {(as.status !== SignerStatus.Active ||
                          as.role !== SignerRole.Admin ||
                          activeAdminCount > 1) && (
                          <button
                            className="action-btn danger"
                            onClick={() => handleRemoveSigner(as)}
                          >
                            {t(ShowcaseStrings.Ledger_Retire)}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Add Signer */}
                <div className="add-signer-form">
                  <div className="add-signer-row">
                    <input
                      className="control-input"
                      type="text"
                      placeholder={t(
                        ShowcaseStrings.Ledger_NewSignerPlaceholder,
                      )}
                      value={newSignerName}
                      onChange={(e) => setNewSignerName(e.target.value)}
                    />
                    <select
                      className="control-select"
                      style={{ width: 'auto' }}
                      value={newSignerRole}
                      onChange={(e) =>
                        setNewSignerRole(e.target.value as SignerRole)
                      }
                    >
                      <option value={SignerRole.Admin}>Admin</option>
                      <option value={SignerRole.Writer}>Writer</option>
                      <option value={SignerRole.Reader}>Reader</option>
                    </select>
                  </div>
                  <button
                    className="secondary-btn"
                    onClick={handleAddSigner}
                    disabled={!newSignerName.trim()}
                  >
                    {t(ShowcaseStrings.Ledger_AddSigner)}
                  </button>
                </div>
              </div>

              {/* Event Log */}
              <div className="ledger-panel">
                <h3>{t(ShowcaseStrings.Ledger_EventLog)}</h3>
                <div className="event-log">
                  {log.map((entry) => (
                    <div
                      key={entry.id}
                      className={`event-log-entry ${entry.type}`}
                    >
                      <span className="timestamp">{entry.time}</span>
                      {entry.message}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Area — Chain Visualization */}
            <div>
              <div className="ledger-panel">
                <h3>{t(ShowcaseStrings.Ledger_Chain)}</h3>
                <div className="chain-container">
                  <div className="chain-entries">
                    {entries.map((de, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && (
                          <div className="chain-link">
                            <div className="chain-link-line" />
                          </div>
                        )}
                        <div
                          className={`entry-block ${de.type} ${de.isNew ? 'animate-in' : ''} ${selectedEntry === de ? 'selected' : ''}`}
                          onClick={() => setSelectedEntry(de)}
                        >
                          <div className="entry-seq">
                            #{de.entry.sequenceNumber}
                          </div>
                          <span className={`entry-type-badge ${de.type}`}>
                            {de.type === 'genesis'
                              ? t(ShowcaseStrings.Ledger_Genesis)
                              : de.type === 'governance'
                                ? t(ShowcaseStrings.Ledger_Governance)
                                : t(ShowcaseStrings.Ledger_Data)}
                          </span>
                          <div className="entry-hash">
                            {hexShort(de.entry.entryHash, 12)}
                          </div>
                          <div className="entry-signer">
                            🔑 {signerName(signers, de.entry.signerPublicKey)}
                          </div>
                          <div className="entry-payload-preview">
                            {de.payloadPreview}
                          </div>
                        </div>
                      </React.Fragment>
                    ))}
                    <div ref={chainEndRef} />
                  </div>
                </div>
              </div>

              {/* Entry Detail */}
              {selectedEntry && (
                <div className="entry-detail">
                  <h4>Entry #{selectedEntry.entry.sequenceNumber} Details</h4>
                  <div className="detail-row">
                    <span className="detail-label">
                      {t(ShowcaseStrings.Ledger_Type)}
                    </span>
                    <span className="detail-value">{selectedEntry.type}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">
                      {t(ShowcaseStrings.Ledger_Sequence)}
                    </span>
                    <span className="detail-value">
                      {selectedEntry.entry.sequenceNumber}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">
                      {t(ShowcaseStrings.Ledger_Timestamp)}
                    </span>
                    <span className="detail-value">
                      {selectedEntry.entry.timestamp.toISOString()}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">
                      {t(ShowcaseStrings.Ledger_EntryHash)}
                    </span>
                    <span className="detail-value">
                      {hexShort(selectedEntry.entry.entryHash, 24)}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">
                      {t(ShowcaseStrings.Ledger_PreviousHash)}
                    </span>
                    <span className="detail-value">
                      {selectedEntry.entry.previousEntryHash
                        ? hexShort(selectedEntry.entry.previousEntryHash, 24)
                        : t(ShowcaseStrings.Ledger_NullGenesis)}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">
                      {t(ShowcaseStrings.Ledger_Signer)}
                    </span>
                    <span className="detail-value">
                      {signerName(signers, selectedEntry.entry.signerPublicKey)}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">
                      {t(ShowcaseStrings.Ledger_SignerKey)}
                    </span>
                    <span className="detail-value">
                      {hexShort(selectedEntry.entry.signerPublicKey, 16)}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">
                      {t(ShowcaseStrings.Ledger_Signature)}
                    </span>
                    <span className="detail-value">
                      {hexShort(selectedEntry.entry.signature, 16)}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">
                      {t(ShowcaseStrings.Ledger_PayloadSize)}
                    </span>
                    <span className="detail-value">
                      {t(ShowcaseStrings.Ledger_BytesTemplate).replace(
                        '{0}',
                        String(selectedEntry.entry.payload.length),
                      )}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">
                      {t(ShowcaseStrings.Ledger_Payload)}
                    </span>
                    <span className="detail-value">
                      {selectedEntry.payloadPreview}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
