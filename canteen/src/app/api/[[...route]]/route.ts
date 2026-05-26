import { app } from '@/lib/hono';
import { handle } from 'hono/vercel';

import '@/app/api/routes/cafeterias';
import '@/app/api/routes/stalls-ranked';
import '@/app/api/routes/stalls';
import '@/app/api/routes/dishes';
import '@/app/api/routes/reviews';
import '@/app/api/routes/favorites';
import '@/app/api/routes/upload';
import '@/app/api/routes/uploads';
import '@/app/api/routes/merchant';
import '@/app/api/routes/stats';
import '@/app/api/routes/user';

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);
