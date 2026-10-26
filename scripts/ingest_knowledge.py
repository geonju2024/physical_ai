"""MUSE 챗봇 지식베이스 적재 스크립트.

홈페이지 HTML과 report/PRD 마크다운을 청크로 나누고, Gemini 임베딩을 만들어
Supabase(documents, document_chunks)에 넣는다. 같은 source는 지우고 다시 넣으므로
문서를 수정한 뒤 다시 실행하면 그대로 갱신된다.

사용법:
    pip install requests
    python scripts/ingest_knowledge.py --dry-run     # 청크만 확인 (API 호출 없음)
    python scripts/ingest_knowledge.py               # 실제 적재

환경변수 (또는 프로젝트 루트의 .env):
    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY, (선택) EMBED_MODEL
"""

from __future__ import annotations

import argparse
import os
import re
import sys
import time
from html.parser import HTMLParser
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent

# 챗봇이 참고할 자료. 새 페이지나 문서를 추가하면 여기에도 추가할 것.
SOURCES = [
    "index.html",
    "hardware.html",
    "inference-engine.html",
    "ai-research.html",
    "data-pipeline.html",
    "README.md",
    "PRD/PRD.md",
    "report/muse-hardware-report.md",
    "report/vision_models_report.md",
    "report/preprocess.md",
    # report/checklist.md 는 가구별 현장조사 기입 자료라 공개 챗봇 지식에서 제외
]

CHUNK_CHARS = 900       # 청크 최대 길이(문자)
MIN_CHUNK_CHARS = 80    # 이보다 짧은 섹션은 앞 청크에 붙임
EMBED_BATCH = 64
EMBED_DIM = 1024        # document_chunks.embedding 의 vector(1024) 와 Edge Function 의 EMBED_DIM 과 맞춰야 함


# ─────────────────────────────────────────────
# 텍스트 추출
# ─────────────────────────────────────────────
class _HtmlToMarkdown(HTMLParser):
    """본문 텍스트만 뽑고 h1~h4는 마크다운 헤딩으로 바꾼다."""

    SKIP = {"script", "style", "svg", "noscript", "head", "nav", "button"}
    BLOCK = {"p", "div", "section", "article", "li", "tr", "br", "header", "footer", "td", "th", "figcaption"}

    def __init__(self) -> None:
        super().__init__()
        self.out: list[str] = []
        self.skip_tag: str | None = None   # 건너뛰는 중인 태그 (같은 태그 중첩은 skip_depth 로 셈)
        self.skip_depth = 0
        self.heading: str | None = None

    def handle_starttag(self, tag, attrs):
        if self.skip_tag:
            if tag == self.skip_tag:
                self.skip_depth += 1
            return
        classes = dict(attrs).get("class") or ""
        # Material Symbols 아이콘은 'arrow_forward' 같은 리거처 텍스트라 본문에서 제외
        if tag in self.SKIP or "material-symbols" in classes:
            self.skip_tag, self.skip_depth = tag, 1
        elif re.fullmatch(r"h[1-4]", tag):
            self.heading = tag
            self.out.append("\n\n" + "#" * int(tag[1]) + " ")
        elif tag in self.BLOCK:
            self.out.append(" " if self.heading else "\n")  # 헤딩 안의 <br>은 한 줄 유지

    def handle_endtag(self, tag):
        if self.skip_tag:
            if tag == self.skip_tag:
                self.skip_depth -= 1
                if self.skip_depth == 0:
                    self.skip_tag = None
            return
        if tag == self.heading:
            self.heading = None
            self.out.append("\n")
        elif tag in self.BLOCK:
            self.out.append(" " if self.heading else "\n")

    def handle_data(self, data):
        if not self.skip_tag:
            text = re.sub(r"\s+", " ", data)
            if text.strip():
                self.out.append(text)

    def text(self) -> str:
        raw = "".join(self.out)
        lines = [re.sub(r" {2,}", " ", ln).strip() for ln in raw.splitlines()]
        return re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip()


def extract_text(path: Path) -> tuple[str, str]:
    """(title, markdown 본문)을 반환."""
    raw = path.read_text(encoding="utf-8")
    if path.suffix == ".html":
        m = re.search(r"<title>(.*?)</title>", raw, re.S | re.I)
        title = re.sub(r"\s+", " ", m.group(1)).strip() if m else path.stem
        parser = _HtmlToMarkdown()
        parser.feed(raw)
        return title.replace("&amp;", "&"), parser.text()
    m = re.search(r"^#\s+(.+)$", raw, re.M)
    return (m.group(1).strip() if m else path.stem), raw


# ─────────────────────────────────────────────
# 청크 분할
# ─────────────────────────────────────────────
def split_sections(markdown: str) -> list[tuple[str, str]]:
    """헤딩 기준으로 (섹션 경로, 본문) 목록을 만든다."""
    sections: list[tuple[str, str]] = []
    path: list[str] = []
    buf: list[str] = []

    def flush():
        body = "\n".join(buf).strip()
        if body:
            sections.append((" > ".join(path), body))
        buf.clear()

    in_code = False
    for line in markdown.splitlines():
        if line.strip().startswith("```"):
            in_code = not in_code
        m = None if in_code else re.match(r"^(#{1,4})\s+(.+)$", line)
        if m:
            flush()
            level = len(m.group(1))
            path[:] = path[: level - 1] + [m.group(2).strip()]
        else:
            buf.append(line)
    flush()
    return sections


