# PRD — MUSE: AI Personal Stylist Smart Mirror

- **Product:** MUSE
- **Category:** Fashion Tech / Smart Mirror / Personalized AI
- **Document Version:** v1.0
- **Updated:** 2026-10-07

---

## 1. Product Overview

### 1.1 한 문장 정의

**MUSE는 사용자의 체형, 패션 취향, 보유 의류, 날씨와 일정 등을 이해해 상황에 맞는 코디를 추천하고, 없는 옷은 가상 피팅으로 확인할 수 있는 개인화 AI 스마트미러이다.**

### 1.2 Product Vision

MUSE의 목표는 단순히 옷을 가상으로 입혀주는 스마트미러를 만드는 것이 아니다.

사용자가 매일 거울 앞에서 반복하는 **“오늘 뭐 입지?”**라는 의사결정을 줄이고, 사용자의 스타일과 생활 맥락을 장기간 학습하여 시간이 지날수록 더 개인화되는 **집 안의 AI 스타일리스트**를 구현한다.

핵심 경험은 다음 문장으로 정의한다.

> **Understand Me → Style Me → Learn Me**

---

## 2. Problem Definition

패션 코디에 어려움을 느끼는 사용자는 다음 문제를 겪는다.

1. 자신의 체형과 분위기에 어떤 옷이 어울리는지 판단하기 어렵다.
2. 이미 가지고 있는 옷의 조합을 충분히 활용하지 못한다.
3. 날씨, 장소, 일정, 격식 수준 등 상황에 맞는 코디를 매번 직접 고민해야 한다.
4. 온라인 상품이 실제 자신의 체형과 전체 이미지에 어울리는지 구매 전에 확인하기 어렵다.
5. 기존 패션 추천 서비스는 사용자의 실제 옷장, 장기적인 선호 변화, 일상 맥락을 한 번에 반영하기 어렵다.

MUSE는 이 문제를 **거울이라는 일상적인 인터페이스**를 통해 해결한다.

---

## 3. Target User

### Primary User

- 패션에 관심은 있지만 코디에 자신이 없는 사용자
- 매일 옷을 고르는 데 시간이 오래 걸리는 사용자
- 온라인 쇼핑 시 실제 착용 모습을 확인하고 싶은 사용자
- 자신의 옷장을 더 효율적으로 활용하고 싶은 사용자

### Secondary User

- 일정/TPO별 코디 추천이 필요한 직장인·학생
- 자신의 스타일을 탐색하고 싶은 사용자
- 새로운 패션 아이템을 구매하기 전에 기존 옷과의 조화를 확인하고 싶은 사용자

---

## 4. User Value Proposition

MUSE는 사용자에게 다음 가치를 제공한다.

### Decision Support
“무엇을 입을지”를 처음부터 고민하는 대신 AI가 후보를 좁혀준다.

### Personalization
모든 사용자에게 같은 유행을 추천하지 않고 개인의 실제 선택을 학습한다.

### Closet Utilization
새로운 제품 구매만 유도하는 것이 아니라 사용자가 이미 가진 옷을 우선 활용한다.

### Context Awareness
날씨와 일정, 장소, 목적에 맞춰 같은 사람에게도 다른 스타일을 추천한다.

### Visual Confidence
보유하지 않은 아이템은 Virtual Try-On으로 자신의 모습에서 미리 확인할 수 있다.

---

## 5. Core User Scenario

### Morning Styling Scenario

1. 사용자가 아침에 MUSE 앞에 선다.
2. 시스템이 사용자 프로필과 오늘의 날씨/일정을 불러온다.
3. 현재 옷장과 선호 스타일을 기준으로 코디 후보를 생성한다.
4. 체형, 색 조합, 개인 취향, 날씨, TPO 기준으로 후보를 랭킹한다.
5. Top 3 코디와 추천 이유를 거울에 표시한다.
6. 사용자는 코디를 비교하거나 특정 아이템 교체를 요청한다.
7. 보유하지 않은 아이템은 Virtual Try-On으로 확인한다.
8. 사용자가 실제 착용할 룩을 선택한다.
9. 선택 결과를 Personal Style Memory에 저장한다.
10. 다음 추천에서 해당 피드백을 반영한다.

