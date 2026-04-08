"use client";

import { useRouter } from "next/navigation";
import styles from "@/app/product/[id]/page.module.css";

function formatPrice(value) {
  return new Intl.NumberFormat("ko-KR").format(Number(value || 0));
}

export default function SimilarProducts({ items = [] }) {
  const router = useRouter();
  const visibleItems = Array.isArray(items) ? items.slice(0, 8) : [];

  return (
    <section className={`${styles.card} ${styles.sectionCard}`}>
      <h2 className={styles.sectionTitle}>이 상품과 비슷해요</h2>

      {visibleItems.length === 0 ? (
        <div
          style={{
            padding: "24px 10px",
            textAlign: "center",
            color: "#97a4b8",
            fontSize: "14px",
            fontWeight: 700,
          }}
        >
          비슷한 상품이 아직 없어요.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "14px",
          }}
        >
          {visibleItems.map((item, index) => {
            const productId =
              item?.itemId ??
              item?.item_id ??
              item?.id ??
              item?.productId ??
              null;

            const title =
              item?.title ??
              item?.itemTitle ??
              item?.item_title ??
              "상품명";

            const thumbnailUrl =
              item?.thumbnailUrl ??
              item?.thumbnail_url ??
              item?.imageUrl ??
              item?.image_url ??
              item?.itemImageUrl ??
              item?.item_image_url ??
              "";

            const price =
              item?.pricePerDay ??
              item?.price_per_day ??
              item?.dailyPrice ??
              item?.daily_price ??
              0;

            return (
              <button
                key={`${productId || "similar"}-${index}`}
                type="button"
                onClick={() => {
                  if (!productId) {
                    console.error("추천 상품 id 없음:", item);
                    alert("이 상품은 아직 상세 이동 정보를 불러오지 못했어요.");
                    return;
                  }

                  router.push(`/product/${productId}`);
                }}
                style={{
                  border: "1px solid #dfe7f2",
                  background: "#fff",
                  borderRadius: "18px",
                  overflow: "hidden",
                  cursor: "pointer",
                  textAlign: "left",
                  padding: 0,
                }}
              >
                <div
                  style={{
                    aspectRatio: "1 / 0.68",
                    background: "#edf3fb",
                    overflow: "hidden",
                  }}
                >
                  {thumbnailUrl ? (
                    <img
                      src={thumbnailUrl}
                      alt={title}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "grid",
                        placeItems: "center",
                        color: "#97a4b8",
                        fontSize: "13px",
                        fontWeight: 700,
                      }}
                    >
                      이미지
                    </div>
                  )}
                </div>

                <div style={{ padding: "12px 12px 10px" }}>
                  <div
                    style={{
                      minHeight: "36px",
                      fontSize: "14px",
                      lineHeight: 1.3,
                      fontWeight: 800,
                      color: "#1e2940",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {title}
                  </div>

                  <div
                    style={{
                      marginTop: "6px",
                      fontSize: "13px",
                      color: "#243e65",
                      fontWeight: 800,
                    }}
                  >
                    {formatPrice(price)}원/일
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}