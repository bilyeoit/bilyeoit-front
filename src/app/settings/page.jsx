"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./page.module.css";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

const MENU_ITEMS = [
  { key: "profile", label: "프로필 관리" },
  { key: "notifications", label: "알림 설정" },
  { key: "security", label: "계정 / 보안" },
  { key: "settlement", label: "정산관리" },
];

const INITIAL_PROFILE = {
  name: "",
  phone: "",
  email: "",
  shopName: "",
  profileImageUrl: "",
  intro: "",
};

const INITIAL_NOTIFICATION = {
  chatPush: false,
  rentStatusPush: false,
  communityPush: false,
  marketingOptIn: false,
};

const INITIAL_SETTLEMENT_ACCOUNT = {
  payoutAccountId: null,
  bankName: "",
  accountNumberMasked: "",
  accountHolder: "",
  verified: false,
  createdAt: "",
};

const INITIAL_SETTLEMENT_SUMMARY = {
  scheduledAmount: 0,
  nextPayoutDate: "",
  depositAmount: 0,
  activeRentalCount: 0,
  recentPayoutAmount: 0,
  recentDays: 30,
};

const BANK_OPTIONS = [
  "국민은행",
  "신한은행",
  "우리은행",
  "하나은행",
  "농협은행",
  "카카오뱅크",
  "토스뱅크",
  "기업은행",
  "새마을금고",
  "우체국",
];

function getAccessToken() {
  if (typeof window === "undefined") return "";

  return (
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("accessToken") ||
    ""
  );
}