---

## 6. Functional Requirements

### FR-01. User Profile

시스템은 사용자별 프로필을 저장할 수 있어야 한다.

저장 정보 예시:

- 키 및 평소 의류 사이즈 (선택)
- 신체 비율 특징
- 선호 핏
- 선호 색상
- 선호 스타일
- 비선호 스타일
- 자주 선택하는 카테고리

**Priority:** Must

---

### FR-02. Body / Silhouette Analysis

카메라 입력으로부터 전신 포즈를 인식하고 코디 추천에 활용할 수 있는 신체 비율 정보를 생성한다.

초기 MVP에서는 정확한 신체 치수 측정보다 다음과 같은 **상대적 비율** 분석에 집중한다.

- shoulder / hip ratio
- torso / leg ratio
- body orientation
- 주요 관절 위치

**Priority:** Should

---

### FR-03. Smart Closet

사용자는 자신의 의류·신발·가방·액세서리를 등록할 수 있어야 한다.

의류 등록 시 시스템은 가능한 범위에서 다음 정보를 자동 추출한다.

- category
- subcategory
- color
- pattern
- silhouette
- season
- formality
- style tags
- image embedding

사용자는 자동 태그 결과를 수정할 수 있어야 한다.

**Priority:** Must

---

### FR-04. Context Integration

시스템은 다음 상황 정보를 추천에 활용한다.

- 현재/예상 기온
- 강수 여부
- 계절
- 사용자의 일정
- 장소
- 외출 목적/TPO

일정 연동이 없는 경우 사용자가 직접 상황을 입력할 수 있어야 한다.

**Priority:** Must

---

### FR-05. Outfit Candidate Generation

사용자의 옷장을 기반으로 여러 개의 착장 조합을 생성한다.

기본 구성:

- Top
- Bottom
- Outerwear (optional)
- Shoes
- Bag / Accessory (optional)

**Priority:** Must

---

### FR-06. Outfit Ranking

각 후보는 최소 다음 요소를 기준으로 평가한다.

- Fashion Compatibility
- Personal Preference
- Body/Silhouette Compatibility
- Weather Suitability
- Occasion/TPO Suitability

개념적인 최종 점수 예시는 다음과 같다.

```text
Final Score =
  w1 × Fashion Compatibility
+ w2 × Personal Preference
+ w3 × Body Compatibility
+ w4 × Weather Suitability
+ w5 × TPO Suitability
```

초기 버전의 가중치는 휴리스틱으로 설정하고, 사용자 데이터가 쌓이면 개인별 가중치를 업데이트할 수 있다.

**Priority:** Must

---

### FR-07. Recommendation Explanation

MUSE는 결과만 보여주는 것이 아니라 추천 이유를 자연어로 설명해야 한다.

예:

> 오늘 오후 발표 일정이 있어 평소 선호하는 와이드 실루엣은 유지하면서, 캐주얼함을 줄이기 위해 블랙 재킷과 차콜 슬랙스를 조합했어요.

**Priority:** Must

---

### FR-08. Virtual Try-On

사용자는 추천된 외부 의류 또는 아직 보유하지 않은 의류를 자신의 이미지에 가상 적용할 수 있어야 한다.

기본 입력:

- Person image
- Garment image

기본 출력:

- Virtual try-on image

MVP에서는 별도 API 또는 검증된 오픈소스 모델을 활용할 수 있다.

**Priority:** Must

---

### FR-09. Personal Style Memory

시스템은 다음 사용자 행동을 저장한다.

- 추천 코디 좋아요/싫어요
- 실제 착용 여부
- 특정 아이템 교체
- 반복 선택 아이템
- 거절한 색상/핏/스타일
- 추천 후 구매 여부 (향후)

이 기록은 이후 후보 랭킹과 설명에 반영한다.

**Priority:** Must

---

### FR-10. External Item Recommendation

