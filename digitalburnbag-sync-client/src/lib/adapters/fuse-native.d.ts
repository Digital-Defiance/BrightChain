declare module 'fuse-native' {
  /** Callback signature used by all FUSE operations. */
  type FuseCallback = (code: number) => void;

  /** Stat-like object returned by getattr. */
  interface FuseStat {
    mtime: Date;
    atime: Date;
    ctime: Date;
    nlink: number;
    size: number;
    mode: number;
    uid: number;
    gid: number;
  }

  /** FUSE operation handlers. */
  interface FuseOps {
    readdir?(path: string, cb: (code: number, names?: string[]) => void): void;
    getattr?(path: string, cb: (code: number, stat?: FuseStat) => void): void;
    open?(
      path: string,
      flags: number,
      cb: (code: number, fd?: number) => void,
    ): void;
    read?(
      path: string,
      fd: number,
      buf: Buffer,
      len: number,
      pos: number,
      cb: (bytesRead: number) => void,
    ): void;
    write?(
      path: string,
      fd: number,
      buf: Buffer,
      len: number,
      pos: number,
      cb: (bytesWritten: number) => void,
    ): void;
    release?(path: string, fd: number, cb: FuseCallback): void;
    create?(
      path: string,
      mode: number,
      cb: (code: number, fd?: number) => void,
    ): void;
    unlink?(path: string, cb: FuseCallback): void;
    mkdir?(path: string, mode: number, cb: FuseCallback): void;
    rmdir?(path: string, cb: FuseCallback): void;
    rename?(src: string, dest: string, cb: FuseCallback): void;
    truncate?(path: string, size: number, cb: FuseCallback): void;
    utimens?(
      path: string,
      atime: number,
      mtime: number,
      cb: FuseCallback,
    ): void;
    chmod?(path: string, mode: number, cb: FuseCallback): void;
    chown?(path: string, uid: number, gid: number, cb: FuseCallback): void;
    statfs?(
      path: string,
      cb: (code: number, stat?: Record<string, number>) => void,
    ): void;
    flush?(path: string, fd: number, cb: FuseCallback): void;
    fsync?(path: string, fd: number, datasync: boolean, cb: FuseCallback): void;
  }

  interface FuseOptions {
    force?: boolean;
    debug?: boolean;
    displayFolder?: boolean;
    mkdir?: boolean;
  }

  export default class Fuse {
    constructor(mnt: string, ops: FuseOps, opts?: FuseOptions);
    mount(cb: (err?: Error) => void): void;
    unmount(cb: (err?: Error) => void): void;
    /** Errno constants */
    static ENOENT: number;
    static EACCES: number;
    static EEXIST: number;
    static ENOTDIR: number;
    static EISDIR: number;
    static ENOTEMPTY: number;
    static ENOSYS: number;
    static EPERM: number;
    static EIO: number;
    static EBADF: number;
  }
}
