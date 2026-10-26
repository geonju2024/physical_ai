-- MUSE 홈페이지 챗봇: RAG 지식베이스 + 대화 로그 + 리드 수집
-- 모든 테이블은 RLS ON + anon 정책 없음 → Edge Function(service role)만 접근 가능

create extension if not exists vector with schema extensions;

-- ─────────────────────────────────────────────
-- 지식베이스
-- ─────────────────────────────────────────────
create table public.documents (
  id          bigint generated always as identity primary key,
  source      text not null unique,     -- 'hardware.html', 'report/muse-hardware-report.md'
  title       text,
  content     text not null,
  updated_at  timestamptz not null default now()
);

create table public.document_chunks (
  id           bigint generated always as identity primary key,
  document_id  bigint not null references public.documents(id) on delete cascade,
  chunk_index  int not null,
  content      text not null,
  embedding    extensions.vector(1024) not null,  -- 임베딩 차원 (gemini-embedding-2, outputDimensionality=1024)
  metadata     jsonb not null default '{}'::jsonb,
  unique (document_id, chunk_index)
);

create index document_chunks_embedding_idx
  on public.document_chunks using hnsw (embedding extensions.vector_cosine_ops);

-- ─────────────────────────────────────────────
-- 대화 로그
-- ─────────────────────────────────────────────
create table public.conversations (
  id          uuid primary key default gen_random_uuid(),
  visitor_id  text not null,             -- 브라우저 localStorage UUID (비로그인 방문자)
  page_url    text,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index conversations_visitor_idx on public.conversations (visitor_id, created_at desc);

create table public.messages (
  id               bigint generated always as identity primary key,
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  role             text not null check (role in ('user', 'assistant')),
  content          text not null,
  model            text,
  input_tokens     int,
  output_tokens    int,
  stop_reason      text,
  source_chunk_ids bigint[],             -- 답변 근거로 쓰인 청크 (품질 분석용)
  feedback         smallint check (feedback in (-1, 1)),
  created_at       timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);

-- ─────────────────────────────────────────────
-- 도입/구매 문의 리드
-- ─────────────────────────────────────────────
create table public.leads (
  id               bigint generated always as identity primary key,
  conversation_id  uuid references public.conversations(id) on delete set null,
  name             text,
  email            text not null,
  company          text,
  message          text,
  created_at       timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- RLS: 켜고 정책은 만들지 않음 (= anon/authenticated 전면 차단)
-- ─────────────────────────────────────────────
alter table public.documents       enable row level security;
alter table public.document_chunks enable row level security;
alter table public.conversations   enable row level security;
alter table public.messages        enable row level security;
alter table public.leads           enable row level security;

-- ─────────────────────────────────────────────
-- 함수
-- ─────────────────────────────────────────────

-- 벡터 유사도 검색
create or replace function public.match_chunks(
  query_embedding extensions.vector(1024),
  match_count     int   default 6,
  min_similarity  float default 0.3
)
returns table (id bigint, content text, metadata jsonb, similarity float)
language sql stable
set search_path = public, extensions
as $$
  select c.id, c.content, c.metadata, 1 - (c.embedding <=> query_embedding) as similarity
  from document_chunks c
  where 1 - (c.embedding <=> query_embedding) >= min_similarity
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- 방문자별 최근 질문 수 (rate limit 용)
create or replace function public.visitor_message_count(p_visitor text, p_since timestamptz)
returns int
language sql stable
set search_path = public
as $$
  select count(*)::int
  from messages m
  join conversations c on c.id = m.conversation_id
  where c.visitor_id = p_visitor
    and m.role = 'user'
    and m.created_at > p_since;
$$;

-- Supabase는 public 함수에 anon EXECUTE를 기본 부여하므로 회수
revoke execute on function public.match_chunks(extensions.vector, int, float) from public, anon, authenticated;
revoke execute on function public.visitor_message_count(text, timestamptz)   from public, anon, authenticated;
grant  execute on function public.match_chunks(extensions.vector, int, float) to service_role;
grant  execute on function public.visitor_message_count(text, timestamptz)   to service_role;
