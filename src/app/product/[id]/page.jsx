export default function ProductDetailPage({ params }) {
  const { id } = params;

  return (
    <main className="sub-page">
      <div className="inner">
        <h1>상품 상세페이지</h1>
        <p>상품 ID: {id}</p>
      </div>
    </main>
  );
}