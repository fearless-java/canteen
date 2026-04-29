import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { cwd } from "process";

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(cwd(), 'uploads');

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  try {
    const filepath = path.join(UPLOAD_DIR, filename);
    const buffer = await readFile(filepath);

    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.webp') contentType = 'image/webp';

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
