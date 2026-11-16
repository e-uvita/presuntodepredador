#!/usr/bin/env python3
"""Build optimized web media from the local AirPano EAC example video.

Usage: uv run --with pillow --with imageio-ffmpeg python scripts/prepare-media.py
"""

from argparse import ArgumentParser
from pathlib import Path
import io
import subprocess

from PIL import Image

parser = ArgumentParser()
parser.add_argument("--ffmpeg", help="Override the FFmpeg executable")
parser.add_argument("--video", type=Path, required=True, help="Original AirPano EAC sample MP4")
parser.add_argument("--reference", type=Path, required=True, help="Original ocean photograph")
parser.add_argument("--output", type=Path, default=Path("public/media"))
args = parser.parse_args()
if args.ffmpeg:
    ffmpeg = args.ffmpeg
else:
    import imageio_ffmpeg

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
args.output.mkdir(parents=True, exist_ok=True)
video_output = args.output / "video"
image_output = args.output / "images"
video_output.mkdir(exist_ok=True)
image_output.mkdir(exist_ok=True)


def run(*command, capture=False):
    result = subprocess.run([ffmpeg, "-loglevel", "error", *map(str, command)], check=True, capture_output=capture)
    return result.stdout if capture else None


# YouTube/AirPano equi-angular cubemap: convert the whole clip to equirectangular.
run(
    "-y",
    "-i",
    args.video,
    "-an",
    "-vf",
    "v360=input=eac:output=equirect:w=1440:h=720,fps=24",
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "31",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    video_output / "episode-demo.mp4",
)

# The supplied standalone image is already a conventional flat photograph.
image = Image.open(args.reference)
image.thumbnail((1600, 1200))
image.save(image_output / "ocean.webp", "WEBP", quality=80, method=6)

for second, yaw, name in [(18, 0, "episode-1.webp"), (48, 85, "episode-2.webp"), (88, -85, "episode-3.webp")]:
    frame = run(
        "-ss",
        second,
        "-i",
        args.video,
        "-frames:v",
        "1",
        "-vf",
        f"v360=input=eac:output=flat:h_fov=105:v_fov=70:yaw={yaw}:pitch=0:w=640:h=360",
        "-f",
        "image2pipe",
        "-vcodec",
        "png",
        "pipe:1",
        capture=True,
    )
    Image.open(io.BytesIO(frame)).convert("RGB").save(image_output / name, "WEBP", quality=76, method=6)
