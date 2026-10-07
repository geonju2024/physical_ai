# MUSE 데이터 전처리 파이프라인 v0.1

가구 001 현장 조사 결과와 「MUSE 데이터 전처리 기법 및 순서 제안서」를 코드로 옮긴 패키지입니다.
6개 데이터 유형의 전처리를 각각 독립 파이프라인으로 구현했고, 합성 데이터로 가구 001의 어려운 조건
(행거 옷 배경, 베이지 벽, TV 반사, 혼합 조명, 짧은 정지 시간)을 재현해 테스트합니다.

## 실행

```bash
pip install opencv-contrib-python numpy scipy scikit-image scikit-learn pyyaml pytest
python -m pytest -q                              # 23개 테스트
python run_demo.py                               # 단계별 처리 시간·품질 플래그 출력
python run_demo.py --config household_001.yaml   # 가구별 파라미터 덮어쓰기
```

## 구조

| 모듈 | 제안서 | 위치 | 주요 내용 |
|---|---|---|---|
| `config.py` | 전체 | - | 모든 임계값(가정)과 근거 항목 번호. YAML 부분 덮어쓰기 |
| `common/quality.py` | 1장 4단계 | Edge | 블러·노출 클리핑·움직임 점수, 상위 k 프레임 선택 |
| `common/color.py` | 1·3장 | 공용 | 선형 공간 CCM(LUT 가속), 센서 색온도 기반 Bradford 순응, CLAHE, Lab K-means 대표색 |
| `depth/pipeline.py` | 2장 | Edge | 배경 깊이 모델, 반사·허상 제거, 시간→공간 필터, 작은 구멍 채움, 바닥 RANSAC 기울기 보정, 점군 다운샘플·이상치 제거 |
| `body/pipeline.py` | 1장 | Edge | 거리 확인, 색상/분석 브랜치 분리, 타깃 선택, 얼굴 식별, Depth 게이팅 배경 분리, 포즈 검증, 가림·신발 보정, 얼굴 익명화 |
| `wardrobe/pipeline.py` | 3장 | Cloud / Edge | 촬영 매트 ArUco 원근 보정, 패치 기반 CCM, 상대 밝기 하이라이트 제외, 투명 소재 알파, 패턴 보존 리사이즈, 실측, 중복 탐지, 착용 매칭 |
| `catalog/pipeline.py` | 4장 | Cloud 배치 | pHash 중복 제거, 유형별 대표 이미지 선택, 누끼 알파, 해상도 정규화, 색상 신뢰도, 사이즈표 정규화(단면→둘레), 메타 결측 보완 |
| `context/pipeline.py` | 5장 | Cloud | 체감온도, 외출 시간창, 이동수단 가중치, 구글·네이버 일정 병합, 약어 사전 → LLM → 사용자 질문 순 라벨링 |
| `feedback/pipeline.py` | 6장 | Edge 큐 + Cloud | SQLite 멱등 큐, 연타 병합, 기기 시계 보정, 사용자 귀속, 세션화, 사유별 라벨 정제, 시간 감쇠, IPS, 피드백 피로 보정 |
| `models/` | - | - | 딥러닝 모델 인터페이스(Protocol)와 개발용 베이스라인 |
| `synthetic.py` | - | - | 테스트·데모용 합성 장면 |

## 설계상 확정한 사항 (제안서 대비 변경·보완)

구현 중 검증을 거치며 제안서에서 다음을 바꾸거나 구체화했습니다.

