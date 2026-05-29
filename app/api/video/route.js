export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { NextResponse } from "next/server";

const MIME_TYPES = {
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".webm": "video/webm",
  ".ogg": "video/ogg",
  ".ogv": "video/ogg",
  ".ts": "video/mp2t",
  ".mts": "video/mp2t",
  ".m2ts": "video/mp2t",
  ".3gp": "video/3gpp",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska",
  ".avi": "video/x-msvideo",
  ".flv": "video/x-flv",
  ".wmv": "video/x-ms-wmv",
};

function resolveMediaPath(filePath, rootPath) {
  if (!filePath) return null;
  const decodedPath = decodeURIComponent(filePath);
  const decodedRoot = rootPath ? decodeURIComponent(rootPath) : "";

  if (path.isAbsolute(decodedPath)) return path.normalize(decodedPath);
  if (!decodedRoot) return path.normalize(decodedPath);

  const root = path.resolve(decodedRoot);
  const resolved = path.resolve(root, decodedPath);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return resolved;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const filePath = searchParams.get("path");
  const rootPath = searchParams.get("root");
  const resolvedPath = resolveMediaPath(filePath, rootPath);

  if (!resolvedPath) {
    return NextResponse.json({ error: "Missing or invalid video path" }, { status: 400 });
  }

  try {
    const stat = await fs.promises.stat(resolvedPath);
    if (!stat.isFile()) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const range = req.headers.get("range");
    const contentType = MIME_TYPES[path.extname(resolvedPath).toLowerCase()] || "application/octet-stream";

    if (!range) {
      const stream = fs.createReadStream(resolvedPath);
      return new Response(Readable.toWeb(stream), {
        headers: {
          "Content-Length": String(stat.size),
          "Content-Type": contentType,
          "Accept-Ranges": "bytes",
        },
      });
    }

    const match = range.match(/bytes=(\d*)-(\d*)/);
    if (!match) return NextResponse.json({ error: "Invalid range" }, { status: 416 });

    const start = match[1] ? parseInt(match[1], 10) : 0;
    const end = match[2] ? parseInt(match[2], 10) : stat.size - 1;
    if (start >= stat.size || end >= stat.size || start > end) {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${stat.size}` },
      });
    }

    const chunkSize = end - start + 1;
    const stream = fs.createReadStream(resolvedPath, { start, end });
    return new Response(Readable.toWeb(stream), {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunkSize),
        "Content-Type": contentType,
      },
    });
  } catch (e) {
    if (e.code === "ENOENT") {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
