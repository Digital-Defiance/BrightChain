import { TreeItemCollapsibleState } from 'vscode';
import { BrightchainTreeItem } from './tree-item';

describe('BrightchainTreeItem', () => {
  describe('file items', () => {
    const item = new BrightchainTreeItem(
      'file',
      'abc-123',
      'report.pdf',
      'application/pdf',
      'parent-1',
    );

    it('sets collapsibleState to None', () => {
      expect(item.collapsibleState).toBe(TreeItemCollapsibleState.None);
    });

    it('sets contextValue to brightchain-file', () => {
      expect(item.contextValue).toBe('brightchain-file');
    });

    it('sets command to vscode.open with brightchain:// URI', () => {
      expect(item.command).toBeDefined();
      expect(item.command!.command).toBe('vscode.open');
      expect(item.command!.title).toBe('Open File');
      const uri = item.command!.arguments![0];
      expect(uri.scheme).toBe('brightchain');
      expect(uri.authority).toBe('files');
      expect(uri.path).toContain('abc-123');
      expect(uri.path).toContain('report.pdf');
    });

    it('preserves constructor properties', () => {
      expect(item.itemType).toBe('file');
      expect(item.itemId).toBe('abc-123');
      expect(item.label).toBe('report.pdf');
      expect(item.mimeType).toBe('application/pdf');
      expect(item.parentFolderId).toBe('parent-1');
    });
  });

  describe('folder items', () => {
    const item = new BrightchainTreeItem('folder', 'folder-456', 'Documents');

    it('sets collapsibleState to Collapsed', () => {
      expect(item.collapsibleState).toBe(TreeItemCollapsibleState.Collapsed);
    });

    it('sets contextValue to brightchain-folder', () => {
      expect(item.contextValue).toBe('brightchain-folder');
    });

    it('does not set a command', () => {
      expect(item.command).toBeUndefined();
    });

    it('preserves constructor properties', () => {
      expect(item.itemType).toBe('folder');
      expect(item.itemId).toBe('folder-456');
      expect(item.label).toBe('Documents');
      expect(item.mimeType).toBeUndefined();
      expect(item.parentFolderId).toBeUndefined();
    });
  });

  describe('file with special characters in name', () => {
    const item = new BrightchainTreeItem('file', 'id-789', 'my file (1).txt');

    it('encodes the file name in the URI', () => {
      const uri = item.command!.arguments![0];
      expect(uri.scheme).toBe('brightchain');
      expect(uri.authority).toBe('files');
      expect(uri.path).toContain('id-789');
    });
  });
});
