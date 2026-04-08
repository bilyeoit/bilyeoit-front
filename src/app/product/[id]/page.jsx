import ProductDetailPage from "@/components/ProductDetailPage";

export default async function ProductDetailRoute({ params }) {
  const { id } = await params;
  return <ProductDetailPage itemId={id} />;
}