1. **깊이 기준값은 타깃 박스 안에서만 산출합니다.** 파서가 배경 행거 옷까지 '상의'로 잡으면, 전체 상의 영역의 깊이 중앙값이 배경 쪽으로 끌려가 게이팅이 실패했습니다 [A5].
2. **깊이 필터 순서를 시간 → 공간으로 바꿨습니다.** 공간 필터를 1회만 돌려 일상 모드 깊이 처리가 약 1,100ms에서 약 125ms로 줄었습니다.
3. **움직임 판정은 옵티컬 플로 대신 축소 프레임 차이를 씁니다.** Farneback은 프레임당 약 40ms로 15프레임 버스트에서 예산을 넘깁니다. 임계값 단위가 픽셀에서 밝기 차(0~255)로 바뀌었습니다.
4. **펼침 촬영 블러 검사는 마커 영역에서만 합니다.** 민무늬 옷과 매트는 선명해도 전체 Laplacian 분산이 낮게 나와 정상 사진을 거부했습니다.
5. **정반사 하이라이트는 의류 자체 밝기 대비로 판정합니다.** 절대 밝기만 보면 흰 옷 전체(99%)가 하이라이트로 분류되어 색 추출이 불가능했습니다 [D4][D6].
6. **촬영 매트 배경은 유채색(그린)으로 정했습니다.** 가구 001 옷장이 검정·흰색 위주라 무채색 매트에서는 흰 옷 경계가 사라집니다.
7. **일정 중복 병합 전에 약어를 먼저 풉니다.** "A사 ㅁㅌ"와 "A사 미팅"이 다른 일정으로 남는 문제를 해결했습니다 [F2].

## 실제 모델 연결

`models/interfaces.py`의 Protocol 시그니처에 맞춰 구현체를 주입하면 됩니다. 테스트에 쓰인 `Fixed*`
클래스는 고정값 주입용이며, `MatBackgroundSegmenter`, `ColorHistEmbedder`, `BorderTypeClassifier`는
동작하지만 성능이 제한적인 베이스라인입니다.

| 인터페이스 | 권장 구현 | 실행 위치 |
|---|---|---|
| `PersonDetector` | YOLO 계열 (TensorRT) | Edge |
| `HumanParser` | SCHP 계열 (TensorRT) | Edge |
| `PoseEstimator` | RTMPose (TensorRT) | Edge |
| `FaceEmbedder` | ArcFace 계열 | Edge 전용 |
| `GarmentSegmenter` | 의류 검출 + SAM 2 | Cloud |
| `ImageEmbedder` | SigLIP 파인튜닝 (옷장·쇼핑몰 공용) | Cloud, 옷장 임베딩은 Edge 캐시 |
| `ImageTypeClassifier` | SigLIP 4분류 | Cloud |
| `TextLabeler` | LLM (약어 사전으로 안 풀릴 때만 호출) | Cloud |

## 처리 시간 (개발 컨테이너 CPU, 딥러닝 모델 제외)

| 경로 | 측정값 | 비고 |
|---|---|---|
| 신체 RGB 일상 모드 | 약 170ms | 워밍업 후. 버스트 촬영 0.5초와 모델 추론 시간은 별도 |
| 깊이 일상 모드 | 약 125ms | 점군 생성 생략 |
| 깊이 측정 모드 | 약 690ms | 점군·바닥 평면 포함 |
| 옷장 펼침 촬영 | 약 500ms | Cloud, 지연 제약 없음 |

Jetson Orin NX에서는 CPU 성능이 이보다 낮으므로, 실기에서 `bilateralFilter`·`dominant_colors`는
VPI/CUDA 대체 여부를 측정해 결정해야 합니다.

## 아직 가정인 부분

- 모든 임계값은 초기값입니다. J 샘플 데이터 확보 후 `household_001.yaml` 형식으로 실측값을 반영하세요.
- 신발 높이 오프셋, 이동수단 가중치, 색상명 Lab 사전, 약어 사전은 사내 데이터로 교체가 필요합니다.
- 촬영 매트 사양(크기, 패치 색, 배경색)은 인쇄 후 분광 측정으로 `MatSpec.patches`의 기준값을 확정해야 합니다.
- RGB-D 정합은 카메라 SDK 하드웨어 정렬을 전제로 하며, 이 코드는 타임스탬프 동기만 검증합니다.
- 반복 일정 전개는 캘린더 API 옵션으로 처리된다고 가정했습니다.
