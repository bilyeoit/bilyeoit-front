"use client";

import {
  getMyPageMainInfo,
  getMyItems,
  getRentals,
  getFavorites,
  getReviews,
  getReservationDashboard,
} from "@/services/mypage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./page.module.css";
import Link from "next/link";
import RentalRequestModal from "@/components/RentalRequestModal";
import PaymentModal from "@/components/chat/PaymentModal";

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
    item?.thumbnailUrl ||
    item?.imageUrl ||
    item?.itemImageUrl ||
    item?.thumbnail ||
    item?.image ||
    item?.images?.[0]?.imageUrl ||
    item?.images?.[0]?.url ||
    item?.imageUrls?.[0] ||
    "";

  if (!rawThumbnail) return "";
  if (rawThumbnail.startsWith("http")) return rawThumbnail;
  return `${API_BASE_URL}${rawThumbnail}`;
}

function getSentStatusLabel(status) {
  switch (status) {
    case "PENDING":
      return "수락 대기중";
    case "ACCEPTED":
      return "결제 대기중";
    case "PAID":
    case "IN_PROGRESS":
      return "진행중";
    case "COMPLETED":
      return "대여 완료";
    case "REJECTED":
      return "거절됨";
    case "CANCELLED":
      return "취소됨";
    default:
      return status || "-";
  }
}

function getReceivedStatusLabel(status) {
  switch (status) {
    case "PENDING":
      return "대여 수락";
    case "ACCEPTED":
      return "결제 대기중";
    case "PAID":
    case "IN_PROGRESS":
      return "진행중";
    case "COMPLETED":
      return "대여 완료";
    case "REJECTED":
      return "거절됨";
    case "CANCELLED":
      return "취소됨";
    default:
      return status || "-";
  }
}

function isPending(status) {
  return status === "PENDING";
}

function isVisibleReservationStatus(status) {
  return status === "PENDING" || status === "ACCEPTED";
}

function isRentingStatus(status) {
  return status === "PAID" || status === "IN_PROGRESS";
}

function getReservationImage(item) {
  return (
    item?.thumbnailUrl ||
    item?.thumbnail_url ||
    item?.imageUrl ||
    item?.image_url ||
    item?.itemImageUrl ||
    item?.item_image_url ||
    item?.images?.[0]?.imageUrl ||
    ""
  );
}

function getTargetNickname(item) {
  return item?.targetNickname || item?.nickname || "사용자";
}

function getTargetProfileImage(item) {
  return (
    item?.targetProfileImage ||
    item?.targetProfileImageUrl ||
    item?.profileImageUrl ||
    item?.profile_image_url ||
    ""
  );
}

