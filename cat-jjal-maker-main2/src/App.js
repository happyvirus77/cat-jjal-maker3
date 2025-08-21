import React from "react";
import "./App.css";
import Title from './components/title.js'

// 안전한 localStorage 헬퍼
const jsonLocalStorage = {
  setItem: function (key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  getItem: function (key) {
    const v = localStorage.getItem(key);
    try {
      return v ? JSON.parse(v) : null;
    } catch (e) {
      return null;
    }
  },
};

// CATAAS 이미지 URL 생성 (스펙 변화 대응)
const fetchCat = async (text) => {
  const OPEN_API_DOMAIN = "https://cataas.com";
  const q = encodeURIComponent(text);
  const res = await fetch(`${OPEN_API_DOMAIN}/cat/says/${q}?json=true`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("고양이 이미지를 불러오지 못했어요.");
  const data = await res.json();
  const id = data._id || data.id;
  if (!id) throw new Error("이미지 ID를 찾지 못했어요.");
  // 캐시 무력화 파라미터
  return `${OPEN_API_DOMAIN}/cat/${id}/says/${q}?t=${Date.now()}`;
};



const Form = ({ updateMainCat }) => {
  const [value, setValue] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState("");
  const includesHangul = (text) => /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(text);

  function handleInputChange(e) {
    const userValue = e.target.value;
    if (includesHangul(userValue)) setErrorMessage("한글은 입력할 수 없습니다.");
    else setErrorMessage("");
    setValue(userValue.toUpperCase());
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    if (value.trim() === "") {
      setErrorMessage("빈 값으로 만들 수 없습니다.");
      return;
    }
    if (errorMessage) return;
    updateMainCat(value.trim());
  }

  return (
    <form onSubmit={handleFormSubmit}>
      <input
        type="text"
        name="name"
        placeholder="영어 대사를 입력해주세요"
        value={value}
        onChange={handleInputChange}
      />
      <button type="submit">생성</button>
      <p style={{ color: "red", minHeight: "1em" }}>{errorMessage}</p>
    </form>
  );
};

// 잘못된 src 방지 가드
function CatItem({ img }) {
  const isValid = typeof img === "string" && /^https?:\/\//.test(img);
  if (!isValid) return null;
  return (
    <li>
      <img src={img} alt="고양이" />
    </li>
  );
}

// 렌더 전 favorites 정제 + 중복 제거
function Favorites({ favorites }) {
  const cleaned = React.useMemo(() => {
    const arr = Array.isArray(favorites) ? favorites : [];
    const onlyUrls = arr
      .filter(Boolean)
      .filter((x) => typeof x === "string")
      .filter((x) => /^https?:\/\//.test(x));
    return Array.from(new Set(onlyUrls)); // 중복 제거
  }, [favorites]);

  if (cleaned.length === 0) {
    return <div>사진 위 하트를 눌러 고양이 사진을 저장해봐요!</div>;
  }
  return (
    <ul className="favorites">
      {cleaned.map((cat) => (
        <CatItem img={cat} key={cat} />
      ))}
    </ul>
  );
}

const MainCard = ({ img, onHeartClick, alreadyFavorite }) => {
  const heartIcon = alreadyFavorite ? "💖" : "🤍";
  const valid = typeof img === "string" && /^https?:\/\//.test(img);
  return (
    <div className="main-card">
      {valid ? (
        <img src={img} alt="고양이" width="400" />
      ) : (
        <div
          style={{
            width: 400,
            height: 300,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid #ccc",
          }}
        >
          이미지를 불러오는 중...
        </div>
      )}
      <button onClick={onHeartClick}>{heartIcon}</button>
    </div>
  );
};

function App() {
  const CAT1 = "https://cataas.com/cat/HSENVDU4ZMqy7KQ0/says/REACT";
  // const CAT2 = "https://cataas.com/cat/BxqL2EjFmtxDkAm2/says/INFLEARN";
  // const CAT3 = "https://cataas.com/cat/18MD6byVC1yKGpXp/says/JAVASCRIPT";

  const [counter, setCounter] = React.useState(() => {
    const c = jsonLocalStorage.getItem("counter");
    return typeof c === "number" ? c : 0;
  });
  const [mainCat, setMainCat] = React.useState(CAT1);
  const [favorites, setFavorites] = React.useState(() => {
    const f = jsonLocalStorage.getItem("favorites");
    const cleaned = Array.isArray(f) ? f.filter(Boolean) : [];
    return Array.from(new Set(cleaned));
  });

  // 이미 즐겨찾기에 있으면 하트 채움
  const alreadyFavorite = favorites.indexOf(mainCat) !== -1;

  // 첫 로드 시 API로 새 이미지 세팅
  React.useEffect(() => {
    (async () => {
      try {
        const newCat = await fetchCat("First cat");
        setMainCat(newCat);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // 마운트 시 localStorage 정제(깨진 값/중복 제거)
  React.useEffect(() => {
    const f = jsonLocalStorage.getItem("favorites");
    const arr = Array.isArray(f) ? f : [];
    const cleaned = Array.from(
      new Set(
        arr
          .filter(Boolean)
          .filter((x) => typeof x === "string")
          .filter((x) => /^https?:\/\//.test(x))
      )
    );
    if (cleaned.length !== arr.length) {
      jsonLocalStorage.setItem("favorites", cleaned);
      setFavorites(cleaned);
    }
  }, []);

  async function updateMainCat(value) {
    try {
      const newCat = await fetchCat(value);
      setMainCat(newCat);
      const nextCounter = (typeof counter === "number" ? counter : 0) + 1;
      setCounter(nextCounter);
      jsonLocalStorage.setItem("counter", nextCounter);
    } catch (e) {
      alert(e.message);
    }
  }

  function handleHeartClick() {
    if (!mainCat) return;
    if (favorites.indexOf(mainCat) !== -1) return; // 중복 저장 방지
    const nextFavorites = favorites.concat(mainCat);
    const unique = Array.from(new Set(nextFavorites.filter(Boolean)));
    setFavorites(unique);
    jsonLocalStorage.setItem("favorites", unique);
  }

  // 0일 때는 접두어 생략
  const counterTitle =
    typeof counter === "number" && counter > 0 ? counter + "번째 " : "";

  return (
    <div>
      <Title>{counterTitle}고양이 가라사대</Title>
      <Form updateMainCat={updateMainCat} />
      <MainCard
        img={mainCat}
        onHeartClick={handleHeartClick}
        alreadyFavorite={alreadyFavorite}
      />
      <Favorites favorites={favorites} />
    </div>
  );
}

export default App;
