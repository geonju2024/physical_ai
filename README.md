# MUSE — Your Personal AI Stylist

MUSE는 사용자의 **체형, 패션 취향, 보유 의류, 날씨, 일정과 상황**을 종합적으로 이해해 오늘의 코디를 추천하고, 사용자가 가지고 있지 않은 옷은 **Virtual Try-On**으로 미리 확인할 수 있도록 하는 AI 스마트미러 프로젝트입니다.

핵심 목표는 단순한 가상 피팅 거울이 아니라, 사용할수록 사용자의 선택과 취향을 학습해 **집에서 개인화된 AI 스타일리스트를 경험하게 하는 것**입니다.

> **Understand Me → Style Me → Learn Me**

---

## 1. Problem

패션 코디에 익숙하지 않은 사용자는 매일 다음과 같은 고민을 반복합니다.

- 어떤 색과 실루엣이 나에게 어울리는지 판단하기 어렵다.
- 보유한 옷은 많지만 서로 어떻게 조합할지 모르겠다.
- 날씨, 발표, 데이트, 출근 등 상황에 맞는 옷을 고르기 어렵다.
- 온라인에서 발견한 옷이 실제 내 모습에 어울릴지 알기 어렵다.
- 기존 추천 서비스는 사용자의 옷장과 장기적인 취향을 충분히 반영하지 못한다.

MUSE는 집에서 매일 사용하는 **거울**을 사용자 개인의 스타일을 이해하고 의사결정을 도와주는 인터페이스로 확장합니다.

---

## 2. Core Experience

사용자가 거울 앞에 서면 MUSE는 다음 정보를 함께 고려합니다.

- **Body** — 체형 및 신체 비율
- **Style** — 선호하는 색, 핏, 분위기, 스타일
- **Closet** — 보유 의류, 신발, 가방, 액세서리
- **Context** — 날씨, 일정, 장소, TPO
- **Memory** — 이전 추천에 대한 좋아요/싫어요와 실제 착용 기록

이 정보를 바탕으로 MUSE는:

1. 오늘의 상황에 맞는 코디 후보를 생성하고
2. 사용자 취향과 적합도를 기준으로 순위를 매기며
3. 추천 이유를 설명하고
4. 필요한 경우 보유하지 않은 아이템을 가상으로 피팅해 보여주며
5. 사용자의 최종 선택을 다음 추천에 반영합니다.

---

## 3. Main Features

### AI Outfit Recommendation
사용자의 옷장, 취향, 체형 특성을 기반으로 상의·하의·아우터·신발·가방·액세서리를 조합합니다.

### Context-Aware Styling
기온, 날씨, 일정, 장소와 외출 목적을 반영해 같은 사용자에게도 상황별로 다른 코디를 제안합니다.

### Smart Closet
사용자가 촬영한 의류를 자동 분류하고 색상, 패턴, 카테고리, 스타일 태그 등의 메타데이터와 함께 관리합니다.

### Virtual Try-On
사용자가 보유하지 않은 의류나 구매를 고민하는 상품을 자신의 모습에 가상으로 적용해 확인합니다.

### Personal Style Memory
좋아요/싫어요, 실제 착용 여부, 반복 선택 등을 저장해 시간이 지날수록 개인화된 추천을 제공합니다.

---

## 4. MVP Scope

초기 버전에서는 아래 기능에 집중합니다.

- 사용자 프로필 및 취향 등록
- 디지털 옷장 등록 및 자동 태깅
- 날씨/TPO 기반 코디 추천
- 추천 이유 설명
- Virtual Try-On
- 사용자 피드백 저장 및 취향 업데이트

다음 기능은 확장 단계에서 추가합니다.

- 퍼스널컬러 분석
- 헤어스타일 추천 및 시뮬레이션
- 쇼핑몰 상품 자동 연동
- 음성 스타일리스트
- 옷장 사용 패턴 분석
- 정밀 신체 치수 측정

---

## 5. Input / Output

### Input

