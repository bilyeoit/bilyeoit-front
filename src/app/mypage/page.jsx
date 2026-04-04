"use client";

import {
  getMyPageMainInfo,
  getMyItems,
  getRentals,
  getReservations,
  getFavorites,
  getReviews,
} from "@/services/mypage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./page.module.css";
import Link from "next/link";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

async function toggleFavorite(itemId) {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("accessToken") ||
        sessionStorage.getItem("accessToken")
      : null;

  const response = await fetch(
    `${API_BASE_URL}/bilyeoit/v1/items/${itemId}/favorite`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  let data = null;
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const error = new Error(data?.message || `요청 실패 (${response.status})`);
    error.status = response.status;
    throw error;
  }

  return data;
}

function buildImageUrl(item) {
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

  if (!rawThumbnail) return "";
  if (rawThumbnail.startsWith("http")) return rawThumbnail;
  return `${API_BASE_URL}${rawThumbnail}`;
}

export default function MyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sortRef = useRef(null);

  const [activeTab, setActiveTab] = useState("myItems");
  const [sortType, setSortType] = useState("latest");
  const [mainInfo, setMainInfo] = useState(null);
  const [avgRating, setAvgRating] = useState(0);
  const [isSortOpen, setIsSortOpen] = useState(false);

  const [myItems, setMyItems] = useState([]);
  const [rentalItems, setRentalItems] = useState([]);
  const [receivedReservations, setReceivedReservations] = useState([]);
  const [sentReservations, setSentReservations] = useState([]);
  const [favoriteItems, setFavoriteItems] = useState([]);
  const [reviewItems, setReviewItems] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [favoriteLoadingId, setFavoriteLoadingId] = useState(null);

  const fetchMainInfo = useCallback(async () => {
    try {
      const data = await getMyPageMainInfo();
      console.log("메인정보 응답", data);
      setMainInfo(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchMainInfo();
  }, [fetchMainInfo]);

  useEffect(() => {
    async function fetchReservationCount() {
      try {
        const data = await getReservations();
        setReceivedReservations(data?.receivedRequests || data?.received || []);
        setSentReservations(data?.sentRequests || data?.sent || []);
      } catch (e) {
        console.error("예약 개수 초기 조회 실패", e);
      }
    }

    fetchReservationCount();
  }, []);

  useEffect(() => {
    if (searchParams.get("updated") === "1") {
      fetchMainInfo();
      router.replace("/mypage");
    }
  }, [searchParams, fetchMainInfo, router]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (sortRef.current && !sortRef.current.contains(event.target)) {
        setIsSortOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    async function fetchTabData() {
      setLoading(true);
      setError("");

      try {
        if (activeTab === "myItems") {
          const data = await getMyItems();
          console.log("내상품 응답", data);
          setMyItems(Array.isArray(data) ? data : data?.items || []);
        }

        if (activeTab === "rentals") {
          const data = await getRentals();
          console.log("대여상품 응답", data);
          setRentalItems(Array.isArray(data) ? data : data?.items || []);
        }

        if (activeTab === "reservations") {
          const data = await getReservations();
          console.log("예약상품 응답", data);
          setReceivedReservations(data?.receivedRequests || data?.received || []);
          setSentReservations(data?.sentRequests || data?.sent || []);
        }

        if (activeTab === "favorites") {
          const data = await getFavorites();
          console.log("찜목록 응답", data);
          const nextFavorites = data?.items || (Array.isArray(data) ? data : []);
          setFavoriteItems(
            nextFavorites.map((item) => ({
              ...item,
              isFavorite: true,
              favoriteCount: Math.max(1, Number(item?.favoriteCount || 0)),
            }))
          );
        }

        if (activeTab === "reviews") {
          const data = await getReviews();
          console.log("리뷰 응답", data);
          setAvgRating(data?.avgRating || 0);
          setReviewItems(
            Array.isArray(data?.reviews)
              ? data.reviews
              : Array.isArray(data?.items)
              ? data.items
              : Array.isArray(data)
              ? data
              : []
          );
        }
      } catch (e) {
        console.error(e);
        setError(e.message || "데이터를 불러오지 못했어요.");
      } finally {
        setLoading(false);
      }
    }

    fetchTabData();
  }, [activeTab]);

  const handleToggleFavoriteInFavorites = useCallback(async (itemId) => {
    const currentItem = favoriteItems.find((item) => item.itemId === itemId);
    if (!currentItem) return;

    try {
      setFavoriteLoadingId(itemId);

      setFavoriteItems((prev) => prev.filter((item) => item.itemId !== itemId));

      const result = await toggleFavorite(itemId);

      if (result?.isFavorite === true) {
        setFavoriteItems((prev) => [currentItem, ...prev]);
      }

      setMainInfo((prev) =>
        prev
          ? {
              ...prev,
              favoriteItemCount:
                result?.isFavorite === true
                  ? Number(prev.favoriteItemCount || 0)
                  : Math.max(0, Number(prev.favoriteItemCount || 0) - 1),
            }
          : prev
      );
    } catch (err) {
      console.error(err);

      setFavoriteItems((prev) => {
        const exists = prev.some((item) => item.itemId === currentItem.itemId);
        if (exists) return prev;
        return [currentItem, ...prev];
      });

      if (err?.status === 401) {
        alert("로그인 후 이용할 수 있어요.");
      } else {
        alert(err.message || "찜 해제에 실패했어요.");
      }
    } finally {
      setFavoriteLoadingId(null);
    }
  }, [favoriteItems]);

  const tabs = useMemo(
    () => [
      { key: "myItems", label: "내 상품", count: `${mainInfo?.myItemCount ?? 0}개` },
      { key: "rentals", label: "대여상품", count: `${mainInfo?.rentingItemCount ?? 0}건` },
      {
        key: "reservations",
        label: "예약상품",
        count: `${receivedReservations.length + sentReservations.length}건`,
      },
      { key: "favorites", label: "찜목록", count: `${mainInfo?.favoriteItemCount ?? 0}개` },
      { key: "reviews", label: "리뷰", count: `${mainInfo?.reviewCount ?? 0}개` },
    ],
    [mainInfo, receivedReservations.length, sentReservations.length]
  );

  const sortedMyItems = useMemo(() => {
    const copied = [...myItems];
    return copied.sort((a, b) => {
      const aTime = new Date(a?.createdAt || 0).getTime();
      const bTime = new Date(b?.createdAt || 0).getTime();

      if (sortType === "latest") return bTime - aTime;
      return aTime - bTime;
    });
  }, [myItems, sortType]);

  const sortedRentalItems = useMemo(() => {
    const copied = [...rentalItems];
    return copied.sort((a, b) => {
      const aTime = new Date(a?.createdAt || 0).getTime();
      const bTime = new Date(b?.createdAt || 0).getTime();

      if (sortType === "latest") return bTime - aTime;
      return aTime - bTime;
    });
  }, [rentalItems, sortType]);

  const sortedFavoriteItems = useMemo(() => {
    const copied = [...favoriteItems];
    return copied.sort((a, b) => {
      const aTime = new Date(a?.createdAt || 0).getTime();
      const bTime = new Date(b?.createdAt || 0).getTime();

      if (sortType === "latest") return bTime - aTime;
      return aTime - bTime;
    });
  }, [favoriteItems, sortType]);

  const sortedReviewItems = useMemo(() => {
    const copied = [...reviewItems];
    return copied.sort((a, b) => {
      const aTime = new Date(a?.createdAt || 0).getTime();
      const bTime = new Date(b?.createdAt || 0).getTime();

      if (sortType === "latest") return bTime - aTime;
      return aTime - bTime;
    });
  }, [reviewItems, sortType]);

  return (
    <main className={styles.mypage}>
      <div className={styles.inner}>
        <section className={styles.topSection}>
          <div className={styles.profileWrap}>
            <div className={styles.profileLeft}>
              <div className={styles.avatar}></div>
              <h2>{mainInfo?.nickname || "사용자"}</h2>
              <p>
                ★★★★★ {mainInfo?.avgRating ?? 0} · 리뷰 {mainInfo?.reviewCount ?? 0}
              </p>
              <Link href="/settings">
                <button type="button">프로필 수정</button>
              </Link>
            </div>

            <div className={styles.profileRight}>
              <div className={styles.profileTop}>
                <div>
                  <h1>{mainInfo?.nickname || "사용자"}</h1>
                  <p>{mainInfo?.areaName || "지역 미정"} · 깔끔 거래</p>
                </div>

                <div className={styles.profileBtns}>
                  <button type="button">동네 변경</button>
                  <Link href="/settings" className={styles.setbtn}>
                    설정
                  </Link>
                </div>
              </div>

              <div className={styles.rentalBox}>
                <div className={styles.rentalText}>
                  <span>상품 대여</span>
                  <strong>{mainInfo?.rentedCount ?? 0} 회</strong>
                </div>
                <div className={styles.rentalCheck}>✔</div>
              </div>

              <div className={styles.intro}>
                {mainInfo?.intro || "소개글이 아직 없습니다."}
              </div>
            </div>
          </div>
        </section>

        <section className={styles.tabs}>
          {tabs.map((tab) => (
            <div
              key={tab.key}
              className={`${styles.tab} ${activeTab === tab.key ? styles.active : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span>{tab.label}</span>
              <strong>{tab.count}</strong>
            </div>
          ))}
        </section>

        <div className={styles.sortBar}>
          <div className={styles.sortDropdown} ref={sortRef}>
            <button
              type="button"
              className={styles.sortTrigger}
              onClick={() => setIsSortOpen((prev) => !prev)}
            >
              <span>정렬: {sortType === "latest" ? "최신순" : "오래된순"}</span>

              <span
                className={`${styles.sortTriggerArrow} ${isSortOpen ? styles.isOpen : ""}`}
                aria-hidden="true"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M3 5.5L7 9.5L11 5.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>

            {isSortOpen && (
              <div className={styles.sortMenu}>
                <button
                  type="button"
                  className={`${styles.sortMenuItem} ${
                    sortType === "latest" ? styles.activeSortItem : ""
                  }`}
                  onClick={() => {
                    setSortType("latest");
                    setIsSortOpen(false);
                  }}
                >
                  최신순
                </button>

                <button
                  type="button"
                  className={`${styles.sortMenuItem} ${
                    sortType === "oldest" ? styles.activeSortItem : ""
                  }`}
                  onClick={() => {
                    setSortType("oldest");
                    setIsSortOpen(false);
                  }}
                >
                  오래된순
                </button>
              </div>
            )}
          </div>
        </div>

        {loading && <p className={styles.stateText}>불러오는 중...</p>}
        {error && <p className={styles.stateText}>{error}</p>}

        {activeTab === "myItems" &&
          (sortedMyItems.length === 0 ? (
            <p className={styles.stateText}>등록된 상품이 없습니다.</p>
          ) : (
            <section className={styles.grid}>
              {sortedMyItems.map((item) => (
                <div className={styles.card} key={item.itemId}>
                  <div className={styles.thumb}></div>

                  <h3>{item.title}</h3>
                  <p className={styles.meta}>
                    {item.location} · {item.timeAgo}
                  </p>
                  <p className={styles.price}>
                    ₩{Number(item.pricePerDay || 0).toLocaleString()} / 하루
                  </p>

                  <div className={styles.tags}>
                    <span>보증금 ₩{Number(item.depositAmount || 0).toLocaleString()}</span>
                    <span>대여 {item.rentalDays || 0}일</span>
                    <span>{item.pickupLocation || "-"}</span>
                  </div>
                </div>
              ))}
            </section>
          ))}

        {activeTab === "rentals" &&
          (sortedRentalItems.length === 0 ? (
            <p className={styles.stateText}>대여중인 상품이 없습니다.</p>
          ) : (
            <section className={styles.rentalList}>
              {sortedRentalItems.map((item) => (
                <div className={styles.rentalCard} key={item.rentalId}>
                  <div className={styles.rentalShop}>
                    <div className={styles.rentalAvatar}></div>

                    <div className={styles.rentalShopInfo}>
                      <p className={styles.rentalShopName}>{item.ownerNickname}</p>
                      <p className={styles.rentalShopRating}>
                        대여 상태 {item.rentalStatus}
                      </p>
                    </div>
                  </div>

                  <div className={styles.rentalInfo}>
                    <h3>{item.title}</h3>
                    <p className={styles.rentalCategory}>{item.category}</p>
                    <p className={styles.rentalPeriod}>대여기간 : {item.rentalPeriod}</p>
                    <p className={styles.rentalRemain}>남은기간 : {item.remainingDays}일</p>
                  </div>

                  <div className={styles.rentalImageBox}>상품 이미지</div>

                  <div className={styles.rentalActions}>
                    <button className={styles.rentalBtnDark}>대여자 채팅</button>
                    <button className={styles.rentalBtnDark}>대여기간 연장</button>
                  </div>
                </div>
              ))}
            </section>
          ))}

        {activeTab === "reservations" && (
          <section className={styles.reservationTable}>
            <div className={styles.reservationTableHead}>
              <div className={styles.reservationHeadCol}>
                <h3>받은 예약요청</h3>
                <span>{receivedReservations.length}건</span>
              </div>

              <div className={styles.reservationHeadDivider}></div>

              <div className={styles.reservationHeadCol}>
                <h3>보낸 예약요청</h3>
                <span>{sentReservations.length}건</span>
              </div>
            </div>

            <div className={styles.reservationTableBody}>
              <div className={styles.reservationBodyCol}>
                {receivedReservations.length === 0 ? (
                  <p className={styles.stateText}>받은 예약요청이 없어요.</p>
                ) : (
                  receivedReservations.map((item) => (
                    <div className={styles.reservationCard} key={item.orderId}>
                      <div className={styles.reservationThumb}></div>

                      <div className={styles.reservationInfo}>
                        <div className={styles.reservationShopRow}>
                          <div className={styles.reservationAvatar}></div>
                          <div className={styles.reservationShopInfo}>
                            <p className={styles.reservationShopName}>
                              {item.targetNickname}
                            </p>
                            <p className={styles.reservationShopRating}>
                              ★★★★★ {item.targetMannerScore}
                            </p>
                          </div>
                        </div>

                        <h4>{item.title}</h4>
                        <p className={styles.reservationCategory}>
                          카테고리 · {item.category}
                        </p>
                        <p className={styles.reservationPeriod}>
                          대여 요청기간 : {item.requestPeriod}
                        </p>
                      </div>

                      <div className={styles.reservationActions}>
                        <button className={styles.reservationPrimaryBtn}>대여 수락</button>
                        <button className={styles.reservationSecondaryBtn}>채팅 보내기</button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className={styles.reservationBodyDivider}></div>

              <div className={styles.reservationBodyCol}>
                {sentReservations.length === 0 ? (
                  <p className={styles.stateText}>보낸 예약요청이 없어요.</p>
                ) : (
                  sentReservations.map((item) => (
                    <div className={styles.reservationCard} key={item.orderId}>
                      <div className={styles.reservationThumb}></div>

                      <div className={styles.reservationInfo}>
                        <div className={styles.reservationShopRow}>
                          <div className={styles.reservationAvatar}></div>
                          <div className={styles.reservationShopInfo}>
                            <p className={styles.reservationShopName}>
                              {item.targetNickname}
                            </p>
                            <p className={styles.reservationShopRating}>
                              ★★★★★ {item.targetMannerScore}
                            </p>
                          </div>
                        </div>

                        <h4>{item.title}</h4>
                        <p className={styles.reservationCategory}>
                          카테고리 · {item.category}
                        </p>
                        <p className={styles.reservationPeriod}>
                          대여 요청기간 : {item.requestPeriod}
                        </p>
                      </div>

                      <div className={styles.reservationActions}>
                        <button className={styles.reservationPrimaryBtn}>{item.status}</button>
                        <button className={styles.reservationSecondaryBtn}>채팅 보내기</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === "favorites" &&
          (sortedFavoriteItems.length === 0 ? (
            <p className={styles.stateText}>찜한 상품이 없습니다.</p>
          ) : (
            <section className={styles.favoriteGrid}>
              {sortedFavoriteItems.map((item) => {
                const imageUrl = buildImageUrl(item);
                const isFavoriteLoading = favoriteLoadingId === item.itemId;

                return (
                  <div className={styles.favoriteCard} key={item.itemId}>
                    <div className={styles.favoriteThumbWrap}>
                      <Link href={`/products/${item.itemId}`} className={styles.favoriteLink}>
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={item.title || "상품 이미지"}
                            className={styles.favoriteThumbImage}
                          />
                        ) : (
                          <div className={styles.favoriteThumb}>이미지 준비중</div>
                        )}
                      </Link>

                      <button
                        type="button"
                        className={`${styles.favoriteBtn} ${styles.favoriteBtnActive}`}
                        onClick={() => handleToggleFavoriteInFavorites(item.itemId)}
                        disabled={isFavoriteLoading}
                        aria-label="찜 해제"
                      >
                        <span className={styles.favoriteInner}>
                          <span className={styles.favoriteIcon}>♥</span>
                          <span className={styles.favoriteCount}>
                            {Math.max(1, Number(item.favoriteCount || 0))}
                          </span>
                        </span>
                      </button>
                    </div>

                    <div className={styles.favoriteBody}>
                      <Link href={`/products/${item.itemId}`} className={styles.favoriteLink}>
                        <h3>{item.title || "-"}</h3>
                      </Link>

                      <p className={styles.favoriteMeta}>{item.location || item.locationAreaCode || "-"}</p>
                      <p className={styles.favoritePrice}>
                        {item.pricePerDay
                          ? `₩${Number(item.pricePerDay).toLocaleString()} / 하루`
                          : "-"}
                      </p>

                      <div className={styles.favoriteTags}>
                        {item.depositAmount ? (
                          <span>보증금 ₩{Number(item.depositAmount).toLocaleString()}</span>
                        ) : null}
                        {item.rentalDays ? <span>대여 {item.rentalDays}일</span> : null}
                        {item.pickupLocation ? <span>{item.pickupLocation}</span> : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          ))}

        {activeTab === "reviews" && (
          <section className={styles.reviewTab}>
            <div className={styles.reviewTopTitle}>
              <span>리뷰</span>
              <strong>{sortedReviewItems.length}</strong>
            </div>

            <div className={styles.reviewSummaryBar}>
              <div className={styles.reviewSummaryLeft}>
                <strong className={styles.reviewBigScore}>{avgRating || 0}</strong>
                <div className={styles.reviewBigStars}>★★★★★</div>
              </div>

              <div className={styles.reviewSummaryDivider}></div>

              <div className={styles.reviewSummaryRight}>
                <strong className={styles.reviewBigPercent}>100%</strong>
                <p>만족후기</p>
              </div>
            </div>

            <div className={styles.reviewFeed}>
              {!Array.isArray(sortedReviewItems) || sortedReviewItems.length === 0 ? (
                <p className={styles.stateText}>등록된 리뷰가 없어요.</p>
              ) : (
                sortedReviewItems.map((item) => (
                  <div className={styles.reviewFeedItem} key={item.reviewId}>
                    <div className={styles.reviewFeedTop}>
                      <div className={styles.reviewProfile}>
                        <div className={styles.reviewAvatar}></div>
                        <div className={styles.reviewUserInfo}>
                          <h4>리뷰</h4>
                          <div className={styles.reviewStars}>
                            {"★".repeat(item.rating || 0)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={styles.reviewTagPills}>
                      {(item.tags || []).map((tag, idx) => (
                        <span key={idx}>{tag}</span>
                      ))}
                    </div>

                    <p className={styles.reviewContent}>{item.content || "-"}</p>

                    <button className={styles.reportBtn}>신고하기</button>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}