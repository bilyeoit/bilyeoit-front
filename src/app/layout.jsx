import "./globals.css";
import SiteFooter from "../components/SiteFooter";
import SiteHeaderWrapper from "../components/SiteHeaderWrapper";

export const metadata = {
  title: "빌려잇",
  description: "동네 기반 물품 대여 서비스",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <SiteHeaderWrapper />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}