import { spawn } from "node:child_process";
import path from "node:path";

export const FPS = 30;

/**
 * Records a video format's page to `video.mp4`, one frame at a time: the
 * page exposes `scene.frameAt(t)`, which sets everything on screen for that
 * moment, so the result is the same however slowly the browser draws it.
 * Silent, like the photo posts; the sound is picked in TikTok.
 */
export const recordVideo = async (page, outDir) => {
  const duration = await page.evaluate(() => window.scene.duration);
  const frames = Math.round(duration * FPS);
  const target = path.join(outDir, "video.mp4");

  const ffmpeg = spawn(
    "ffmpeg",
    [
      "-y",
      "-loglevel",
      "error",
      "-f",
      "image2pipe",
      "-framerate",
      String(FPS),
      "-i",
      "-",
      "-c:v",
      "libx264",
      "-preset",
      "slow",
      "-crf",
      "17",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      target,
    ],
    { stdio: ["pipe", "inherit", "inherit"] },
  );
  const done = new Promise((resolve, reject) => {
    ffmpeg.on("error", (error) =>
      reject(
        error.code === "ENOENT"
          ? new Error("ffmpeg isn't installed; it's needed to record video")
          : error,
      ),
    );
    ffmpeg.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)),
    );
  });

  const stage = page.locator(".stage");
  for (let frame = 0; frame < frames; frame++) {
    await page.evaluate((t) => window.scene.frameAt(t), frame / FPS);
    const jpeg = await stage.screenshot({ type: "jpeg", quality: 95 });
    if (!ffmpeg.stdin.write(jpeg))
      await new Promise((resolve) => ffmpeg.stdin.once("drain", resolve));
    if (frame % (FPS * 5) === 0)
      process.stdout.write(
        `\rrecording ${Math.round(frame / FPS)}s / ${duration}s`,
      );
  }
  ffmpeg.stdin.end();
  await done;

  // A still for the cover picker, from the moment the hook is fully in.
  await page.evaluate(() => window.scene.frameAt(window.scene.cover ?? 1.5));
  await stage.screenshot({ path: path.join(outDir, "cover.png") });
  console.log(
    `\rwrote ${path.relative(process.cwd(), target)} (${duration.toFixed(1)}s)`,
  );
};
