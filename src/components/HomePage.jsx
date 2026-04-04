"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LoginModal from "./LoginModal";
import { getProducts } from "../services/home";

const STATS = [
  { label: "최근 24시간", value: "신규 38개" },
  { label: "내 동네", value: "평균 왕복 6분" },
  { label: "평균 거래", value: "1.8km" },
];

const CATEGORIES = [
  { name: "전체보기", id: null },
  { name: "카메라", id: 1 },
  { name: "캠핑/야외", id: 4 },
  { name: "공구/DIY", id: 5 },
  { name: "디지털/가전", id: 15 },
  { name: "생활/건강", id: 16 },
  { name: "가구", id: 17 },
  { name: "스포츠", id: 18 },
  { name: "육아", id: 19 },
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
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");

  const [locationKeyword, setLocationKeyword] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");

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
        } else if (Array.isArray(data?.content)) {
          setProducts(data.content);
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

  const handleRequireLoginMove = (path) => {
    if (isLoggedIn) {
      router.push(path);
      return;
    }

    setIsLoginModalOpen(true);
  };

  const normalizedProducts = useMemo(() => {
    return (products || []).map((item, index) => {
      const rawThumbnail =
        item.thumbnailUrl ||
        item.imageUrl ||
        item.itemImageUrl ||
        item.thumbnail ||
        item.image ||
        item.images?.[0]?.imageUrl ||
        item.images?.[0]?.url ||
        item.imageUrls?.[0] ||
        "";

      const thumbnailUrl =
        rawThumbnail && rawThumbnail.startsWith("http")
          ? rawThumbnail
          : rawThumbnail
          ? `${process.env.NEXT_PUBLIC_API_BASE_URL}${rawThumbnail}`
          : "";

      return {
        raw: item,
        id: item.itemId ?? item.id ?? index,
        title: item.title ?? item.name ?? "상품명 없음",
        price: item.pricePerDay ?? item.price ?? item.dailyPrice ?? 0,
       meta:
        item.area_name ||
        item.location ||
        item.areaName ||
        item.locationAreaCode ||
        item.ownerNickname ||
        "위치 정보 없음",
        note:
          item.firstCategory ||
          item.secondCategory ||
          (Array.isArray(item.tags) ? item.tags.join(" · ") : item.note) ||
          "상품 정보",
        time: item.createdAt || item.timeAgo || item.updatedAt || "",
        badges: Array.isArray(item.badges)
          ? item.badges
          : Array.isArray(item.tags)
          ? item.tags.slice(0, 3)
          : [],
        thumbnailUrl,
      };
    });
  }, [products]);

  const handleSearch = () => {
    const params = new URLSearchParams();

    if (locationKeyword.trim()) {
      params.set("location", locationKeyword.trim());
    }

    if (searchKeyword.trim()) {
      params.set("keyword", searchKeyword.trim());
    }

    const queryString = params.toString();
    router.push(queryString ? `/product?${queryString}` : "/product");
  };

  const handleCategoryMove = (category) => {
    if (category.id === null) {
      router.push("/product");
      return;
    }

    router.push(`/product?categoryId=${category.id}`);
  };

  const formatPrice = (price) => {
    if (typeof price === "number") {
      return "₩" + price.toLocaleString();
    }

    if (typeof price === "string") {
      return price;
    }

    return "₩0";
  };

  return (
    <>
      <div className="page">
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
                <Link href="/product" className="btn btn-primary">
                  대여 물품찾기
                </Link>
                <button
                  type="button"
                  className="btn btn-white"
                  onClick={() => handleRequireLoginMove("/product/create")}
                >
                  빌려주기
                </button>
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
                <div className="search-box location-input-box">
                  <span className="search-icon"></span>
                  <input
                    type="text"
                    value={locationKeyword}
                    onChange={(e) => setLocationKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSearch();
                      }
                    }}
                    placeholder="예: 서울 마포구 합정동"
                  />
                </div>
              </div>

              <div className="field-group search-group">
                <label>검색어</label>
                <div className="search-box">
                  <span className="search-icon"></span>
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSearch();
                      }
                    }}
                    placeholder="예: 빔프로젝터, 스위치, 드릴, 텐트..."
                  />
                </div>
              </div>

              <button className="search-btn" type="button" onClick={handleSearch}>
                검색하기
              </button>
            </div>

            <div className="categories">
              {CATEGORIES.map((item) => (
                <button
                  type="button"
                  className="cat-pill"
                  key={`${item.name}-${item.id ?? "all"}`}
                  onClick={() => handleCategoryMove(item)}
                >
                  {item.name}
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
                <p>지금 올라와 있는 상품을 모두 보여드려요</p>
              </div>

              <Link href="/products" className="section-link">
                최근 게시글 전체보기 <span>→</span>
              </Link>
            </div>

            {productsLoading ? (
              <div className="product-empty">상품을 불러오는 중입니다...</div>
            ) : productsError ? (
              <div className="product-empty">{productsError}</div>
            ) : normalizedProducts.length === 0 ? (
              <div className="product-empty">등록된 상품이 없습니다.</div>
            ) : (
              <div className="product-grid">
                {normalizedProducts.map((item) => (
                  <Link
                    href={`/products/${item.id}`}
                    key={item.id}
                    className="product-card-link"
                  >
                    <article className="product-card">
                      <div className="thumb">
                        {item.thumbnailUrl ? (
                          <img
                            src={item.thumbnailUrl}
                            alt={item.title}
                            className="thumb-image"
                          />
                        ) : null}
                      </div>

                      <div className="product-badges">
                        {(item.badges || []).map((badge, index) => (
                          <span key={`${badge}-${index}`}>{badge}</span>
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
                  </Link>
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
              <button
                type="button"
                className="cta-btn cta-btn-white"
                onClick={() => handleRequireLoginMove("/mypage")}
              >
                무료로 시작하기
              </button>

              <button
                type="button"
                className="cta-btn cta-btn-dark"
                onClick={() => handleRequireLoginMove("/product/create")}
              >
                물건 등록하기
              </button>
            </div>
          </div>
        </section>
      </div>

      {mounted ? (
        <LoginModal
          open={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      ) : null}
    </>
  );
}