옷장에 적합한 아이템이 없을 경우 부족한 카테고리를 제안할 수 있다.

예:

> 현재 코디에는 실버 숄더백이 가장 잘 어울리지만 내 옷장에는 유사 아이템이 없습니다.

MVP에서는 실제 결제 연동이 아니라 **추천 후보 제시 + Virtual Try-On**까지만 구현한다.

**Priority:** Should

---

## 7. Input Data

| Input Group | Data | Source |
|---|---|---|
| Body | RGB image/video, pose landmarks, body ratios | Mirror camera |
| User Profile | size, preferred fit, style, colors | User onboarding |
| Closet | garment image + metadata + embedding | User upload/camera |
| Context | weather, temperature, rain | Weather API |
| Schedule | event title/category/time | Calendar or manual input |
| Feedback | like/dislike/wear/replace | Mirror UI |
| External Item | product image + metadata | API/manual dataset |

### 개인정보 원칙

- 원본 전신/얼굴 영상은 꼭 필요한 경우에만 저장한다.
- 가능한 정보는 landmark, embedding, preference vector 등 구조화된 형태로 변환한다.
- 사용자는 자신의 프로필과 기록 삭제 기능을 제공받아야 한다.
- 카메라가 활성화된 상태를 UI에서 명확하게 알린다.

---

## 8. Output Data

| Output | Description |
|---|---|
| Recommended Outfit | 조합된 의류 및 소품 |
| Match Score | 개인화/상황 적합도 |
| Mood | 추천 스타일 분위기 |
| Color Palette | 해당 룩의 주요 색 조합 |
| Recommendation Reason | 추천 근거 |
| Alternative Looks | Top-K 대체 코디 |
| Virtual Try-On Image | 사용자의 가상 착용 결과 |
| Missing Item | 현재 옷장에 부족한 추천 아이템 |
| Updated Preference | 피드백 후 갱신된 스타일 선호 정보 |

---

## 9. Technical Architecture

```text
                   ┌──────────────────┐
                   │   MUSE Mirror    │
                   │ Camera / UI / Mic│
                   └────────┬─────────┘
                            │
             ┌──────────────┼──────────────┐
             │              │              │
         Body CV        User Input      Closet Input
             │              │              │
             └──────────────┼──────────────┘
                            ↓
                      User Profile
                            │
       Weather ─────────────┼──────────── Calendar
                            │
                            ↓
                  Candidate Generator
                            ↓
                     Outfit Ranker
                            ↓
                     AI Stylist
                    ↙          ↘
          Recommendation      Virtual Try-On
                    ↘          ↙
                       Mirror UI
                            ↓
                     User Feedback
                            ↓
                 Personal Style Memory
                            ↺
```

---

## 10. Recommended Development Stack

### Edge / Hardware

| Component | Purpose |
|---|---|
| Two-way mirror / display | 거울 UI |
| 1080p or 4K camera | 전신 및 의류 촬영 |
| LED lighting | 안정적인 이미지 입력 |
| Microphone / speaker | 음성 상호작용 확장 |
| Raspberry Pi 5 / Mini PC | UI, 센서, 경량 CV |
| Optional Jetson | Edge AI 추론 확장 |
| Optional depth camera | 정밀 체형 분석 |

### Software

| Layer | Technology |
|---|---|
| Frontend | React / Next.js |
| Backend | Python / FastAPI |
| CV | OpenCV, MediaPipe |
| Detection/Parsing | YOLO / segmentation model |
| Embedding | CLIP / SigLIP / fashion embedding |
| Recommendation | rules + vector retrieval + ranking |
| AI Stylist | multimodal LLM/VLM |
| VTO | API or open-source VTON |
| DB | PostgreSQL |
| Vector Search | pgvector |
| Cache | Redis (optional) |
| Storage | local/S3-compatible storage |
| Deployment | Docker |

---

## 11. MVP Definition

### MVP Goal

다음 질문에 답할 수 있는 프로토타입을 완성한다.

> **“MUSE가 실제 사용자에게 오늘 입을 옷을 개인화해서 추천하고, 필요한 경우 거울에서 가상 피팅까지 보여줄 수 있는가?”**

