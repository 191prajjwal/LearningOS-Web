"use client";
import { apiFetch } from "../../lib/api";
import { folderStore } from "../../lib/folder-store";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, Settings, ChevronLeft, ChevronRight,
  PictureInPicture2, RotateCcw, RotateCw, BookOpen, StickyNote,
  CheckCircle2, ArrowLeft, Loader2, Subtitles, ListVideo,
} from "lucide-react";
import Link from "next/link";
import { cn, formatDuration, clamp, getLectureProgress, cleanLectureTitle, slugify } from "../../lib/utils";
import { PLAYBACK_SPEEDS, SKIP_SECONDS } from "../../lib/constants";
import VideoNotes from "./VideoNotes";

export default function VideoPlayer({ subjectId, lectureId }) {
  const router = useRouter();
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const progressRef = useRef(null);
  const sessionStartRef = useRef(null);
  const sessionStartPosRef = useRef(0);
  const playedSecondsRef = useRef(0);
  const lastTimeRef = useRef(0);
  const pauseCountRef = useRef(0);
  const hideTimer = useRef(null);

  const [lecture, setLecture] = useState(null);
  const [subject, setSubject] = useState(null);
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Playback state
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [buffered, setBuffered] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [seekPreview, setSeekPreview] = useState(null);
  const [showLecturePanel, setShowLecturePanel] = useState(false);

  // Load lecture data
  useEffect(() => {
    loadLecture();
  }, [lectureId, subjectId]);

  const loadLecture = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/courses/${subjectId}`);
      const cData = await res.json();
      const lec = cData.lectures?.find(l => 
        String(l.id) === String(lectureId) || 
        slugify(cleanLectureTitle(l.title)) === lectureId
      );
      if (!lec) { setError("Lecture not found"); return; }

      if (!folderStore.getForLecture(lec.file_path)) {
        const restored = await folderStore.reconnect(cData.subject?.id || subjectId, "course");
        if (!restored.ok && String(cData.subject?.id) !== String(subjectId)) {
          await folderStore.reconnect(subjectId, "course");
        }
      }

      setLecture(lec);
      setSubject(cData.subject);
      setLectures(cData.lectures || []);
      setLoading(false);

      // Resume position
      if (lec.last_position > 0 && !lec.is_completed) {
        setTimeout(() => {
          if (videoRef.current) videoRef.current.currentTime = lec.last_position;
          setCurrentTime(lec.last_position);
        }, 500);
      }
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handler = (e) => {
      const v = videoRef.current;
      if (!v || e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

      switch (e.key) {
        case " ": e.preventDefault(); togglePlay(); break;
        case "ArrowRight": e.preventDefault(); v.currentTime += SKIP_SECONDS; break;
        case "ArrowLeft": e.preventDefault(); v.currentTime -= SKIP_SECONDS; break;
        case "ArrowUp": e.preventDefault(); v.volume = clamp(v.volume + 0.1, 0, 1); setVolume(v.volume); break;
        case "ArrowDown": e.preventDefault(); v.volume = clamp(v.volume - 0.1, 0, 1); setVolume(v.volume); break;
        case "m": case "M": toggleMute(); break;
        case "f": case "F": toggleFullscreen(); break;
        case "n": case "N": setShowNotes(v => !v); break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Auto-hide controls
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    if (playing) {
      hideTimer.current = setTimeout(() => {
        if (!showSettings) setShowControls(false);
      }, 3000);
    }
  }, [playing, showSettings]);

  // Video event handlers
  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    const delta = v.currentTime - lastTimeRef.current;
    if (!v.paused && delta > 0 && delta < 2) playedSecondsRef.current += delta;
    lastTimeRef.current = v.currentTime;
    setCurrentTime(v.currentTime);
    // Update buffered
    if (v.buffered.length > 0) {
      setBuffered((v.buffered.end(v.buffered.length - 1) / v.duration) * 100);
    }
  };

  const onLoadedMetadata = () => {
    const v = videoRef.current;
    setDuration(v.duration);
    v.playbackRate = speed;
    sessionStartRef.current = Date.now();
    sessionStartPosRef.current = v.currentTime;
    lastTimeRef.current = v.currentTime;
    playedSecondsRef.current = 0;
  };

  const onEnded = async () => {
    setPlaying(false);
    await saveWatchSession(true);
    // Autoplay next
    const idx = lectures.findIndex(l => String(l.id) === String(lecture?.id));
    if (idx < lectures.length - 1) {
      const next = lectures[idx + 1];
      router.push(`/courses/${subjectId}/watch/${next.id}`);
    }
  };

  const onPause = () => {
    setPlaying(false);
    pauseCountRef.current++;
  };

  const onPlay = () => setPlaying(true);

  // Save watch session to DB
  const saveWatchSession = async (completed = false, keepalive = false) => {
    const v = videoRef.current;
    if (!v || !sessionStartRef.current) return;

    const wallTime = (Date.now() - sessionStartRef.current) / 1000;
    const positionDelta = Math.max(0, v.currentTime - sessionStartPosRef.current);
    const duration = Math.max(0, Math.min(wallTime, playedSecondsRef.current || positionDelta));
    if (duration < 5) return;

    const positionPct = v.duration > 0 ? (v.currentTime / v.duration) * 100 : 0;
    const payload = JSON.stringify({
      lecture_id: lecture?.id || lectureId,
      subject_id: subject?.id || subjectId,
      duration: Math.max(0.1, duration / 60),
      start_pos: sessionStartPosRef.current,
      end_pos: v.currentTime,
      speed,
      pauses: pauseCountRef.current,
      position_pct: completed ? 100 : positionPct,
    });

    await apiFetch("/api/db?q=watch-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive,
    });

    sessionStartRef.current = Date.now();
    sessionStartPosRef.current = v.currentTime;
    playedSecondsRef.current = 0;
    lastTimeRef.current = v.currentTime;
    pauseCountRef.current = 0;
  };

  // Save on unmount and periodically
  useEffect(() => {
    const interval = setInterval(() => saveWatchSession(), 60000);
    const handleBeforeUnload = () => { saveWatchSession(false, true); };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      saveWatchSession();
    };
  }, [lecture?.id, subject?.id, speed]);

  // Controls
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
      setFullscreen(true);
    } else {
      await document.exitFullscreen();
      setFullscreen(false);
    }
  };

  const togglePiP = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch {}
  };

  const setPlaybackSpeed = (s) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = s;
    setSpeed(s);
    setShowSettings(false);
  };

  const seek = (e) => {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const t = x * duration;
    if (videoRef.current) videoRef.current.currentTime = t;
    setCurrentTime(t);
  };

  const onProgressMouseMove = (e) => {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    setSeekPreview({ x: e.clientX - rect.left, time: x * duration });
  };

  const skip = (secs) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = clamp(v.currentTime + secs, 0, duration);
  };

  const navLecture = (dir) => {
    const idx = lectures.findIndex(l => String(l.id) === String(lecture?.id));
    const next = lectures[idx + dir];
    if (next) router.push(`/courses/${subjectId}/watch/${next.id}`);
  };

  const currentIdx = lectures.findIndex(l => String(l.id) === String(lecture?.id));
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const folderBlobSrc = folderStore.getForLecture(lecture?.file_path);
  const videoSrc = folderBlobSrc || null;

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-base">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-screen bg-base flex-col gap-4">
      <p className="text-red-400">{error}</p>
      <Link href={`/courses/${subjectId}`} className="text-indigo-400 hover:underline">← Back to course</Link>
    </div>
  );

  return (
    <div className="flex h-screen bg-base overflow-hidden">
      {/* Video area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 h-12 border-b border-default bg-surface flex-shrink-0">
          <Link href={`/courses/${subjectId}`} className="flex items-center gap-1.5 text-sm text-muted hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" /> {subject?.name}
          </Link>
          <span className="text-muted">/</span>
          <span className="text-sm text-primary truncate">
            {cleanLectureTitle(lecture?.title)}
          </span>
          <div className="ml-auto flex items-center gap-2">
           
            <button
             onClick={() => { setShowNotes(v => !v); setShowLecturePanel(false); }}
              className={cn("video-btn", showNotes && "bg-indigo-500/20 border-indigo-500/30 text-indigo-400")}
            >
              <StickyNote className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setShowLecturePanel(v => !v); setShowNotes(false); }}
              className={cn("video-btn", showLecturePanel && "bg-indigo-500/20 border-indigo-500/30 text-indigo-400")}
              title="Lecture list"
            >
              <ListVideo className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video container */}
        <div
          ref={containerRef}
          className="relative flex-1 bg-black overflow-hidden group"
          onMouseMove={resetHideTimer}
          onClick={togglePlay}
        >
          {lecture?.file_path && videoSrc ? (
            <video
             ref={videoRef}
             src={videoSrc}
              className="w-full h-full object-contain"
              onTimeUpdate={onTimeUpdate}
              onLoadedMetadata={onLoadedMetadata}
              onEnded={onEnded}
              onPause={onPause}
              onPlay={onPlay}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted">
                <BookOpen className="w-12 h-12 mx-auto mb-3" />
                <p>{lecture?.file_path ? "Folder permission could not be restored" : "No video file path set for this lecture"}</p>
                <p className="text-xs mt-1">
                  {lecture?.file_path ? "Use a saved local folder path for fully refresh-safe playback." : "Edit the lecture to add a file path"}
                </p>
              </div>
            </div>
          )}

          {/* Play/Pause center indicator */}
          <AnimatePresence>
            {!playing && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <div className="w-16 h-16 rounded-full bg-black/60 flex items-center justify-center">
                  <Play className="w-8 h-8 text-white" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls overlay */}
          <AnimatePresence>
            {showControls && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pb-4 pt-16"
                onClick={e => e.stopPropagation()}
              >
                {/* Progress bar */}
                <div className="px-4 mb-3">
                  <div
                    ref={progressRef}
                    className="relative h-1.5 bg-white/20 rounded-full cursor-pointer group/prog hover:h-2.5 transition-all"
                    onClick={seek}
                    onMouseMove={onProgressMouseMove}
                    onMouseLeave={() => setSeekPreview(null)}
                  >
                    {/* Buffered */}
                    <div
                      className="absolute top-0 left-0 h-full bg-white/30 rounded-full"
                      style={{ width: `${buffered}%` }}
                    />
                    {/* Played */}
                    <div
                      className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full"
                      style={{ width: `${progressPct}%` }}
                    />
                    {/* Thumb */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover/prog:opacity-100 transition-opacity"
                      style={{ left: `calc(${progressPct}% - 6px)` }}
                    />
                    {/* Seek preview */}
                    {seekPreview && (
                      <div
                        className="absolute bottom-5 -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded-md pointer-events-none"
                        style={{ left: seekPreview.x }}
                      >
                        {formatDuration(seekPreview.time)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Control buttons */}
                <div className="px-4 flex items-center gap-2">
                  {/* Prev lecture */}
                  <button
                    onClick={() => navLecture(-1)}
                    disabled={currentIdx <= 0}
                    className="video-btn disabled:opacity-30"
                    title="Previous lecture"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Skip back */}
                  <button onClick={() => skip(-SKIP_SECONDS)} className="video-btn relative" title={`-${SKIP_SECONDS}s`}>
                    <RotateCcw className="w-5 h-5" />
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white pointer-events-none mt-0.5">{SKIP_SECONDS}</span>
                  </button>

                  {/* Play/Pause */}
                  <button
                    onClick={togglePlay}
                    className="w-10 h-10 rounded-lg bg-white text-black flex items-center justify-center hover:bg-white/90 transition-colors"
                  >
                    {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>

                  {/* Skip forward */}
                  <button onClick={() => skip(SKIP_SECONDS)} className="video-btn relative" title={`+${SKIP_SECONDS}s`}>
                    <RotateCw className="w-5 h-5" />
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white pointer-events-none mt-0.5">{SKIP_SECONDS}</span>
                  </button>

                  {/* Next lecture */}
                  <button
                    onClick={() => navLecture(1)}
                    disabled={currentIdx >= lectures.length - 1}
                    className="video-btn disabled:opacity-30"
                    title="Next lecture"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Time */}
                  <span className="text-xs font-mono text-white/70 ml-2">
                    {formatDuration(currentTime)} / {formatDuration(duration)}
                  </span>

                  <div className="flex-1" />

                  {/* Volume */}
                  <div className="flex items-center gap-2">
                    <button onClick={toggleMute} className="video-btn">
                      {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={muted ? 0 : volume}
                      onChange={e => {
                        const v = parseFloat(e.target.value);
                        videoRef.current.volume = v;
                        setVolume(v);
                        if (v > 0) { videoRef.current.muted = false; setMuted(false); }
                      }}
                      className="w-20 accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Speed */}
                  <div className="relative">
                    <button
                      onClick={() => setShowSettings(v => !v)}
                      className={cn("video-btn text-xs font-mono", showSettings && "bg-indigo-500/20")}
                    >
                      {speed}×
                    </button>
                    {showSettings && (
                      <div className="absolute bottom-12 right-0 bg-elevated border border-default rounded-xl overflow-hidden shadow-lg z-10 min-w-[120px]">
                        <p className="text-xs text-muted px-3 pt-2 pb-1">Playback Speed</p>
                        {PLAYBACK_SPEEDS.map(s => (
                          <button
                            key={s}
                            onClick={() => setPlaybackSpeed(s)}
                            className={cn(
                              "w-full px-3 py-1.5 text-left text-sm hover:bg-overlay transition-colors font-mono",
                              s === speed ? "text-indigo-400" : "text-secondary"
                            )}
                          >
                            {s}×
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* PiP */}
                  <button onClick={togglePiP} className="video-btn" title="Picture-in-Picture">
                    <PictureInPicture2 className="w-4 h-4" />
                  </button>

                  {/* Fullscreen */}
                  <button onClick={toggleFullscreen} className="video-btn">
                    {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Lecture title bar */}
        <div className="flex items-center gap-4 px-4 py-3 bg-surface border-t border-default flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-semibold text-primary text-sm truncate">
              {cleanLectureTitle(lecture?.title)}
            </h2>
            <p className="text-xs text-muted">{currentIdx + 1} of {lectures.length} · {subject?.name}</p>
          </div>
        </div>
      </div>

      {/* Notes panel */}
      <AnimatePresence>
        {showNotes && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 340, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-l border-default overflow-hidden flex-shrink-0"
          >
            <VideoNotes
              lectureId={lecture?.id || lectureId}
              subjectId={subject?.id || subjectId}
              currentTime={currentTime}
              onSeek={(t) => { if (videoRef.current) videoRef.current.currentTime = t; }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lecture list panel */}
      <AnimatePresence>
        {showLecturePanel && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-l border-default overflow-hidden flex-shrink-0 flex flex-col bg-surface"
          >
            {/* Panel header */}
            <div className="px-4 py-3 border-b border-default flex-shrink-0">
              <div className="flex items-center gap-2">
                <ListVideo className="w-4 h-4 text-indigo-400" />
                <h3 className="font-display font-semibold text-sm text-primary">Lectures</h3>
                <span className="ml-auto text-xs text-muted">{lectures.length} total</span>
              </div>
            </div>

            {/* Scrollable lecture list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {lectures.map((l, i) => {
                const isCurrent = String(l.id) === String(lecture?.id);
                const isNext = i === currentIdx + 1;
                const { status, pct } = getLectureProgress(l);
                
                return (
                  <div key={l.id}>
                    {isNext && (
                      <p className="text-xs text-muted uppercase tracking-wider px-2 pt-2 pb-1">Up Next</p>
                    )}
                    <Link href={`/courses/${subjectId}/watch/${slugify(cleanLectureTitle(l.title))}`}>
                      <div className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer relative overflow-hidden",
                        isCurrent
                          ? "bg-indigo-600/20 border border-indigo-500/30"
                          : "hover:bg-elevated border border-transparent"
                      )}>
                        {/* Progress Bar Background */}
                        {(status === "inprogress" || status === "completed") && !isCurrent && (
                           <div 
                             className={cn("absolute bottom-0 left-0 h-[2px]", status === "completed" ? "bg-emerald-500" : "bg-indigo-500")} 
                             style={{ width: `${pct}%` }} 
                           />
                        )}
                        
                        {/* Number / check */}
                        <div className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono flex-shrink-0 font-bold z-10",
                          isCurrent ? "bg-indigo-500 text-white" :
                          status === "completed" ? "bg-green-500/15 text-green-400" :
                          "bg-elevated text-muted"
                        )}>
                          {status === "completed" && !isCurrent ? "✓" : i + 1}
                        </div>
                        {/* Title */}
                        <div className="flex-1 min-w-0 z-10">
                          <p className={cn(
                            "text-xs font-medium leading-snug truncate",
                            isCurrent ? "text-indigo-300" : status === "completed" ? "text-muted" : "text-secondary"
                          )} title={cleanLectureTitle(l.title)}>
                            {cleanLectureTitle(l.title)}
                          </p>
                          {isCurrent && (
                            <p className="text-xs text-indigo-400 mt-0.5">Now playing</p>
                          )}
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
