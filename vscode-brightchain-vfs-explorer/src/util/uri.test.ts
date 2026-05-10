import * as vscode from 'vscode';
import {
  parseBrightchainUri,
  toFileUri,
  toFolderUri,
  type IParsedBrightchainUri,
} from './uri';

describe('URI parse/build utilities', () => {
  describe('toFileUri', () => {
    it('produces a brightchain://files/{id}/{name} URI', () => {
      const uri = toFileUri('abc-123', 'report.pdf');
      expect(uri.scheme).toBe('brightchain');
      expect(uri.authority).toBe('files');
      expect(uri.path).toContain('abc-123');
      expect(uri.path).toContain('report.pdf');
    });

    it('URI-encodes special characters in file names', () => {
      const uri = toFileUri('id-1', 'my file (1).txt');
      expect(uri.toString()).toContain('my%20file%20(1).txt');
    });
  });

  describe('toFolderUri', () => {
    it('produces a brightchain://folders/{id}/ URI', () => {
      const uri = toFolderUri('folder-456');
      expect(uri.scheme).toBe('brightchain');
      expect(uri.authority).toBe('folders');
      expect(uri.path).toContain('folder-456');
    });

    it('ends with a trailing slash', () => {
      const uri = toFolderUri('folder-456');
      expect(uri.path.endsWith('/')).toBe(true);
    });

    it('handles root folder', () => {
      const uri = toFolderUri('root');
      expect(uri.authority).toBe('folders');
      expect(uri.path).toContain('root');
    });
  });

  describe('parseBrightchainUri', () => {
    it('parses a file URI', () => {
      const uri = vscode.Uri.parse('brightchain://files/abc-123/report.pdf');
      const parsed = parseBrightchainUri(uri);
      expect(parsed).toEqual<IParsedBrightchainUri>({
        type: 'file',
        id: 'abc-123',
        name: 'report.pdf',
      });
    });

    it('parses a folder URI', () => {
      const uri = vscode.Uri.parse('brightchain://folders/folder-456/');
      const parsed = parseBrightchainUri(uri);
      expect(parsed).toEqual<IParsedBrightchainUri>({
        type: 'folder',
        id: 'folder-456',
        name: undefined,
      });
    });

    it('parses the root folder URI', () => {
      const uri = vscode.Uri.parse('brightchain://folders/root/');
      const parsed = parseBrightchainUri(uri);
      expect(parsed).toEqual<IParsedBrightchainUri>({
        type: 'folder',
        id: 'root',
        name: undefined,
      });
    });

    it('decodes URI-encoded file names', () => {
      const uri = vscode.Uri.parse(
        'brightchain://files/id-1/my%20file%20(1).txt',
      );
      const parsed = parseBrightchainUri(uri);
      expect(parsed.name).toBe('my file (1).txt');
    });

    it('throws on a URI with no path segments', () => {
      const uri = vscode.Uri.parse('brightchain://files');
      expect(() => parseBrightchainUri(uri)).toThrow(/missing id segment/);
    });
  });

  describe('round-trip', () => {
    it('file URI round-trips correctly', () => {
      const fileId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const fileName = 'report.pdf';
      const uri = toFileUri(fileId, fileName);
      const parsed = parseBrightchainUri(uri);
      expect(parsed.type).toBe('file');
      expect(parsed.id).toBe(fileId);
      expect(parsed.name).toBe(fileName);
    });

    it('file URI round-trips with special characters', () => {
      const fileId = 'id-special';
      const fileName = 'my doc (final) [v2].txt';
      const uri = toFileUri(fileId, fileName);
      const parsed = parseBrightchainUri(uri);
      expect(parsed.name).toBe(fileName);
    });

    it('folder URI round-trips correctly', () => {
      const folderId = 'f9e8d7c6-b5a4-3210-fedc-ba0987654321';
      const uri = toFolderUri(folderId);
      const parsed = parseBrightchainUri(uri);
      expect(parsed.type).toBe('folder');
      expect(parsed.id).toBe(folderId);
      expect(parsed.name).toBeUndefined();
    });
  });
});
