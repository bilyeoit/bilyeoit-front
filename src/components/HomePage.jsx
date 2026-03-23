"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import LoginModal from "./LoginModal";
import { getLocations, getProducts } from "../services/home";

const STATS = [
  { label: "최근 24시간", value: "신규 38개" },
  { label: "내 동네", value: "평균 왕복 6분" },
  { label: "평균 거래", value: "1.8km" },
];

const CATEGORIES = [
  "캠핑/여행",
  "전자기기",
  "공구/DIY",
  "육아",
  "촬영",
  "여행/이동",
  "의상대여",
  "파티/행사",
  "기타",
];

const TRUST_ITEMS = [
  {
    iconClass: "icon-lock",
    title: "에스크로 안전 결제",
    desc: "대여 기간 동안 결제금액이 보호되고, 문제 발생 시 신속하게 도와드려요.",
  },
  {
    iconClass: "icon-pin",
    title: "동네 인증 시스템",
    desc: "거래 가능 범위 안에서만 조회되며 대면 거래가 가까워져요.",
  },
  {
    iconClass: "icon-star",
    title: "상호 리뷰 & 신뢰 지표",
    desc: "거래 후 상호 평가가 누적되어 누구와든 안심하고 거래할 수 있어요.",
  },
  {
    iconClass: "icon-bag",
    title: "AI 실시간 위험 감지",
    desc: "이상 행동 가능성을 조기 감지해 거래를 사전에 차단합니다.",
  },
];

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [products, setProducts] = useState([]);
  const [locationData, setLocationData] = useState({});
  const [productsLoading, setProductsLoading] = useState(true);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [locationsError, setLocationsError] = useState("");

  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState({
    city: "",
    district: "",
    dong: "",
  });

  useEffect(() => {
    setMounted(true);

    const savedLoginState = localStorage.getItem("isLoggedIn");
    if (savedLoginState === "true") {
      setIsLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setProductsLoading(true);
      setProductsError("");

      try {
        const data = await getProducts();

        if (Array.isArray(data)) {
          setProducts(data);
        } else if (Array.isArray(data?.items)) {
          setProducts(data.items);
        } else {
          setProducts([]);
        }
      } catch (error) {
        setProductsError(error.message || "상품 목록을 불러오지 못했습니다.");
        setProducts([]);
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    const fetchLocations = async () => {
      setLocationsLoading(true);
      setLocationsError("");

      try {
        const data = await getLocations();

        if (data && typeof data === "object" && !Array.isArray(data)) {
          setLocationData(data);
        } else if (data?.locations && typeof data.locations === "object") {
          setLocationData(data.locations);
        } else {
          setLocationData({});
        }
      } catch (error) {
        setLocationsError(error.message || "지역 정보를 불러오지 못했습니다.");
        setLocationData({});
      } finally {
        setLocationsLoading(false);
      }
    };

    fetchLocations();
  }, []);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    localStorage.setItem("isLoggedIn", "true");
    setIsLoginModalOpen(false);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
  };

  const locationPathText = useMemo(() => {
    if (step === 0) return "시/도를 선택해주세요";
    if (step === 1) return selectedLocation.city;
    return `${selectedLocation.city} > ${selectedLocation.district}`;
  }, [step, selectedLocation]);

  const locationButtonText = useMemo(() => {
    if (selectedLocation.district && selectedLocation.dong) {
      return `${selectedLocation.district} > ${selectedLocation.dong}`;
    }
    return "지역 선택";
  }, [selectedLocation]);

  const currentLocationList = useMemo(() => {
    if (step === 0) return Object.keys(locationData || {});
    if (step === 1 && selectedLocation.city && locationData[selectedLocation.city]) {
      return Object.keys(locationData[selectedLocation.city]);
    }
    if (
      step === 2 &&
      selectedLocation.city &&
      selectedLocation.district &&
      locationData[selectedLocation.city]?.[selectedLocation.district]
    ) {
      return locationData[selectedLocation.city][selectedLocation.district];
    }
    return [];
  }, [step, selectedLocation, locationData]);

  const handleLocationSelect = (item) => {
    if (step === 0) {
      setSelectedLocation({ city: item, district: "", dong: "" });
      setStep(1);
      return;
    }

    if (step === 1) {
      setSelectedLocation((prev) => ({
        ...prev,
        district: item,
        dong: "",
      }));
      setStep(2);
      return;
    }

    setSelectedLocation((prev) => ({
      ...prev,
      dong: item,
    }));
    setIsLocationOpen(false);
    setStep(0);
  };

  const handleLocationBack = () => {
    if (step === 2) {
      setStep(1);
      return;
    }
    if (step === 1) {
      setStep(0);
    }
  };

  const formatPrice = (price) => {
    if (typeof price === "number") return `₩${price.toLocaleString()}`;
    if (typeof price === "string") return price;
    return "₩0";
  };

  return (
    <>
      <div className="page">
        <header className="header">
          <div className="inner header-inner">
            <div className="brand">
              <span className="brand-mark"></span>
              <div className="brand-texts">
                <strong className="brand-name">빌려잇</strong>
                <span className="brand-sub">우리 주변 물건 대여</span>
              </div>
            </div>

            <nav className="gnb">
              <a href="#">홈</a>
              <a href="#">대여하기</a>
              <a href="#">커뮤니티</a>
              <a href="#">고객센터</a>
              <a href="#">내채팅</a>
            </nav>

            <div className="header-actions">
              {!mounted ? (
                <button
                  type="button"
                  className="demo-open-btn login-btn"
                  disabled
                >
                  로그인
                </button>
              ) : isLoggedIn ? (
                <>
                  <Link href="/mypage" className="demo-open-btn mypage-btn">
                    마이페이지
                  </Link>
                  <button
                    type="button"
                    className="demo-open-btn logout-btn"
                    onClick={handleLogout}
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="demo-open-btn login-btn"
                  onClick={() => setIsLoginModalOpen(true)}
                >
                  로그인
                </button>
              )}
            </div>
          </div>
        </header>

        {/* 이하 기존 코드 그대로 */}
        <section className="hero">
          <div className="inner hero-inner">
            <div className="hero-copy">
              <p className="hero-kicker">내 동네에서 더 가깝게</p>
              <h1>
                필요할 때 빌리고,
                <br />
                안 쓸 땐 빌려주고
              </h1>
              <p className="hero-desc">
                가까운 이웃과 안전하게 거래하는 동네 기반 물품대여 서비스
                <br />
                대여 물건부터 예약/반납까지 한 번에 관리해요.
              </p>

              <div className="hero-actions">
                <a href="#" className="btn btn-primary">
                  대여 물품찾기
                </a>
                <a href="#" className="btn btn-white">
                  빌려주기
                </a>
              </div>

              <ul className="hero-points">
                <li>직접 거래 지원</li>
                <li>예약/반납 한 번에</li>
                <li>동네 기반 대여 서비스</li>
              </ul>
            </div>

            <div className="hero-visual">
              <div className="visual-card">
                <p className="visual-title">오늘, 내 주변 인기 대여</p>
                <p className="visual-sub">가까운 거리부터 빠르게 찾아보세요.</p>

                <div className="visual-graph">
                  <svg
                    className="graph-line"
                    viewBox="0 0 353 186"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M58 122
                        C70 108, 77 84, 84.5 73.5
                        C92 64, 108 62, 126 72
                        C143 82, 160 66, 171.5 53.5
                        C182 43, 198 50, 220 76
                        C240 100, 270 97, 287.5 84.5
                        C295 79, 302 78, 308 82"
                      stroke="#8A9AB6"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>

                  <div className="dot dot1"></div>
                  <div className="dot dot2"></div>
                  <div className="dot dot3"></div>
                </div>

                <div className="visual-stats">
                  {STATS.map((item) => (
                    <div className="mini-stat" key={item.label}>
                      <span className="stat-label">{item.label}</span>
                      <strong className="stat-value">{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="search-section">
          <div className="inner">
            <div className="search-bar-wrap">
              <div className="field-group location-field">
                <label>지역</label>

                <button
                  className="select-box"
                  type="button"
                  onClick={() => setIsLocationOpen((prev) => !prev)}
                  disabled={locationsLoading}
                >
                  <span>
                    {locationsLoading ? "지역 불러오는 중..." : locationButtonText}
                  </span>
                  <span className="arrow"></span>
                </button>

                <div className={`location-dropdown ${isLocationOpen ? "active" : ""}`}>
                  <div className="location-path">{locationPathText}</div>

                  <ul>
                    {step > 0 && (
                      <li className="is-back" onClick={handleLocationBack}>
                        {step === 1 ? "← 시/도 다시 선택" : "← 군/구 다시 선택"}
                      </li>
                    )}

                    {currentLocationList.map((item) => (
                      <li key={item} onClick={() => handleLocationSelect(item)}>
                        {item}
                      </li>
                    ))}

                    {!locationsLoading && currentLocationList.length === 0 && (
                      <li>지역 데이터가 없습니다.</li>
                    )}

                    {locationsError && <li>{locationsError}</li>}
                  </ul>
                </div>
              </div>

              <div className="field-group search-group">
                <label>검색어</label>
                <div className="search-box">
                  <span className="search-icon"></span>
                  <input
                    type="text"
                    placeholder="예: 빔프로젝터, 스위치, 드릴, 텐트..."
                  />
                </div>
              </div>

              <button className="search-btn" type="button">
                검색하기
              </button>
            </div>

            <div className="categories">
              {CATEGORIES.map((item) => (
                <button type="button" className="cat-pill" key={item}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="trust-section">
          <div className="inner trust-inner">
            <div className="trust-copy">
              <p className="section-kicker">TRUST SYSTEM</p>
              <h2>
                신뢰는 숫자로
                <br />
                증명됩니다
              </h2>
              <p className="section-desc">
                거래 횟수, 인증률, 평점, 신고 이력까지 한눈에. 빌려잇의 신뢰 지표가
                낮선 이웃을 <br /> 믿을 수 있는 이유로 연결돼요.
              </p>

              <div className="trust-list">
                {TRUST_ITEMS.map((item) => (
                  <div className="trust-item" key={item.title}>
                    <div className={`trust-icon ${item.iconClass}`}></div>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="trust-profile-wrap">
              <div className="trust-profile">
                <div className="profile-top">
                  <div className="avatar">김</div>
                  <div className="profile-info">
                    <strong>김민준님의 프로필</strong>
                    <span>마포구 합정동 · 인증된 이웃</span>
                  </div>
                </div>

                <div className="profile-stats">
                  <div className="profile-stat">
                    <strong>47</strong>
                    <span>누적</span>
                  </div>
                  <div className="profile-stat">
                    <strong>98%</strong>
                    <span>응답률</span>
                  </div>
                  <div className="profile-stat">
                    <strong>4.9★</strong>
                    <span>평균 평점</span>
                  </div>
                </div>

                <div className="review-box">
                  <div className="stars">★★★★★</div>
                  <p>
                    순간 필요한 장비라 수고롭고, 짧은 상담도 친절하게 응대해주셨어요.
                    덕분에 딱 필요한 날로 예약했어요!
                  </p>
                  <span className="review-tag">최근 거래 후기</span>
                </div>

                <div className="review-box review-box-alt">
                  <div className="stars">★★★★★</div>
                  <p>
                    직접 나눔하듯 손쉽게 대여했는데 완전 만족했어요. 마스크도 그대로
                    잘 챙겨주고요.
                  </p>
                  <span className="review-tag">최근 거래 후기</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="product-section">
          <div className="inner">
            <div className="section-head">
              <div>
                <h2>오늘의 추천상품</h2>
                <p>최근 게시글 기준으로, 내 동네에서 인기 있는 물건을 보여드려요</p>
              </div>

              <a href="#" className="section-link">
                최근 게시글 전체보기 <span>→</span>
              </a>
            </div>

            {productsLoading ? (
              <div className="product-empty">상품을 불러오는 중입니다...</div>
            ) : productsError ? (
              <div className="product-empty">{productsError}</div>
            ) : products.length === 0 ? (
              <div className="product-empty">등록된 상품이 없습니다.</div>
            ) : (
              <div className="product-grid">
                {products.map((item, index) => (
                  <article
                    className="product-card"
                    key={item.id ?? `${item.title}-${index}`}
                  >
                    <div className="thumb"></div>

                    <div className="product-badges">
                      {(item.badges || []).map((badge) => (
                        <span key={badge}>{badge}</span>
                      ))}
                    </div>

                    <h3>{item.title}</h3>
                    <p className="meta">{item.meta}</p>
                    <p className="price">
                      {formatPrice(item.price)} <span>/ 하루</span>
                    </p>

                    <div className="bottom-line">
                      <p>{item.note}</p>
                      <span>{item.time}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="cta-section">
          <div className="inner cta-inner">
            <h2>
              지금 바로 이웃과
              <br />
              <span>안전하게 나눠보세요</span>
            </h2>
            <p>가입 무료 · AI 거래 분석 무료 · 동네 기반 대여 서비스</p>

            <div className="cta-actions">
              <a href="#" className="cta-btn cta-btn-white">
                무료로 시작하기
              </a>
              <a href="#" className="cta-btn cta-btn-dark">
                물건 등록하기
              </a>
            </div>
          </div>
        </section>

        <footer className="footer">
          <div className="inner footer-inner">
            <div className="footer-brand">
              <span className="footer-home">⌂</span>
              <strong>빌려잇</strong>
            </div>

            <p className="footer-center">
              이웃과 함께 살고 돌려쓰는 동네형 물건 쉐어링 서비스입니다
            </p>
            <p className="footer-copy">© 2025 빌려잇. All rights reserved.</p>
          </div>
        </footer>
      </div>

      <LoginModal
        open={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </>
  );
}