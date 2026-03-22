function initLoginModal() {
  const authModal = document.getElementById("authModal");
  const loginPanel = document.getElementById("loginPanel");
  const signupPanel = document.getElementById("signupPanel");
  const openLoginModalBtn = document.getElementById("openLoginModal");
  const openSignupModalBtn = document.getElementById("openSignupModal");
  const authModalCloseBtn = document.getElementById("authModalClose");
  const authTabs = document.querySelectorAll("[data-auth-tab]");
  const authSwitchLinks = document.querySelectorAll("[data-auth-switch]");
  const authBackdrop = document.querySelector(".auth-modal__backdrop");

  console.log("모달 초기화 시작", {
    authModal,
    loginPanel,
    signupPanel,
    openLoginModalBtn,
    openSignupModalBtn,
    authModalCloseBtn,
    authBackdrop
  });

  if (!authModal) {
    console.warn("authModal을 찾지 못했습니다.");
    return;
  }

  function openAuthModal(type) {
    authModal.classList.add("is-open");
    authModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    setAuthPanel(type);
  }

  function closeAuthModal() {
    authModal.classList.remove("is-open");
    authModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function setAuthPanel(type) {
    const isLogin = type === "login";

    if (loginPanel) loginPanel.classList.toggle("is-active", isLogin);
    if (signupPanel) signupPanel.classList.toggle("is-active", !isLogin);

    document.querySelectorAll(".auth-panel .auth-tab").forEach((tab) => {
      tab.classList.toggle("is-active", tab.dataset.authTab === type);
    });
  }

  if (openLoginModalBtn) {
    openLoginModalBtn.addEventListener("click", function (e) {
      e.preventDefault();
      openAuthModal("login");
    });
  }

  if (openSignupModalBtn) {
    openSignupModalBtn.addEventListener("click", function (e) {
      e.preventDefault();
      openAuthModal("signup");
    });
  }

  if (authModalCloseBtn) {
    authModalCloseBtn.addEventListener("click", closeAuthModal);
  }

  if (authBackdrop) {
    authBackdrop.addEventListener("click", closeAuthModal);
  }

  authTabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      setAuthPanel(this.dataset.authTab);
    });
  });

  authSwitchLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      setAuthPanel(this.dataset.authSwitch);
    });
  });

  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && authModal.classList.contains("is-open")) {
      closeAuthModal();
    }
  });

  const togglePasswordButtons = document.querySelectorAll(".toggle-password-btn");

togglePasswordButtons.forEach((button) => {
  button.addEventListener("click", function () {
    const input = this.parentElement.querySelector('input');

    if (!input) return;

    if (input.type === "password") {
      input.type = "text";
      this.textContent = "숨김";
    } else {
      input.type = "password";
      this.textContent = "표시";
    }
  });
});
}