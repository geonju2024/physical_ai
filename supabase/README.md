# MUSE 홈페이지 챗봇 (Supabase + Gemini)

```
브라우저 위젯 (assets/chat/muse-chat.js)
   │  POST + SSE
   ▼
Edge Function  supabase/functions/chat   ── Gemini 임베딩 → pgvector 검색 → Gemini 3.5 Flash-Lite 스트리밍
   │  service role
   ▼
Postgres  documents · document_chunks · conversations · messages · leads   (RLS ON, anon 정책 없음)
```

채팅과 임베딩 모두 Google Gemini API 키 하나로 동작합니다. 둘 다 무료 티어가 있어 결제 수단 없이 시작할 수 있습니다.

> **무료 티어 주의:** 무료 티어로 보낸 입력·출력은 Google 제품 개선에 사용될 수 있습니다.
> 방문자 질문과 지식베이스 문서가 Google로 전송되므로, 공개해도 되는 자료만 적재하고
> 정식 오픈 시에는 AI Studio에서 결제(유료 티어)를 켜는 것을 권장합니다. 코드는 그대로 쓰면 됩니다.

## 1. 준비물

- Supabase 프로젝트 하나와 [Supabase CLI](https://supabase.com/docs/guides/cli) (`npx supabase ...` 로도 실행 가능)
- Gemini API 키: https://aistudio.google.com/apikey 에서 Google 계정으로 로그인 → **Create API key**

## 2. DB 생성

```bash
supabase login
supabase link --project-ref <PROJECT_REF>
supabase db push         # migrations/20261024000000_muse_chatbot.sql 적용
```

## 3. Edge Function 배포

```bash
supabase secrets set GEMINI_API_KEY=AIza...
supabase secrets set ALLOWED_ORIGINS=https://your-domain.com,http://localhost:5500
# 선택: supabase secrets set CHAT_MODEL=gemini-3.8-flash

supabase functions deploy chat --no-verify-jwt
```

`--no-verify-jwt`를 쓰는 이유: 방문자는 로그인하지 않으므로 JWT가 없습니다. 함수 내부에서
Origin 검사, visitorId 기반 rate limit(분당 8회, 하루 100회), 입력 길이 제한을 따로 겁니다.

## 4. 지식베이스 적재

```bash
cp .env.example .env     # SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY 입력
pip install requests
python scripts/ingest_knowledge.py --dry-run --show 2   # 청크 미리보기 (API 호출 없음)
python scripts/ingest_knowledge.py                      # 적재
```

페이지나 보고서를 수정한 뒤 다시 실행하면 해당 문서가 통째로 교체됩니다.
적재 대상은 스크립트 상단의 `SOURCES` 목록입니다. **여기 넣은 내용은 누구나 챗봇으로 꺼내 볼 수 있으니**
내부 자료나 개인정보가 담긴 문서는 넣지 마세요.

임베딩 모델을 바꾸면(예: `EMBED_MODEL` 변경) 기존 벡터와 호환되지 않으므로 **반드시 전체를 다시 적재**하세요.
Edge Function과 적재 스크립트는 같은 모델·같은 차원(1024)을 써야 합니다.
이전에 Voyage 임베딩으로 적재한 적이 있다면 위 적재 명령을 한 번 다시 실행하면 모두 교체됩니다.

## 5. 위젯 연결

`assets/chat/muse-chat.js`의 `DEFAULT_ENDPOINT`에서 `YOUR_PROJECT_REF`를 실제 값으로 바꾸면 됩니다.
5개 페이지(`index`, `hardware`, `inference-engine`, `ai-research`, `data-pipeline`)에는
`<script src="assets/chat/muse-chat.js" defer></script>`가 이미 들어가 있습니다.

## 6. 동작 확인

```bash
curl -N https://<PROJECT_REF>.supabase.co/functions/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"action":"chat","visitorId":"11111111-1111-4111-8111-111111111111","message":"MUSE가 뭐야?"}'
```

`data: {"type":"text",...}` 줄이 연속으로 나오면 정상입니다. 오류는 `supabase functions logs chat` 으로 확인합니다.
`Gemini 429` 는 무료 티어 분당/일일 한도 초과, `Gemini 400 ... API key not valid` 는 키 오류입니다.

## 7. 운영

- 👎 받은 답변 확인:
  ```sql
  select m.created_at, q.content as question, m.content as answer
  from messages m
  join lateral (select content from messages u
                where u.conversation_id = m.conversation_id and u.role = 'user' and u.created_at < m.created_at
                order by u.created_at desc limit 1) q on true
  where m.feedback = -1 order by m.created_at desc;
  ```
- 문의 리드: `select * from leads order by created_at desc;`
- 사용량 확인: `select model, sum(input_tokens), sum(output_tokens) from messages where role='assistant' group by model;`
- 답변 품질이 부족하면 Edge Function secret `CHAT_MODEL=gemini-3.8-flash`로 바꾸세요. 코드는 수정하지 않아도 됩니다.
