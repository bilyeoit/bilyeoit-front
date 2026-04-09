"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./page.module.css";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

const SORT_OPTIONS = [
  { label: "최신순", value: "latest" },
  { label: "인기순", value: "popular" },
];

async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("accessToken") ||
        sessionStorage.getItem("accessToken")
      : null;

  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

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

async function getCategories() {
  return request("/bilyeoit/v1/categories");
}

async function getSubcategories(categoryId) {
  return request(`/bilyeoit/v1/categories/${categoryId}/subcategories`);
}

async function getItems({ categoryId, sort, page, size }) {
  const params = new URLSearchParams();

  if (categoryId) params.set("categoryId", String(categoryId));
  if (sort) params.set("sort", sort);
  params.set("page", String(page));
  params.set("size", String(size));

  return request(`/bilyeoit/v1/items?${params.toString()}`);
}

async function toggleFavorite(itemId) {
  return request(`/bilyeoit/v1/items/${itemId}/favorite`, {
    method: "POST",
  });
}

async function getLikedItems() {
  return request("/bilyeoit/v1/mypage/likeitem");
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

function hasAuthToken() {
  if (typeof window === "undefined") return false;

  const token =
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("accessToken");

  return !!token;
}

function formatPrice(price) {
  if (price == null) return "-";
  return `₩${Number(price).toLocaleString("ko-KR")}`;
}

function ProductCard({ item, onToggleFavorite, favoriteLoadingId }) {
  const imageUrl = buildImageUrl(item);
  const isFavoriteLoading = favoriteLoadingId === item.itemId;

  return (
    <article className={styles.card}>
      <div className={styles.thumbWrap}>
        <a href={`/product/${item.itemId}`} className={styles.cardLink}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={item.title || "상품 이미지"}
              className={styles.thumb}
            />
          ) : (
            <div className={styles.thumbEmpty}>이미지 준비중</div>
          )}
        </a>

        <div className={styles.badges}>
          {item.firstCategory ? (
            <span className={styles.badge}>{item.firstCategory}</span>
          ) : null}
          {item.secondCategory ? (
            <span className={styles.badgeSub}>{item.secondCategory}</span>
          ) : null}
        </div>

        <button
          type="button"
          className={`${styles.favoriteBtn} ${
            item.isFavorite ? styles.favoriteBtnActive : ""
          }`}
          onClick={() => onToggleFavorite(item.itemId)}
          disabled={isFavoriteLoading}
          aria-label={item.isFavorite ? "찜 해제" : "찜 하기"}
        >
          <span className={styles.favoriteInner}>
            <span className={styles.favoriteIcon}>
              {item.isFavorite ? "♥" : "♡"}
            </span>
            <span className={styles.favoriteCount}>
              {Number(item.favoriteCount || 0)}
            </span>
          </span>
        </button>
      </div>

      <a href={`/product/${item.itemId}`} className={styles.cardLink}>
        <div className={styles.cardBody}>
          <h3 className={styles.title}>{item.title || "제목 없음"}</h3>

          <p className={styles.meta}>
            @{item.ownerNickname || "알 수 없음"}
            {item.area_name
              ? ` · ${item.area_name}`
              : item.areaName
              ? ` · ${item.areaName}`
              : item.locationAreaCode
              ? ` · ${item.locationAreaCode}`
              : ""}
          </p>

          <div className={styles.priceRow}>
            <strong className={styles.price}>
              {formatPrice(item.pricePerDay)}
              <span className={styles.priceUnit}> / 하루</span>
            </strong>

            <span className={styles.time}>{item.createdAt || ""}</span>
          </div>

          {Array.isArray(item.tags) && item.tags.length > 0 ? (
            <p className={styles.desc}>
              {item.tags.slice(0, 2).map((tag, index) => (
                <span key={`${item.itemId}-${tag}-${index}`}>
                  #{tag}
                  {index < Math.min(item.tags.length, 2) - 1 ? " " : ""}
                </span>
              ))}
            </p>
          ) : (
            <p className={styles.desc}>대여 가능한 상품이에요.</p>
          )}
        </div>
      </a>
    </article>
  );
}

