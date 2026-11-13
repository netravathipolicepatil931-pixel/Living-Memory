"""Secure file validation and ffmpeg audio/keyframe extraction for video uploads."""

from __future__ import annotations

import os
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, List, Optional, Tuple


MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB

EXTENSION_MIME_MAP: Dict[str, str] = {
    ".txt": "text/plain",
    ".zip": "application/zip",
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
}


def validate_upload_file(filename: str, content: bytes) -> Tuple[str, str]:
    if not filename:
        raise ValueError("Uploaded file must have a valid filename.")
    ext = os.path.splitext(filename.lower())[1]
    if ext not in EXTENSION_MIME_MAP:
        raise ValueError(
            f"Unsupported file type '{ext}'. Allowed: TXT, ZIP, PDF, DOCX, JPG, PNG, MP3, WAV, M4A, MP4, MOV, WebM."
        )
    if not content:
        raise ValueError("Uploaded file is empty.")
    if len(content) > MAX_UPLOAD_BYTES:
        raise ValueError("File exceeds maximum upload limit of 25 MB.")
    return ext, EXTENSION_MIME_MAP[ext]


def extract_video_audio_and_keyframes(video_bytes: bytes, ext: str) -> Tuple[Optional[bytes], List[bytes]]:
    """Use ffmpeg when present to extract a WAV audio track and up to 4 JPG keyframes from video."""
    audio_bytes: Optional[bytes] = None
    keyframes: List[bytes] = []

    with tempfile.TemporaryDirectory(prefix="lm_vid_") as tmpdir:
        tmp = Path(tmpdir)
        in_path = tmp / f"input{ext}"
        in_path.write_bytes(video_bytes)
        audio_path = tmp / "audio.wav"

        try:
            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-i",
                    str(in_path),
                    "-vn",
                    "-acodec",
                    "pcm_s16le",
                    "-ar",
                    "16000",
                    "-ac",
                    "1",
                    str(audio_path),
                ],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=35,
                check=False,
            )
            if audio_path.exists() and audio_path.stat().st_size > 100:
                audio_bytes = audio_path.read_bytes()
        except Exception:
            pass

        try:
            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-i",
                    str(in_path),
                    "-vf",
                    "fps=0.25,scale=720:-1",
                    "-frames:v",
                    "4",
                    str(tmp / "frame_%02d.jpg"),
                ],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=35,
                check=False,
            )
            for frame_file in sorted(tmp.glob("frame_*.jpg")):
                keyframes.append(frame_file.read_bytes())
        except Exception:
            pass

    return audio_bytes, keyframes