function getItemProgressStatus(item) {
  return item?.orderStatus || item?.status || item?.rentalStatus || "";
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

  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPaymentReservation, setSelectedPaymentReservation] = useState(null);

  const fetchMainInfo = useCallback(async () => {
    try {
      const data = await getMyPageMainInfo();
      setMainInfo(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchReservationDashboard = useCallback(async () => {
    try {
      const data = await getReservationDashboard();
      setReceivedReservations(data?.receivedRequests || []);
      setSentReservations(data?.sentRequests || []);
    } catch (e) {
      console.error("예약 대시보드 조회 실패", e);
    }
  }, []);

  const refetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [mainRes, itemsRes, rentalsRes, reservationRes, favoritesRes, reviewsRes] =
        await Promise.all([
          getMyPageMainInfo(),
          getMyItems(),
          getRentals(),
          getReservationDashboard(),
          getFavorites(),
          getReviews(),
        ]);

      setMainInfo(mainRes || null);
      setMyItems(Array.isArray(itemsRes) ? itemsRes : itemsRes?.items || []);
      setRentalItems(Array.isArray(rentalsRes) ? rentalsRes : rentalsRes?.items || []);
      setReceivedReservations(reservationRes?.receivedRequests || []);
      setSentReservations(reservationRes?.sentRequests || []);

      const nextFavorites =
        favoritesRes?.items || (Array.isArray(favoritesRes) ? favoritesRes : []);

      setFavoriteItems(
        nextFavorites.map((item) => ({
          ...item,
          isFavorite: true,
          favoriteCount: Math.max(1, Number(item?.favoriteCount || 0)),
        }))
      );

      setAvgRating(reviewsRes?.avgRating || 0);
      setReviewItems(
        Array.isArray(reviewsRes?.reviews)
          ? reviewsRes.reviews
          : Array.isArray(reviewsRes?.items)
          ? reviewsRes.items
          : Array.isArray(reviewsRes)
          ? reviewsRes
          : []
      );
    } catch (e) {
      console.error(e);
      setError(e.message || "데이터를 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMainInfo();
  }, [fetchMainInfo]);

  useEffect(() => {
    fetchReservationDashboard();
  }, [fetchReservationDashboard]);

  useEffect(() => {
    if (searchParams.get("updated") === "1") {
      refetchAll();
      router.replace("/mypage");
    }
  }, [searchParams, refetchAll, router]);

  useEffect(() => {
    function handleRefresh() {
      refetchAll();
    }

    window.addEventListener("RENT_STATUS_CHANGED", handleRefresh);

    return () => {
      window.removeEventListener("RENT_STATUS_CHANGED", handleRefresh);
    };
  }, [refetchAll]);

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
          setMyItems(Array.isArray(data) ? data : data?.items || []);
        }

        if (activeTab === "rentals") {
          const data = await getRentals();
          setRentalItems(Array.isArray(data) ? data : data?.items || []);
        }

        if (activeTab === "reservations") {
          const data = await getReservationDashboard();
          setReceivedReservations(data?.receivedRequests || []);
          setSentReservations(data?.sentRequests || []);
        }

        if (activeTab === "favorites") {
          const data = await getFavorites();
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

  const handleToggleFavoriteInFavorites = useCallback(
    async (itemId) => {
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
    },
    [favoriteItems]
  );

  const handleOpenAcceptModal = useCallback((reservation) => {
    setSelectedReservation(reservation);
    setAcceptModalOpen(true);
  }, []);

  const handleCloseAcceptModal = useCallback(() => {
    setAcceptModalOpen(false);
    setSelectedReservation(null);
  }, []);

  const handleOpenPaymentModal = useCallback((reservation) => {
    setSelectedPaymentReservation(reservation);
    setPaymentModalOpen(true);
  }, []);

  const handleClosePaymentModal = useCallback(() => {
    setPaymentModalOpen(false);
    setSelectedPaymentReservation(null);
  }, []);

  const handlePaymentCompleted = useCallback(async () => {
    handleClosePaymentModal();
    await refetchAll();
    setActiveTab("rentals");
    window.dispatchEvent(new Event("RENT_STATUS_CHANGED"));
  }, [handleClosePaymentModal, refetchAll]);

  const visibleReceivedReservations = useMemo(
    () => receivedReservations.filter((item) => isVisibleReservationStatus(item?.status)),
    [receivedReservations]
  );

  const visibleSentReservations = useMemo(
    () => sentReservations.filter((item) => isVisibleReservationStatus(item?.status)),
    [sentReservations]
  );

  const visibleRentalItems = useMemo(
    () =>
      rentalItems.filter((item) =>
        isRentingStatus(item?.status || item?.rentalStatus || item?.orderStatus)
      ),
    [rentalItems]
  );

  const tabs = useMemo(
    () => [
      { key: "myItems", label: "내 상품", count: `${mainInfo?.myItemCount ?? myItems.length}개` },
      {
        key: "rentals",
        label: "대여상품",
        count: `${visibleRentalItems.length}건`,
      },
      {
        key: "reservations",
        label: "예약상품",
        count: `${visibleReceivedReservations.length + visibleSentReservations.length}건`,
      },
      { key: "favorites", label: "찜목록", count: `${mainInfo?.favoriteItemCount ?? 0}개` },
      { key: "reviews", label: "리뷰", count: `${mainInfo?.reviewCount ?? 0}개` },
    ],
    [
      mainInfo,
      myItems.length,
      visibleRentalItems.length,
      visibleReceivedReservations.length,
      visibleSentReservations.length,
    ]
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
    const copied = [...visibleRentalItems];
    return copied.sort((a, b) => {
      const aTime = new Date(a?.createdAt || 0).getTime();
      const bTime = new Date(b?.createdAt || 0).getTime();
      if (sortType === "latest") return bTime - aTime;
      return aTime - bTime;
    });
  }, [visibleRentalItems, sortType]);

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

  const paymentSummary = useMemo(() => {
    if (!selectedPaymentReservation) return null;

    return {
      itemTitle: selectedPaymentReservation?.title || "상품명",
      thumbnailUrl: buildImageUrl({
        thumbnailUrl: getReservationImage(selectedPaymentReservation),
      }),
      startDate:
        selectedPaymentReservation?.startDate ||
        selectedPaymentReservation?.rentalStartDate ||
        "-",
      endDate:
        selectedPaymentReservation?.endDate ||
        selectedPaymentReservation?.rentalEndDate ||
        "-",
      rentalAmount:
        selectedPaymentReservation?.rentalAmount ||
        selectedPaymentReservation?.totalRentalAmount ||
        selectedPaymentReservation?.pricePerDayTotal ||
        selectedPaymentReservation?.pricePerDay ||
        0,
      depositAmount: selectedPaymentReservation?.depositAmount || 0,
    };
  }, [selectedPaymentReservation]);

  return (
    <>
      <main className={styles.mypage}>
        <div className={styles.inner}>
          <section className={styles.topSection}>
            <div className={styles.profileWrap}>
              <div className={styles.profileLeft}>
                <div className={styles.avatar}>
                  {mainInfo?.profileImageUrl ? (
                    <img src={mainInfo.profileImageUrl} alt={mainInfo?.nickname || "프로필"} />
                  ) : null}
                </div>

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
                {sortedMyItems.map((item) => {
                  const imageUrl = buildImageUrl(item);
                  const renting = isRentingStatus(getItemProgressStatus(item));

                  return (
                    <div className={styles.card} key={item.itemId}>
                      <div className={styles.thumb}>
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={item.title || "상품 이미지"}
                            className={styles.cardThumbImage}
                          />
                        ) : null}

                        {renting && <div className={styles.overlay}>대여중</div>}
                      </div>

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
                  );
                })}
              </section>
            ))}

          {activeTab === "rentals" &&
            (sortedRentalItems.length === 0 ? (
              <p className={styles.stateText}>대여한 상품이 없습니다.</p>
            ) : (
              <section className={styles.rentalList}>
                {sortedRentalItems.map((item) => {
                  const imageUrl = buildImageUrl(item);
                  const ownerProfileImage = buildImageUrl({
                    thumbnailUrl: item?.ownerProfileImageUrl,
                  });

                  return (
                    <div className={styles.rentalCard} key={item.rentalId || item.itemId}>
                      <div className={styles.rentalShop}>
                        <div className={styles.rentalAvatar}>
                          {ownerProfileImage ? (
                            <img
                              src={ownerProfileImage}
                              alt={item?.ownerNickname || "판매자"}
                              className={styles.rentalAvatarImage}
                            />
                          ) : null}
                        </div>

                        <div className={styles.rentalShopInfo}>
                          <p className={styles.rentalShopName}>
                            {item?.ownerNickname || "판매자"}
                          </p>
                          <p className={styles.rentalShopRating}>★★★★★</p>
                        </div>
                      </div>

                      <div className={styles.rentalInfo}>
                        <h3>{item?.title || "상품명"}</h3>
                        <p className={styles.rentalCategory}>{item?.category || "-"}</p>
                        <p className={styles.rentalPeriod}>{item?.rentalPeriod || "-"}</p>
                      </div>

                      <div className={styles.rentalRemain}>
                        {typeof item?.remainingDays === "number"
                          ? `${item.remainingDays}일 남음`
                          : item?.rentalStatus || item?.status || "-"}
                      </div>

                      <div className={styles.rentalImageBox}>
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={item?.title || "상품 이미지"}
                            className={styles.rentalThumbImage}
                          />
                        ) : (
                          "이미지"
                        )}
                      </div>
                    </div>
                  );
                })}
              </section>
            ))}

          {activeTab === "reservations" &&
            (visibleReceivedReservations.length === 0 &&
            visibleSentReservations.length === 0 ? (
              <p className={styles.stateText}>예약 내역이 없습니다.</p>
            ) : (
              <section className={styles.reservationTable}>
                <div className={styles.reservationTableHead}>
                  <div className={styles.reservationHeadCol}>
                    <h3>받은 예약요청</h3>
                    <span>{visibleReceivedReservations.length}건</span>
                  </div>

                  <div className={styles.reservationHeadDivider}></div>

                  <div className={styles.reservationHeadCol}>
                    <h3>보낸 예약요청</h3>
                    <span>{visibleSentReservations.length}건</span>
                  </div>
                </div>

                <div className={styles.reservationTableBody}>
                  <div className={styles.reservationBodyCol}>
                    {visibleReceivedReservations.length === 0 ? (
                      <p className={styles.stateText}>받은 예약요청이 없습니다.</p>
                    ) : (
                      visibleReceivedReservations.map((item) => {
                        const imageUrl = buildImageUrl({
                          thumbnailUrl: getReservationImage(item),
                        });
                        const profileImage = buildImageUrl({
                          thumbnailUrl: getTargetProfileImage(item),
                        });
                        const pending = isPending(item?.status);

                        return (
                          <div className={styles.reservationCard} key={`received-${item.orderId}`}>
                            <div className={styles.reservationThumb}>
                              {imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={item?.title || "상품 이미지"}
                                  className={styles.reservationThumbImage}
                                />
                              ) : (
                                "이미지"
                              )}
                            </div>

                            <div className={styles.reservationInfo}>
                              <div className={styles.reservationShopRow}>
                                <div className={styles.reservationAvatar}>
                                  {profileImage ? (
                                    <img
                                      src={profileImage}
                                      alt={getTargetNickname(item)}
                                      className={styles.reservationAvatarImage}
                                    />
                                  ) : null}
                                </div>

                                <div className={styles.reservationShopInfo}>
                                  <p className={styles.reservationShopName}>
                                    {getTargetNickname(item)}
                                  </p>
                                  <p className={styles.reservationShopRating}>
                                    ★★★★★ {item?.targetMannerScore ?? 0}
                                  </p>
                                </div>
                              </div>

                              <h4>{item?.title || "상품명"}</h4>
                              <p className={styles.reservationCategory}>
                                {item?.category || "카테고리 없음"}
                              </p>
                              <p className={styles.reservationPeriod}>
                                {item?.requestPeriod || "-"}
                              </p>
                            </div>

                            <div className={styles.reservationActions}>
                              {pending ? (
                                <button
                                  type="button"
                                  className={styles.reservationPrimaryBtn}
                                  onClick={() => handleOpenAcceptModal(item)}
                                >
                                  대여 수락
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className={styles.reservationPrimaryBtn}
                                  disabled
                                >
                                  {getReceivedStatusLabel(item?.status)}
                                </button>
                              )}

                              <button
                                type="button"
                                className={styles.reservationSecondaryBtn}
                              >
                                채팅 보내기
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className={styles.reservationBodyDivider}></div>

                  <div className={styles.reservationBodyCol}>
                    {visibleSentReservations.length === 0 ? (
                      <p className={styles.stateText}>보낸 예약요청이 없습니다.</p>
                    ) : (
                      visibleSentReservations.map((item) => {
                        const imageUrl = buildImageUrl({
                          thumbnailUrl: getReservationImage(item),
                        });
                        const profileImage = buildImageUrl({
                          thumbnailUrl: getTargetProfileImage(item),
                        });

                        return (
                          <div className={styles.reservationCard} key={`sent-${item.orderId}`}>
                            <div className={styles.reservationThumb}>
                              {imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={item?.title || "상품 이미지"}
                                  className={styles.reservationThumbImage}
                                />
                              ) : (
                                "이미지"
                              )}
                            </div>

                            <div className={styles.reservationInfo}>
                              <div className={styles.reservationShopRow}>
                                <div className={styles.reservationAvatar}>
                                  {profileImage ? (
                                    <img
                                      src={profileImage}
                                      alt={getTargetNickname(item)}
                                      className={styles.reservationAvatarImage}
                                    />
                                  ) : null}
                                </div>

                                <div className={styles.reservationShopInfo}>
                                  <p className={styles.reservationShopName}>
                                    {getTargetNickname(item)}
                                  </p>
                                  <p className={styles.reservationShopRating}>
                                    ★★★★★ {item?.targetMannerScore ?? 0}
                                  </p>
                                </div>
                              </div>

                              <h4>{item?.title || "상품명"}</h4>
                              <p className={styles.reservationCategory}>
                                {item?.category || "카테고리 없음"}
                              </p>
                              <p className={styles.reservationPeriod}>
                                {item?.requestPeriod || "-"}
                              </p>
                            </div>

                            <div className={styles.reservationActions}>
                              {item?.status === "ACCEPTED" ? (
                                <button
                                  type="button"
                                  className={styles.reservationPrimaryBtn}
                                  onClick={() => handleOpenPaymentModal(item)}
                                >
                                  결제하기
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className={styles.reservationPrimaryBtn}
                                  disabled
                                >
                                  {getSentStatusLabel(item?.status)}
                                </button>
                              )}

                              <button
                                type="button"
                                className={styles.reservationSecondaryBtn}
                              >
                                채팅 보내기
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </section>
            ))}

          {activeTab === "favorites" &&
            (sortedFavoriteItems.length === 0 ? (
              <p className={styles.stateText}>찜한 상품이 없습니다.</p>
            ) : (
              <section className={styles.grid}>
                {sortedFavoriteItems.map((item) => {
                  const imageUrl = buildImageUrl(item);

                  return (
                    <div className={styles.card} key={item.itemId}>
                      <div className={styles.thumb}>
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={item.title || "상품 이미지"}
                            className={styles.cardThumbImage}
                          />
                        ) : null}
                      </div>

                      <h3>{item.title}</h3>
                      <p className={styles.meta}>
                        {item.areaName || item.locationAreaCode || item.location || "-"}
                      </p>
                      <p className={styles.price}>
                        ₩{Number(item.pricePerDay || 0).toLocaleString()} / 하루
                      </p>

                      <div className={styles.tags}>
                        {(item.tags || []).slice(0, 3).map((tag, index) => (
                          <span key={`${item.itemId}-${tag}-${index}`}>{tag}</span>
                        ))}
                      </div>

                      <button
                        type="button"
                        className={styles.favoriteRemoveBtn}
                        onClick={() => handleToggleFavoriteInFavorites(item.itemId)}
                        disabled={favoriteLoadingId === item.itemId}
                      >
                        {favoriteLoadingId === item.itemId ? "처리중..." : "찜 해제"}
                      </button>
                    </div>
                  );
                })}
              </section>
            ))}

          {activeTab === "reviews" &&
            (sortedReviewItems.length === 0 ? (
              <p className={styles.stateText}>등록된 리뷰가 없습니다.</p>
            ) : (
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
                  {sortedReviewItems.map((item) => (
                    <div className={styles.reviewFeedItem} key={item.reviewId}>
                      <div className={styles.reviewHeader}>
                        <div className={styles.reviewUserInfo}>
                          <div className={styles.reviewAvatar}>
                            {item?.reviewerProfileImageUrl ? (
                              <img
                                src={buildImageUrl({ thumbnailUrl: item.reviewerProfileImageUrl })}
                                alt={item?.reviewerNickname || "리뷰 작성자"}
                                className={styles.reviewAvatarImage}
                              />
                            ) : null}
                          </div>

                          <div>
                            <strong>{item?.reviewerNickname || "사용자"}</strong>
                            <span>★★★★★ {item?.rating || 0}</span>
                          </div>
                        </div>

                        <div className={styles.reviewDate}>{item?.createdAt || "-"}</div>
                      </div>

                      {Array.isArray(item?.tags) && item.tags.length > 0 && (
                        <div className={styles.reviewTagPills}>
                          {item.tags.map((tag, index) => (
                            <span key={`${item.reviewId}-${tag}-${index}`}>{tag}</span>
                          ))}
                        </div>
                      )}

                      <div className={styles.reviewContentBox}>
                        <p className={styles.reviewContent}>
                          {item?.content || "리뷰 내용이 없습니다."}
                        </p>
                      </div>

                      <button type="button" className={styles.reportBtn}>
                        신고하기
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ))}
        </div>
      </main>

      <RentalRequestModal
  open={acceptModalOpen}
  onClose={handleCloseAcceptModal}
  mode="accept"
  orderId={selectedReservation?.orderId || null}
  product={{
    itemId: selectedReservation?.itemId || null,
    title: selectedReservation?.title || "상품명",
    thumbnailUrl: getReservationImage(selectedReservation || {}),
    pricePerDay:
      selectedReservation?.pricePerDay ||
      selectedReservation?.dailyRental ||
      selectedReservation?.rentalPrice ||
      selectedReservation?.price ||
      0,
    depositAmount:
      selectedReservation?.depositAmount ||
      selectedReservation?.recommendedDeposit ||
      0,
    areaName:
      selectedReservation?.areaName ||
      selectedReservation?.locationAreaCode ||
      selectedReservation?.location ||
      "",
    ownerNickname: getTargetNickname(selectedReservation || {}),
  }}
  shopInfo={{
    nickname: getTargetNickname(selectedReservation || {}),
  }}
  targetUserId={selectedReservation?.targetUserId || null}
  onCompleted={async () => {
    handleCloseAcceptModal();
    await refetchAll();
    window.dispatchEvent(new Event("RENT_STATUS_CHANGED"));
  }}
/>

      <PaymentModal
        open={paymentModalOpen}
        onClose={handleClosePaymentModal}
        orderId={selectedPaymentReservation?.orderId || null}
        summary={paymentSummary}
        onPaid={handlePaymentCompleted}
      />
    </>
  );
}