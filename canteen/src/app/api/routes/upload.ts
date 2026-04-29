import { app } from '@/lib/hono';
import { writeFile } from 'fs/promises';
import { mkdir } from 'fs/promises';
import path from 'path';
import { cwd } from 'process';
import './uploads';

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(cwd(), 'uploads');

app.post('/upload/image', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      return c.json({ success: false, error: 'No image provided' }, 400);
    }
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ success: false, error: 'Invalid file type' }, 400);
    }
    
    if (file.size > 5 * 1024 * 1024) {
      return c.json({ success: false, error: 'File too large (max 5MB)' }, 400);
    }
    
    const ext = path.extname(file.name);
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
    
    await mkdir(UPLOAD_DIR, { recursive: true });
    
    const buffer = Buffer.from(await file.arrayBuffer());
    const filepath = path.join(UPLOAD_DIR, filename);
    await writeFile(filepath, buffer);
    
    return c.json({
      success: true,
      data: {
        url: `/api/uploads/${filename}`,
        filename,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return c.json({ success: false, error: 'Upload failed' }, 500);
  }
});
