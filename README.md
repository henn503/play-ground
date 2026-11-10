# ☁️ 구름 위 쉼터

친구들과 함께 걷고, 이야기하고, 흔적을 남기는 구름 위 3D 공간이에요.

라벤더 하늘 아래 동그란 구름섬 디오라마예요. 가운데 광장을 중심으로 장소들이 둘러 있어요.

- **함께 돌아다니기**: 링크로 들어온 친구들이 실시간으로 보여요. 말풍선 채팅, 감정 표현, 점프를 할 수 있고, 광장 벤치와 정자에 앉을 수 있어요.
- **가운데 광장 · 하트 동상**: 돌바닥 광장 한가운데의 하트 동상 앞에서 X를 누르면 두 팔 벌려 숭배할 수 있어요. 가로등, 벤치, 꽃밭, 분홍 나무가 둘러 있어요.
- **방명록 게시판 (위)**: 글을 쓰거나, 그림을 그리거나, 사진을 넣고 그 위에 낙서·글자를 더해서 쪽지로 붙여요. 최근 6장은 광장 게시판에도 꽂히고, 내가 붙인 쪽지는 뗄 수 있어요.
- **밴드 무대 (오른쪽 위)**: 무대에 올라가거나 악기를 클릭하면 기타 G · 베이스 B · 드럼 R · 건반 P 버튼이 떠요. 여러 명이 각자 다른 악기를 잡으면 같은 박자로 합주가 돼요. 무대 뒤에는 천국의 문이 있어요.
- **유니콘 놀이터 (앞쪽)**: 유니콘 그네(두 자리)와 유니콘 시소가 있어요. 가까이 가서 E로 타고 E로 내려요. 시소는 둘이 양쪽에 타면 오르락내리락해요.
- **🎄 소원 트리 (왼쪽, 눈놀이터 옆)**: 오너먼트 색을 골라 소원을 적고 오너먼트에 그림도 그려서 달아요. 트리의 오너먼트를 누르면 크게 볼 수 있어요. 섬 위로 함박눈이 내려요. 내가 단 소원은 뗄 수 있어요.
- **구름 온천 (오른쪽)**: 바위로 둘러싸인 온천에 들어가면 머리에 수건이 올라가고, 시간이 지나면 얼굴이 발그레해져요.
- **눈놀이터 (왼쪽)**: 눈사람 근처에서 X(또는 눈사람 클릭)로 눈덩이를 던져요. 던질 때 화난 표정으로 머리에서 김이 나요. 오른쪽 위 🔊 버튼으로 소리를 켜고 끌 수 있어요.
- **그뤠잇·스튜핏 판정소**: 살까 말까 고민되는 물건 사진을 올리면 친구들이 판정해 주고, 익명 코멘트도 달아 줘요.

빌드 과정이 없는 순수 HTML/CSS/JavaScript라서, GitHub에 올리기만 하면 바로 웹사이트가 돼요.
여러 명이 동시에 접속하는 기능은 **Firebase**(구글의 무료 서버 서비스)로 동작해요.

---

## 전체 순서 한눈에 보기

1. Firebase 프로젝트 만들기
2. 익명 로그인 켜기
3. Realtime Database 만들기
4. 보안 규칙 게시하기
5. 설정값을 `js/firebase-config.js`에 붙여넣기
6. GitHub에 올리기
7. GitHub Pages 켜기 → 친구들에게 링크 공유 🎉

처음 하면 20~30분쯤 걸려요. 모두 **무료 요금제(Spark)** 안에서 할 수 있고, 카드 등록은 필요 없어요.

> 💡 5단계 전까지는 사이트가 열리긴 하지만 다른 사람과 연결되지 않아요. 연결이 안 되는 이유는 브라우저 개발자 도구(F12)의 Console에 `[cloud-heaven]`으로 시작하는 메시지로 남아요.

---

## 1. Firebase 프로젝트 만들기

1. <https://console.firebase.google.com> 에 구글 계정으로 로그인해요.
2. **프로젝트 만들기**(또는 **프로젝트 추가**)를 눌러요.
3. 프로젝트 이름을 정해요. 예: `cloud-heaven`
4. Google 애널리틱스는 **꺼도 괜찮아요**.
5. **프로젝트 만들기**를 누르고 잠시 기다려요.

## 2. 익명 로그인 켜기

친구들이 회원가입 없이 링크만으로 들어올 수 있게 해 주는 설정이에요.

1. 왼쪽 메뉴에서 **빌드 → Authentication**으로 가서 **시작하기**를 눌러요.
2. **로그인 방법(Sign-in method)** 탭에서 **익명(Anonymous)**을 골라요.
3. **사용 설정**을 켜고 **저장**해요.

## 3. Realtime Database 만들기

1. 왼쪽 메뉴에서 **빌드 → Realtime Database**로 가서 **데이터베이스 만들기**를 눌러요.
2. 위치는 **싱가포르(asia-southeast1)**를 추천해요. 한국에서 가장 가까워요.
3. 보안 규칙은 **잠금 모드로 시작**을 골라요. 다음 단계에서 제대로 된 규칙으로 바꿔요.
4. **사용 설정**을 눌러요.

