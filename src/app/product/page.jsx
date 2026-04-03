"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

const SORT_OPTIONS = [
  { label: "최신순", value: "latest" },
  { label: "인기순", value: "popular" },
];

async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
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
    throw new Error(data?.message || `요청 실패 (${response.status})`);
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

  if (categoryId) params.set("categoryId", categoryId);
  if (sort) params.set("sort", sort);
  params.set("page", String(page));
  params.set("size", String(size));

  return request(`/bilyeoit/v1/items?${params.toString()}`);
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

function formatPrice(price) {
  if (price == null) return "-";
  return `₩${Number(price).toLocaleString("ko-KR")}`;
}

function ProductCard({ item }) {
  const imageUrl = buildImageUrl(item);

  return (
    <article className={styles.card}>
      <a href={`/products/${item.itemId}`} className={styles.cardLink}>
        <div className={styles.thumbWrap}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={item.title || "상품 이미지"}
              className={styles.thumb}
            />
          ) : (
            <div className={styles.thumbEmpty}>이미지 준비중</div>
          )}

          <div className={styles.badges}>
            {item.firstCategory ? (
              <span className={styles.badge}>{item.firstCategory}</span>
            ) : null}
            {item.secondCategory ? (
              <span className={styles.badgeSub}>{item.secondCategory}</span>
            ) : null}
          </div>
        </div>

        <div className={styles.cardBody}>
          <h3 className={styles.title}>{item.title || "제목 없음"}</h3>

          <p className={styles.meta}>
            @{item.ownerNickname || "알 수 없음"}
            {item.locationAreaCode ? ` · ${item.locationAreaCode}` : ""}
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
              “{item.tags.slice(0, 2).join(" · ")}”
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

export default function ProductsPage() {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  const [selectedMainId, setSelectedMainId] = useState(null);
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

      setItems(Array.isArray(data?.content) ? data.content : []);
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

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchSubcategories(selectedMainId);
    setSelectedSubId(null);
    setPageInfo((prev) => ({ ...prev, page: 0 }));
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
                <span>{currentMainCategory?.name || "카테고리"}</span>
              </div>
            </div>
          </div>

          <div className={styles.categoryBoard}>
            {loadingCategories ? (
              <p className={styles.stateText}>카테고리 불러오는 중...</p>
            ) : (
              <>
                <div className={styles.mainCategoryRow}>
  {/* 전체보기 */}
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

  {/* 카테고리 */}
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
                {currentMainCategory?.name || "상품 목록"}
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
                  <ProductCard key={item.itemId} item={item} />
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