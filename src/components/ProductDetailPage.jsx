"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/product/[id]/page.module.css";
import RentalRequestModal from "./RentalRequestModal";
import SimilarProducts from "./SimilarProducts";
import OpenChatButton from "@/components/chat/OpenChatButton";
import {
  getProductDetail,
  getSimilarProducts,
  getShopInfo,
} from "@/services/product";

function formatPrice(value) {
  return new Intl.NumberFormat("ko-KR").format(Number(value || 0));
}

function getCategoryText(categories = []) {
  if (!Array.isArray(categories) || categories.length === 0) return "-";
  return categories.map((item) => item.name).join(" / ");
}

function renderStars(rating = 5) {
  const rounded = Math.max(1, Math.min(5, Math.round(rating)));
  return "★".repeat(rounded) + "☆".repeat(5 - rounded);
}

export default function ProductDetailPage({ itemId }) {
  const router = useRouter();

  const [product, setProduct] = useState(null);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [shopInfo, setShopInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      try {
        setLoading(true);

        const productRes = await getProductDetail(itemId);
        console.log("상품상세응답", productRes);

        if (!isMounted) return;
        setProduct(productRes);

        const ownerUserId = productRes?.ownerUserId;

        let similarRes = null;
        let shopRes = null;

        try {
          similarRes = await getSimilarProducts(itemId);
          console.log("비슷한상품응답", similarRes);
        } catch (error) {
          console.error("비슷한상품 조회 실패:", error);
        }

        try {
          shopRes = ownerUserId ? await getShopInfo(ownerUserId) : null;
          console.log("상점정보응답", shopRes);
        } catch (error) {
          console.error("상점정보 조회 실패:", error);
        }

        if (!isMounted) return;

        setSimilarProducts(similarRes?.results || []);
        setShopInfo(shopRes || null);
      } catch (error) {
        console.error("상품 상세 조회 실패:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [itemId]);

  const images = Array.isArray(product?.images) ? product.images : [];
  const selectedImage = images[selectedImageIndex]?.imageUrl || "";
  const categoryText = useMemo(
    () => getCategoryText(product?.categories),
    [product?.categories]
  );

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.inner}>불러오는 중...</div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className={styles.page}>
        <div className={styles.inner}>상품 정보를 불러올 수 없어요.</div>
      </main>
    );
  }

  const locationText = product?.locationAreaCode || "지역 정보 없음";
  const rentalDaysText = product?.rentalDays ? `${product.rentalDays}일` : "-";
  const depositText = `${formatPrice(product?.depositAmount)}원`;
  const createdAtText = product?.createdAt || "-";

  const descriptionLines = product?.description
    ? product.description
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    : ["상품 설명이 아직 등록되지 않았어요."];

  const handleFavoriteClick = () => {
    alert("찜 기능은 기존 favorite API 연결 시 바로 붙일 수 있어요.");
  };

  const handleShareClick = async () => {
    const url = window.location.href;

    try {
      await navigator.clipboard.writeText(url);
      alert("상품 링크가 복사되었어요.");
    } catch {
      alert("링크 복사에 실패했어요.");
    }
  };

  return (
    <>
      <main className={styles.page}>
        <div className={styles.inner}>
          <div className={styles.breadcrumb}>
            <span>대여하기</span>
            <span>/</span>
            <span>{categoryText}</span>
          </div>

          <section className={styles.topGrid}>
            <div className={`${styles.card} ${styles.galleryCard}`}>
              <div className={styles.mainImageWrap}>
                {selectedImage ? (
                  <img
                    src={selectedImage}
                    alt={product?.title || "상품 이미지"}
                    className={styles.mainImage}
                  />
                ) : (
                  <div className={styles.imagePlaceholder}>이미지</div>
                )}

                <div className={styles.imageBadge}>대여가능</div>
              </div>

              <div className={styles.thumbnailDots}>
                {images.slice(0, 2).map((_, index) => (
                  <span
                    key={index}
                    className={index === selectedImageIndex ? styles.activeDot : ""}
                  />
                ))}
                {images.length === 0 && <span className={styles.activeDot} />}
              </div>

              <div className={styles.thumbnailRow}>
                {(images.length ? images.slice(0, 5) : Array.from({ length: 5 })).map(
                  (image, index) => (
                    <button
                      key={image?.itemImageId || index}
                      type="button"
                      className={`${styles.thumbnailButton} ${
                        index === selectedImageIndex ? styles.active : ""
                      }`}
                      onClick={() => image?.imageUrl && setSelectedImageIndex(index)}
                    >
                      {image?.imageUrl ? (
                        <img src={image.imageUrl} alt={`썸네일 ${index + 1}`} />
                      ) : (
                        <div className={styles.thumbnailFallback}>{index + 1}</div>
                      )}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className={`${styles.card} ${styles.infoCard}`}>
              <h1 className={styles.title}>{product?.title || "상품명"}</h1>

              <div className={styles.price}>
                {formatPrice(product?.pricePerDay)}
                <span className={styles.priceUnit}>원 / 하루</span>
              </div>

              <div className={styles.metaRow}>
                <span>관심 {product?.favoriteCount ?? 0}</span>
                <span className={styles.metaDot} />
                <span>조회 {product?.viewCount ?? 0}</span>
                <span className={styles.metaDot} />
                <span>{createdAtText}</span>
              </div>

              <dl className={styles.infoList}>
                <div className={styles.infoItem}>
                  <dt>픽업</dt>
                  <dd>{locationText}</dd>
                </div>
                <div className={styles.infoItem}>
                  <dt>보증금</dt>
                  <dd>{depositText}</dd>
                </div>
                <div className={styles.infoItem}>
                  <dt>최대</dt>
                  <dd>{rentalDaysText}</dd>
                </div>
                <div className={styles.infoItem}>
                  <dt>카테고리</dt>
                  <dd>{categoryText}</dd>
                </div>
              </dl>

              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => setIsRequestModalOpen(true)}
              >
                예약 요청하기
              </button>

              <div className={styles.actionRow}>
                <OpenChatButton
                  itemId={Number(itemId)}
                  targetUserId={product?.ownerUserId}
                  className={styles.subButton}
                >
                  채팅
                </OpenChatButton>

                <button
                  type="button"
                  className={styles.subButton}
                  onClick={handleFavoriteClick}
                >
                  찜 ♡
                </button>

                <button type="button" className={styles.subButton} onClick={handleShareClick}>
                  공유
                </button>
              </div>

              <p className={styles.notice}>예약은 채팅으로 일정 확정 후 진행돼요.</p>
            </div>
          </section>

          <section className={styles.bottomGrid}>
            <div>
              <div className={`${styles.card} ${styles.sectionCard}`}>
                <h2 className={styles.sectionTitle}>상품정보</h2>

                <ul className={styles.descriptionList}>
                  {descriptionLines.map((line, index) => (
                    <li key={`${line}-${index}`}>{line}</li>
                  ))}
                </ul>

                <div className={styles.metaChipRow}>
                  <div className={styles.metaChip}>
                    <span className={styles.metaChipLabel}>직거래지역</span>
                    <span>{locationText}</span>
                  </div>

                  <div className={styles.metaChip}>
                    <span className={styles.metaChipLabel}>카테고리</span>
                    <span>{categoryText}</span>
                  </div>

                  {(product?.tags || []).map((tag) => (
                    <div className={styles.metaChip} key={tag}>
                      <span className={styles.metaChipLabel}>태그</span>
                      <span>#{tag}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.similarWrap}>
                <SimilarProducts items={similarProducts} />
              </div>
            </div>

            <aside className={`${styles.card} ${styles.shopCard}`}>
              <h2 className={styles.sectionTitle}>상점정보</h2>

              <div className={styles.shopHeader}>
                <div className={styles.shopAvatar}>
                  {shopInfo?.profileImageUrl ? (
                    <img src={shopInfo.profileImageUrl} alt={shopInfo.nickname} />
                  ) : (
                    <div className={styles.shopAvatarFallback}>상점</div>
                  )}
                </div>

                <div className={styles.shopInfo}>
                  <strong>{shopInfo?.nickname || "상점명"}</strong>
                  <p>상품 {shopInfo?.itemCount ?? 0}</p>
                </div>
              </div>

              <div className={styles.shopReviewTitle}>
                상점후기 {Array.isArray(shopInfo?.reviews) ? shopInfo.reviews.length : 0}
              </div>

              <div className={styles.reviewList}>
                {Array.isArray(shopInfo?.reviews) && shopInfo.reviews.length > 0 ? (
                  shopInfo.reviews.slice(0, 3).map((review, index) => (
                    <div className={styles.reviewItem} key={`${review.reviewerNickname}-${index}`}>
                      <div className={styles.reviewTop}>
                        <div className={styles.reviewUser}>
                          <div className={styles.reviewUserAvatar}>
                            {review?.reviewerProfileImageUrl ? (
                              <img
                                src={review.reviewerProfileImageUrl}
                                alt={review.reviewerNickname}
                              />
                            ) : (
                              <div className={styles.reviewUserFallback}>리뷰</div>
                            )}
                          </div>

                          <div className={styles.reviewUserMeta}>
                            <strong>{review?.reviewerNickname || "사용자"}</strong>
                            <div className={styles.reviewStars}>
                              {renderStars(review?.rating)}
                            </div>
                          </div>
                        </div>

                        <span className={styles.reviewDate}>
                          {review?.createdAt || "-"}
                        </span>
                      </div>

                      {Array.isArray(review?.tags) && review.tags.length > 0 && (
                        <div className={styles.reviewTags}>
                          {review.tags.slice(0, 2).map((tag) => (
                            <span className={styles.reviewTag} key={tag}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyReview}>아직 등록된 후기가 없어요.</div>
                )}
              </div>

              <button
                type="button"
                className={styles.shopMoreButton}
                onClick={() => router.push("/mypage")}
              >
                내 상점 관리
              </button>
            </aside>
          </section>
        </div>
      </main>

      <RentalRequestModal
        open={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        product={product}
        shopInfo={shopInfo}
      />
    </>
  );
}