def pack(text: str, limit: int) -> list[str]:
    """문단 단위로 limit 이내 조각으로 묶는다. 너무 긴 문단은 문장 단위로 자른다."""
    pieces: list[str] = []
    for para in re.split(r"\n\s*\n", text):
        para = para.strip()
        if not para:
            continue
        if len(para) <= limit:
            pieces.append(para)
        else:
            sentences = re.split(r"(?<=[.!?。다])\s+", para)
            cur = ""
            for s in sentences:
                while len(s) > limit:  # 문장 자체가 너무 길면 강제로 자름
                    if cur:
                        pieces.append(cur)
                        cur = ""
                    pieces.append(s[:limit])
                    s = s[limit:]
                if len(cur) + len(s) + 1 > limit and cur:
                    pieces.append(cur)
                    cur = s
                else:
                    cur = f"{cur} {s}".strip()
            if cur:
                pieces.append(cur)

    chunks: list[str] = []
    cur = ""
    for p in pieces:
        if len(cur) + len(p) + 2 > limit and cur:
            chunks.append(cur)
            cur = p
        else:
            cur = f"{cur}\n\n{p}".strip()
    if cur:
        chunks.append(cur)
    return chunks


def chunk_document(source: str, title: str, markdown: str) -> list[dict]:
    chunks: list[dict] = []
    for section, body in split_sections(markdown):
        for piece in pack(body, CHUNK_CHARS):
            if chunks and len(piece) < MIN_CHUNK_CHARS and chunks[-1]["metadata"]["section"] == section:
                chunks[-1]["body"] += "\n\n" + piece
                continue
            chunks.append({"body": piece, "metadata": {"source": source, "title": title, "section": section}})

    # 검색 품질을 위해 문서 제목/섹션을 본문 앞에 붙인다
    for i, c in enumerate(chunks):
        header = f"[{title}]" + (f" {c['metadata']['section']}" if c["metadata"]["section"] else "")
        c["content"] = f"{header}\n{c.pop('body')}"
        c["chunk_index"] = i
    return chunks


# ─────────────────────────────────────────────
# 외부 API
# ─────────────────────────────────────────────
def load_env() -> None:
    env_file = ROOT / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            m = re.match(r"^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$", line)
            if m and m.group(1) not in os.environ:
                os.environ[m.group(1)] = m.group(2).strip("'\"")


def embed(title: str, texts: list[str]) -> list[list[float]]:
    model = os.environ.get("EMBED_MODEL", "gemini-embedding-2")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:batchEmbedContents"
    vectors: list[list[float]] = []
    for i in range(0, len(texts), EMBED_BATCH):
        body = {
            "requests": [
                {
                    "model": f"models/{model}",
                    # gemini-embedding-2 는 task_type 대신 텍스트 접두어로 검색 대상 문서임을 표시
                    "content": {"parts": [{"text": f"title: {title} | text: {t}"}]},
                    "outputDimensionality": EMBED_DIM,
                }
                for t in texts[i : i + EMBED_BATCH]
            ]
        }
        for attempt in range(5):
            res = requests.post(url, headers={"x-goog-api-key": os.environ["GEMINI_API_KEY"]}, json=body, timeout=120)
            if res.status_code != 429:
                break
            wait = 15 * (attempt + 1)  # 무료 티어 분당 한도에 걸리면 잠시 쉬었다가 재시도
            print(f"    … 429 rate limit, {wait}초 대기")
            time.sleep(wait)
        res.raise_for_status()
        vectors.extend(e["values"] for e in res.json()["embeddings"])
    return vectors


class Supabase:
    def __init__(self) -> None:
        self.base = os.environ["SUPABASE_URL"].rstrip("/") + "/rest/v1"
        key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        self.headers = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}

    def replace_document(self, source: str, title: str, content: str, chunks: list[dict], vectors) -> None:
        # documents 삭제 시 document_chunks 는 cascade 로 함께 삭제됨
        r = requests.delete(f"{self.base}/documents", headers=self.headers, params={"source": f"eq.{source}"}, timeout=60)
        r.raise_for_status()

        r = requests.post(
            f"{self.base}/documents",
            headers={**self.headers, "Prefer": "return=representation"},
            json={"source": source, "title": title, "content": content},
            timeout=60,
        )
        r.raise_for_status()
        doc_id = r.json()[0]["id"]

        rows = [
            {
                "document_id": doc_id,
                "chunk_index": c["chunk_index"],
                "content": c["content"],
                "metadata": c["metadata"],
                "embedding": v,
            }
            for c, v in zip(chunks, vectors)
        ]
        for i in range(0, len(rows), 100):
            r = requests.post(f"{self.base}/document_chunks", headers=self.headers, json=rows[i : i + 100], timeout=120)
            r.raise_for_status()


# ─────────────────────────────────────────────
def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true", help="청크 결과만 출력하고 API는 호출하지 않음")
    ap.add_argument("--show", type=int, default=0, help="--dry-run 시 문서별로 앞 N개 청크 내용 출력")
    ap.add_argument("sources", nargs="*", help="특정 파일만 적재 (기본: SOURCES 전체)")
    args = ap.parse_args()

    sys.stdout.reconfigure(encoding="utf-8")  # Windows 콘솔(cp949)에서 '—' 같은 문자 출력 시 오류 방지
    load_env()
    sources = args.sources or SOURCES
    db = None if args.dry_run else Supabase()

    total = 0
    for source in sources:
        path = ROOT / source
        if not path.exists():
            print(f"  ! 건너뜀 (파일 없음): {source}")
            continue
        title, content = extract_text(path)
        chunks = chunk_document(source, title, content)
        total += len(chunks)
        print(f"- {source}: {len(chunks)} chunks  ({title})")

        if args.dry_run:
            for c in chunks[: args.show]:
                print("    ┌", c["content"][:300].replace("\n", "\n    │ "))
            continue

        vectors = embed(title, [c["content"] for c in chunks])
        db.replace_document(source, title, content, chunks, vectors)

    print(f"\n총 {total} chunks {'(dry-run)' if args.dry_run else '적재 완료'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
