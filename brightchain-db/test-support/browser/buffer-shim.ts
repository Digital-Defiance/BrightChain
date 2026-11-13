// Browser pages need a global Buffer. esbuild's --inject uses this export for every free `Buffer`.
export { Buffer } from 'buffer';