function Pagination({ currentPage, totalPages, onChange }) {
  const pages = useMemo(() => {
    const maxVisible = 5;
    let start = Math.max(0, currentPage - 2);
    let end = Math.min(totalPages - 1, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(0, end - maxVisible + 1);
    }

    const result = [];
    for (let i = start; i <= end; i += 1) {
      result.push(i);
    }
    return result;
  }, [currentPage, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <div className={styles.pagination}>
      <button
        type="button"
        className={styles.pageArrow}
        onClick={() => onChange(currentPage - 1)}
        disabled={currentPage === 0}
        aria-label="이전 페이지"
      >
        ‹
      </button>

      {pages.map((page) => (
        <button
          key={page}
          type="button"
          className={`${styles.pageBtn} ${
            page === currentPage ? styles.pageBtnActive : ""
          }`}
          onClick={() => onChange(page)}
        >
          {page + 1}
        </button>
      ))}

      <button
        type="button"
        className={styles.pageArrow}
        onClick={() => onChange(currentPage + 1)}
        disabled={currentPage === totalPages - 1}
        aria-label="다음 페이지"
      >
        ›
      </button>
    </div>
  );
}

function ProductsPageInner() {
  const searchParams = useSearchParams();

  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  const [selectedMainId, setSelectedMainId] = useState(() => {
  const categoryId = searchParams.get("categoryId");
    return categoryId ? Number(categoryId) : null;
  });
  const [selectedSubId, setSelectedSubId] = useState(null);
  const [sort, setSort] = useState("latest");

  const [items, setItems] = useState([]);
  const [pageInfo, setPageInfo] = useState({
    page: 0,
    size: 20,
    totalPages: 0,
    totalElements: 0,
  });

  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingItems, setLoadingItems] = useState(true);
  const [favoriteLoadingId, setFavoriteLoadingId] = useState(null);
  const [error, setError] = useState("");

  const activeCategoryId = selectedSubId || selectedMainId;

  const fetchCategories = useCallback(async () => {
    try {
      setLoadingCategories(true);
      const data = await getCategories();

      const mainCategories = Array.isArray(data)
        ? data.filter((item) => item.categoryType === "FIRST")
        : [];

      setCategories(mainCategories);
    } catch (err) {
      console.error(err);
      setError("카테고리를 불러오지 못했어요.");
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  const fetchSubcategories = useCallback(async (categoryId) => {
    if (!categoryId) {
      setSubcategories([]);
      return;
    }

    try {
      const data = await getSubcategories(categoryId);
      setSubcategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setSubcategories([]);
    }
  }, []);

  const fetchItems = useCallback(async () => {

    try {
      setLoadingItems(true);
      setError("");

      const data = await getItems({
        categoryId: activeCategoryId,
        sort,
        page: pageInfo.page,
        size: pageInfo.size,
      });

      let nextItems = Array.isArray(data?.content) ? data.content : [];

      if (hasAuthToken()) {
        try {
          const likedData = await getLikedItems();

          const likedItemsArray = Array.isArray(likedData)
            ? likedData
            : Array.isArray(likedData?.items)
            ? likedData.items
            : [];

          const likedIdSet = new Set(
            likedItemsArray
              .map((item) => Number(item?.itemId))
              .filter((id) => Number.isFinite(id))
          );

          nextItems = nextItems.map((item) => ({
            ...item,
            isFavorite: likedIdSet.has(Number(item.itemId)),
          }));
        } catch (likedErr) {
          console.error("찜목록 동기화 실패:", likedErr);
        }
        
      }

      setItems(nextItems);
      setPageInfo((prev) => ({
        ...prev,
        page: data?.page ?? 0,
        size: data?.size ?? prev.size,
        totalPages: data?.totalPages ?? 0,
        totalElements: data?.totalElements ?? 0,
      }));
    } catch (err) {
      console.error(err);
      setError(err.message || "상품 목록을 불러오지 못했어요.");
      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  }, [activeCategoryId, sort, pageInfo.page, pageInfo.size]);

  const handleToggleFavorite = useCallback(
    async (itemId) => {
      const currentItem = items.find((item) => item.itemId === itemId);
      if (!currentItem) return;

      const prevIsFavorite = !!currentItem.isFavorite;
      const prevFavoriteCount = Number(currentItem.favoriteCount || 0);

      try {
        setFavoriteLoadingId(itemId);

        setItems((prev) =>
          prev.map((item) =>
            item.itemId === itemId
              ? {
                  ...item,
                  isFavorite: !prevIsFavorite,
                  favoriteCount: prevIsFavorite
                    ? Math.max(0, prevFavoriteCount - 1)
                    : prevFavoriteCount + 1,
                }
              : item
          )
        );

        const result = await toggleFavorite(itemId);

        setItems((prev) =>
          prev.map((item) =>
            item.itemId === itemId
              ? {
                  ...item,
                  isFavorite:
                    typeof result?.isFavorite === "boolean"
                      ? result.isFavorite
                      : !prevIsFavorite,
                  favoriteCount:
                    typeof result?.isFavorite === "boolean"
                      ? result.isFavorite
                        ? prevIsFavorite
                          ? prevFavoriteCount
                          : prevFavoriteCount + 1
                        : prevIsFavorite
                        ? Math.max(0, prevFavoriteCount - 1)
                        : prevFavoriteCount
                      : item.favoriteCount,
                }
              : item
          )
        );
      } catch (err) {
        console.error(err);

        setItems((prev) =>
          prev.map((item) =>
            item.itemId === itemId
              ? {
                  ...item,
                  isFavorite: prevIsFavorite,
                  favoriteCount: prevFavoriteCount,
                }
              : item
          )
        );

        if (err?.status === 401) {
          alert("로그인 후 찜할 수 있어요.");
        } else {
          alert(err.message || "찜 처리에 실패했어요.");
        }
      } finally {
        setFavoriteLoadingId(null);
      }
    },
    [items]
  );

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    const categoryId = searchParams.get("categoryId");

    if (categoryId) {
      setSelectedMainId(Number(categoryId));
    } else {
      setSelectedMainId(null);
    }

    setSelectedSubId(null);
    setPageInfo((prev) => ({ ...prev, page: 0 }));
  }, [searchParams]);

  useEffect(() => {
    fetchSubcategories(selectedMainId);
  }, [selectedMainId, fetchSubcategories]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const currentMainCategory = categories.find(
    (category) => category.categoryId === selectedMainId
  );

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <section className={styles.topFilterSection}>
          <div className={styles.filterTopRow}>
            <div className={styles.filterChipWrap}>
              <button type="button" className={styles.primaryChip}>
                대여하기
              </button>

              <div className={styles.selectLike}>
                <span>{currentMainCategory?.name || "전체보기"}</span>
              </div>
            </div>
            <Link href="/product/create" className={styles.createBtn}>
              내 상품 등록
            </Link>
          </div>

          <div className={styles.categoryBoard}>
            {loadingCategories ? (
              <p className={styles.stateText}>카테고리 불러오는 중...</p>
            ) : (
              <>
                <div className={styles.mainCategoryRow}>
                  <button
                    type="button"
                    className={`${styles.categoryButton} ${
                      selectedMainId === null ? styles.categoryButtonActive : ""
                    }`}
                    onClick={() => {
                      setSelectedMainId(null);
                      setSelectedSubId(null);
                      setPageInfo((prev) => ({ ...prev, page: 0 }));
                    }}
                  >
                    <span>전체보기</span>
                  </button>

                  {categories.map((category) => (
                    <button
                      key={category.categoryId}
                      type="button"
                      className={`${styles.categoryButton} ${
                        selectedMainId === category.categoryId
                          ? styles.categoryButtonActive
                          : ""
                      }`}
                      onClick={() => {
                        setSelectedMainId(category.categoryId);
                        setSelectedSubId(null);
                        setPageInfo((prev) => ({ ...prev, page: 0 }));
                      }}
                    >
                      <span>{category.name}</span>
                    </button>
                  ))}
                </div>

                {subcategories.length > 0 ? (
                  <div className={styles.subCategoryRow}>
                    <button
                      type="button"
                      className={`${styles.categoryButtonSmall} ${
                        selectedSubId === null ? styles.categoryButtonActive : ""
                      }`}
                      onClick={() => {
                        setSelectedSubId(null);
                        setPageInfo((prev) => ({ ...prev, page: 0 }));
                      }}
                    >
                      전체보기
                    </button>

                    {subcategories.map((subcategory) => (
                      <button
                        key={subcategory.categoryId}
                        type="button"
                        className={`${styles.categoryButtonSmall} ${
                          selectedSubId === subcategory.categoryId
                            ? styles.categoryButtonActive
                            : ""
                        }`}
                        onClick={() => {
                          setSelectedSubId(subcategory.categoryId);
                          setPageInfo((prev) => ({ ...prev, page: 0 }));
                        }}
                      >
                        <span>{subcategory.name}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </section>

        <section className={styles.listSection}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>
                {currentMainCategory?.name || "전체보기"}
              </h2>
              <p className={styles.sectionDesc}>
                최근 게시글 기준으로, 내 동네에서 인기 있는 물건을 보여드려요
              </p>
            </div>

            <div className={styles.sortWrap}>
              <label htmlFor="sort" className={styles.sortLabel}>
                정렬
              </label>
              <select
                id="sort"
                className={styles.sortSelect}
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPageInfo((prev) => ({ ...prev, page: 0 }));
                }}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    정렬: {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error ? <p className={styles.errorText}>{error}</p> : null}

          {loadingItems ? (
            <div className={styles.grid}>
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className={styles.skeletonCard}>
                  <div className={styles.skeletonThumb}></div>
                  <div className={styles.skeletonLineLg}></div>
                  <div className={styles.skeletonLineMd}></div>
                  <div className={styles.skeletonLineSm}></div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className={styles.emptyBox}>
              <p className={styles.stateText}>등록된 상품이 없어요.</p>
            </div>
          ) : (
            <>
              <div className={styles.grid}>
                {items.map((item) => (
                  <ProductCard
                    key={item.itemId}
                    item={item}
                    onToggleFavorite={handleToggleFavorite}
                    favoriteLoadingId={favoriteLoadingId}
                  />
                ))}
              </div>

              <Pagination
                currentPage={pageInfo.page}
                totalPages={pageInfo.totalPages}
                onChange={(nextPage) => {
                  if (nextPage < 0 || nextPage >= pageInfo.totalPages) return;
                  setPageInfo((prev) => ({ ...prev, page: nextPage }));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </>
          )}
        </section>
      </div>
    </main>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <ProductsPageInner />
    </Suspense>
  );
}