'use strict';

import corslib from 'cors';

const whitelist = ['http://localhost:3000', 'https://localhost:3000'];
const corsOptionsDelegate = (
  req: corslib.CorsRequest,
  callback: (
    error: Error | null,
    options: corslib.CorsOptions | undefined,
  ) => void,
) => {
  let corsOptions: corslib.CorsOptions;
  if (req.headers.origin && whitelist.indexOf(req.headers.origin) !== -1) {
    corsOptions = { origin: true };
  } else {
    corsOptions = { origin: false };
  }
  callback(null, corsOptions);
};
export const cors = corslib(corsOptionsDelegate);
