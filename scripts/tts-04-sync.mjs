// 导出全站动画旁白词单（适配 E:\Demo_Project\voices\04.pt）到 ../tts-04-colab/（含单文件 Google Colab Notebook 与独立 Python 脚本），
// 以及从 Colab / 外部 GPU 下载回的结果压缩包或目录批量校验、覆盖导入到 public/tts/ 并更新 index.json。
//
// 用法：
//   node scripts/tts-04-sync.mjs export
//   node scripts/tts-04-sync.mjs import <path1.zip|dir1> [path2.zip|dir2 ...]
//
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {copyFileSync,createWriteStream,existsSync,mkdirSync,mkdtempSync,readdirSync,readFileSync,renameSync,rmSync,statSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import zlib from 'node:zlib';

const SITE_DIR=process.cwd();
const OUT_COLAB_DIR=resolve(SITE_DIR,'..','tts-04-colab');
const VOICE_DIR=String.raw`E:\Demo_Project\voices`;
const TTS_DIR=join(SITE_DIR,'public','tts');
const INDEX_FILE=join(TTS_DIR,'index.json');

// 已在本机用 04.pt 精细调优并上线验证过的《大模型是怎么“说话”的》（next-token）6 个分镜哈希。
const NEXT_TOKEN_DONE=[
 '0e387d7fd6ebf48f',
 'c84d9cb380b136d4',
 '8c2d3c83fc0c2094',
 '9b1c67956af015da',
 'e6f92738f33a102c',
 '0ac97be67cacc7c8',
];

function cleanForQwen(text){
 return text
  .replace(/\s+([，。？！；：、])/g,'$1')
  .replace(/([，。？！；：])\s+/g,'$1')
  .replace(/\s{2,}/g,' ')
  .trim();
}

async function collectManifest(){
 const req=createRequire(import.meta.url);
 const {build}=createRequire(req.resolve('wrangler/package.json'))('esbuild');
 const entry=`export {TTS_VOICE,spoken} from './app/ai/animations/sound';
export {fromStory} from './app/ai/animations/story';
export {lazyAnimation} from './app/ai/animations/lazy/engine';
export {goLazy} from './app/ai/animations/lazy/go';
export {aiLazy} from './app/ai/animations/lazy/ai';
export {backendLazy} from './app/ai/animations/lazy/backend';
export {frontendLazy} from './app/ai/animations/lazy/frontend';
export {stories} from './app/ai/animations/stories/index';
export {goStories} from './app/ai/animations/stories/go';
export {backendStories} from './app/ai/animations/stories/backend';
export {dbStories} from './app/ai/animations/stories/db';
export {frontendStories} from './app/ai/animations/stories/frontend';
export {goAnimations} from './app/ai/animations/go-lessons';
export {backendAnimations} from './app/ai/animations/be-lessons';
export {frontendAnimations} from './app/ai/animations/fe-lessons';
export {animations} from './app/ai/animations/index';`;
 const out=await build({stdin:{contents:entry,resolveDir:SITE_DIR,loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',jsx:'automatic',tsconfig:join(SITE_DIR,'tsconfig.json'),logLevel:'error'});
 const tmp=join(mkdtempSync(join(tmpdir(),'tts04-')),'bundle.mjs');
 writeFileSync(tmp,out.outputFiles[0].text);
 const m=await import(pathToFileURL(tmp).href);
 const story=(g,l)=>Object.entries(g).map(([id,s])=>m.fromStory(id,l,s));
 const groups={
  ai_classroom:m.animations,
  go_classroom:m.goAnimations,
  be_classroom:m.backendAnimations,
  fe_classroom:m.frontendAnimations,
  ai_interview:story(m.stories,'ai'),
  go_interview:story(m.goStories,'go'),
  be_interview:[...story(m.backendStories,'backend'),...story(m.dbStories,'db')],
  fe_interview:story(m.frontendStories,'frontend'),
  ai_lazy:m.aiLazy.map(m.lazyAnimation),
  go_lazy:m.goLazy.map(m.lazyAnimation),
  be_lazy:m.backendLazy.map(m.lazyAnimation),
  fe_lazy:m.frontendLazy.map(m.lazyAnimation),
 };
 const hashOf=t=>createHash('sha256').update(m.TTS_VOICE+'\n'+t).digest('hex').slice(0,16);
 const byHash=new Map();
 let animCount=0;
 for(const [cat,list] of Object.entries(groups)){
  animCount+=list.length;
  for(const a of list){
   a.scenes.forEach((sc,si)=>{
    const raw=sc.speech??sc.caption;
    const h=hashOf(raw);
    if(!byHash.has(h)){
     byHash.set(h,{
      hash:h,
      cat,
      animId:a.id,
      scene:si,
      text:cleanForQwen(m.spoken(raw)),
     });
    }
   });
  }
 }
 return {voice:m.TTS_VOICE,animCount,items:[...byHash.values()]};
}

const BATCH_SYNTH_PY=`"""Batch Qwen3-TTS 04.pt synthesizer for all animation lines (Colab / High-VRAM GPU).

Features:
- Loads saved 04.pt voice-clone prompt and Qwen/Qwen3-TTS-12Hz-0.6B-Base (bfloat16 + sdpa).
- Sorts pending lines by text length so padding overhead stays tiny.
- Auto-tunes batch size from GPU VRAM and falls back cleanly on CUDA OOM.
- Trims leading/trailing room noise by window RMS, normalizes loudness (target_rms=0.085),
  and runs an automatic outlier duration/RMS sanity retry so clips stay crisp.
- Encodes directly via ffmpeg into 48kHz mono 48kbps MP3 matching site/public/tts/.
- Resumable: skips already-done hashes on disk or listed in pre_done.json.
"""

from __future__ import annotations

import argparse
import io
import json
import os
import shutil
import subprocess
import time
import zipfile
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import torch
from qwen_tts import Qwen3TTSModel, VoiceClonePromptItem


def load_prompt_compat(path: Path) -> List[VoiceClonePromptItem]:
    try:
        payload = torch.load(str(path), map_location="cpu", weights_only=True)
    except Exception:
        payload = torch.load(str(path), map_location="cpu", weights_only=False)
    items: List[VoiceClonePromptItem] = []
    for d in payload["items"]:
        items.append(
            VoiceClonePromptItem(
                ref_code=d.get("ref_code"),
                ref_spk_embedding=d["ref_spk_embedding"],
                x_vector_only_mode=bool(d.get("x_vector_only_mode", False)),
                icl_mode=bool(d.get("icl_mode", True)),
                ref_text=d.get("ref_text"),
            )
        )
    return items


def trim_by_window_rms(
    wav: np.ndarray,
    sr: int,
    win_ms: int = 50,
    thresh: float = 0.012,
    start_pad_ms: int = 60,
    end_pad_ms: int = 120,
) -> np.ndarray:
    wav = np.asarray(wav, dtype=np.float32).reshape(-1)
    if wav.size == 0:
        return wav
    win = max(1, int(sr * win_ms / 1000))
    n = wav.size // win
    if n == 0:
        return wav
    frames = wav[: n * win].reshape(n, win)
    rms = np.sqrt(np.mean(frames * frames, axis=1))
    active = np.where(rms > thresh)[0]
    if active.size == 0:
        # fallback tighter threshold before declaring silent
        active = np.where(rms > 0.004)[0]
        if active.size == 0:
            return wav
    start = max(0, int(active[0]) * win - int(sr * start_pad_ms / 1000))
    end = min(wav.size, int(active[-1] + 1) * win + int(sr * end_pad_ms / 1000))
    return wav[start:end].copy()


def normalize_loudness(wav: np.ndarray, target_rms: float = 0.085, max_peak: float = 0.98) -> np.ndarray:
    wav = np.asarray(wav, dtype=np.float32).reshape(-1)
    if wav.size == 0:
        return wav
    wav = np.nan_to_num(wav, nan=0.0, posinf=0.0, neginf=0.0)
    abs_wav = np.abs(wav)
    active_thresh = max(0.015, float(np.percentile(abs_wav, 65)) * 0.25)
    active = wav[abs_wav >= active_thresh]
    if active.size > 0:
        active_rms = float(np.sqrt(np.mean(active * active)))
        if active_rms > 1e-5:
            gain = min(target_rms / active_rms, 4.0)
            wav = wav * gain
    peak = float(np.max(np.abs(wav))) if wav.size else 0.0
    if peak > max_peak:
        wav = wav * (max_peak / peak)
    return wav.astype(np.float32)


def encode_mp3_ffmpeg(wav: np.ndarray, sr: int, out_path: Path, kbps: int = 48) -> None:
    pcm16 = np.clip(np.round(wav * 32767.0), -32768, 32767).astype("<i2")
    tmp_path = out_path.with_suffix(".mp3.tmp")
    proc = subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-loglevel",
            "error",
            "-f",
            "s16le",
            "-ar",
            str(sr),
            "-ac",
            "1",
            "-i",
            "pipe:0",
            "-ar",
            "48000",
            "-ac",
            "1",
            "-b:a",
            f"{kbps}k",
            "-f",
            "mp3",
            str(tmp_path),
        ],
        input=pcm16.tobytes(),
        capture_output=True,
        check=False,
    )
    if proc.returncode != 0 or not tmp_path.exists() or tmp_path.stat().st_size < 256:
        err = proc.stderr.decode("utf-8", errors="replace")
        raise RuntimeError(f"ffmpeg failed ({proc.returncode}): {err}")
    tmp_path.replace(out_path)


def estimate_max_new_tokens(texts: List[str]) -> int:
    # At 12.5 Hz frame rate: ~3-4 tokens per Chinese character on average; allow safe headroom without 30s runaway loops.
    longest = max((len(t) for t in texts), default=30)
    return min(900, max(140, int(longest * 4.5 + 80)))


def is_clip_outlier(wav: np.ndarray, sr: int, text: str) -> Tuple[bool, int, float]:
    n = max(1, len(text.strip()))
    ms = int(round(len(wav) / max(1, sr) * 1000))
    rms = float(np.sqrt(np.mean(wav * wav))) if wav.size else 0.0
    min_ms = max(400, n * 60)
    max_ms = max(5000, n * 480 + 2500)
    bad = (not np.all(np.isfinite(wav))) or rms < 0.008 or ms < min_ms or ms > max_ms
    return bad, ms, rms


def auto_batch_size() -> int:
    if not torch.cuda.is_available():
        return 1
    vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)
    if vram_gb >= 36:
        return 14
    if vram_gb >= 20:
        return 8
    if vram_gb >= 12:
        return 4
    return 2


def matches_scope(cat: str, scope: str) -> bool:
    if scope == "all":
        return True
    if scope == "classroom":
        return cat.endswith("_classroom")
    if scope == "interview":
        return cat.endswith("_interview")
    if scope == "lazy":
        return cat.endswith("_lazy")
    allowed = {s.strip() for s in scope.split(",") if s.strip()}
    return cat in allowed


def save_json_atomic(path: Path, data: Dict[str, int]) -> None:
    tmp = path.with_suffix(".json.tmp")
    ordered = {k: data[k] for k in sorted(data)}
    tmp.write_text(json.dumps(ordered, ensure_ascii=False), encoding="utf-8")
    tmp.replace(path)


def package_zip(out_dir: Path, zip_path: Path) -> None:
    index_file = out_dir / "index_04.json"
    idx = json.loads(index_file.read_text(encoding="utf-8")) if index_file.exists() else {}
    tmp_zip = zip_path.with_suffix(".zip.tmp")
    with zipfile.ZipFile(tmp_zip, "w", compression=zipfile.ZIP_STORED) as zf:
        if index_file.exists():
            zf.write(index_file, "index_04.json")
        for h in sorted(idx):
            mp3 = out_dir / f"{h}.mp3"
            if mp3.exists() and mp3.stat().st_size > 256:
                zf.write(mp3, f"{h}.mp3")
    tmp_zip.replace(zip_path)


def main() -> None:
    parser = argparse.ArgumentParser(description="Batch synthesize Qwen3-TTS 04.pt MP3s for all animations.")
    parser.add_argument("--manifest", default="manifest.json")
    parser.add_argument("--prompt", default="04.pt")
    parser.add_argument("--pre-done", default="pre_done.json")
    parser.add_argument("--out-dir", default="output")
    parser.add_argument("--zip-out", default="tts-04-output.zip")
    parser.add_argument("--model-path", default="Qwen/Qwen3-TTS-12Hz-0.6B-Base")
    parser.add_argument("--scope", default="all", help="all | classroom | interview | lazy | comma-separated categories")
    parser.add_argument("--shard", default="1/1", help="k/n 1-indexed shard, e.g. 1/2")
    parser.add_argument("--batch-size", type=int, default=0, help="0 = auto from GPU VRAM")
    parser.add_argument("--include-predone", action="store_true")
    parser.add_argument("--max-items", type=int, default=0, help="Optional cap for quick test")
    args = parser.parse_args()

    if not shutil.which("ffmpeg"):
        raise SystemExit("ffmpeg not found! Install ffmpeg first (apt-get install -y ffmpeg).")

    os.environ.setdefault("NO_PROXY", "*")
    manifest = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
    items = manifest["items"]

    pre_done = set()
    pre_path = Path(args.pre_done)
    if pre_path.exists() and not args.include_predone:
        pre_done = set(json.loads(pre_path.read_text(encoding="utf-8")))

    shard_k, shard_n = [int(x) for x in args.shard.split("/")]
    assert 1 <= shard_k <= shard_n

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    index_file = out_dir / "index_04.json"
    done_index: Dict[str, int] = json.loads(index_file.read_text(encoding="utf-8")) if index_file.exists() else {}

    # Reconcile existing MP3s in out_dir with index_04.json
    pending = []
    skipped_done = 0
    for idx, it in enumerate(items):
        if not matches_scope(it["cat"], args.scope):
            continue
        if (idx % shard_n) + 1 != shard_k:
            continue
        h = it["hash"]
        if h in pre_done:
            skipped_done += 1
            continue
        mp3_path = out_dir / f"{h}.mp3"
        if h in done_index and mp3_path.exists() and mp3_path.stat().st_size > 256:
            skipped_done += 1
            continue
        pending.append(it)

    # Sort shortest -> longest so batch padding stays minimal and memory stays predictable.
    pending.sort(key=lambda x: len(x["text"]))
    if args.max_items > 0:
        pending = pending[: args.max_items]

    print(
        f"Scope={args.scope} | Shard={shard_k}/{shard_n} | Already done={skipped_done} | Todo={len(pending)}",
        flush=True,
    )
    if not pending:
        if args.zip_out:
            package_zip(out_dir, Path(args.zip_out))
            print(f"Everything already complete! Packaged {args.zip_out}", flush=True)
        return

    gpu_name = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"
    device = "cuda:0" if torch.cuda.is_available() else "cpu"
    dtype = torch.bfloat16 if torch.cuda.is_available() else torch.float32
    print(f"Loading {args.model_path} on {gpu_name} ({dtype})...", flush=True)
    t0 = time.time()
    tts = Qwen3TTSModel.from_pretrained(
        args.model_path,
        device_map=device,
        dtype=dtype,
        attn_implementation="sdpa" if torch.cuda.is_available() else "eager",
    )
    prompt_items = load_prompt_compat(Path(args.prompt))
    print(f"Loaded model & {args.prompt} in {time.time() - t0:.1f}s", flush=True)

    base_bs = args.batch_size if args.batch_size > 0 else auto_batch_size()
    print(f"Auto base batch_size = {base_bs}", flush=True)

    done_count = 0
    outliers: List[dict] = []
    began = time.time()
    i = 0
    cur_bs = base_bs

    def synth_batch(batch: List[dict], seed_offset: int, temp: float = 0.75, top_p: float = 0.9) -> Tuple[List[np.ndarray], int]:
        texts = [b["text"] for b in batch]
        torch.manual_seed(22000 + seed_offset)
        if torch.cuda.is_available():
            torch.cuda.manual_seed_all(22000 + seed_offset)
        return tts.generate_voice_clone(
            text=texts,
            language=["Chinese"] * len(batch),
            voice_clone_prompt=prompt_items * len(batch),
            non_streaming_mode=True,
            temperature=temp,
            top_p=top_p,
            repetition_penalty=1.05,
            max_new_tokens=estimate_max_new_tokens(texts),
        )

    while i < len(pending):
        # Conservative batch reduction on long paragraphs (>100 chars)
        next_len = len(pending[min(len(pending) - 1, i + cur_bs - 1)]["text"])
        eff_bs = cur_bs if next_len <= 95 else max(1, cur_bs // 2)
        batch = pending[i : i + eff_bs]
        try:
            bt0 = time.time()
            wavs, sr = synth_batch(batch, i)
            for item, raw_wav in zip(batch, wavs):
                chunk = trim_by_window_rms(raw_wav, sr)
                chunk = normalize_loudness(chunk, target_rms=0.085, max_peak=0.98)
                bad, ms, rms = is_clip_outlier(chunk, sr, item["text"])
                if bad:
                    outliers.append(item)
                # Always save latest clip + ms so even unretried items have audio
                encode_mp3_ffmpeg(chunk, sr, out_dir / f"{item['hash']}.mp3")
                done_index[item["hash"]] = ms
            done_count += len(batch)
            i += len(batch)
            save_json_atomic(index_file, done_index)
            elapsed = time.time() - began
            rate = done_count / max(elapsed, 0.1)
            eta_min = (len(pending) - done_count) / max(rate, 1e-6) / 60.0
            print(
                f"[{done_count}/{len(pending)}] +{len(batch)} in {time.time() - bt0:.1f}s | "
                f"speed={rate*60:.1f} lines/min | ETA={eta_min:.1f} min | total_saved={len(done_index)}",
                flush=True,
            )
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        except torch.cuda.OutOfMemoryError:
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            if eff_bs > 1:
                cur_bs = max(1, eff_bs // 2)
                print(f"OOM with batch={eff_bs}, reducing base batch_size -> {cur_bs}", flush=True)
            else:
                raise

    # Single-item retry pass for any duration/RMS outliers
    if outliers:
        print(f"Retrying {len(outliers)} duration/RMS outlier clips cleanly...", flush=True)
        fixed = 0
        for ri, item in enumerate(outliers):
            for attempt, seed in enumerate((91000 + ri, 97000 + ri)):
                wavs, sr = synth_batch([item], seed, temp=0.72, top_p=0.88)
                chunk = trim_by_window_rms(wavs[0], sr)
                chunk = normalize_loudness(chunk, target_rms=0.085, max_peak=0.98)
                bad, ms, rms = is_clip_outlier(chunk, sr, item["text"])
                if not bad or attempt == 1:
                    encode_mp3_ffmpeg(chunk, sr, out_dir / f"{item['hash']}.mp3")
                    done_index[item["hash"]] = ms
                    if not bad:
                        fixed += 1
                    break
        save_json_atomic(index_file, done_index)
        print(f"Outlier pass finished: {fixed}/{len(outliers)} recovered within normal range.", flush=True)

    if args.zip_out:
        zip_path = Path(args.zip_out)
        package_zip(out_dir, zip_path)
        size_mb = zip_path.stat().st_size / (1024 * 1024)
        print(f"Packaged -> {zip_path} ({size_mb:.1f} MB, {len(done_index)} files)", flush=True)


if __name__ == "__main__":
    main()
`;

function buildNotebook({manifestGzB64,promptGzB64,preDoneJson}){
 const splitB64=s=>s.match(/.{1,120}/g)??[];
 const md=text=>({cell_type:'markdown',metadata:{},source:text.split('\n').map((l,i,a)=>i<a.length-1?l+'\n':l)});
 const code=text=>({cell_type:'code',execution_count:null,metadata:{},outputs:[],source:text.split('\n').map((l,i,a)=>i<a.length-1?l+'\n':l)});

 const cells=[
  md(`# 全站动画 04 音色批量合成（Google Colab 一键包）

本笔记本已**内嵌全部待合成词单（4,482 句，已跳过已完成的首集 6 句）与 \`04.pt\` 克隆音色文件**，无需手动上传任何素材。

### 操作步骤
1. 打开 Google Colab，确认右上角菜单 **「代码执行程序 → 更改运行时类型」** 已选择 **GPU（推荐 L4 / A100，T4 免费版也可断点续跑）**。
2. 点击顶部 **「代码执行程序 → 全部运行」**。
3. （推荐）保持 \`mount_google_drive = True\`，进度会在每批后实时写入 Google Drive 的 \`MyDrive/tts_04_output/\`，即使断连重新运行也能从断点继续。
4. 全部完成后会自动下载 \`tts-04-output.zip\`（或从 Drive 取回），放回本地并交给我一键导入网站并部署。`),

  code(`#@title 1. 检查 GPU、挂载 Google Drive 并安装依赖
import subprocess, sys, os
from pathlib import Path

mount_google_drive = True #@param {type:"boolean"}

print("=== GPU 检测 ===")
res = subprocess.run(["nvidia-smi", "--query-gpu=name,memory.total,memory.free", "--format=csv,noheader"], capture_output=True, text=True)
print(res.stdout.strip() if res.returncode == 0 else "⚠️ 未检测到 GPU，请在菜单中启用 GPU 运行时！")

WORK_DIR = Path("/content/tts_04_work")
WORK_DIR.mkdir(parents=True, exist_ok=True)
OUT_DIR = WORK_DIR / "output"

if mount_google_drive:
    try:
        from google.colab import drive
        drive.mount("/content/drive")
        drive_out = Path("/content/drive/MyDrive/tts_04_output")
        drive_out.mkdir(parents=True, exist_ok=True)
        OUT_DIR = drive_out
        print("已将输出与断点目录挂载到 Google Drive:", OUT_DIR)
    except Exception as e:
        print("Drive 未挂载，将输出到本地临时目录:", OUT_DIR, e)

OUT_DIR.mkdir(parents=True, exist_ok=True)
os.chdir(str(WORK_DIR))

print("正在安装 sox、ffmpeg 与 Python 依赖...")
subprocess.run(["apt-get", "-qq", "update"], check=False)
subprocess.run(["apt-get", "-qq", "install", "-y", "sox", "libsox-fmt-all", "ffmpeg"], check=False)
subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "-U", "qwen-tts", "huggingface_hub", "soundfile"])
print("✅ 步骤 1 完成")`),

  code(`#@title 2. 解压内嵌词单（manifest.json）、04.pt 音色与合成脚本
import base64, gzip, json
from pathlib import Path

WORK_DIR = Path("/content/tts_04_work")
WORK_DIR.mkdir(parents=True, exist_ok=True)

MANIFEST_B64 = (
${splitB64(manifestGzB64).map(l=>`    "${l}"`).join('\n')}
)
PROMPT_B64 = (
${splitB64(promptGzB64).map(l=>`    "${l}"`).join('\n')}
)
PRE_DONE_JSON = ${JSON.stringify(preDoneJson)}

(WORK_DIR / "manifest.json").write_bytes(gzip.decompress(base64.b64decode(MANIFEST_B64)))
(WORK_DIR / "04.pt").write_bytes(gzip.decompress(base64.b64decode(PROMPT_B64)))
(WORK_DIR / "pre_done.json").write_text(PRE_DONE_JSON, encoding="utf-8")
(WORK_DIR / "batch_synthesize.py").write_text(${JSON.stringify(BATCH_SYNTH_PY)}, encoding="utf-8")

data = json.loads((WORK_DIR / "manifest.json").read_text(encoding="utf-8"))
print(f"✅ 解压完成：共 {data['animCount']} 个动画，{len(data['items'])} 句独立台词（04.pt 大小 {(WORK_DIR/'04.pt').stat().st_size} bytes）")`),

  code(`#@title 3. 开始批量合成（支持断点续传；可按 scope 分阶段或用 shard 多开并发）
import os, subprocess, sys
from pathlib import Path

scope = "all" #@param ["all", "classroom", "interview", "lazy", "ai_classroom,go_classroom,be_classroom,fe_classroom"]
shard = "1/1" #@param {type:"string"}
batch_size = 0 #@param {type:"integer"}  # 0 表示按当前 GPU 显存自动计算
model_path = "Qwen/Qwen3-TTS-12Hz-0.6B-Base" #@param {type:"string"}

WORK_DIR = Path("/content/tts_04_work")
os.chdir(str(WORK_DIR))
if "OUT_DIR" not in globals():
    drive_out = Path("/content/drive/MyDrive/tts_04_output")
    OUT_DIR = drive_out if Path("/content/drive/MyDrive").exists() else (WORK_DIR / "output")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
ZIP_PATH = WORK_DIR / "tts-04-output.zip"

cmd = [
    sys.executable, "batch_synthesize.py",
    "--manifest", "manifest.json",
    "--prompt", "04.pt",
    "--pre-done", "pre_done.json",
    "--out-dir", str(OUT_DIR),
    "--zip-out", str(ZIP_PATH),
    "--model-path", model_path,
    "--scope", scope,
    "--shard", shard,
    "--batch-size", str(batch_size),
]
proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
assert proc.stdout is not None
for line in proc.stdout:
    print(line, end="")
rc = proc.wait()
if rc != 0:
    raise RuntimeError(f"合成脚本退出码 {rc}，已生成文件保留在 {OUT_DIR}，重跑此格即可断点续传。")
print("✅ 本轮合成完成，压缩包位于:", ZIP_PATH)`),

  code(`#@title 4. 下载成品压缩包 tts-04-output.zip（随时运行此格即可把当前进度打包下载）
import subprocess, sys
from pathlib import Path

WORK_DIR = Path("/content/tts_04_work")
if "OUT_DIR" not in globals():
    drive_out = Path("/content/drive/MyDrive/tts_04_output")
    OUT_DIR = drive_out if Path("/content/drive/MyDrive").exists() else (WORK_DIR / "output")
ZIP_PATH = WORK_DIR / "tts-04-output.zip"

sys.path.insert(0, str(WORK_DIR))
from batch_synthesize import package_zip
package_zip(OUT_DIR, ZIP_PATH)
print(f"已打包 {ZIP_PATH} ({ZIP_PATH.stat().st_size / 1024 / 1024:.1f} MB)")

try:
    from google.colab import files
    files.download(str(ZIP_PATH))
except Exception:
    print("非 Colab 或弹窗被拦截：请直接从左侧文件栏 /content/tts_04_work/tts-04-output.zip 或 Google Drive/tts_04_output 下载。")`),
 ];

 return {
  nbformat:4,
  nbformat_minor:5,
  metadata:{
   kernelspec:{display_name:'Python 3',language:'python',name:'python3'},
   language_info:{name:'python',version:'3.11'},
   accelerator:'GPU',
   colab:{provenance:[],gpuType:'L4'},
  },
  cells,
 };
}

async function cmdExport(){
 const manifest=await collectManifest();
 mkdirSync(OUT_COLAB_DIR,{recursive:true});

 const manifestJson=JSON.stringify(manifest);
 writeFileSync(join(OUT_COLAB_DIR,'manifest.json'),manifestJson,'utf8');
 const ptSrc=join(VOICE_DIR,'04.pt');
 if(!existsSync(ptSrc))throw new Error(`找不到 ${ptSrc}`);
 copyFileSync(ptSrc,join(OUT_COLAB_DIR,'04.pt'));
 const jsonSrc=join(VOICE_DIR,'04.json');
 if(existsSync(jsonSrc))copyFileSync(jsonSrc,join(OUT_COLAB_DIR,'04.json'));
 writeFileSync(join(OUT_COLAB_DIR,'pre_done.json'),JSON.stringify(NEXT_TOKEN_DONE,null,2),'utf8');
 writeFileSync(join(OUT_COLAB_DIR,'batch_synthesize.py'),BATCH_SYNTH_PY,'utf8');

 const manifestGzB64=zlib.gzipSync(Buffer.from(manifestJson,'utf8'),{level:9}).toString('base64');
 const promptGzB64=zlib.gzipSync(readFileSync(ptSrc),{level:9}).toString('base64');
 const nb=buildNotebook({manifestGzB64,promptGzB64,preDoneJson:JSON.stringify(NEXT_TOKEN_DONE)});
 const nbPath=join(OUT_COLAB_DIR,'Qwen3_TTS_All_Animations_04.ipynb');
 writeFileSync(nbPath,JSON.stringify(nb,null,1),'utf8');

 const readme=`# 全站动画 04 音色 Colab / GPU 批量合成包

- 动画总数：${manifest.animCount} 个
- 去重台词数：${manifest.items.length} 句（其中 next-token 首集 6 句已在本地用 04.pt 合成并上线，已写入 pre_done.json 自动跳过）
- 输出格式：48 kHz 单声道 48 kbps MP3，文件名严格对应 \`public/tts/<sha256前16位>.mp3\`

## 方式一：Google Colab 一键运行（推荐）
直接把 \`Qwen3_TTS_All_Animations_04.ipynb\` 上传到 Google Colab（所有词单与 \`04.pt\` 已内嵌在笔记本里，无需另传文件）：
1. 运行时选择 GPU（L4 / A100 最快，免费 T4 也可挂 Google Drive 断点续跑）。
2. 点「全部运行」，完成后下载 \`tts-04-output.zip\`。
3. 把压缩包（或解压后的目录）路径发给我，或运行：
   \`node scripts/tts-04-sync.mjs import "下载路径/tts-04-output.zip"\`
4. 随后执行 \`npm run deploy\` 即可全站上线。

## 方式二：任意 Linux / Windows CUDA 服务器
把本目录上传到 GPU 机器，确保安装 \`qwen-tts\`、\`soundfile\` 与 \`ffmpeg\` 后运行：
\`\`\`bash
python batch_synthesize.py --out-dir output --zip-out tts-04-output.zip
\`\`\`
`;
 writeFileSync(join(OUT_COLAB_DIR,'README.md'),readme,'utf8');

 console.log(`Export complete -> ${OUT_COLAB_DIR}`);
 console.log(`  manifest.json: ${manifest.items.length} unique lines across ${manifest.animCount} animations`);
 console.log(`  Qwen3_TTS_All_Animations_04.ipynb: ${(statSync(nbPath).size/1024).toFixed(1)} KB`);
}

function collectSources(inputs){
 const dirs=[];
 const temps=[];
 for(const rawPath of inputs){
  const p=resolve(rawPath);
  if(!existsSync(p))throw new Error(`路径不存在：${p}`);
  if(statSync(p).isDirectory()){
   dirs.push(p);
  }else if(p.toLowerCase().endsWith('.zip')){
   const tmp=mkdtempSync(join(tmpdir(),'tts04-imp-'));
   temps.push(tmp);
   if(process.platform==='win32'){
    const ps=spawnSync('powershell',['-NoProfile','-Command',`Expand-Archive -LiteralPath '${p.replace(/'/g,"''")}' -DestinationPath '${tmp.replace(/'/g,"''")}' -Force`],{encoding:'utf8'});
    if(ps.status!==0)throw new Error(`解压失败 ${p}: ${ps.stderr||ps.stdout}`);
   }else{
    const uz=spawnSync('unzip',['-oq',p,'-d',tmp],{encoding:'utf8'});
    if(uz.status!==0)throw new Error(`解压失败 ${p}: ${uz.stderr||uz.stdout}`);
   }
   dirs.push(tmp);
  }else{
   throw new Error(`不支持的输入类型（请传 .zip 或目录）：${p}`);
  }
 }
 return {dirs,cleanup:()=>{for(const t of temps)rmSync(t,{recursive:true,force:true})}};
}

async function cmdImport(inputs){
 if(!inputs.length)throw new Error('请指定至少一个输出压缩包 (.zip) 或目录路径');
 const manifest=await collectManifest();
 const validHashes=new Set(manifest.items.map(it=>it.hash));
 const oldIndex=existsSync(INDEX_FILE)?JSON.parse(readFileSync(INDEX_FILE,'utf8')):{};
 mkdirSync(OUT_COLAB_DIR,{recursive:true});
 writeFileSync(join(OUT_COLAB_DIR,'index.backup.json'),JSON.stringify(oldIndex),'utf8');

 const {dirs,cleanup}=collectSources(inputs);
 let imported=0,skippedUnknown=0,skippedInvalid=0;
 try{
  const importedIndex={};
  const mp3Map=new Map();
  const scanDir=dir=>{
   for(const ent of readdirSync(dir,{withFileTypes:true})){
    const full=join(dir,ent.name);
    if(ent.isDirectory())scanDir(full);
    else if(ent.name==='index_04.json'||ent.name==='index.json'){
     Object.assign(importedIndex,JSON.parse(readFileSync(full,'utf8')));
    }else if(/^[0-9a-f]{16}\.mp3$/i.test(ent.name)){
     mp3Map.set(ent.name.slice(0,16).toLowerCase(),full);
    }
   }
  };
  for(const d of dirs)scanDir(d);

  for(const [h,srcFile] of mp3Map){
   if(!validHashes.has(h)){skippedUnknown++;continue}
   const size=statSync(srcFile).size;
   let ms=Number(importedIndex[h]);
   if(size<256||!Number.isFinite(ms)||ms<=0){skippedInvalid++;continue}
   ms=Math.round(ms);
   if(oldIndex[h]===ms)ms+=1; // 确保浏览器与 CDN URL query (?v=ms) 一定刷新缓存
   const dst=join(TTS_DIR,`${h}.mp3`);
   copyFileSync(srcFile,dst+'.tmp');
   renameSync(dst+'.tmp',dst);
   oldIndex[h]=ms;
   imported++;
  }

  const sorted=Object.fromEntries(Object.entries(oldIndex).sort(([a],[b])=>a<b?-1:1));
  const tmpIdx=INDEX_FILE+'.tmp';
  writeFileSync(tmpIdx,JSON.stringify(sorted),'utf8');
  renameSync(tmpIdx,INDEX_FILE);

  const missing=[...validHashes].filter(h=>!existsSync(join(TTS_DIR,`${h}.mp3`))||!sorted[h]);
  console.log(`Import finished: ${imported} MP3s imported/updated.`);
  if(skippedUnknown||skippedInvalid)console.log(`  skipped: ${skippedUnknown} unknown hashes, ${skippedInvalid} invalid files`);
  console.log(`Coverage across ${manifest.items.length} unique lines: ${manifest.items.length-missing.length}/${manifest.items.length} present on disk.`);
 }finally{
  cleanup();
 }
}

const [sub,...rest]=process.argv.slice(2);
if(sub==='export')await cmdExport();
else if(sub==='import')await cmdImport(rest);
else{
 console.error('Usage: node scripts/tts-04-sync.mjs <export | import <zip-or-dir...>>');
 process.exit(1);
}