| 구분 | 데이터 |
|---|---|
| 사용자 | 전신 이미지/영상, 체형 비율, 선택적 키·사이즈 정보 |
| 취향 | 선호 색상, 핏, 스타일, 브랜드, 좋아요/싫어요 |
| 옷장 | 의류 사진, 카테고리, 색상, 패턴, 소재, 계절, 스타일 |
| 상황 | 날씨, 기온, 일정, 장소, 목적/TPO |
| 행동 | 추천 선택, 실제 착용, 재추천 요청, 거절 기록 |

### Output

| 구분 | 결과 |
|---|---|
| Outfit | 상의 + 하의 + 아우터 + 신발 + 가방/소품 조합 |
| Mood | Minimal, Casual, Chic, Street 등 추천 분위기 |
| Color | 추천 색 조합 |
| Explanation | 해당 코디를 추천한 이유 |
| Context Fit | 날씨·일정·TPO 적합성 |
| Virtual Try-On | 사용자의 모습에 적용된 가상 착장 |
| Alternatives | 대체 코디 및 부족한 아이템 제안 |

---

## 6. Proposed Tech Stack

### Hardware

- Two-way mirror 또는 기존 거울용 디스플레이 모듈
- 27~43 inch display
- 1080p/4K camera
- 고정 LED 조명
- Microphone / Speaker
- Raspberry Pi 5, Mini PC 또는 Jetson 계열 Edge Device
- 선택 사항: Depth Camera / IR Touch Frame

### Software

- **Frontend:** React / Next.js
- **Backend:** Python / FastAPI
- **Computer Vision:** OpenCV, MediaPipe Pose / Face Landmarker
- **Fashion Embedding:** CLIP / SigLIP / Fashion-domain embedding
- **Recommendation:** Rule-based filtering + Vector Retrieval + Ranking
- **Virtual Try-On:** VTO API 또는 오픈소스 VTON 모델
- **Database:** PostgreSQL + pgvector
- **External Context:** Weather API + Calendar API
- **Deployment:** Docker
- **Version Control:** GitHub

---

## 7. System Flow

```text
Camera / User Input
        ↓
Body · Style · Closet · Context
        ↓
      User Profile
        ↓
Candidate Outfit Generation
        ↓
Compatibility / Preference / TPO Ranking
        ↓
     AI Stylist
        ↓
Top-K Outfit Recommendation
        ↓
Virtual Try-On / Explanation
        ↓
User Feedback
        ↓
Personal Style Memory
        ↺
```

---

## 8. Repository Structure

```text
physical_ai/
├── README.md
├── index.html
├── images/
│   └── muse/
├── PRD/
│   └── PRD.md
├── report/
│   └── report.md
└── stitch/
    └── muse/
        ├── code.html
        └── DESIGN.md
```

- `index.html` — MUSE 제품 소개 홈페이지
- `images/muse/` — 홈페이지 로컬 이미지 자산
- `PRD/PRD.md` — 제품 요구사항 및 개발 범위
- `report/report.md` — 개발 과정과 회고
- `stitch/muse/` — Google Stitch 디자인 원본 및 디자인 시스템

---

## 9. Website

현재 랜딩페이지는 GitHub Pages 배포를 전제로 한 정적 HTML 구조이며, Stitch에서 설계한 MUSE 디자인 시스템을 기반으로 제작했습니다.

홈페이지의 핵심 메시지는 다음과 같습니다.

> **나를 가장 잘 아는 스타일리스트가, 내 거울 안에.**

---

## 10. Current Status

- [x] 제품 주제 재정의
- [x] MUSE 브랜드명 확정
- [x] 랜딩페이지 리디자인
- [x] Stitch 디자인 시스템 정리
- [x] GitHub Pages용 홈페이지 적용
- [x] PRD 작성
- [ ] Digital Closet Prototype
- [ ] Context-Aware Recommendation
- [ ] Virtual Try-On 연동
- [ ] Personal Style Memory 구현
- [ ] Smart Mirror Hardware Prototype
