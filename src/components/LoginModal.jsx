"use client";

import { useEffect, useMemo, useState } from "react";
import { loginUser, signupUser } from "@/services/auth";

export default function LoginModal({ open, onClose, onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState("login");

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupPasswordConfirm, setShowSignupPasswordConfirm] =
    useState(false);

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
    keepLogin: false,
  });

  const [signupForm, setSignupForm] = useState({
    name: "",
    nickname: "",
    email: "",
    password: "",
    passwordConfirm: "",
    phone: "",
    agreeRequired: true,
    agreeMarketing: false,
  });

  const [loginMessage, setLoginMessage] = useState("");
  const [signupMessage, setSignupMessage] = useState("");
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isSignupLoading, setIsSignupLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  const signupStrengthText = useMemo(() => {
    const password = signupForm.password;

    if (!password) return "";

    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Za-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 2) return "약함";
    if (score === 3) return "보통";
    return "강함";
  }, [signupForm.password]);

  if (!open) return null;

  const resetMessages = () => {
    setLoginMessage("");
    setSignupMessage("");
    setLoginSuccess(false);
    setSignupSuccess(false);
  };

  const resetForms = () => {
    setLoginForm({
      email: "",
      password: "",
      keepLogin: false,
    });

    setSignupForm({
      name: "",
      nickname: "",
      email: "",
      password: "",
      passwordConfirm: "",
      phone: "",
      agreeRequired: true,
      agreeMarketing: false,
    });

    setShowLoginPassword(false);
    setShowSignupPassword(false);
    setShowSignupPasswordConfirm(false);
  };

  const handleClose = () => {
    resetMessages();
    resetForms();
    setActiveTab("login");
    onClose();
  };

  const handleChangeLoginForm = (key, value) => {
    setLoginForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleChangeSignupForm = (key, value) => {
    setSignupForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    resetMessages();
  };

  const handleLoginSubmit = async () => {
    resetMessages();

    if (!loginForm.email.trim() || !loginForm.password.trim()) {
      setLoginSuccess(false);
      setLoginMessage("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    try {
      setIsLoginLoading(true);

      const data = await loginUser({
        email: loginForm.email.trim(),
        password: loginForm.password,
      });

      setLoginSuccess(true);
      setLoginMessage(data?.message || "로그인에 성공했습니다.");

      if (data?.accessToken) {
        localStorage.setItem("accessToken", data.accessToken);
      }

      if (data?.refreshToken) {
        localStorage.setItem("refreshToken", data.refreshToken);
      }

      if (loginForm.keepLogin) {
        localStorage.setItem("keepLogin", "true");
      } else {
        localStorage.removeItem("keepLogin");
      }

      localStorage.setItem("isLoggedIn", "true");

      if (onLoginSuccess) {
        onLoginSuccess();
      }

      setTimeout(() => {
        handleClose();
      }, 700);
    } catch (error) {
      setLoginSuccess(false);
      setLoginMessage(error.message || "로그인 중 오류가 발생했습니다.");
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleSignupSubmit = async () => {
    resetMessages();

    if (
      !signupForm.name.trim() ||
      !signupForm.nickname.trim() ||
      !signupForm.email.trim() ||
      !signupForm.password ||
      !signupForm.passwordConfirm
    ) {
      setSignupSuccess(false);
      setSignupMessage("모든 필수 항목을 입력해주세요.");
      return;
    }

    if (signupForm.password !== signupForm.passwordConfirm) {
      setSignupSuccess(false);
      setSignupMessage("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (!signupForm.agreeRequired) {
      setSignupSuccess(false);
      setSignupMessage("필수 약관 동의가 필요합니다.");
      return;
    }

    try {
      setIsSignupLoading(true);

      await signupUser({
        email: signupForm.email.trim(),
        password: signupForm.password,
        name: signupForm.name.trim(),
        nickname: signupForm.nickname.trim(),
        phone: signupForm.phone.trim() || null,
      });

      setSignupSuccess(true);
      setSignupMessage("회원가입이 완료되었습니다.");

      setTimeout(() => {
        setActiveTab("login");
        setSignupMessage("");
        setSignupSuccess(false);
        setSignupForm((prev) => ({
          ...prev,
          password: "",
          passwordConfirm: "",
        }));
      }, 900);
    } catch (error) {
      setSignupSuccess(false);
      setSignupMessage(error.message || "회원가입 중 오류가 발생했습니다.");
    } finally {
      setIsSignupLoading(false);
    }
  };

  return (
    <div className={`auth-modal ${open ? "is-open" : ""}`} aria-hidden={!open}>
      <div className="auth-modal__backdrop" onClick={handleClose}></div>

      <div
        className="auth-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="authModalTitle"
      >
        <button
          type="button"
          className="auth-modal__close"
          aria-label="닫기"
          onClick={handleClose}
        >
          <span></span>
          <span></span>
        </button>

        <div className="auth-modal__brand">
          <span className="auth-modal__brand-dot"></span>
          <strong>빌려잇</strong>
        </div>

        <section
          className={`auth-panel ${activeTab === "login" ? "is-active" : ""}`}
        >
          <h2 className="auth-modal__title" id="authModalTitle">
            로그인
          </h2>
          <p className="auth-modal__desc">동네 대여를 더 안전하고 간편하게</p>

          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${activeTab === "login" ? "is-active" : ""}`}
              onClick={() => handleTabChange("login")}
            >
              로그인
            </button>
            <button
              type="button"
              className={`auth-tab ${activeTab === "signup" ? "is-active" : ""}`}
              onClick={() => handleTabChange("signup")}
            >
              회원가입
            </button>
          </div>

          <div className="auth-form-row">
            <label>이메일</label>
            <div className="auth-input auth-input--icon">
              <span className="auth-input__icon auth-input__icon--mail"></span>
              <input
                type="email"
                placeholder="example@bilreit.com"
                value={loginForm.email}
                onChange={(e) => handleChangeLoginForm("email", e.target.value)}
              />
            </div>
          </div>

          <div className="auth-form-row">
            <label>비밀번호</label>
            <div className="auth-input auth-input--icon auth-input--action">
              <span className="auth-input__icon auth-input__icon--lock"></span>
              <input
                type={showLoginPassword ? "text" : "password"}
                placeholder="••••••••"
                value={loginForm.password}
                onChange={(e) =>
                  handleChangeLoginForm("password", e.target.value)
                }
              />
              <button
                type="button"
                className="auth-inline-btn"
                onClick={() => setShowLoginPassword((prev) => !prev)}
              >
                {showLoginPassword ? "숨김" : "표시"}
              </button>
            </div>
          </div>

          <div className="auth-inline-row">
            <label className="check-wrap">
              <input
                type="checkbox"
                checked={loginForm.keepLogin}
                onChange={(e) =>
                  handleChangeLoginForm("keepLogin", e.target.checked)
                }
              />
              <span className="check-box"></span>
              <span className="check-text">로그인 상태 유지</span>
            </label>

            <a href="#" className="auth-link auth-link--blue">
              비밀번호 찾기
            </a>
          </div>

          <p className={`auth-message ${loginSuccess ? "is-success" : ""}`}>
            {loginMessage}
          </p>

          <button
            type="button"
            className="auth-submit-btn"
            onClick={handleLoginSubmit}
            disabled={isLoginLoading}
          >
            {isLoginLoading ? "로그인 중..." : "로그인"}
          </button>

          <div className="auth-divider">
            <span>또는</span>
          </div>

          <button type="button" className="social-btn">
            <span className="social-btn__icon">C</span>
            <span>Google로 계속하기</span>
          </button>

          <div className="auth-bottom-row">
            <p>
              계정이 없나요?{" "}
              <button
                type="button"
                className="auth-link auth-switch-link auth-text-btn"
                onClick={() => handleTabChange("signup")}
              >
                회원가입
              </button>
            </p>
            <p className="auth-agree-text">
              로그인하면 이용약관·개인정보처리방침에 동의하게 됩니다
            </p>
          </div>
        </section>

        <section
          className={`auth-panel ${activeTab === "signup" ? "is-active" : ""}`}
        >
          <h2 className="auth-modal__title">회원가입</h2>
          <p className="auth-modal__desc">3분이면 끝! 안전한 동네 대여를 시작해요</p>

          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${activeTab === "login" ? "is-active" : ""}`}
              onClick={() => handleTabChange("login")}
            >
              로그인
            </button>
            <button
              type="button"
              className={`auth-tab ${activeTab === "signup" ? "is-active" : ""}`}
              onClick={() => handleTabChange("signup")}
            >
              회원가입
            </button>
          </div>

          <div className="auth-row-2col">
            <div className="auth-form-row">
              <label>이름</label>
              <div className="auth-input">
                <input
                  type="text"
                  placeholder="실명을 입력해주세요"
                  value={signupForm.name}
                  onChange={(e) => handleChangeSignupForm("name", e.target.value)}
                />
              </div>
            </div>

            <div className="auth-form-row">
              <label>닉네임</label>
              <div className="auth-input">
                <input
                  type="text"
                  placeholder="예: kim_young"
                  value={signupForm.nickname}
                  onChange={(e) =>
                    handleChangeSignupForm("nickname", e.target.value)
                  }
                />
              </div>
            </div>
          </div>

          <div className="auth-form-row">
            <label>이메일</label>
            <div className="auth-input">
              <input
                type="email"
                placeholder="example@bilreit.com"
                value={signupForm.email}
                onChange={(e) => handleChangeSignupForm("email", e.target.value)}
              />
            </div>
          </div>

          <div className="auth-form-row">
            <label>비밀번호</label>
            <div className="auth-input auth-input--action">
              <input
                type={showSignupPassword ? "text" : "password"}
                placeholder="영문/숫자/특수문자 포함 8자 이상"
                value={signupForm.password}
                onChange={(e) =>
                  handleChangeSignupForm("password", e.target.value)
                }
              />
              <button
                type="button"
                className="auth-inline-btn"
                onClick={() => setShowSignupPassword((prev) => !prev)}
              >
                {showSignupPassword ? "숨김" : "표시"}
              </button>
              <span className="auth-strength">{signupStrengthText}</span>
            </div>
          </div>

          <div className="auth-form-row">
            <label>비밀번호 확인</label>
            <div className="auth-input auth-input--action">
              <input
                type={showSignupPasswordConfirm ? "text" : "password"}
                placeholder="••••••••"
                value={signupForm.passwordConfirm}
                onChange={(e) =>
                  handleChangeSignupForm("passwordConfirm", e.target.value)
                }
              />
              <button
                type="button"
                className="auth-inline-btn"
                onClick={() =>
                  setShowSignupPasswordConfirm((prev) => !prev)
                }
              >
                {showSignupPasswordConfirm ? "숨김" : "표시"}
              </button>
            </div>
          </div>

          <div className="auth-form-row">
            <label>전화번호 (선택)</label>
            <div className="auth-input">
              <input
                type="text"
                placeholder="010-0000-0000"
                value={signupForm.phone}
                onChange={(e) => handleChangeSignupForm("phone", e.target.value)}
              />
            </div>
          </div>

          <div className="auth-check-list">
            <div className="auth-check-row">
              <label className="check-wrap">
                <input
                  type="checkbox"
                  checked={signupForm.agreeRequired}
                  onChange={(e) =>
                    handleChangeSignupForm("agreeRequired", e.target.checked)
                  }
                />
                <span className="check-box"></span>
                <span className="check-text">
                  이용약관(필수) · 개인정보처리방침(필수) 동의
                </span>
              </label>
              <a href="#" className="auth-link auth-link--blue">
                보기
              </a>
            </div>

            <div className="auth-check-row">
              <label className="check-wrap">
                <input
                  type="checkbox"
                  checked={signupForm.agreeMarketing}
                  onChange={(e) =>
                    handleChangeSignupForm("agreeMarketing", e.target.checked)
                  }
                />
                <span className="check-box"></span>
                <span className="check-text">마케팅 수신 동의(선택)</span>
              </label>
            </div>
          </div>

          <p className={`auth-message ${signupSuccess ? "is-success" : ""}`}>
            {signupMessage}
          </p>

          <button
            type="button"
            className="auth-submit-btn"
            onClick={handleSignupSubmit}
            disabled={isSignupLoading}
          >
            {isSignupLoading ? "가입 중..." : "계정 만들기"}
          </button>

          <div className="auth-bottom-row">
            <p>
              이미 계정이 있나요?{" "}
              <button
                type="button"
                className="auth-link auth-switch-link auth-text-btn"
                onClick={() => handleTabChange("login")}
              >
                로그인
              </button>
            </p>
            <p className="auth-agree-text">
              가입하면 빌려잇 이용약관에 동의하게 됩니다
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}