async function request(url, options = {}) {
  const token = getAccessToken();
  const isFormData = options.body instanceof FormData;

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  } else {
    try {
      data = await response.text();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const message =
      (typeof data === "object" && data?.message) ||
      (typeof data === "string" && data) ||
      `요청 실패 (${response.status})`;
    throw new Error(message);
  }

  return data;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDateText(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default function SettingsPage() {
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [profile, setProfile] = useState(INITIAL_PROFILE);
  const [profileForm, setProfileForm] = useState({
    intro: "",
  });
  const [profilePreview, setProfilePreview] = useState("");
  const [profileFile, setProfileFile] = useState(null);

  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATION);

  const [settlementAccount, setSettlementAccount] = useState(
    INITIAL_SETTLEMENT_ACCOUNT
  );
  const [settlementSummary, setSettlementSummary] = useState(
    INITIAL_SETTLEMENT_SUMMARY
  );
  const [verifyForm, setVerifyForm] = useState({
    bankName: BANK_OPTIONS[0],
    accountNumber: "",
    accountHolder: "",
  });
  const [verifyState, setVerifyState] = useState({
    verificationId: "",
    maskedAccount: "",
  });
  const [confirmCode, setConfirmCode] = useState("");

  const fileInputRef = useRef(null);

  const userDisplayName = useMemo(() => {
    return profile.shopName || profile.name || "빌려잇 사용자";
  }, [profile]);

  useEffect(() => {
    void loadSettingsData();
  }, []);

  async function loadSettingsData() {
    setLoading(true);
    setError("");

    try {
      const [profileRes, notificationRes, settlementAccountRes, settlementSummaryRes] =
        await Promise.allSettled([
          request("/bilyeoit/v1/profile/me"),
          request("/bilyeoit/v1/notification-settings"),
          request("/bilyeoit/v1/settlement/account"),
          request("/bilyeoit/v1/settlement/summary"),
        ]);

      if (profileRes.status === "fulfilled" && profileRes.value) {
        const nextProfile = {
          ...INITIAL_PROFILE,
          ...profileRes.value,
        };
        setProfile(nextProfile);
        setProfileForm({ intro: nextProfile.intro || "" });
        setProfilePreview(nextProfile.profileImageUrl || "");
      }

      if (notificationRes.status === "fulfilled" && notificationRes.value) {
        setNotifications({
          ...INITIAL_NOTIFICATION,
          ...notificationRes.value,
        });
      }

      if (
        settlementAccountRes.status === "fulfilled" &&
        settlementAccountRes.value
      ) {
        setSettlementAccount({
          ...INITIAL_SETTLEMENT_ACCOUNT,
          ...settlementAccountRes.value,
        });
      } else {
        setSettlementAccount(INITIAL_SETTLEMENT_ACCOUNT);
      }

      if (
        settlementSummaryRes.status === "fulfilled" &&
        settlementSummaryRes.value
      ) {
        setSettlementSummary({
          ...INITIAL_SETTLEMENT_SUMMARY,
          ...settlementSummaryRes.value,
        });
      }
    } catch (err) {
      setError(err.message || "설정 정보를 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }

  function handleProfileFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setProfileFile(file);
    const previewUrl = URL.createObjectURL(file);
    setProfilePreview(previewUrl);
  }

  async function handleSaveProfile() {
  setSaving(true);
  setError("");
  setSuccessMessage("");

  try {
    const formData = new FormData();

    if (profileFile) {
      formData.append("profileImg", profileFile);
    }

    formData.append("intro", profileForm.intro || "");

    await request("/bilyeoit/v1/updateuser", {
      method: "PUT",
      body: formData,
    });

    setSuccessMessage("프로필이 저장되었어요.");

    // 🔥 중요: 설정 데이터 다시 불러오기
    await loadSettingsData();

    // 🔥🔥 핵심: 마이페이지로 이동 + 업데이트 트리거
    router.push("/mypage?updated=1");

  } catch (err) {
    setError(err.message || "프로필 저장에 실패했어요.");
  } finally {
    setSaving(false);
  }
}

  async function handleToggleNotification(key) {
    const nextValue = !notifications[key];
    const previousValue = notifications[key];

    setNotifications((prev) => ({ ...prev, [key]: nextValue }));
    setError("");
    setSuccessMessage("");

    try {
      const query = new URLSearchParams({ [key]: String(nextValue) }).toString();
      await request(`/bilyeoit/v1/notification-settings?${query}`, {
        method: "PATCH",
      });
      setSuccessMessage("알림 설정이 변경되었어요.");
    } catch (err) {
      setNotifications((prev) => ({ ...prev, [key]: previousValue }));
      setError(err.message || "알림 설정 변경에 실패했어요.");
    }
  }

  async function handleRequestVerification() {
    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const result = await request("/bilyeoit/v1/settlement/account/verify", {
        method: "POST",
        body: JSON.stringify(verifyForm),
      });

      setVerifyState({
        verificationId: result?.verificationId || "",
        maskedAccount: result?.maskedAccount || "",
      });
      setSuccessMessage(result?.message || "1원 인증 요청이 전송되었어요.");
    } catch (err) {
      setError(err.message || "계좌 인증 요청에 실패했어요.");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmVerification() {
    if (!verifyState.verificationId) {
      setError("먼저 계좌 인증 요청을 진행해주세요.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const payload = {
        verificationId: verifyState.verificationId,
        verificationCode: confirmCode,
        bankName: verifyForm.bankName,
        accountNumber: verifyForm.accountNumber,
        accountHolder: verifyForm.accountHolder,
      };

      const result = await request(
        "/bilyeoit/v1/settlement/account/verify/confirm",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      setSuccessMessage(result?.message || "계좌 인증이 완료되었어요.");
      setConfirmCode("");
      setVerifyState({ verificationId: "", maskedAccount: "" });
      await loadSettingsData();
    } catch (err) {
      setError(err.message || "계좌 인증 확인에 실패했어요.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSettlementAccount() {
    if (!window.confirm("등록된 정산 계좌를 삭제할까요?")) return;

    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      await request("/bilyeoit/v1/settlement/account", {
        method: "DELETE",
      });
      setSuccessMessage("정산 계좌가 삭제되었어요.");
      await loadSettingsData();
    } catch (err) {
      setError(err.message || "정산 계좌 삭제에 실패했어요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.topTitle}>
          <h1>설정</h1>
          <p>개인정보 관리, 알림, 보안, 정산 정보를 한 곳에서 관리할 수 있어요.</p>
        </div>

        {(error || successMessage) && (
          <div
            className={`${styles.message} ${
              error ? styles.errorMessage : styles.successMessage
            }`}
          >
            {error || successMessage}
          </div>
        )}

        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <div className={styles.sidebarProfile}>
              <div className={styles.sidebarThumb}>
                {profilePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profilePreview} alt={userDisplayName} />
                ) : (
                  <span>{userDisplayName.slice(0, 1)}</span>
                )}
              </div>

              <div className={styles.sidebarMeta}>
                <strong>{userDisplayName}</strong>
                <p>{profile.email || "이메일 정보 없음"}</p>
              </div>
            </div>

            <div className={styles.menuList}>
              {MENU_ITEMS.map((item) => {
                const isActive = activeMenu === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={`${styles.menuButton} ${isActive ? styles.menuButtonActive : ""}`}
                    onClick={() => {
                      setActiveMenu(item.key);
                      setError("");
                      setSuccessMessage("");
                    }}
                  >
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className={styles.content}>
            {loading ? (
              <div className={styles.panel}>
                <div className={styles.loadingBox}>불러오는 중...</div>
              </div>
            ) : (
              <>
                {activeMenu === "profile" && (
  <div className={styles.profileSettingWrap}>
    <div className={styles.profileSettingHead}>
      <div>
        <h2>내 정보 수정</h2>
        <p>프로필 이미지, 상점 소개글, 이름/연락처/이메일/주소를 수정할 수 있어요.</p>
      </div>
    </div>

    <div className={styles.profileSettingGrid}>
      <div className={styles.profileEditCard}>
        <div className={styles.cardTitleRow}>
          <div>
            <h3>프로필</h3>
            <p>이미지와 상점 소개를 먼저 설정해요.</p>
          </div>
        </div>

        <div className={styles.shopNameBox}>
          <label>상점명</label>
          <div className={styles.inlineInputRow}>
            <input
              type="text"
              value={profile.shopName || ""}
              placeholder="상점명을 입력하세요"
              readOnly
            />
            <span className={styles.inlineCount}>
              {(profile.shopName || "").length}/10
            </span>
            <button type="button" className={styles.smallPrimaryButton}>
              저장
            </button>
          </div>
        </div>

        <div className={styles.profileImageSection}>
          <div className={styles.largeProfileThumb}>
            {profilePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profilePreview} alt={userDisplayName} />
            ) : (
              <span>{userDisplayName.slice(0, 1)}</span>
            )}
          </div>

          <div className={styles.profileImageActionArea}>
            <div className={styles.profileImageActionRow}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => fileInputRef.current?.click()}
              >
                사진 변경
              </button>
              <button
                type="button"
                className={styles.subtleButton}
                onClick={() => {
                  setProfileFile(null);
                  setProfilePreview(profile.profileImageUrl || "");
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                삭제
              </button>
            </div>

            <p className={styles.fileGuide}>JPG/PNG · 최대 5MB</p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleProfileFileChange}
            />
          </div>
        </div>

        <div className={styles.introBox}>
          <label>상점 소개글</label>
          <div className={styles.introTextareaWrap}>
            <textarea
              value={profileForm.intro}
              onChange={(event) =>
                setProfileForm((prev) => ({
                  ...prev,
                  intro: event.target.value,
                }))
              }
              maxLength={200}
              placeholder="동네에서 필요한 물품을 편하게 빌릴 수 있도록 운영하고 있어요."
            />
            <div className={styles.introBottomRow}>
              <span className={styles.inlineCount}>
                {profileForm.intro.length}/200
              </span>
              <button
                type="button"
                className={styles.smallPrimaryButton}
                onClick={handleSaveProfile}
                disabled={saving}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.accountEditCard}>
        <div className={styles.cardTitleRow}>
          <div>
            <h3>계정 정보</h3>
            <p>연락처/이메일/주소 변경은 인증이 필요할 수 있어요.</p>
          </div>
        </div>

        <div className={styles.accountFieldGroup}>
          <label>이름</label>
          <div className={styles.fullStaticField}>
            <span>{profile.name || "-"}</span>
          </div>
        </div>

        <div className={styles.accountFieldGroup}>
          <label>연락처</label>
          <div className={styles.actionFieldRow}>
            <input type="text" value={profile.phone || ""} readOnly />
            <button type="button" className={styles.authButton}>
              휴대폰 인증
            </button>
          </div>
          <small>번호 변경 시 재인증이 필요해요.</small>
        </div>

        <div className={styles.accountFieldGroup}>
          <label>이메일</label>
          <div className={styles.actionFieldRow}>
            <input type="text" value={profile.email || ""} readOnly />
            <button type="button" className={styles.authButton}>
              이메일 인증
            </button>
          </div>
          <small>알림/거래 안내가 이메일로 발송돼요.</small>
        </div>
      </div>
    </div>

    <div className={styles.bottomSubmitRow}>
      <button
        type="button"
        className={styles.ghostButton}
        onClick={() => {
          setProfileForm({ intro: profile.intro || "" });
          setProfileFile(null);
          setProfilePreview(profile.profileImageUrl || "");
        }}
      >
        취소
      </button>
      <button
        type="button"
        className={styles.primaryButton}
        onClick={handleSaveProfile}
        disabled={saving}
      >
        {saving ? "저장 중..." : "변경사항 저장"}
      </button>
    </div>
  </div>
)}

                {activeMenu === "notifications" && (
  <div className={styles.notificationSettingWrap}>
    <div className={styles.notificationSettingHead}>
      <div>
        <h2>알림 설정</h2>
        <p>거래/예약/리뷰 알림을 원하는 방식으로 받아보세요.</p>
      </div>
    </div>

    <div className={styles.notificationPanelCard}>
      <div className={styles.notificationPanelHead}>
        <strong>알림 수단</strong>
        <p>필요한 채널만 켜두면 더 간결해요.</p>
      </div>

      <div className={styles.notificationRows}>
        <NotificationDesignRow
          title="푸시 알림"
          desc="예약요청/수락/반납, 채팅, 리뷰"
          checked={notifications.rentStatusPush}
          onToggle={() => handleToggleNotification("rentStatusPush")}
        />

        <NotificationDesignRow
          title="문자(SMS)"
          desc="중요 안내만 문자로 받아요"
          checked={false}
          disabled
        />

        <NotificationDesignRow
          title="이메일"
          desc="정산/약속, 정책 변경 안내"
          checked={notifications.communityPush}
          onToggle={() => handleToggleNotification("communityPush")}
        />
      </div>
    </div>

    <div className={styles.notificationPanelCard}>
      <div className={styles.notificationPanelHead}>
        <strong>알림 종류</strong>
        <p>원치 않는 알림은 끌 수 있어요.</p>
      </div>

      <div className={styles.notificationRows}>
        <NotificationDesignRow
          title="예약 요청/수락"
          desc="예약이 들어오거나 수락/거절될 때"
          checked={notifications.rentStatusPush}
          onToggle={() => handleToggleNotification("rentStatusPush")}
        />

        <NotificationDesignRow
          title="채팅 메시지"
          desc="새 메시지 도착"
          checked={notifications.chatPush}
          onToggle={() => handleToggleNotification("chatPush")}
        />

        <NotificationDesignRow
          title="반납/연장 알림"
          desc="반납 예정일, 연장 가능 여부"
          checked={notifications.rentStatusPush}
          onToggle={() => handleToggleNotification("rentStatusPush")}
        />

        <NotificationDesignRow
          title="리뷰/평가"
          desc="리뷰 작성/도착 알림"
          checked={notifications.communityPush}
          onToggle={() => handleToggleNotification("communityPush")}
        />

        <NotificationDesignRow
          title="마케팅/추천"
          desc="추천 아이템, 이벤트 소식"
          checked={notifications.marketingOptIn}
          onToggle={() => handleToggleNotification("marketingOptIn")}
        />
      </div>
    </div>

    <div className={styles.bottomSubmitRow}>
      <button type="button" className={styles.ghostButton}>
        취소
      </button>
      <button type="button" className={styles.primaryButton}>
        저장
      </button>
    </div>
  </div>
)}

                {activeMenu === "security" && (
  <div className={styles.securitySettingWrap}>
    <div className={styles.securitySettingHead}>
      <div>
        <h2>계정 / 보안</h2>
        <p>비밀번호 변경, 로그인 보안, 인증 수단을 관리해요.</p>
      </div>
    </div>

    <div className={styles.securityPanelCard}>
      <div className={styles.securityPanelHead}>
        <strong>비밀번호 변경</strong>
        <p>정기적으로 변경하면 안전해요.</p>
      </div>

      <div className={styles.passwordFormWrap}>
        <div className={styles.passwordFieldBlock}>
          <label>현재 비밀번호</label>
          <input type="password" placeholder="••••••••" />
        </div>

        <div className={styles.passwordChangeRow}>
          <div className={styles.passwordFieldBlock}>
            <label>새 비밀번호</label>
            <input type="password" placeholder="영문/숫자/특수문자 8자+" />
          </div>

          <button type="button" className={styles.primaryButton}>
            변경하기
          </button>
        </div>
      </div>
    </div>

    <div className={styles.securityPanelCard}>
      <div className={styles.securityPanelHeadBlue}>
        <strong>안전 거래 설정</strong>
        <p>사고를 줄이는 데 도움이 되는 옵션이에요. (권장)</p>
      </div>

      <div className={styles.securityOptionRows}>
        <SecurityOptionRow
          title="본인인증 사용자만 예약 요청 허용"
          desc="미인증 사용자는 예약 요청 버튼이 비활성화돼요"
          checked={true}
        />

        <SecurityOptionRow
          title="채팅 후 예약(최소 1회 메시지)"
          desc="대여 기간/대여 시간 합의 후 예약 확정"
          checked={true}
        />
      </div>

      <div className={styles.securitySubSection}>
        <label className={styles.securitySubLabel}>보증금 환불 방식</label>
        <p className={styles.securitySubDesc}>반납 확인 후 환불 흐름을 선택할 수 있어요</p>

        <div className={styles.refundButtonRow}>
          <button type="button" className={styles.primaryWideButton}>
            대여자 승인 후 환불
          </button>
          <button type="button" className={styles.softButton}>
            자동 환불(기본)
          </button>
          <button type="button" className={styles.softButton}>
            정책 자세히
          </button>
        </div>
      </div>
    </div>

    <div className={styles.securityPanelCard}>
      <div className={styles.securityPanelHead}>
        <strong>개인정보 보호</strong>
        <p>동네 기반 서비스라 노출 범위를 조절할 수 있어요.</p>
      </div>

      <div className={styles.privacyGrid}>
        <div className={styles.privacyField}>
          <label>주소 공개 범위</label>
          <select defaultValue="동 단위까지만">
            <option>동 단위까지만</option>
            <option>구 단위까지만</option>
            <option>비공개</option>
          </select>
          <small>※ 전체번호 공개는 거래 신뢰도에 영향을 줄 수 있어요.</small>
        </div>

        <div className={styles.privacyField}>
          <label>연락 방식</label>
          <select defaultValue="전화번호 비공개(채팅)">
            <option>전화번호 비공개(채팅)</option>
            <option>예약 확정 후 공개</option>
            <option>항상 공개</option>
          </select>
        </div>
      </div>
    </div>

    <div className={styles.reportSection}>
      <div className={styles.reportHead}>
        <strong>차단 / 신고</strong>
        <p>불편한 사용자나 위험 거래를 미리 차단할 수 있어요.</p>
      </div>

      <div className={styles.reportButtonRow}>
        <button type="button" className={styles.softButton}>
          차단 목록
        </button>
        <button type="button" className={styles.softButton}>
          신고 내역
        </button>
        <button type="button" className={styles.warnButton}>
          위험 거래 신고하기
        </button>
      </div>
    </div>

    <div className={styles.bottomSubmitRow}>
      <button type="button" className={styles.ghostButton}>
        취소
      </button>
      <button type="button" className={styles.primaryButton}>
        변경사항 저장
      </button>
    </div>
  </div>
)}

                {activeMenu === "settlement" && (
  <div className={styles.settlementSettingWrap}>
    <div className={styles.settlementSettingHead}>
      <div>
        <h2>결제 / 정산</h2>
        <p>보증금 결제 수단과 정산 계좌를 관리해요.</p>
      </div>
    </div>

    <div className={styles.settlementPanelCard}>
      <div className={styles.settlementPanelHead}>
        <strong>정산 계좌 인증</strong>
        <p>본인명의의 계좌 인증을 완료해야 정산이 가능해요.</p>
      </div>

      {settlementAccount?.payoutAccountId ? (
        <div className={styles.verifiedAccountBox}>
          <div className={styles.verifiedAccountMain}>
            <div>
              <span className={styles.verifiedLabel}>등록된 계좌</span>
              <strong>
                {settlementAccount.bankName} {settlementAccount.accountNumberMasked}
              </strong>
              <p>{settlementAccount.accountHolder}</p>
            </div>

            <div className={styles.verifiedSide}>
              <span
                className={`${styles.verifyBadge} ${
                  settlementAccount.verified ? styles.verifyBadgeActive : ""
                }`}
              >
                {settlementAccount.verified ? "인증완료" : "미인증"}
              </span>
              <small>{formatDateText(settlementAccount.createdAt)}</small>
            </div>
          </div>

          <div className={styles.verifiedActionRow}>
            <button
              type="button"
              className={styles.deleteTextButton}
              onClick={handleDeleteSettlementAccount}
              disabled={saving}
            >
              계좌 삭제
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.settlementAccountForm}>
          <div className={styles.settlementAccountGrid}>
            <SelectField
              label="은행"
              value={verifyForm.bankName}
              options={BANK_OPTIONS}
              onChange={(value) =>
                setVerifyForm((prev) => ({ ...prev, bankName: value }))
              }
            />

            <InputField
              label="계좌번호"
              value={verifyForm.accountNumber}
              onChange={(event) =>
                setVerifyForm((prev) => ({
                  ...prev,
                  accountNumber: event.target.value,
                }))
              }
              placeholder="예: 123-456-789012"
            />

            <InputField
              label="예금주"
              value={verifyForm.accountHolder}
              onChange={(event) =>
                setVerifyForm((prev) => ({
                  ...prev,
                  accountHolder: event.target.value,
                }))
              }
              placeholder="이름"
            />

            <div className={styles.accountVerifyButtonWrap}>
              <button
                type="button"
                className={styles.authButton}
                onClick={handleRequestVerification}
                disabled={saving}
              >
                계좌 인증
              </button>
            </div>
          </div>

          <p className={styles.accountGuideText}>
            ※ 보증금 계좌 변경 시 신분증 위임 인증이 필요해요.
          </p>

          {verifyState.maskedAccount && (
            <div className={styles.verifyConfirmInline}>
              <div className={styles.verifyInlineText}>
                <strong>입금계좌</strong>
                <p>{verifyState.maskedAccount}</p>
              </div>

              <div className={styles.verifyInlineInput}>
                <InputField
                  label="입금자명 뒤 3자리"
                  value={confirmCode}
                  onChange={(event) => setConfirmCode(event.target.value)}
                  placeholder="예: 123"
                />
              </div>

              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleConfirmVerification}
                disabled={saving}
              >
                인증 확인
              </button>
            </div>
          )}
        </div>
      )}
    </div>

    <div className={styles.settlementPanelCard}>
      <div className={styles.settlementPanelHeadBlue}>
        <strong>결제 수단</strong>
        <p>대여 시 결제에 사용할 수단을 선택해요.</p>
      </div>

      <div className={styles.paymentMethodWrap}>
        <button type="button" className={styles.paymentMethodButton}>
          <span>선택</span>
          <strong>신용/체크카드</strong>
        </button>

        <button type="button" className={styles.paymentMethodButton}>
          <span>선택</span>
          <strong>계좌이체</strong>
        </button>
      </div>
    </div>

    <div className={styles.settlementPanelCard}>
      <div className={styles.settlementPanelHead}>
        <strong>정산 요약</strong>
        <p>이번 달 정산 현황을 확인해요.</p>
      </div>

      <div className={styles.summaryCardRow}>
        <div className={`${styles.summaryInfoCard} ${styles.summaryInfoCardActive}`}>
          <span>정산 예정</span>
          <strong>{formatRoundedHundred(settlementSummary.scheduledAmount)}</strong>
          <p>다음 정산일: {formatDateText(settlementSummary.nextPayoutDate)}</p>
        </div>

        <div className={styles.summaryInfoCard}>
          <span>보증금 보관</span>
          <strong>{formatCurrency(settlementSummary.depositAmount)}</strong>
          <p>진행 중 대여 {settlementSummary.activeRentalCount || 0}건</p>
        </div>

        <div className={styles.summaryInfoCard}>
          <span>정산 내역</span>
          <strong>{formatCurrency(settlementSummary.recentPayoutAmount)}</strong>
          <p>최근 {settlementSummary.recentDays || 30}일</p>
        </div>
      </div>

      <div className={styles.summaryActionRow}>
        <button type="button" className={styles.primaryWideButton}>
          정산 내역 보기
        </button>
        <button type="button" className={styles.softButton}>
          보증금 정책 보기
        </button>
      </div>
    </div>

    <div className={styles.bottomSubmitRow}>
      <button
        type="button"
        className={styles.ghostButton}
        onClick={loadSettingsData}
      >
        취소
      </button>
      <button type="button" className={styles.primaryButton}>
        변경사항 저장
      </button>
    </div>
  </div>
)}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function StaticField({ label, value }) {
  return (
    <div className={styles.fieldBlock}>
      <label>{label}</label>
      <div className={styles.staticValue}>{value}</div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div className={styles.fieldBlock}>
      <label>{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className={styles.fieldBlock}>
      <label>{label}</label>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function NotificationDesignRow({
  title,
  desc,
  checked,
  onToggle,
  disabled = false,
}) {
  return (
    <div className={styles.notificationDesignRow}>
      <div className={styles.notificationDesignText}>
        <strong>{title}</strong>
        <p>{desc}</p>
      </div>

      <div className={styles.notificationControl}>
        <span
          className={`${styles.toggleStateText} ${
            checked ? styles.toggleStateOn : styles.toggleStateOff
          }`}
        >
          {checked ? "ON" : "OFF"}
        </span>

        <button
          type="button"
          className={`${styles.toggleSwitch} ${
            checked ? styles.toggleSwitchOn : ""
          } ${disabled ? styles.toggleDisabled : ""}`}
          onClick={disabled ? undefined : onToggle}
          aria-pressed={checked}
          disabled={disabled}
        >
          <span className={styles.toggleThumb} />
        </button>
      </div>
    </div>
  );
}

function SecurityOptionRow({ title, desc, checked }) {
  return (
    <div className={styles.securityOptionRow}>
      <div className={styles.securityOptionText}>
        <strong>{title}</strong>
        <p>{desc}</p>
      </div>

      <div className={styles.notificationControl}>
        <span
          className={`${styles.toggleStateText} ${
            checked ? styles.toggleStateOn : styles.toggleStateOff
          }`}
        >
          {checked ? "ON" : "OFF"}
        </span>

        <button
          type="button"
          className={`${styles.toggleSwitch} ${
            checked ? styles.toggleSwitchOn : ""
          }`}
          aria-pressed={checked}
        >
          <span className={styles.toggleThumb} />
        </button>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, active = false }) {
  return (
    <div className={`${styles.summaryCard} ${active ? styles.summaryCardActive : ""}`}>
      <p>{title}</p>
      <strong>{value}</strong>
    </div>
  );
}

function SummaryMeta({ label, value }) {
  return (
    <div className={styles.summaryMetaItem}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatRoundedHundred(value) {
  const num = Number(value || 0);

  const remainder = num % 100;

  let rounded;

  if (remainder >= 50) {
    rounded = num + (100 - remainder); // 올림
  } else {
    rounded = num - remainder; // 내림
  }

  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(rounded);
}
