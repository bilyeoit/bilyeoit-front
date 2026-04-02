"use client";

import Link from "next/link";

export default function SiteHeader({
  mounted = true,
  isLoggedIn = false,
  onLoginClick,
  onLogout,
}) {
  return (
    <header className="header">
      <div className="inner header-inner">
        <div className="brand">
          <span className="brand-mark"></span>
          <div className="brand-texts">
            <strong className="brand-name">빌려잇</strong>
            <span className="brand-sub">우리 주변 물건 대여</span>
          </div>
        </div>

        <nav className="gnb">
          <Link href="/">홈</Link>
          <Link href="/product">대여하기</Link>
          <Link href="/community">커뮤니티</Link>
          <Link href="/settings">고객센터</Link>
          <Link href="/chat">내채팅</Link>
        </nav>

        <div className="header-actions">
          {mounted && isLoggedIn ? (
            <>
              <Link href="/mypage" className="demo-open-btn mypage-btn">
                마이페이지
              </Link>
              <button
                type="button"
                className="demo-open-btn logout-btn"
                onClick={onLogout}
              >
                로그아웃
              </button>
            </>
          ) : (
            <button
              type="button"
              className="demo-open-btn login-btn"
              onClick={mounted ? onLoginClick : undefined}
              disabled={!mounted}
            >
              로그인
            </button>
          )}
        </div>
      </div>
    </header>
  );
}