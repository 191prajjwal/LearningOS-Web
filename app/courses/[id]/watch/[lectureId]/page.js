"use client";
import { apiFetch } from "../../../../../lib/api";
import { useParams } from "next/navigation";
import VideoPlayer from "../../../../../components/video/VideoPlayer";

export default function WatchPage() {
  const { id, lectureId } = useParams();
  return <VideoPlayer subjectId={id} lectureId={lectureId} />;
}
