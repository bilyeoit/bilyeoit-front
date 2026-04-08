import { apiRequest } from "./api";

export async function getProductDetail(itemId) {
  return apiRequest(`/bilyeoit/v1/items/${itemId}`);
}

export async function getSimilarProducts(itemId) {
  const data = await apiRequest(`/bilyeoit/v1/recommend/similar?itemId=${itemId}`);

  return {
    ...data,
    results: Array.isArray(data?.results)
      ? data.results.map((item) => ({
          ...item,
          itemId: item?.itemId ?? item?.item_id ?? item?.id ?? null,
          thumbnailUrl:
            item?.thumbnailUrl ??
            item?.thumbnail_url ??
            item?.imageUrl ??
            item?.image_url ??
            item?.itemImageUrl ??
            item?.item_image_url ??
            "",
          pricePerDay:
            item?.pricePerDay ??
            item?.price_per_day ??
            item?.dailyPrice ??
            item?.daily_price ??
            0,
          categoryId: item?.categoryId ?? item?.category_id ?? null,
          areaName: item?.areaName ?? item?.area_name ?? "",
        }))
      : [],
  };
}

export async function getShopInfo(ownerUserId) {
  return apiRequest(`/bilyeoit/v1/items/${ownerUserId}/shopInfo`);
}