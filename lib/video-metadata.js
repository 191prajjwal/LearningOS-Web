"use client";

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = word;
    }
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);

  lines.forEach((lineText, index) => {
    ctx.fillText(lineText, x, y + index * lineHeight);
  });
}

export function createVideoFallbackThumbnail(title = "Video") {
  const canvas = document.createElement("canvas");
  canvas.width = 480;
  canvas.height = 270;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#111827");
  gradient.addColorStop(0.55, "#312e81");
  gradient.addColorStop(1, "#0f172a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,0.12)";
  for (let x = 34; x < canvas.width; x += 92) {
    ctx.fillRect(x, 28, 16, 16);
    ctx.fillRect(x, canvas.height - 44, 16, 16);
  }

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "700 27px Inter, Arial, sans-serif";
  ctx.textBaseline = "top";
  wrapCanvasText(ctx, title.replace(/_/g, " "), 42, 92, 396, 34, 3);

  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = "600 13px Inter, Arial, sans-serif";
  ctx.fillText("ZENITH LECTURE", 42, 42);

  return canvas.toDataURL("image/jpeg", 0.75);
}

export async function getVideoMetadataFromUrl(sourceUrl, title = "Video", timeoutMs = 4500, revokeUrl = false) {
  return await new Promise((resolve) => {
    const video = document.createElement("video");
    let settled = false;

    const finish = (duration = 0, thumbnail = null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (revokeUrl) URL.revokeObjectURL(sourceUrl);
      resolve({
        duration: Number.isFinite(duration) ? Math.max(0, Math.round(duration)) : 0,
        thumbnail: thumbnail || createVideoFallbackThumbnail(title),
      });
    };

    const captureFrame = () => {
      try {
        if (!video.videoWidth || !video.videoHeight) {
          finish(video.duration, null);
          return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = 480;
        canvas.height = Math.round((video.videoHeight / video.videoWidth) * canvas.width) || 270;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        finish(video.duration, canvas.toDataURL("image/jpeg", 0.68));
      } catch {
        finish(video.duration, null);
      }
    };

    const timeout = setTimeout(() => finish(video.duration, null), timeoutMs);

    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const seekTarget = duration > 0 ? Math.min(1.5, Math.max(0.1, duration * 0.25)) : 0;
      try {
        if (seekTarget > 0) video.currentTime = seekTarget;
        else captureFrame();
      } catch {
        captureFrame();
      }
    };
    video.onloadeddata = () => {
      if (!settled && (!Number.isFinite(video.duration) || video.duration === 0)) {
        captureFrame();
      }
    };
    video.onseeked = captureFrame;
    video.onerror = () => finish(0, null);
    video.src = sourceUrl;
    video.load();
  });
}

export async function getVideoMetadata(fileHandle, title = "Video", timeoutMs = 4500) {
  try {
    const file = await fileHandle.getFile();
    const url = URL.createObjectURL(file);
    return await getVideoMetadataFromUrl(url, title, timeoutMs, true);
  } catch {
    return { duration: 0, thumbnail: createVideoFallbackThumbnail(title) };
  }
}