### MVP Must Have

- [ ] 사용자 프로필 등록
- [ ] 최소 10~20개 의류로 Digital Closet 구성
- [ ] 의류 카테고리/색상/스타일 태깅
- [ ] 날씨 및 TPO 입력
- [ ] Outfit candidate generation
- [ ] Top 3 코디 추천
- [ ] 추천 이유 설명
- [ ] Virtual Try-On 최소 1개 흐름
- [ ] 좋아요/싫어요 저장
- [ ] 다음 추천에 피드백 반영
- [ ] 스마트미러 형태의 UI 시연

### Out of Scope for MVP

- 완전한 쇼핑몰 결제 연동
- 실시간 30fps 생성형 Virtual Try-On
- 의료/정밀 수준 신체 치수 측정
- 상용 퍼스널컬러 진단
- 헤어 생성 모델
- 다수 사용자 동시 서비스
- 실제 양산 하드웨어 설계

---

## 12. Non-Functional Requirements

### Performance

- 기본 추천 결과는 사용자가 기다린다고 느끼지 않을 정도로 빠르게 제공한다.
- 무거운 VTO는 별도 로딩 상태를 제공한다.
- 실시간 카메라 UI와 생성형 모델 호출을 분리한다.

### Privacy

- 카메라 활성화 상태를 명확히 표시한다.
- 불필요한 원본 영상 저장을 최소화한다.
- 사용자 데이터 삭제 기능을 고려한다.

### Reliability

- 외부 Weather/VTO API 오류 시 기본 추천 기능은 유지되어야 한다.
- 외부 API에 장애가 발생하면 명확한 fallback 메시지를 제공한다.

### Usability

- 거울 앞에서 1~2m 떨어진 상태에서도 핵심 UI를 읽을 수 있어야 한다.
- 아침 사용 상황을 고려해 주요 선택 단계는 가능한 적은 터치로 완료한다.

---

## 13. Success Metrics

초기 사용자 테스트에서는 다음을 측정한다.

### Recommendation

- Top-3 Recommendation Acceptance Rate
- 실제 착용 선택률
- 재추천 요청률
- 추천 만족도 (5점 척도)
- TPO 적합도 평가
- 코디 선택 시간 감소

### Personalization

- 초기 추천 대비 반복 사용 후 만족도 변화
- 좋아요/싫어요 반영 정확도
- 사용자별 선택 스타일 분포의 일관성

### Virtual Try-On

- 사용자가 느끼는 garment similarity
- 시각적 자연스러움
- 생성 성공률
- inference latency

### Product Experience

- “매일 사용하고 싶은가?”
- “코디 결정에 실제 도움이 되었는가?”
- “MUSE 추천을 신뢰할 수 있는가?”

---

## 14. Future Roadmap

### Phase 1 — AI Styling MVP
Digital Closet + Context Recommendation + VTO + Feedback

### Phase 2 — Personalization
장기 Style Memory + 개인별 Ranker + Voice Interaction

### Phase 3 — Full Style Intelligence
Personal Color + Hair + Accessory + Shopping Recommendation

### Phase 4 — Productization
Edge inference 최적화 + 하드웨어 디자인 + 멀티유저 + 개인정보/보안 설계

---

## 15. Product Principles

MUSE 개발 시 다음 원칙을 우선한다.

1. **Styling First** — 가상피팅 자체보다 좋은 스타일 추천이 먼저다.
2. **Closet First** — 새 제품 판매보다 사용자가 가진 옷의 활용을 우선한다.
3. **Context Matters** — 같은 사용자에게 항상 같은 스타일을 추천하지 않는다.
4. **Explain the Why** — AI가 왜 이 룩을 추천했는지 알 수 있어야 한다.
5. **Learn Continuously** — 사용자의 실제 선택이 가장 중요한 스타일 데이터다.
6. **Mirror, Not Dashboard** — 복잡한 분석 화면보다 거울 앞에서 빠르게 결정할 수 있는 UX를 만든다.