## 4. 보안 규칙 게시하기

> 🔁 **이미 게시했다면 다시 게시해 주세요.** 소원 트리(wishes)가 추가되면서 규칙이 바뀌었어요.

누가 무엇을 쓰고 지울 수 있는지 정하는 규칙이에요. 이 규칙이 장난과 데이터 훼손을 막아 줘요.

1. Realtime Database 화면에서 **규칙** 탭을 열어요.
2. 안에 있는 내용을 **모두 지우고**, 이 폴더의 `database.rules.json` 파일 내용을 **통째로** 붙여넣어요.
3. **게시**를 눌러요.

규칙이 하는 일은 이래요.

| 데이터 | 읽기 | 쓰기 |
|---|---|---|
| 접속자 위치·모습 | 접속한 사람 모두 | 자기 것만 |
| 채팅 | 접속한 사람 모두 | 새로 쓰기만 가능, 100자 이하 · **30분 지난 대화는 접속자 누구나 청소(삭제) 가능** |
| 방명록 쪽지·그림 | 접속한 사람 모두 | 붙이기 + **자기가 붙인 것만** 떼기, 글 200자 이하 (그림만 있어도 됨) |
| 판정소 물건·사진 | 접속한 사람 모두 | 올리기 + **자기가 올린 것만** 지우기 |
| 판정 투표 | 접속한 사람 모두 | **자기 표만** |
| 익명 코멘트 | 접속한 사람 모두 | 새로 쓰기만 가능, 100자 이하, **작성자 정보 저장 안 함** · 물건 주인은 자기 물건의 코멘트 지우기 가능 |

## 5. 설정값 붙여넣기

1. Firebase 콘솔 왼쪽 위 **⚙️(톱니바퀴) → 프로젝트 설정**으로 가요.
2. 아래쪽 **내 앱**에서 **웹 아이콘 `</>`**을 눌러요.
3. 앱 닉네임을 적고(예: `cloud-heaven-web`) **앱 등록**을 눌러요. Firebase Hosting은 체크하지 않아도 돼요.
4. 화면에 나오는 코드에서 `const firebaseConfig = { ... };` 부분을 찾아요.
5. 이 폴더의 `js/firebase-config.js`를 메모장이나 VS Code로 열어요. 맨 아래 줄을 다음처럼 바꿔요.

```js
// 바꾸기 전
export const firebaseConfig = null;

// 바꾼 후 (값은 내 프로젝트 것으로)
export const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "cloud-heaven-xxxx.firebaseapp.com",
  databaseURL: "https://cloud-heaven-xxxx-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "cloud-heaven-xxxx",
  storageBucket: "cloud-heaven-xxxx.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};
```

> ⚠️ **`databaseURL`이 꼭 들어 있어야 해요.** 없다면 3단계를 먼저 끝낸 뒤 설정값을 다시 복사해 주세요. 프로젝트 설정 → 내 앱 → SDK 설정 및 구성 → 구성에서 다시 볼 수 있어요.
>
> 🔑 이 값들은 비밀번호가 아니에요. 웹사이트에 공개되는 게 정상이고, 실제 보호는 4단계의 보안 규칙이 맡아요.

## 6. GitHub에 올리기

1. <https://github.com> 에 로그인하고, 오른쪽 위 **+ → New repository**를 눌러요.
2. Repository name에 `cloud-heaven`을 적고 **Public**을 고른 뒤 **Create repository**를 눌러요.
3. 새 저장소 화면에서 **uploading an existing file** 링크를 눌러요.
4. 이 폴더 **안의 내용물 전부**를 끌어다 놓아요. `index.html`, `README.md`, `database.rules.json`, `firebase.json`, `css` 폴더, `js` 폴더가 다 들어가야 해요.
   - 폴더 자체(`cloud-heaven`)가 아니라 **그 안의 파일과 폴더**를 놓아야 해요. 그래야 `index.html`이 저장소 맨 위에 와요.
5. 아래 **Commit changes**를 눌러요.

> Git을 쓸 줄 안다면 이렇게 해도 돼요.
> ```bash
> cd cloud-heaven
> git init && git add . && git commit -m "구름 위 쉼터 첫 업로드"
> git branch -M main
> git remote add origin https://github.com/내아이디/cloud-heaven.git
> git push -u origin main
> ```

## 7. GitHub Pages 켜기

1. 저장소에서 **Settings → Pages**로 가요.
2. **Source**는 `Deploy from a branch`, **Branch**는 `main` / `/ (root)`로 고르고 **Save**를 눌러요.
3. 1~2분 기다리면 위쪽에 주소가 나와요.

```
https://내아이디.github.io/cloud-heaven/
```

이 주소를 친구들에게 보내면 끝이에요! 🎉 친구들은 닉네임만 정하고 바로 들어와요.

---

## (권장) API 키 사용처 제한하기

다른 사이트에서 내 설정값을 가져다 쓰지 못하게 막는 설정이에요.

1. <https://console.cloud.google.com/apis/credentials> 에 들어가서, 위쪽에서 내 Firebase 프로젝트를 골라요.
2. **API 키** 목록에서 `Browser key (auto created by Firebase)`를 눌러요.
3. **애플리케이션 제한사항 → 웹사이트**를 고르고 다음 두 줄을 추가해요.
   - `https://내아이디.github.io/*`
   - `http://localhost:8000/*` (내 컴퓨터에서 시험할 때용)
4. **저장**을 눌러요.

## 내 컴퓨터에서 먼저 확인하기 (선택)

`index.html`을 더블클릭하면 브라우저 보안 정책 때문에 열리지 않아요. 간단한 웹 서버로 열어야 해요.

```bash
cd cloud-heaven
python -m http.server 8000
```

그다음 브라우저에서 <http://localhost:8000> 을 열어요. VS Code를 쓴다면 **Live Server** 확장으로 열어도 돼요.

창을 두 개 띄우면 두 명이 접속한 것처럼 시험할 수 있어요. 시크릿 창을 쓰면 다른 사람으로 들어가요.

## 수정한 내용 반영하기

- GitHub 저장소에서 파일을 열고 ✏️(연필)을 눌러 바로 고친 뒤 **Commit changes**를 눌러요.
- 또는 고친 파일을 다시 **Add file → Upload files**로 올려요.

1~2분 뒤 사이트에 반영돼요. 바로 안 보이면 새로고침(Ctrl+Shift+R)을 해 보세요.

## 관리하기

- **대화 자동 삭제**: 대화는 30분이 지나면 화면에서 사라지고, 접속해 있는 사람의 브라우저가 3분마다 서버에서도 지워요. 시간을 바꾸려면 `js/util.js`의 `CHAT_TTL`과 `database.rules.json`의 `1800000`(30분, 밀리초)을 같이 바꿔 주세요.

- **장난 글이나 사진 지우기**: Firebase 콘솔 → Realtime Database → **데이터** 탭에서 `guestbook`, `chat`, `items`, `images`, `comments` 아래 항목을 골라 🗑️로 지워요.
- **사용량 보기**: Firebase 콘솔 → Realtime Database → **사용량** 탭에서 볼 수 있어요.

## 무료 요금제(Spark) 한도

| 항목 | 무료 한도 | 이 사이트 기준 |
|---|---|---|
| 동시 접속 | 100명 | 친구들끼리는 충분해요 |
| 저장 공간 | 1GB | 사진 한 장이 약 100~170KB → 수천 장 |
| 다운로드 | 월 10GB | 10명이 함께 돌아다니면 1시간에 수십 MB 정도 |

한도를 넘으면 그달에는 잠시 멈출 뿐, 자동으로 요금이 나가지 않아요.

## 문제 해결

친구가 접속해도 서로 안 보이면 개발자 도구(F12) → Console에서 `[cloud-heaven]`으로 시작하는 메시지를 확인해 주세요.

| 콘솔·화면 메시지 | 원인과 해결 |
|---|---|
| "Firebase 설정값이 없어…" | `js/firebase-config.js`가 아직 `null`이에요 → 5단계 |
| "익명 로그인이 꺼져 있어요" | 2단계를 확인해 주세요 |
| "databaseURL이 없어요" | 3단계 후 설정값을 다시 복사해 주세요 |
| "데이터를 읽을 권한이 없어요" | 4단계 보안 규칙이 게시되지 않았어요 |
| "apiKey가 올바르지 않아요" | 설정값을 복사할 때 빠진 글자가 없는지 확인해 주세요 |
| 화면이 하얗고 아무것도 안 나와요 | Console의 빨간 오류를 확인해 주세요 |

## 폴더 구조

```
cloud-heaven/
├─ index.html              화면 뼈대 (패널, 버튼)
├─ css/style.css           디자인
├─ js/
│  ├─ main.js              조작, 카메라, 채팅, 방명록, 판정소를 묶는 진입점
│  ├─ world.js             3D 세계 (광장, 게시판, 판정소, 눈놀이터, 온천, 밴드 무대, 정자)
│  ├─ band.js              밴드 합주 소리 (드럼·베이스·기타·건반)
│  ├─ character.js         날개 달린 천사 캐릭터
│  ├─ statue.js            하트 동상 피규어
│  ├─ sound.js             효과음 (파일 없이 브라우저에서 직접 만듦)
│  ├─ sprites.js           이름표·말풍선용 글자 그리기
│  ├─ net.js               Firebase 연결 (+ claude.ai에서 열릴 때의 연결, 연결이 없을 때의 대비책)
│  ├─ firebase-config.js   ← 내 Firebase 설정값을 넣는 곳
│  └─ util.js              공용 도우미, 색상·장식 목록
├─ database.rules.json     Realtime Database 보안 규칙
└─ firebase.json           (Firebase CLI를 쓸 때만 필요)
```

사용한 기술: [three.js](https://threejs.org) r128 (3D), Firebase Authentication(익명 로그인), Firebase Realtime Database
